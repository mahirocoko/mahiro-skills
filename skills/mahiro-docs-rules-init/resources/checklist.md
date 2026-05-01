# Checklist

Use this before declaring the init pass complete.

## Truth Check

- Are all commands verified from the repo?
- Does every current-state claim come from code, config, scripts, or repeated patterns?
- Are missing layers labeled as missing instead of described as current?
- Are Mahiro-style preferences kept out of `Current Reality` unless the repo proves them?
- Are fallback rules labeled as `Preferred Direction`, `Not Established Yet`, or `Adoption Triggers`?

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
- If the repo is Next App Router plus REST/API, do the docs make services and route orchestration the preferred owner shape without overclaiming?
- If the repo is React Router Framework plus Supabase-direct, do the docs allow hook-owned data access without forcing a service layer?
- Do any pages recommend shared UI, variant helpers, or styling abstractions before there is real cross-owner need?
- Is owner-local posture still clear for single-owner copy, styling, and small helpers?
- Would a reader be able to tell repo fact from Mahiro fallback without asking the author?
- Did every blueprint-style recommendation preserve local repo reality first?
- Are section comments or dividers described as a shortcut for long files, not a rule for every file?
- Did any example accidentally introduce a folder path the repo does not use?
