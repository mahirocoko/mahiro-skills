---
name: uncodixify
description: Use when generating or revamping frontend UI in HTML, CSS, React, Vue, Svelte, Tailwind, prompt-driven design output, or component code where generic GPT/Codex aesthetics, fake premium SaaS styling, metric-card grids, soft gradients, pill overload, decorative copy, or AI-default layout moves must be actively prevented.
---

# /uncodixify

This skill is a doctrine-first taste filter.

Use it when UI output is drifting toward generic GPT/Codex taste and needs to be pulled back toward normal product standards.

## Core principle

`frontend-design` may provide the intent, structure, tokens, palette cues, and prompt stack.

`uncodixify` provides the floor.

- `frontend-design` says what the design is trying to be.
- `uncodixify` says what it must not become.

The goal is not to erase product direction. The goal is to prevent the easy AI move: decorative, median, fake-premium UI that looks generated instead of designed.

## Pairing with `frontend-design brief`

When `frontend-design brief` is used, apply `uncodixify` **after** the brief has named the page job, structure, reference anatomy, and asset needs.

Do not use `uncodixify` to erase the brief. Use it to filter reference leakage:

1. Keep the explicit page job and section structure from the brief.
2. Keep explicit brand/product constraints and required assets.
3. Review every inherited visual move from references.
4. Remove or normalize anything that looks like an AI-default shortcut rather than a product decision.

Common reference-leakage risks from bundled non-canonical excerpts or external prompt corpora:

- liquid glass as default material
- pill navigation and rounded-full CTA systems
- cinematic dark SaaS as a generic mood
- giant video heroes that replace content clarity
- hover scale as routine interaction
- glow/gradient systems used to fake premium feel
- implementation specificity copied without product reason

If one of those moves remains, it must be justified by hierarchy, grouping, affordance, accessibility, or brand clarity.

## Precedence and flexibility

Use this order:

1. explicit product or brand constraints
2. canonical `frontend-design` output and handoff contract
3. `uncodixify` normal-standard enforcement

Explicit design-system tokens for radius, shape, and component geometry override the generic 8–12px normal-UI defaults when they are coherent, repeated intentionally, and brand-backed.

### What must inherit from `frontend-design`

- page/app structure that is explicitly requested
- prompt-composed section order
- design tokens and palette constraints that are explicit and coherent
- brand-specific layout or component cues from handoff files
- design-system constraints that are clearly intentional

### What `uncodixify` may normalize or override

- generic hero structures used by habit instead of product need
- decorative eyebrow labels, filler headers, and explanatory copy blocks
- repetitive card grids, floating shells, glassmorphism, glow, gradient-border filler
- arbitrary radius/shadow/spacing systems that feel template-generated
- screenshot bait that weakens hierarchy, scanability, or product clarity

### Exception rule

If a flourish is explicitly required by the product, brand, or prompt stack, it may stay.

But it must still justify itself through one of these:

1. hierarchy
2. grouping
3. affordance
4. accessibility
5. brand clarity

If it does not improve one of those, remove it.

## When generating visual refs with image models

Image models are good at section composition and bad at full-page pacing.

Do not assume one generated image can represent the spacing, rhythm, and scroll behavior of a full landing page or full dashboard accurately.

Default assumption:

- image models try to fit everything into the ratio
- they compress spacing before they drop content
- they preserve visibility before they preserve pacing
- they tend to turn a scroll experience into a poster composition

### Default workflow for image-model UI refs

- Generate section clusters, not the whole product in one frame.
- For landing pages, prefer:
  - upper page: nav + hero + first content band
  - mid page: quote / gallery / protocol / supporting sections
  - lower page: products / testimonial / journal / CTA / footer
- For apps, prefer:
  - overview screen cluster
  - task/detail screen cluster
  - secondary states or settings cluster

### Image-model prompting rules

