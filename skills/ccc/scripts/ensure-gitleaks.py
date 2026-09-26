#!/usr/bin/env python3
"""Check the pinned official Gitleaks v8.30.1 binary, or install it only when absent.

Every existing ancestor of the destination parent is validated before
classification. Publish hard-links a verified temporary file in that directory
only while the destination name is still absent, then removes the temporary name.
Production CLI accepts only check/ensure, an optional destination path, offline
mode, and JSON output. Archive URLs and hashes are the pinned table below.
Tests may import the functions and pass a synthetic target or fetcher; those
seams are not CLI flags.
"""

from __future__ import annotations

import argparse
import errno
import hashlib
import hmac
import io
import json
import os
import stat
import sys
import tarfile
import time
import urllib.error
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterator
from urllib.parse import urlsplit

try:
    import fcntl
except ImportError:  # pragma: no cover - fail closed on non-Unix
    fcntl = None  # type: ignore[assignment]


VERSION = "8.30.1"
SCHEMA = "mahiro-ccc-gitleaks-pin-v1"
OFFICIAL_BASE_URL = "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/"
DEFAULT_DEST_PARTS = (".local", "share", "mahiro-ccc", "gitleaks", "8.30.1", "gitleaks")
MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
MAX_BINARY_BYTES = 48 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 16
MAX_REDIRECTS = 3
DOWNLOAD_TIMEOUT_SECONDS = 30.0
DOWNLOAD_DEADLINE_SECONDS = 60.0
LOCK_TIMEOUT_SECONDS = 30.0
LOCK_NAME = ".gitleaks-ensure.lock"
Fetcher = Callable[[str, int], bytes]


class EnsureError(Exception):
    def __init__(self, code: str, network: bool = False):
        super().__init__(code)
        self.code = code
        self.network = network


@dataclass(frozen=True)
class PinnedTarget:
    key: str
    archive_name: str
    archive_sha256: str
    binary_sha256: str

    @property
    def url(self) -> str:
        return OFFICIAL_BASE_URL + self.archive_name


def _target(key: str, archive_sha256: str, binary_sha256: str) -> PinnedTarget:
    return PinnedTarget(
        key=key,
        archive_name=f"gitleaks_{VERSION}_{key}.tar.gz",
        archive_sha256=archive_sha256,
        binary_sha256=binary_sha256,
    )


PINNED_TARGETS: dict[str, PinnedTarget] = {
    item.key: item
    for item in (
        _target(
            "darwin_arm64",
            "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
            "ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f",
        ),
        _target(
            "darwin_x64",
            "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
            "cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291",
        ),
        _target(
            "linux_arm64",
            "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
            "00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b",
        ),
        _target(
            "linux_x64",
            "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
            "88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509",
        ),
    )
}


def platform_key(system_name: str, machine: str) -> str:
    system = system_name.lower()
    cpu = machine.lower()
    if system == "darwin" and cpu in {"arm64", "aarch64"}:
        return "darwin_arm64"
    if system == "darwin" and cpu in {"x86_64", "amd64"}:
        return "darwin_x64"
    if system == "linux" and cpu in {"arm64", "aarch64"}:
        return "linux_arm64"
    if system == "linux" and cpu in {"x86_64", "amd64"}:
        return "linux_x64"
    raise EnsureError("unsupported-platform")


def current_target(system_name: str | None = None, machine: str | None = None) -> PinnedTarget:
    key = platform_key(system_name or os.uname().sysname, machine or os.uname().machine)
    try:
        return PINNED_TARGETS[key]
    except KeyError as exc:  # pragma: no cover - table and mapper stay paired
        raise EnsureError("unsupported-platform") from exc


def default_dest() -> Path:
    return Path.home().joinpath(*DEFAULT_DEST_PARTS)


def _sha256_matches(actual: str, expected: str) -> bool:
    if len(actual) != 64 or len(expected) != 64:
        return False
    try:
        bytes.fromhex(actual)
        bytes.fromhex(expected)
    except ValueError:
        return False
    return hmac.compare_digest(actual.lower(), expected.lower())


