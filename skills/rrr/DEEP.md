# RRR --deep Mode (5 Parallel Agents)

**Use for complex sessions** with lots of changes, multiple features, or when you want comprehensive analysis.

## Step 0: Timestamp + Paths

```bash
date "+%H:%M %Z (%A %d %B %Y)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
DATE_PATH=$(date "+%Y-%m/%d")
mkdir -p "$AGENT_STATE_DIR/memory/retrospectives/$DATE_PATH"
```

## Step 1: Launch 5 Parallel Agents

Each agent prompt must include:
```
You are analyzing a coding session for retrospective.
REPO_ROOT: [REPO_ROOT]
AGENT_STATE_DIR: [AGENT_STATE_DIR]
Return your findings as text. The main agent will compile the retrospective.
```

### Agent 1: Git Deep Dive
```
Analyze git history thoroughly:
- git log --oneline -20
- git diff --stat HEAD~10
- git show --stat (last 5 commits)
- Branch activity
- Commit message patterns

Return: Timeline of changes, key commits, code churn analysis
```

### Agent 2: File Changes Analysis
```
Analyze what files changed and why:
- git diff --name-only HEAD~10
- Read key modified files
- Identify patterns in changes
- Architecture impact

Return: Files modified summary, architectural changes, risk areas
```

### Agent 3: Session Timeline Reconstruction
```
Reconstruct the session timeline:
- Read $AGENT_STATE_DIR/memory/logs/ for today
- Check git commit timestamps
- Identify session phases (start, middle, end)
- Map activities to times

Return: Detailed timeline with timestamps and activities
```

### Agent 4: Pattern & Learning Extraction
```
Extract patterns and learnings:
- What problems were solved?
- What techniques were used?
- What could be reused?
- Which candidate decisions have an observable future trigger?
- Which details are incident-only and should remain in the retrospective?

Return: Candidate reference learnings, their future triggers and boundaries, plus a separate list of incident-only details that must not be promoted
```

### Agent 5: Local Memory Search
```
Search local notes for related context:
- Check $AGENT_STATE_DIR/memory/learnings/ for similar topics
- Find past retrospectives on similar work
- Find prior traces on similar work
- Distinguish non-canonical evidence from current approved guidance
- Does an existing owner already communicate the same decision?

Return: Related evidence, current canonical owner if any, and whether the candidate should merge, replace, remain reference-only, or produce no new artifact
```

## Step 2: Compile Results

After all agents return, main agent compiles into full retrospective:

**Location**: `$AGENT_STATE_DIR/memory/retrospectives/$DATE_PATH/${TIME}_[slug].md`

Include all standard sections PLUS:
- Deep git analysis (from Agent 1)
- Architecture impact (from Agent 2)
- Detailed timeline (from Agent 3)
- Extracted patterns (from Agent 4)
- Local memory connections (from Agent 5)

## Step 3: Evaluate Optional Reference Learning

Apply the same learning promotion gate as default RRR. A deep analysis does not make every extracted observation durable guidance.

Create `$AGENT_STATE_DIR/memory/learnings/${TODAY}_[slug].md` only when at least one candidate has an observable future trigger, a transferable decision, scope reality, the `Intent` / `Trigger` / `Action` / `Boundary` / `Rationale` shape, and no equivalent current owner.

Any created note must declare:

```markdown
---
artifact: reference-learning
authority: non-canonical
status: candidate
source: <retrospective path>
---
```

Keep it locally searchable, link its evidence, and omit incident chronology and mistake inventories. If no candidate passes, create no learning file and report `retrospective-only; no durable lesson promoted`.

## Step 4: Report Authority

Report either `reference learning captured; guidance promotion not performed` or `retrospective-only; no durable lesson promoted`. Route any later canonical promotion through `mahiro-guidance-refine` and human approval.

## Step 5: Commit (optional)

Only commit the generated notes if the human explicitly asks for it.
