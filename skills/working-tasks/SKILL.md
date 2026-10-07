---
name: working-tasks
description: Executes and hands off agreed tasks through a tsk-first workflow, with outcome, scope, completion evidence and human acceptance. Use when asked to work a tsk task, manage agreed work on the board, or resume task-backed work across agents or sessions. Do not capture casual discussion or create structured Goals automatically.
---

# Working tasks

Let the human talk naturally; maintain the board for them. A task is the shared
brief and current stopping point, not permission to do everything its notes mention.
Use this procedure when the human adopts a tsk-first workflow. Keep repository
instructions and the newest human decisions above old task notes.

## Owners

- **tsk task:** outcome, scope, done conditions, progress/evidence, next action and
  blocker. Keep one authoritative brief rather than copying it into another plan.
- **This skill:** how to execute and resume that brief, not a command reference.
- **Installed tsk CLI:** syntax and storage behavior. Read `tsk --help`, relevant
  `tsk help <command>` and `tsk guide`; use an installed `tsk-cli` skill if available.
  Sibling skills are optional; do not install them merely to follow this procedure.
- **Structured Goal:** optional, explicitly approved verification gates. If used,
  keep its criteria/evidence there and reference them from the task, not two copies.
- **Memory:** preferences and lessons, not an alternative task ledger.

Check `tsk --version`. If absent, report the missing tool and retain a visible
brief; do not install, use another store or claim the board was updated.

## Capture agreed work

Read the relevant board as JSON and check for existing work before creating a task.
Use the canonical project root for project-owned work; use the desk for cross-project
work. Do not infer scope from the controller's current directory alone.

Create tasks only for work the human agreed to capture. An adopted agent-maintained
board workflow may authorize routine capture of agreed work; without that agreement,
propose the brief first. Do not convert questions or tentative ideas into tasks.
Do not rewrite human-authored notes silently. Upstream's refine workflow remains a
shaping pass: propose its rewrite and obtain approval before writing. Execution
conditions below belong to the approved execution brief, not a redefinition of refine.

Use only the headings the job needs:

```text
Outcome: the observable result
Scope: allowed changes, non-goals and outstanding approvals
Done when: checks required, with human-only acceptance named explicitly
Progress / Evidence: observed changes and exact checks; unverified claims labelled
Next / Blocker: one concrete action, remaining work and its owner
```

A small config task may fit in five lines. Add steps only when the human wants
ordered work tracked; do not make a second checklist for internal bookkeeping.
Read before replacing notes: `edit --notes` replaces the whole body. Preserve the
human's words and decisions, and verify the resulting task through a JSON read.

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
5. Record evidence and unfinished conditions. If blocked, set `blocked`, identify
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
evidence: notes and `started` describe a recorded state, not live process ownership.
If another writer may own the checkout, establish ownership before resuming.

Update the task's progress, remaining conditions, next action, permissions and
evidence references before handing off. Reference a repository-owned handoff when
needed, but do not duplicate the full brief. Receiving agents must be able to name
the result, boundaries, current progress, checks still needed and next owner.

Skills carry the procedure, not task data. Another session on the same store can
read the task; another machine cannot be assumed to have it. For cross-machine work,
provide an explicitly approved portable handoff without copying the whole store or
placing live storage in a synced folder. Never include secrets in notes or evidence.

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
