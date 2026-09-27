#!/usr/bin/env bash

set -u

usage() {
  cat <<'EOF'
Usage: select-backend.sh [--backend auto|orca|herdr|tmux]

Prints two machine-readable lines on success:
  backend=<orca|herdr|tmux>
  reason=<selection evidence>
EOF
}

requested_backend="auto"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backend)
      [ "$#" -ge 2 ] || {
        echo "direct-cli: --backend requires auto, orca, herdr, or tmux" >&2
        exit 2
      }
      requested_backend="$2"
      shift 2
      ;;
    --backend=*)
      requested_backend="${1#--backend=}"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "direct-cli: unknown backend selector argument: $1" >&2
      exit 2
      ;;
  esac
done

case "$requested_backend" in
  auto|orca|herdr|tmux) ;;
  *)
    echo "direct-cli: expected --backend auto|orca|herdr|tmux" >&2
    exit 2
    ;;
esac

python_bin="$(command -v python3 2>/dev/null || true)"
orca_failure="Orca is unavailable"
herdr_failure="Herdr is unavailable"

run_bounded() {
  timeout_variable="$1"
  shift
  "$python_bin" - "$timeout_variable" "$@" <<'PY'
import os
import subprocess
import sys

timeout_variable = sys.argv[1]
try:
    timeout = float(os.environ.get(timeout_variable, "5"))
    if timeout <= 0:
        raise ValueError
except ValueError:
    print(f"direct-cli: {timeout_variable} must be positive", file=sys.stderr)
    raise SystemExit(2)

try:
    completed = subprocess.run(
        sys.argv[2:],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
except subprocess.TimeoutExpired:
    raise SystemExit(124)

sys.stdout.write(completed.stdout)
raise SystemExit(completed.returncode)
PY
}

json_field() {
  [ -n "$python_bin" ] || return 1
  "$python_bin" -c '
import json
import sys

path = sys.argv[1].split(".")
value = json.load(sys.stdin)
for key in path:
    value = value[key]
if value is None:
    raise SystemExit(1)
elif isinstance(value, bool):
    print("true" if value else "false")
else:
    print(value)
' "$1"
}

orca_ready() {
  if ! command -v orca >/dev/null 2>&1; then
    orca_failure="orca is not on PATH"
    return 1
  fi
  if [ -z "${ORCA_TERMINAL_HANDLE:-}" ] || [ -z "${ORCA_WORKTREE_ID:-}" ] || [ -z "${ORCA_TAB_ID:-}" ] || [ -z "${ORCA_PANE_KEY:-}" ]; then
    orca_failure="the caller is not marked as an Orca-managed terminal"
    return 1
  fi
  if [ -z "$python_bin" ]; then
    orca_failure="python3 is required to validate Orca JSON"
    return 1
  fi

  status_json="$(run_bounded DIRECT_CLI_ORCA_TIMEOUT_SECONDS orca status --json 2>/dev/null)" || {
    orca_failure="orca status failed"
    return 1
  }
  runtime_state="$(printf '%s' "$status_json" | json_field result.runtime.state 2>/dev/null)" || {
    orca_failure="orca status returned invalid JSON"
    return 1
  }
  runtime_reachable="$(printf '%s' "$status_json" | json_field result.runtime.reachable 2>/dev/null)" || {
    orca_failure="orca status omitted reachability"
    return 1
  }
  runtime_connection="$(printf '%s' "$status_json" | json_field result.runtime.connectionState 2>/dev/null)" || {
    orca_failure="orca status omitted connection state"
    return 1
  }
  if [ "$runtime_state" != "ready" ] || [ "$runtime_reachable" != "true" ] || [ "$runtime_connection" != "connected" ]; then
    orca_failure="the Orca runtime is not ready and connected"
    return 1
  fi

  terminal_json="$(run_bounded DIRECT_CLI_ORCA_TIMEOUT_SECONDS orca terminal show --terminal "$ORCA_TERMINAL_HANDLE" --json 2>/dev/null)" || {
    orca_failure="ORCA_TERMINAL_HANDLE does not resolve in the running runtime"
    return 1
  }
  if ! printf '%s' "$terminal_json" | "$python_bin" -c '
import json
import sys

terminal = json.load(sys.stdin)["result"]["terminal"]
expected_handle, expected_worktree, expected_tab, expected_pane = sys.argv[1:]
valid = (
    terminal.get("handle") == expected_handle
    and terminal.get("worktreeId") == expected_worktree
    and terminal.get("tabId") == expected_tab
    and str(terminal.get("tabId")) + ":" + str(terminal.get("leafId")) == expected_pane
    and terminal.get("connected") is True
    and terminal.get("writable") is True
    and terminal.get("orphaned") is False
)
raise SystemExit(0 if valid else 1)
' "$ORCA_TERMINAL_HANDLE" "$ORCA_WORKTREE_ID" "$ORCA_TAB_ID" "$ORCA_PANE_KEY" 2>/dev/null; then
    orca_failure="the Orca caller-terminal receipt is stale, read-only, or identity-mismatched"
    return 1
  fi

  current_path="$(pwd -P 2>/dev/null)" || {
    orca_failure="the current working directory cannot be resolved"
    return 1
  }
  worktree_json="$(run_bounded DIRECT_CLI_ORCA_TIMEOUT_SECONDS orca worktree show --worktree "path:$current_path" --json 2>/dev/null)" || {
    orca_failure="the current working directory is not a tracked Orca worktree"
    return 1
  }
  if ! printf '%s' "$worktree_json" | "$python_bin" -c '
import json
import os
import sys

worktree = json.load(sys.stdin)["result"]["worktree"]
expected_path = os.path.realpath(sys.argv[1])
actual_path = os.path.realpath(worktree.get("path") or "")
valid = bool(worktree.get("id")) and actual_path == expected_path and worktree.get("isArchived") is False
raise SystemExit(0 if valid else 1)
' "$current_path" 2>/dev/null; then
    orca_failure="the Orca worktree receipt does not match the current working directory"
    return 1
  fi

  return 0
}

herdr_ready() {
  if ! command -v herdr >/dev/null 2>&1; then
    herdr_failure="herdr is not on PATH"
    return 1
  fi
  if [ "${HERDR_ENV:-}" != "1" ] || [ -z "${HERDR_PANE_ID:-}" ]; then
    herdr_failure="the caller is not marked as a Herdr pane"
    return 1
  fi
  if [ -z "$python_bin" ]; then
    herdr_failure="python3 is required to validate Herdr JSON"
    return 1
  fi

  status_json="$(run_bounded DIRECT_CLI_HERDR_TIMEOUT_SECONDS herdr status --json 2>/dev/null)" || {
    herdr_failure="herdr status failed"
    return 1
  }
  server_running="$(printf '%s' "$status_json" | json_field server.running 2>/dev/null)" || {
    herdr_failure="herdr status returned invalid JSON"
    return 1
  }
  server_compatible="$(printf '%s' "$status_json" | json_field server.compatible 2>/dev/null)" || {
    herdr_failure="herdr status omitted compatibility"
    return 1
  }
  if [ "$server_running" != "true" ] || [ "$server_compatible" != "true" ]; then
    herdr_failure="the Herdr server is stopped or incompatible"
    return 1
  fi

  pane_json="$(run_bounded DIRECT_CLI_HERDR_TIMEOUT_SECONDS herdr pane get "$HERDR_PANE_ID" 2>/dev/null)" || {
    herdr_failure="HERDR_PANE_ID does not resolve in the running server"
    return 1
  }
  resolved_pane_id="$(printf '%s' "$pane_json" | json_field result.pane.pane_id 2>/dev/null)" || {
    herdr_failure="herdr pane get returned invalid JSON"
    return 1
  }
  if [ -z "$resolved_pane_id" ]; then
    herdr_failure="herdr pane get returned an empty pane id"
    return 1
  fi

  return 0
}

tmux_ready() {
  command -v tmux >/dev/null 2>&1
}

selected_backend=""
selection_reason=""

case "$requested_backend" in
  auto)
    if orca_ready; then
      selected_backend="orca"
      selection_reason="validated live Orca caller identity and separately tracked current target"
    elif herdr_ready; then
      selected_backend="herdr"
      selection_reason="validated live compatible Herdr pane"
    elif tmux_ready; then
      selected_backend="tmux"
      selection_reason="Orca and Herdr preflights failed; tmux is available"
    else
      echo "direct-cli: no usable backend (Orca: $orca_failure; Herdr: $herdr_failure; tmux is not on PATH)" >&2
      exit 1
    fi
    ;;
  orca)
    if ! orca_ready; then
      echo "direct-cli: Orca backend unavailable: $orca_failure" >&2
      exit 1
    fi
    selected_backend="orca"
    selection_reason="explicit Orca request passed live-terminal identity checks"
    ;;
  herdr)
    if ! herdr_ready; then
      echo "direct-cli: Herdr backend unavailable: $herdr_failure" >&2
      exit 1
    fi
    selected_backend="herdr"
    selection_reason="explicit Herdr request passed live-pane compatibility checks"
    ;;
  tmux)
    if ! tmux_ready; then
      echo "direct-cli: tmux backend unavailable: tmux is not on PATH" >&2
      exit 1
    fi
    selected_backend="tmux"
    selection_reason="explicit tmux request passed binary preflight"
    ;;
esac

printf 'backend=%s\nreason=%s\n' "$selected_backend" "$selection_reason"
