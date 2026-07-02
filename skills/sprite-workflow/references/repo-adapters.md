# Repo adapter notes

## Traymori

- Keep Mori separate from Cat Samurai identity.
- Runtime assets should not import `qa/**` or `source/**` folders.
- Verify tray readability at 18-22px.
- Codex is normally extraction/QA/integration, not production Mori source-art authoring.

## Agent Halo

- Keep mascot/live activity tiny and companion-like.
- Verify compact sizes such as 40x30 and 32x24.
- Avoid generic dashboard imagery and preserve Notchcode/boring.notch taste.

## Otobun

- Keep product-owned brand assets under `assets/brand/` or repo-local agreed paths.
- Avoid cross-product references in user-facing assets.

## Generic repo

- Read `AGENTS.md`, docs, asset manifests, and runtime import globs first.
- Prefer `.agent-state/sprite-workflow/` for jobs unless the repo already has a stronger local convention.
- Promote only the runtime artifacts; leave source sheets, QA boards, and logs in local state unless the repo docs say otherwise.