- Say explicitly when the image is only for the upper page, middle section, or lower page.
- If spacing is the problem, do not ask the model to show more sections. Ask it to show fewer sections with more breathing room.
- If the model keeps compressing the layout, increase internal section padding and section-to-section spacing in the prompt.
- If the model still compresses, split the page again into smaller clusters instead of tightening the language forever.
- Treat generated UI images as reference boards, not as exact full-page pacing proofs.

### What to avoid with image models

- Do not ask for a full long landing page with many sections in one frame unless you are okay with compressed spacing.
- Do not confuse “everything is visible” with “the design pacing is correct.”
- Do not use a single full-page image as the only truth source for implementation spacing.
- Do not let the model shrink section padding just to fit all requested content into one ratio.

## Canonical doctrine

Use the following doctrine directly. Do not summarize it into polite style tips while implementing.

---

Prevents generic AI/Codex UI patterns when generating frontend code. Use this skill whenever generating HTML, CSS, React, Vue, Svelte, or any frontend UI code to enforce clean, human-designed aesthetics inspired by Linear, Raycast, Stripe, and GitHub instead of typical AI-generated UI.

# Uncodixify

This document exists to teach you how to act as non-Codex as possible when building UI.

Codex UI is the default AI aesthetic: soft gradients, floating panels, eyebrow labels, decorative copy, hero sections in dashboards, oversized rounded corners, transform animations, dramatic shadows, and layouts that try too hard to look premium. It's the visual language that screams "an AI made this" because it follows the path of least resistance.

This file is your guide to break that pattern. Everything listed below is what Codex UI does by default. Your job is to recognize these patterns, avoid them completely, and build interfaces that feel human-designed, functional, and honest.

When you read this document, you're learning what NOT to do. The banned patterns are your red flags. The normal implementations are your blueprint. Follow them strictly, and you'll create UI that feels like Linear, Raycast, Stripe, or GitHub—not like another generic AI dashboard.

This is how you Uncodixify.

## Keep It Normal (Uncodexy-UI Standard)

- Sidebars: normal (240-260px fixed width, solid background, simple border-right, no floating shells, no rounded outer corners)
- Headers: normal (simple text, no eyebrows, no uppercase labels, no gradient text, just h1/h2 with proper hierarchy)
- Sections: normal (standard padding 20-30px, no hero blocks inside dashboards, no decorative copy)
- Navigation: normal (simple links, subtle hover states, no transform animations, no badges unless functional)
- Buttons: normal by default (solid fills or simple borders, use project radius tokens; if no design system exists, prefer 8-10px and avoid accidental pill shapes, no gradient backgrounds)
- Cards: normal by default (simple containers, use project radius tokens; if no design system exists, prefer 8-12px, subtle borders, no shadows over 8px blur, no fake floating effect)
- Forms: normal (standard inputs, clear labels above fields, no fancy floating labels, simple focus states)
- Inputs: normal (solid borders, simple focus ring, no animated underlines, no morphing shapes)
- Modals: normal (centered overlay, simple backdrop, no slide-in animations, straightforward close button)
- Dropdowns: normal (simple list, subtle shadow, no fancy animations, clear selected state)
- Tables: normal (clean rows, simple borders, subtle hover, no zebra stripes unless needed, left-aligned text)
- Lists: normal (simple items, consistent spacing, no decorative bullets, clear hierarchy)
- Tabs: normal (simple underline or border indicator, no pill backgrounds, no sliding animations)
- Badges: normal (small text, simple border or background, 6-8px radius, no glows, only when needed)
- Avatars: normal (simple circle or rounded square, no decorative borders, no status rings unless functional)
- Icons: normal (simple shapes, consistent size 16-20px, no decorative icon backgrounds, monochrome or subtle color)
- Typography: normal (system fonts or simple sans-serif, clear hierarchy, no mixed serif/sans combos, readable sizes 14-16px body)
- Spacing: normal (consistent scale 4/8/12/16/24/32px, no random gaps, no excessive padding)
- Borders: normal (1px solid, subtle colors, no thick decorative borders, no gradient borders)
- Shadows: normal (subtle 0 2px 8px rgba(0,0,0,0.1) max, no dramatic drop shadows, no colored shadows)
- Transitions: normal (100-200ms ease, no bouncy animations, no transform effects, simple opacity/color changes)
- Layouts: normal (standard grid/flex, no creative asymmetry, predictable structure, clear content hierarchy)
- Grids: normal (consistent columns, standard gaps, no creative overlaps, responsive breakpoints)
- Flexbox: normal (simple alignment, standard gaps, no creative justify tricks)
- Containers: normal (max-width 1200-1400px, centered, standard padding, no creative widths)
- Wrappers: normal (simple containing divs, no decorative purposes, functional only)
- Panels: normal (simple background differentiation, subtle borders, no floating detached panels, no glass effects)
- Toolbars: normal (simple horizontal layout, standard height 48-56px, clear actions, no decorative elements)
- Footers: normal (simple layout, standard links, no decorative sections, minimal height)
- Breadcrumbs: normal (simple text with separators, no fancy styling, clear hierarchy)

