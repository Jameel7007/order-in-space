# Milestone 3 report — Geometry laboratory

## Implemented

- A Vite `/lab` application with an orthographic, restrained drawing-in-space visual language.
- `@order-in-space/render`, consuming abstract geometry without scroll knowledge.
- Thick spatial edges rendered as instanced cylinders, triangulated subordinate faces, optional instanced vertex markers, instanced construction spheres, and explicit GPU-resource disposal.
- Wythoff mode with all 18 named forms, three spherical reflection families, adjustable mirror-distance generator, live topology, and a mirror-triangle inset.
- Stable full-group motion plus an explicitly preserved rotational/chiral orbit when moving away from a snub position.
- Packing mode with construction spheres, cuboctahedral-to-icosahedral tightening, contact/radius feedback, and optional face-center dual.
- FCC mode showing the packing-derived rhombic dodecahedral Voronoi cell.
- Desktop/mobile layout, pointer/touch orbit controls, restrained zoom, accessible HTML readouts and form labels, and reduced-motion-aware automatic rotation.
- A GitHub Pages-compatible Vite build with repository-subpath asset routing and a direct `/lab` entry.

## Verification

`npm run check` passes:

- dependency boundaries for 17 geometry and 4 render source files;
- strict TypeScript checking;
- 48 tests across 8 files;
- geometry and renderer library builds;
- the GitHub Pages production build.

The local `/lab` route returned HTTP 200 from the retained development server. The deployment build contains root and direct `lab/index.html` entries, repository-relative static assets, and a `.nojekyll` marker. GitHub Actions repeats the complete check before publishing the artifact.

## Visual check

Open `/lab` and inspect:

1. Wythoff orbit: move each mirror slider, then compare regular, truncation, omnitruncation, and snub positions.
2. Twelve around one: drag the contraction from cuboctahedral to icosahedral and enable the face-center dual.
3. FCC Voronoi cell: verify that spheres remain construction context while edges dominate.
4. Resize below 820 px and verify the canvas/control stack and touch interaction.
5. Enable reduced motion and verify automatic rotation stays disabled.

## Remaining risks

- The minified client JavaScript is approximately 573 kB (145 kB gzip), producing Vite's 500 kB advisory. Most is Three.js; code splitting and import profiling belong in the later performance pass.
- The lab deliberately uses the widely compatible WebGL renderer. WebGPU/TSL should be evaluated only if it visibly improves the final edge system without compromising fallback behavior.
- Browser visual QA was not automated in this milestone. The build, route, and deployment were verified; subjective edge weight, occlusion, and mobile framing should be reviewed in the visible preview before Milestone 4 is declared visually locked.
- Interactive generator changes currently rebuild small geometry resources. This is acceptable for the lab but should be profiled before the scene timeline drives dense updates every frame.

## Next milestone

Milestone 4: visually review the lab, lock edge/faces/background/camera/lighting/typography, and establish representative visual-regression fixtures before implementing Scene 6.
