# Verification and Knowledge Freshness

This guideline prevents the agent from accepting claims too quickly or forcing stale remembered patterns onto current repos.

## Core Rule

Treat every meaningful claim as a hypothesis until it is checked.

- Do not trust the human's claim by default.
- Do not trust the agent's remembered knowledge by default.
- Verify against files, tests, docs, git history, dependency versions, current upstream sources, or external references when the claim affects implementation, release, architecture, documentation truth, security, or product behavior.
- If evidence is missing, say so directly and use softer wording instead of inventing certainty.

## Knowledge Freshness Triggers

Verify before answering or implementing when the task includes claims about:

- `latest`, `current`, `modern`, `recommended`, `standard`, or `best practice`
- new APIs, generated conventions, framework defaults, or deprecations
- package, framework, CLI, SDK, or external-service behavior
- browser/platform behavior, public standards, protocols, or language features
- security guidance, infrastructure behavior, pricing, product facts, legal/compliance assumptions, or third-party service behavior

## Dependency-Specific Work

When working with a dependency:

1. Inspect the target repo's declared or installed versions first.
2. Inspect local repo usage and generated files for the pattern already in force.
3. Check official docs or source for that version when the answer depends on current behavior.
4. If local usage and upstream docs disagree, prefer local evidence for compatibility and call out the mismatch.
5. Do not force older remembered patterns onto repos that already use newer versions, newer generated conventions, or newer documented APIs.
6. Verification does not mean always choosing the newest pattern; choose the pattern that matches the target repo's versions, generated files, migration state, and compatibility constraints.

## Search Coverage Honesty

Be precise about what was proven.

- A recursive keyword scan proves absence of named strings, not absence of every semantic assumption.
- A file-by-file audit proves the checked files and criteria, not future correctness.
- Passing tests proves the tested behavior, not every behavior.
- When confidence matters, report the exact scope, search patterns, commands, and remaining limitations.

## Documentation and Skill Templates

For this repo's skill docs and templates:

- Do not invent architecture conventions unsupported by target-repo evidence.
- Do not preserve ghost conventions as negative examples; named bad examples can become doctrine by repetition.
- Prefer conditional wording over concrete helper, folder, framework, package, or section-label names unless the target repo proves them.
- Keep examples repo-neutral. Do not leak evidence repo names into generated skill templates.

## Practical Default

If a claim affects real work and may be stale, current evidence wins over confidence.
