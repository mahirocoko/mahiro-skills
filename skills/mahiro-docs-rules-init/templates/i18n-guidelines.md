# i18n Guidelines

## Current Reality

- i18n library in use
- how translated copy is written today
- whether messages are inline, extracted, or mixed

## Preferred Direction

- keep render-bound, single-owner copy in the component or route that owns it
- if extracted config or constants contain user-facing copy, store them as translation-safe messages such as Lingui `msg`, not plain strings
- perform translation at the render boundary with `t(...)`, `i18n._(...)`, or `<Trans>` instead of translating early in helpers or constants
- ownership rules for local copy vs shared messages

## Working Rules

- keep JSX-bound or single-owner copy local unless there is real cross-owner reuse
- when extracting shared messages, prefer message descriptors such as `msg` so the render owner can translate them later
- do not extract plain string constants just to make a component shorter
- translate at the render boundary and keep locale-specific formatting in the established i18n area
- explain how to avoid breaking translation ownership when copy moves between owner-local code and shared config
