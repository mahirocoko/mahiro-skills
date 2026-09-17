#!/usr/bin/env python3
"""Filename-only policy and portable settings helpers for CCC security V2.

This module deliberately keeps the filename preflight separate from strict scan
content reads. The preflight reads only Git metadata, directory entries, policy
resources, and project settings. Strict scanner code may call hash_file when it
has crossed the explicit scanner/content boundary.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


SCHEMA_VERSION = "mahiro-ccc-security-v2"
GITLEAKS_VERSION = "8.30.1"
GITLEAKS_LICENSE = "MIT"
GITLEAKS_ARCHIVE_SHA256 = "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
MAX_POLICY_BYTES = 2 * 1024 * 1024
MAX_FILE_SIZE_CAP = 5 * 1024 * 1024
MAX_SOURCE_FILE_BYTES = MAX_FILE_SIZE_CAP
GIT_COMMAND_TIMEOUT_SECONDS = 10
MAX_EXCLUDE_PATTERN_BYTES = 512

MANAGED_BEGIN = "# BEGIN MAHIRO CCC V2 MANAGED EXCLUDES"
MANAGED_END = "# END MAHIRO CCC V2 MANAGED EXCLUDES"
MANAGED_INCLUDE_BEGIN = "# BEGIN MAHIRO CCC V2 MANAGED INCLUDES"
MANAGED_INCLUDE_END = "# END MAHIRO CCC V2 MANAGED INCLUDES"
SECURITY_HEADER = "# SECURITY: portable credential/path denies; local policy may only add denies"
NOISE_HEADER = "# NOISE: portable performance exclusions; not a security policy"
DERIVED_HEADER = "# SECURITY: filename-only derived exact paths"
CONTENT_SCAN_INCLUDE_HEADER = "# CONTENT: safe templates admitted only after strict scanning"

RESOURCE_DIR = Path(__file__).resolve().parent.parent / "resources"
CREDENTIAL_BASELINE = RESOURCE_DIR / "portable-credential-deny-baseline.txt"
NOISE_BASELINE = RESOURCE_DIR / "portable-noise-performance-baseline.txt"
GITLEAKS_CONFIG = RESOURCE_DIR / "gitleaks-config.toml"
GITLEAKS_TEMPLATE = RESOURCE_DIR / "gitleaks-metadata-report.tmpl"

# These are the broad V1 defaults that must not remain in the V2 project
# boundary. They are removed only from exclude_patterns, never include_patterns.
LEGACY_BROAD_EXCLUDES = frozenset(
    {
        "**/.*",
        "**/*.json",
        "**/*.yaml",
        "**/*.yml",
        "**/*.toml",
        "**/*.xml",
        "**/*.txt",
        "**/*.env.*",
    }
)

SENSITIVE_DIRECTORY_NAMES = frozenset(
    {
        "credentials",
        "credential",
        "secrets",
        "secret",
        "private-keys",
        "private_keys",
        "keyring",
        ".aws",
        ".azure",
        ".docker",
        ".kube",
    }
)
SENSITIVE_EXACT_PATHS = frozenset(
    {
        (".claude", "settings.local.json"),
        (".letta", "settings.local.json"),
    }
)
SENSITIVE_PROVIDER_PATHS = frozenset(
    {
        (".config", "gcloud"),
        (".config", "gh"),
        (".config", "aws"),
    }
)
SENSITIVE_BASENAMES = frozenset(
    {
        "credentials",
        "credential",
        "credentials.json",
        "credential.json",
        "service-account.json",
        "service_account.json",
        "application_default_credentials.json",
        ".npmrc",
        ".pypirc",
        ".netrc",
        "tokens.json",
        "token-store",
        "token_store",
        "private-key",
        "private_key",
        "secret-key",
        "secret_key",
    }
)
SENSITIVE_SUFFIXES = frozenset({".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".der"})
DOTENV_TEMPLATE_BASENAMES = frozenset({".env.example", ".env.sample", ".env.template"})
DOTENV_TEMPLATE_INCLUDE_PATTERNS = tuple(f"**/{name}" for name in sorted(DOTENV_TEMPLATE_BASENAMES))
NOISE_FALLBACK_DIRECTORIES = frozenset(
    {
        ".git",
        ".cocoindex_code",
        "node_modules",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        ".cache",
        ".next",
        ".turbo",
        "target",
        "build",
        "dist",
        "coverage",
        "vendor",
    }
)


class PolicyError(RuntimeError):
    """A fail-closed policy, path, settings, or metadata error."""


def _assert_safe_parent_chain(path: Path, label: str, root: Path | None = None) -> None:
    if root is not None:
        try:
            relative = path.relative_to(root)
        except ValueError as exc:
            raise PolicyError(f"{label} must remain inside its project root") from exc
        current = root
        parts = relative.parts[:-1]
        for part in parts:
            current = current / part
            try:
                info = os.lstat(current)
            except FileNotFoundError as exc:
                raise PolicyError(f"missing parent of {label}") from exc
            except OSError as exc:
                raise PolicyError(f"cannot inspect parent of {label}") from exc
            if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
                raise PolicyError(f"unsafe parent of {label}")
        try:
            root_info = os.lstat(root)
        except OSError as exc:
            raise PolicyError(f"cannot inspect project root for {label}") from exc
        if stat.S_ISLNK(root_info.st_mode) or not stat.S_ISDIR(root_info.st_mode):
            raise PolicyError(f"unsafe project root for {label}")
        return

    # Resource paths are not project-relative, so stop at the nearest existing
    # ancestor rather than rejecting host aliases such as macOS /var.
    current = path.parent
    while True:
        try:
            info = os.lstat(current)
        except FileNotFoundError:
            if current == current.parent:
                return
            current = current.parent
            continue
        except OSError as exc:
            raise PolicyError(f"cannot inspect parent of {label}") from exc
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            raise PolicyError(f"unsafe parent of {label}")
        return


@dataclass(frozen=True)
class Candidate:
    relative_path: str
    absolute_path: Path
    classification: str


@dataclass(frozen=True)
class PolicySnapshot:
    include_patterns: tuple[str, ...]
    security_patterns: tuple[str, ...]
    noise_patterns: tuple[str, ...]
    exact_denies: tuple[str, ...]
    content_scan_paths: tuple[str, ...]
    local_policy_sha256: str
    policy_sha256: str
    max_file_size: int = MAX_FILE_SIZE_CAP

    @property
    def all_managed_patterns(self) -> tuple[str, ...]:
        return _unique((*self.security_patterns, *self.exact_denies, *self.noise_patterns))


def _dedupe(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return tuple(result)


def _unique(values: Iterable[str]) -> tuple[str, ...]:
    return _dedupe(values)


def _assert_regular_not_symlink(path: Path, label: str, root: Path | None = None) -> os.stat_result:
    _assert_safe_parent_chain(path, label, root)
    try:
        info = os.lstat(path)
    except FileNotFoundError as exc:
        raise PolicyError(f"missing {label}") from exc
    except OSError as exc:
        raise PolicyError(f"cannot inspect {label}") from exc
    if stat.S_ISLNK(info.st_mode):
        raise PolicyError(f"symlinked {label} is not accepted")
    if not stat.S_ISREG(info.st_mode):
        raise PolicyError(f"{label} is not a regular file")
    return info


def secure_read_bytes(
    path: Path,
    label: str,
    limit: int = MAX_POLICY_BYTES,
    root: Path | None = None,
) -> bytes:
    """Read a non-secret policy/config file without following a symlink."""

    info = _assert_regular_not_symlink(path, label, root)
    if info.st_size > limit:
        raise PolicyError(f"{label} exceeds the allowed size")

    flags = os.O_RDONLY
    nofollow = getattr(os, "O_NOFOLLOW", 0)
    if nofollow:
        flags |= nofollow
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise PolicyError(f"cannot open {label}") from exc
    try:
        with os.fdopen(fd, "rb") as handle:
            data = handle.read(limit + 1)
    except OSError as exc:
        raise PolicyError(f"cannot read {label}") from exc
    if len(data) > limit:
        raise PolicyError(f"{label} exceeds the allowed size")
    return data


def secure_read_text(
    path: Path,
    label: str,
    limit: int = MAX_POLICY_BYTES,
    root: Path | None = None,
) -> str:
    data = secure_read_bytes(path, label, limit, root)
    if b"\x00" in data:
        raise PolicyError(f"malformed {label}")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise PolicyError(f"malformed UTF-8 in {label}") from exc


def _validate_pattern(pattern: str, label: str) -> str:
    value = pattern.strip()
    if not value or value.startswith("#"):
        raise PolicyError(f"empty or comment pattern in {label}")
    if len(value) > 512 or "\x00" in value or any(ord(char) < 32 for char in value):
        raise PolicyError(f"unsafe pattern in {label}")
    if value.startswith("!") or value.startswith("/") or "\\" in value:
        raise PolicyError(f"deny-only relative pattern required in {label}")
    if any(part == ".." for part in value.split("/")):
        raise PolicyError(f"parent traversal pattern in {label}")
    return value


def load_patterns(path: Path, label: str) -> tuple[str, ...]:
    text = secure_read_text(path, label)
    patterns: list[str] = []
    for line_number, raw_line in enumerate(text.splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            patterns.append(_validate_pattern(line, f"{label}:{line_number}"))
        except PolicyError:
            raise
    return _dedupe(patterns)


def load_local_policy(path: Path | None, project_root: Path | None = None) -> tuple[tuple[str, ...], str]:
    if path is None:
        return (), hashlib.sha256(b"<no-local-policy>").hexdigest()
    data = secure_read_bytes(path, "local policy", root=project_root)
    text = data.decode("utf-8")
    patterns: list[str] = []
    for line_number, raw_line in enumerate(text.splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(_validate_pattern(line, f"local policy:{line_number}"))
    return _dedupe(patterns), hashlib.sha256(data).hexdigest()


def _safe_relative_path(raw: str) -> str:
    if not raw or "\x00" in raw or "\\" in raw:
        raise PolicyError("unsafe candidate path")
    path = raw.replace(os.sep, "/")
    if path.startswith("/") or path.startswith("./") or any(part == ".." for part in path.split("/")):
        raise PolicyError("unsafe candidate path")
    if any(part in {"", "."} for part in path.split("/")):
        raise PolicyError("unsafe candidate path")
    return path


def _git_worktree_root(project_root: Path) -> Path:
    try:
        result = subprocess.run(
            ["git", "-C", str(project_root), "rev-parse", "--show-toplevel"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PolicyError("Git worktree metadata is unavailable") from exc
    if result.returncode != 0:
        raise PolicyError("project is not a Git worktree")
    try:
        root_text = result.stdout.decode("utf-8").strip()
        git_root = Path(root_text).resolve()
    except (UnicodeDecodeError, OSError) as exc:
        raise PolicyError("malformed Git worktree metadata") from exc
    if git_root != project_root.resolve():
        raise PolicyError("project root is not the Git worktree root")
    return git_root


def _git_candidate_names(project_root: Path) -> list[str]:
    _git_worktree_root(project_root)
    try:
        result = subprocess.run(
            ["git", "-C", str(project_root), "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PolicyError("cannot enumerate Git worktree files") from exc
    if result.returncode != 0:
        raise PolicyError("cannot enumerate Git worktree files")
    names: list[str] = []
    for raw in result.stdout.split(b"\x00"):
        if not raw:
            continue
        try:
            name = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise PolicyError("Git returned a non-UTF-8 candidate path") from exc
        names.append(_safe_relative_path(name))
    return sorted(set(names))


def _write_private_file(path: Path, data: bytes, label: str) -> None:
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError as exc:
        raise PolicyError(f"cannot create {label}") from exc
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except OSError as exc:
        try:
            path.unlink()
        except OSError:
            pass
        raise PolicyError(f"cannot write {label}") from exc


def _git_ignored_names(project_root: Path, names: Sequence[str], patterns: Sequence[str]) -> set[str]:
    """Match settings excludes with Git, without reading the project worktree.

    The candidate list has already passed Git's normal tracked/untracked
    nonignored boundary. A throwaway Git context is used for this second pass so
    the project's .gitignore, info/exclude, and user-global excludes cannot
    silently alter the synchronized settings policy. The only ignore source in
    this context is the private file rendered from project settings.
    """

    if not names or not patterns:
        return set()
    with tempfile.TemporaryDirectory(prefix="mahiro-ccc-ignore-") as temporary_name:
        temporary_root = Path(temporary_name)
        os.chmod(temporary_root, 0o700)
        work_tree = temporary_root / "work-tree"
        work_tree.mkdir(mode=0o700)
        git_dir = temporary_root / "git-dir"
        try:
            init = subprocess.run(
                ["git", "init", "--bare", "--template=", "--quiet", str(git_dir)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=GIT_COMMAND_TIMEOUT_SECONDS,
                check=False,
                env=_isolated_git_environment(),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise PolicyError("Git/check-ignore setup failed") from exc
        if init.returncode != 0:
            raise PolicyError("Git/check-ignore setup failed")

        excludes_path = temporary_root / "settings-excludes"
        _write_private_file(excludes_path, ("\n".join(patterns) + "\n").encode("utf-8"), "temporary settings excludes")
        input_bytes = b"".join(name.encode("utf-8") + b"\0" for name in names)
        command = [
            "git",
            "--git-dir",
            str(git_dir),
            "--work-tree",
            str(work_tree),
            "-c",
            f"core.excludesFile={excludes_path}",
            "check-ignore",
            "--no-index",
            "--stdin",
            "--non-matching",
            "--verbose",
            "-z",
        ]
        try:
            result = subprocess.run(
                command,
                input=input_bytes,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=GIT_COMMAND_TIMEOUT_SECONDS,
                check=False,
                env=_isolated_git_environment(),
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise PolicyError("Git/check-ignore failed") from exc
        if result.returncode != 0:
            raise PolicyError("Git/check-ignore failed")

        fields = result.stdout.split(b"\0")
        if fields and fields[-1] == b"":
            fields.pop()
        expected_fields = len(names) * 4
        if len(fields) != expected_fields:
            raise PolicyError("Git/check-ignore returned malformed output")
        ignored: set[str] = set()
        for index, expected_name in enumerate(names):
            start = index * 4
            source, line_number, pattern, raw_name = fields[start : start + 4]
            try:
                actual_name = raw_name.decode("utf-8")
                pattern.decode("utf-8")
                source.decode("utf-8")
                line_number.decode("ascii")
            except UnicodeDecodeError as exc:
                raise PolicyError("Git/check-ignore returned malformed output") from exc
            if actual_name != expected_name:
                raise PolicyError("Git/check-ignore reordered or changed candidate paths")
            if pattern:
                ignored.add(expected_name)
        return ignored


def _isolated_git_environment() -> dict[str, str]:
    environment = os.environ.copy()
    for key in (
        "GIT_DIR",
        "GIT_WORK_TREE",
        "GIT_COMMON_DIR",
        "GIT_INDEX_FILE",
        "GIT_CONFIG_COUNT",
    ):
        environment.pop(key, None)
    for key in list(environment):
        if key.startswith("GIT_CONFIG_KEY_") or key.startswith("GIT_CONFIG_VALUE_"):
            environment.pop(key, None)
    environment["GIT_CONFIG_NOSYSTEM"] = "1"
    environment["GIT_CONFIG_SYSTEM"] = os.devnull
    environment["GIT_CONFIG_GLOBAL"] = os.devnull
    environment["GIT_OPTIONAL_LOCKS"] = "0"
    return environment


def _fallback_candidate_names(project_root: Path) -> list[str]:
    names: list[str] = []
    stack = [project_root]
    while stack:
        current = stack.pop()
        try:
            entries = sorted(os.scandir(current), key=lambda entry: entry.name, reverse=True)
        except OSError as exc:
            raise PolicyError("cannot enumerate project filenames") from exc
        for entry in entries:
            if entry.name in NOISE_FALLBACK_DIRECTORIES and entry.is_dir(follow_symlinks=False):
                continue
            relative = entry.path
            try:
                is_link = entry.is_symlink()
            except OSError as exc:
                raise PolicyError("cannot inspect project filename") from exc
            if is_link:
                raise PolicyError("symlinked project candidate is not accepted")
            if entry.is_dir(follow_symlinks=False):
                stack.append(Path(relative))
            elif entry.is_file(follow_symlinks=False):
                names.append(_safe_relative_path(os.path.relpath(relative, project_root)))
            else:
                raise PolicyError("unsafe non-regular project candidate")
    return sorted(set(names))


def _validate_candidate_path(project_root: Path, relative_path: str) -> Path:
    relative = _safe_relative_path(relative_path)
    current = project_root
    parts = relative.split("/")
    for index, part in enumerate(parts):
        current = current / part
        try:
            info = os.lstat(current)
        except FileNotFoundError:
            raise PolicyError("Git candidate disappeared during filename preflight")
        except OSError as exc:
            raise PolicyError("cannot inspect project candidate") from exc
        if stat.S_ISLNK(info.st_mode):
            raise PolicyError("symlinked project candidate is not accepted")
        if index < len(parts) - 1 and not stat.S_ISDIR(info.st_mode):
            raise PolicyError("candidate path crosses a non-directory")
    final_info = os.lstat(current)
    if stat.S_ISLNK(final_info.st_mode):
        raise PolicyError("symlinked project candidate is not accepted")
    if not stat.S_ISREG(final_info.st_mode):
        raise PolicyError("unsafe non-regular project candidate")
    return current


def _classify_filename(relative_path: str) -> str:
    lowered_parts = tuple(part.lower() for part in relative_path.split("/"))
    basename = lowered_parts[-1]

    # These explicit template filenames are intentionally allowed through
    # filename filtering and must be content-scanned by strict mode.
    if basename in DOTENV_TEMPLATE_BASENAMES:
        return "content-scan-dotenv-template"
    if basename == ".env" or basename.startswith(".env.") or basename == ".envrc":
        return "deny-dotenv"
    if len(lowered_parts) >= 2 and lowered_parts[-2:] in SENSITIVE_EXACT_PATHS:
        return "deny-local-settings"
    if basename in SENSITIVE_BASENAMES:
        return "deny-credential-path"
    if basename.startswith("firebase-adminsdk-") and basename.endswith(".json"):
        return "deny-credential-path"
    if basename.endswith(tuple(SENSITIVE_SUFFIXES)):
        return "deny-key-file"
    if any(part in SENSITIVE_DIRECTORY_NAMES for part in lowered_parts[:-1]):
        return "deny-credential-path"
    for index in range(len(lowered_parts) - 1):
        if lowered_parts[index : index + 2] in SENSITIVE_PROVIDER_PATHS:
            return "deny-provider-path"
    return "content-scan"


def collect_candidates(
    project_root: Path,
    *,
    require_git: bool = False,
    exclude_patterns: Sequence[str] | None = None,
) -> tuple[Candidate, ...]:
    root = project_root.resolve()
    if root != project_root:
        # A caller may pass a normalized absolute path; a symlinked root itself
        # is rejected before resolution so the project identity stays stable.
        pass
    root_info = os.lstat(project_root)
    if stat.S_ISLNK(root_info.st_mode) or not stat.S_ISDIR(root_info.st_mode):
        raise PolicyError("project root must be a real directory")
    try:
        names = _git_candidate_names(project_root)
    except PolicyError:
        if require_git or exclude_patterns is not None:
            raise
        names = _fallback_candidate_names(project_root)
    if exclude_patterns is not None:
        ignored = _git_ignored_names(project_root, names, exclude_patterns)
        names = [name for name in names if name not in ignored]
    candidates: list[Candidate] = []
    for name in names:
        absolute = _validate_candidate_path(project_root, name)
        candidates.append(Candidate(name, absolute, _classify_filename(name)))
    return tuple(candidates)


def _hash_bytes(parts: Iterable[bytes]) -> str:
    digest = hashlib.sha256()
    for part in parts:
        digest.update(part)
    return digest.hexdigest()


def build_policy(project_root: Path, local_policy_path: Path | None = None) -> PolicySnapshot:
    security = load_patterns(CREDENTIAL_BASELINE, "credential deny baseline")
    noise = load_patterns(NOISE_BASELINE, "noise/performance baseline")
    local_patterns, local_policy_sha256 = load_local_policy(local_policy_path, project_root)
    candidates = collect_candidates(project_root, require_git=False)
    exact_denies = tuple(candidate.relative_path for candidate in candidates if candidate.classification.startswith("deny-"))
    content_scan_paths = tuple(
        candidate.relative_path
        for candidate in candidates
        if candidate.classification == "content-scan-dotenv-template"
    )
    all_security = _dedupe((*security, *local_patterns))

    settings_file = project_settings_path(project_root)
    if settings_file.exists() or settings_file.is_symlink():
        _, settings_text, _ = read_project_settings(project_root)
        lines = settings_text.replace("\r\n", "\n").split("\n")
        _validate_chunkers(lines)
        effective_max_file_size, _, _ = extract_settings_max_file_size(settings_text)
    else:
        effective_max_file_size = MAX_FILE_SIZE_CAP

    policy_payload = {
        "schema": SCHEMA_VERSION,
        "includes": DOTENV_TEMPLATE_INCLUDE_PATTERNS,
        "security": all_security,
        "exact_denies": exact_denies,
        "noise": noise,
        "local_policy_sha256": local_policy_sha256,
        "max_file_size": effective_max_file_size,
    }
    policy_sha256 = _hash_bytes(
        [json.dumps(policy_payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")]
    )
    return PolicySnapshot(
        include_patterns=DOTENV_TEMPLATE_INCLUDE_PATTERNS,
        security_patterns=all_security,
        noise_patterns=noise,
        exact_denies=_dedupe(exact_denies),
        content_scan_paths=content_scan_paths,
        local_policy_sha256=local_policy_sha256,
        policy_sha256=policy_sha256,
        max_file_size=effective_max_file_size,
    )


def _parse_pattern_line(line: str) -> str | None:
    match = re.match(r"^\s*-\s+(.*)\s*$", line)
    if not match:
        return None
    value = match.group(1).strip()
    if value.startswith(("[", "{")) or value.endswith(("]", "}")):
        return None
    if value.startswith(("'", '"')) or value.endswith(("'", '"')):
        if len(value) < 2 or value[0] != value[-1] or value[0] not in {"'", '"'}:
            return None
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        if value[0] == '"':
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return None
            return parsed if isinstance(parsed, str) else None
        return value[1:-1]
    return value


def _root_key(line: str) -> str | None:
    if line.startswith((" ", "\t")) or line.lstrip().startswith("#") or not line.strip():
        return None
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_.-]*):(?:\s*(.*))?$", line)
    return match.group(1) if match else None


def _remove_managed_block(lines: list[str], begin: str, end: str, label: str) -> list[str]:
    begins = [index for index, line in enumerate(lines) if line.strip() == begin]
    ends = [index for index, line in enumerate(lines) if line.strip() == end]
    if len(begins) > 1 or len(ends) > 1 or len(begins) != len(ends):
        raise PolicyError(f"malformed managed {label} block")
    if not begins:
        return lines
    if ends[0] <= begins[0]:
        raise PolicyError(f"malformed managed {label} block")
    return lines[: begins[0]] + lines[ends[0] + 1 :]


_FILE_SIZE_UNITS: dict[str, int] = {
    "B": 1,
    "KB": 1024,
    "MB": 1024 * 1024,
    "GB": 1024 * 1024 * 1024,
}


def parse_max_file_size(value: object) -> int:
    """Parse and validate a max_file_size setting value into positive bytes.

    Fails closed on non-positive, boolean, or malformed values.
    """
    if isinstance(value, bool):
        raise PolicyError("malformed settings: max_file_size must be a positive integer")
    if isinstance(value, int):
        size = value
    elif isinstance(value, float):
        if not value.is_integer():
            raise PolicyError("malformed settings: max_file_size must be an integer byte count")
        size = int(value)
    elif isinstance(value, str):
        text = value.strip()
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1].strip()
        if not text:
            raise PolicyError("malformed settings: max_file_size cannot be empty")
        upper_text = text.upper()
        multiplier = 1
        number_str = text
        for suffix in ("GB", "MB", "KB", "B"):
            if upper_text.endswith(suffix):
                number_str = text[: -len(suffix)].strip()
                multiplier = _FILE_SIZE_UNITS[suffix]
                break
        try:
            val_float = float(number_str)
            size = int(val_float * multiplier)
        except (ValueError, OverflowError) as exc:
            raise PolicyError(f"malformed settings: invalid max_file_size {value!r}") from exc
    else:
        raise PolicyError("malformed settings: invalid max_file_size")

    if size <= 0:
        raise PolicyError("malformed settings: max_file_size must be a positive integer")
    return size


def extract_settings_max_file_size(settings_text: str) -> tuple[int, bool, int | None]:
    """Inspect max_file_size in settings text.

    Returns:
        (effective_max_file_size, is_present, raw_size_or_none)
    """
    if "\x00" in settings_text or "\t" in settings_text:
        raise PolicyError("malformed settings: NUL or tab is not accepted")
    lines = settings_text.replace("\r\n", "\n").split("\n")
    keys = [(index, _root_key(line)) for index, line in enumerate(lines)]
    matching = [index for index, key in keys if key == "max_file_size"]
    if len(matching) > 1:
        raise PolicyError("malformed settings: duplicate max_file_size")
    if not matching:
        return MAX_FILE_SIZE_CAP, False, None
    idx = matching[0]
    line = lines[idx]
    raw_val, _ = _split_settings_scalar(line.split(":", 1)[1])
    if not raw_val:
        raise PolicyError("malformed settings: max_file_size cannot be empty")
    parsed = parse_max_file_size(raw_val)
    effective = min(parsed, MAX_FILE_SIZE_CAP)
    return effective, True, parsed


def _split_settings_scalar(raw: str) -> tuple[str, str]:
    """Split a root scalar from a YAML-style whitespace-prefixed comment."""

    for index, char in enumerate(raw):
        if char != "#" or (index > 0 and not raw[index - 1].isspace()):
            continue
        before = raw[:index]
        spacing = before[len(before.rstrip()) :]
        return before.strip(), f"{spacing or ' '}{raw[index:]}"
    return raw.strip(), ""


def _validate_chunkers(lines: Sequence[str]) -> None:
    keys = [(index, _root_key(line)) for index, line in enumerate(lines)]
    matching = [index for index, key in keys if key == "chunkers"]
    if len(matching) > 1:
        raise PolicyError("malformed settings: duplicate chunkers")
    if not matching:
        return
    start = matching[0]
    line = lines[start]
    inline, _ = _split_settings_scalar(line.split(":", 1)[1])
    if inline not in {"[]", "{}", "''", '""'}:
        raise PolicyError(
            "malformed settings: chunkers must be omitted or an explicit empty list, map, or string"
        )


def _find_pattern_section(lines: Sequence[str], key_name: str) -> tuple[int | None, int | None, str]:
    keys = [(index, _root_key(line)) for index, line in enumerate(lines)]
    section_keys = [index for index, key in keys if key == key_name]
    if len(section_keys) > 1:
        raise PolicyError(f"malformed settings: duplicate {key_name}")
    if not section_keys:
        return None, None, ""
    start = section_keys[0]
    inline = lines[start].split(":", 1)[1].strip()
    if inline:
        if inline not in {"[]"}:
            raise PolicyError(f"malformed settings: inline {key_name} is unsupported")
        raise PolicyError(f"malformed settings: {key_name} must be a list block")
    end = len(lines)
    for index in range(start + 1, len(lines)):
        if _root_key(lines[index]) is not None:
            end = index
            break
    indent = ""
    for line in lines[start + 1 : end]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if _parse_pattern_line(line) is None:
            raise PolicyError(f"malformed settings: {key_name} must contain path list items")
        if not indent:
            indent = line[: len(line) - len(line.lstrip(" "))]
    return start, end, indent


def _find_exclude_section(lines: Sequence[str]) -> tuple[int | None, int | None, str]:
    return _find_pattern_section(lines, "exclude_patterns")


def _validate_settings_exclude_pattern(pattern: str, line_number: int) -> str:
    value = pattern.strip()
    if (
        not value
        or value.startswith(("#", "!"))
        or len(value) > MAX_EXCLUDE_PATTERN_BYTES
        or "\x00" in value
        or any(ord(char) < 32 for char in value)
    ):
        raise PolicyError(f"unsupported settings exclude pattern at line {line_number}")
    return value


def extract_exclude_patterns(settings_text: str) -> tuple[str, ...]:
    """Read the synchronized exclude list as Git-compatible pattern text."""

    if "\x00" in settings_text or "\t" in settings_text:
        raise PolicyError("malformed settings: NUL or tab is not accepted")
    had_final_newline = settings_text.endswith("\n")
    lines = settings_text.replace("\r\n", "\n").split("\n")
    if had_final_newline:
        lines = lines[:-1]
    _validate_chunkers(lines)
    extract_settings_max_file_size(settings_text)
    start, end, _ = _find_exclude_section(lines)
    if start is None or end is None:
        raise PolicyError("malformed settings: exclude_patterns is required")
    patterns: list[str] = []
    for index, line in enumerate(lines[start + 1 : end], start + 2):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parsed = _parse_pattern_line(line)
        if parsed is None:
            raise PolicyError("unsupported settings exclude syntax")
        patterns.append(_validate_settings_exclude_pattern(parsed, index))
    return _dedupe(patterns)


def _render_managed_block(policy: PolicySnapshot, indent: str) -> list[str]:
    lines = [f"{indent}{MANAGED_BEGIN}", f"{indent}{SECURITY_HEADER}"]
    for pattern in policy.security_patterns:
        lines.append(f"{indent}- {json.dumps(pattern, ensure_ascii=False)}")
    if policy.exact_denies:
        lines.append(f"{indent}{DERIVED_HEADER}")
        for path in policy.exact_denies:
            lines.append(f"{indent}- {json.dumps(path, ensure_ascii=False)}")
    lines.append(f"{indent}{NOISE_HEADER}")
    for pattern in policy.noise_patterns:
        lines.append(f"{indent}- {json.dumps(pattern, ensure_ascii=False)}")
    lines.append(f"{indent}{MANAGED_END}")
    return lines


def _render_managed_include_block(policy: PolicySnapshot, indent: str) -> list[str]:
    lines = [f"{indent}{MANAGED_INCLUDE_BEGIN}", f"{indent}{CONTENT_SCAN_INCLUDE_HEADER}"]
    for pattern in policy.include_patterns:
        lines.append(f"{indent}- {json.dumps(pattern, ensure_ascii=False)}")
    lines.append(f"{indent}{MANAGED_INCLUDE_END}")
    return lines


def materialize_settings(settings_text: str, policy: PolicySnapshot) -> str:
    if "\x00" in settings_text or "\t" in settings_text:
        raise PolicyError("malformed settings: NUL or tab is not accepted")
    had_final_newline = settings_text.endswith("\n")
    lines = settings_text.replace("\r\n", "\n").split("\n")
    if had_final_newline:
        lines = lines[:-1]
    _, _, original_exclude_indent = _find_exclude_section(lines)
    _, _, original_include_indent = _find_pattern_section(lines, "include_patterns")
    lines = _remove_managed_block(lines, MANAGED_BEGIN, MANAGED_END, "exclusion")
    lines = _remove_managed_block(lines, MANAGED_INCLUDE_BEGIN, MANAGED_INCLUDE_END, "include")

    _validate_chunkers(lines)
    _, has_mfs, raw_mfs = extract_settings_max_file_size(settings_text)
    keys = [(index, _root_key(line)) for index, line in enumerate(lines)]
    mfs_indices = [index for index, key in keys if key == "max_file_size"]
    if has_mfs and mfs_indices:
        mfs_idx = mfs_indices[0]
        if raw_mfs is not None and raw_mfs > MAX_FILE_SIZE_CAP:
            _, comment = _split_settings_scalar(lines[mfs_idx].split(":", 1)[1])
            lines[mfs_idx] = f"max_file_size: {MAX_FILE_SIZE_CAP}{comment}"
    else:
        start_ex, _, _ = _find_exclude_section(lines)
        if start_ex is not None:
            lines.insert(start_ex, f"max_file_size: {MAX_FILE_SIZE_CAP}")
        else:
            lines.insert(0, f"max_file_size: {MAX_FILE_SIZE_CAP}")

    start, end, indent = _find_exclude_section(lines)
    indent = indent or original_exclude_indent
    managed_patterns = set((*policy.security_patterns, *policy.exact_denies, *policy.noise_patterns))
    managed_patterns.update(LEGACY_BROAD_EXCLUDES)

    if start is not None and end is not None:
        body = lines[start + 1 : end]
        filtered_body: list[str] = []
        for line in body:
            parsed = _parse_pattern_line(line)
            if parsed is not None and parsed in managed_patterns:
                continue
            filtered_body.append(line)
        block = _render_managed_block(policy, indent)
        lines = lines[: start + 1] + block + filtered_body + lines[end:]
    else:
        if lines and lines[-1].strip():
            lines.append("")
        lines.extend(["exclude_patterns:", *_render_managed_block(policy, "")])

    include_start, include_end, include_indent = _find_pattern_section(lines, "include_patterns")
    include_indent = include_indent or original_include_indent
    managed_includes = set(policy.include_patterns)
    if include_start is not None and include_end is not None:
        include_body = lines[include_start + 1 : include_end]
        filtered_include_body: list[str] = []
        for line in include_body:
            parsed = _parse_pattern_line(line)
            if parsed is not None and parsed in managed_includes:
                continue
            filtered_include_body.append(line)
        include_block = _render_managed_include_block(policy, include_indent)
        lines = lines[: include_start + 1] + include_block + filtered_include_body + lines[include_end:]
    else:
        if lines and lines[-1].strip():
            lines.append("")
        lines.extend(["include_patterns:", *_render_managed_include_block(policy, "")])

    rendered = "\n".join(lines)
    if had_final_newline or rendered:
        rendered += "\n"
    return rendered


def project_settings_path(project_root: Path) -> Path:
    return project_root / ".cocoindex_code" / "settings.yml"


def read_project_settings(project_root: Path) -> tuple[Path, str, os.stat_result]:
    path = project_settings_path(project_root)
    info = _assert_regular_not_symlink(path, "project settings", project_root)
    return path, secure_read_text(path, "project settings", root=project_root), info


def settings_is_current(project_root: Path, policy: PolicySnapshot) -> tuple[bool, str, str]:
    path, current, _ = read_project_settings(project_root)
    desired = materialize_settings(current, policy)
    return current == desired, current, desired


def atomic_write_text(path: Path, text: str, *, mode: int | None = None, label: str = "file") -> None:
    _assert_safe_parent_chain(path, label)
    parent = path.parent
    if not parent.exists():
        raise PolicyError(f"missing parent directory for {label}")
    parent_info = os.lstat(parent)
    if stat.S_ISLNK(parent_info.st_mode) or not stat.S_ISDIR(parent_info.st_mode):
        raise PolicyError(f"unsafe parent directory for {label}")
    if path.exists() or path.is_symlink():
        existing = os.lstat(path)
        if stat.S_ISLNK(existing.st_mode):
            raise PolicyError(f"symlinked {label} is not accepted")
        if not stat.S_ISREG(existing.st_mode):
            raise PolicyError(f"{label} is not a regular file")
        if mode is None:
            mode = stat.S_IMODE(existing.st_mode)
    if mode is None:
        mode = 0o600
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=parent)
    temporary = Path(temporary_name)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        try:
            directory_fd = os.open(parent, os.O_RDONLY)
        except OSError:
            directory_fd = None
        if directory_fd is not None:
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    except Exception:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass
        raise


def hash_file(
    path: Path,
    label: str = "source file",
    max_bytes: int = MAX_SOURCE_FILE_BYTES,
) -> tuple[str, int]:
    """Hash a regular file only from the deliberate strict scan boundary."""

    info = _assert_regular_not_symlink(path, label)
    if info.st_size > max_bytes:
        raise PolicyError(f"{label} exceeds the allowed file-size limit")
    digest = hashlib.sha256()
    size = 0
    flags = os.O_RDONLY
    nofollow = getattr(os, "O_NOFOLLOW", 0)
    if nofollow:
        flags |= nofollow
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise PolicyError(f"cannot open {label} for strict scan") from exc
    try:
        with os.fdopen(fd, "rb") as handle:
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise PolicyError(f"{label} exceeds the allowed file-size limit")
                digest.update(chunk)
    except OSError as exc:
        raise PolicyError(f"cannot read {label} for strict scan") from exc
    return digest.hexdigest(), size


def filter_candidates_by_max_file_size(
    candidates: Sequence[Candidate], max_bytes: int
) -> tuple[Candidate, ...]:
    """Exclude files outside the upstream-consumed project size boundary."""

    if isinstance(max_bytes, bool) or not isinstance(max_bytes, int) or max_bytes <= 0:
        raise PolicyError("candidate file-size limit must be a positive integer")
    accepted: list[Candidate] = []
    for candidate in candidates:
        info = _assert_regular_not_symlink(candidate.absolute_path, candidate.relative_path)
        if info.st_size <= max_bytes:
            accepted.append(candidate)
    return tuple(accepted)


def source_manifest(
    candidates: Sequence[Candidate], max_bytes: int = MAX_SOURCE_FILE_BYTES
) -> tuple[str, str, int, int]:
    """Return scope hash, content hash, count, and total bytes without exposing bytes."""

    scope_digest = hashlib.sha256()
    content_digest = hashlib.sha256()
    total_bytes = 0
    for candidate in candidates:
        source_hash, size = hash_file(
            candidate.absolute_path, candidate.relative_path, max_bytes=max_bytes
        )
        encoded_path = candidate.relative_path.encode("utf-8")
        scope_digest.update(encoded_path + b"\0")
        scope_digest.update(str(size).encode("ascii") + b"\0")
        content_digest.update(encoded_path + b"\0")
        content_digest.update(source_hash.encode("ascii") + b"\0")
        content_digest.update(str(size).encode("ascii") + b"\0")
        total_bytes += size
    return scope_digest.hexdigest(), content_digest.hexdigest(), len(candidates), total_bytes


def project_root_id(project_root: Path) -> str:
    return hashlib.sha256(str(project_root.resolve()).encode("utf-8")).hexdigest()


def file_sha256(path: Path, label: str, max_bytes: int = MAX_POLICY_BYTES * 4) -> str:
    return hash_file(path, label, max_bytes=max_bytes)[0]


def validate_output_path(project_root: Path, raw_path: str | None, default_relative: str) -> Path:
    value = raw_path or default_relative
    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = project_root / candidate
    try:
        relative = candidate.relative_to(project_root)
    except ValueError as exc:
        raise PolicyError("report and receipt paths must remain inside the project root") from exc
    if any(part in {"", ".", ".."} for part in relative.parts):
        raise PolicyError("unsafe report or receipt path")
    current = project_root
    for part in relative.parts[:-1]:
        current = current / part
        if current.exists() or current.is_symlink():
            info = os.lstat(current)
            if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
                raise PolicyError("unsafe report or receipt parent")
    return candidate


def json_hash(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def read_json_file(path: Path, label: str, root: Path | None = None) -> object:
    text = secure_read_text(path, label, limit=MAX_POLICY_BYTES * 4, root=root)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise PolicyError(f"malformed {label}") from exc


def validate_allowlist(
    path: Path | None,
    candidate_paths: set[str],
    project_root: Path | None = None,
) -> tuple[set[tuple[str, str, str]], str]:
    if path is None:
        return set(), json_hash({"allowlist": None})
    raw = read_json_file(path, "allowlist", root=project_root)
    if not isinstance(raw, list):
        raise PolicyError("allowlist must be a JSON array")
    entries: set[tuple[str, str, str]] = set()
    for entry in raw:
        if not isinstance(entry, dict) or set(entry) != {"path", "rule_id", "fingerprint"}:
            raise PolicyError("allowlist entries must contain only path, rule_id, and fingerprint")
        values = tuple(entry[key] for key in ("path", "rule_id", "fingerprint"))
        if not all(isinstance(value, str) and value and "\x00" not in value and not any(ord(char) < 32 for char in value) for value in values):
            raise PolicyError("allowlist values must be non-empty safe metadata")
        relative_path, rule_id, fingerprint = values
        relative_path = _safe_relative_path(relative_path)
        if relative_path not in candidate_paths:
            raise PolicyError("allowlist path is outside the current scan scope")
        entries.add((relative_path, rule_id, fingerprint))
    return entries, json_hash(raw)


def safe_metadata_string(value: object, field: str, max_length: int = 512) -> str:
    if not isinstance(value, str) or not value or len(value) > max_length:
        raise PolicyError(f"malformed scanner metadata: {field}")
    if "\x00" in value or any(ord(char) < 32 for char in value):
        raise PolicyError(f"unsafe scanner metadata: {field}")
    return value


def metadata_fingerprint(relative_path: str, rule_id: str, line: int) -> str:
    canonical = "\x00".join((relative_path, rule_id, str(line))).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def validate_metadata_findings(raw: object, scan_root: Path, candidate_paths: set[str]) -> list[dict[str, object]]:
    if not isinstance(raw, list):
        raise PolicyError("scanner report is not a JSON array")
    findings: list[dict[str, object]] = []
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"path", "line", "rule_id"}:
            raise PolicyError("scanner report contains non-metadata fields")
        raw_path = safe_metadata_string(item["path"], "path")
        path = Path(raw_path)
        if path.is_absolute():
            try:
                relative = path.relative_to(scan_root).as_posix()
            except ValueError as exc:
                raise PolicyError("scanner report path escaped the secure scan root") from exc
        else:
            relative = raw_path.replace("\\", "/")
        relative = _safe_relative_path(relative)
        if relative not in candidate_paths:
            raise PolicyError("scanner report path is outside the current scan scope")
        line = item["line"]
        if isinstance(line, bool) or not isinstance(line, int) or line < 1:
            raise PolicyError("scanner report line is invalid")
        rule_id = safe_metadata_string(item["rule_id"], "rule_id")
        fingerprint = metadata_fingerprint(relative, rule_id, line)
        findings.append({"path": relative, "line": line, "rule_id": rule_id, "fingerprint": fingerprint})
    return findings


def scanner_contract_metadata(
    config_sha256: str,
    template_sha256: str,
    settings_sha256: str,
    policy: PolicySnapshot,
    binary_sha256: str,
) -> dict[str, object]:
    return {
        "name": "gitleaks",
        "version": GITLEAKS_VERSION,
        "license": GITLEAKS_LICENSE,
        "archive_sha256": GITLEAKS_ARCHIVE_SHA256,
        "binary_sha256": binary_sha256,
        "signed_provenance_established": False,
        "config_sha256": config_sha256,
        "metadata_template_sha256": template_sha256,
        "settings_sha256": settings_sha256,
        "policy_sha256": policy.policy_sha256,
        "local_policy_sha256": policy.local_policy_sha256,
        "max_file_size": policy.max_file_size,
    }
