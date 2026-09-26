# AGENTS.md

## Source of Truth

- `skills/<name>/...` is the canonical source for packaged skill behavior.
- `commands/<name>.md` is the command-wrapper source. Agy does not copy wrappers; it derives `/mh-<name>` from transformed Agent Skill frontmatter.
- `.claude-plugin/marketplace.json` defines default bundle membership.
- Installed copies are debugging evidence only. Do not edit or cite them as canonical authoring sources when the repo source exists.
- `.agent-state/` is local session and memory output. Do not treat it as packaged skill source unless the human explicitly asks.

## Verification and Knowledge Freshness

- Do not trust the human's claim by default. Treat it as a hypothesis to verify against files, tests, docs, git history, dependency versions, current upstream sources, or external references when relevant.
- Do not trust your own remembered knowledge by default. If a claim affects code, release, architecture, documentation truth, security, or product behavior, search for current evidence before acting.
- Treat claims about `latest`, `current`, `modern`, `recommended`, `standard`, `best practice`, new APIs, generated conventions, framework defaults, or deprecations as verification triggers.
- Never assume remembered knowledge is current when the topic may have changed since training or since the last time this repo was touched.
- For dependency-specific work, inspect the repo's declared or installed versions first, then inspect local usage and generated files for the pattern already in force.
- Check official docs or source for the relevant version when the answer depends on current package, framework, CLI, SDK, external-service, browser, platform, protocol, language-feature, generated-convention, or public-standard behavior.
- If local repo usage and upstream docs disagree, prefer local evidence for compatibility, call out the mismatch, and do not silently force a remembered pattern.
- Do not force older patterns onto repos that already use newer package versions, newer generated conventions, or newer documented APIs.
- Verification does not mean always choosing the newest pattern; choose the pattern that matches the target repo's versions, generated files, migration state, and compatibility constraints.
- This applies beyond code: product facts, pricing, legal/compliance assumptions, infrastructure behavior, security guidance, public standards, and third-party service behavior also require current evidence when they affect decisions.
- Separate exact search coverage from semantic coverage. A recursive keyword scan proves absence of named strings, not absence of every possible hidden assumption.
- If evidence is missing, say so directly and soften the wording instead of inventing certainty.

## Skill Doctrine Rules

- Do not invent architecture conventions unsupported by local repo evidence.
- Do not preserve ghost conventions as negative examples; named bad examples can become doctrine by repetition.
- Git history is the provenance owner for superseded packaged guidance. Do not keep deprecated compatibility shims, stale snapshot appendices, or old command/model catalogs inside the active skill bundle merely to preserve history.
- When volatile runtime facts change, replace the canonical current owner and remove the superseded wording from active `SKILL.md`, README, command wrappers, tests, and examples. Do not append a new “current” list beside the old one.
- Dated evidence may remain only when it still explains a load-bearing compatibility boundary. Label it as non-authoritative evidence and require a fresh capability check before reuse.
- Prefer conditional wording over concrete helper, folder, framework, or section-label names unless the target repo proves them.
- `mahiro-docs-rules-init` must generate repo-reality-first docs. Mahiro preference can appear only as preferred direction, fallback, or contrast.
- `mahiro-style` is fallback taste doctrine, not a replacement for target repo evidence.
- Keep examples repo-neutral. Do not leak evidence repo names into generated skill templates.

## Codebase Search

