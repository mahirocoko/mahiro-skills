---
name: cocoindex-rules-init
description: Project-local CocoIndex Code rule bootstrapper with a portable settings boundary, filename-only credential preflight, and an explicit pinned Gitleaks strict-scan contract.
user-invocable: true
---

# /cocoindex-rules-init - Bootstrap CocoIndex Rules

Create or refine repo-local `AGENTS.md` guidance for semantic search without
turning source inspection into an implicit secret-read permission. The V2
package also supplies portable project settings policy, a filename-only
preflight, settings synchronization, and an explicit strict scanner contract.
The project settings file is the enforcement boundary for this package.

This skill does not install CocoIndex or Gitleaks, patch upstream or installed
packages, add a wrapper around the target search tool, assume a Mahiro hook, or
make claims about external repository behavior.

## When to Use

- A repo needs `AGENTS.md` guidance for semantic code search and index freshness.
- A repo has `.cocoindex_code/settings.yml` and needs a visible portable deny/noise policy.
- A filename-only preflight is needed before broad search or refresh.
- A strict local Gitleaks V8.30.1 scan is required and the scanner is already available.
- A repo needs a conservative, repo-local search workflow that survives new agents.

## Scope and Boundaries

### In scope

- Inspect and surgically update repo-local `AGENTS.md`.
- Keep semantic search, exact search, and AST search responsibilities distinct.
- Materialize the V2 portable policy into the target project's `.cocoindex_code/settings.yml`.
- Derive exact sensitive paths from filenames and Git metadata without opening candidate contents.
- Run an explicit filename-only preflight or an explicit strict Gitleaks scan.
- Preserve unrelated settings and fail closed on missing, malformed, symlinked, or unsafe inputs.

### Out of scope

- Installing or downloading `ccc`, CocoIndex Code, Gitleaks, or an MCP server.
- Editing global agent settings, installed CocoIndex code, upstream/site-packages code, hooks, or another checkout.
- Reading suspected credential contents during filename-only preflight.
- Rewriting a repo's whole docs family.
- History scans, external symlink traversal, external repository comparisons, or release work.

## V2 Resource Map

- `resources/portable-credential-deny-baseline.txt` - security-owned portable path denies.
- `resources/portable-noise-performance-baseline.txt` - separate noise/performance excludes.
- `resources/gitleaks-config.toml` - reviewed explicit Gitleaks configuration.
- `resources/gitleaks-metadata-report.tmpl` - metadata-only scanner report template.
- `scripts/security_policy.py` - stdlib policy, filename, settings, and metadata helpers.
- `scripts/preflight.py` - explicit filename-only preflight.
- `scripts/sync-project-excludes.py` - atomic/idempotent settings materialization and `--check`.
- `scripts/strict-gitleaks-scan.py` - strict scan, filename-only mode, and receipt validation.

## Project Settings Boundary

Use `sync-project-excludes.py` to materialize the current security and noise
policy into the target project before search or refresh. The target project's
`.cocoindex_code/settings.yml` is the portable enforcement
boundary. The managed block has separate security and noise ownership:

- Credential/path denies come from the security baseline, derived exact
  filename-only paths, and optional local deny-only policy.
- Noise/performance excludes come only from the noise baseline.
- Local policy can add denies; it cannot remove, allow, or weaken a baseline.
- Unrelated settings and unrelated exclude entries are preserved.
- The managed block is written atomically and repeated synchronization is
  idempotent.

