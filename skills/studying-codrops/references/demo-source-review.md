# Demo and Source Review

## Rendered demo

Check only interactions relevant to the named goal:

- initial/loading/fallback/settled states
- pointer, touch, keyboard, and scroll ownership
- viewport and orientation changes
- transition interruption and rapid repeated input
- reduced motion and focus visibility
- semantic content when canvas/WebGL is unavailable
- mobile inactivity or auto-motion behavior
- loading cost, jank, memory growth, console errors, and context loss
- navigation/history behavior
- text/media readability during motion

Record browser, viewport, state, and observation date. A cover image or video is not live-behavior proof.

## Source relationship

Confirm:

- the article's Code link resolves to the inspected repo
- the repo revision plausibly matches the observed demo
- demo deployment is not a materially different private branch
- package versions and APIs are current enough for the target
- the license covers code and does not imply asset rights

Mark relationship as `matched | partial | drifted | unknown`.

## Architecture

Inspect the smallest useful surface:

- entry point and render/animation owner
- scene/component/state boundaries
- frame loop, scroll synchronization, and event ownership
- timeline/transition lifecycle
- geometry/layout measurement
- shader/material pipeline
- loading, preloading, cleanup, and disposal
- responsive branching and DPR limits
- fallback behavior

## Demo-only signals

- hard-coded viewport or geometry
- no route/history restoration
- asset paths tied to one deployment
- no keyboard/focus semantics
- no reduced-motion path
- one happy-path state
- global listeners without cleanup
- perpetual requestAnimationFrame work while hidden
- no loading/error/context-loss handling
- copied third-party assets or unclear license
- performance proven only on one desktop browser

## Productionization questions

- What user/product job does the effect serve?
- What is the low-motion or non-canvas equivalent?
- Who owns scroll/input/navigation state?
- What happens during interruption, resize, route change, and unmount?
- What is the mobile GPU/memory budget?
- Which dependencies already exist in the target repo?
- Can a CSS/DOM/SVG mechanism deliver the same job more safely?
- Which visual expression must be redesigned rather than copied?

## Source license

Check repository `LICENSE`, package metadata, linked upstream code, and asset credits. If code has no explicit license, discuss it but do not recommend copying. If a permissive code license exists, still exclude fonts, images, audio, video, models, textures, client work, and trademarks unless separately licensed.
