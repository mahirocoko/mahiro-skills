# Git Commit Guide

This guide should reflect the repo's enforced commit rules if they exist. If the repo has no enforcement and no usable git history, keep the guidance conservative and say so explicitly.

## Commit Message Format

```text
[repo-faithful commit format]
```

Examples from current history:

- `[real example 1]`
- `[real example 2]`
- `[real example 3]`

If there is no `.git` history in the current workspace snapshot, replace the examples block with a short note that this page gives a suggested local baseline rather than a history-derived style.

## Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **refactor**: Code restructuring without feature change
- **test**: Test changes
- **build**: Build or tooling changes
- **chore**: Maintenance changes

## Subject Line Rules

- Keep the subject concise
- Use present tense
- Prefer imperative mood
- Do not end with a period

Add length limits only if the repo enforces or consistently follows them.

## Emoji Usage

[Document emoji posture here if the repo uses it. Remove this section if not.]

Do not invent emoji requirements for repos that do not show them in history or hooks.

## Valid Examples

```bash
[repo-faithful commit examples]
```

If the repo lacks history, keep examples generic and label them as recommended examples, not observed examples.

## Body and Footer

Use the body when you need to explain why the change was made.

If the repo has issue-linking, footer, or breaking-change conventions, document them here. Otherwise keep this section short.

## Checks Before Commit

- `[verified lint command]`
- `[verified typecheck command if available]`
- `[verified test command if available]`
- `[verified build command if this repo expects it before release or risky changes]`

## Tips for Good Commits

1. **Atomic commits**: One logical change per commit
2. **Keep docs commits separate** when practical
3. **Align with recent history or enforced rules** so git log stays easy to scan
4. **Avoid mixing unrelated fixes** in the same commit

## Important Note

If the repo does not yet enforce commit formatting, say that clearly:

- this guide reflects a recommended local baseline
- if the project later adds commitlint or hook enforcement, update this guide to match the enforced rules
