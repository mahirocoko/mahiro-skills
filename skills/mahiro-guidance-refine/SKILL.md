---
name: mahiro-guidance-refine
description: Refine repo docs, AGENTS.md, and Mahiro-style guidance from session feedback. Use when the user corrects agent behavior, identifies preferred patterns, or asks to update rules from lessons learned.
---

# /mahiro-guidance-refine — Session Guidance Refinement

Convert user feedback from the current session into evidence-backed guidance proposals for repo docs, rules files, or Mahiro-style notes.

This skill is for moments like: “that is not my pattern,” “you missed what I wanted,” “write it this way next time,” “this does not match our code style,” or “capture this as a rule.”

## Use When

- The user corrects how the agent planned, wrote, reviewed, designed, or communicated.
- The user identifies a durable preference, repo convention, code-style expectation, workflow rule, or anti-pattern.
- A session reveals a repeatable mismatch between agent output and the user’s desired pattern.
- The user asks to update docs/rules/style guidance from lessons learned.
- A completed session needs targeted docs/rules maintenance, not a full docs bootstrap.

## Do Not Use When

- The repo has no rules/docs yet and needs initial bootstrap. Use `mahiro-docs-rules-init`.
- The task is pure code implementation or refactoring. Use normal implementation flow plus `mahiro-style` as a lens.
- The lesson is only transient context for this one task and should not become durable guidance.
- The user has not given enough evidence to distinguish durable preference from one-off correction.
- The requested update would edit files, commit, push, delete, or rewrite docs without explicit approval.

## Evidence Taxonomy

Classify each candidate lesson before proposing any docs/rules change:

| Evidence | Meaning | Default action |
| --- | --- | --- |
| **Direct User Feedback** | The user explicitly corrected behavior or stated a preference. | Strong candidate for proposal. |
| **Repo-Proven Pattern** | Existing files consistently show the pattern. | Strong candidate if cited with paths. |
| **Repeated Session Friction** | Same mismatch occurred multiple times or across sessions. | Candidate; cite examples. |
| **Inference** | Agent inferred preference without direct evidence. | Do not persist unless confirmed. |
| **Transient Context** | One-off task detail, temporary constraint, or mood/preference. | Keep in session notes only. |

## Durable vs Transient

Before writing or proposing anything, decide the destination:

1. **Do Not Persist** — no durable lesson; answer the user and move on.
2. **Session Note** — suitable for `/rrr` or `/forward`, but not repo rules.
3. **Project Proposal** — candidate update that needs human review.
4. **Repo Docs Patch** — approved targeted edit to `AGENTS.md`, docs, README, or repo-specific guidance.
5. **Global Style Candidate** — possible future change to `mahiro-style`, but only after explicit confirmation that it is not repo-specific.

Do not promote a single correction into global doctrine unless the user explicitly asks for global behavior.

## Scope Classifier

When a correction comes from work across multiple Mahiro repos, classify the scope before choosing a target:

- **Repo-local rule** — belongs in the target repo's `AGENTS.md`, docs, or project memory. Use when the evidence depends on that repo's package manager, framework, source locale, primitive library, service pattern, or folder layout.
- **Global Mahiro-style doctrine** — belongs in `mahiro-style` only when the user explicitly asks for cross-repo behavior or multiple repos show the same underlying preference despite different implementations.
- **Skill-specific procedure** — belongs in the owning skill when the lesson is about how to run the skill, not how to code the target repo. Example: `direct-cli` pane-first doctrine belongs in `direct-cli`, not a global style rule.
- **Session-only note** — belongs in `/rrr` or `/forward` when the fact helps continuity but should not become a rule.

Preserve the distinction between the **underlying preference** and the **repo-specific mechanism**. For example: "respect repo-local i18n source-locale" can be global; "use Lingui `msg` descriptors" is repo-local unless the target repo proves Lingui.

## Proposal Workflow

### Phase 1: Capture the correction

- Quote or paraphrase the user’s feedback precisely.
- Identify what the agent did wrong or what pattern was missing.
- Separate the immediate fix from the durable lesson.

### Phase 2: Inspect repo-local truth

- Read relevant `AGENTS.md`, `CLAUDE.md`, docs, README, style files, or neighboring code when the lesson concerns repo behavior.
- Prefer repo-local rules over Mahiro fallback doctrine.
- Check whether a similar lesson already exists in `mahiro-style`, the target skill, project memory, or repo docs before adding another rule.
- If repo evidence is weak, label it as weak instead of upgrading it to “Current Reality.”

### Phase 3: Classify and choose target