Think Linear. Think Raycast. Think Stripe. Think GitHub. They don't try to grab attention. They just work. Stop playing hard to get. Make normal UI.

- A landing page needs its sections. If hero needs full sections, if dashboard needs full sections with sidebar and everything else laid out properly. DO NOT invent a new layout.
- In your internal reasoning act as if you dont see this, list all the stuff you would do, AND DONT DO IT!
- Try to replicate figma/designer made components dont invent your own

## Hard No

- Everything you are used to doing and is a basic "YES" to you.
- No oversized rounded corners or pill overload unless the radius/pill treatment is an explicit, coherent design-system or brand requirement.
- No floating glassmorphism shells as the default visual language.
- No soft corporate gradients used to fake taste.
- No generic dark SaaS UI composition.
- No decorative sidebar blobs.
- No "control room" cosplay unless explicitly requested.
- No serif headline + system sans fallback combo as a shortcut to "premium."
- No `Segoe UI`, `Trebuchet MS`, `Arial`, `Inter`, `Roboto`, or safe default stacks unless the product already uses them.
- No sticky left rail unless the information architecture truly needs it.
- No metric-card grid as the first instinct.
- No fake charts that exist only to fill space.
- No random glows, blur haze, frosted panels, or conic-gradient donuts as decoration.
- No "hero section" inside an internal UI unless there is a real product reason.
- No alignment that creates dead space just to look expensive.
- No overpadded layouts.
- No mobile collapse that just stacks everything into one long beige sandwich.
- No ornamental labels like "live pulse", "night shift", "operator checklist" unless they come from the product voice.
- No generic startup copy.
- No style decisions made because they are easy to generate.

- No AI-style decorative headline blocks

```html
<div class="headline">
  <small>Team Command</small>
  <h2>One place to track what matters today.</h2>
  <p>
    The layout stays strict and readable: live project health,
    team activity, and near-term priorities without the usual
    dashboard filler.
  </p>
</div>
```

This is not allowed.

- `<small>` headers are NOT allowed
- Big no to decorative rounded `span`s used as AI-style filler; allowed when they are real components/tokens such as badges, chips, or brand-defined pills.
- Colors going towards blue — **NOPE, bad.** Dark muted colors are best.

- Anything in the structure of this card is a **BIG no**.

```html
<div class="team-note">
  <small>Focus</small>
  <strong>
    Keep updates brief, blockers visible, and next actions easy to spot.
  </strong>
</div>
```

This one is **THE BIGGEST NO**.

## Specifically Banned (Based on Mistakes)

