---
name: learn
description: Explore a codebase with parallel agents — clone, read, and document. Modes — --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo", or shares a GitHub URL to study. Do NOT trigger for finding projects (use /project find), session mining, or cloning for active development (use /project incubate).
disable-slash-command: true
---

# /learn - Deep Dive Learning Pattern

Study a codebase without turning it into an active development checkout. Keep
the source clone replaceable, keep the learning notes durable, and make each run
traceable to one source path and timestamp.

In Agy, invoke this workflow through the adapter-installed user-only `/mh-learn` skill alias. This canonical `learn` skill keeps model discovery while its raw slash command stays hidden to avoid colliding with Agy's built-in `/learn`.

## Operating Posture

Act as a research lead. Give parallel readers distinct questions, preserve the
source as read-only evidence, and synthesize their findings instead of treating
five long documents as five independent truths. Breadth comes from parallelism;
the main agent still owns factual consistency and the final learning index.

The common failure is an ownership mistake: a reader follows the `origin/`
symlink and writes generated notes into the learned repository. Prevent that by
resolving separate literal source and documentation paths before dispatch.

## Scope and Handoffs

This skill owns codebase study and durable learning notes:

- external repositories are cloned through `ghq`, then read through an
  `origin/` symlink
- existing local projects may be read directly
- generated documents live under the current repo's `.agent-state/learn/`
- the main agent reviews the documents and owns `repo.md`

It does not own project discovery, active development clones, or historical
session mining. Use `/project find` to locate tracked projects, `/project
incubate` to start active development, and the relevant recap/history workflow
for session evidence.

## Usage

```
/learn [url]             # Auto: clone via ghq, symlink origin/, then explore
/learn [slug]            # Use slug from .agent-state/memory/slugs.yaml
/learn [repo-path]       # Path to repo
/learn [repo-name]       # Finds in .agent-state/learn/owner/repo
/learn --init            # Restore all origins after git clone (like submodule init)
```

## Depth Modes

| Flag | Agents | Files | Use Case |
|------|--------|-------|----------|
| `--fast` | 1 | 1 overview | Quick scan, "what is this?" |
| (default) | 3 | 3 docs | Normal exploration |
| `--deep` | 5 | 5 docs | Master complex codebases |

```
/learn --fast [target]   # Quick overview (1 agent, ~2 min)
/learn [target]          # Standard (3 agents, ~5 min)
/learn --deep [target]   # Deep dive (5 agents, ~10 min)
```

## Resolve Repo Root First

If this skill reads or writes local state, do not anchor it to raw cwd.

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
```

Use the same rule in every script snippet, output path, and example below.

## Directory Structure

```
.agent-state/
└── learn/
    ├── .origins             # Manifest of learned repos (local state)
    └── owner/
        └── repo/
            ├── origin       # Symlink to ghq source
            ├── repo.md      # Hub file - links to all sessions
            └── YYYY-MM-DD/  # Date folder
                ├── 1349_ARCHITECTURE.md
                ├── 1349_CODE-SNIPPETS.md
                ├── 1349_QUICK-REFERENCE.md
                ├── 1520_ARCHITECTURE.md
                └── ...
```

**Multiple learnings**: Each run gets time-prefixed files (`HHMM_`), nested in a date folder.

**Offload source, keep docs:**
```bash
unlink "$AGENT_STATE_DIR/learn/owner/repo/origin"  # Remove symlink
ghq rm owner/repo                                   # Remove source clone
# Docs remain in .agent-state/learn/owner/repo/
```

## /learn --init

Restore all origins after cloning (like `git submodule init`):

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"

while read repo; do
  ghq get -u "https://github.com/$repo"
  OWNER=$(dirname "$repo")
  REPO=$(basename "$repo")
  mkdir -p "$AGENT_STATE_DIR/learn/$OWNER/$REPO"
  ln -sf "$(ghq root)/github.com/$repo" "$AGENT_STATE_DIR/learn/$OWNER/$REPO/origin"
  echo "✓ Restored: $repo"
done < "$AGENT_STATE_DIR/learn/.origins"
```

