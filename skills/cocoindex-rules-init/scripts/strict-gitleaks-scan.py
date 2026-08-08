#!/usr/bin/env python3
"""Run or validate the explicit Gitleaks V8.30.1 CCC strict-scan contract.

The strict path is the only path that reads source bytes, and it does so only
through the scanner staging/hash boundary. Filename-only mode is intentionally
separate and always labels itself non-equivalent to a content scan.
"""

from __future__ import annotations

import argparse
import hashlib
from collections import Counter
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from security_policy import (
    Candidate,
    GITLEAKS_CONFIG,
    GITLEAKS_TEMPLATE,
    GITLEAKS_VERSION,
    MAX_SOURCE_FILE_BYTES,
    PolicyError,
    atomic_write_text,
    build_policy,
    collect_candidates,
    extract_exclude_patterns,
    file_sha256,
    json_hash,
    materialize_settings,
    project_root_id,
    read_json_file,
    read_project_settings,
    secure_read_text,
    scanner_contract_metadata,
    source_manifest,
    validate_allowlist,
    validate_metadata_findings,
    validate_output_path,
)


EXIT_CLEAN = 0
EXIT_ERROR = 2
EXIT_FINDINGS = 3
EXIT_STALE = 4

DEFAULT_REPORT = ".cocoindex_code/ccc-security/strict-report.json"
DEFAULT_RECEIPT = ".cocoindex_code/ccc-security/strict-receipt.json"
SCANNER_TIMEOUT_SECONDS = 120
MAX_TARGET_MEGABYTES = 10
MAX_SCANNER_BINARY_BYTES = 256 * 1024 * 1024
STRICT_RUNTIME_PREFIX = ".cocoindex_code/ccc-security/"
SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")


class ScannerError(PolicyError):
    """A scanner/runtime failure that must not be reported as a finding."""


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


def _scanner_path(raw: str | None) -> Path:
    if raw:
        candidate = Path(raw).expanduser()
        if not candidate.is_absolute() and "/" not in raw:
            resolved = shutil.which(raw)
            if resolved is None:
                raise ScannerError("pinned Gitleaks scanner is missing")
            candidate = Path(resolved)
        elif not candidate.is_absolute():
            candidate = Path.cwd() / candidate
    else:
        resolved = shutil.which("gitleaks")
        if resolved is None:
            raise ScannerError("pinned Gitleaks scanner is missing")
        candidate = Path(resolved)
    try:
        info = os.lstat(candidate)
    except OSError as exc:
        raise ScannerError("pinned Gitleaks scanner is missing") from exc
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode) or not os.access(candidate, os.X_OK):
        raise ScannerError("pinned Gitleaks scanner path is unsafe")
    return candidate.absolute()


