#!/usr/bin/env python3
"""Filename-only CCC preflight; it never opens candidate source contents."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from security_policy import (
    PolicyError,
    build_policy,
    collect_candidates,
    materialize_settings,
    project_root_id,
    read_project_settings,
)


EXIT_OK = 0
EXIT_SETTINGS_DRIFT = 1
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
    parser = argparse.ArgumentParser(description="Run the explicit filename-only CCC preflight")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--local-policy")
    parser.add_argument("--check-settings", action="store_true")
    args = parser.parse_args(argv)

    try:
        root = _project_root(args.project_root)
        policy = build_policy(root, _local_policy(root, args.local_policy))
        candidates = collect_candidates(root, require_git=False)
        denied = [candidate.relative_path for candidate in candidates if candidate.classification.startswith("deny-")]
        env_examples = [
            candidate.relative_path
            for candidate in candidates
            if candidate.classification == "content-scan-env-example"
        ]
        classification_counts = Counter(candidate.classification for candidate in candidates)
        result = {
            "schema": "mahiro-ccc-security-v2-preflight",
            "mode": "filename-only",
            "equivalent_to_strict": False,
            "strict_content_scan_required": True,
            "project_root_id": project_root_id(root),
            "candidate_count": len(candidates),
            "scope_kind": "git-candidate-regular-files-before-settings-excludes",
            "classification_counts": dict(sorted(classification_counts.items())),
            "derived_sensitive_paths": sorted(denied),
            "env_example_content_scan_paths": sorted(env_examples),
            "policy_sha256": policy.policy_sha256,
            "noise_pattern_count": len(policy.noise_patterns),
        }
        if args.check_settings:
            _, current, _ = read_project_settings(root)
            desired = materialize_settings(current, policy)
            result["settings_current"] = current == desired
        print(json.dumps(result, sort_keys=True))
        if args.check_settings and not result["settings_current"]:
            return EXIT_SETTINGS_DRIFT
        return EXIT_OK
    except (PolicyError, OSError, ValueError) as exc:
        print(f"CCC filename-only preflight blocked: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
