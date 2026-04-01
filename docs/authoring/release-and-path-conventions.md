# Release and Path Conventions

This note is for maintainers changing packaged skills, command wrappers, bundle metadata, or installer behavior.

Keep it short in practice: update the repo-first source files, keep version and tag references aligned, and treat repo-root resolution as a shared convention rather than a one-off fix.

## Canonical package sources

`mahiro-skills` packages directly from the repo tree.

- `skills/<name>/...` is the canonical source for packaged skill behavior.
- `commands/<name>.md` is the canonical source for non-Gemini slash-command wrappers.
- `commands-gemini/mh-<name>.toml` is the canonical source for native Gemini custom commands.
- `.claude-plugin/marketplace.json` is the bundle manifest used for default bundle discovery.
- `template/` is an authoring scaffold, not an installable item.

If you change packaged behavior, change the repo source first. Do not treat installed copies as the source of truth.

## Version and release alignment

When you publish a new repo release, keep these surfaces aligned:

1. `package.json` version
2. install examples in `README.md`
3. versioned examples and usage text in `install.sh`
4. the git tag name, using the same `v<version>` shape as the README examples
5. the GitHub release object, if you publish one

The release is only correct when branch state, tag target, and published release all point at the intended commit.

## Inventory update rules

When you add, rename, or remove packaged assets, update the inventory surfaces in the same pass.

### If you change a skill

- Update `skills/<name>/...`
- Add or remove the matching command source in `commands/` or `commands-gemini/` if that skill should ship with an agent command entrypoint
- Update `.claude-plugin/marketplace.json` if bundle membership changed
- Update `README.md` lists if the public inventory changed

### If you change a command source only

- Update `commands/<name>.md` for non-Gemini wrappers or `commands-gemini/mh-<name>.toml` for Gemini native commands
- Confirm the command is still represented correctly in `.claude-plugin/marketplace.json` when bundle output should include it
- Update `README.md` if the included command set changed

### If you change bundle behavior

- Update `.claude-plugin/marketplace.json`
- Check `src/repo.ts` and `src/plan.ts`, because default bundle resolution and fallback behavior depend on that manifest
- Update tests if bundle resolution expectations changed

Default bundle selection is order-sensitive: the first bundle in `.claude-plugin/marketplace.json` becomes the default install target.

If the manifest is missing or unreadable, planning falls back to all packaged skills plus supported commands instead of hard-failing. Treat manifest edits as an operationally important surface.

## Path conventions

### Repo root for skill-local state

If a skill reads or writes local `.agent-state` data, do not anchor it to raw cwd.

Use this pattern:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
```

Use the same rule in skill docs, templates, and examples so the convention stays portable across target repos.

### Repo root for installer and CLI code

- `MAHIRO_SKILLS_REPO_ROOT` selects the checkout used as the package source
- `MAHIRO_SKILLS_CWD` lets tests and root-resolving commands override cwd safely
- local adapter roots resolve from `MAHIRO_SKILLS_CWD` or `process.cwd()`, into project-local directories like `.opencode`, `.claude`, `.cursor`, and `.gemini`

If you change path behavior, check `install.sh`, `src/repo.ts`, `src/adapters.ts`, `src/plan.ts`, and the related tests together.

## Before you release

- Run `bun test`
- Run `bunx tsc --noEmit`
- Confirm `README.md` examples reference the intended version tag
- Confirm `install.sh` usage examples and defaults still match the intended release story
- Confirm `.claude-plugin/marketplace.json` still matches the packaged bundle you expect
- Confirm path-sensitive docs and templates still use repo-root-first `.agent-state` guidance where needed
- Confirm the release tag and release object both target the intended commit