def _scanner_version(scanner: Path, timeout_seconds: float) -> str:
    try:
        result = subprocess.run(
            [str(scanner), "version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ScannerError("pinned Gitleaks version check timed out") from exc
    except OSError as exc:
        raise ScannerError("pinned Gitleaks version check failed") from exc
    try:
        output = (result.stdout + result.stderr).decode("utf-8", errors="replace")
    except AttributeError as exc:
        raise ScannerError("pinned Gitleaks version check returned malformed output") from exc
    if result.returncode != 0:
        raise ScannerError("pinned Gitleaks version check failed")
    versions = re.findall(r"(?<![0-9])v?([0-9]+\.[0-9]+\.[0-9]+)(?![0-9])", output)
    if GITLEAKS_VERSION not in versions or any(version != GITLEAKS_VERSION for version in versions):
        raise ScannerError("Gitleaks version does not match the pinned contract")
    return GITLEAKS_VERSION


def _ensure_output_parent(path: Path, project_root: Path) -> None:
    relative = path.relative_to(project_root)
    current = project_root
    for part in relative.parts[:-1]:
        current = current / part
        if current.exists() or current.is_symlink():
            info = os.lstat(current)
            if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
                raise PolicyError("unsafe report or receipt parent")
        else:
            current.mkdir(mode=0o700)


def _write_json(path: Path, value: object, project_root: Path) -> None:
    _ensure_output_parent(path, project_root)
    atomic_write_text(
        path,
        json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        label="security report or receipt",
    )


def _metadata_error_report(project_root: Path, report_path: Path, code: str) -> None:
    payload = {
        "schema": "mahiro-ccc-security-v2-report",
        "mode": "strict",
        "equivalent_to_strict": True,
        "status": "error",
        "error_code": code,
        "project_root_id": project_root_id(project_root),
        "findings": [],
    }
    try:
        _write_json(report_path, payload, project_root)
    except (OSError, PolicyError):
        pass


def _source_metadata(root: Path, local_policy: Path | None):
    policy = build_policy(root, local_policy)
    settings_path, settings_text, _ = read_project_settings(root)
    desired = materialize_settings(settings_text, policy)
    if settings_text != desired:
        raise ScannerError("project settings do not match the portable CCC V2 policy")
    settings_excludes = extract_exclude_patterns(settings_text)
    candidates = collect_candidates(
        root,
        require_git=True,
        exclude_patterns=settings_excludes,
    )
    if any(Path(candidate.relative_path).name == ".gitleaksignore" for candidate in candidates):
        raise ScannerError("unmanaged target .gitleaksignore is not accepted")
    if any(candidate.relative_path.startswith(STRICT_RUNTIME_PREFIX) for candidate in candidates):
        raise ScannerError("CCC runtime output reached the strict source scope")
    scope_sha256, content_sha256, file_count, total_bytes = source_manifest(candidates)
    candidate_paths = {candidate.relative_path for candidate in candidates}
    allowlist_path = None
    return {
        "policy": policy,
        "settings_path": settings_path,
        "settings_text": settings_text,
        "settings_excludes": settings_excludes,
        "settings_sha256": hashlib.sha256(settings_text.encode("utf-8")).hexdigest(),
        "candidates": candidates,
        "candidate_paths": candidate_paths,
        "scope_sha256": scope_sha256,
        "content_sha256": content_sha256,
        "file_count": file_count,
        "total_bytes": total_bytes,
        "allowlist_path": allowlist_path,
    }


def _validate_expected_binary_sha256(raw: str | None) -> str:
    if raw is None:
        raise PolicyError("strict mode requires an approved scanner binary SHA-256")
    if SHA256_PATTERN.fullmatch(raw) is None:
        raise PolicyError("expected scanner binary SHA-256 must be 64 hexadecimal characters")
    return raw.lower()


def _identity(
    root: Path,
    local_policy: Path | None,
    scanner_raw: str | None,
    timeout_seconds: float,
    allowlist_raw: str | None,
    expected_binary_sha256: str | None,
):
    metadata = _source_metadata(root, local_policy)
    scanner = _scanner_path(scanner_raw)
    binary_sha256 = file_sha256(
        scanner,
        "pinned Gitleaks scanner",
        max_bytes=MAX_SCANNER_BINARY_BYTES,
    )
    expected = _validate_expected_binary_sha256(expected_binary_sha256)
    if binary_sha256 != expected:
        raise ScannerError("Gitleaks scanner binary SHA-256 does not match the expected value")
    scanner_version = _scanner_version(scanner, timeout_seconds)
    config_sha256 = file_sha256(GITLEAKS_CONFIG, "reviewed Gitleaks config")
    template_sha256 = file_sha256(GITLEAKS_TEMPLATE, "metadata-only report template")
    allowlist_path = None
    if allowlist_raw is not None:
        candidate = Path(allowlist_raw).expanduser()
        if not candidate.is_absolute():
            candidate = root / candidate
        candidate = candidate.absolute()
        try:
            candidate.relative_to(root)
        except ValueError as exc:
            raise PolicyError("allowlist must remain inside the project root") from exc
        allowlist_path = candidate
    allowlist, allowlist_sha256 = validate_allowlist(
        allowlist_path,
        metadata["candidate_paths"],
        root,
    )
    scanner_metadata = scanner_contract_metadata(
        config_sha256,
        template_sha256,
        metadata["settings_sha256"],
        metadata["policy"],
        binary_sha256,
    )
    scanner_metadata["version_checked"] = scanner_version
    identity = {
        "schema": "mahiro-ccc-security-v2-receipt",
        "mode": "strict",
        "equivalent_to_strict": True,
        "project_root_id": project_root_id(root),
        "scanner": scanner_metadata,
        "policy": {
            "policy_sha256": metadata["policy"].policy_sha256,
            "local_policy_sha256": metadata["policy"].local_policy_sha256,
        },
        "settings_sha256": metadata["settings_sha256"],
        "scope": {
            "scope_sha256": metadata["scope_sha256"],
            "content_sha256": metadata["content_sha256"],
            "file_count": metadata["file_count"],
            "total_bytes": metadata["total_bytes"],
            "scope_kind": "post-settings/index-candidate-regular-files",
            "candidate_source": "tracked-and-untracked-nonignored-regular-files",
            "settings_excludes_applied": True,
            "history_scanned": False,
            "external_symlink_traversal": False,
        },
        "allowlist_sha256": allowlist_sha256,
    }
    return identity, metadata, allowlist


def _copy_snapshot(source: Path, destination: Path) -> None:
    try:
        source_info = os.lstat(source)
    except OSError as exc:
        raise ScannerError("cannot inspect a source file for strict scan") from exc
    if stat.S_ISLNK(source_info.st_mode) or not stat.S_ISREG(source_info.st_mode):
        raise ScannerError("a source file changed to an unsafe non-regular path")
    if source_info.st_size > MAX_SOURCE_FILE_BYTES:
        raise ScannerError("a source file exceeds the strict scan file-size limit")

    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    source_fd = None
    destination_fd = None
    try:
        source_fd = os.open(source, flags)
        opened_info = os.fstat(source_fd)
        if (
            not stat.S_ISREG(opened_info.st_mode)
            or opened_info.st_dev != source_info.st_dev
            or opened_info.st_ino != source_info.st_ino
        ):
            raise ScannerError("a source file changed during strict scan staging")
        destination_fd = os.open(
            destination,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
        )
        os.fchmod(destination_fd, 0o600)
        copied = 0
        while True:
            chunk = os.read(source_fd, 1024 * 1024)
            if not chunk:
                break
            copied += len(chunk)
            if copied > MAX_SOURCE_FILE_BYTES:
                raise ScannerError("a source file exceeds the strict scan file-size limit")
            offset = 0
            while offset < len(chunk):
                offset += os.write(destination_fd, chunk[offset:])
        os.fsync(destination_fd)
    except ScannerError:
        raise
    except OSError as exc:
        raise ScannerError("cannot stage a validated source file for strict scan") from exc
    finally:
        if destination_fd is not None:
            os.close(destination_fd)
        if source_fd is not None:
            os.close(source_fd)

    try:
        after_info = os.lstat(source)
    except OSError as exc:
        raise ScannerError("source file disappeared during strict scan staging") from exc
    if (
        stat.S_ISLNK(after_info.st_mode)
        or not stat.S_ISREG(after_info.st_mode)
        or after_info.st_dev != opened_info.st_dev
        or after_info.st_ino != opened_info.st_ino
        or after_info.st_size != opened_info.st_size
        or after_info.st_mtime_ns != opened_info.st_mtime_ns
    ):
        raise ScannerError("a source file changed during strict scan staging")
    os.chmod(destination, 0o600)


@contextmanager
def _staged_scan_tree(candidates) -> Iterator[Path]:
    """Build a private copied snapshot without following source links."""

    with tempfile.TemporaryDirectory(prefix="mahiro-ccc-gitleaks-") as temporary_name:
        scan_root = Path(temporary_name)
        os.chmod(scan_root, 0o700)
        for candidate in candidates:
            destination = scan_root.joinpath(*candidate.relative_path.split("/"))
            current = scan_root
            for part in destination.relative_to(scan_root).parts[:-1]:
                current = current / part
                try:
                    info = os.lstat(current)
                except FileNotFoundError:
                    current.mkdir(mode=0o700)
                    info = os.lstat(current)
                except OSError as exc:
                    raise ScannerError("cannot prepare the private strict scan tree") from exc
                if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
                    raise ScannerError("unsafe path in the private strict scan tree")
                os.chmod(current, 0o700)
            _copy_snapshot(candidate.absolute_path, destination)
        yield scan_root


def _run_gitleaks(scanner: Path, scan_root: Path, candidate_paths: set[str], timeout_seconds: float) -> list[dict[str, object]]:
    raw_report = scan_root / ".mahiro-metadata-report.json"
    controlled_ignore = scan_root / ".mahiro-controlled-gitleaksignore"
    controlled_ignore.write_text("", encoding="utf-8")
    os.chmod(controlled_ignore, 0o600)
    command = [
        str(scanner),
        "dir",
        "--config",
        str(GITLEAKS_CONFIG),
        "--report-format",
        "template",
        "--report-template",
        str(GITLEAKS_TEMPLATE),
        "--report-path",
        str(raw_report),
        "--redact=100",
        "--no-banner",
        "--log-level",
        "error",
        "--max-target-megabytes",
        str(MAX_TARGET_MEGABYTES),
        "--max-decode-depth",
        "0",
        "--max-archive-depth",
        "0",
        "--gitleaks-ignore-path",
        str(controlled_ignore),
        "--ignore-gitleaks-allow",
        "--exit-code",
        "3",
        str(scan_root),
    ]
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ScannerError("Gitleaks strict scan timed out") from exc
    except OSError as exc:
        raise ScannerError("Gitleaks strict scan could not start") from exc
    if not raw_report.exists() or raw_report.is_symlink():
        raise ScannerError("Gitleaks did not produce the metadata-only report")
    try:
        raw = json.loads(secure_read_text(raw_report, "scanner metadata-only report"))
    except (OSError, PolicyError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ScannerError("Gitleaks metadata-only report is malformed") from exc
    findings = validate_metadata_findings(raw, scan_root, candidate_paths)
    if result.returncode == EXIT_CLEAN and not findings:
        return findings
    if result.returncode == EXIT_FINDINGS and findings:
        return findings
    raise ScannerError("Gitleaks strict scan returned an error or mismatched its report")


def _map_findings(findings: list[dict[str, object]], candidates) -> list[dict[str, object]]:
    candidate_paths = {candidate.relative_path for candidate in candidates}
    mapped: list[dict[str, object]] = []
    for finding in findings:
        if finding["path"] not in candidate_paths:
            raise ScannerError("Gitleaks metadata report path is not in the validated source scope")
        mapped.append(finding)
    return mapped


def _invalidate_receipt(receipt_path: Path) -> None:
    try:
        info = os.lstat(receipt_path)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise PolicyError("cannot inspect the previous strict receipt") from exc
    if stat.S_ISLNK(info.st_mode):
        raise PolicyError("symlinked strict receipt is not accepted")
    if not stat.S_ISREG(info.st_mode):
        raise PolicyError("strict receipt is not a regular file")
    try:
        receipt_path.unlink()
    except FileNotFoundError:
        return
    except OSError as exc:
        raise PolicyError("cannot invalidate the previous strict receipt") from exc


def _check_receipt(root: Path, receipt_path: Path, identity: dict[str, object]) -> int:
    try:
        raw = read_json_file(receipt_path, "strict receipt", root=root)
    except PolicyError:
        print("strict receipt is missing or malformed", file=sys.stderr)
        return EXIT_STALE
    if not isinstance(raw, dict):
        print("strict receipt is stale", file=sys.stderr)
        return EXIT_STALE
    comparable = (
        "schema",
        "mode",
        "equivalent_to_strict",
        "project_root_id",
        "scanner",
        "policy",
        "settings_sha256",
        "scope",
        "allowlist_sha256",
    )
    if any(raw.get(key) != identity.get(key) for key in comparable):
        print("strict receipt is stale or its scanner/rules/policy binding changed", file=sys.stderr)
        return EXIT_STALE
    status = raw.get("status")
    if status == "findings":
        print("strict receipt records findings", file=sys.stderr)
        return EXIT_FINDINGS
    if status != "clean":
        print("strict receipt is not a clean strict-scan receipt", file=sys.stderr)
        return EXIT_STALE
    print("strict receipt is fresh")
    return EXIT_CLEAN


def _filename_only(root: Path, local_policy: Path | None, report_path: Path, receipt_path: Path) -> int:
    policy = build_policy(root, local_policy)
    candidates = collect_candidates(root, require_git=False)
    denied = sorted(candidate.relative_path for candidate in candidates if candidate.classification.startswith("deny-"))
    env_examples = sorted(
        candidate.relative_path for candidate in candidates if candidate.classification == "content-scan-env-example"
    )
    classification_counts = Counter(candidate.classification for candidate in candidates)
    scope_sha256 = json_hash([candidate.relative_path for candidate in candidates])
    payload = {
        "schema": "mahiro-ccc-security-v2-report",
        "mode": "filename-only",
        "equivalent_to_strict": False,
        "strict_content_scan_required": True,
        "status": "non-equivalent",
        "project_root_id": project_root_id(root),
        "scope": {
            "scope_sha256": scope_sha256,
            "file_count": len(candidates),
            "scope_kind": "git-candidate-regular-files-before-settings-excludes",
            "candidate_source": "tracked-and-untracked-nonignored-regular-files",
            "settings_excludes_applied": False,
            "history_scanned": False,
            "external_symlink_traversal": False,
        },
        "policy": {"policy_sha256": policy.policy_sha256},
        "classification_counts": dict(sorted(classification_counts.items())),
        "derived_sensitive_paths": denied,
        "env_example_content_scan_paths": env_examples,
        "findings": [],
    }
    _write_json(report_path, payload, root)
    receipt = dict(payload)
    receipt["schema"] = "mahiro-ccc-security-v2-receipt"
    receipt["receipt_kind"] = "filename-only-preflight"
    _write_json(receipt_path, receipt, root)
    print("filename-only preflight completed; it is not equivalent to strict content scanning")
    return EXIT_CLEAN


def _strict_scan(
    root: Path,
    local_policy: Path | None,
    scanner_raw: str | None,
    report_path: Path,
    receipt_path: Path,
    timeout_seconds: float,
    allowlist_raw: str | None,
    expected_binary_sha256: str | None,
) -> int:
    identity, metadata, allowlist = _identity(
        root,
        local_policy,
        scanner_raw,
        timeout_seconds,
        allowlist_raw,
        expected_binary_sha256,
    )
    scanner = _scanner_path(scanner_raw)
    candidates = metadata["candidates"]
    expected_manifest = (
        metadata["scope_sha256"],
        metadata["content_sha256"],
        metadata["file_count"],
        metadata["total_bytes"],
    )
    try:
        with _staged_scan_tree(candidates) as scan_root:
            staged_candidates = tuple(
                Candidate(
                    candidate.relative_path,
                    scan_root.joinpath(*candidate.relative_path.split("/")),
                    candidate.classification,
                )
                for candidate in candidates
            )
            staged_manifest = source_manifest(staged_candidates)
            if staged_manifest != expected_manifest:
                raise ScannerError("staged source snapshot does not match the bound source identity")
            findings = _run_gitleaks(
                scanner,
                scan_root,
                {candidate.relative_path for candidate in candidates},
                timeout_seconds,
            )
            findings = _map_findings(findings, candidates)
    except ScannerError:
        raise
    except (OSError, PolicyError) as exc:
        raise ScannerError("source snapshot validation failed") from exc

    try:
        current_manifest = source_manifest(candidates)
    except (OSError, PolicyError) as exc:
        raise ScannerError("source scope changed during strict scan") from exc
    if current_manifest != expected_manifest:
        raise ScannerError("source scope changed during strict scan")

    settings_path = metadata["settings_path"]
    if not isinstance(settings_path, Path):
        raise ScannerError("project settings identity is malformed")
    try:
        current_settings_text = secure_read_text(settings_path, "project settings", root=root)
    except (OSError, PolicyError) as exc:
        raise ScannerError("project settings changed during strict scan") from exc
    current_settings_sha256 = hashlib.sha256(current_settings_text.encode("utf-8")).hexdigest()
    if current_settings_sha256 != identity.get("settings_sha256"):
        raise ScannerError("project settings changed during strict scan")

    scanner_metadata = identity["scanner"]
    if not isinstance(scanner_metadata, dict):
        raise ScannerError("scanner identity metadata is malformed")
    try:
        current_binary_sha256 = file_sha256(
            scanner,
            "pinned Gitleaks scanner",
            max_bytes=MAX_SCANNER_BINARY_BYTES,
        )
    except (OSError, PolicyError) as exc:
        raise ScannerError("pinned Gitleaks scanner changed during strict scan") from exc
    if current_binary_sha256 != scanner_metadata.get("binary_sha256"):
        raise ScannerError("pinned Gitleaks scanner changed during strict scan")

    effective_findings: list[dict[str, object]] = []
    allowlisted_count = 0
    for finding in findings:
        key = (finding["path"], finding["rule_id"], finding["fingerprint"])
        if key in allowlist:
            allowlisted_count += 1
        else:
            effective_findings.append(finding)
    status = "findings" if effective_findings else "clean"
    report = dict(identity)
    report["schema"] = "mahiro-ccc-security-v2-report"
    report["status"] = status
    report["scanner_result"] = "findings" if findings else "clean"
    report["finding_count"] = len(effective_findings)
    report["allowlisted_finding_count"] = allowlisted_count
    report["findings"] = effective_findings
    _write_json(report_path, report, root)
    receipt = dict(identity)
    receipt["status"] = status
    receipt["finding_count"] = len(effective_findings)
    receipt["allowlisted_finding_count"] = allowlisted_count
    _write_json(receipt_path, receipt, root)
    if effective_findings:
        print("strict Gitleaks scan found findings; strict mode failed closed", file=sys.stderr)
        return EXIT_FINDINGS
    print("strict Gitleaks scan completed with no unallowlisted findings")
    return EXIT_CLEAN


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CCC V2 strict Gitleaks integration")
    parser.add_argument("action", nargs="?", choices=("scan", "check", "filename-only"), default="scan")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--local-policy")
    parser.add_argument("--gitleaks", help="Pinned scanner path or executable name; never downloaded")
    parser.add_argument(
        "--expected-binary-sha256",
        help="Approved SHA-256 for the scanner executable; required in strict mode",
    )
    parser.add_argument("--report", default=DEFAULT_REPORT)
    parser.add_argument("--receipt", default=DEFAULT_RECEIPT)
    parser.add_argument("--allowlist", help="Governed JSON path+rule_id+fingerprint entries")
    parser.add_argument("--mode", choices=("strict", "filename-only"), default="strict")
    parser.add_argument("--check-receipt", action="store_true")
    parser.add_argument("--timeout-seconds", type=float, default=SCANNER_TIMEOUT_SECONDS)
    args = parser.parse_args(argv)

    try:
        if args.timeout_seconds <= 0 or args.timeout_seconds > 600:
            raise PolicyError("timeout must be between 0 and 600 seconds")
        root = _project_root(args.project_root)
        report_path = validate_output_path(root, args.report, DEFAULT_REPORT)
        receipt_path = validate_output_path(root, args.receipt, DEFAULT_RECEIPT)
        local_policy = _local_policy(root, args.local_policy)

        if args.action == "filename-only" or args.mode == "filename-only":
            return _filename_only(root, local_policy, report_path, receipt_path)

        if args.action == "check" or args.check_receipt:
            identity, _, _ = _identity(
                root,
                local_policy,
                args.gitleaks,
                args.timeout_seconds,
                args.allowlist,
                args.expected_binary_sha256,
            )
            return _check_receipt(root, receipt_path, identity)

        _invalidate_receipt(receipt_path)
        try:
            return _strict_scan(
                root,
                local_policy,
                args.gitleaks,
                report_path,
                receipt_path,
                args.timeout_seconds,
                args.allowlist,
                args.expected_binary_sha256,
            )
        except ScannerError as exc:
            _metadata_error_report(root, report_path, "scanner-or-contract-error")
            print(f"strict Gitleaks scan blocked: {exc}", file=sys.stderr)
            return EXIT_ERROR
    except (PolicyError, OSError, ValueError) as exc:
        print(f"CCC strict scan blocked: {exc}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
