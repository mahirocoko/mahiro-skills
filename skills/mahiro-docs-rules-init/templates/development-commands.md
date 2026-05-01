# Development Commands

## Quick Start

```bash
# Install dependencies
[verified install command]

# Start development server
[verified dev command]
```

If the repo has more than one app or package surface, add the most useful app-specific commands here too.

Do not pad this section with secondary commands if the repo only has one normal way to start development.

## Building

```bash
# Production build
[verified build command]

# Preview built output
[verified preview/start command if available]
```

**Note**: [Explain when build should run, such as routing/build changes, release checks, or production-facing PRs.]

If the repo has no preview command, remove that line instead of leaving a weak placeholder.

## Linting & Formatting

```bash
# Lint
[verified lint command]

# Format
[verified format command if available]

# Direct formatter or linter commands
[verified direct tool commands if useful]
```

**Always run after making changes**:

```bash
[verified post-change verification cadence]
```

If the repo has no format script, keep this section but say so directly instead of pretending one exists.

If formatting is handled indirectly through ESLint or editor defaults, say that explicitly and avoid calling it a dedicated formatter workflow.

If the repo has only one trustworthy lint command, prefer that over a long list of raw tool invocations.

## Type Checking

```bash
[verified typecheck command if available]
```

Remove this section only if the repo truly has no separate typecheck step.

If type checking is already part of `build`, say whether this standalone command is faster or preferred during normal iteration.

## Internationalization

If the repo has i18n, document the real update command here.

```bash
[verified i18n extraction or compile command]
```

Add a short explanation only if the repo actually has an i18n workflow.

Otherwise omit this section entirely.

## Testing

[Document the real test posture. If no test framework exists, say so directly.]

If tests exist, prefer the commands contributors will actually run most often, such as one default test command and one watch command if both are established.

## Dependency Management

```bash
# Install dependencies
[verified install command]

# Add dependency
[verified add dependency command if the package manager posture is clear]

# Add dev dependency
[verified add dev dependency command if the package manager posture is clear]
```

Include version-pin guidance only if the repo actually enforces or consistently uses it.

If dependency addition is sensitive in this repo, say why in one short line.

## Verification Cadence

Every completed task should run:

```bash
[verified verification sequence]
```

Keep this sequence short and realistic. It should reflect the minimum trustworthy check set for normal code changes, not an idealized full release checklist.
