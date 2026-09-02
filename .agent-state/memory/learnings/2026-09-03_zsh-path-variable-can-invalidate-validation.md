---
artifact: reference-learning
authority: non-canonical
status: candidate
source: .agent-state/memory/retrospectives/2026-09/03/06.27_direct-cli-latest-model-routing.md
---

# Fail closed when zsh validation loops touch executable lookup

## Intent

Keep shell-based validation evidence trustworthy when iterating over filesystem targets in zsh.

## Trigger

A validation command uses a zsh loop, assigns shell variables, invokes external tools, and reports per-target PASS/FAIL results.

## Action

Avoid zsh special parameter names such as lowercase `path`; use a purpose-specific name such as `skill_file`. Enable fail-fast behavior, check every command's exit status, and use a resolved executable path when executable lookup is itself part of the risk.

## Boundary

This is a zsh-oriented validation guard, not a requirement to hard-code executable paths in ordinary portable scripts. In POSIX shell or Bash, still avoid ambiguous global names and require command failures to invalidate the check.

## Rationale

In zsh, assigning to `path` mutates the tied `PATH` parameter. A loop can therefore make later tools appear missing. Without fail-fast behavior, the script may continue and print PASS lines even though the actual assertions never ran.

Tags: shell, zsh, validation, fail-closed, evidence
