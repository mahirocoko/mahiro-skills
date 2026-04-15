---
name: learn
description: Explore a codebase with parallel agents — clone, read, and document. Modes — --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo", or shares a GitHub URL to study. Do NOT trigger for finding projects (use /trace), session mining, or cloning for active development (use /project incubate).
---

# /learn - Deep Dive Learning Pattern

Explore a codebase with 3 parallel agents → create organized documentation.

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

## Step 0: Detect Input Type + Resolve Path

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

**CRITICAL: Capture ABSOLUTE paths first (before spawning any agents):**
```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
echo "Learning from: $REPO_ROOT"
```

**IMPORTANT FOR SUBAGENTS:**
When spawning parallel agents, you MUST give them TWO literal paths:
1. **SOURCE_DIR** (where to READ code) - the `origin/` symlink
2. **DOCS_DIR** (where to WRITE docs) - the parent directory, NOT inside origin/

⚠️ **THE BUG**: If you only give agents `origin/` path, they cd into it and write there → files end up in the wrong repo.

**FIX**: Always give BOTH paths as literal absolute values (no variables in the final prompt):

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

## Scope

**For external repos**: Clone with the script first, then explore via `origin/`.

**For local projects already inside the current repo**: Read directly from the local path and write docs into the matching `.agent-state/learn/...` destination.

## Step 1: Detect Mode & Calculate Paths

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

**⚠️ CRITICAL: Create symlink AND date folder FIRST, then spawn agents!**

1. Run the clone + symlink script in Step 0 first
2. Capture TIME with `date +%H%M`
3. Create the date folder: `mkdir -p "$DOCS_DIR"`
4. Capture `DOCS_DIR`, `SOURCE_DIR`, and `TIME` as literal values
5. Then spawn agents with paths including the time prefix

**Multiple runs same day?** Each run gets a unique time prefix → no overwrites.

---

## Mode: --fast (1 agent)

### Single Agent: Quick Overview

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

**Skip to Step 2** after the agent completes.

---

## Mode: Default (3 agents)

Launch 3 agents in parallel. Each prompt must include:
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure
- Entry points
- Core abstractions
- Dependencies

### Agent 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations
- Interesting patterns

### Agent 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does
- Installation
- Key features
- Usage patterns

**Skip to Step 2** after all agents complete.

---

## Mode: --deep (5 agents)

Launch 5 agents in parallel. Each prompt must include:
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

### Agent 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

### Agent 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

### Agent 4: Testing & Quality Patterns → `[TIME]_TESTING.md`
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach

### Agent 5: API & Integration Surface → `[TIME]_API-SURFACE.md`
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture

**Skip to Step 2** after all agents complete.

## Step 2: Create/Update Hub File (`repo.md`)

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

## Output Summary

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
