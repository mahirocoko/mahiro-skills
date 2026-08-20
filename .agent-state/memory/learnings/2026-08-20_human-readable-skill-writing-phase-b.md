# Write skills as field guides for humans and contracts for agents

**Tags**: skill-authoring, human-readable, progressive-disclosure, decision-sequence, documentation, verification

A reusable skill has two readers. The agent needs a precise trigger, bounded workflow, stop conditions, resources, output shape, and proof. The human needs to understand the problem, operating posture, decision model, rationale, and ownership boundaries well enough to inspect the skill and learn from it.

Use this layered shape when the job is non-trivial:

1. Open with the problem and useful result.
2. State the operating posture when judgment matters.
3. Put ownership boundaries and handoffs near the beginning.
4. Order the body by decisions: frame, ground, decide, act, verify, hand off.
5. Explain why only where it changes future behavior.
6. Use one representative example to teach a decision or boundary.
7. Move branch-specific detail into focused references and say when to load them.
8. Keep machine contracts visible, but do not make schemas and warnings the reader's first experience.

Do not rewrite an existing skill catalog merely to normalize headings. Update the canonical authoring guide and template first, pilot the shape on a small number of materially different skills, and migrate other skills only when real work exposes a readability problem.

Writing-only refactors can still change behavior through stale internal labels and handoffs. After reorganizing Markdown, search for old step names and capability phrases, exercise the real generated scaffold, run focused contract checks, and use an independent verifier. Test structural ownership and outputs rather than freezing incidental prose.
