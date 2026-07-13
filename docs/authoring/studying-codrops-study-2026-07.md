# Studying Codrops — Initial Corpus and Skill Decisions

**Observed:** 2026-07-13  
**Purpose:** Build a bounded, explicit-trigger skill for learning from Codrops without turning it into universal frontend taste.  
**Retention:** Links, public metadata, original analysis, and procedural contracts only. No article bodies, screenshots, videos, assets, or source snapshots are committed.

## Current live inventory

Evidence came from the public sitemap index, WordPress REST API, live navigation/pages, Creative Hub, Webzibition, and the public `codrops` GitHub organization.

- Initial run: 5,855 sitemap URLs across 12 sitemap families. A later same-day final smoke returned 5,856, confirming that live totals can change during the study.
- 1,694 public WordPress posts.
- 1,117 Creative Hub `web_demo` records.
- 2,331 Webzibition entries.
- 879 legacy Collective records.
- 320 CSS Reference entries.
- 29 entries in the legacy `sketches` custom-post type; broader Creative Hub searches include additional sketch-named demos.
- 504 supporting `news` records.
- 345 public GitHub repositories.

Link counts depend on parser breadth. The initial anchor parser found at least 343 posts with a GitHub link and 113 with a CodePen link; a broader raw-domain recount found 361 and 117 respectively. These are discovery signals, not proof that a link is the article's official source.

## Study method

Use stratified purposive sampling rather than newest/most-popular sampling. Balance:

- editorial lane and evidence job
- current and historical eras
- DOM/CSS/SVG/canvas/WebGL/WebGPU mechanisms
- tutorials, experiments, showcases, production stories, people/process, references, source, and archives
- source availability and license confidence
- low-complexity counterexamples

The initial set contains 58 items. Historical and current WordPress Webzibition item permalinks redirected to the Codrops home page, so the final corpus treats the live Webzibition archive as catalogue provenance and records the external showcased website as the observation target. This failure informed the skill's redirect/staleness checks.

After correction, all 58 final item URLs returned HTTP 200/206 with no unexpected redirect in a bounded low-concurrency validation run. The validation receipt stayed local under `/tmp`; the repo retains the dated method and links rather than a machine-specific fetch artifact.

## Representative set

### Tutorials — 8

