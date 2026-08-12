---
name: template
description: Skill template with Bun Shell pattern. Copy this folder to create new skills.
---

# /template - Skill Template

Copy this folder to create a new skill.

Use this template as a workflow contract, not just a prompt. Keep the skill short enough to load quickly, but explicit enough that another agent can follow the same gates and output shape.

## Trigger-Focused Frontmatter

```yaml
---
name: your-skill-name
description: Action-oriented purpose. Use when the user asks for X, Y, or Z.
---
```

**Description is the trigger signal.** Include the work type, the user intent, and the situations where the skill should load. Avoid generic descriptions like “helps with tasks.”

## Scope and Boundaries

- **In scope**: what this skill owns.
- **Out of scope**: what this skill must not do.
- **Mode boundaries**: flags or arguments that materially change behavior.

If the skill can write files, commit, push, delete, or call remote services, state the approval gate before the workflow.

## Usage

```
/your-skill [args]
```

## Phase Workflow

### Phase 0: Timestamp

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

### Phase 1: Understand

- Resolve repo-local paths before reading/writing state.
- Gather only the context needed for this skill.
- Ask or stop if a missing input would materially change the result.

### Phase 2: Run Script

```bash
bun scripts/main.ts "$ARGUMENTS"
```

Or fallback (if Bun not available):
```bash
npx tsx scripts/main.ts "$ARGUMENTS"
```

### Phase 3: Process Output

Display results from script.

## Stop Gates

- Stop and ask when required inputs are missing or ambiguous.
- Do not infer facts from absent files or empty search results unless the search scope is explicit.
- Do not perform irreversible actions without explicit approval unless the selected mode is itself that approval.

## Output Contract

Return a stable shape, for example:

1. **Summary**
2. **Evidence / files used**
3. **Result**
4. **Next steps**

If there is no actionable result, say so directly and include what was checked.

## Validation / Self-check

Before finishing:

- Confirm generated files exist and are outside forbidden paths.
- Confirm claims are backed by files, command output, or user-provided context.
- Drop or soften claims that lack evidence.
- If paired command wrappers or discovery indexes need updates, update them in the same change.

---

## Creating a New Skill

1. Copy `template/` folder
2. Rename to your skill name
3. Update `SKILL.md`:
   - Change `name:` in frontmatter
   - Change `description:` in frontmatter
   - Update usage instructions
4. Edit `scripts/main.ts` with your logic
5. Test locally with `bun scripts/main.ts`

If your skill reads or writes local `.agent-state` data, do not anchor it to raw cwd. Resolve repo root first, then default `AGENT_STATE_DIR` from that root:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_STATE_DIR="${AGENT_STATE_DIR:-$REPO_ROOT/.agent-state}"
```

## File Structure

```
your-skill/
├── SKILL.md          ← Instructions for Codex
└── scripts/
    └── main.ts       ← Bun Shell logic
```

## Frontmatter Required

If you start from an existing skill instead of the trigger-focused scaffold above, still keep this minimum frontmatter shape:

```yaml
---
name: your-skill-name
description: One line description. Use when user says "X", "Y", or "Z".
---
```

**Note**: Description is the trigger signal. Include action words and use cases.

---

ARGUMENTS: $ARGUMENTS
