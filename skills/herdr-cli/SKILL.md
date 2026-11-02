---
name: herdr-cli
description: Organizes visible Herdr Spaces/Tabs/Panes through herdr-app while hc owns terminal lifecycle. Use for authorized app/dev-server startup, opening or associating an existing explicitly authorized Git worktree, full project handoff, cross-Space coordination or presentation inspection. Git/executor owners create worktrees; direct-cli owns temporary executor/model/callback work.
---

# Herdr CLI

Put project work in the right Space, identify the terminal that actually owns it,
and make the next human action clear. Current Herdr has split ownership:
`herdr-app` changes what the person sees; `hc` runs persistent terminals and agents.
A Space is a place for conversations, not an isolated checkout or supervised task.

## Scope and Handoffs

- Own visible topology, project association, full ownership transfer, cross-Space
  prerequisites and truthful presentation evidence. Metadata capability is not rendered support.
- Keep installed `herdr-app --skill`, `hc --skill`, relevant help and
  `herdr-app commands` authoritative for syntax, IDs and capabilities.
- Route temporary executor/model selection, callbacks, report recovery and lane cleanup to `direct-cli` when available.
  The current controller retains ownership; a different Tab does not transfer it.
  If `direct-cli` is unavailable, do not assume it is installed or invent its
  callback contract; use installed executor/Core help for an authorized bounded
  launch or report a blocker when the required return contract is unavailable.
- Project owners supply startup commands, Git/worktree operations, native UI/plugin
  implementation and rendered acceptance. Keep browser/artifact/DAG jobs with their owners.
  Do not invent Herdr equivalents of Orca Run/Task/Dispatch or durable inbox/ack services.

## Decision Sequence

### 1. Choose the relationship

Name project, allowed change, checkout owner and reporting destination.

| Request | Relationship | Next owner |
| --- | --- | --- |
| Continue project work here | Local continuation | Current conversation |
| Run app/dev server | Visible service terminal | Current conversation; project owns command/readiness |
| Hand project to another Space | Full handoff | Receiving conversation; sender stops writing that scope |
| Bounded executor job returning here | Temporary delegation | Current controller through direct-cli |
| Prerequisite between Spaces | Cross-Space coordination | Each project retains its owner |

Read the latest human instruction before an old handoff. Cross-Space permission
is not permission to write another project. Do not turn full handoff into supervision.

### 2. Ground the runtime and project

Load `herdr-app --skill` and `hc --skill`, then relevant command help and
`herdr-app commands`. Resolve `hc` first, otherwise the compatibility executable
`herdr-core` as `HC_BIN`; use that same executable for all Core commands.
Require a validated HC caller: `$HC_BIN server status --json` must prove current
holder/core, and `$HC_BIN get "$HC_TERMINAL_ID" --json` must return that exact
address with `state=live`. Reject stale, malformed or mismatched receipts.
Current-generation operation inside HC does not require legacy `HERDR_ENV`.
Binary presence alone does not authorize controlling the person's focused session.

Use read-only `herdr-app ls`, `herdr-app status`, `herdr-app commands` for discovery.
Never run bare `herdr-app`: it opens/raises the window. Do not stop/restart the
person's app/core. An explicit destination Space wins. Otherwise bind a new Tab to a
unique Space already associated with the approved target project/checkout; if none exists,
use the Space containing the exact validated `HC_TERMINAL_ID` from `herdr-app ls`. Prove
the project match from exact path/occupants, not labels. Do not default to
`herdr-app status.space`, which reports app focus and may belong to another conversation.
Use `status.space` only when the human explicitly asks for the currently focused Space.
If neither project nor caller resolves one Space, stop and ask rather than guessing. If no current-generation tools
are available, use only the separate legacy fallback below; a failed selected runtime
is not permission to silently change backends after resource creation.

Resolve the approved canonical project path separately from caller terminal cwd;
they may differ. Discover layout and compare pane cwd and foreground cwd, not sidebar labels.
A displayed Space name or folder mismatch alone is not evidence that a new Space is
needed: inspect its terminals, exact HC foreground cwd and owner first. Inspect occupants
when multiple Spaces match. Reuse an appropriate Space; create Space/Tab/Pane only when
requested topology authorizes it. Supply explicit folder,
useful name and argv, not focused defaults. New app Spaces/Tabs may show immediately;
there is no assumed app `--no-focus` flag. Do not promise unchanged focus for creation.
Navigate/focus only within the requested scope; background Core workers need no UI labels.
Space creation does not authorize a Git worktree. Same-checkout conversations
are not writer isolation; release overlapping ownership before another writer starts.

