#!/usr/bin/env python3
"""Materialize the portable CCC V2 deny/noise policy into project settings."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from security_policy import (
    PolicyError,
    atomic_write_text,
    build_policy,
    materialize_settings,
    project_root_id,
    read_project_settings,
)


EXIT_OK = 0
EXIT_DRIFT = 1
EXIT_ERROR = 2


def _project_root(raw: str) -> Path:
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = Path.cwd() / candidate
    return candidate.absolute()


def _local_policy(root: Path, raw: str | None) -> Path | None:
    if raw is None:
        return None
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        candidate = root / candidate
    candidate = candidate.absolute()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise PolicyError("local policy must remain inside the project root") from exc
    return candidate


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Synchronize portable CCC V2 project excludes")
    parser.add_argument("--project-root", default=".", help="Git project root")
    parser.add_argument("--local-policy", help="Optional deny-only path pattern file inside the project")
    parser.add_argument("--check", action="store_true", help="Check drift without writing")
    parser.add_argument("--json", action="store_true", help="Emit metadata-only result JSON")
    args = parser.parse_args(argv)

    try:
        root = _project_root(args.project_root)
        policy = build_policy(root, _local_policy(root, args.local_policy))
        settings_path, current, settings_info = read_project_settings(root)
        desired = materialize_settings(current, policy)
        current_mode = settings_info.st_mode & 0o777
        changed = current != desired
        result = {
            "schema": "mahiro-ccc-security-v2-sync",
            "project_root_id": project_root_id(root),
            "settings": str(settings_path.relative_to(root)),
            "changed": changed,
            "check": bool(args.check),
            "security_pattern_count": len(policy.security_patterns) + len(policy.exact_denies),
            "noise_pattern_count": len(policy.noise_patterns),
            "content_scan_path_count": len(policy.content_scan_paths),
        }
        if args.check:
            exit_code = EXIT_DRIFT if changed else EXIT_OK
        else:
            if changed:
                atomic_write_text(settings_path, desired, mode=current_mode, label="project settings")
            exit_code = EXIT_OK
        if args.json:
            print(json.dumps(result, sort_keys=True))
        elif exit_code == EXIT_DRIFT:
            print("project settings drift from the portable CCC V2 policy", file=sys.stderr)
        elif not changed:
            print("project settings already match the portable CCC V2 policy")
        else:
            print("materialized the portable CCC V2 policy into project settings")
        return exit_code
    except (PolicyError, OSError, ValueError) as exc:
        print(f"CCC policy sync blocked: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