## Decision Sequence

### 1. Resolve the source and destination

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

Capture absolute paths before spawning any agents:
```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
echo "Learning from: $REPO_ROOT"
```

When spawning parallel agents, give them two literal paths:
1. **SOURCE_DIR** (where to READ code) - the `origin/` symlink
2. **DOCS_DIR** (where to WRITE docs) - the parent directory, NOT inside origin/

Why this matters: if a reader receives only the `origin/` path, it may `cd` into
the symlink and write generated files into the learned repository.

Always pass both paths as literal absolute values rather than unresolved shell
variables:

Example:
```
READ from:  .../.agent-state/learn/acme-corp/cool-library/origin/
WRITE to:   .../.agent-state/learn/acme-corp/cool-library/2026-02-04/1349_[FILENAME].md
```

Tell each agent: `Read from [SOURCE_DIR]. Write to [DOCS_DIR]/[TIME]_[FILENAME].md`

### If URL (http* or owner/repo format)

**Clone, create docs dir, symlink origin, update manifest:**
```bash
URL="[URL]"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"

ghq get -u "$URL" && \
  GHQ_ROOT=$(ghq root) && \
  OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|') && \
  REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|') && \
  mkdir -p "$AGENT_STATE_DIR/learn/$OWNER/$REPO" && \
  ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "$AGENT_STATE_DIR/learn/$OWNER/$REPO/origin" && \
  echo "$OWNER/$REPO" >> "$AGENT_STATE_DIR/learn/.origins" && \
  sort -u -o "$AGENT_STATE_DIR/learn/.origins" "$AGENT_STATE_DIR/learn/.origins" && \
  echo "✓ Ready: $AGENT_STATE_DIR/learn/$OWNER/$REPO/origin → source"
```

**Verify:**
```bash
ls -la "$AGENT_STATE_DIR/learn/$OWNER/$REPO/"
```

> **Note**: If your grep tool does not follow symlinks, search the `origin/` path explicitly.

### Then resolve path:
```bash
find "$AGENT_STATE_DIR/learn" -name "origin" -type l | xargs -I{} dirname {} | grep -i "$INPUT" | head -1
```

For an external repo, clone and create the symlink before exploration. For a
local project already inside the current repo, read directly from that path and
write docs into its matching `.agent-state/learn/...` destination.

### 2. Choose depth and calculate paths

Check arguments for `--fast` or `--deep`:
- `--fast` → Single overview agent
- `--deep` → 5 parallel agents
- (neither) → 3 parallel agents (default)

**Calculate ACTUAL paths (replace variables with real values):**
```
TODAY = YYYY-MM-DD
TIME = HHMM
REPO_DIR = [AGENT_STATE_DIR]/learn/[OWNER]/[REPO]/
DOCS_DIR = [AGENT_STATE_DIR]/learn/[OWNER]/[REPO]/[TODAY]/
SOURCE_DIR = [AGENT_STATE_DIR]/learn/[OWNER]/[REPO]/origin/
FILE_PREFIX = [TIME]_
```

Create the symlink and date folder before spawning agents. This turns path
ownership into a checked precondition rather than a promise in the prompt.

1. Complete the source and symlink setup in section 1 first
2. Capture TIME with `date +%H%M`
3. Create the date folder: `mkdir -p "$DOCS_DIR"`
4. Capture `DOCS_DIR`, `SOURCE_DIR`, and `TIME` as literal values
5. Then spawn agents with paths including the time prefix

**Multiple runs same day?** Each run gets a unique time prefix → no overwrites.

---

#### Fast mode: `--fast` (1 agent)

##### Quick overview reader

**Prompt the agent with (use literal paths, not variables):**
```
You are exploring a codebase.

READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_OVERVIEW.md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!

Analyze:
- What is this project? (1 sentence)
- Key files to look at
- How to use it (install + basic example)
- Notable patterns or tech
```

Continue to section 3 after the reader completes.

---

#### Default mode (3 agents)

Launch 3 agents in parallel. Each prompt must include:
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

