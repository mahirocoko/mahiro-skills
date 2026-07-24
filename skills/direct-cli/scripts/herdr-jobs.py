#!/usr/bin/env python3

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from typing import Any

try:
    import fcntl
except ImportError:  # pragma: no cover - Herdr Phase 1 is currently exercised on POSIX
    fcntl = None


SCHEMA = "direct-cli.herdr-job.v1"
JOB_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{0,79}$")
AGENT_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")
TERMINAL_STATUSES = {"attention", "done", "error"}


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


def load_job(job_dir: Path) -> dict[str, Any]:
    if job_dir.is_symlink():
        raise ValueError("job directory must not be a symlink")
    payload = json.loads((job_dir / "job.json").read_text(encoding="utf-8"))
    if payload.get("schema") != SCHEMA:
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
    with job_lock(job_dir):
        latest = load_job(job_dir)
        if latest.get("status") in TERMINAL_STATUSES:
            return
        latest["status"] = status
        latest["summary"] = summary
        latest["finishedAt"] = utc_now()
        latest["notification"] = "pending" if send_notification else "not-sent"
        save_job(job_dir, latest)

    notification = notify(
        latest["id"],
        status,
        bool(latest["options"]["notify"]) and send_notification,
    )
    with job_lock(job_dir):
        current = load_job(job_dir)
        if current.get("status") == status and current.get("notification") == "pending":
            current["notification"] = notification
            save_job(job_dir, current)


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
    (job_dir / "results").mkdir(mode=0o700)
    atomic_write_text(job_dir / "prompt.txt", prompt)

    payload: dict[str, Any] = {
        "schema": SCHEMA,
        "id": job_id,
        "status": "dispatching",
        "createdAt": utc_now(),
        "cwd": str(cwd),
        "tabId": args.tab_id,
        "promptSha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "targets": target_records,
        "options": {
            "activityTimeoutSeconds": args.activity_timeout,
            "settleTimeoutMs": args.settle_timeout_ms,
            "resultLines": args.result_lines,
            "callTimeoutSeconds": call_timeout_seconds(),
            "notify": args.notify,
        },
    }
    save_job(job_dir, payload)

    dispatch_target = "unknown"
    try:
        for target in targets:
            dispatch_target = target
            subprocess.run(
                ["herdr", "agent", "prompt", target, prompt],
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

    payload["status"] = "running"
    payload["dispatchedAt"] = utc_now()
    save_job(job_dir, payload)

    watcher_log = job_dir / "watcher.log"
    log_descriptor = os.open(watcher_log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(log_descriptor, "a", encoding="utf-8") as log_handle:
        try:
            subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "_watch", "--job-dir", str(job_dir)],
                stdin=subprocess.DEVNULL,
                stdout=log_handle,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                close_fds=True,
            )
        except OSError as error:
            payload = load_job(job_dir)
            mark_terminal(
                job_dir,
                status="error",
                summary=f"watcher launch failed: {error}",
            )
            return 1

    print(f"job={job_id}")
    print("status=running")
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


def watcher_process_matches(pid: int, job_dir: Path) -> bool:
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
    return "herdr-jobs.py _watch" in command and str(job_dir) in command


def reconcile_job(job_dir: Path, payload: dict[str, Any]) -> dict[str, Any]:
    status = str(payload.get("status", ""))
    if status in TERMINAL_STATUSES:
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Durable detached Herdr job registry for direct-cli.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="Dispatch a prompt and launch a detached watcher.")
    start.add_argument("--job-id", required=True)
    start.add_argument("--prompt-file", required=True, type=Path)
    start.add_argument("--cwd", type=Path, default=Path.cwd())
    start.add_argument("--tab-id")
    start.add_argument("--state-dir", type=Path)
    start.add_argument("--activity-timeout", type=float, default=10.0)
    start.add_argument("--settle-timeout-ms", type=int, default=1_800_000)
    start.add_argument("--result-lines", type=int, default=400)
    notification = start.add_mutually_exclusive_group()
    notification.add_argument("--notify", action="store_true", dest="notify")
    notification.add_argument("--no-notify", action="store_false", dest="notify")
    start.set_defaults(notify=True, handler=command_start)
    start.add_argument("targets", nargs="+")

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

    watch = subparsers.add_parser("_watch", help="Internal detached watcher process.")
    watch.add_argument("--job-dir", required=True, type=Path)
    watch.set_defaults(handler=command_watch)
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
    try:
        return int(args.handler(args))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
