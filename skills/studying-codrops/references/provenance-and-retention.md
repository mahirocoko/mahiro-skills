# Provenance and Retention

## Source classes

Record each unit as one of:

- Codrops editorial page
- Codrops catalogue/custom-post entry
- Codrops-hosted runnable demo
- contributor-hosted demo
- third-party showcase website
- GitHub/source repository
- CodePen or other sandbox
- specification/browser-support reference
- target-repo evidence
- agent observation or inference

Do not let a Codrops link transfer Codrops ownership to third-party work.

## Default retention

Use `session-only`. Store durable project evidence only after explicit approval:

- `project-private`: ignored local `.agent-state/studying-codrops/`
- `project-shared`: reviewed repo documentation with permission and provenance

Never treat a selection or attractive result as automatic approval for durable retention or portable skill doctrine.

## Allowed metadata cache

```json
{
  "title": "...",
  "canonicalUrl": "...",
  "lane": "tutorial|playground|hub|webzibition|case-study|spotlight|roundup|reference|source|archive",
  "authorOrStudio": "...",
  "publishedAt": "...",
  "observedAt": "...",
  "articleStatus": "read",
  "demoStatus": "observed-live",
  "sourceStatus": "source-inspected",
  "sourceRevision": "...",
  "license": "...",
  "retention": "session-only"
}
```

Conservative retention candidates, subject to the source's terms, privacy constraints, and the approved retention scope:

- URLs and public metadata
- original paraphrased analysis
- revision/hash and license identifiers
- file/symbol references
- viewport/state observation notes
- generated comparison and transferability matrices

## Do not retain by default

- article bodies or large quotes
- screenshots, videos, GIFs, or full-page captures
- downloaded demo assets
- fonts, images, audio, models, textures, icons, or client materials
- complete source files or cloned repos inside the skill
- browser profiles, cookies, local storage, auth, or referral identifiers
- a prompt pack that imitates Codrops or a named studio

## Reuse boundary

Prefer mechanism-level learning:

```text
Allowed: cursor proximity controls distortion intensity with a reduced-motion fallback.
Not allowed: recreate the same hero, assets, timing, typography, shaders, and composition.
```

Code reuse requires an explicit compatible license, source-specific provenance review, and target-project acceptance. A repository license does not prove that every contribution, dependency, or embedded asset is owned or covered. Asset reuse requires separate explicit rights. Missing license means no copying recommendation.

## Refresh and staleness

On reuse, compare canonical URL, publication/modified date, source revision, license, demo availability, and observation date. Preserve old observations as dated evidence; do not silently overwrite them as timeless truth.

When public inventory scripts run, use low concurrency, a descriptive user agent, bounded retries, host and redirect validation, request/response limits, and metadata-only output. Do not crawl third-party demos recursively. The bundled helper prints to stdout and accepts only Codrops/Tympanus and GitHub hosts; use browser tooling separately for external demos.
