---
name: working-tasks
description: Executes and hands off agreed work through an explicitly selected Herdr Tasks board, with outcome, scope, evidence and human acceptance. Use when asked to work a Herdr task, manage agreed work on that board, or resume task-backed work. Do not capture casual discussion or create structured Goals automatically.
---

# Working tasks

Let the human talk naturally; maintain the board for them. A task is the shared
brief and current stopping point, not permission to do everything its notes mention.
Use this procedure when the human adopts a Herdr Tasks workflow. Keep repository
instructions and the newest human decisions above old task notes.

## Owners

- **Herdr Tasks issue:** title, project label, Description, status, archive state and revision. Put outcome, scope, done conditions, evidence, next action and blocker in the Description; the board has no separate step, comment, assignee or acceptance model. Imported tsk steps/provenance are read-only source evidence, not editable native steps.
- **This skill:** execution and resumption, not a second task ledger.
- **Installed Herdr Tasks owner:** `bin/herdr-task.py` inside the installed complete Tasks mod, with a separately verified absolute SQLite `--store` filename. Read its `--help` and the host's Tasks documentation before writes. A repo checkout of the mod is source evidence, not proof of the installed helper or live database.
- **Structured Goal:** optional, explicitly approved verification gates. If used,
  keep its criteria/evidence there and reference them from the task, not two copies.
- **Memory:** preferences and lessons, not an alternative task ledger.

## Resolve the board before access

Discover the installed Tasks helper through the active Herdr host's verified `appHome()` configuration (`${appHome()}/mods/tasks/bin/herdr-task.py`). Resolve the **actual selected store** separately: the default is `${appHome()}/data/tasks/tasks.sqlite3`, but a Tasks mod `props.store` absolute filename overrides it. Inspect the active mod configuration or get the exact path from the human; never infer the selected store from cwd, HOME, project label, source checkout, or the default when an override may apply. Check Python 3 and the helper's help without a store. **Before any helper invocation with `--store`**, verify that the exact selected absolute path already exists as a regular file (for example, `test -f "$STORE"` after confirming it is absolute). If missing, not a regular file, ambiguous, or unverifiable, stop and ask; do not let even `list` or `show` silently create an unintended new board. Explicit creation of a new board requires separate human approval and the host's setup procedure, not this routine workflow. Preserve the same verified store across reads and writes. In a non-Herdr environment without verified paths, report task evidence unavailable; do not install, use another store or claim the board was updated. Opening the CLI on an existing database can upgrade it: before first access, require the deployment/backup gate in the host Tasks documentation. Do not inspect a real store merely to discover its schema.

The CLI takes `python3 "$HELPER" --store "$STORE" <command>`; successful output is JSON, errors may be JSON stderr or argparse text with nonzero exit. `list --archived` reads the full inventory; `show T1` reads one record (UUID or T-number alias). The `number`/T alias is readable; UUID is canonical. An ambiguous alias refuses; `show UUID --identity=uuid` and `update UUID --identity=uuid` select exact UUID. Native writes are `create --title=… --project=… --description=…` and `update ID --expect REVISION --description=… [--status review]` (or `--archived true|false`). Read the latest revision with `show` before each update; on conflict reread and reconcile, never blindly retry or overwrite a human edit. Use equals syntax for text beginning with `-`; pass arguments as arguments, not interpolated shell content. `--description` preserves existing plain/Markdown format on update; do not use the deprecated `--notes` alias to replace a Description. Verify saved content via `show`. Do not invoke import/export as routine task editing. The CLI has no step mutation, task delete, automatic acceptance, sync or tsk bridge.

## Capture agreed work

Read the selected store's full inventory as JSON (`list --archived`) and check for existing work before creating an issue. Project is an exact stored metadata value, not a name to reconstruct from cwd. For work in an existing project, reuse its exact `project` value from the selected issue or inventory unchanged, including a stored full path; do not replace it with a basename or a new short label. Resolve the intended group from the human's target and existing records, not display-name equality alone. If the match is missing or ambiguous, ask before creating the issue; introduce a new project value only with explicit human agreement (the CLI defaults to `desk`).

Tasks may display different exact project values with the same short name as `[1] name`, `[2] name`. These prefixes are temporary display disambiguators, not project IDs or values to send to the CLI. Inspect the exact stored values; never merge projects just because their short names match. For an approved project correction, update only `--project=<exact-existing-value>` using the issue UUID and latest revision CAS, then read back; preserve Description, status and all other unrelated fields.

Create tasks only for work the human agreed to capture. An adopted agent-maintained
board workflow may authorize routine capture of agreed work; without that agreement,
propose the brief first. Do not convert questions or tentative ideas into tasks.
Do not rewrite human-authored Description text silently. Propose material Description rewrites for approval before writing; the native owner has no refine command. Execution conditions below belong to the approved brief.