##### Reader 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure
- Entry points
- Core abstractions
- Dependencies

##### Reader 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations
- Interesting patterns

##### Reader 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does
- Installation
- Key features
- Usage patterns

Continue to section 3 after all readers complete.

---

#### Deep mode: `--deep` (5 agents)

Launch 5 agents in parallel. Each prompt must include:
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

##### Reader 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

##### Reader 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

##### Reader 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

##### Reader 4: Testing & Quality Patterns → `[TIME]_TESTING.md`
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach

##### Reader 5: API & Integration Surface → `[TIME]_API-SURFACE.md`
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture

Continue to section 3 after all readers complete.

### 3. Review the documents and update `repo.md`

Do not treat completion from every reader as proof that the combined learning is
correct. Check contradictory counts, unsupported installation claims, stale
paths, and source modifications before writing the hub summary.

```markdown
# [REPO] Learning Index

## Source
- **Origin**: ./origin/
- **GitHub**: https://github.com/$OWNER/$REPO

## Explorations

### [TODAY] [TIME] ([mode])
- [[YYYY-MM-DD/HHMM_ARCHITECTURE|Architecture]]
- [[YYYY-MM-DD/HHMM_CODE-SNIPPETS|Code Snippets]]
- [[YYYY-MM-DD/HHMM_QUICK-REFERENCE|Quick Reference]]
- [[YYYY-MM-DD/HHMM_TESTING|Testing]]        <!-- --deep only -->
- [[YYYY-MM-DD/HHMM_API-SURFACE|API Surface]] <!-- --deep only -->

**Key insights**: [2-3 things learned]
```

## Output Contract

### --fast mode
```markdown
## 📚 Quick Learn: [REPO]

**Mode**: fast (1 agent)
**Location**: .agent-state/learn/$OWNER/$REPO/[TODAY]/[TIME]_*.md

| File | Description |
|------|-------------|
| repo.md | Hub (links all sessions) |
| [TODAY]/[TIME]_OVERVIEW.md | Quick overview |
```

### Default mode
```markdown
## 📚 Learning Complete: [REPO]

**Mode**: default (3 agents)
**Location**: .agent-state/learn/$OWNER/$REPO/[TODAY]/[TIME]_*.md

| File | Description |
|------|-------------|
| repo.md | Hub (links all sessions) |
| [TODAY]/[TIME]_ARCHITECTURE.md | Structure |
| [TODAY]/[TIME]_CODE-SNIPPETS.md | Code examples |
| [TODAY]/[TIME]_QUICK-REFERENCE.md | Usage guide |

**Key Insights**: [2-3 things learned]
```

### --deep mode
```markdown
## 📚 Deep Learning Complete: [REPO]

**Mode**: deep (5 agents)
**Location**: .agent-state/learn/$OWNER/$REPO/[TODAY]/[TIME]_*.md

| File | Description |
|------|-------------|
| repo.md | Hub (links all sessions) |
| [TODAY]/[TIME]_ARCHITECTURE.md | Structure & design |
| [TODAY]/[TIME]_CODE-SNIPPETS.md | Code examples |
| [TODAY]/[TIME]_QUICK-REFERENCE.md | Usage guide |
| [TODAY]/[TIME]_TESTING.md | Test patterns |
| [TODAY]/[TIME]_API-SURFACE.md | Public API |

**Key Insights**: [3-5 things learned]
```

## `.gitignore` Pattern

If this repo commits docs but wants to ignore symlinks only:

```gitignore
.agent-state/learn/**/origin
```

## Optional Memory Connection

After writing docs, you can also record a short local learning note so the repo remembers what was learned:

```bash
mkdir -p "$AGENT_STATE_DIR/memory/learnings"
# Write a small YYYY-MM-DD_slug.md note with 2-3 key insights.
```

## Notes

- `--fast`: 1 agent, quick scan for "what is this?"
- Default: 3 agents in parallel, good balance
- `--deep`: 5 agents, comprehensive for complex repos
- Parallel exploration keeps the learning pass efficient
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
