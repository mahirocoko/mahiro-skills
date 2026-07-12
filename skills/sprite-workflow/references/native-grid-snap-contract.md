# Native-grid snap contract

This optional recovery lane handles only square, axis-aligned PNGs with opaque or binary alpha pixels. It never overwrites the source, upscales, chroma-keys, promotes, trims, or rotates.

Modes:
- `inspect` records a selected integer grid and confidence without writing pixels.
- `explicit --grid-size N` checks the requested block size and refuses weak evidence.
- `auto` selects a high-confidence repeated block grid only when the scale evidence is unambiguous. Multiple perfect nested scales, including flat-color inputs, are refused; use `explicit --grid-size N` only when an approved source contract establishes the intended pitch.

The stable algorithm requires at least 99.5% dominant-pixel agreement and 95% exact cells. It refuses non-square, continuous-alpha, continuous-tone/high-color, fallback-only, and low-confidence inputs. Reports pin source/output SHA-256, source cuts, cell size, native dimensions, candidates, confidence, algorithm name, and upstream revision. Pillow is optional; commands fail with an installation instruction when absent.

This implementation is MIT-derived/inspired by Sprite Fusion Pixel Snapper revision `92173f04a14dfb58081694d8c0351cd1a51ee1a0`. It does **not** claim exact Rust parity.