def _hash_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _reject_unsafe_ancestors(start: Path) -> None:
    """Reject a symlink or non-directory among start and its existing ancestors."""
    current = start
    while True:
        try:
            info = os.lstat(current)
        except FileNotFoundError:
            info = None
        except OSError as exc:
            if exc.errno in {errno.EACCES, errno.EPERM}:
                raise EnsureError("permission-failure") from exc
            raise EnsureError("malformed-state") from exc
        if info is not None and (stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode)):
            raise EnsureError("malformed-state")
        if current.parent == current:
            break
        current = current.parent


def _mkdir_private(path: Path) -> None:
    _reject_unsafe_ancestors(path)
    if path.exists():
        return
    missing: list[Path] = []
    current = path
    while not current.exists():
        missing.append(current)
        if current.parent == current:
            break
        current = current.parent
    for directory in reversed(missing):
        os.mkdir(directory, 0o700)
        os.chmod(directory, 0o700)
        if directory.is_symlink() or not directory.is_dir():
            raise EnsureError("malformed-state")


def _read_regular_sha256(path: Path) -> str:
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise EnsureError("unsafe-binary") from exc
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode):
            raise EnsureError("unsafe-binary")
        if info.st_size <= 0 or info.st_size > MAX_BINARY_BYTES:
            raise EnsureError("unsafe-binary")
        digest = hashlib.sha256()
        remaining = info.st_size
        while remaining:
            block = os.read(fd, min(1024 * 1024, remaining))
            if not block:
                raise EnsureError("unsafe-binary")
            digest.update(block)
            remaining -= len(block)
        return digest.hexdigest()
    finally:
        os.close(fd)


def inspect_binary(path: Path, expected_sha256: str) -> str | None:
    """Return an error code, or None when ancestors and the pinned executable match.

    Every existing ancestor of path.parent is classified before the final file.
    A symlinked ancestor is malformed-state even when the final file is valid.
    """
    try:
        _reject_unsafe_ancestors(path.parent)
    except EnsureError as exc:
        return exc.code
    try:
        info = os.lstat(path)
    except FileNotFoundError:
        return "missing-binary"
    except OSError as exc:
        if exc.errno in {errno.EACCES, errno.EPERM}:
            return "permission-failure"
        return "malformed-state"
    if stat.S_ISLNK(info.st_mode):
        return "symlink-binary"
    if not stat.S_ISREG(info.st_mode):
        return "unsafe-binary"
    if info.st_size <= 0 or info.st_size > MAX_BINARY_BYTES:
        return "unsafe-binary"
    if info.st_mode & 0o111 == 0:
        return "unsafe-binary"
    try:
        actual = _read_regular_sha256(path)
    except EnsureError:
        return "unsafe-binary"
    if not _sha256_matches(actual, expected_sha256):
        return "binary-hash-mismatch"
    return None


def _member_name(name: str) -> str:
    normalized = name.replace("\\", "/")
    if normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def _reject_member_path(name: str) -> None:
    raw = name.replace("\\", "/")
    if not raw or raw.startswith("/") or raw.startswith("../") or raw == ".." or "/../" in f"/{raw}/":
        raise EnsureError("unsafe-archive-member")
    normalized = _member_name(raw)
    if not normalized or normalized.startswith("/") or normalized.startswith("../"):
        raise EnsureError("unsafe-archive-member")
    parts = Path(normalized).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise EnsureError("unsafe-archive-member")


