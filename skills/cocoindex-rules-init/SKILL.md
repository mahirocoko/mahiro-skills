---
name: cocoindex-rules-init
description: Repo-local CocoIndex Code rule bootstrapper. Patches AGENTS.md search guidance and invokes the installed sibling ccc skill for portable settings, filename-only preflight, pinned Gitleaks self-heal, and strict scan. Use when a repo needs semantic-search rules or a first materialization of the CCC project boundary.
user-invocable: true
---

# /cocoindex-rules-init - Bootstrap CocoIndex Rules

Write or refine repo-local `AGENTS.md` guidance for semantic search. The operational lifecycle lives in the installed sibling `ccc` skill: search, index freshness, portable V2 settings, filename-only preflight, missing-only pinned Gitleaks ensure, and the strict receipt. This skill does not vendor those scripts or resources, and it does not fork or patch upstream `cocoindex-code`.

## When to Use

- A repo needs `AGENTS.md` guidance for semantic search and index freshness.
- A repo needs the portable deny/noise policy materialized into `.cocoindex_code/settings.yml`.
- A filename-only preflight or a strict Gitleaks `v8.30.1` receipt is required before index or refresh.

## Sibling ccc skill

Resolve the sibling before any sync, preflight, ensure, or strict command.

1. Start from this skill's installed directory, `cocoindex-rules-init` or `mh-cocoindex-rules-init`.
2. The sibling in the same parent directory is `ccc`, or `mh-ccc` when this directory uses the `mh-` prefix.
3. Require that sibling's `SKILL.md` plus `scripts/sync-project-excludes.py`, `scripts/preflight.py`, `scripts/ensure-gitleaks.py`, and `scripts/strict-gitleaks-scan.py`.
4. If the sibling is missing, stop. Do not copy a policy tree into this skill, do not use a source-checkout path, and do not run `ccc index`.

Follow the sibling skill for the exact commands. The sequence is settings `--check` or one sync that will materialize a drifted block, filename-only preflight, `ensure-gitleaks.py check`, `ensure` only when the managed binary is missing, `check` again, then strict `scan` and strict `check`. Never chain `ccc init && ccc index`. Missing only; invalid blocks. A symlink, symlinked ancestor, non-executable file, wrong hash, wrong version, permission failure, or unsupported platform is not repaired. Publish does not replace a destination that appears before the verified file is linked into place.

## Guidance to write

Tell the target repo to:

- Prefer `cocoindex-code` MCP `search` for broad exploration and `ccc search` when MCP is unavailable. Use `rg` for exact text and AST tools for syntax-shaped questions.
- Treat `.cocoindex_code/settings.yml` as the portable boundary. Materialize the managed security and noise blocks while preserving unrelated settings. Do not assume a wrapper, hook, installed patch, or project-external matcher.
- Inspect filenames and settings without opening suspected secret contents before init, index, or refresh.
- Keep filename-only preflight explicit and non-equivalent to strict content scanning.
- Run strict mode on post-settings/index-candidate regular files. The helper applies synchronized `exclude_patterns` with Git `check-ignore --no-index` and fails closed when that match is unusable.
- Keep `.env.example`, `.env.sample`, and `.env.template` eligible for strict content scanning and indexing unless an unrelated project exclude matches them. Real dotenv files stay denied by path.
- A local embedding backend does not make unintended secret reads acceptable. After an exclusion change, stale indexes must be reset or safely rebuilt.
- Install the pinned Gitleaks `v8.30.1` binary through the `ccc` helper only when that managed path is missing. Invalid state blocks. Then require a fresh strict receipt. Never silently downgrade to filename-only.

## Boundaries

- Do not install CocoIndex, an MCP server, or a second copy of the policy scripts.
- Do not download Gitleaks except by the sibling `ensure-gitleaks.py ensure` action, and only when the managed path is missing. Invalid state blocks.
- Do not read suspected secret contents during filename-only work.
- Do not rewrite the target repo's whole docs family.
- Do not scan history or follow candidate symlinks.
- Stay inside the target project and the two installed skills.

## Output

Report changed files, the sibling `ccc` path used, whether settings sync and the strict receipt succeeded, the checks you ran, and any scanner or platform limit. Filename-only output is not a strict receipt.
