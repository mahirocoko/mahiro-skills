---
name: herdr-cli
description: Organizes Herdr Spaces, Tabs and Panes, runs authorized apps/dev servers in visible terminals, associates explicitly authorized Git worktrees, transfers full project ownership, coordinates visible cross-Space dependencies, and interprets native attention versus activity truthfully. Use for app/server startup in Herdr, workspace organization/navigation, worktree creation or opening an existing checkout in a Space, project handoff, cross-Space coordination, or native presentation inspection. Do not use for ordinary executor/model/callback work; direct-cli owns those jobs.
---

# Herdr CLI

Put project work in the right Space, identify the terminal that actually owns it,
and make the next human action clear. Use Herdr's own guide for commands and
readiness; this skill adds an ownership procedure, not a competing CLI catalog.

## Operating Posture

Treat a Space as a place for project conversations, not an isolated checkout or
a supervised task. Read the newest human instruction in the relevant conversation
before following an old handoff. Keep coordination visible and report evidence
without promoting terminal lifecycle into accepted work.

## Scope and Handoffs

- Own Space reuse, terminal selection, full ownership transfer, visible
  cross-Space prerequisite/question handling and truthful state interpretation.
- Own visible app/server terminal placement; the project owns its startup command.
- Keep the installed `herdr --skill`, command-group help and compatible public
  schema authoritative for syntax, IDs, lifecycle and readiness. Do not copy a
  version-pinned command catalog into this skill.
- Route temporary executor work, provider/model/effort selection, launch flags,
  callbacks, report recovery and lane cleanup to `direct-cli`.
- Keep project commands, native UI/plugin implementation and rendered acceptance
  with their project owners. Metadata capability is not rendered support.
- Keep browser, artifact and supervised DAG jobs with their established owners.
  Do not invent Herdr equivalents of Orca Run/Task/Dispatch, durable inbox/ack,
  ask/reply, retry-request or settlement APIs from layout or events.

## Decision Sequence

### 1. Choose the relationship

Name the project, allowed change, checkout owner and reporting destination.

| Request | Relationship | Next owner |
| --- | --- | --- |
| Continue this project's work here | Local continuation | Current conversation |
| Run this project's app/dev server | Visible service terminal | Current conversation; project owns command and readiness |
| Hand this project to another Space; report there | Full handoff | Receiving conversation; sender stops writing that scope |
| Ask an executor to do a bounded job and return here | Temporary executor | Current controller through direct-cli |
| Coordinate a prerequisite between existing Spaces | Cross-Space coordination | Each project retains its owner |

Do not turn a full handoff into supervision unless the user asks to track or
collect results. Cross-Space permission does not grant another project's writes.

### 2. Ground the runtime and project

Require `HERDR_ENV=1` before inspecting or controlling the session. If outside
Herdr, stop; do not target the user's focused session from another environment.
Load `herdr --skill` unless already loaded, inspect `herdr --help` and relevant
command-group help, and check `herdr status` for client/server compatibility.
Do not run bare `herdr` or argumentless nested mutations for discovery.

Resolve the approved project's authoritative path and canonicalize it. Discover
existing layout and compare pane cwd and foreground cwd, not sidebar labels.
If they differ, inspect the foreground process and intended project before
choosing. Multiple matching Spaces require occupant/ownership inspection, not
an arbitrary first match.

Reuse an appropriate Space. Create a Space, Tab or Pane only when the requested
topology authorizes it, with explicit project cwd and `--no-focus` unless the
human requested navigation. Space creation does not authorize a Git worktree.
Same-checkout conversations do not isolate writers: release overlapping writing
ownership before starting another writer.

#### Worktree-backed Spaces

Require explicit worktree authorization. In the approved project context, discover
the exact checkout with native `worktree list`; match canonical path, branch and
repository identity before deciding to reuse/open or create. Official help owns syntax.
- **Native create:** only when the approved checkout is absent, use native
  `worktree create` to obtain a linked checkout plus Space; validate both returned identities.
- **Letta-created checkout:** use the exact path returned by `EnterWorktree`.
  Its `.letta/worktrees/` policy is Letta-specific, not a rule for other executors.
  The agent-internal/foreground cwd can change while the native Space stays old.
  A missing `open_workspace_id` means no associated open Space, not no checkout.
  Discover/reuse the matching Space or use native `worktree open` on the exact existing
  path and unchanged branch; never `create` again to associate it with a Space.
- **Destination binding:** rebind the returned live Space/Tab/Pane IDs and inspect
  their cwd/occupant. Old `HERDR_WORKSPACE_ID`, caller pane or focus is not destination
  authority after a Letta switch; a shared repository key alone is not checkout identity.
- **Process ownership:** opening a Space does not move the current Letta conversation
  or process. Agent launch/transfer or pane move needs its own explicit topology/owner
  decision; keep one writer per checkout and do not start an overlapping replacement.
Preserve `--no-focus` unless navigation was requested. Cleanup needs separate approval;
do not remove a checkout or close another owner's Space to tidy an association.
Native association/readiness is runtime evidence, not screenshot or visual acceptance.

### 3. Bind the exact destination

Read workspace, tab, pane and terminal IDs from native responses. Preserve the
selected server/session or machine context across discovery and later commands.
Never derive IDs from sidebar order, labels or documentation examples. Inspect
the actual response envelope before parsing; snapshots may live in
`.result.snapshot` rather than directly under `.result`.

Use explicit pane IDs or unique live agent names, not another client's focus.
Bind cwd, foreground process and available agent/session identity. A terminal ID
is identity evidence, not an agent target. Reinspect before sending; a replaced
occupant or moved pane invalidates a remembered destination.