def select_gitleaks_member(archive_bytes: bytes) -> bytes:
    if len(archive_bytes) <= 0 or len(archive_bytes) > MAX_ARCHIVE_BYTES:
        raise EnsureError("invalid-archive")
    try:
        archive = tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz")
    except (tarfile.TarError, OSError) as exc:
        raise EnsureError("invalid-archive") from exc
    try:
        members = archive.getmembers()
        if len(members) <= 0 or len(members) > MAX_ARCHIVE_MEMBERS:
            raise EnsureError("unsafe-archive-member")
        matches: list[tarfile.TarInfo] = []
        for member in members:
            _reject_member_path(member.name)
            if member.issym() or member.islnk() or getattr(member, "sparse", None):
                raise EnsureError("unsafe-archive-member")
            if not member.isfile() and not member.isdir():
                raise EnsureError("unsafe-archive-member")
            normalized = _member_name(member.name)
            if normalized == "gitleaks" or normalized.endswith("/gitleaks"):
                matches.append(member)
        if len(matches) == 0:
            raise EnsureError("missing-gitleaks-member")
        if len(matches) != 1:
            raise EnsureError("multiple-gitleaks-members")
        member = matches[0]
        if _member_name(member.name) != "gitleaks" or not member.isfile() or member.issym() or member.islnk():
            raise EnsureError("unsafe-archive-member")
        if member.size <= 0 or member.size > MAX_BINARY_BYTES:
            raise EnsureError("unsafe-archive-member")
        extracted = archive.extractfile(member)
        if extracted is None:
            raise EnsureError("unsafe-archive-member")
        payload = extracted.read(member.size + 1)
        if len(payload) != member.size:
            raise EnsureError("unsafe-archive-member")
        return payload
    except EnsureError:
        raise
    except (tarfile.TarError, OSError) as exc:
        raise EnsureError("invalid-archive") from exc
    finally:
        archive.close()


def _write_all(fd: int, payload: bytes) -> None:
    view = memoryview(payload)
    offset = 0
    while offset < len(view):
        written = os.write(fd, view[offset:])
        if written <= 0:
            raise EnsureError("binary-write-failed")
        offset += written


def _open_parent_directory(parent: Path) -> int:
    flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):
        flags |= os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        return os.open(parent, flags)
    except OSError as exc:
        if exc.errno in {errno.EACCES, errno.EPERM}:
            raise EnsureError("permission-failure") from exc
        raise EnsureError("malformed-state") from exc


def _write_temp(dir_fd: int, tmp_name: str, payload: bytes) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = -1
    try:
        fd = os.open(tmp_name, flags, 0o600, dir_fd=dir_fd)
        _write_all(fd, payload)
        os.fchmod(fd, 0o755)
        os.fsync(fd)
    except EnsureError:
        raise
    except OSError as exc:
        raise EnsureError("binary-write-failed") from exc
    finally:
        if fd >= 0:
            os.close(fd)


def _link_if_absent(dir_fd: int, tmp_name: str, dest_name: str) -> None:
    try:
        os.link(tmp_name, dest_name, src_dir_fd=dir_fd, dst_dir_fd=dir_fd, follow_symlinks=False)
    except FileExistsError as exc:
        raise EnsureError("destination-appeared") from exc
    except OSError as exc:
        if exc.errno == errno.EEXIST:
            raise EnsureError("destination-appeared") from exc
        raise EnsureError("binary-write-failed") from exc


def _unlink_dir_name(dir_fd: int, name: str) -> None:
    try:
        os.unlink(name, dir_fd=dir_fd)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise EnsureError("binary-write-failed") from exc


def _fsync_dirfd(dir_fd: int) -> None:
    try:
        os.fsync(dir_fd)
    except OSError as exc:
        raise EnsureError("binary-write-failed") from exc


def _cleanup_dir_name(dir_fd: int, name: str) -> None:
    _unlink_dir_name(dir_fd, name)
    _fsync_dirfd(dir_fd)


def _publish_if_absent(dest: Path, payload: bytes) -> None:
    """Link payload onto dest only when that name is absent. Never replace it."""
    if len(payload) <= 0 or len(payload) > MAX_BINARY_BYTES:
        raise EnsureError("unsafe-binary")
    _reject_unsafe_ancestors(dest.parent)
    _mkdir_private(dest.parent)
    dir_fd = _open_parent_directory(dest.parent)
    tmp_name = f".{dest.name}.{os.getpid()}.{time.monotonic_ns()}.tmp"
    publish_error: EnsureError | None = None
    try:
        try:
            _write_temp(dir_fd, tmp_name, payload)
            _link_if_absent(dir_fd, tmp_name, dest.name)
        except EnsureError as exc:
            publish_error = exc
        _cleanup_dir_name(dir_fd, tmp_name)
    finally:
        os.close(dir_fd)
    if publish_error is not None:
        raise publish_error


