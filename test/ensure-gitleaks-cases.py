#!/usr/bin/env python3
"""No-network cases for the pinned Gitleaks helper."""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

HELPER = Path(__file__).resolve().parents[1] / "skills" / "ccc" / "scripts" / "ensure-gitleaks.py"
sys.path.insert(0, str(HELPER.parent))

import importlib.util

spec = importlib.util.spec_from_file_location("ensure_gitleaks", HELPER)
assert spec and spec.loader
helper = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = helper
spec.loader.exec_module(helper)

PAYLOAD = b"synthetic-gitleaks-fixture\n"
OLD = b"old-binary-keep\n"
PINS = {
    "darwin_arm64": (
        "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
        "ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f",
    ),
    "darwin_x64": (
        "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
        "cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291",
    ),
    "linux_arm64": (
        "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
        "00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b",
    ),
    "linux_x64": (
        "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
        "88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509",
    ),
}


def fail(message: str) -> None:
    raise SystemExit(message)


def make_archive(members: list[tuple[str, str, bytes]]) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name, kind, payload in members:
            info = tarfile.TarInfo(name)
            if kind == "reg":
                info.size = len(payload)
                info.mode = 0o755
                info.type = tarfile.REGTYPE
                archive.addfile(info, io.BytesIO(payload))
            elif kind == "sym":
                info.type = tarfile.SYMTYPE
                info.linkname = "other"
                archive.addfile(info)
            elif kind == "dir":
                info.type = tarfile.DIRTYPE
                info.mode = 0o755
                archive.addfile(info)
            else:
                fail(f"unknown member kind {kind}")
    return buffer.getvalue()


def target_for(archive: bytes, binary: bytes) -> helper.PinnedTarget:
    return helper.PinnedTarget(
        key="darwin_arm64",
        archive_name="gitleaks_8.30.1_darwin_arm64.tar.gz",
        archive_sha256=hashlib.sha256(archive).hexdigest(),
        binary_sha256=hashlib.sha256(binary).hexdigest(),
    )


def private_root(raw: str) -> Path:
    return Path(raw).resolve()


def write_exec(path: Path, payload: bytes) -> None:
    path.write_bytes(payload)
    path.chmod(0o755)


def assert_code(func, code: str) -> None:
    try:
        func()
    except helper.EnsureError as exc:
        if exc.code != code:
            fail(f"expected {code}, got {exc.code}")
        if exc.network:
            fail(f"{code} unexpectedly used the network flag")
        return
    fail(f"expected {code}")


def test_supported_mapping() -> None:
    cases = {
        ("Darwin", "arm64"): "darwin_arm64",
        ("Darwin", "aarch64"): "darwin_arm64",
        ("Darwin", "x86_64"): "darwin_x64",
        ("Darwin", "amd64"): "darwin_x64",
        ("Linux", "aarch64"): "linux_arm64",
        ("Linux", "arm64"): "linux_arm64",
        ("Linux", "x86_64"): "linux_x64",
        ("Linux", "amd64"): "linux_x64",
    }
    for (system_name, machine), key in cases.items():
        if helper.platform_key(system_name, machine) != key:
            fail(f"mapping failed for {system_name} {machine}")
        pinned = helper.PINNED_TARGETS[key]
        archive_sha, binary_sha = PINS[key]
        if pinned.archive_name != f"gitleaks_8.30.1_{key}.tar.gz":
            fail(f"archive name drifted for {key}")
        if pinned.archive_sha256 != archive_sha or pinned.binary_sha256 != binary_sha:
            fail(f"pin drifted for {key}")
        if pinned.url != helper.OFFICIAL_BASE_URL + pinned.archive_name:
            fail(f"url drifted for {key}")
    for system_name, machine in (("Windows", "amd64"), ("Linux", "riscv64"), ("FreeBSD", "arm64")):
        assert_code(lambda system_name=system_name, machine=machine: helper.platform_key(system_name, machine), "unsupported-platform")
        help_text = helper.build_parser().format_help()
        if "--url" in help_text or "--sha256" in help_text or "--base-url" in help_text:
            fail("production parser advertised a url or hash override")