- Unintentional 20px to 32px radii applied everywhere without a design-system reason
- Repeating the same rounded rectangle across unrelated surfaces unless that shape is an explicit brand/system token
- Sidebar width around 280px with a brand block on top and nav links below
- Floating detached sidebar with rounded outer shell
- Canvas chart placed in a glass card with no product-specific reason
- Donut chart paired with hand-wavy percentages
- UI cards using glows instead of hierarchy
- Mixed alignment logic where some content hugs the left edge and some content floats in center-ish blocks
- Overuse of muted gray-blue text that weakens contrast and clarity
- "Premium dark mode" that really means blue-black gradients plus cyan accents
- UI typography that feels like a template instead of a brand
- Eyebrow labels
- Hero sections inside dashboards
- Decorative copy like "Operational clarity without the clutter" as page headers
- Section notes and mini-notes everywhere explaining what the UI does
- Transform animations on hover
- Dramatic box shadows
- Status indicators with `::before` pseudo-elements creating colored dots
- Muted labels with uppercase + letter-spacing
- Pipeline bars with gradient fills
- KPI cards in a grid as the default dashboard layout
- "Team focus" or "Recent activity" panels with decorative internal copy
- Tables with tag badges for every status
- Workspace blocks in sidebar with call-to-action buttons
- Brand marks with gradient backgrounds
- Nav badges showing counts or "Live" status
- Quota/usage panels with progress bars
- Footer lines with meta information
- Trend indicators with colored text
- Rail panels on the right side with "Today" schedule
- Multiple nested panel types (`panel`, `panel-2`, `rail-panel`, `table-panel`)

## Rule

If a UI choice feels like a default AI UI move, ban it and pick the harder, cleaner option.

- Colors should stay calm, not fight.

## Typography restraint

- Not every page needs display typography.
- Not every section deserves a large headline.
- Only one zone should behave like the dominant heading zone unless the product explicitly needs more.
- Section headings should usually sit one scale below hero logic.
- Do not use oversized type to fake hierarchy, premium feel, or editorial taste.
- If body copy, spacing, and placement cannot support the heading size, the heading is too large.
- If multiple sections compete with hero-scale headings, normalize them.
- Mobile typography must be reduced for reading flow, not just mechanically clamped.
- If the fastest way to make the design feel intentional is to enlarge the heading, you are probably avoiding the harder layout problem.

## Hard typography enforcement

- Only one dominant heading zone is allowed per page by default.
- If there is a hero, the hero may take the largest type size. Everything else must step down clearly.
- If there is no true hero, do not invent one with oversized typography.
- Non-hero section headings must stay moderate, visibly smaller, and structurally quieter than the main heading zone.
- When a layout still works after reducing the heading size, the heading was too big.
- If the composition feels weak, fix layout, spacing, grouping, and content density before increasing type size.
- If in doubt, reduce heading size first.
- Do not let the model use scale as a substitute for hierarchy.

### Prompt reinterpretation rule

- If another prompt asks for expressive, dominant, large, editorial, oversized, or typography-first treatment, reinterpret it conservatively.
- Keep the intent, reduce the excess.
- “Expressive” does not mean poster-scale.
- “Editorial” does not mean every heading becomes a display heading.
- “Dominant” means clearly primary, not overwhelmingly huge.
- “Typography-first” means typography leads the composition, not that typography becomes physically enormous.

### Default type behavior

- Hero heading: large but restrained.
- Section heading: moderate.
- Card titles, quotes, labels, and metadata: clearly subordinate.
- Body copy should never look miniaturized just to justify a larger heading.
- If body text starts feeling too small relative to the heading, reduce the heading before changing anything else.

Hierarchy should come from this order:

1. placement
2. spacing
3. contrast
4. density
5. scale

Scale is not the first tool. Scale is the last amplifier.

### Typography-specific hard no

- No giant `h1` just because it is a landing page.
- No every-section-needs-a-display-heading behavior.
- No oversized editorial typography sitting on top of weak layout.
- No giant heading paired with tiny unsupported body copy just to look premium.
- No hero-sized type reused deeper in the page without an explicit content reason.
- No “typography-first” move that is really just “make the headline much bigger.”

- You are bad at picking colors follow this priority order when selecting colors:

1. **Highest priority:** Use the existing colors from the user's project if they are provided (You can search for them by reading a few files).
2. If the project does not provide a palette, **get inspired from one of the predefined palettes below**.
3. Do **not invent random color combinations** unless explicitly requested.