- Prefer `cocoindex-code` MCP `search` for broad semantic exploration when it is locally available; use `ccc search` when the MCP tool is unavailable.
- The portable enforcement boundary is the current project's `.cocoindex_code/settings.yml`. Do not assume any project-external matcher, wrapper, installed patch, or Mahiro hook.
- Before `ccc init`, `ccc index`, `ccc search --refresh`, or equivalent MCP indexing, inspect candidate filenames and project settings without opening suspected secret contents. Never chain `ccc init && ccc index` before this preflight.
- Resolve the installed `ccc` skill directory and run `python3 <ccc-skill-dir>/scripts/sync-project-excludes.py --project-root "$PWD" --check`; run it without `--check` to materialize a changed managed block atomically.
- Run `python3 <ccc-skill-dir>/scripts/preflight.py --project-root "$PWD"` before broad indexing. It is filename-only and never replaces strict content scanning.
- Stop if settings are missing, malformed, symlinked, drifted, or if an unsafe candidate path cannot be classified. The packaged helpers fail closed on all candidate symlinks (file or directory, tracked or untracked, intermediate or final) in both Git and non-Git fallback paths; candidate symlinks are never followed or silently omitted from helper scan scope. This is a cooperative helper/Letta-Mod boundary, not an upstream sandbox: direct unguarded `ccc` invocation can bypass it. Managed project settings enforce a finite 5 MiB `max_file_size` cap (preserving stricter positive existing values, lowering absent or larger values to 5 MiB, and failing closed on non-positive or malformed values) and reject project `chunkers` unless the key is omitted or uses an upstream-compatible explicit empty list, map, or string. Structured JSON/YAML/YML/TOML/XML/TXT and durable `.agent-state` records remain eligible. Explicit dotenv templates (`.env.example`, `.env.sample`, and `.env.template`) are filename-allowed, strict-content-scanned, and explicitly included for indexing unless an unrelated project exclude blocks them; real dotenv variants remain denied by path.
- A local embedding backend does not make unintended secret reads acceptable; treat local embeddings as transport, not read authorization. After a policy change, discard or safely rebuild stale indexes before trusting results.
- Semantic search is a token-saving first pass; read only returned files or ranges for final source verification. Use `rg` for exact strings/symbols/filenames and AST tools for syntax-shaped search.
- `ccc search` defaults to the current working directory; run it from the project root or pass `--path` for a different scope.
- After meaningful code changes, refresh or re-index only after the current settings and filename-only preflight pass.

## Strict Security Scan

- Strict mode is explicit and requires Gitleaks `v8.30.1` plus an approved executable SHA-256; it never silently downgrades to filename-only mode.
- Before strict scan or check, run `python3 <ccc-skill-dir>/scripts/ensure-gitleaks.py check`. Run `ensure` only when `~/.local/share/mahiro-ccc/gitleaks/8.30.1/gitleaks` is missing (`ENOENT`), then `check` again. Missing only; invalid blocks. Publish links the verified file only while the destination is still absent; a destination that appears fails closed with `destination-appeared` and is left unchanged, even when that file is valid. A later check may pass. A symlink, symlinked ancestor, non-regular file, non-executable file, unsafe path, wrong hash, unreadable file, wrong metadata, permission failure, malformed state, or unsupported platform fails closed without network and without replacement. A symlinked ancestor fails closed before classification, including when the final file is a valid pinned executable. Stop when check still fails. Do not retry, substitute another scanner, execute a downloaded binary to prove integrity, or downgrade to filename-only.
- Pass that managed absolute path and the platform binary SHA-256 from `skills/ccc/SKILL.md` to `strict-gitleaks-scan.py`. Use the helper's reported hash only when it matches that table.
- The packaged helper starts from tracked and untracked nonignored regular Git candidates, subtracts tracked entries that Git confirms are already deleted from the worktree, then applies the synchronized project `exclude_patterns` with a bounded Git `check-ignore --no-index` pass and the effective project `max_file_size` before staging the post-settings/index-candidate regular files. Git exit `1` is accepted only for a complete, ordered `--non-matching` result where no candidate matched an exclude; every malformed or other failing result remains blocked. Candidate disappearance outside Git's explicit deleted-path view still fails closed. After scanning, the helper recollects and rehashes the full candidate scope before issuing a receipt, so new files and deleted-path reappearance also block. The helper never scans history, fails closed on all candidate symlinks (never following or silently omitting them), and emits metadata-only reports/receipts.
- Findings, scanner errors, missing scanner, stale receipt, and rule/policy/settings/source mismatch fail closed. Filename-only output is labeled non-equivalent.

## Release Checklist

Before a patch release, keep these surfaces aligned:

- `package.json` version
- versioned install examples in `README.md`
- version usage text in `install.sh`
- tests that assert version text
- git tag in `v<version>` format
- GitHub release object

Run before publishing:

```bash
rtk bun test
rtk bunx tsc --noEmit
git diff --check
```

The release is correct only when the branch state, tag target, and GitHub release all point at the intended commit.

## Working Style

- Prefer small, evidence-backed documentation changes over broad template rewrites.
- When confidence matters, produce the checked scope and exact search patterns rather than asking the human to trust a summary.
- Do not commit unless the human explicitly asks.
