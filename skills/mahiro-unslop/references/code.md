# Code lane

This lane is taste lint, not a second implementation doctrine. Inspect current
repo rules, dependency versions, nearby callers and established patterns first.
Then load `mahiro-style/SKILL.md` from the available skill root and select its
smallest relevant canonical lens. If unavailable, report the limitation; do not
reconstruct its doctrine from memory or make it a new install prerequisite.

## Audit before cleanup

Locate concrete unnecessary complexity, unclear names, repeated wrappers,
misplaced ownership or speculative abstractions in the requested diff. Explain
why each is a problem in this repo. An abstraction, defensive check or type is
not defective merely because AI often generates it. Keep framework requirements,
generated code, public APIs and local winners intact.

For authorized edits, prefer a small diff that preserves behavior, errors,
security checks, accessibility, state lifetime and i18n. Do not transplant folder
conventions or remove meaningful comments and documentation to look less AI-like.
Do not reopen product or visual decisions during a code-only review.

## Optional executable lint

Run executable anti-slop lint only when explicitly requested and repo-compatible.
First inspect the installed tool/version, supported language and rule behavior,
existing lint owner, and whether execution writes or auto-fixes. Use the existing
read-only invocation on bounded files; findings are hypotheses requiring context.

Do not install packages, mutate config, add dependencies, auto-fix or adopt a new
rule set automatically. If the requested tool is unavailable or incompatible,
report that and continue with the authorized manual review where useful.
Executable style rules are not universal architecture doctrine or proof of bugs.
No external linter is required by this skill.

## Check and report

Use the target repo's relevant tests, typecheck and native formatter for changed
code. Inspect consumers of changed contracts. Distinguish proven behavior from
source-only taste findings and unexecuted checks. Report the selected local owner,
`mahiro-style` lens, findings, changes and remaining risks. A clean diff may stay
unchanged; lint PASS does not prove runtime correctness or visual quality.
