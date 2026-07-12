# Frontend Evidence Tools

Use the dependency-free `../scripts/evidence.ts` helper when comparison or high-risk rendered QA needs machine-checkable capture identity, interaction-state coverage, same-state closure, or reproducible hashes. It validates artifacts produced by the available browser tool; it does not choose the browser or replace visual judgment.

## Commands

```bash
bun skills/frontend-design/scripts/evidence.ts key <expected-state.json>
bun skills/frontend-design/scripts/evidence.ts validate <evidence-manifest.json>
bun skills/frontend-design/scripts/evidence.ts digest <digest-manifest.json> --write <result.json>
```

All manifest paths are relative to the manifest directory. Absolute paths, parent traversal, duplicate digest paths, missing files, and hash mismatches fail.

## Capture Sidecar

Enter each case from a fresh browser context or explicitly clear lane-owned persisted state. Set language and interaction state before reading the actual DOM. Generate `caseKey` and `stateKey` from the expected state, then name both files from the verified `stateKey`:

```text
captures/<stateKey>.png
sidecars/<stateKey>.json
```

Minimal sidecar shape:

```json
{
  "schemaVersion": 1,
  "toolVersion": "1.0.0",
  "caseKey": "surface--390x844@1--th--expanded--proof--open_proof--motion_settled",
  "stateKey": "surface--390x844@1--th--expanded--proof--open_proof--motion_settled--src_<fingerprint>",
  "artifact": "captures/<stateKey>.png",
  "artifactSha256": "<sha256>",
  "capturedAt": "<ISO timestamp>",
  "status": "pass",
  "maxDocumentOverflowPx": 0,
  "expected": {
    "surface": "surface",
    "origin": "http://127.0.0.1:PORT",
    "route": "/route",
    "surfaceSentinel": "<stable heading/test id/content fingerprint>",
    "sourceFingerprint": "<sha256>",
    "viewport": { "width": 390, "height": 844, "dpr": 1 },
    "language": "th",
    "pressedLanguage": "th",
    "h1": "<expected visible heading>",
    "uiState": "expanded",
    "scrollTarget": "proof",
    "openControls": ["proof"],
    "motion": "settled"
  },
  "actual": {
    "surface": "surface",
    "origin": "http://127.0.0.1:PORT",
    "route": "/route",
    "surfaceSentinel": "<observed sentinel>",
    "sourceFingerprint": "<observed sha256>",
    "viewport": { "width": 390, "height": 844, "dpr": 1 },
    "language": "th",
    "pressedLanguage": "th",
    "h1": "<observed visible heading>",
    "uiState": "expanded",
    "scrollTarget": "proof",
    "openControls": ["proof"],
    "motion": "settled",
    "viewportWidth": 390,
    "documentScrollWidth": 390,
    "fontsReady": true,
    "imagesReady": true,
    "consoleErrors": [],
    "networkErrors": []
  }
}
```

The validator rejects wrong origin/route/sentinel/source, wrong language or selected language control, wrong H1/state/scroll/open controls/motion, viewport mismatch, document-level overflow, unready fonts/media, console/network errors, dishonest filenames, failed status, and artifact hash mismatch.

## Evidence Manifest and Interaction Coverage

```json
{
  "schemaVersion": 1,
  "toolVersion": "1.0.0",
  "requiredCases": ["<caseKey>"],
  "interactionRequirements": [
    {
      "control": "proof inspector",
      "states": {
        "collapsed": "<collapsed caseKey>",
        "expanded": "<expanded caseKey>"
      }
    }
  ],
  "captures": ["sidecars/<stateKey>.json"],
  "closures": []
}
```

Every required case and every declared interaction state must map to an admitted sidecar. Keep intended inner scrollers separate from document overflow: a wide proof may scroll inside its owner, but the document must remain within the configured threshold.

For an issue/fix/recheck loop, append a closure:

```json
{
  "issueId": "overflow-expanded-proof",
  "changeType": "implementation",
  "caseKey": "<same caseKey as the recheck>",
  "beforeStateKey": "<failed capture stateKey>",
  "beforeSourceFingerprint": "<old source fingerprint>",
  "issue": "Expanded proof caused document-level overflow.",
  "fix": "Contained the wide media inside the proof scroller.",
  "afterSidecar": "sidecars/<passing recheck stateKey>.json"
}
```

An implementation fix must change the source fingerprint. A capture-only correction keeps it. Both must preserve `caseKey`; the passing recheck receives a new `stateKey` and artifact.

## Reproducible Digest and Receipts

Digest manifest:

```json
{
  "schemaVersion": 1,
  "packetFiles": ["packet/brief.md", "packet/prompt.txt"],
  "artifactFiles": ["evidence-manifest.json", "sidecars/state.json", "captures/state.png"],
  "receiptFiles": ["receipts/lane.json"]
}
```

Each receipt records:

```json
{
  "schemaVersion": 1,
  "packetDigest": "<computed packet digest>",
  "model": "<model>",
  "effort": "<effort>",
  "sessionId": "<session id>",
  "isolatedWorkdir": "<lane workdir>",
  "timestamp": "<ISO timestamp>",
  "promptSha256": "<sha256>",
  "outputSha256": "<sha256>"
}
```

The packet digest hashes sorted experiment-relative path/hash entries. Receipts must reference that computed packet digest. The experiment digest then binds packet files, artifacts, and receipt bytes. Moving an unchanged experiment to a different absolute checkout must produce the same digests; changing a relative path, prompt, model receipt, output, harness input, or artifact must change the relevant digest.
