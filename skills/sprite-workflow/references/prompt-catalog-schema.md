# Prompt catalog data contract

`data/prompt-catalog.json` uses schema version 1. Its `entries` are ordered by upstream collection, then source order, followed by the six legacy inline examples.

Each entry requires:

- `id`: stable lowercase kebab-case identifier.
- `collection`: `basic-character`, `profession-character`, `monster`, `monster-girl`, or `legacy-inline`.
- `category`, `title`, `tags`, `templateFamily`: discoverability metadata.
- `positivePrompt`, `negativePrompt`, `notes`: exact original upstream text.
- `sourceLocator`: unique pinned-source path and line locator.
- `sourceHeading`: original Markdown heading, or legacy inline ID.

`data/prompt-templates.json` also uses schema version 1. A template has an ID, description, parameter definitions, and body. Required parameters have `required: true`; optional parameters include a default. Placeholders and parameter definitions must match exactly.

The catalog validator enforces schema versions, all required fields, stable and unique IDs, unique source locators, exact collection totals and overall total, known template families, complete parameter definitions, and the pinned MIT provenance fields.

## Upstream receipt contract

`data/prompt-catalog-upstream-receipt.json` uses schema version 1 and is generated only after a zero-mismatch comparison with the pinned checkout. It contains:

- `upstreamRevision`: the required full Git commit.
- `sourceFileHashes`: SHA-256 of the raw bytes for the four Markdown sources and `src/App.tsx`.
- `collectionCounts` and `entryCount`: the required `21 + 30 + 30 + 20 + 6 = 107` distribution.
- `catalogSha256`: SHA-256 of the raw `prompt-catalog.json` bytes.
- `entries`: catalog-order records with `id`, a SHA-256 for each exact fidelity field, and a canonical per-entry SHA-256.

The fidelity fields are `positivePrompt`, `negativePrompt`, `notes`, `title`, `sourceHeading`, and `sourceLocator`. Field hashes are over UTF-8 text. An entry hash is over newline-terminated canonical JSON containing `id`, `collection`, and those six fields, with keys sorted, no insignificant whitespace, and non-ASCII characters unescaped. Receipt JSON presentation is deterministic: sorted keys, two-space indentation, UTF-8, and one final newline.

The upstream verifier treats parsing and comparison separately. It reports explicit parse-failure counts, rejects missing or malformed fences/properties, and fails before comparison if any source count or collection distribution differs from the pinned `101 Markdown + 6 legacy inline` contract.
