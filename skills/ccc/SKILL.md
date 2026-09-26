---
name: ccc
description: Day-to-day CocoIndex Code search and index lifecycle with portable project settings, filename-only preflight, one pinned Gitleaks self-heal, and strict receipt checks. Use when searching a codebase, refreshing an index, running ccc or cocoindex-code, or gating index and refresh work.
user-invocable: true
---

# ccc - Semantic Code Search and Indexing

`ccc` is the CLI for CocoIndex Code. This skill owns the day-to-day lifecycle: search, index freshness, project settings, filename-only preflight, the pinned Gitleaks binary, and the strict receipt. Do not fork or patch upstream `cocoindex-code`. The project file `.cocoindex_code/settings.yml` is the portable enforcement boundary.

The agent runs this lifecycle. Do not ask the human to initialize, sync, scan, or index when the commands below can do it.

## Search

Use semantic search for a concept, not for a literal symbol:

```bash
ccc search database connection pooling
ccc search --lang python --lang markdown database schema
ccc search --path 'src/api/*' request validation
ccc search --offset 5 --limit 5 database schema
```

`ccc search` defaults to the current working directory. Run it from the project root, or pass `--path`. Read only the returned file and line range. Use `rg` for exact strings and AST tools for syntax-shaped questions.

Prefer the `cocoindex-code` MCP `search` tool for broad exploration when it is available. Use `ccc search` when it is not. Semantic results are locations, not permission to read secrets.

## Freshness and init

Re-index at the start of a session and after meaningful code changes. Consecutive searches do not need a new index when nothing changed.

If `ccc search` or `ccc index` says the project is not initialized, run `ccc init` from the Git root, then the gates below, then `ccc doctor`, then `ccc index`. Never chain `ccc init && ccc index` before those gates. If `ccc` itself is missing, stop and use [management.md](references/management.md). Embedding and exclude settings live in [settings.md](references/settings.md).

Switching embedding models changes vector dimensions. Run `ccc reset && ccc index` only after the gates below pass.

## Safe preflight

Before `ccc init`, `ccc index`, `ccc search --refresh`, `ccc grep`, or MCP indexing:

1. Work from the Git project root. Inspect filenames, `.gitignore`, and `.cocoindex_code/settings.yml` without opening suspected secret contents. Do not open credential, service-account, dotenv, key, token-store, or other suspected secret files.
2. Run `python3 <skill-dir>/scripts/sync-project-excludes.py --project-root "$PWD" --check`. If it reports drift, run it once without `--check` to materialize the managed block, inspect the settings diff, then check again. `--check` never writes.
3. Run `python3 <skill-dir>/scripts/preflight.py --project-root "$PWD" --check-settings`. This output is filename-only and `equivalent_to_strict: false`.

Stop when settings are missing, malformed, symlinked, or drifted, or when a candidate path cannot be classified. The helpers fail closed on every candidate symlink. They are a cooperative gate, not an upstream sandbox: a direct unguarded `ccc` command can bypass them.

The sync helper owns only its marked block. Content includes admit only `.env.example`, `.env.sample`, and `.env.template`. Those templates stay eligible for strict content scanning and for indexing unless an unrelated project exclude matches them. Real dotenv variants stay denied by path. Security denies and noise excludes stay separate. Local policy may only add denies. Managed settings keep a finite 5 MiB `max_file_size` cap and reject project `chunkers` unless the key is omitted or uses an upstream-compatible explicit empty list, map, or string.

Candidate selection starts from tracked and untracked nonignored regular files, subtracts tracked paths Git already shows as deleted, then applies `exclude_patterns` with Git `check-ignore --no-index`. Only the resulting post-settings/index-candidate regular files are staged. Structured JSON, YAML/YML, TOML, XML, TXT, and durable `.agent-state` records stay eligible unless an unrelated project exclude matches them.

A local embedding backend does not make unintended secret reads acceptable. After a policy change, reset or safely rebuild stale indexes before trusting semantic results.

## Pinned Gitleaks self-heal

Strict mode needs official Gitleaks `v8.30.1` at:

`~/.local/share/mahiro-ccc/gitleaks/8.30.1/gitleaks`

The helper accepts only these targets. `x64` in the archive name is the literal archive token for amd64. Any other OS or CPU fails closed. Do not pass another URL or hash.

| Target | Archive SHA-256 | Binary SHA-256 |
| --- | --- | --- |
| `darwin_arm64` | `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5` | `ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f` |
| `darwin_x64` | `dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709` | `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291` |
| `linux_arm64` | `e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080` | `00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b` |
| `linux_x64` | `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` | `88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509` |

Archives come only from `https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_<target>.tar.gz`.

Missing only; invalid blocks:

```bash
python3 <skill-dir>/scripts/ensure-gitleaks.py check --json
python3 <skill-dir>/scripts/ensure-gitleaks.py ensure --json
python3 <skill-dir>/scripts/ensure-gitleaks.py check --json
```

`check` never downloads and never runs the binary. It rejects a symlinked ancestor before it classifies the final file, including a valid pinned executable. `ensure` may download and install only when that path is genuinely absent (`ENOENT`). Publish links the verified temporary file only while the destination is still absent. If any destination appears, the helper fails closed with `destination-appeared`, leaves that file's bytes and mode unchanged, and does not accept it. A later check may pass. An existing symlink, symlinked ancestor, non-regular file, non-executable file, unsafe path, wrong hash, unreadable file, wrong metadata, or other invalid state blocks without network and without replacement. Do not retry, call another downloader, use a `PATH` binary, or switch the scan to filename-only.

Use the JSON `target` and `binary_sha256` only when both match the row above. Pinned archive and binary hashes are the integrity authority. Do not execute the downloaded file to establish integrity, and do not invent a scan or receipt.

## Strict receipt

After preflight, and after source, policy, settings, scanner, or rules change:

```bash
python3 <skill-dir>/scripts/strict-gitleaks-scan.py scan \
  --project-root "$PWD" \
  --gitleaks "$HOME/.local/share/mahiro-ccc/gitleaks/8.30.1/gitleaks" \
  --expected-binary-sha256 <platform-binary-sha256>
python3 <skill-dir>/scripts/strict-gitleaks-scan.py check \
  --project-root "$PWD" \
  --gitleaks "$HOME/.local/share/mahiro-ccc/gitleaks/8.30.1/gitleaks" \
  --expected-binary-sha256 <platform-binary-sha256>
```

Index or read candidates only when `check` prints `strict receipt is fresh`. Findings, scanner errors, a missing scanner, a hash or version mismatch, timeout, a stale receipt, and rule, policy, settings, or source drift all block. Filename-only mode is an explicit separate action. It is labeled non-equivalent and does not create a strict clean receipt.

The scanner stages post-settings/index-candidate regular files, emits metadata only (path, line, rule ID, fingerprint), and does not scan history. It refuses symlinked receipts and symlinked candidates.

## Troubleshooting

`ccc doctor` checks settings, the daemon, a test embedding, and project matching. `ccc status` shows index progress. `ccc daemon restart` recovers a stuck daemon. `ccc reset` drops the index and keeps settings; `ccc reset --all` also removes settings. Details and install commands are in [management.md](references/management.md).
