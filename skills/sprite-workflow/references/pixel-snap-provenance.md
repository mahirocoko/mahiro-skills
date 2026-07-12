# Pixel-snap provenance

The native-grid lane uses a small Python block-consensus implementation derived from and inspired by the concepts in Sprite Fusion Pixel Snapper, pinned at revision `92173f04a14dfb58081694d8c0351cd1a51ee1a0` (MIT, Copyright 2025 Hugo Duprez). It is not a port verified for exact Rust parity.

The approved-atlas lane follows deterministic, manifest-driven pipeline ideas informed by the chongdashu sprite pipeline (MIT, Copyright 2026 Chong-U Lim). The local implementation is intentionally narrower: hash-pinned approved inputs, containment checks, no transforms, and explicit atlas-space anchors.

See the adjacent upstream MIT notice files. Generated reports retain algorithm identity and relevant input/output hashes; these reports are evidence, not promotion approval.