An empty-looking pane is not necessarily an available shell. Check foreground
processes and interactive readiness; do not run over an editor, server or agent.
Use native readiness mechanics and the existing executor launch owner, not
invented startup flags. A blocked or unknown agent needs diagnosis; do not answer
an approval dialog or inject work merely to make progress.

#### Visible app and dev-server terminals

For authorized project app/dev-server startup, keep the actual process in a
visible Herdr terminal, not a hidden agent background shell. This is terminal
placement, not executor delegation; it does not require direct-cli or orchestration.
- Check existing project service records or listening ports plus process cwd first.
  Reuse a matching running service; do not launch a duplicate for verification.
- Use a clearly named Tab in the matching project Space; split related services
  into Panes when useful rather than scattering many Tabs. Keep explicit project
  cwd and `--no-focus`. Apply the runtime, destination and shell-readiness gates above.
- Run the repo-owned command in the foreground of that terminal. Do not detach it
  with `&`, `nohup`, `disown` or an agent background-task launcher by default.
  Native persistent-service requirements or an explicit background request are exceptions.
- Record the exact Space/Tab/Pane, command, cwd, process and port where available.
  Check service-specific readiness and failure output; successful submission or
  a live PID alone does not prove the app is ready. Keep logs visible so the human
  can inspect, stop or restart it. Leave a needed service running at handoff.
- Revalidate the exact process owner before an authorized stop/restart. Do not
  kill another owner's service or close its terminal as cleanup. Background
  monitoring/callback metadata is separate from backgrounding the server itself.
If the verified visible terminal is unavailable, report the blocker rather than
silently using a hidden background process. In an Orca-owned session, use its
version-matched terminal guide instead; do not control Herdr from outside Herdr.

### 4. Transfer ownership once

Write a self-contained brief: objective, canonical checkout, dirty work to
preserve, authorized writes, non-goals, observable outcome, required evidence
and direct human reporting destination. State that the sender releases writing
ownership and old-controller callbacks do not apply.

Submit to the ready, revalidated agent once using the native agent prompt
surface. Do not use completion-oriented `--wait` by default for a full handoff:
the sender should not wait for the receiving project to finish. Separately report
**ready**, **submitted**, **activity observed**, **receiver acknowledged** and
**accepted outcome**; submission alone is not a started turn.

Use bounded inspection to confirm activity or acknowledgment where available,
then stop writing the transferred scope. If delivery/start is unproven, report
that boundary. Inspect the same destination before retrying an ambiguous send;
silence never authorizes duplicate prompts or a replacement writer.

### 5. Coordinate a real prerequisite

Name the other owner, exact dependency/question, current evidence and the answer
that would unblock your work. If no prerequisite exists, projects continue
independently. Sharing Herdr does not make one project depend on another.

Prefer a visible human update or shared project artifact. Before authorized
cross-Space delivery, check newer local decisions and revalidate the live target.
Record what was submitted versus acknowledged; a notification is not a durable
inbox receipt. Do not create private threads, a scheduler or inbox service by
default. Route conflicting scope to the human instead of editing across owners.

### 6. Interpret presentation honestly

Separate **project identity**, **live activity**, **attention needing the human**
and **accepted outcome**. Use the exact pane's effective state for its occupant;
do not infer every pane's activity from a workspace/tab attention aggregate.
An unseen Done can coexist with working panes. Reads do not mark seen; focus
does, and clients can show different seen-state badges.

Native metadata tokens, state labels and schema-level view filters/sorts only
establish data capabilities. Verify actual rendered support with the presentation
owner before claiming a sidebar uses them. Keep source, scope and freshness
explicit; unknown/stale is better than a fabricated activity summary. Do not
overwrite raw lifecycle or mutate configuration to make a summary look cleaner.

## Examples

**Full handoff:** “Move this skill study to its project Space and report there.”
Reuse the Space whose live cwd matches the approved checkout, check the exact
agent, deliver the brief protecting existing dirty files, confirm receipt at the
evidence level available, then relinquish the scope. The receiver talks directly
to the human. No callback job or supervised Task is created.

**Cross-Space:** one project owns Quick Actions that open a new Tab in the same
workspace; another owns a Web status spinner. A picker prototype remains a
prototype until human acceptance. Neither project waits for this guide, and
neither waits for the other without a concrete prerequisite. Consume the latest
owner decision; do not implement their UI or treat metadata as rendered proof.

**Does not apply:** “Have an executor review this diff and return findings here.”
Use direct-cli. A different Tab does not transfer project ownership.

## Stop Gates

Stop on uncertain caller/runtime compatibility, project ownership, occupant,
readiness, delivery or material conflicting instructions. Inspect before retrying;
absence is not failure or exit. Never close/stop another owner's resources or
create a worktree, service, integration, binding or installation without approval.

## Output Contract

Report the scope owner, exact destination when relevant, evidence level reached,
remaining blocker and next owner/action. Distinguish proposal, observed runtime,
rendered technical proof and human acceptance. Lifecycle idle/done never completes
the project by itself.

## Validation / Self-check

Check path/occupant identity, one writer, explicit IDs, unchanged focus intent,
latest human decisions, single submission and direct reporting destination.
For coordination, name a real prerequisite or explicitly state there is none.
Source/fixture checks protect wording and inventory; only an authorized live
handoff can establish actual submission/readiness behavior. Do not manufacture
that proof by creating or prompting another agent during a documentation check.
