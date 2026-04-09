# Checklist

Use this before declaring the init pass complete.

## Truth Check

- Are all commands verified from the repo?
- Does every current-state claim come from code, config, scripts, or repeated patterns?
- Are missing layers labeled as missing instead of described as current?

## Family Check

- Does `docs/onboarding.md` link to every generated page?
- Do the pages share a consistent voice and structure?

## Scope Check

- Did the skill avoid roadmap, business-strategy, or filler docs?
- Did conditional pages only appear when the repo had signals for them?

## Quality Check

- Does each page answer a real repo question?
- Would a new engineer trust this docs set after reading it?
- Does any page feel like generic AI filler?
- If the repo uses Lingui or similar i18n, do the docs distinguish extracted `msg`-style messages from translation at the render boundary?
- Do any pages recommend shared UI, variant helpers, or styling abstractions before there is real cross-owner need?
- Is owner-local posture still clear for single-owner copy, styling, and small helpers?
