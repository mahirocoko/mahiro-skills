#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Submit one UTF-8 prompt to multiple named Herdr agents and wait safely.",
    )
    parser.add_argument("--prompt-file", required=True, type=Path)
    parser.add_argument("--activity-timeout", type=float, default=7.0)
    parser.add_argument("--settle-timeout-ms", type=int, default=300_000)
    parser.add_argument("targets", nargs="+")
    return parser.parse_args()


def call_timeout_seconds() -> float:
    raw = os.environ.get("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS", "15")
    try:
        timeout = float(raw)
    except ValueError as error:
        raise ValueError("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS must be numeric") from error
    if not 0 < timeout <= 300:
        raise ValueError("DIRECT_CLI_HERDR_CALL_TIMEOUT_SECONDS must be between 0 and 300")
    return timeout


def run_json(*args: str) -> dict:
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


def main() -> int:
    args = parse_args()
    if args.activity_timeout <= 0:
        print("direct-cli: --activity-timeout must be positive", file=sys.stderr)
        return 2
    if args.settle_timeout_ms <= 0:
        print("direct-cli: --settle-timeout-ms must be positive", file=sys.stderr)
        return 2

    prompt = args.prompt_file.read_text(encoding="utf-8")
    if "\0" in prompt:
        print("direct-cli: Herdr prompt text cannot contain NUL bytes", file=sys.stderr)
        return 2

    baselines = {target: agent_state(target)[1] for target in args.targets}

    for target in args.targets:
        try:
            subprocess.run(
                ["herdr", "agent", "prompt", target, prompt],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=call_timeout_seconds(),
            )
        except subprocess.CalledProcessError as error:
            print(
                f"direct-cli: prompt dispatch failed for {target} with exit {error.returncode}",
                file=sys.stderr,
            )
            return 1
        except subprocess.TimeoutExpired:
            print(f"direct-cli: prompt dispatch timed out for {target}", file=sys.stderr)
            return 1

    pending = set(args.targets)
    deadline = time.monotonic() + args.activity_timeout
    while pending and time.monotonic() < deadline:
        for target in tuple(pending):
            status, sequence = agent_state(target)
            if sequence > baselines[target] or status == "working":
                pending.remove(target)
        if pending:
            time.sleep(0.1)

    if pending:
        joined = ", ".join(sorted(pending))
        print(
            "direct-cli: no activity transition observed for "
            f"{joined}; inspect each pane and submit one Enter only if the prompt is visibly unsent",
            file=sys.stderr,
        )
        return 3

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
                str(args.settle_timeout_ms),
            ],
            stdout=subprocess.DEVNULL,
        )
        for target in args.targets
    }

    failed = []
    wait_timeout = (args.settle_timeout_ms / 1000) + call_timeout_seconds()
    for target, process in waiters.items():
        try:
            return_code = process.wait(timeout=wait_timeout)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            failed.append(target)
            continue
        if return_code != 0:
            failed.append(target)
    if failed:
        print(
            "direct-cli: Herdr settle wait failed for " + ", ".join(failed),
            file=sys.stderr,
        )
        return 1

    for target in args.targets:
        print(f"target={target} status=settled")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"direct-cli: {error}", file=sys.stderr)
        raise SystemExit(1)
