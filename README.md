# Order in Space

Order in Space is a geometry-first, scroll-driven study of polyhedral construction. The repository was initialized from an empty workspace on 2026-08-12.

All seven milestones are complete. The renderer-independent kernel produces all five Platonic and thirteen Archimedean solids, including snub forms derived from an equal-edge solve on the rotational subgroup. It also generates multi-shell FCC sphere packing, derives the cuboctahedral first-shell hull, continuously tightens that shell into the icosahedral/golden-rectangle relationship, folds regular polygons around a corner to show why only five solids close, and derives the rhombic dodecahedron and its space-filling neighbors from FCC Voronoi bisectors.

The public root is a nine-chapter, scroll-driven story: a point becomes a sphere, corners close, twelve spheres gather, twins appear, the shell tightens to the golden icosahedron, one moving point makes all eighteen solids, the lattice grows, each sphere claims its cell, and everything returns to the point. Every frame is a pure function of scroll position, chapter boundaries are proven seamless, and the last frame equals the first. `/lab` remains the deeper paper-and-graphite geometry instrument.

## Packages

- `packages/geometry`: pure TypeScript mathematics. It must never import Three.js, browser APIs, or GPU APIs.
- `packages/render`: conversion of abstract geometry into Three.js objects (instanced edges, faces, spheres, struts, polygon sheets, sphere guides). It may consume `geometry`, but knows nothing about scroll.
- `packages/scenes`: normalized-progress choreography. Nine chapter models sample renderer-independent frames; it consumes `geometry` only and owns no construction algorithms.

## Commands

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run check
```

Open `http://127.0.0.1:5173/lab` while the development server is running.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for repository findings, milestone gates, risks, and completion criteria.

The visual-system decisions and deterministic review states are recorded in [`docs/MILESTONE_4_REPORT.md`](docs/MILESTONE_4_REPORT.md).

The story scenes are recorded in [`docs/MILESTONE_5_PROGRESS.md`](docs/MILESTONE_5_PROGRESS.md) and [`docs/MILESTONE_6_REPORT.md`](docs/MILESTONE_6_REPORT.md); the finish pass (captions, responsive choreography, loader, About, accessibility, fallback, performance, deployment checks) is in [`docs/MILESTONE_7_REPORT.md`](docs/MILESTONE_7_REPORT.md).
