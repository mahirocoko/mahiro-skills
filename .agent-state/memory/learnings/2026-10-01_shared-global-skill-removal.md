---
artifact: reference-learning
authority: non-canonical
status: candidate
source: .agent-state/memory/retrospectives/2026-10/01/10.45_global-skill-uninstall.md
tags: [skills, uninstall, provenance, recovery]
---

# Shared global skill removal

**Intent:** Remove one explicitly selected global skill without deleting another agent's independent same-name copy or reporting a false success.

**Trigger:** An external skills CLI reports a successful scoped removal, but multiple installed agents can resolve the same canonical skill directory (for example `~/.agents/skills/<name>`), or the skill has unowned adapter symlinks.

**Action:** Verify the exact official lock entry and on-disk Git tree for the selected skill, enumerate known direct and aliased dependencies, obtain named consent for existing exact links, and compare canonical/lock/link postconditions. If the upstream CLI's scope cannot remove that one canonical entry without touching independent copies, use only an explicitly owned, journaled exact-entry transaction with pre-write revalidation and pre-cleanup rollback.

**Boundary:** This is a local global-skill manager reference, not permission for bundle-installer uninstall or arbitrary HOME cleanup. Do not widen upstream `--agent` targets without proving every same-name native destination is manager-owned. Cross-process writes and partly deleted staged payloads can defeat automatic recovery; stop and inspect rather than rebuilding missing data.

**Rationale:** A CLI's successful exit can leave a shared canonical folder and lock entry intact while a broader remove can destroy unrelated native copies. Ownership, provenance, and durable postconditions are distinct evidence gates.
