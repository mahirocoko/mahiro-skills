---
installer: local-skill-bundle v1.6.0
name: project
description: v1.6.0 G-SKLL | Clone and track external repos. Use when user shares GitHub URL to study or develop, or says "search repos", "find repo", "where is [project]". Actions - learn (clone for study), incubate (clone for development), search/find (search repos), list (show tracked).
---

# project-manager

Track and manage external repos: Learn (study) | Incubate (develop)

## Golden Rule

**ghq owns the clone → .agent-state/ owns the symlink**

Never copy. Always symlink. One source of truth.

## When to Use

Invoke this skill when:
- User shares a GitHub URL and wants to study/clone it
- User mentions wanting to learn from a codebase
- User wants to start developing on an external repo
- Need to find where a previously cloned project lives
