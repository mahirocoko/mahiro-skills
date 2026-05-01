# AGENTS.md

## Source of Truth

- `skills/<name>/...` is the canonical source for packaged skill behavior.
- `commands/<name>.md` and `commands-gemini/mh-<name>.toml` are command sources.
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
- This applies beyond code: product facts, pricing, legal/compliance assumptions, infrastructure behavior, security guidance, public standards, and third-party service behavior also require current evidence when they affect decisions.
- Separate exact search coverage from semantic coverage. A recursive keyword scan proves absence of named strings, not absence of every possible hidden assumption.
- If evidence is missing, say so directly and soften the wording instead of inventing certainty.

## Skill Doctrine Rules

- Do not invent architecture conventions unsupported by local repo evidence.
- Do not preserve ghost conventions as negative examples; named bad examples can become doctrine by repetition.
- Prefer conditional wording over concrete helper, folder, framework, or section-label names unless the target repo proves them.
- `mahiro-docs-rules-init` must generate repo-reality-first docs. Mahiro preference can appear only as preferred direction, fallback, or contrast.
- `mahiro-style` is fallback taste doctrine, not a replacement for target repo evidence.
- Keep examples repo-neutral. Do not leak evidence repo names into generated skill templates.

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