Use only the headings the job needs:

```text
Outcome: the observable result
Scope: allowed changes, non-goals and outstanding approvals
Done when: checks required, with human-only acceptance named explicitly
Progress / Evidence: observed changes and exact checks; unverified claims labelled
Next / Blocker: one concrete action, remaining work and its owner
```

A small config task may fit in five lines. Include ordered items in the Description only when the human wants them tracked; the native CLI cannot edit imported steps. Do not make a second checklist for internal bookkeeping.
Read the latest issue before replacing its Description: `update --description` replaces the entire body. Preserve the human's words and decisions, use its observed revision for CAS, and verify the saved issue through `show`.

Keep consequential original requirements and later human corrections verbatim,
or link their exact source when long; distinguish them from the agent's interpretation.
When an approved requirement changes, record what changed and reopen only the
affected implementation and checks. Unaffected evidence remains valid within its scope.

## Execute to the result

1. Read the complete task, current human instructions, canonical repo rules and
   relevant source/runtime. Check cwd, branch and dirty work before writing.
2. Separate captured intent from approved execution. Ask only when scope, method,
   ownership or a protected action is materially unresolved. A task never grants
   commit, push, deploy, paid-provider, install or destructive permission by itself.
3. When authorized work begins, set `started`. Make the smallest grounded change
   and run checks derived from the outcome, not only tests written by the implementer.
4. Use the repository-native formatter where available and rerun affected checks.
   Distinguish source/runtime proof from human visual/product acceptance. Follow
   the host's independent-QA and resource rules; this skill adds no agent fanout.
5. Record evidence against the approved requirement/change note and the candidate
   actually checked: revision/hash or explicitly identified uncommitted content.
   A Git HEAD alone does not identify dirty edits. Later relevant edits invalidate
   the affected checks, not every earlier result. If blocked, set `blocked`, identify
   the exact question and next owner. Do not report success from command submission.
6. If implementation and required agent checks are complete, set `review` and say
   what the human must inspect. If required checks failed or were not run, record
   that and keep work active or blocked; do not present it as ready for acceptance.
7. Set `done` only after explicit human acceptance or an explicit instruction to
   close that task. A passing build, checked step or Goal claim is not acceptance.

Never automatically create a Goal because a task has multiple steps or a DoD.
Use `control-room-goals` only when structured Goal use is explicitly requested or
approved. Do not clear or migrate an existing Goal merely to adopt this workflow.

## Resume and hand off

Read the task again before acting. Recheck the checkout, current files and load-bearing
evidence: Description and `started` describe a recorded state, not live process ownership.
If another writer may own the checkout, establish ownership before resuming.

Update the task's progress, remaining conditions, next action, permissions and
evidence references before handing off. Reference a repository-owned handoff when
needed, but do not duplicate the full brief. Receiving agents must be able to name
the result, boundaries, current progress, checks still needed and next owner.

Give a delegated worker the task ID/source, exact human constraints, owned paths,
protected contracts, checks and timebox. The worker reads the complete task and
current owners before writing, rather than working only from a parent summary.
Main reconciles review findings with the original requirements and candidate:
require location, evidence and impact; separate introduced defects, pre-existing
issues and preference-only suggestions. Correct supported in-scope defects within
the remaining budget; stop on a concrete blocker rather than starting an unbounded
review/fix sweep. Preserve the host's independent-QA and human-acceptance gates.

Skills carry the procedure, not task data. Another session with access to the same verified local store can read the task; another machine cannot be assumed to have it. For cross-machine work,
provide an explicitly approved portable handoff without copying the whole store or
placing live storage in a synced folder. Never include secrets in Description or evidence.

## Check an agreed workflow change

For an explicitly agreed learning experiment, use the issue's Description evidence: name one changed step and its trigger, a permitted baseline/comparator,
whether it was actually applied, the outcome and observed cost/limits. On later
comparable work, decide keep, narrow, revise or revert through the existing guidance
owner. Separate new requirements from repeated agent mistakes. Invocation or a
prompt-only probe is not proof of better real-work outcomes. Direct human constraints
remain authoritative; never violate them to construct a control. Do not add a new
ledger, experiment, reviewer or automatic rule promotion to every ordinary task.

## Examples

**Small task:** enable source line numbers. Scope is the viewer config only;
check its renderer output and the actual viewer behavior. If viewer verification
is unavailable, retain active/blocked work and name the next owner; command output
alone is not integration proof. After required agent checks pass, return `review`
with human acceptance pending. Do not update the plugin or terminal theme without permission.

**Multi-step task:** introduce this workflow. Inspect existing owners, obtain the
procedure approval, write the bounded draft, validate it, test a fresh-agent resume,
then return the remaining adoption gate. Do not install, publish or mark `done` on
the strength of a validator pass. A fixture handoff test is not a real-work pilot.