#### Worktree-backed Spaces

Require explicit worktree authorization. Git or the actual executor/worktree owner
creates/manages checkouts and returns the exact existing checkout path. Validate
canonical path, branch and repository identity with that owner before association.
Current herdr-app has no proven native Git-worktree create/open API. Do not invent one.

Open/associate that existing folder through verified app topology commands, reusing
a matching Space where possible. Never create another checkout merely because a
Space association is missing. An executor's internal cwd switch does not move its
process or update the app association. Rebind returned Space/Tab/Pane IDs and the
separate HC terminal address; caller IDs/focus and shared repository keys are not
destination authority. Opening a Space does not move the current agent process.
Keep one writer per checkout; transfer/launch/move needs its own topology/owner decision.
Cleanup needs separate approval; do not remove a checkout or another owner's Space.
Association evidence is runtime evidence, not screenshot or visual acceptance.

### 3. Bind the exact destination

App Space/Tab/Pane IDs and HC terminal addresses are separate namespaces.
`$HC_TERMINAL_ID` is not a pane ID. Read exact returned IDs and inspect response
envelopes rather than predicting IDs or deriving them from labels/sidebar order.
Bind the app pane to its returned terminal address, current core/holder, cwd,
foreground process and agent/session identity where available. Reinspect before
sending: a replaced occupant or moved pane invalidates a remembered destination.
An empty-looking pane is not necessarily an available shell. Do not inject work
over an editor, server, approval dialog or unknown agent; inspect readiness first.

Use app commands only for visible topology. Installed `commands` owns shapes for
`space.new`, `tab.new`, `pane.split`, `terminal.open`, `terminal.keep`/`terminal.park`
and pane/Space/Tab focus/select. Use hc for terminal execution, read/wait/send,
interrupt/kill/rm, not app layout as a substitute lifecycle API. When current help
supports it, create a new Tab with explicit `tab.new --space <id>`; an omitted `space`
follows app selection and is not ownership evidence. An HC terminal intended to appear
there may be launched with `herdr.space=<id>` and optional exact `herdr.tab=<id>` labels.
Changing labels after launch does not prove a pane moved, so confirm actual placement with
`herdr-app ls`. A request to reveal an HC child can use verified `terminal.keep` or focus
capability; do not confuse watchable terminals with guaranteed visible placement.

Relocate an existing process only when that topology change is authorized. If
`herdr-app ls` shows it already has a pane, park that exact terminal first; do not park
a pane-less child. Installed `terminal.keep` may expose no destination argument and
follow the selected Space. Never inherit whatever Space was already focused: select the
caller-owned or explicitly authorized destination by exact ID, immediately re-read
`herdr-app status`, then keep. If current help exposes an explicit destination, use that
instead. Use app-owned park/keep rather than relabeling. Treat
placement as focus-changing unless current runtime evidence proves otherwise, and treat
a `pending` response as admission only. Re-read `herdr-app ls` and exact HC
address/process/cwd afterward; for a service, also recheck port and health.

#### Visible app and dev-server terminals

For authorized app/dev-server startup, keep the actual process in a visible terminal,
not a hidden agent background shell. This does not require direct-cli or orchestration.
- Check project service records/listening ports plus exact process cwd first.
  Reuse a matching running service rather than launching a duplicate for verification.
- By default, place a new service Tab in the unique Space associated with the exact
  approved project/checkout; if none exists, use the Space containing this conversation's
  validated caller terminal. Never use the Space the person merely focuses. Inspect
  occupants and foreground cwd before deciding the match is wrong; do not duplicate it
  to repair labels.
- Choose a clearly named Tab in that exact Space; split related services into Panes when
  useful. Pass the Space ID explicitly where supported and verify it immediately before
  any command whose omitted destination follows focus.
- Use verified app `terminal.open` or `tab.new` with explicit folder/name/argv for
  requested visible placement. Parse the returned terminal ID, bind with hc `get`,
  and use hc for subsequent execution, readiness, output and lifecycle. A topology
  launch response proves creation, not successful program startup.
- Run the repo-owned command in the foreground of that terminal. No `&`, `nohup`,
  `disown` or hidden background-task launcher by default. An explicit background
  request or installed persistent-service requirement is a separate exception.