The policy never blanket-denies `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, or
`.txt`. The exact filename `.env.example` is not a filename deny and is routed to
content scanning unless an unrelated project `exclude_patterns` entry
explicitly matches it. `.env.sample`, `.env.template`, real `.env` variants,
and credential/key/provider paths are not auto-allowed. A filename such as
`token-guide.md` is not denied merely because it contains a security word.

Synchronize before indexing or refresh:

```bash
python3 <skill-dir>/scripts/sync-project-excludes.py --project-root "$PWD"
python3 <skill-dir>/scripts/sync-project-excludes.py --project-root "$PWD" --check
python3 <skill-dir>/scripts/preflight.py --project-root "$PWD"
```

`--check` never writes. A missing or malformed settings file, a symlinked input,
an unsafe candidate path, or an unsafe local policy is a blocking error.

Strict candidate derivation is separate from filename-only classification. The
helper first obtains tracked plus untracked nonignored regular Git candidates,
then feeds the synchronized `exclude_patterns` to a bounded Git
`check-ignore --no-index` pass in an isolated temporary Git context. It does
not approximate patterns with `pathlib` or `fnmatch`; unsupported settings
syntax (including negating exclude entries) or a Git/check-ignore failure
fails closed rather than widening the scan.

## Search Workflow

1. Read repo-local instructions and inspect filenames plus effective project
   settings before broad search or refresh. Do not open suspected credential,
   service-account, dotenv, key, provider, or token-store contents for this
   decision. Never chain `ccc init && ccc index` before this preflight.
2. Run the settings sync and filename-only preflight. Stop if it cannot prove
   the path boundary from names and metadata alone.
3. Prefer `cocoindex-code` MCP `search` for broad semantic exploration when it
   is locally available and the project boundary is current.
4. If the MCP tool is unavailable, use `ccc search`; refresh only after the
   filename-only preflight and settings `--check` pass.
5. Use `rg` for exact text, symbols, filenames, and literal-presence checks;
   use AST tools for syntax-shaped questions.
6. Treat semantic results as candidate locations. Read only the returned file
   or range needed for source verification.
7. After a policy change, discard or safely rebuild stale indexes before relying
   on semantic results.

Semantic search is a token-saving locator, not permission to read secrets. A local embedding backend does not make unintended secret reads acceptable; a transport choice does not change source-read authorization.
Known files and tiny lookups may go directly to the file-read or exact-search
tool. `ccc search` uses the current working directory by default; run it from
the project root or pass `--path` for a different scope.

Useful triggers include `search the codebase`, `find where X is implemented`,
`how does this repo work`, `ดู repo หน่อย`, `หาโค้ดส่วนนี้`, and `สรุปไฟล์นี้`.

## Filename-Only Preflight

`preflight.py` may inspect only Git filename metadata, directory entries, policy
resources, and project settings when `--check-settings` is requested. It must
not hash, open, parse, or emit candidate source bytes. It reports the
pre-settings Git candidate count/classification counts, derived sensitive paths,
and the `.env.example` content-scan route, and always labels itself
`filename-only` and `equivalent_to_strict: false`.

The preflight scope is conservative: regular files only, no directory symlink
following, no parent traversal, and no guessed substring rule for ordinary
document names. If a candidate is symlinked or unsafe, it fails closed.

## Strict Scanner Contract

Strict mode is deliberate content scanning and is never a silent fallback from
filename-only mode. It requires an already available Gitleaks `v8.30.1` binary:

- License: MIT.
- Official darwin-arm64 archive SHA-256:
  `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`.
- Signed provenance is not established by this package.
- The binary is not bundled, installed, downloaded, or trusted by name alone;
  the helper version-checks the executable before scanning.

The strict helper uses the reviewed config (`minVersion = "v8.30.1"`, pinned
`useDefault = true` rules, and current `[[allowlists]]` syntax) and a
metadata-only template. It invokes `gitleaks dir` with the scan root as the
final positional target (the V8.30.1 `dir --help` contract has no source flag),
`--exit-code 3`, `--redact=100`, `--log-level error`, `--no-banner`, a
wrapper-enforced timeout, `--max-target-megabytes 10`,
`--max-decode-depth 0`, `--max-archive-depth 0`, a controlled empty ignore
path, and `--ignore-gitleaks-allow`. It accepts only exit `0` with an empty
metadata report or exit `3` with a nonempty report; exit `1` and every other or
mismatched result is a scanner error. It does not pass verbose output.
Scanner stdout/stderr is discarded; sanitized reports never contain `Match`,
`Secret`, raw lines, or scanner diagnostics.

The strict scope starts with tracked and untracked nonignored regular Git
candidates, then applies the actual synchronized project `exclude_patterns`
with Git-compatible ignore semantics. Only the resulting post-settings/
index-candidate regular files are staged. Managed security/noise patterns,
derived exact paths, optional add-only local policy, and unrelated preserved
project excludes all participate in this boundary; excluded paths are not
opened to prove they are excluded. The project
`.cocoindex_code/settings.yml` is itself bound by hash even when its directory
is excluded, while `.cocoindex_code/ccc-security/**` runtime outputs stay out
of source scope. `.env.example` remains eligible for strict content scanning
unless an unrelated project exclude explicitly matches it. The helper does
not scan history or follow external symlinks; final source-file symlinks are
skipped while intermediate path and control-file symlinks fail closed. A
mode-0700 temporary root contains mode-0600 copied snapshots, never hardlinks;
the staged snapshot and source scope are compared before a receipt is written.

The raw scanner template emits only path, line, and rule ID. The helper
canonicalizes the relative path and derives a stable SHA-256 fingerprint from
`relative_path + NUL + rule_id + NUL + line`. Reports and clean receipts expose
only path, line, rule ID, fingerprint, and nonsecret scan metadata. Receipt
freshness is bound to the project root, scanner version, approved scanner binary
SHA-256, reviewed config/template, policy, settings, allowlist, and current
source scope/content hashes. Strict scan/check requires
`--expected-binary-sha256`; every receipt records and enforces that approved
digest. Filename-only mode does not require a scanner hash.
Every scan attempt invalidates the previous receipt before work starts, so
scanner errors, timeout, missing scanner, malformed metadata, findings, stale
receipts, or rule/policy mismatch cannot leave an old clean receipt usable.

Governed allowlists are JSON entries with exactly `path`, `rule_id`, and
`fingerprint`. They contain no secret values. Target `.gitleaksignore` files
and `gitleaks:allow` comments are not an allowlist surface.

Examples:

```bash
python3 <skill-dir>/scripts/strict-gitleaks-scan.py scan \
  --project-root "$PWD" --gitleaks /path/to/gitleaks \
  --expected-binary-sha256 <64-hex-digest>
python3 <skill-dir>/scripts/strict-gitleaks-scan.py check \
  --project-root "$PWD" --gitleaks /path/to/gitleaks \
  --expected-binary-sha256 <64-hex-digest>
python3 <skill-dir>/scripts/strict-gitleaks-scan.py filename-only \
  --project-root "$PWD"
```

The `filename-only` action is explicit, labeled non-equivalent, and does not
produce a strict clean receipt.

## Hard Execution Limits

- Stay inside the target project and this packaged skill source.
- Use the repository's existing package-manager workflow; this repo uses Bun.
- Do not install dependencies or global tools.
- Do not stage, commit, push, tag, or release.
- Do not read suspected secret contents during filename-only work.
- Do not run indexing merely to test whether exclusions are safe.
- Do not claim a scanner is present unless version-check evidence exists.
- Stop when policy/settings or scanner provenance cannot be established.

## Output Contract

Before finishing, report:

1. Changed files and intent.
2. Local evidence used without opening suspected secret contents.
3. The final project-settings and scanner behavior.
4. Focused checks and exact outcomes.
5. Any unresolved scanner/runtime limitation.

## Validation / Self-check

- Confirm `.cocoindex_code/settings.yml` contains the current managed V2 block.
- Confirm structured extensions remain eligible and `.env.example` is not a deny pattern.
- Confirm `.env.sample` and `.env.template` are not auto-allowed.
- Confirm security and noise resources remain separate.
- Confirm sync preserves unrelated settings, is atomic/idempotent, and honors `--check`.
- Confirm malformed, missing, symlinked, and unsafe inputs fail closed.
- Confirm filename-only output is explicitly non-equivalent.
- Confirm strict invocation pins/version-checks Gitleaks and uses the reviewed
  metadata-only report contract without raw secret output.
- Confirm fresh receipts reject changed roots, rules, policy, settings, scope,
  content, or scanner version.
- Confirm no active wording relies on a project-external matcher, wrapper, hook,
  installed patch, or external comparison claim.
