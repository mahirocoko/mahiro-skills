# Formatting ([Formatter Name])

This page may carry both observed repo behavior and the preferred formatting blueprint the repo should stay close to.

## Current Reality

- **Formatter**: [formatter name and version if known]
- **Config file**: `[config file path]`
- **Auto-run posture**: [runs through formatter only / runs through lint + formatter / handled by pre-commit or CI / manual only]

If formatting is only partially enforced, say that clearly instead of implying the repo already has a strict formatter pipeline.

## Preferred Formatting Blueprint

Use this section to preserve the repo or house style posture when the skill is bootstrapping docs for an early codebase.

- Keep the formatting doctrine strong enough that contributors can see the intended style direction immediately.
- If the repo is aligned to a house style such as Mahiro style, reflect that shape here even if enforcement is still incomplete.
- Do not fabricate local commands or config files just to support the blueprint.

## Formatting Commands

Use only verified repo commands here.

```bash
# Check formatting
[verified formatting check command]

# Auto-fix formatting
[verified formatting write command]

# Check linting
[verified lint command]

# Auto-fix linting issues
[verified lint --fix command if available]

# Check both
[verified combined command if available]

# Auto-fix both
[verified combined write command if available]
```

If the repo only exposes one combined command, keep only that instead of padding the section with guesses.

## Core Rules

### Indentation & Spacing

- **Indent width**: [value]
- **Indent style**: [Space/Tab]
- **Line ending**: [LF/CRLF]
- **Trailing whitespace**: [trimmed by formatter / not explicitly enforced]

### Quotes & Semicolons

- **JavaScript/TypeScript quotes**: [Single/Double]
- **JSX quotes**: [Single/Double]
- **Semicolons**: [Always / Omit where possible / formatter default]

### Line Width & Wrapping

- **Maximum width**: [value]
- **Wrap behavior**: [[formatter] wraps automatically / repo follows formatter default]

### Trailing Commas

- **JavaScript/TypeScript**: [All / ES5 / None]
- **JSON**: [None / formatter default]

### Brackets & Attributes

- **Bracket spacing**: [Enabled/Disabled]
- **Closing bracket placement**: [Same line / formatter default]
- **Multi-line attributes or props**: [formatter default / repo-specific note]

### Arrow Functions

- **Parentheses**: [Always required / omitted for single param / formatter default]

```ts
// Preferred
items.map((item) => item.id)

// Avoid if the repo keeps arrow params wrapped
items.map(item => item.id)
```

## Repo-Faithful Example

Use a real-looking example that matches the repo's intended formatting posture, not just the most accidental current file shape.

```tsx
[repo-faithful example that matches the formatter and export posture]
```

## Ignore and Override Syntax

Document this only if the repo actually uses inline ignore comments or file-level formatter escape hatches.

```ts
// [real ignore syntax]
const data: unknown = fetchData()
```

If the repo has no local override syntax in use, replace this block with a short note instead of inventing one.

## Preferred Direction

- Keep formatting guidance aligned with the actual formatter config, not team habit.
- Prefer one verified write command contributors can run before commit.
- If lint and formatting overlap, document which tool is the source of truth.
- Keep enough blueprint in the page that a new repo still inherits the intended style posture on day one.
