#!/usr/bin/env python3

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys
import time
import uuid
from typing import Any

try:
    import fcntl
except ImportError:  # pragma: no cover - Herdr Phase 1 is currently exercised on POSIX
    fcntl = None


SCHEMA = "direct-cli.herdr-job.v1"
CALLBACK_SCHEMA = "direct-cli.herdr-job.v2"
SUPPORTED_SCHEMAS = {SCHEMA, CALLBACK_SCHEMA}
JOB_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,79}$")
AGENT_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")
MESSAGE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,79}$")
IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
MESSAGE_KINDS = {"progress", "question", "blocked", "reply", "report_ready", "report_failed"}
TERMINAL_STATUSES = {"attention", "done", "error"}
MAX_MESSAGE_BYTES = 8 * 1024
MAX_MESSAGES = 200

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def default_state_root() -> Path:
    explicit = os.environ.get("DIRECT_CLI_STATE_DIR")
    if explicit:
        return Path(explicit).expanduser()
    xdg_state = os.environ.get("XDG_STATE_HOME")
    base = Path(xdg_state).expanduser() if xdg_state else Path.home() / ".local" / "state"
    return base / "mahiro-skills" / "direct-cli" / "jobs"


def ensure_state_root(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise ValueError("state root must not be a symlink")
    resolved = expanded.resolve()
    existed = resolved.exists()
    if existed and not resolved.is_dir():
        raise ValueError("state root must be a directory")
    resolved.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not existed:
        resolved.chmod(0o700)
    return resolved


def validate_job_id(job_id: str) -> str:
    if not JOB_ID_PATTERN.fullmatch(job_id):
        raise ValueError("job id must match [a-z0-9][a-z0-9_-]{0,79}")
    return job_id


def validate_targets(targets: list[str]) -> list[str]:
    if len(set(targets)) != len(targets):
        raise ValueError("Herdr agent targets must be unique")
    for target in targets:
        if not AGENT_NAME_PATTERN.fullmatch(target):
            raise ValueError(f"invalid Herdr agent name: {target}")
    return targets


def atomic_write_text(path: Path, text: str) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def atomic_write_bytes(path: Path, data: bytes) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def load_job(job_dir: Path) -> dict[str, Any]:
    if job_dir.is_symlink():
        raise ValueError("job directory must not be a symlink")
    payload = json.loads((job_dir / "job.json").read_text(encoding="utf-8"))
    if payload.get("schema") not in SUPPORTED_SCHEMAS:
        raise ValueError("unsupported direct-cli job schema")
    return payload


def save_job(job_dir: Path, payload: dict[str, Any]) -> None:
    atomic_write_json(job_dir / "job.json", payload)


@contextmanager
def job_lock(job_dir: Path):
    lock_path = job_dir / "job.lock"
    descriptor = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        if fcntl is not None:
            fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        if fcntl is not None:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


def call_timeout_seconds() -> float:
    raw = os.environ.get("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS", "15")
    try:
        timeout = float(raw)
    except ValueError as error:
        raise ValueError("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS must be numeric") from error
    if not 0 < timeout <= 300:
        raise ValueError("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS must be between 0 and 300")
    return timeout


def run_json(*args: str) -> dict[str, Any]:
    completed = subprocess.run(
        ["herdr", *args],
        check=True,
        capture_output=True,
        text=True,
        timeout=call_timeout_seconds(),
    )
    return json.loads(completed.stdout)


def agent_state(target: str) -> tuple[str, int]:
    payload = run_json("agent", "get", target)
    agent = payload["result"]["agent"]
    return str(agent["agent_status"]), int(agent["state_change_seq"])


def _first_value(mapping: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = mapping.get(key)
        if value not in (None, ""):
            return value
    return None


def _session_value(value: Any) -> str | None:
    if isinstance(value, dict):
        value = _first_value(value, "value", "id", "session_id", "sessionId")
    return str(value) if value not in (None, "") else None


def _available_letta_tokens(pane: dict[str, Any]) -> dict[str, Any]:
    available: dict[str, Any] = {}
    tokens = pane.get("tokens")
    if not isinstance(tokens, dict):
        return available
    for key in ("letta_pid", "letta_started_at", "letta_scope", "letta_version"):
        value = tokens.get(key)
        if value not in (None, ""):
            available[key] = str(value)
    return available


def _pane_object(payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("result")
    if isinstance(result, dict) and isinstance(result.get("pane"), dict):
        return result["pane"]
    if isinstance(payload.get("pane"), dict):
        return payload["pane"]
    raise ValueError("Herdr pane get returned no pane receipt")


def _receipt_from_pane(pane: dict[str, Any], requested_pane_id: str, *, role: str) -> dict[str, Any]:
    pane_id = _first_value(pane, "pane_id", "paneId", "id")
    workspace_id = _first_value(pane, "workspace_id", "workspaceId")
    tab_id = _first_value(pane, "tab_id", "tabId")
    if not pane_id or not workspace_id or not tab_id:
        raise ValueError("Herdr pane receipt is missing pane, workspace, or tab identity")
    return {
        "role": role,
        "requestedPaneId": requested_pane_id,
        "paneId": str(pane_id),
        "workspaceId": str(workspace_id),
        "tabId": str(tab_id),
        "cwd": _first_value(pane, "cwd", "working_directory", "workingDirectory"),
        "terminal": _first_value(pane, "terminal", "terminal_id", "terminalId", "terminal_name"),
        "herdrSession": _session_value(_first_value(pane, "herdr_session", "herdrSession", "session_id", "sessionId"))
        or os.environ.get("HERDR_SESSION"),
        "herdrSocket": _first_value(pane, "herdr_socket", "herdrSocket", "socket")
        or os.environ.get("HERDR_SOCKET_PATH"),
        "agentKind": _first_value(pane, "agent", "agent_kind", "agentKind"),
        "agentName": _first_value(pane, "agent_name", "agentName", "target", "targetName"),
        "agentSession": _session_value(_first_value(pane, "agent_session", "agentSession")),
        "lettaTokens": _available_letta_tokens(pane),
    }


def capture_pane_receipt(pane_id: str, *, role: str) -> dict[str, Any]:
    requested = str(pane_id).strip()
    if not requested:
        raise ValueError("pane receipt requires a non-empty HERDR_PANE_ID")
    pane = _pane_object(run_json("pane", "get", requested))
    return _receipt_from_pane(pane, requested, role=role)


def capture_target_receipt(target: str) -> tuple[str, int, dict[str, Any]]:
    payload = run_json("agent", "get", target)
    agent = payload["result"]["agent"]
    pane_id = _first_value(agent, "pane_id", "paneId", "pane")
    if isinstance(pane_id, dict):
        pane_id = _first_value(pane_id, "pane_id", "paneId", "id")
    if not pane_id:
        raise ValueError(f"Herdr target {target} has no exact pane receipt")
    receipt = capture_pane_receipt(str(pane_id), role="target")
    receipt["agentName"] = target
    receipt["agentSession"] = _session_value(_first_value(agent, "agent_session", "agentSession")) or receipt.get("agentSession")
    receipt["agentStatus"] = str(agent["agent_status"])
    receipt["stateChangeSeq"] = int(agent["state_change_seq"])
    return receipt["agentStatus"], receipt["stateChangeSeq"], receipt


def capture_callback_context(targets: list[str]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    parent_pane_id = os.environ.get("HERDR_PANE_ID", "").strip()
    if not parent_pane_id:
        raise ValueError("callback routing requires HERDR_PANE_ID")
    parent = capture_pane_receipt(parent_pane_id, role="parent")
    required_letta_tokens = {"letta_pid", "letta_started_at", "letta_scope"}
    if str(parent.get("agentKind", "")).lower() != "letta" or not required_letta_tokens.issubset(parent["lettaTokens"]):
        raise ValueError("callback routing requires an exact parent Letta pane receipt")
    if not parent.get("terminal") or not parent.get("herdrSocket"):
        raise ValueError("callback routing requires parent terminal and Herdr socket identity")
    records: list[dict[str, Any]] = []
    for target in targets:
        status, sequence, receipt = capture_target_receipt(target)
        records.append(
            {
                "name": target,
                "baselineSeq": sequence,
                "initialStatus": status,
                "resultPath": f"results/{target}.txt",
                "receipt": receipt,
            }
        )
    return parent, records


def receipt_matches(expected: dict[str, Any], actual: dict[str, Any]) -> bool:
    for key in (
        "paneId",
        "workspaceId",
        "tabId",
        "terminal",
        "herdrSocket",
    ):
        if expected.get(key) in (None, "") or actual.get(key) != expected.get(key):
            return False
    for key in ("cwd", "herdrSession", "agentSession", "lettaTokens"):
        if expected.get(key) not in (None, "") and actual.get(key) != expected.get(key):
            return False
    return True


def revalidate_target_receipt(target: str, expected: dict[str, Any]) -> dict[str, Any]:
    _status, _sequence, actual = capture_target_receipt(target)
    if not receipt_matches(expected, actual):
        raise ValueError(f"stale or mismatched Herdr receipt for target {target}")
    return actual


def revalidate_current_participant(payload: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    current_pane_id = os.environ.get("HERDR_PANE_ID", "").strip()
    if not current_pane_id:
        raise ValueError("callback messages require HERDR_PANE_ID; sender is inferred from the current pane")
    actual = capture_pane_receipt(current_pane_id, role="current")
    candidates: list[tuple[str, dict[str, Any]]] = [("parent", payload["parentReceipt"])]
    candidates.extend((str(record["name"]), record["receipt"]) for record in payload["targets"])
    matches = [(name, expected) for name, expected in candidates if receipt_matches(expected, actual)]
    if len(matches) != 1:
        raise ValueError("current Herdr pane is not one exact authorized parent or job target receipt")
    principal, expected = matches[0]
    if principal != "parent":
        revalidate_target_receipt(principal, expected)
    return principal, actual


def participant_receipt(payload: dict[str, Any], principal: str) -> dict[str, Any]:
    if principal == "parent":
        return payload["parentReceipt"]
    for record in payload["targets"]:
        if record["name"] == principal:
            return record["receipt"]
    raise ValueError(f"unknown callback participant: {principal}")


def participant_transport_target(payload: dict[str, Any], principal: str) -> str:
    receipt = participant_receipt(payload, principal)
    if principal == "parent":
        return str(receipt["paneId"])
    return str(receipt.get("agentName") or principal)


def build_callback_footer(job_id: str, state_root: Path) -> str:
    command = " ".join(
        shlex.quote(part)
        for part in (
            sys.executable,
            str(Path(__file__).resolve()),
        )
    )
    job = shlex.quote(job_id)
    state = shlex.quote(str(state_root))
    return (
        "\n\n[Direct-CLI callback contract]\n"
        "Use bounded private body files only; never put secrets in a body, wake, command argument, or summary.\n"
        f"Progress/question/blocker: {command} send {job} --state-dir {state} --to parent --kind <progress|question|blocked> --body-file <file> --idempotency-key <key>\n"
        f"Peer/reply: {command} send {job} --state-dir {state} --to <target> --kind reply --body-file <file> --idempotency-key <key>\n"
        f"Final report: {command} send {job} --state-dir {state} --to parent --kind <report_ready|report_failed> --body-file <file> --idempotency-key final\n"
        f"Receive a wake: {command} receive {job} --state-dir {state} --message-id <message>\n"
        "Delivery accepted is not receipt or proof; receive and parent audit are the durable evidence."
    )


def notify(job_id: str, status: str, enabled: bool) -> str:
    if not enabled:
        return "disabled"
    osascript = Path("/usr/bin/osascript")
    if sys.platform != "darwin" or not osascript.exists():
        return "unavailable"
    script = (
        "on run argv\n"
        "display notification (item 2 of argv) with title \"Direct CLI job\" "
        "subtitle (item 1 of argv)\n"
        "end run"
    )
    try:
        subprocess.run(
            [str(osascript), "-e", script, job_id, f"Job finished with status: {status}"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return "failed"
    return "sent"


def mark_terminal(
    job_dir: Path,
    *,
    status: str,
    summary: str,
    send_notification: bool = True,
) -> None:
    notification_pending = False
    deadline_pid: int | None = None
    with job_lock(job_dir):
        latest = load_job(job_dir)
        if latest.get("status") in TERMINAL_STATUSES:
            return
        notification_enabled = bool(latest["options"]["notify"]) and send_notification
        latest["status"] = status
        latest["summary"] = summary
        latest["finishedAt"] = utc_now()
        if send_notification and not notification_enabled:
            latest["notification"] = "disabled"
        else:
            latest["notification"] = "pending" if send_notification else "not-sent"
        notification_pending = latest["notification"] == "pending"
        if isinstance(latest.get("callbackDeadlinePid"), int):
            deadline_pid = int(latest["callbackDeadlinePid"])
        save_job(job_dir, latest)

    if deadline_pid is not None and callback_deadline_process_matches(deadline_pid, job_dir):
        try:
            os.kill(deadline_pid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass
    if not notification_pending:
        return
    notification = notify(latest["id"], status, True)
    with job_lock(job_dir):
        current = load_job(job_dir)
        if current.get("status") == status and current.get("notification") == "pending":
            current["notification"] = notification
            save_job(job_dir, current)


def launch_watcher(job_dir: Path) -> None:
    watcher_log = job_dir / "watcher.log"
    log_descriptor = os.open(watcher_log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(log_descriptor, "a", encoding="utf-8") as log_handle:
        subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), "_watch", "--job-dir", str(job_dir)],
            stdin=subprocess.DEVNULL,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            close_fds=True,
        )


def launch_callback_deadline(job_dir: Path, timeout_seconds: float) -> int:
    process = subprocess.Popen(
        [
            sys.executable,
            str(Path(__file__).resolve()),
            "_deadline",
            "--job-dir",
            str(job_dir),
            "--timeout",
            str(timeout_seconds),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        close_fds=True,
    )
    return process.pid


def command_start(args: argparse.Namespace) -> int:
    job_id = validate_job_id(args.job_id)
    targets = validate_targets(args.targets)
    state_root = ensure_state_root(args.state_dir or default_state_root())
    job_dir = state_root / job_id
    if job_dir.exists() or job_dir.is_symlink():
        print(f"direct-cli: job already exists: {job_id}", file=sys.stderr)
        return 1

    prompt_file = args.prompt_file.expanduser().resolve(strict=True)
    prompt = prompt_file.read_text(encoding="utf-8")
    if "\0" in prompt:
        print("direct-cli: Herdr prompt text cannot contain NUL bytes", file=sys.stderr)
        return 2
    cwd = args.cwd.expanduser().resolve(strict=True)
    if not cwd.is_dir():
        print("direct-cli: --cwd must be a directory", file=sys.stderr)
        return 2

    mode = "watcher"
    parent_receipt: dict[str, Any] | None = None
    if args.mode in {"auto", "callback"}:
        try:
            parent_receipt, target_records = capture_callback_context(targets)
            mode = "callback"
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError, json.JSONDecodeError):
            if args.mode == "callback":
                raise
            target_records = []
    if mode == "watcher":
        target_records = []
        for target in targets:
            status, sequence = agent_state(target)
            target_records.append(
                {
                    "name": target,
                    "baselineSeq": sequence,
                    "initialStatus": status,
                    "resultPath": f"results/{target}.txt",
                }
            )

    job_dir.mkdir(mode=0o700)
    job_dir.chmod(0o700)
    (job_dir / "results").mkdir(mode=0o700)
    (job_dir / "results").chmod(0o700)
    atomic_write_text(job_dir / "prompt.txt", prompt)

    task_sha256 = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    dispatch_prompt = prompt if mode == "watcher" else prompt + build_callback_footer(job_id, state_root)
    dispatch_sha256 = hashlib.sha256(dispatch_prompt.encode("utf-8")).hexdigest()
    if mode == "callback":
        atomic_write_text(job_dir / "dispatch-prompt.txt", dispatch_prompt)
        (job_dir / "messages").mkdir(mode=0o700)
        (job_dir / "messages").chmod(0o700)

    payload: dict[str, Any] = {
        "schema": CALLBACK_SCHEMA if mode == "callback" else SCHEMA,
        "id": job_id,
        "mode": mode,
        "status": "dispatching",
        "createdAt": utc_now(),
        "cwd": str(cwd),
        "tabId": args.tab_id,
        "promptSha256": task_sha256,
        "taskSha256": task_sha256,
        "taskPromptSha256": task_sha256,
        "dispatchSha256": dispatch_sha256,
        "dispatchPromptSha256": dispatch_sha256,
        "targets": target_records,
        "options": {
            "activityTimeoutSeconds": args.activity_timeout,
            "settleTimeoutMs": args.settle_timeout_ms,
            "resultLines": args.result_lines,
            "callTimeoutSeconds": call_timeout_seconds(),
            "callbackTimeoutSeconds": args.callback_timeout,
            "notify": args.notify,
        },
    }
    if mode == "callback":
        payload.update(
            {
                "routing": "callback",
                "parentReceipt": parent_receipt,
                "reports": {target: {"status": "pending"} for target in targets},
                "messageCount": 0,
                "watcherFallback": False,
            }
        )
    save_job(job_dir, payload)

    dispatch_target = "unknown"
    try:
        for target in targets:
            dispatch_target = target
            subprocess.run(
                ["herdr", "agent", "prompt", target, dispatch_prompt],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=call_timeout_seconds(),
            )
    except subprocess.CalledProcessError as error:
        mark_terminal(
            job_dir,
            status="error",
            summary=f"prompt dispatch failed for {dispatch_target} with exit {error.returncode}",
        )
        return 1
    except subprocess.TimeoutExpired:
        mark_terminal(
            job_dir,
            status="error",
            summary=f"prompt dispatch timed out for {dispatch_target}",
        )
        return 1
    except OSError as error:
        mark_terminal(
            job_dir,
            status="error",
            summary=f"prompt dispatch could not start for {dispatch_target}: {type(error).__name__}",
        )
        return 1

    deadline_launch_error: OSError | None = None
    with job_lock(job_dir):
        payload = load_job(job_dir)
        if payload.get("status") not in TERMINAL_STATUSES:
            payload["status"] = "running"
            payload["dispatchedAt"] = utc_now()
            if mode == "callback" and args.callback_timeout > 0:
                try:
                    deadline_pid = launch_callback_deadline(job_dir, args.callback_timeout)
                except OSError as error:
                    deadline_launch_error = error
                else:
                    payload["callbackDeadlinePid"] = deadline_pid
                    payload["callbackDeadlineAt"] = (
                        datetime.now(timezone.utc) + timedelta(seconds=args.callback_timeout)
                    ).isoformat().replace("+00:00", "Z")
            save_job(job_dir, payload)

    if deadline_launch_error is not None:
        mark_terminal(
            job_dir,
            status="error",
            summary=f"callback deadline launch failed: {type(deadline_launch_error).__name__}",
        )
        return 1
    if mode == "watcher" and payload.get("status") not in TERMINAL_STATUSES:
        try:
            launch_watcher(job_dir)
        except OSError as error:
            mark_terminal(
                job_dir,
                status="error",
                summary=f"watcher launch failed: {error}",
            )
            return 1

    print(f"job={job_id}")
    print(f"status={payload['status']}")
    print(f"mode={mode}")
    print(f"job_dir={job_dir}")
    return 0


def command_watch(args: argparse.Namespace) -> int:
    job_dir = args.job_dir.expanduser().resolve(strict=True)
    try:
        payload = load_job(job_dir)
        if payload["status"] != "running":
            print(
                f"direct-cli: watcher requires running status, found {payload['status']}",
                file=sys.stderr,
            )
            return 2
        payload["status"] = "watching"
        payload["watcherPid"] = os.getpid()
        payload["watchingAt"] = utc_now()
        save_job(job_dir, payload)

        pending = {record["name"] for record in payload["targets"]}
        baselines = {record["name"]: int(record["baselineSeq"]) for record in payload["targets"]}
        deadline = time.monotonic() + float(payload["options"]["activityTimeoutSeconds"])
        while pending and time.monotonic() < deadline:
            for target in tuple(pending):
                status, sequence = agent_state(target)
                if sequence > baselines[target] or status == "working":
                    pending.remove(target)
            if pending:
                time.sleep(0.1)

        if pending:
            joined = ", ".join(sorted(pending))
            mark_terminal(
                job_dir,
                status="attention",
                summary=(
                    f"no activity transition for {joined}; inspect each pane for an unsent prompt, "
                    "provider/account warning, or model fallback; submit one Enter only if the "
                    "prompt is visibly unsent"
                ),
            )
            return 3

        timeout_ms = str(int(payload["options"]["settleTimeoutMs"]))
        waiters = {
            target: subprocess.Popen(
                [
                    "herdr",
                    "agent",
                    "wait",
                    target,
                    "--until",
                    "idle",
                    "--until",
                    "done",
                    "--until",
                    "blocked",
                    "--timeout",
                    timeout_ms,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            for target in pending_from_records(payload)
        }
        failed_waits = []
        pending_waits = set(waiters)
        wait_deadline = time.monotonic() + (int(timeout_ms) / 1000) + call_timeout_seconds()
        next_heartbeat = 0.0
        while pending_waits and time.monotonic() < wait_deadline:
            for target in tuple(pending_waits):
                return_code = waiters[target].poll()
                if return_code is None:
                    continue
                pending_waits.remove(target)
                if return_code != 0:
                    failed_waits.append(f"{target}: wait failed with exit {return_code}")
            if time.monotonic() >= next_heartbeat:
                payload["heartbeatAt"] = utc_now()
                save_job(job_dir, payload)
                next_heartbeat = time.monotonic() + 5
            if pending_waits:
                time.sleep(0.2)

        if pending_waits:
            for target in pending_waits:
                waiters[target].kill()
                waiters[target].wait()
                failed_waits.append(f"{target}: client-side settle wait timed out")
        if failed_waits:
            mark_terminal(
                job_dir,
                status="error",
                summary="; ".join(failed_waits),
            )
            return 1

        result_lines = str(int(payload["options"]["resultLines"]))
        result_index = []
        for target in pending_from_records(payload):
            completed = subprocess.run(
                [
                    "herdr",
                    "agent",
                    "read",
                    target,
                    "--source",
                    "recent-unwrapped",
                    "--lines",
                    result_lines,
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=call_timeout_seconds(),
            )
            relative_path = Path("results") / f"{target}.txt"
            atomic_write_text(job_dir / relative_path, completed.stdout)
            result_index.append((target, relative_path))

        result_summary = [f"# Direct CLI job: {payload['id']}", "", "Status: done", ""]
        result_summary.extend(f"- `{target}`: `{path}`" for target, path in result_index)
        atomic_write_text(job_dir / "result.md", "\n".join(result_summary) + "\n")
        mark_terminal(
            job_dir,
            status="done",
            summary=f"captured {len(result_index)} agent result(s)",
        )
        return 0
    except Exception as error:  # watcher must leave durable failure evidence
        try:
            payload = load_job(job_dir)
            mark_terminal(
                job_dir,
                status="error",
                summary=f"watcher failed: {type(error).__name__}: {error}",
            )
        except Exception:
            print(f"direct-cli watcher failed without durable status: {error}", file=sys.stderr)
        return 1


def pending_from_records(payload: dict[str, Any]) -> list[str]:
    return [str(record["name"]) for record in payload["targets"]]


def seconds_since(timestamp: str | None) -> float:
    if not timestamp:
        return float("inf")
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return max(0.0, (datetime.now(timezone.utc) - parsed).total_seconds())


def helper_process_matches(pid: int, job_dir: Path, subcommand: str) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True

    try:
        completed = subprocess.run(
            ["ps", "-p", str(pid), "-o", "command="],
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return True
    if completed.returncode != 0:
        return False
    command = completed.stdout.strip()
    if not command:
        return False
    return f"herdr-jobs.py {subcommand}" in command and str(job_dir) in command


def watcher_process_matches(pid: int, job_dir: Path) -> bool:
    return helper_process_matches(pid, job_dir, "_watch")


def callback_deadline_process_matches(pid: int, job_dir: Path) -> bool:
    return helper_process_matches(pid, job_dir, "_deadline")


def reconcile_job(job_dir: Path, payload: dict[str, Any]) -> dict[str, Any]:
    status = str(payload.get("status", ""))
    if status in TERMINAL_STATUSES:
        return payload
    # Callback is intentionally not watcher-owned. A missing watcher is
    # normal until the operator explicitly requests `recover`.
    if payload.get("schema") == CALLBACK_SCHEMA and not payload.get("watcherFallback"):
        return payload

    watcher_pid = payload.get("watcherPid")
    interrupted = False
    if isinstance(watcher_pid, int):
        interrupted = not watcher_process_matches(watcher_pid, job_dir)
    elif status in {"dispatching", "running"}:
        dispatch_grace = max(
            30.0,
            len(payload.get("targets", []))
            * float(payload.get("options", {}).get("callTimeoutSeconds", 15))
            + 10,
        )
        interrupted = (
            seconds_since(payload.get("dispatchedAt") or payload.get("createdAt"))
            > dispatch_grace
        )
    elif status == "watching":
        interrupted = seconds_since(payload.get("watchingAt")) > 10

    if interrupted:
        interrupted_summary = "detached watcher is not running; the job may have been interrupted"
        mark_terminal(
            job_dir,
            status="error",
            summary=interrupted_summary,
            send_notification=False,
        )
        latest = load_job(job_dir)
        if latest.get("summary") == interrupted_summary and "reconciledAt" not in latest:
            with job_lock(job_dir):
                latest = load_job(job_dir)
                if latest.get("summary") == interrupted_summary and "reconciledAt" not in latest:
                    latest["reconciledAt"] = utc_now()
                    save_job(job_dir, latest)
        return latest
    return payload


def is_callback_job(payload: dict[str, Any]) -> bool:
    return payload.get("schema") == CALLBACK_SCHEMA and payload.get("mode") == "callback"


def validate_message_id(message_id: str) -> str:
    if not MESSAGE_ID_PATTERN.fullmatch(message_id):
        raise ValueError("message id has invalid format")
    return message_id


def validate_message_kind(kind: str) -> str:
    if kind not in MESSAGE_KINDS:
        raise ValueError("message kind must be progress|question|blocked|reply|report_ready|report_failed")
    return kind


def validate_idempotency_key(key: str) -> str:
    if not IDEMPOTENCY_PATTERN.fullmatch(key):
        raise ValueError("idempotency key has invalid format")
    return key


def read_bounded_body(path: Path) -> bytes:
    source = path.expanduser()
    if source.is_symlink() or not source.is_file():
        raise ValueError("message body must be a regular non-symlink file")
    size = source.stat().st_size
    if size > MAX_MESSAGE_BYTES:
        raise ValueError(f"message body must be at most {MAX_MESSAGE_BYTES} bytes")
    body = source.read_bytes()
    if len(body) > MAX_MESSAGE_BYTES:
        raise ValueError(f"message body must be at most {MAX_MESSAGE_BYTES} bytes")
    if b"\0" in body:
        raise ValueError("message body cannot contain NUL bytes")
    body.decode("utf-8")
    return body


def message_root(job_dir: Path) -> Path:
    root = job_dir / "messages"
    if root.is_symlink() or not root.is_dir():
        raise ValueError("callback message ledger is missing or not private")
    return root


def message_dir(job_dir: Path, message_id: str) -> Path:
    validate_message_id(message_id)
    path = message_root(job_dir) / message_id
    if path.is_symlink() or not path.is_dir():
        raise FileNotFoundError(f"callback message not found: {message_id}")
    return path


def load_message(job_dir: Path, message_id: str) -> dict[str, Any]:
    path = message_dir(job_dir, message_id) / "message.json"
    if path.is_symlink():
        raise ValueError("message record must not be a symlink")
    record = json.loads(path.read_text(encoding="utf-8"))
    if record.get("id") != message_id:
        raise ValueError("message record id mismatch")
    return record


def list_message_records(job_dir: Path) -> list[dict[str, Any]]:
    root = message_root(job_dir)
    records: list[dict[str, Any]] = []
    for path in sorted(root.iterdir(), key=lambda item: item.name):
        if path.is_symlink() or not path.is_dir() or not MESSAGE_ID_PATTERN.fullmatch(path.name):
            continue
        records.append(load_message(job_dir, path.name))
    if len(records) > MAX_MESSAGES:
        raise ValueError(f"callback message ledger exceeds {MAX_MESSAGES} messages")
    return records


def message_body_path(job_dir: Path, record: dict[str, Any]) -> Path:
    relative = Path(str(record.get("bodyPath", "")))
    if (
        relative.is_absolute()
        or len(relative.parts) != 3
        or relative.parts[0] != "messages"
        or relative.parts[1] != str(record.get("id"))
        or relative.parts[2] != "body"
    ):
        raise ValueError("message body path escaped the callback ledger")
    path = job_dir / relative
    if path.is_symlink() or not path.is_file():
        raise ValueError("message body is missing or not private")
    return path


def read_message_body(job_dir: Path, record: dict[str, Any]) -> bytes:
    body = message_body_path(job_dir, record).read_bytes()
    if len(body) > MAX_MESSAGE_BYTES or b"\0" in body:
        raise ValueError("stored message body exceeded callback bounds")
    body.decode("utf-8")
    expected = str(record.get("bodySha256", ""))
    if hashlib.sha256(body).hexdigest() != expected:
        raise ValueError("stored message body hash mismatch")
    return body


def callback_participants(payload: dict[str, Any]) -> set[str]:
    return {"parent", *(str(record["name"]) for record in payload["targets"])}


def validate_recipient(payload: dict[str, Any], sender: str, recipient: str) -> str:
    recipient = "parent" if recipient == "parent" else validate_job_target_name(recipient)
    if recipient not in callback_participants(payload):
        raise ValueError(f"recipient is not an exact job target: {recipient}")
    if sender == recipient:
        raise ValueError("callback messages cannot target the current sender")
    return recipient


def validate_job_target_name(target: str) -> str:
    if not AGENT_NAME_PATTERN.fullmatch(target):
        raise ValueError(f"invalid Herdr agent name: {target}")
    return target


def build_wake(job_dir: Path, record: dict[str, Any]) -> str:
    receive_command = " ".join(
        shlex.quote(part)
        for part in (
            sys.executable,
            str(Path(__file__).resolve()),
            "receive",
            record["job"],
            "--message-id",
            record["id"],
            "--state-dir",
            str(job_dir.parent),
        )
    )
    return (
        "[direct-cli callback wake] "
        f"job={record['job']} message={record['id']} from={record['from']} kind={record['kind']} "
        f"receive={receive_command} ; delivery is not receipt or proof"
    )


def _revalidate_recipient(payload: dict[str, Any], recipient: str) -> dict[str, Any]:
    expected = participant_receipt(payload, recipient)
    if recipient == "parent":
        actual = capture_pane_receipt(str(expected["paneId"]), role="parent")
    else:
        actual = revalidate_target_receipt(recipient, expected)
    if not receipt_matches(expected, actual):
        raise ValueError(f"stale or mismatched Herdr receipt for recipient {recipient}")
    return actual


def _message_metadata(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "job": record["job"],
        "message": record["id"],
        "from": record["from"],
        "to": record["to"],
        "kind": record["kind"],
        "idempotencyKey": record["idempotencyKey"],
        "bodySha256": record["bodySha256"],
        "bodyBytes": record["bodyBytes"],
        "delivery": record.get("delivery", {}),
        "ack": record.get("ack"),
        "createdAt": record.get("createdAt"),
    }


def _report_finalize_locked(job_dir: Path, payload: dict[str, Any], record: dict[str, Any]) -> str | None:
    if record["kind"] not in {"report_ready", "report_failed"} or record["to"] != "parent":
        return None
    target = str(record["from"])
    if target == "parent":
        return None
    reports = payload.setdefault("reports", {})
    current = reports.get(target, {"status": "pending"})
    if current.get("status") not in (None, "pending"):
        if current.get("message") != record["id"]:
            raise ValueError(f"target {target} already submitted a different final report")
    else:
        body = read_message_body(job_dir, record)
        result_path = job_dir / "results" / f"{target}.txt"
        atomic_write_bytes(result_path, body)
        reports[target] = {
            "status": record["kind"],
            "message": record["id"],
            "resultPath": f"results/{target}.txt",
            "bodySha256": record["bodySha256"],
            "reportedAt": utc_now(),
        }
    if not all(reports.get(name, {}).get("status") in {"report_ready", "report_failed"} for name in reports):
        return None
    failed = sum(1 for report in reports.values() if report.get("status") == "report_failed")
    return "error" if failed else "done"


def _update_delivery(
    job_dir: Path,
    message_id: str,
    *,
    status: str,
    error: str | None = None,
    retry: bool = False,
) -> tuple[dict[str, Any], str | None]:
    with job_lock(job_dir):
        payload = load_job(job_dir)
        record = load_message(job_dir, message_id)
        delivery = record.setdefault("delivery", {})
        delivery["status"] = status
        delivery["updatedAt"] = utc_now()
        if status == "accepted":
            delivery["acceptedAt"] = delivery["updatedAt"]
            delivery.pop("error", None)
            if retry:
                delivery["retryAcceptedAt"] = delivery["updatedAt"]
        else:
            delivery["failedAt"] = delivery["updatedAt"]
            delivery["error"] = error or "callback delivery failed"
            if retry:
                delivery["retryFailedAt"] = delivery["updatedAt"]
        if retry:
            delivery["retryCount"] = int(delivery.get("retryCount", 0)) + 1
        atomic_write_json(message_dir(job_dir, message_id) / "message.json", record)
        payload["messageCount"] = len(list_message_records(job_dir))
        save_job(job_dir, payload)
    return record, None


def _deliver_message(job_dir: Path, payload: dict[str, Any], record: dict[str, Any], *, retry: bool = False) -> tuple[str, str | None]:
    recipient = str(record["to"])
    if not retry:
        # The initial send must prove both ends immediately before transport.
        revalidate_current_participant(payload)
    _revalidate_recipient(payload, recipient)
    target = participant_transport_target(payload, recipient)
    wake = build_wake(job_dir, record)
    transport = ["herdr", "pane", "run", target, wake] if recipient == "parent" else ["herdr", "agent", "prompt", target, wake]
    transport_label = "pane.run" if recipient == "parent" else "agent.prompt"
    try:
        subprocess.run(
            transport,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=call_timeout_seconds(),
        )
    except subprocess.CalledProcessError as error:
        return "failed", f"{transport_label} exited {error.returncode}"
    except subprocess.TimeoutExpired:
        return "failed", f"{transport_label} timed out"
    except OSError as error:
        return "failed", f"{transport_label} unavailable: {type(error).__name__}"
    return "accepted", None


def command_send(args: argparse.Namespace) -> int:
    job_dir = resolve_job_dir(args.state_dir, args.job_id)
    payload = load_job(job_dir)
    if not is_callback_job(payload):
        raise ValueError("messages require a callback job")
    kind = validate_message_kind(args.kind)
    idempotency_key = validate_idempotency_key(args.idempotency_key)
    sender, sender_receipt = revalidate_current_participant(payload)
    recipient = validate_recipient(payload, sender, args.to)
    if kind in {"report_ready", "report_failed"} and (sender == "parent" or recipient != "parent"):
        raise ValueError("final reports are allowed only from a target to the exact parent")
    body = read_bounded_body(args.body_file.expanduser())
    body_sha256 = hashlib.sha256(body).hexdigest()

    with job_lock(job_dir):
        latest = load_job(job_dir)
        if not is_callback_job(latest):
            raise ValueError("messages require a callback job")
        existing = next(
            (
                record
                for record in list_message_records(job_dir)
                if record.get("from") == sender and record.get("idempotencyKey") == idempotency_key
            ),
            None,
        )
        signature = {
            "from": sender,
            "to": recipient,
            "kind": kind,
            "bodySha256": body_sha256,
        }
        if existing:
            existing_signature = {key: existing.get(key) for key in signature}
            if existing_signature != signature:
                raise ValueError("idempotency key already exists with different message content or ACL")
            print(json.dumps(_message_metadata(existing), ensure_ascii=False, separators=(",", ":")))
            return 0
        if latest.get("status") in TERMINAL_STATUSES:
            raise ValueError(f"callback job is terminal: {latest['status']}")
        report_state = latest.get("reports", {}).get(sender, {})
        if kind in {"report_ready", "report_failed"} and (
            report_state.get("status") not in (None, "pending") or report_state.get("message")
        ):
            raise ValueError(f"target {sender} already submitted a final report or has a pending report")
        if len(list_message_records(job_dir)) >= MAX_MESSAGES:
            raise ValueError(f"callback message ledger is limited to {MAX_MESSAGES} messages")
        message_id = f"m-{uuid.uuid4().hex[:20]}"
        target_dir = message_root(job_dir) / message_id
        target_dir.mkdir(mode=0o700)
        target_dir.chmod(0o700)
        body_path = target_dir / "body"
        atomic_write_bytes(body_path, body)
        if kind in {"report_ready", "report_failed"}:
            atomic_write_bytes(job_dir / "results" / f"{sender}.txt", body)
        record: dict[str, Any] = {
            "schema": "direct-cli.callback-message.v1",
            "job": latest["id"],
            "id": message_id,
            "from": sender,
            "to": recipient,
            "kind": kind,
            "idempotencyKey": idempotency_key,
            "bodyPath": f"messages/{message_id}/body",
            "bodySha256": body_sha256,
            "bodyBytes": len(body),
            "senderReceipt": sender_receipt,
            "createdAt": utc_now(),
            "delivery": {"status": "pending"},
            "ack": None,
        }
        atomic_write_json(target_dir / "message.json", record)
        if kind in {"report_ready", "report_failed"}:
            latest.setdefault("reports", {}).setdefault(sender, {"status": "pending"})["message"] = message_id
        latest["messageCount"] = len(list_message_records(job_dir))
        save_job(job_dir, latest)

    try:
        delivery_status, delivery_error = _deliver_message(job_dir, payload, record)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        delivery_status, delivery_error = "failed", f"{type(error).__name__}: {error}"
    updated, _final_status = _update_delivery(
        job_dir,
        message_id,
        status=delivery_status,
        error=delivery_error,
    )
    print(json.dumps(_message_metadata(updated), ensure_ascii=False, separators=(",", ":")))
    return 0 if updated.get("delivery", {}).get("status") == "accepted" else 1


def command_retry(args: argparse.Namespace) -> int:
    job_dir = resolve_job_dir(args.state_dir, args.job_id)
    payload = load_job(job_dir)
    if not is_callback_job(payload):
        raise ValueError("retry requires a callback job")
    principal, _receipt = revalidate_current_participant(payload)
    message_id = validate_message_id(args.message_id or args.message_id_pos or "")
    record = load_message(job_dir, message_id)
    if principal not in {record["from"], "parent"}:
        raise ValueError("only the original sender or exact parent may retry a message")
    original_sender = str(record["from"])
    if original_sender != "parent":
        revalidate_target_receipt(original_sender, participant_receipt(payload, original_sender))
    if record.get("delivery", {}).get("status") == "accepted":
        print(json.dumps(_message_metadata(record), ensure_ascii=False, separators=(",", ":")))
        return 0
    try:
        delivery_status, delivery_error = _deliver_message(job_dir, payload, record, retry=True)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        delivery_status, delivery_error = "failed", f"{type(error).__name__}: {error}"
    updated, _final_status = _update_delivery(
        job_dir,
        message_id,
        status=delivery_status,
        error=delivery_error,
        retry=True,
    )
    print(json.dumps(_message_metadata(updated), ensure_ascii=False, separators=(",", ":")))
    return 0 if updated.get("delivery", {}).get("status") == "accepted" else 1


def command_receive(args: argparse.Namespace) -> int:
    job_dir = resolve_job_dir(args.state_dir, args.job_id)
    payload = load_job(job_dir)
    if not is_callback_job(payload):
        raise ValueError("receive requires a callback job")
    principal, receipt = revalidate_current_participant(payload)
    message_id = validate_message_id(args.message_id or args.message_id_pos or "")
    record = load_message(job_dir, message_id)
    if record["to"] != principal:
        raise ValueError("message is not addressed to the current exact pane")
    body = read_message_body(job_dir, record)
    final_status: str | None = None
    with job_lock(job_dir):
        payload = load_job(job_dir)
        latest = load_message(job_dir, message_id)
        if latest.get("ack") is None:
            ack = {"at": utc_now(), "by": principal, "receipt": receipt}
            latest["ack"] = ack
            latest["ackAt"] = ack["at"]
            latest["ackBy"] = principal
            atomic_write_json(message_dir(job_dir, message_id) / "message.json", latest)
        final_status = _report_finalize_locked(job_dir, payload, latest)
        save_job(job_dir, payload)
    if final_status:
        mark_terminal(
            job_dir,
            status=final_status,
            summary=("all target reports acknowledged" if final_status == "done" else "all target reports acknowledged; at least one target reported failure"),
        )
    sys.stdout.buffer.write(body)
    return 0


def command_deadline(args: argparse.Namespace) -> int:
    job_dir = args.job_dir.expanduser().resolve(strict=True)
    time.sleep(args.timeout)
    try:
        with job_lock(job_dir):
            payload = load_job(job_dir)
            if payload.get("status") in TERMINAL_STATUSES:
                return 0
            payload["callbackDeadlineExpiredAt"] = utc_now()
            payload["summary"] = "callback silence deadline expired; explicit receive, retry, or recover is required"
            save_job(job_dir, payload)
        parent = payload["parentReceipt"]
        _revalidate_recipient(payload, "parent")
        recover_command = " ".join(
            shlex.quote(part)
            for part in (
                sys.executable,
                str(Path(__file__).resolve()),
                "recover",
                str(payload["id"]),
                "--state-dir",
                str(job_dir.parent),
            )
        )
        wake = (
            "[direct-cli callback attention] "
            f"job={payload['id']} reason=silence-deadline recover={recover_command} ; "
            "no continuous watcher was running"
        )
        subprocess.run(
            ["herdr", "pane", "run", str(parent["paneId"]), wake],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=call_timeout_seconds(),
        )
        deadline_delivery = "accepted"
    except (OSError, ValueError, KeyError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        deadline_delivery = f"failed:{type(error).__name__}"
    try:
        with job_lock(job_dir):
            payload = load_job(job_dir)
            payload["callbackDeadlineWake"] = deadline_delivery
            save_job(job_dir, payload)
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return 1
    return 0 if deadline_delivery == "accepted" else 1


def command_audit(args: argparse.Namespace) -> int:
    job_dir = resolve_job_dir(args.state_dir, args.job_id)
    payload = load_job(job_dir)
    if not is_callback_job(payload):
        raise ValueError("audit requires a callback job")
    principal, _receipt = revalidate_current_participant(payload)
    records = list_message_records(job_dir)
    if principal != "parent":
        if args.include_bodies:
            raise ValueError("only the exact parent may audit message bodies")
        records = [record for record in records if record["from"] == principal or record["to"] == principal]
    output = []
    for record in records:
        item = _message_metadata(record)
        if args.include_bodies:
            item["body"] = read_message_body(job_dir, record).decode("utf-8")
        output.append(item)
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def command_recover(args: argparse.Namespace) -> int:
    job_dir = resolve_job_dir(args.state_dir, args.job_id)
    with job_lock(job_dir):
        payload = load_job(job_dir)
        if payload.get("status") in TERMINAL_STATUSES:
            print(f"direct-cli: job is already terminal: {payload['status']}", file=sys.stderr)
            return 2
        payload["watcherFallback"] = True
        payload["recoveredAt"] = utc_now()
        payload["status"] = "running"
        save_job(job_dir, payload)
    try:
        launch_watcher(job_dir)
    except OSError as error:
        mark_terminal(job_dir, status="error", summary=f"watcher recovery launch failed: {type(error).__name__}")
        return 1
    print(f"job={payload['id']}")
    print("status=running")
    print("mode=watcher-recovery")
    print(f"job_dir={job_dir}")
    return 0


def iter_jobs(state_root: Path) -> list[dict[str, Any]]:
    if not state_root.exists():
        return []
    jobs = []
    for path in state_root.iterdir():
        if not path.is_dir() or path.is_symlink() or not JOB_ID_PATTERN.fullmatch(path.name):
            continue
        try:
            jobs.append(reconcile_job(path, load_job(path)))
        except (OSError, ValueError, KeyError, json.JSONDecodeError):
            continue
    return sorted(jobs, key=lambda job: str(job.get("createdAt", "")), reverse=True)


def command_list(args: argparse.Namespace) -> int:
    state_root = (args.state_dir or default_state_root()).expanduser().resolve()
    jobs = iter_jobs(state_root)
    if args.json:
        print(json.dumps(jobs, ensure_ascii=False, indent=2))
        return 0
    if not jobs:
        print("No direct-cli jobs.")
        return 0
    for job in jobs:
        collected = " collected" if job.get("collectedAt") else ""
        print(f"{job['id']}\t{job['status']}{collected}\t{job.get('summary', '')}")
    return 0


def resolve_job_dir(state_dir: Path | None, job_id: str) -> Path:
    validate_job_id(job_id)
    state_root = (state_dir or default_state_root()).expanduser().resolve()
    job_dir = state_root / job_id
    if not job_dir.is_dir() or job_dir.is_symlink():
        raise FileNotFoundError(f"direct-cli job not found: {job_id}")
    return job_dir


def command_show(args: argparse.Namespace) -> int:
    try:
        job_dir = resolve_job_dir(args.state_dir, args.job_id)
        payload = reconcile_job(job_dir, load_job(job_dir))
    except (OSError, ValueError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        return 1
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def command_collect(args: argparse.Namespace) -> int:
    try:
        job_dir = resolve_job_dir(args.state_dir, args.job_id)
        payload = reconcile_job(job_dir, load_job(job_dir))
    except (OSError, ValueError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        return 1
    if payload["status"] not in TERMINAL_STATUSES:
        print(f"direct-cli: job is not ready to collect: {payload['status']}", file=sys.stderr)
        return 2

    print(f"# Direct CLI job: {payload['id']}")
    print(f"status: {payload['status']}")
    print(f"summary: {payload.get('summary', '')}")
    for record in payload["targets"]:
        target = str(record["name"])
        if not AGENT_NAME_PATTERN.fullmatch(target):
            continue
        result_path = job_dir / "results" / f"{target}.txt"
        if result_path.is_file() and not result_path.is_symlink():
            print(f"\n## {target}\n")
            print(result_path.read_text(encoding="utf-8").rstrip())

    if not args.no_mark:
        with job_lock(job_dir):
            current = load_job(job_dir)
            current["collectedAt"] = utc_now()
            save_job(job_dir, current)
    return 0


def command_wait(args: argparse.Namespace) -> int:
    try:
        job_dir = resolve_job_dir(args.state_dir, args.job_id)
    except (OSError, ValueError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        return 1

    deadline = time.monotonic() + args.timeout if args.timeout is not None else None
    while True:
        try:
            payload = reconcile_job(job_dir, load_job(job_dir))
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
            print(f"direct-cli: {error}", file=sys.stderr)
            return 1

        if payload["status"] in TERMINAL_STATUSES:
            result = {
                "job": payload["id"],
                "status": payload["status"],
                "job_dir": str(job_dir),
            }
            if args.json:
                print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
            else:
                print(
                    f"job={result['job']}\tstatus={result['status']}\t"
                    f"job_dir={result['job_dir']}"
                )
            return 0

        if deadline is not None:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                print(
                    f"direct-cli: timed out waiting for job {payload['id']} "
                    f"while status was {payload['status']}",
                    file=sys.stderr,
                )
                return 2
            time.sleep(min(args.poll_interval, remaining))
        else:
            time.sleep(args.poll_interval)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Durable detached Herdr job registry for direct-cli.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="Dispatch a callback job or detached watcher.")
    start.add_argument("--job-id", required=True)
    start.add_argument("--prompt-file", required=True, type=Path)
    start.add_argument("--cwd", type=Path, default=Path.cwd())
    start.add_argument("--tab-id")
    start.add_argument("--state-dir", type=Path)
    start.add_argument(
        "--mode",
        "--routing",
        dest="mode",
        choices=("auto", "callback", "watcher"),
        default="auto",
        help="callback after exact pane receipts, or watcher fallback (default: auto)",
    )
    start.add_argument("--activity-timeout", type=float, default=10.0)
    start.add_argument("--settle-timeout-ms", type=int, default=1_800_000)
    start.add_argument("--result-lines", type=int, default=400)
    start.add_argument(
        "--callback-timeout",
        type=float,
        default=1_800,
        help="one-shot silence deadline in seconds for callback mode; 0 disables it",
    )
    notification = start.add_mutually_exclusive_group()
    notification.add_argument("--notify", action="store_true", dest="notify")
    notification.add_argument("--no-notify", action="store_false", dest="notify")
    start.set_defaults(notify=True, handler=command_start)
    start.add_argument("targets", nargs="+")

    send = subparsers.add_parser("send", help="Persist and deliver one callback message.")
    send.add_argument("job_id")
    send.add_argument("--to", required=True)
    send.add_argument("--kind", required=True)
    send.add_argument("--body-file", required=True, type=Path)
    send.add_argument("--idempotency-key", required=True)
    send.add_argument("--state-dir", type=Path)
    send.set_defaults(handler=command_send)

    receive = subparsers.add_parser("receive", help="Read and acknowledge one callback message.")
    receive.add_argument("job_id")
    receive.add_argument("message_id_pos", nargs="?")
    receive.add_argument("--message-id")
    receive.add_argument("--state-dir", type=Path)
    receive.set_defaults(handler=command_receive)

    retry = subparsers.add_parser("retry", help="Retry one durably failed callback delivery.")
    retry.add_argument("job_id")
    retry.add_argument("message_id_pos", nargs="?")
    retry.add_argument("--message-id")
    retry.add_argument("--state-dir", type=Path)
    retry.set_defaults(handler=command_retry)

    audit = subparsers.add_parser("audit", help="Show ACL-filtered callback message metadata.")
    audit.add_argument("job_id")
    audit.add_argument("--state-dir", type=Path)
    audit.add_argument("--json", action="store_true", help="Keep the default JSON output explicit.")
    audit.add_argument("--include-bodies", action="store_true", help="Include bounded bodies for the exact parent only.")
    audit.set_defaults(handler=command_audit)

    recover = subparsers.add_parser("recover", help="Explicitly invoke the existing watcher fallback.")
    recover.add_argument("job_id")
    recover.add_argument("--state-dir", type=Path)
    recover.set_defaults(handler=command_recover)

    list_parser = subparsers.add_parser("list", help="List durable direct-cli jobs.")
    list_parser.add_argument("--state-dir", type=Path)
    list_parser.add_argument("--json", action="store_true")
    list_parser.set_defaults(handler=command_list)

    show = subparsers.add_parser("show", help="Show one job record as JSON.")
    show.add_argument("job_id")
    show.add_argument("--state-dir", type=Path)
    show.set_defaults(handler=command_show)

    collect = subparsers.add_parser("collect", help="Print captured results and mark the job collected.")
    collect.add_argument("job_id")
    collect.add_argument("--state-dir", type=Path)
    collect.add_argument("--no-mark", action="store_true")
    collect.set_defaults(handler=command_collect)

    wait = subparsers.add_parser(
        "wait",
        help="Wait for terminal job state and print one completion record.",
    )
    wait.add_argument("job_id")
    wait.add_argument("--state-dir", type=Path)
    wait.add_argument("--timeout", type=float)
    wait.add_argument("--poll-interval", type=float, default=0.25)
    wait.add_argument("--json", action="store_true")
    wait.set_defaults(handler=command_wait)

    watch = subparsers.add_parser("_watch", help="Internal detached watcher process.")
    watch.add_argument("--job-dir", required=True, type=Path)
    watch.set_defaults(handler=command_watch)

    deadline = subparsers.add_parser("_deadline", help="Internal one-shot callback silence deadline.")
    deadline.add_argument("--job-dir", required=True, type=Path)
    deadline.add_argument("--timeout", required=True, type=float)
    deadline.set_defaults(handler=command_deadline)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "start":
        if not 0 < args.activity_timeout <= 300:
            parser.error("--activity-timeout must be between 0 and 300 seconds")
        if not 1_000 <= args.settle_timeout_ms <= 86_400_000:
            parser.error("--settle-timeout-ms must be between 1000 and 86400000")
        if not 1 <= args.result_lines <= 5_000:
            parser.error("--result-lines must be between 1 and 5000")
        if not 0 <= args.callback_timeout <= 86_400:
            parser.error("--callback-timeout must be between 0 and 86400 seconds")
    if args.command == "_deadline" and not 0 < args.timeout <= 86_400:
        parser.error("--timeout must be between 0 and 86400 seconds")
    if args.command == "wait":
        if args.timeout is not None and not 0 < args.timeout <= 86_400:
            parser.error("--timeout must be between 0 and 86400 seconds")
        if not 0.05 <= args.poll_interval <= 60:
            parser.error("--poll-interval must be between 0.05 and 60 seconds")
    try:
        return int(args.handler(args))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