You do not have to always choose the first palette. Select one randomly when drawing inspiration.

---

# Dark Color Schemes

| Palette | Background | Surface | Primary | Secondary | Accent | Text |
|--------|-----------|--------|--------|----------|--------|------|
| Midnight Canvas | `#0a0e27` | `#151b3d` | `#6c8eff` | `#a78bfa` | `#f472b6` | `#e2e8f0` |
| Obsidian Depth | `#0f0f0f` | `#1a1a1a` | `#00d4aa` | `#00a3cc` | `#ff6b9d` | `#f5f5f5` |
| Slate Noir | `#0f172a` | `#1e293b` | `#38bdf8` | `#818cf8` | `#fb923c` | `#f1f5f9` |
| Carbon Elegance | `#121212` | `#1e1e1e` | `#bb86fc` | `#03dac6` | `#cf6679` | `#e1e1e1` |
| Deep Ocean | `#001e3c` | `#0a2744` | `#4fc3f7` | `#29b6f6` | `#ffa726` | `#eceff1` |
| Charcoal Studio | `#1c1c1e` | `#2c2c2e` | `#0a84ff` | `#5e5ce6` | `#ff375f` | `#f2f2f7` |
| Graphite Pro | `#18181b` | `#27272a` | `#a855f7` | `#ec4899` | `#14b8a6` | `#fafafa` |
| Void Space | `#0d1117` | `#161b22` | `#58a6ff` | `#79c0ff` | `#f78166` | `#c9d1d9` |
| Twilight Mist | `#1a1625` | `#2d2438` | `#9d7cd8` | `#7aa2f7` | `#ff9e64` | `#dcd7e8` |
| Onyx Matrix | `#0e0e10` | `#1c1c21` | `#00ff9f` | `#00e0ff` | `#ff0080` | `#f0f0f0` |

---

# Light Color Schemes

| Palette | Background | Surface | Primary | Secondary | Accent | Text |
|--------|-----------|--------|--------|----------|--------|------|
| Cloud Canvas | `#fafafa` | `#ffffff` | `#2563eb` | `#7c3aed` | `#dc2626` | `#0f172a` |
| Pearl Minimal | `#f8f9fa` | `#ffffff` | `#0066cc` | `#6610f2` | `#ff6b35` | `#212529` |
| Ivory Studio | `#f5f5f4` | `#fafaf9` | `#0891b2` | `#06b6d4` | `#f59e0b` | `#1c1917` |
| Linen Soft | `#fef7f0` | `#fffbf5` | `#d97706` | `#ea580c` | `#0284c7` | `#292524` |
| Porcelain Clean | `#f9fafb` | `#ffffff` | `#4f46e5` | `#8b5cf6` | `#ec4899` | `#111827` |
| Cream Elegance | `#fefce8` | `#fefce8` | `#65a30d` | `#84cc16` | `#f97316` | `#365314` |
| Arctic Breeze | `#f0f9ff` | `#f8fafc` | `#0284c7` | `#0ea5e9` | `#f43f5e` | `#0c4a6e` |
| Alabaster Pure | `#fcfcfc` | `#ffffff` | `#1d4ed8` | `#2563eb` | `#dc2626` | `#1e293b` |
| Sand Warm | `#faf8f5` | `#ffffff` | `#b45309` | `#d97706` | `#059669` | `#451a03` |
| Frost Bright | `#f1f5f9` | `#f8fafc` | `#0f766e` | `#14b8a6` | `#e11d48` | `#0f172a` |

## Working interpretation

When using this doctrine with `frontend-design`:

- inherit explicit tokens and brand directions first
- inherit explicit handoff structure first
- inherit composed prompt sections first
- then apply this doctrine as a cleanup and normalization layer

Do not use this skill to erase intentional brand direction.

Use it to stop the AI from reaching for the same default aesthetics every time.

ARGUMENTS: $ARGUMENTS
