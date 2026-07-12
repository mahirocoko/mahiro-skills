#!/usr/bin/env python3
"""Verify the vendored prompt catalog against a pinned Image Cockpit checkout."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

PINNED_REVISION = "b997e78609773975a98617568818ac32f40cf1a7"
ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "data" / "prompt-catalog.json"
RECEIPT_PATH = ROOT / "data" / "prompt-catalog-upstream-receipt.json"
FIELDS = ("positivePrompt", "negativePrompt", "notes", "title", "sourceHeading", "sourceLocator")
MARKDOWN_SOURCES = {
    "basic-character": ("docs/prompt-examples/basic-character-prompts.md", 21, "full-body transparent-background starter character."),
    "profession-character": ("docs/prompt-examples/profession-character-prompts.md", 30, "full-body animation-ready profession character."),
    "monster": ("docs/prompt-examples/monster-prompts.md", 30, "full-body animation-ready monster asset."),
    "monster-girl": ("docs/prompt-examples/monster-girl-prompts.md", 20, "cute two-head-tall monster girl source character for Image Cockpit animation testing."),
}
EXPECTED_COUNTS = {name: details[1] for name, details in MARKDOWN_SOURCES.items()} | {"legacy-inline": 6}


class VerificationError(ValueError):
    pass


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def git(upstream_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(upstream_root), *args], capture_output=True, text=True, check=False
    )
    if result.returncode:
        raise VerificationError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def verify_checkout(upstream_root: Path, allow_dirty: bool) -> None:
    revision = git(upstream_root, "rev-parse", "HEAD")
    if revision != PINNED_REVISION:
        raise VerificationError(f"upstream HEAD must be {PINNED_REVISION}, got {revision}")
    dirty = git(upstream_root, "status", "--porcelain")
    if dirty and not allow_dirty:
        raise VerificationError(
            "upstream worktree is dirty; use --allow-dirty-worktree only for a read-only local refresh"
        )


def parse_markdown_catalog(text: str, source_path: str, collection: str, notes_suffix: str) -> list[dict[str, str]]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").splitlines()
    negative_heading = [index for index, line in enumerate(lines) if line == "## Common Negative Prompt"]
    if len(negative_heading) != 1:
        raise VerificationError(f"{source_path}: expected one Common Negative Prompt heading, got {len(negative_heading)}")

    def fenced_text_after(index: int, context: str) -> str:
        cursor = index + 1
        while cursor < len(lines) and lines[cursor] == "":
            cursor += 1
        if cursor >= len(lines) or lines[cursor] != "```text":
            raise VerificationError(f"{source_path}:{index + 1}: {context} lacks an opening ```text fence")
        end = cursor + 1
        while end < len(lines) and lines[end] != "```":
            end += 1
        if end >= len(lines):
            raise VerificationError(f"{source_path}:{cursor + 1}: {context} lacks a closing fence")
        value = "\n".join(lines[cursor + 1 : end]).strip()
        if not value:
            raise VerificationError(f"{source_path}:{cursor + 1}: {context} has an empty fence")
        return value

    negative_prompt = fenced_text_after(negative_heading[0], "common negative prompt")
    headings = [(index, line) for index, line in enumerate(lines) if line.startswith("### ")]
    entries: list[dict[str, str]] = []
    failures: list[str] = []
    for ordinal, (index, heading) in enumerate(headings, 1):
        expected_prefix = f"### {ordinal:02d}. "
        if not heading.startswith(expected_prefix) or len(heading) == len(expected_prefix):
            failures.append(f"line {index + 1}: expected heading prefix {expected_prefix!r}, got {heading!r}")
            continue
        title = heading[len(expected_prefix) :]
        try:
            prompt = fenced_text_after(index, heading)
        except VerificationError as exc:
            failures.append(str(exc))
            continue
        entries.append({
            "collection": collection,
            "title": title,
            "positivePrompt": prompt,
            "negativePrompt": negative_prompt,
            "notes": f"{source_path}: {notes_suffix}",
            "sourceHeading": heading,
            "sourceLocator": f"{source_path}#L{index + 1}",
        })
    if failures:
        raise VerificationError(f"{source_path}: {len(failures)} entry parse failure(s): " + "; ".join(failures))
    return entries


def split_top_level_objects(lines: list[str], start: int, end: int) -> list[tuple[int, list[str]]]:
    objects: list[tuple[int, list[str]]] = []
    depth = 0
    object_start = -1
    in_string = False
    escaped = False
    quote = ""
    for line_index in range(start, end):
        line = lines[line_index]
        for char in line + "\n":
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    in_string = False
                continue
            if char in ('"', "'", "`"):
                in_string, quote = True, char
            elif char == "{":
                if depth == 0:
                    object_start = line_index
                depth += 1
            elif char == "}":
                depth -= 1
                if depth < 0:
                    raise VerificationError(f"src/App.tsx:{line_index + 1}: unbalanced closing brace")
                if depth == 0 and object_start >= 0:
                    objects.append((object_start, lines[object_start : line_index + 1]))
                    object_start = -1
    if depth != 0:
        raise VerificationError("src/App.tsx: unclosed object in promptExamples array")
    return objects


def json_string_property(object_lines: list[str], name: str, source_line: int) -> tuple[str, int]:
    matches: list[tuple[str, int]] = []
    prefix = f"{name}:"
    for offset, raw_line in enumerate(object_lines):
        stripped = raw_line.strip()
        if not stripped.startswith(prefix):
            continue
        remainder = stripped[len(prefix) :].strip()
        value_line = offset
        if not remainder:
            value_line += 1
            if value_line >= len(object_lines):
                raise VerificationError(f"src/App.tsx:{source_line + offset}: missing value for {name}")
            remainder = object_lines[value_line].strip()
        if remainder.endswith(","):
            remainder = remainder[:-1]
        try:
            value = json.loads(remainder)
        except json.JSONDecodeError as exc:
            raise VerificationError(f"src/App.tsx:{source_line + value_line}: {name} is not one JSON string: {exc}") from exc
        if not isinstance(value, str):
            raise VerificationError(f"src/App.tsx:{source_line + value_line}: {name} must be a string")
        matches.append((value, offset))
    if len(matches) != 1:
        raise VerificationError(f"src/App.tsx:{source_line}: expected one {name} property, got {len(matches)}")
    return matches[0]


def english_title(object_lines: list[str], source_line: int) -> str:
    for offset, raw_line in enumerate(object_lines):
        stripped = raw_line.strip()
        if not stripped.startswith("title:"):
            continue
        marker = 'en: "'
        begin = stripped.find(marker)
        if begin < 0:
            break
        tail = stripped[begin + len("en: ") :]
        decoder = json.JSONDecoder()
        try:
            value, _ = decoder.raw_decode(tail)
        except json.JSONDecodeError as exc:
            raise VerificationError(f"src/App.tsx:{source_line + offset}: invalid English title: {exc}") from exc
        if isinstance(value, str):
            return value
    raise VerificationError(f"src/App.tsx:{source_line}: expected one inline English title")


def parse_legacy_inline(text: str) -> list[dict[str, str]]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").splitlines()
    starts = [index for index, line in enumerate(lines) if line.strip() == "const promptExamples: PromptExample[] = ["]
    if len(starts) != 1:
        raise VerificationError(f"src/App.tsx: expected one promptExamples array, got {len(starts)}")
    start = starts[0]
    ends = [index for index in range(start + 1, len(lines)) if lines[index].strip() == "];" ]
    if not ends:
        raise VerificationError("src/App.tsx: promptExamples array has no closing ];")
    objects = split_top_level_objects(lines, start + 1, ends[0])
    entries: list[dict[str, str]] = []
    failures: list[str] = []
    for object_start, object_lines in objects:
        if not any(line.strip().startswith("prompt:") for line in object_lines):
            continue
        try:
            ident, _ = json_string_property(object_lines, "id", object_start + 1)
            prompt, prompt_offset = json_string_property(object_lines, "prompt", object_start + 1)
            negative, _ = json_string_property(object_lines, "negativePrompt", object_start + 1)
            notes, _ = json_string_property(object_lines, "notes", object_start + 1)
            entries.append({
                "collection": "legacy-inline",
                "title": english_title(object_lines, object_start + 1),
                "positivePrompt": prompt,
                "negativePrompt": negative,
                "notes": notes,
                "sourceHeading": ident,
                "sourceLocator": f"src/App.tsx#L{object_start + prompt_offset + 1}",
            })
        except VerificationError as exc:
            failures.append(str(exc))
    if failures:
        raise VerificationError(f"src/App.tsx: {len(failures)} inline parse failure(s): " + "; ".join(failures))
    return entries


def load_upstream(upstream_root: Path) -> tuple[list[dict[str, str]], dict[str, str]]:
    entries: list[dict[str, str]] = []
    hashes: dict[str, str] = {}
    for collection, (relative, expected, notes_suffix) in MARKDOWN_SOURCES.items():
        path = upstream_root / relative
        raw = path.read_bytes()
        hashes[relative] = sha256_bytes(raw)
        parsed = parse_markdown_catalog(raw.decode("utf-8"), relative, collection, notes_suffix)
        if len(parsed) != expected:
            raise VerificationError(f"{relative}: expected {expected} entries, parsed {len(parsed)}")
        entries.extend(parsed)
    app_relative = "src/App.tsx"
    app_raw = (upstream_root / app_relative).read_bytes()
    hashes[app_relative] = sha256_bytes(app_raw)
    inline = parse_legacy_inline(app_raw.decode("utf-8"))
    if len(inline) != 6:
        raise VerificationError(f"src/App.tsx: expected 6 inline entries, parsed {len(inline)}")
    entries.extend(inline)
    counts = Counter(entry["collection"] for entry in entries)
    if dict(counts) != EXPECTED_COUNTS or len(entries) != 107:
        raise VerificationError(f"upstream distribution must be {EXPECTED_COUNTS} / 107, got {dict(counts)} / {len(entries)}")
    return entries, dict(sorted(hashes.items()))


def compare(catalog_entries: list[dict[str, Any]], upstream_entries: list[dict[str, str]]) -> list[dict[str, str]]:
    mismatches: list[dict[str, str]] = []
    if len(catalog_entries) != 107:
        mismatches.append({"entry": "catalog", "field": "count", "expected": "107", "actual": str(len(catalog_entries))})
    catalog_counts = Counter(entry.get("collection") for entry in catalog_entries)
    if dict(catalog_counts) != EXPECTED_COUNTS:
        mismatches.append({"entry": "catalog", "field": "distribution", "expected": json.dumps(EXPECTED_COUNTS, sort_keys=True), "actual": json.dumps(dict(catalog_counts), sort_keys=True)})
    catalog_by_locator = {entry.get("sourceLocator"): entry for entry in catalog_entries}
    if len(catalog_by_locator) != len(catalog_entries):
        mismatches.append({"entry": "catalog", "field": "sourceLocator", "expected": "107 unique", "actual": str(len(catalog_by_locator))})
    upstream_locators = {entry["sourceLocator"] for entry in upstream_entries}
    for locator in sorted(set(catalog_by_locator) - upstream_locators):
        mismatches.append({"entry": str(locator), "field": "sourceLocator", "expected": "absent", "actual": "catalog-only"})
    for source in upstream_entries:
        locator = source["sourceLocator"]
        vendored = catalog_by_locator.get(locator)
        if vendored is None:
            mismatches.append({"entry": locator, "field": "sourceLocator", "expected": locator, "actual": "missing"})
            continue
        for field in FIELDS:
            if vendored.get(field) != source[field]:
                mismatches.append({"entry": str(vendored.get("id", locator)), "field": field, "expected": source[field], "actual": str(vendored.get(field))})
    return mismatches


def build_receipt(catalog_raw: bytes, catalog_entries: list[dict[str, Any]], source_hashes: dict[str, str]) -> dict[str, Any]:
    entry_receipts = []
    for entry in catalog_entries:
        field_hashes = {field: sha256_text(str(entry[field])) for field in FIELDS}
        fidelity_record = {"id": entry["id"], "collection": entry["collection"], **{field: entry[field] for field in FIELDS}}
        entry_receipts.append({"id": entry["id"], "fieldHashes": field_hashes, "sha256": sha256_bytes(canonical_json(fidelity_record))})
    counts = Counter(entry["collection"] for entry in catalog_entries)
    return {
        "schemaVersion": 1,
        "upstreamRevision": PINNED_REVISION,
        "sourceFileHashes": source_hashes,
        "collectionCounts": dict(sorted(counts.items())),
        "entryCount": len(catalog_entries),
        "catalogSha256": sha256_bytes(catalog_raw),
        "entries": entry_receipts,
    }


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upstream-root", required=True, type=Path)
    parser.add_argument("--allow-dirty-worktree", action="store_true")
    parser.add_argument("--write-receipt", action="store_true", help="replace the vendored receipt after a zero-mismatch verification")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        upstream_root = args.upstream_root.resolve()
        verify_checkout(upstream_root, args.allow_dirty_worktree)
        catalog_raw = CATALOG_PATH.read_bytes()
        catalog = json.loads(catalog_raw)
        entries = catalog.get("entries")
        if not isinstance(entries, list):
            raise VerificationError("vendored catalog entries must be an array")
        upstream_entries, source_hashes = load_upstream(upstream_root)
        mismatches = compare(entries, upstream_entries)
        receipt = build_receipt(catalog_raw, entries, source_hashes)
        if args.write_receipt and not mismatches:
            RECEIPT_PATH.write_bytes(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n")
        report = {
            "ok": not mismatches,
            "upstreamRevision": PINNED_REVISION,
            "entryCount": len(entries),
            "sourceCounts": {"markdown": 101, "legacyInline": 6},
            "collectionCounts": receipt["collectionCounts"],
            "mismatchCount": len(mismatches),
            "mismatches": mismatches,
            "catalogSha256": receipt["catalogSha256"],
            "entryHashes": {entry["id"]: entry["sha256"] for entry in receipt["entries"]},
            "receiptWritten": bool(args.write_receipt and not mismatches),
        }
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
        return 0 if not mismatches else 1
    except (OSError, json.JSONDecodeError, VerificationError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
