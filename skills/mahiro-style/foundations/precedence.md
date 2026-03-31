# Precedence

## Intent

This page defines the exact rule order for `/mahiro-style`.

`mahiro-style` is a hybrid doctrine. It helps code feel like Mahiro, but it yields to repo-local rules first. Follow `AGENTS.md`, then other repo-local instruction files such as `CLAUDE.md`, then established repo patterns, and only then apply Mahiro fallback doctrine.

## Precedence Order

1. `AGENTS.md`
2. Other repo-local instruction files such as `CLAUDE.md`
3. Established repo patterns
4. Mahiro fallback doctrine

## Non-negotiable

- `AGENTS.md` is the highest-priority local doctrine file.
- Other repo-local instruction files can clarify or narrow local behavior, but they cannot overrule an explicit `AGENTS.md` rule.
- Established repo patterns matter when local docs are absent or partial.
- Mahiro fallback doctrine fills gaps. It does not erase explicit local rules or strong repeated repo patterns.
- When sources conflict, explicit local doctrine beats inferred patterns, and stable repo patterns beat fallback taste.

## Preference

- Resolve conflicts by walking the order top to bottom, without skipping levels.
- Prefer repeated active-code patterns over isolated examples or migration leftovers.
- Prefer explicit local doctrine over active-code snapshots when the repo is mid-migration or applying a rule unevenly.
- Prefer one winning rule over compromise blends between conflicting layers.
- Prefer topic-specific local rules over broad local philosophy statements.

## Contextual

Use the same winner order in every repo, but let the local evidence change the outcome.

- In a monorepo app, explicit `AGENTS.md` rules about service classes, section comments, Lingui macros, and state ownership win before any fallback preference.
- In a responsibility-first single app, file structure, named export conventions, and route-file patterns in `AGENTS.md` beat fallback doctrine even when the fallback would often shape the code differently elsewhere.
- In a lean route-first app, the local rule that quality checks and formatter posture are part of done-ness wins before cross-repo taste.
- In any repo where `AGENTS.md` explicitly defines component section order, that explicit doc wins over a partial active-code snapshot, even if the migration is still uneven.

## Examples

- `AGENTS.md` says route files stay thin. A lower local file suggests thicker route logic. The winner is `AGENTS.md`.
- `AGENTS.md` is silent on exports, but `CLAUDE.md` or another repo-local instruction says named exports. The repo-local instruction wins.
- Local docs are silent, but the repo repeatedly keeps query hooks near domain services inside feature folders. The repeated repo pattern wins.
- Local docs require translation-safe copy but do not define the extracted config shape. The local boundary stays fixed, and Mahiro fallback doctrine fills the remaining detail.

## Anti-Examples

- Treating `AGENTS.md` as just a suggestion.
- Jumping straight from a vague local gap to Mahiro fallback doctrine without checking repeated repo patterns.
- Treating an in-progress codebase snapshot as stronger than an explicit local doctrine rule just because the migration is incomplete.
- Mixing two conflicting layers into a compromise shape for new code.
- Using one exceptional file as proof of a repo-wide rule.