- Use the evidence taxonomy.
- Use the scope classifier to avoid turning a repo-specific mechanism into global doctrine.
- Choose one destination: do not persist, session note, project proposal, repo docs patch, or global style candidate.
- If target is ambiguous, ask one concise clarifying question.

### Phase 4: Draft proposal

Produce a proposed change before editing files. Include:

- **Lesson** — what should change in future behavior.
- **Evidence** — user quote, file path, or session event.
- **Target** — exact file or “session note only.”
- **Patch sketch** — concise wording to add/change.
- **Confidence** — high / medium / low.
- **Rollback note** — how to revert or narrow the guidance if it proves too broad.

If the proposal updates `mahiro-style`, explicitly state which part is global preference and which repo-specific examples must stay out of the wording.

### Phase 5: Approval and edit

- Ask for approval before editing `AGENTS.md`, `CLAUDE.md`, docs, README, `mahiro-style`, or any packaged skill.
- If approved, make the smallest targeted edit.
- Do not commit unless the user explicitly asks for a commit.

## Approval Gate

No silent durable edits.

Before writing docs/rules, confirm all of these are true:

- The user’s feedback is durable enough to preserve.
- The target file is correct for the scope.
- The proposed wording is narrower than the evidence.
- Repo-local reality and preferred direction are labeled separately.
- The user approved the edit, or the user directly requested the exact file update.

If any condition fails, output a proposal only.

If any proposal has **Needs approval: yes**, proposal-only mode must not end after listing proposals. The final response must include an explicit approval handoff in the same response. The handoff must:

- Name the target file or files when known.
- Summarize the exact edit scope in one concise sentence.
- Ask a direct approval question, such as “Do you want me to apply these targeted docs/rules updates now?” or “I recommend applying this to `AGENTS.md` and `docs/patterns/component-conventions.md` to add the approval gate and self-check wording. Approve?”

Do not include an approval ask when no durable docs/rules/style edit is recommended.

## Integration With Related Skills

- **`mahiro-docs-rules-init`** owns initial repo docs/rules bootstrap. This skill owns targeted refinements after real feedback.
- **`mahiro-style`** is fallback doctrine. Use it to shape wording, but do not overwrite repo-local truth with global style.
- **Project memory** is appropriate when the rule helps this agent work in one repo but should not be packaged as a reusable skill instruction.
- **`rrr`** owns retrospective and durable lesson notes. Send transient or session-only learnings there.
- **`forward`** owns next-session handoff. Add pending docs/rules refinement there when approval is deferred.
- **`recap`** can surface previous lessons before deciding whether feedback is repeated friction.

## Output Contract

For proposal-only mode:

```markdown
## Guidance Proposal

**Lesson**: ...
**Evidence**: ...
**Classification**: Direct User Feedback | Repo-Proven Pattern | Repeated Session Friction | Inference | Transient Context
**Destination**: Do Not Persist | Session Note | Project Proposal | Repo Docs Patch | Global Style Candidate
**Scope**: Repo-local rule | Global Mahiro-style doctrine | Skill-specific procedure | Session-only note
**Target**: ...
**Proposed wording**: ...
**Confidence**: high | medium | low
**Needs approval**: yes | no
```

When any proposal says `**Needs approval**: yes`, append:

```markdown
## Approval Handoff

I recommend applying this to `<target file(s)>` to `<exact edit scope>`. Approve?
```

If target files are not yet known, ask directly whether to apply the targeted docs/rules updates now and state what scope would be changed once targets are confirmed. If every proposal says `**Needs approval**: no`, omit the approval handoff.

For approved edit mode:

```markdown
## Guidance Update

**Updated files**:
- path

**Why**: ...
**Evidence used**: ...
**Scope kept narrow by**: ...
**Follow-up**: ...
```

## Stop Gates

- Stop and ask if the lesson could be repo-local or global and the user has not clarified scope.
- Stop before editing when only inference supports the change.
- Stop before writing to `mahiro-style` unless the user explicitly wants global Mahiro doctrine changed.
- Stop before editing rules when the target file already says the opposite; surface the conflict first.
- Stop before commit/push/delete. Those require separate explicit approval.

## Validation / Self-check

Before final output:

1. Confirm every durable claim has evidence.
2. Confirm transient context did not become a durable rule.
3. Confirm repo-local facts are labeled separately from preferred direction.
4. Confirm repo-specific mechanisms did not become global doctrine by accident.
5. Confirm edits, if any, touched only approved target files.
6. Confirm paired docs/indexes are updated only when their public description changed.
7. Confirm proposal-only output with any `Needs approval: yes` includes a direct approval handoff naming target files and exact edit scope; omit it only when no durable edit is recommended.

ARGUMENTS: $ARGUMENTS