- Record exact Space/Tab/Pane plus HC terminal address, command, cwd, process and port.
  Read hc output first, then use `hc wait <address> --output <ready-marker>` for new
  readiness output and `hc read` for logs. The wait marker only matches output after
  waiting starts: inspect existing output before waiting to avoid a missed-marker hang.
  Use `hc wait`, never sleep/poll. Successful submission or a live PID is not app readiness.
- Revalidate the exact process owner with hc `get` before authorized stop/restart:
  address, current core/holder, state, cwd, argv/foreground and creation receipt.
  Leave needed services running at handoff. Never kill another owner's service.
  Background monitoring metadata is separate from backgrounding the server itself.
If verified visible placement is unavailable, report the blocker instead of silently
using a hidden process. In an Orca-owned session use its version-matched terminal guide.

### 4. Transfer ownership once

Write a self-contained brief: objective, canonical checkout, dirty work to preserve,
authorized writes, non-goals, observable outcome, evidence and human reporting destination.
State that the sender releases writing ownership and old-controller callbacks do not apply.

Revalidate the exact HC terminal receipt and ready occupant, then use non-forced
`hc send <address> <brief>` once. Do not use completion-oriented `--wait` by default
for full handoff. No callback job or supervised Task is created. Separate **ready**,
**submitted**, **activity observed**, **receiver acknowledged** and **accepted outcome**.
Accepted send is not receipt or proof of a started turn. Never force past a blocked dialog.
Use bounded hc wait/read inspection where appropriate; timeout is a check-in, not failure.
Confirm acknowledgment at the evidence level available, then stop writing transferred scope.
Inspect the same target before retrying an ambiguous send; silence never authorizes duplicate prompts or a replacement writer.

### 5. Coordinate a real prerequisite

Name exact dependency/question, other owner, current evidence and the answer that
unblocks work. Sharing Herdr does not make one project depend on another.
Prefer visible human updates/shared artifacts. Before authorized cross-Space delivery,
read newer local decisions and revalidate the exact HC terminal/occupant, not just
its app Space. Send non-forced once and distinguish submitted/activity/ack/acceptance.
A notification is not a durable inbox receipt. Conflicting scope returns to the human.

### 6. Interpret presentation honestly

Separate project identity, live activity, human attention and accepted outcome.
Read exact terminal status; app aggregate attention does not describe every occupant.
Do not infer seen-state or focus semantics across generations from old behavior.
Verify actual rendered support with the presentation owner before claiming a sidebar
uses metadata, filters or schema tokens. Unknown/stale is better than fabricated
activity. Do not mutate configuration to make a summary look cleaner.

## Legacy fallback (separate backend)

Only when current-generation tools are unavailable, require `HERDR_ENV=1`, a live
`HERDR_PANE_ID` and installed `herdr --skill`; load relevant help and validate
`herdr status --json` compatibility plus exact `herdr pane get` destination.
Legacy `herdr` owns its Workspace/Tab/Pane/Agent APIs and legacy IDs. Never substitute
hc commands into those APIs, treat HC addresses as legacy pane IDs, or mix receipts.
Follow the installed legacy readiness/send/cleanup mechanics, explicit cwd and
no-focus capability where supported. Binary presence/markers alone are insufficient.
Temporary detached callbacks remain direct-cli's legacy Herdr path, not full transfer.

## Examples

**Full handoff:** reuse the Space matching the approved checkout, bind its ready
HC terminal, send a brief protecting dirty files once, report delivery/ack evidence,
then relinquish writing. The receiver reports directly to the human, not an old callback job.

**Existing worktree:** get its exact path from the Git/executor owner after explicit
authorization, validate identity, then open/reuse that folder in the app. Do not
create a duplicate checkout to repair missing UI association.

**Does not apply:** an executor reviews a diff and returns findings here. Use direct-cli.

## Stop Gates / Output Contract

Stop on uncertain caller/core, ownership, destination, readiness, delivery or conflict.
Absence is not failure or exit. Never close/stop another owner's resources, install,
create a checkout or mutate settings without approval. Report owner, exact destination,
evidence reached, blocker and next action. Lifecycle idle/done never completes work.

## Validation / Self-check

Check path/occupant, one writer, separate ID namespaces, latest instructions, single
submission, requested visibility and direct reporting destination. Name real prerequisites.
Source/fixture checks are not live launch/handoff or human acceptance proof; do not
manufacture that evidence by creating or prompting another agent during a docs check.