def test_valid_existing_and_offline_failures() -> None:
    calls: list[str] = []

    def fetcher(url: str, max_bytes: int) -> bytes:
        calls.append(url)
        fail("fetcher ran")

    with tempfile.TemporaryDirectory() as raw:
        root = private_root(raw)
        dest = root / "gitleaks"
        archive = make_archive([("LICENSE", "reg", b"mit\n"), ("gitleaks", "reg", PAYLOAD)])
        target = target_for(archive, PAYLOAD)
        assert_code(lambda: helper.ensure_installed(dest, target, offline=True, fetcher=fetcher), "missing-binary")
        write_exec(dest, b"not-the-pinned-binary\n")
        assert_code(lambda: helper.check_installed(dest, target), "binary-hash-mismatch")
        assert_code(lambda: helper.ensure_installed(dest, target, offline=True, fetcher=fetcher), "binary-hash-mismatch")
        dest.chmod(0o644)
        assert_code(lambda: helper.check_installed(dest, target), "unsafe-binary")
        link = root / "linked"
        write_exec(root / "real", PAYLOAD)
        link.symlink_to(root / "real")
        assert_code(lambda: helper.check_installed(link, target), "symlink-binary")
        write_exec(dest, PAYLOAD)
        result = helper.ensure_installed(dest, target, offline=False, fetcher=fetcher)
        if result["repaired"] or result["network"] or calls:
            fail("valid binary triggered a repair")
        if calls:
            fail("offline or valid path downloaded")


def test_archive_and_member_failures_preserve_old_binary() -> None:
    with tempfile.TemporaryDirectory() as raw:
        root = Path(raw)
        dest = root / "gitleaks"
        write_exec(dest, OLD)
        good = make_archive([("LICENSE", "reg", b"mit\n"), ("gitleaks", "reg", PAYLOAD)])
        wrong_hash = helper.PinnedTarget(
            key="darwin_arm64",
            archive_name="gitleaks_8.30.1_darwin_arm64.tar.gz",
            archive_sha256="0" * 64,
            binary_sha256=hashlib.sha256(PAYLOAD).hexdigest(),
        )
        assert_code(lambda: helper.install_verified_archive(dest, b"not-a-tar", wrong_hash), "archive-hash-mismatch")
        if dest.read_bytes() != OLD:
            fail("archive hash mismatch replaced the old binary")

        unsafe_archive = make_archive([("LICENSE", "reg", b"mit\n"), ("gitleaks", "sym", b"")])
        unsafe_target = target_for(unsafe_archive, PAYLOAD)
        assert_code(lambda: helper.install_verified_archive(dest, unsafe_archive, unsafe_target), "unsafe-archive-member")
        nested = make_archive([("bin/gitleaks", "reg", PAYLOAD)])
        assert_code(lambda: helper.install_verified_archive(dest, nested, target_for(nested, PAYLOAD)), "unsafe-archive-member")
        escaped = make_archive([("../gitleaks", "reg", PAYLOAD)])
        assert_code(lambda: helper.install_verified_archive(dest, escaped, target_for(escaped, PAYLOAD)), "unsafe-archive-member")
        directory = make_archive([("gitleaks", "dir", b"")])
        assert_code(lambda: helper.install_verified_archive(dest, directory, target_for(directory, PAYLOAD)), "unsafe-archive-member")

        duplicate = make_archive([("gitleaks", "reg", PAYLOAD), ("gitleaks", "reg", PAYLOAD)])
        assert_code(lambda: helper.install_verified_archive(dest, duplicate, target_for(duplicate, PAYLOAD)), "multiple-gitleaks-members")

        mismatch = helper.PinnedTarget(
            key="darwin_arm64",
            archive_name="gitleaks_8.30.1_darwin_arm64.tar.gz",
            archive_sha256=hashlib.sha256(good).hexdigest(),
            binary_sha256="ab" * 32,
        )
        assert_code(lambda: helper.install_verified_archive(dest, good, mismatch), "binary-hash-mismatch")
        if dest.read_bytes() != OLD:
            fail("rejected archive replaced the old binary")


