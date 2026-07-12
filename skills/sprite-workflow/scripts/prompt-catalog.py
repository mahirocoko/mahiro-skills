#!/usr/bin/env python3
"""Browse and render the vendored Image Cockpit prompt catalog (stdlib only)."""

from __future__ import annotations

import argparse
import json
import re
import string
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "data" / "prompt-catalog.json"
TEMPLATES_PATH = ROOT / "data" / "prompt-templates.json"
EXPECTED_COUNTS = {
    "basic-character": 21,
    "profession-character": 30,
    "monster": 30,
    "monster-girl": 20,
    "legacy-inline": 6,
}
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CatalogError(ValueError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CatalogError(f"cannot load {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise CatalogError(f"{path} must contain a JSON object")
    return payload


def load_data() -> tuple[dict[str, Any], dict[str, Any]]:
    return load_json(CATALOG_PATH), load_json(TEMPLATES_PATH)


def by_id(items: list[dict[str, Any]], ident: str, kind: str) -> dict[str, Any]:
    for item in items:
        if item.get("id") == ident:
            return item
    raise CatalogError(f"unknown {kind} id: {ident}")


def validate(catalog: dict[str, Any], templates: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    entries = catalog.get("entries")
    template_items = templates.get("templates")
    if catalog.get("schemaVersion") != 1:
        errors.append("catalog schemaVersion must be 1")
    if templates.get("schemaVersion") != 1:
        errors.append("template schemaVersion must be 1")
    if not isinstance(entries, list):
        errors.append("catalog entries must be an array")
        entries = []
    if not isinstance(template_items, list):
        errors.append("templates must be an array")
        template_items = []

    required = ("id", "collection", "category", "title", "tags", "templateFamily", "positivePrompt", "negativePrompt", "notes", "sourceLocator", "sourceHeading")
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append(f"entry {index} must be an object")
            continue
        for field in required:
            value = entry.get(field)
            if value is None or value == "" or (field == "tags" and not isinstance(value, list)):
                errors.append(f"entry {index} has invalid {field}")
        if not ID_PATTERN.fullmatch(str(entry.get("id", ""))):
            errors.append(f"entry {index} has unstable id syntax")

    ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
    locators = [entry.get("sourceLocator") for entry in entries if isinstance(entry, dict)]
    if len(ids) != len(set(ids)):
        errors.append("entry ids must be unique")
    if len(locators) != len(set(locators)):
        errors.append("source locators must be unique")
    counts = Counter(entry.get("collection") for entry in entries if isinstance(entry, dict))
    if dict(counts) != EXPECTED_COUNTS:
        errors.append(f"collection counts must be {EXPECTED_COUNTS}, got {dict(counts)}")
    if len(entries) != 107:
        errors.append(f"catalog must contain 107 entries, got {len(entries)}")

    template_ids = []
    formatter = string.Formatter()
    for index, template in enumerate(template_items):
        if not isinstance(template, dict):
            errors.append(f"template {index} must be an object")
            continue
        ident, body, parameters = template.get("id"), template.get("body"), template.get("parameters")
        template_ids.append(ident)
        if not ID_PATTERN.fullmatch(str(ident or "")) or not isinstance(body, str) or not isinstance(parameters, dict):
            errors.append(f"template {index} has invalid shape")
            continue
        fields = {name for _, name, _, _ in formatter.parse(body) if name}
        if fields != set(parameters):
            errors.append(f"template {ident} placeholders and parameters differ")
        for name, definition in parameters.items():
            if not isinstance(definition, dict) or not isinstance(definition.get("required"), bool):
                errors.append(f"template {ident} parameter {name} has invalid definition")
            if definition.get("required") is False and "default" not in definition:
                errors.append(f"template {ident} optional parameter {name} lacks a default")
    if len(template_ids) != len(set(template_ids)):
        errors.append("template ids must be unique")
    unknown = sorted({entry.get("templateFamily") for entry in entries if isinstance(entry, dict)} - set(template_ids))
    if unknown:
        errors.append(f"unknown template families: {', '.join(unknown)}")

    upstream = catalog.get("upstream", {})
    if upstream.get("revision") != "b997e78609773975a98617568818ac32f40cf1a7" or upstream.get("license") != "MIT":
        errors.append("pinned upstream revision and MIT license are required")
    return {"ok": not errors, "entryCount": len(entries), "collectionCounts": dict(sorted(counts.items())), "templateCount": len(template_items), "errors": errors}


def filtered_entries(entries: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    result = entries
    if getattr(args, "collection", None):
        result = [entry for entry in result if entry["collection"] == args.collection]
    if getattr(args, "category", None):
        needle = args.category.casefold()
        result = [entry for entry in result if entry["category"].casefold() == needle]
    if getattr(args, "tag", None):
        needle = args.tag.casefold()
        result = [entry for entry in result if needle in {tag.casefold() for tag in entry["tags"]}]
    return result


def search(entries: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    terms = query.casefold().split()
    scored = []
    for index, entry in enumerate(entries):
        fields = [entry["id"], entry["title"], entry["category"], entry["collection"], *entry["tags"], entry["positivePrompt"], entry["negativePrompt"], entry["notes"]]
        haystack = "\n".join(fields).casefold()
        if all(term in haystack for term in terms):
            identity = " ".join([entry["id"], entry["title"], entry["category"], *entry["tags"]]).casefold()
            score = sum(3 if term in identity else 1 for term in terms)
            scored.append((-score, index, entry))
    return [entry for _, _, entry in sorted(scored)]


def parse_params(values: list[str]) -> dict[str, str]:
    result = {}
    for value in values:
        if "=" not in value:
            raise CatalogError(f"parameter must use NAME=VALUE: {value}")
        name, content = value.split("=", 1)
        if not name or not content:
            raise CatalogError(f"parameter name and value must be non-empty: {value}")
        if name in result:
            raise CatalogError(f"duplicate parameter: {name}")
        result[name] = content
    return result


def render_template(template: dict[str, Any], supplied: dict[str, str]) -> str:
    definitions = template["parameters"]
    unknown = sorted(set(supplied) - set(definitions))
    if unknown:
        raise CatalogError(f"unknown parameter(s) for {template['id']}: {', '.join(unknown)}")
    values = dict(supplied)
    missing = []
    for name, definition in definitions.items():
        if name not in values:
            if definition["required"]:
                missing.append(name)
            else:
                values[name] = definition["default"]
    if missing:
        raise CatalogError(f"missing required parameter(s) for {template['id']}: {', '.join(missing)}")
    return template["body"].format_map(values)


def compact(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: entry[key] for key in ("id", "title", "collection", "category", "tags", "templateFamily", "sourceLocator")}


def emit(payload: Any, as_json: bool, text: str | None = None) -> None:
    if as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True))
    elif text is not None:
        print(text)
    elif isinstance(payload, list):
        for item in payload:
            print(f"{item['id']}\t{item.get('title', item.get('description', ''))}")
    else:
        print(json.dumps(payload, ensure_ascii=False, indent=2))


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    sub = parser.add_subparsers(dest="command", required=True)
    list_parser = sub.add_parser("list", help="list original prompt examples")
    for name in ("collection", "category", "tag"):
        list_parser.add_argument(f"--{name}")
    search_parser = sub.add_parser("search", help="search all original prompt fields")
    search_parser.add_argument("query")
    for name in ("collection", "category", "tag"):
        search_parser.add_argument(f"--{name}")
    for command, help_text in (("show", "show one catalog record"), ("render-original", "render one exact original prompt")):
        item_parser = sub.add_parser(command, help=help_text)
        item_parser.add_argument("id")
    sub.add_parser("template-list", help="list reusable adapted templates")
    template_show = sub.add_parser("template-show", help="show one template definition")
    template_show.add_argument("id")
    template_render = sub.add_parser("template-render", help="render an adapted template")
    template_render.add_argument("id")
    template_render.add_argument("--param", action="append", default=[], metavar="NAME=VALUE")
    sub.add_parser("validate", help="strictly validate catalog and templates")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = make_parser()
    raw_args = list(sys.argv[1:] if argv is None else argv)
    if "--json" in raw_args:
        raw_args = ["--json", *(value for value in raw_args if value != "--json")]
    args = parser.parse_args(raw_args)
    try:
        catalog, templates = load_data()
        report = validate(catalog, templates)
        if args.command != "validate" and not report["ok"]:
            raise CatalogError("catalog validation failed: " + "; ".join(report["errors"]))
        entries, template_items = catalog["entries"], templates["templates"]
        if args.command == "validate":
            emit(report, args.json)
            return 0 if report["ok"] else 1
        if args.command == "list":
            items = [compact(item) for item in filtered_entries(entries, args)]
            emit(items, args.json)
        elif args.command == "search":
            items = [compact(item) for item in search(filtered_entries(entries, args), args.query)]
            emit(items, args.json)
        elif args.command == "show":
            item = by_id(entries, args.id, "prompt")
            emit(item, args.json)
        elif args.command == "render-original":
            item = by_id(entries, args.id, "prompt")
            emit({"id": item["id"], "positivePrompt": item["positivePrompt"], "negativePrompt": item["negativePrompt"]}, args.json, item["positivePrompt"])
        elif args.command == "template-list":
            emit(template_items, args.json)
        elif args.command == "template-show":
            emit(by_id(template_items, args.id, "template"), args.json)
        elif args.command == "template-render":
            template = by_id(template_items, args.id, "template")
            rendered = render_template(template, parse_params(args.param))
            emit({"id": template["id"], "rendered": rendered, "exactOriginal": False}, args.json, rendered)
        return 0
    except CatalogError as exc:
        if getattr(args, "json", False):
            print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        else:
            print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
