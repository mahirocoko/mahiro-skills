# Codrops Study Contract

## Evidence status vocabulary

Use only statuses that say what was actually checked:

- `discovered`
- `metadata-checked`
- `read`
- `observed-live`
- `source-inspected`
- `license-checked`
- `blocked`
- `stale`
- `unverifiable`

Do not use `verified` without naming the verified claim and evidence.

## Evidence manifest

```text
Study id:
Mode: map | item | theme | compare | project-fit | refresh
Named decision or learning goal:
Target repo/product, if any:
Retention: session-only | project-private | project-shared
Observed at:

Units:
- role: article | demo | source | showcase | case-study | spotlight | roundup | reference | archive
  canonical URL:
  title:
  author/studio:
  publication date:
  status:
  linked-from:
  source revision/hash, when material:
  license status:
  asset provenance status:
  notes:

Coverage:
- requested:
- selected:
- completed:
- blocked:
- holdout:
```

## Article/case-study claims

```text
Claim:
Evidence URL/section:
Claim owner: author | studio | Codrops editor
Observed independently: yes | no | partial
Confidence:
Decision impact:
```

## Live-demo observation

```text
Demo URL:
Observed at:
Browser/version:
Viewport:
Input: mouse | touch | keyboard | assistive tech | synthetic
State/interaction:
Visible result:
Console/network/performance symptom, if checked:
Responsive result:
Reduced-motion/accessibility result:
Unknowns:
```

## Source finding

```text
Repository URL:
Revision:
License:
Finding:
File/symbol:
Dependency/mechanism:
Article/demo relationship:
Demo-only assumption:
Asset ownership concern:
Target portability:
```

## Transferability matrix

| Finding | Evidence | Transfer class | Target decision | Reason | Risk/unknown |
| --- | --- | --- | --- | --- | --- |
| ... | article/demo/source | reusable/adaptable/inspiration/demo-only/unsuitable/unknown | keep/adapt/reject/prototype/unknown | ... | ... |

## Project-fit output

```text
Target reality:
Named user/product job:
Relevant Codrops evidence:

Keep:
- mechanism/anatomy and why

Adapt:
- what changes through target brand, stack, states, and accessibility

Reject:
- decorative, incompatible, copied, fragile, or unsupported behavior

Prototype:
- smallest experiment, success/failure criteria, target devices

Unknown:
- missing evidence and cheapest disconfirming check

Route:
- learning note | frontend-design | learn | deep-research | bounded implementation
```

## Theme-study saturation

Before collection, define the named decision and strata. During collection, record what each new item changes. Stop when a bounded run adds no new mechanism, counterexample, risk, or decision-relevant evidence. Do not call a corpus adequate merely because a numeric quota was reached.

Keep the holdout sealed until the study method and provisional findings are written. A method that cannot classify unseen Codrops formats without adding ad hoc rules is not ready for durable promotion.