def test_atomic_replacement() -> None:
    calls: list[str] = []
    archive = make_archive([("README.md", "reg", b"readme\n"), ("gitleaks", "reg", PAYLOAD)])
    target = target_for(archive, PAYLOAD)

    def fetcher(url: str, max_bytes: int) -> bytes:
        calls.append(url)
        if max_bytes < len(archive):
            fail("size cap hid the fixture")
        return archive

    with tempfile.TemporaryDirectory() as raw:
        root = private_root(raw)
        dest = root / "8.30.1" / "gitleaks"
        result = helper.ensure_installed(dest, target, offline=False, fetcher=fetcher)
        if not result["repaired"] or not result["network"]:
            fail("absent publish did not report a repaired install")
        if dest.read_bytes() != PAYLOAD:
            fail("replacement bytes mismatch")
        if stat.S_IMODE(dest.stat().st_mode) != 0o755:
            fail("replacement mode mismatch")
        if list(dest.parent.glob(".gitleaks.*.tmp")):
            fail("temp file survived replacement")
        if calls != [target.url]:
            fail("fetcher URL drifted")
        calls.clear()
        again = helper.ensure_installed(dest, target, offline=False, fetcher=fetcher)
        if again["repaired"] or again["network"] or calls:
            fail("second ensure downloaded again")


def test_destination_created_during_fetch_is_not_replaced() -> None:
    archive = make_archive([("README.md", "reg", b"readme\n"), ("gitleaks", "reg", PAYLOAD)])
    target = target_for(archive, PAYLOAD)
    # Invalid bytes must not be accepted. Valid bytes must not be accepted either.
    for competing in (b"competing-executable\n", PAYLOAD):
        with tempfile.TemporaryDirectory() as raw:
            root = private_root(raw)
            dest = root / "8.30.1" / "gitleaks"
            snapshot: dict[str, object] = {}

            def fetcher(url: str, max_bytes: int, competing: bytes = competing, dest: Path = dest, snapshot: dict[str, object] = snapshot) -> bytes:
                if max_bytes < len(archive):
                    fail("size cap hid the fixture")
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(competing)
                dest.chmod(0o750)
                info = dest.lstat()
                snapshot["ino"] = info.st_ino
                snapshot["mode"] = stat.S_IMODE(info.st_mode)
                snapshot["bytes"] = dest.read_bytes()
                return archive

            try:
                helper.ensure_installed(dest, target, offline=False, fetcher=fetcher)
            except helper.EnsureError as exc:
                if exc.code != "destination-appeared" or str(exc) != "destination-appeared":
                    fail(f"expected destination-appeared, got {exc.code}")
                if not exc.network:
                    fail("publish race was reported before fetch")
                if str(dest) in str(exc) or competing.decode() in str(exc):
                    fail("destination-appeared leaked bytes or a path")
            else:
                fail("expected destination-appeared")
            after = dest.lstat()
            if snapshot.get("bytes") != competing or dest.read_bytes() != competing:
                fail("competing bytes changed")
            if snapshot.get("mode") != 0o750 or stat.S_IMODE(after.st_mode) != 0o750:
                fail("competing mode changed")
            if snapshot.get("ino") != after.st_ino:
                fail("competing inode changed")
            leftovers = [
                path.name
                for path in dest.parent.iterdir()
                if path.name not in {dest.name, helper.LOCK_NAME}
            ]
            if leftovers:
                fail(f"temp artifacts remained: {leftovers}")


def test_existing_states_are_not_replaced() -> None:
    calls: list[str] = []
    with tempfile.TemporaryDirectory() as raw:
        marker_root = private_root(raw)
        marker = marker_root / "executed-marker"
        script = f"#!/bin/sh\ntouch {marker}\n".encode()
        archive = make_archive([("gitleaks", "reg", script)])
        target = target_for(archive, script)

        def fetcher(url: str, max_bytes: int) -> bytes:
            calls.append(url)
            return archive

        fresh = marker_root / "fresh" / "gitleaks"
        installed = helper.ensure_installed(fresh, target, offline=False, fetcher=fetcher)
        if not installed["repaired"] or marker.exists() or fresh.read_bytes() != script:
            fail("absence install executed the payload or wrote the wrong bytes")
        calls.clear()

        stale = marker_root / "stale-gitleaks"
        write_exec(stale, OLD)
        assert_code(lambda: helper.ensure_installed(stale, target, offline=False, fetcher=fetcher), "binary-hash-mismatch")
        legacy = marker_root / "legacy-binary"
        write_exec(legacy, OLD)
        link = marker_root / "linked-gitleaks"
        link.symlink_to(legacy)
        assert_code(lambda: helper.ensure_installed(link, target, offline=False, fetcher=fetcher), "symlink-binary")
        directory = marker_root / "dir-gitleaks"
        directory.mkdir()
        (directory / "keep").write_bytes(b"keep\n")
        assert_code(lambda: helper.ensure_installed(directory, target, offline=False, fetcher=fetcher), "unsafe-binary")
        blocked = marker_root / "blocked"
        blocked.mkdir()
        hidden = blocked / "gitleaks"
        write_exec(hidden, OLD)
        blocked.chmod(0)
        try:
            assert_code(lambda: helper.ensure_installed(hidden, target, offline=False, fetcher=fetcher), "permission-failure")
        finally:
            blocked.chmod(0o700)
        if stale.read_bytes() != OLD or legacy.read_bytes() != OLD or not link.is_symlink():
            fail("ensure replaced an existing binary or symlink")
        if (directory / "keep").read_bytes() != b"keep\n" or hidden.read_bytes() != OLD or calls or marker.exists():
            fail("ensure mutated a blocked path or downloaded for an existing state")


