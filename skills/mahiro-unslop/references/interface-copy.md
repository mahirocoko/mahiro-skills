# Interface-copy lane

Inventory before polishing. Find the actual string owner (component, locale
catalog, CMS or API), read surrounding states, and record the product's nouns,
action verbs, case policy and voice. Follow one vocabulary through each flow.
A deliberate brand voice is not a defect unless it causes ambiguity,
inconsistency, translation risk or a tone the stakes do not support.

## Review against the actual action

- Buttons name the action, usually verb plus object: “Save draft”, “Delete file”.
  Avoid vague “OK” or “Yes” where consequences matter. Icon names describe the
  action, not the glyph; accessibility owners govern markup and announcements.
- Links name the destination and make sense out of context. Distinguish repeated
  “Learn more” links by topic.
- Toggles describe the ON state; avoid double negatives. Preserve established
  semantics and verify what the switch actually controls.
- Errors state what failed and a real next step. Stay calm and avoid blame or
  playful “oops” in high-stakes situations. Do not invent a retry, connection fix
  or support channel that the product cannot offer. Flag unknown recovery.
- Empty states explain the place and one useful next action. Filtered results
  name the query and offer an existing exit such as clearing filters. Persistent
  instructions must not disappear when the state gains content.
- Placeholders show realistic accepted examples, not the only instruction or
  accessible label. Preserve actual validation requirements and input formats.
- Keep routine copy direct; use the product's perspective consistently. Match
  “select”, “tap” or “click” to supported devices. Humor must suit the stakes and
  locale, not a universal ban or a new personality imposed by this skill.

## States and consequences

| State | Pattern, only if behavior supports it |
| --- | --- |
| In progress | “Saving changes…” |
| Complete | “Changes saved” |
| Failed | “Changes not saved. Try again.” with a working retry path |
| Unavailable | State the actual requirement beside the control |
| Partial | “9 of 12 files uploaded. Retry 3 failed files” when retry exists |

A destructive confirmation names the action, object, actual loss, affected people
and reversibility. Buttons name the action and cancel path. Reversible frequent
actions may benefit from undo, but adding undo, confirmation or typed-name guards
is a behavior change: propose it to the product owner, do not implement it during
copy cleanup. Do not promise recovery that does not exist.

## Locale and owner boundaries

Use the repo's existing whole-message and plural mechanism. Preserve keys,
placeholders and source-locale contracts; never concatenate translated sentence
fragments or assume every locale has two plural forms. Reuse established locale
formatters for numbers, dates and lists (or compatible `Intl` APIs where the repo
has no owner). Do not force ICU or a new i18n dependency into another system.
Typography owns truncation and text transformation; layout owns translation room;
accessibility owns accessible-name wiring. Inspect those boundaries when copy
changes length or meaning, but do not claim them verified from strings alone.

## Check and report

Check each changed label against its handler, error against actual recovery, and
term against the inventory. Read locale files as well as components. Compare
placeholders and plural branches. Render affected states for wrapping and
accessible names when tools allow; otherwise state the missing evidence.

Group findings by root cause with location, before, proposed after and impact.
Prioritize misleading actions or hidden recovery over terminology drift and
minor polish. Mark unavailable server/CMS strings “Not verified”; never approve
coverage not inspected. A correct existing string needs no change.
