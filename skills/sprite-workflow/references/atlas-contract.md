# Approved atlas contract

Atlas assembly accepts a JSON manifest only when `provenance.usage` is exactly `production-approved`. Every frame must provide a unique `id`, unique `(state, index)`, relative `file`, SHA-256, exact `[width, height]`, and in-frame integer `anchor`.

New manifests must also carry a valid `sourceRequirement`; atlas assembly runs the source-authorship validator before reading their frames. Older standalone manifests without this field fail closed by default. The exceptional path requires both `--allow-legacy-provenance` and `--legacy-provenance-review <review.json>`. The review uses `schemaVersion: 1`, `decision: approved-legacy-provenance`, non-empty `reviewer`, `reviewedAt`, and `reason`, plus `sourceManifestSha256` bound to the exact input manifest. Job-bound and previously promoted manifests cannot use the legacy path; both promotion commands stamp `provenance.sourceWorkflow`. The atlas manifest records the review file hash and review identity for auditability.

Frame paths must remain under the manifest directory. Symlinks and path traversal are refused. Inputs must be PNGs matching their hashes and dimensions. Assembly preserves manifest order and performs no scaling, trimming, or rotation.

Layouts are deterministic: `row` uses one row, `column` one column, and `compact` uses `ceil(sqrt(frameCount))` columns. Variable cells use deterministic per-column widths and per-row heights. The output records source and atlas hashes, source frame hashes, atlas rectangles, atlas-space anchors, transform policy, and layout algorithm. `validate-atlas-manifest.py` rechecks provenance, hashes, unique identity, geometry, anchors, and transform policy.
