#!/usr/bin/env bash

set -u

usage() {
  cat <<'EOF'
Usage: select-backend.sh [--backend auto|herdr|tmux]

Prints two machine-readable lines on success:
  backend=<herdr|tmux>
  reason=<selection evidence>
EOF
}

requested_backend="auto"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backend)
      [ "$#" -ge 2 ] || {
        echo "direct-cli: --backend requires auto, herdr, or tmux" >&2
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
  auto|herdr|tmux) ;;
  *)
    echo "direct-cli: expected --backend auto|herdr|tmux" >&2
    exit 2
    ;;
esac

python_bin="$(command -v python3 2>/dev/null || true)"
herdr_failure="Herdr is unavailable"

run_bounded() {
  "$python_bin" - "$@" <<'PY'
import os
import subprocess
import sys

try:
    timeout = float(os.environ.get("DIRECT_CLI_HERDR_TIMEOUT_SECONDS", "5"))
    if timeout <= 0:
        raise ValueError
except ValueError:
    print("direct-cli: DIRECT_CLI_HERDR_TIMEOUT_SECONDS must be positive", file=sys.stderr)
    raise SystemExit(2)

try:
    completed = subprocess.run(
        sys.argv[1:],
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

  status_json="$(run_bounded herdr status --json 2>/dev/null)" || {
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

  pane_json="$(run_bounded herdr pane get "$HERDR_PANE_ID" 2>/dev/null)" || {
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
    if herdr_ready; then
      selected_backend="herdr"
      selection_reason="validated live compatible Herdr pane"
    elif tmux_ready; then
      selected_backend="tmux"
      selection_reason="Herdr preflight failed; tmux is available"
    else
      echo "direct-cli: no usable backend (Herdr: $herdr_failure; tmux is not on PATH)" >&2
      exit 1
    fi
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