def test_lock_and_cli_do_not_download() -> None:
    archive = make_archive([("gitleaks", "reg", PAYLOAD)])
    target = target_for(archive, PAYLOAD)
    calls: list[str] = []

    def fetcher(url: str, max_bytes: int) -> bytes:
        calls.append(url)
        return archive

    with tempfile.TemporaryDirectory() as raw:
        root = private_root(raw)
        dest = root / "gitleaks"
        lock = root / helper.LOCK_NAME
        proc = subprocess.Popen(
            [
                sys.executable,
                "-c",
                "import fcntl,os,sys,time; fd=os.open(sys.argv[1], os.O_CREAT|os.O_RDWR, 0o600); fcntl.flock(fd, fcntl.LOCK_EX); sys.stdout.write('locked\\n'); sys.stdout.flush(); time.sleep(1)",
                str(lock),
            ],
            stdout=subprocess.PIPE,
            text=True,
        )
        assert proc.stdout
        if proc.stdout.readline().strip() != "locked":
            proc.kill()
            fail("lock holder did not start")
        assert_code(
            lambda: helper.ensure_installed(dest, target, offline=False, fetcher=fetcher, lock_timeout=0.2),
            "lock-timeout",
        )
        proc.wait(timeout=3)
        if calls or dest.exists():
            fail("locked repair downloaded or created a binary")

    def boom(url: str, max_bytes: int) -> bytes:
        fail(f"cli downloaded {url}")

    helper.production_fetch = boom
    with tempfile.TemporaryDirectory() as raw:
        missing = str(private_root(raw) / "missing-gitleaks")
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            check = helper.main(["check", "--dest", missing, "--json"])
            offline = helper.main(["ensure", "--offline", "--dest", missing, "--json"])
            overridden = helper.main(["ensure", "--dest", missing, "--url", "https://example.invalid/gitleaks.tar.gz", "--sha256", "sha256-override"])
        if check != 2 or offline != 2:
            fail(f"cli offline codes were {check} {offline}")
        if overridden != 2:
            fail("cli accepted a url override")
        fake = "https://example.invalid/gitleaks.tar.gz"
        echoed = stdout.getvalue() + stderr.getvalue()
        if fake in echoed or "sha256-override" in echoed:
            fail("rejected override was echoed")
        if "invalid-arguments" not in stderr.getvalue():
            fail("rejected override did not use the stable argument error")


def test_ancestors_and_lock_state_block_without_network() -> None:
    calls: list[str] = []
    archive = make_archive([("gitleaks", "reg", PAYLOAD)])
    target = target_for(archive, PAYLOAD)

    def fetcher(url: str, max_bytes: int) -> bytes:
        calls.append(url)
        return archive

    with tempfile.TemporaryDirectory() as raw:
        root = private_root(raw)
        real = root / "real-cache"
        real.mkdir()
        linked = root / "linked-cache"
        linked.symlink_to(real, target_is_directory=True)
        assert_code(
            lambda: helper.ensure_installed(linked / "nested" / "gitleaks", target, offline=False, fetcher=fetcher),
            "malformed-state",
        )
        blocked_file = root / "not-a-directory"
        blocked_file.write_bytes(b"ancestor\n")
        assert_code(
            lambda: helper.ensure_installed(blocked_file / "gitleaks", target, offline=False, fetcher=fetcher),
            "malformed-state",
        )
        cache = root / "cache"
        cache.mkdir()
        lock_target = root / "lock-target"
        lock_target.write_bytes(b"keep-lock-target\n")
        lock = cache / helper.LOCK_NAME
        lock.symlink_to(lock_target)
        assert_code(
            lambda: helper.ensure_installed(cache / "gitleaks", target, offline=False, fetcher=fetcher),
            "unsafe-lock",
        )
        if lock_target.read_bytes() != b"keep-lock-target\n":
            fail("lock open followed a symlink")
        lock.unlink()
        lock.mkdir()
        assert_code(
            lambda: helper.ensure_installed(cache / "gitleaks", target, offline=False, fetcher=fetcher),
            "unsafe-lock",
        )
        lock.rmdir()
        lock.write_bytes(b"")
        lock.chmod(0o666)
        assert_code(
            lambda: helper.ensure_installed(cache / "gitleaks", target, offline=False, fetcher=fetcher),
            "unsafe-lock",
        )
        if calls or (real / "nested").exists() or (cache / "gitleaks").exists():
            fail("blocked ancestor or lock state downloaded or created a binary")


