# Image Cockpit prompt catalog

This lane vendors the 107 prompt examples from [Image Cockpit for Codex Workflows](https://github.com/dreiachse-cyber/image-cockpit-for-codex-workflows) at revision `b997e78609773975a98617568818ac32f40cf1a7`.

## Contents

- `data/prompt-catalog.json`: 101 examples from the four upstream Markdown catalogs and six legacy examples defined inline in `src/App.tsx`.
- `data/prompt-templates.json`: reusable parameterized adaptations grouped by template family.
- `scripts/prompt-catalog.py`: stdlib-only browser, renderer, and validator.
- `scripts/verify-image-cockpit-catalog.py`: strict pinned-upstream parser, comparator, and receipt generator.
- `data/prompt-catalog-upstream-receipt.json`: deterministic source, catalog, field, and entry hashes from the last verified refresh.
- `references/image-cockpit-LICENSE.txt`: the complete upstream MIT license notice.

Collection totals are: basic character 21, profession character 30, monster 30, monster girl 20, and legacy inline 6.

The catalog's `positivePrompt`, `negativePrompt`, and `notes` fields preserve the pinned upstream text. Every record includes a unique source locator and source heading. IDs, categories, tags, and `templateFamily` are local catalog metadata added to make the material discoverable.

## Fidelity boundary

`render-original` returns a preserved original positive prompt. The templates are explicitly adaptations for reuse: a `template-render` result is **not** claimed to be byte-for-byte equal to any original prompt. Use `show --json` when exact original positive and negative fields plus provenance are needed together.

## CLI

Run from any working directory:

```sh
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py list
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py search "forest mage" --json
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py show forest-mage-idle
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py render-original forest-mage-idle
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py template-list
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py template-show humanoid-character --json
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py template-render humanoid-character --param 'subject=a traveling mage'
python3 /path/to/skills/sprite-workflow/scripts/prompt-catalog.py validate --json
```

`list` and `search` accept `--collection`, `--category`, and `--tag`. `--json` may appear before or after the subcommand. Template parameters use repeatable `--param NAME=VALUE`; unknown, duplicate, missing, and empty parameters fail rather than being silently ignored.

## Upstream fidelity verification

Verification requires an Image Cockpit checkout whose `HEAD` is exactly `b997e78609773975a98617568818ac32f40cf1a7`. The verifier rejects a dirty checkout by default, parses the four Markdown catalogs as 101 ordered fenced entries and the six literal legacy objects in `src/App.tsx`, checks the exact source distribution, then compares title, positive prompt, negative prompt, notes, source heading, and source locator.

```sh
python3 skills/sprite-workflow/scripts/verify-image-cockpit-catalog.py \
  --upstream-root /path/to/image-cockpit-for-codex-workflows
```

After a deliberate read-only refresh, add `--write-receipt` to replace the receipt only when the comparison has zero mismatches. `--allow-dirty-worktree` is an explicit escape hatch for reading a local checkout with unrelated changes; it does not relax the pinned revision. The JSON report includes source counts, collection counts, mismatch count, catalog SHA-256, and one deterministic SHA-256 per entry.

The committed receipt lets tests detect catalog or receipt drift without an external clone. It records the pinned revision, hashes of all five upstream source files, collection and total counts, the raw vendored catalog hash, and hashes for every fidelity field and entry.

## Attribution and provenance

The original prompt material is from Image Cockpit for Codex Workflows by `dreiachse-cyber`, licensed under MIT. The complete notice is shipped in `image-cockpit-LICENSE.txt`. The source repository, exact revision, license identifier, and license path are also embedded in `prompt-catalog.json`.
