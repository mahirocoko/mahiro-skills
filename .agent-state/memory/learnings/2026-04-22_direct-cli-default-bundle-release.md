# Lesson Learned: Package the doctrine with the skill

**Date**: 2026-04-22
**Tags**: packaging, release, skills, bundle, direct-cli
**Slug**: direct-cli-default-bundle-release

When a workflow guide is meant to be installed and reused, the safest pattern is to package the long-form doctrine inside the skill subtree instead of leaving it only in repo-top documentation. A thin `SKILL.md` plus a preserved companion playbook keeps the entrypoint small while ensuring the actual operator knowledge ships with the installed artifact.

This session also reinforced that “add it to the default bundle” is a multi-surface change. In `mahiro-skills`, bundle promotion has to line up across `.claude-plugin/marketplace.json`, planner tests, install expectations, README inventory, and dry-run planner output. Treating release work as test-driven was valuable because version-pinned tests immediately exposed lingering `v0.1.14` expectations when the patch bump moved to `v0.1.15`.

The reusable lesson is simple: if the change affects packaging, assume it affects inventory, planning, installation, and release surfaces together. Update those as one unit, then let verification prove the release story is coherent.