1. [Building an Interactive Wave Propagation Cube Grid with Three.js](https://tympanus.net/codrops/2026/07/09/building-an-interactive-wave-propagation-cube-grid-with-three-js/)
2. [Building Persistent Page Transitions with WebGPU and Vanilla JavaScript](https://tympanus.net/codrops/2026/06/30/building-persistent-page-transitions-with-webgpu-and-vanilla-javascript/)
3. [Exploring the HTML-in-Canvas Proposal](https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/)
4. [How to Create an Organic Text Distortion Effect with Infinite Scrolling](https://tympanus.net/codrops/2024/11/06/how-to-create-an-organic-text-distortion-effect-with-infinite-scrolling/)
5. [Transition Effect with CSS Masks](https://tympanus.net/codrops/2016/09/29/transition-effect-with-css-masks/)
6. [The Making of “The Aviator”](https://tympanus.net/codrops/2016/04/26/the-aviator-animating-basic-3d-scene-threejs/)
7. [How to Create (Animated) Text Fills](https://tympanus.net/codrops/2015/02/16/create-animated-text-fills/)
8. [Creating Custom Page Transitions in Astro with Barba.js and GSAP](https://tympanus.net/codrops/2026/04/08/creating-custom-page-transitions-in-astro-with-barba-js-and-gsap/)

### Playground — 7

9. [A Playful Clip Menu with GSAP’s easeReverse](https://tympanus.net/codrops/2026/04/22/a-playful-clip-menu-with-gsaps-easereverse/)
10. [On-Scroll 3D Carousel](https://tympanus.net/codrops/2025/05/07/on-scroll-3d-carousel/)
11. [Animating in Frames: Repeating Image Transition](https://tympanus.net/codrops/2025/04/28/animating-in-frames-repeating-image-transition/)
12. [WebGPU Scanning Effect with Depth Maps](https://tympanus.net/codrops/2025/03/31/webgpu-scanning-effect-with-depth-maps/)
13. [Consecutive Scroll Animations with One Element](https://tympanus.net/codrops/2024/11/20/consecutive-scroll-animations-with-one-element/)
14. [Interactive 3D with Three.js BatchedMesh and WebGPURenderer](https://tympanus.net/codrops/2024/10/30/interactive-3d-with-three-js-batchedmesh-and-webgpurenderer/)
15. [Scroll-based SVG Filter Animations on Text](https://tympanus.net/codrops/2024/08/22/scroll-based-svg-filter-animations-on-text/)

### Creative Hub — 5

16. [Creative Hub](https://tympanus.net/codrops/hub/)
17. [HTML-in-Canvas Examples](https://tympanus.net/codrops/web_demo/html-in-canvas-examples/)
18. [False Earth](https://tympanus.net/codrops/web_demo/false-earth/)
19. [Async Page Transitions](https://tympanus.net/codrops/web_demo/async-page-transitions/)
20. [Gravity-Based Mouse Trail with GSAP](https://tympanus.net/codrops/web_demo/gravity-based-mouse-trail-with-gsap/)

### Webzibition — 5

Catalogue provenance for all five: [Webzibition](https://tympanus.net/codrops/webzibition/).

21. [PX PUSH](https://pxpush.com/)
22. [Le Mans Classic](https://lemansclassic.richardmille.com/)
23. [Nothin’](https://www.noth.in/)
24. [Santioni Spirits](https://santionispirits.com/)
25. [Stefanos Tsitsipas](https://tsitsipas.com/)

### Case Studies — 6

26. [The Sleepers](https://tympanus.net/codrops/2026/07/10/the-sleepers-creating-an-atmospheric-webgl-experience-with-lightweight-techniques/)
27. [Ten Years Away](https://tympanus.net/codrops/2026/07/08/ten-years-away-designing-an-interactive-comic-for-studio375s-tenth-anniversary/)
28. [Shopify Spring ’26 Edition: Everywhere](https://tympanus.net/codrops/2026/06/26/engineering-the-web-experience-behind-shopifys-spring-26-edition-everywhere/)
29. [Fiddle.Digital — The New Us](https://tympanus.net/codrops/2025/03/12/case-study-fiddle-digital-design-agency-the-new-us/)
30. [Windland](https://tympanus.net/codrops/2022/04/25/case-study-windland-an-immersive-three-js-experience/)
31. [Basement Grotesque](https://tympanus.net/codrops/2021/12/13/case-study-a-unique-website-for-basement-grotesque/)

### Studio, Designer, and Developer Spotlights — 6

32. [DashDigital](https://tympanus.net/codrops/2026/06/22/designing-beyond-the-surface-how-dashdigital-turns-complexity-into-clarity/)
33. [Lusion](https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/)
34. [Kevin Lam](https://tympanus.net/codrops/2026/06/25/shaping-stories-into-experience-the-work-of-kevin-lam/)
35. [María Vargas](https://tympanus.net/codrops/2026/03/25/from-web-ui-to-game-ui-how-gaming-creativity-reshaped-maria-vargas-career/)
36. [Cyd Stumpel](https://tympanus.net/codrops/2026/06/17/always-building-always-learning-cyd-stumpels-journey-through-the-modern-web/)
37. [Edoardo Lunardi](https://tympanus.net/codrops/2026/04/02/where-engineering-meets-craft-edoardo-lunardis-obsession-with-the-details/)

### Motion, Website, and Demo Roundups — 6

38. [Motion Highlights #17](https://tympanus.net/codrops/2026/03/29/motion-highlights-17/)
39. [Motion Highlights: Rive Special](https://tympanus.net/codrops/2025/06/05/motion-highlights-rive-special/)
40. [Inspirational Websites Roundup #65](https://tympanus.net/codrops/2024/09/06/inspirational-websites-roundup-65/)
41. [Inspirational Websites Roundup #60](https://tympanus.net/codrops/2024/05/24/inspirational-websites-roundup-60/)
42. [Awesome Demos Roundup #24](https://tympanus.net/codrops/2023/03/16/awesome-demos-roundup-24/)
43. [Awesome Demos from 2018](https://tympanus.net/codrops/2018/12/27/awesome-demos-from-2018/)

### CSS Reference — 5

44. [`linear-gradient()`](https://tympanus.net/codrops/css_reference/linear-gradient/)
45. [`<basic-shape>`](https://tympanus.net/codrops/css_reference/basic-shape/)
46. [`<timing-function>`](https://tympanus.net/codrops/css_reference/timing-function_value/)
47. [`<color>`](https://tympanus.net/codrops/css_reference/color_value/)
48. [`calc()`](https://tympanus.net/codrops/css_reference/calc/)

### Sketches — 2

49. [Sketch 029: Infinite Loop Scrolling (3D Animation)](https://tympanus.net/codrops/web_demo/sketch-029-infinite-loop-scrolling-3d-animation/)
50. [Sketch 022: SVG Path Page Transition (Horizontal)](https://tympanus.net/codrops/web_demo/sketch-022-svg-path-page-transition-horizontal/)

### GitHub Repositories — 4

51. [PageTransitions](https://github.com/codrops/PageTransitions)
52. [HoverEffectIdeas](https://github.com/codrops/HoverEffectIdeas)
53. [SidebarTransitions](https://github.com/codrops/SidebarTransitions)
54. [TypeShuffleAnimation](https://github.com/codrops/TypeShuffleAnimation)

### Collective and Archive Evolution — 4

55. [Collective #1](https://tympanus.net/codrops/collective/collective1/)
56. [Collective #400](https://tympanus.net/codrops/collective/collective-400/)
57. [Collective #879](https://mailchi.mp/codrops/collective879-lkwy)
58. [Collective #915](https://thecollectivenewsletter.beehiiv.com/p/the-collective-915-the-ux-butterfly-effect-fragments-human-coders-are-still-better-than-llms)

## Deep-check exemplars used for the first skill contract

- Wave Propagation Cube Grid: article sections `Project Structure`, `Implementing the mouse trail`, `Propagate waves from the mouse trail`, and `Production-ready optimizations`; Demo and Code links resolved. The linked repo revision, files, and license were not inspected in this pass.
- Ten Years Away: article sections `How the Experience Works`, `Optimizations`, and `Sound as a Chapter`; finished-experience link resolved. No source repository was inspected.
- Creative Hub: current aggregation headings and direct-demo behavior.
- Playground: experiment/concept framing and current list anatomy.
- Webzibition: visual-showcase role and pagination.
- Case Study archive: production-story role and current examples.
- Studio, Designer, and Developer archives: practice/process role.
- Codrops GitHub organization: 345-repository archive scale, names, languages, update metadata, and representative repository selection; no source-file inspection was claimed.
- Sitemap/API inventory: lane scale, custom post types, categories, tags, and archive boundaries.

This is sufficient for the v0 procedural contract, but not a claim that all 58 items were deeply read or visually verified. Future iterations should use a sealed 15–20 item holdout and promote new portable lessons only when unseen formats do not require ad hoc rules.

## Provisional claim-to-evidence map

| Provisional lesson | Evidence anchors | Checked status | Boundary |
| --- | --- | --- | --- |
| Lanes answer different questions | #1, #16–20, #21–25, #26–31, #32–43, #51–54 | Deep-read #1; live archive/list and metadata checks for the other lane families | Taxonomy/analysis method, not a visual rule |
| Join intent, behavior, source, and target adaptation | #1 and #27 | #1 article read and Demo/Code links resolved, but source not inspected; #27 article and finished-experience link read | Missing edges lower confidence |
| One coherent mechanism can carry a signature | #1, #27, #49–50 | #1 and #27 deep-read; Sketch catalogue metadata checked | Hypothesis; not every product needs an effect |
| State continuity matters more than effect count | #2, #5, #10, #19, #49–50 | Metadata/format checks plus current Hub/Playground anatomy | Requires live state testing before implementation advice |
| Creative demos surface production questions | #1, #27, #28 | #1 article sections named above and #27 deep-read; #28 selected from current case-study lane | Do not generalize a disclosed optimization to uninspected items |
| Historical examples retain anatomy value but not implementation authority | #5–7 and #51–54 | URLs/repository metadata checked | Browser, dependency, accessibility, and license require fresh inspection |
| Showcase selection is not implementation endorsement | #21–25 and #38–43 | Live Webzibition/roundup catalogue behavior checked | Curation proves selection only |
| Case studies are contextual, not recipes | #26–31 | #27 deep-read; case-study archive and other item metadata checked | No source-code inference |
| Source availability changes confidence | #1 versus #21–25 and #51–54 | #1 Code link resolved but repo not inspected; showcase/source archive metadata checked | Repository match, revision, license, and assets remain separate gates |
| Diversity checks prevent a false Codrops doctrine | all eleven strata | 58-item stratified manifest and current taxonomy checked | Sampling control, not a claim about every item |

These rows justify the v0 hypotheses in `references/observed-patterns.md`. They deliberately distinguish deep-read, live-list, metadata, and source-link evidence.

## Reproduction recipe

Live inventory:

```bash
bun skills/studying-codrops/scripts/codrops.ts inventory > /tmp/studying-codrops-inventory.json
```

Ordered corpus digest recipe:

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib, re
text = Path('docs/authoring/studying-codrops-study-2026-07.md').read_text()
urls = re.findall(r'^\d+\. \[[^]]+\]\((https?://[^)]+)\)$', text, re.M)
print(len(urls), hashlib.sha256(('\n'.join(urls) + '\n').encode()).hexdigest())
PY
```

Expected ordered set: **58 URLs**, SHA-256 `525ad0cb1a075a1dfa067972d49973c017ab3e327b097dd986e000e578600f08`.

## Skill decisions

- Keep the skill explicit-trigger. After the v0.1.56 install gap, include it in the default bundle because trigger guards prevent ordinary frontend auto-loading while default installation makes the released capability discoverable.
- Keep `frontend-design` as owner of final brand/product decisions.
- Keep live inventory metadata-only and session-only by default; write beneath `.agent-state` only after project-private retention approval.
- Do not package source snapshots, article copies, screenshots, or assets.
- Require article/demo/source role separation, transferability classes, license checks, and project-relative decisions.
- Treat observed patterns as conditional hypotheses rather than a Codrops house style.