def install_verified_archive(dest: Path, archive_bytes: bytes, target: PinnedTarget) -> None:
    actual_archive = _hash_bytes(archive_bytes)
    if not _sha256_matches(actual_archive, target.archive_sha256):
        raise EnsureError("archive-hash-mismatch")
    payload = select_gitleaks_member(archive_bytes)
    actual_binary = _hash_bytes(payload)
    if not _sha256_matches(actual_binary, target.binary_sha256):
        raise EnsureError("binary-hash-mismatch")
    _publish_if_absent(dest, payload)


def _host_allowed(hostname: str | None) -> bool:
    if not hostname:
        return False
    host = hostname.lower().rstrip(".")
    return host == "github.com" or host.endswith(".githubusercontent.com")


def _validate_url(url: str, *, allow_query: bool, require_pinned_archive: bool) -> None:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.fragment:
        raise EnsureError("non-official-url")
    if not allow_query and parsed.query:
        raise EnsureError("non-official-url")
    if not _host_allowed(parsed.hostname):
        raise EnsureError("non-official-url")
    if require_pinned_archive:
        if not url.startswith(OFFICIAL_BASE_URL) or parsed.netloc != "github.com" or parsed.query:
            raise EnsureError("non-official-url")
        name = url[len(OFFICIAL_BASE_URL) :]
        if name not in {item.archive_name for item in PINNED_TARGETS.values()}:
            raise EnsureError("non-official-url")


def _enforce_redirect_limit(seen: int) -> None:
    if seen >= MAX_REDIRECTS:
        raise EnsureError("too-many-redirects")


class _PinnedRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = MAX_REDIRECTS

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        _validate_url(newurl, allow_query=True, require_pinned_archive=False)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

    def http_error_302(self, req, fp, code, msg, headers):  # type: ignore[no-untyped-def]
        seen = len(getattr(req, "redirect_dict", {}) or {})
        _enforce_redirect_limit(seen)
        return super().http_error_302(req, fp, code, msg, headers)

    http_error_301 = http_error_303 = http_error_307 = http_error_308 = http_error_302