def test_symlinked_parent_rejects_valid_binary_without_fetch_or_write() -> None:
    calls: list[str] = []
    archive = make_archive([("gitleaks", "reg", PAYLOAD)])
    target = target_for(archive, PAYLOAD)

    def fetcher(url: str, max_bytes: int) -> bytes:
        calls.append(url)
        return archive

    with tempfile.TemporaryDirectory() as raw:
        root = private_root(raw)
        real = root / "real-parent"
        real.mkdir(mode=0o700)
        dest = real / "gitleaks"
        write_exec(dest, PAYLOAD)
        before = dest.lstat()
        linked = root / "linked-parent"
        linked.symlink_to(real, target_is_directory=True)
        via = linked / "gitleaks"
        root_names = sorted(path.name for path in root.iterdir())
        real_names = sorted(path.name for path in real.iterdir())
        assert_code(lambda: helper.check_installed(via, target), "malformed-state")
        assert_code(lambda: helper.ensure_installed(via, target, offline=False, fetcher=fetcher), "malformed-state")
        after = dest.lstat()
        if after.st_ino != before.st_ino or stat.S_IMODE(after.st_mode) != stat.S_IMODE(before.st_mode):
            fail("symlinked parent changed the valid binary identity")
        if dest.read_bytes() != PAYLOAD:
            fail("symlinked parent changed valid bytes")
        if not linked.is_symlink() or linked.readlink() != real:
            fail("symlinked parent was replaced")
        if sorted(path.name for path in root.iterdir()) != root_names:
            fail("symlinked parent wrote beside the link")
        if sorted(path.name for path in real.iterdir()) != real_names:
            fail("symlinked parent wrote into the real directory")
        if calls:
            fail("symlinked parent fetched")
        temps = list(root.glob("**/*.tmp"))
        if temps:
            fail(f"symlinked parent left temp files: {temps}")


def test_redirect_limit() -> None:
    if helper._PinnedRedirectHandler.max_redirections != helper.MAX_REDIRECTS:
        fail("redirect cap is not the pinned limit")
    helper._enforce_redirect_limit(helper.MAX_REDIRECTS - 1)
    assert_code(lambda: helper._enforce_redirect_limit(helper.MAX_REDIRECTS), "too-many-redirects")
    handler = helper._PinnedRedirectHandler()
    request = urllib.request.Request(helper.OFFICIAL_BASE_URL + "gitleaks_8.30.1_darwin_arm64.tar.gz")
    secret = "https://evil.example/redirect-secret"
    request.redirect_dict = {f"{secret}/{index}": 1 for index in range(helper.MAX_REDIRECTS)}  # type: ignore[attr-defined]
    try:
        handler.http_error_302(request, None, 302, "Found", {})
    except helper.EnsureError as exc:
        if exc.code != "too-many-redirects" or secret in str(exc):
            fail("redirect limit leaked or used the wrong code")
        return
    fail("redirect limit was not enforced")


def main() -> None:
    test_supported_mapping()
    test_valid_existing_and_offline_failures()
    test_archive_and_member_failures_preserve_old_binary()
    test_atomic_replacement()
    test_destination_created_during_fetch_is_not_replaced()
    test_existing_states_are_not_replaced()
    test_ancestors_and_lock_state_block_without_network()
    test_symlinked_parent_rejects_valid_binary_without_fetch_or_write()
    test_redirect_limit()
    test_lock_and_cli_do_not_download()
    print(json.dumps({"ok": True}, sort_keys=True))


if __name__ == "__main__":
    main()