def production_fetch(url: str, max_bytes: int) -> bytes:
    _validate_url(url, allow_query=False, require_pinned_archive=True)
    if max_bytes <= 0 or max_bytes > MAX_ARCHIVE_BYTES:
        raise EnsureError("archive-too-large")
    opener = urllib.request.build_opener(_PinnedRedirectHandler)
    request = urllib.request.Request(url, headers={"User-Agent": "mahiro-ccc-ensure-gitleaks/8.30.1"}, method="GET")
    deadline = time.monotonic() + DOWNLOAD_DEADLINE_SECONDS
    try:
        response = opener.open(request, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise EnsureError("download-failed") from exc
    try:
        chunks: list[bytes] = []
        total = 0
        while True:
            if time.monotonic() > deadline:
                raise EnsureError("download-failed")
            block = response.read(64 * 1024)
            if not block:
                break
            total += len(block)
            if total > max_bytes:
                raise EnsureError("archive-too-large")
            chunks.append(block)
        return b"".join(chunks)
    except EnsureError:
        raise
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise EnsureError("download-failed") from exc
    finally:
        response.close()


def _open_lock(lock_path: Path) -> int:
    if not hasattr(os, "O_NOFOLLOW"):
        raise EnsureError("unsafe-lock")
    try:
        info = os.lstat(lock_path)
    except FileNotFoundError:
        info = None
    except OSError as exc:
        raise EnsureError("unsafe-lock") from exc
    if info is not None and (stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600):
        raise EnsureError("unsafe-lock")
    try:
        fd = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    except OSError as exc:
        raise EnsureError("unsafe-lock") from exc
    try:
        opened = os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or stat.S_IMODE(opened.st_mode) != 0o600:
            raise EnsureError("unsafe-lock")
    except EnsureError:
        os.close(fd)
        raise
    return fd


@contextmanager
def _repair_lock(directory: Path, timeout_seconds: float) -> Iterator[None]:
    if fcntl is None:
        raise EnsureError("lock-unavailable")
    _mkdir_private(directory)
    fd = _open_lock(directory / LOCK_NAME)
    deadline = time.monotonic() + timeout_seconds
    try:
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    raise EnsureError("lock-timeout")
                time.sleep(0.05)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def _result(action: str, target: PinnedTarget, dest: Path, *, repaired: bool, network: bool) -> dict[str, object]:
    return {
        "schema": SCHEMA,
        "action": action,
        "status": "ok",
        "version": VERSION,
        "target": target.key,
        "path": str(dest),
        "archive_name": target.archive_name,
        "archive_sha256": target.archive_sha256,
        "binary_sha256": target.binary_sha256,
        "repaired": repaired,
        "network": network,
    }


def _require_absent_destination(dest: Path) -> None:
    _reject_unsafe_ancestors(dest.parent)


def ensure_installed(
    dest: Path,
    target: PinnedTarget,
    *,
    offline: bool,
    fetcher: Fetcher | None = None,
    lock_timeout: float = LOCK_TIMEOUT_SECONDS,
    action: str = "ensure",
) -> dict[str, object]:
    code = inspect_binary(dest, target.binary_sha256)
    if code is None:
        return _result(action, target, dest, repaired=False, network=False)
    if code != "missing-binary" or offline or action == "check":
        raise EnsureError(code)
    _require_absent_destination(dest)
    with _repair_lock(dest.parent, lock_timeout):
        code = inspect_binary(dest, target.binary_sha256)
        if code is None:
            return _result(action, target, dest, repaired=False, network=False)
        if code != "missing-binary":
            raise EnsureError(code)
        fetch = fetcher if fetcher is not None else production_fetch
        try:
            archive_bytes = fetch(target.url, MAX_ARCHIVE_BYTES)
            install_verified_archive(dest, archive_bytes, target)
        except EnsureError as exc:
            raise EnsureError(exc.code, network=True) from exc
        if inspect_binary(dest, target.binary_sha256) is not None:
            raise EnsureError("post-install-check-failed", network=True)
        return _result(action, target, dest, repaired=True, network=True)


def check_installed(dest: Path, target: PinnedTarget) -> dict[str, object]:
    code = inspect_binary(dest, target.binary_sha256)
    if code is not None:
        raise EnsureError(code)
    return _result("check", target, dest, repaired=False, network=False)


def _emit(payload: dict[str, object], *, as_json: bool, stream) -> None:
    if as_json:
        print(json.dumps(payload, sort_keys=True, separators=(",", ":")), file=stream)
        return
    if payload.get("status") == "ok":
        print(
            f"ok {payload['action']} {payload['target']} {payload['path']} repaired={str(payload['repaired']).lower()} network={str(payload['network']).lower()}",
            file=stream,
        )
        return
    print(f"error {payload.get('action', 'ensure')} {payload.get('error_code', 'failed')}", file=stream)


class _MetadataArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise SystemExit(2)


def build_parser() -> argparse.ArgumentParser:
    parser = _MetadataArgumentParser(description="Check the pinned Gitleaks v8.30.1 binary, or install it only when absent.")
    parser.add_argument("action", choices=("check", "ensure"))
    parser.add_argument("--dest", default=None, help="Managed binary path. Defaults to ~/.local/share/mahiro-ccc/gitleaks/8.30.1/gitleaks")
    parser.add_argument("--offline", action="store_true", help="Never download. ensure installs only a genuinely absent binary. Invalid state blocks.")
    parser.add_argument("--json", action="store_true", help="Print one metadata-only JSON object.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        if exc.code in (0, None):
            return 0
        _emit(
            {
                "schema": SCHEMA,
                "action": "ensure",
                "status": "error",
                "error_code": "invalid-arguments",
                "version": VERSION,
                "repaired": False,
                "network": False,
            },
            as_json=False,
            stream=sys.stderr,
        )
        return 2
    dest = Path(args.dest).expanduser() if args.dest else default_dest()
    if not dest.is_absolute():
        dest = Path.cwd() / dest
    dest = dest.absolute()
    action = args.action
    try:
        target = current_target()
        if action == "check":
            payload = check_installed(dest, target)
        else:
            payload = ensure_installed(dest, target, offline=args.offline, action="ensure")
    except EnsureError as exc:
        payload = {
            "schema": SCHEMA,
            "action": action,
            "status": "error",
            "error_code": exc.code,
            "version": VERSION,
            "repaired": False,
            "network": exc.network,
        }
        _emit(payload, as_json=args.json, stream=sys.stderr if not args.json else sys.stdout)
        return 2
    _emit(payload, as_json=args.json, stream=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
