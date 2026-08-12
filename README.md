# Order in Space

Order in Space is a geometry-first, scroll-driven study of polyhedral construction. The repository was initialized from an empty workspace on 2026-08-12.

Milestones 1–4 are complete and Milestone 5 is underway. The renderer-independent kernel produces all five Platonic and thirteen Archimedean solids, including snub forms derived from an equal-edge solve on the rotational subgroup. It also generates multi-shell FCC sphere packing, derives the cuboctahedral first-shell hull, continuously tightens that shell into the icosahedral/golden-rectangle relationship, and derives the rhombic dodecahedron from FCC Voronoi bisectors. The public root now opens with a plain-language, scroll-driven slice of Scene 6, while `/lab` remains the deeper paper-and-graphite geometry instrument.

## Packages

- `packages/geometry`: pure TypeScript mathematics. It must never import Three.js, browser APIs, or GPU APIs.
- `packages/render`: future conversion of abstract geometry into visual objects. It may consume `geometry`, but knows nothing about scroll.
- `packages/scenes`: future normalized-progress choreography. It may consume `render`, but owns no geometry algorithms.

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

The first story-scene implementation and remaining Milestone 5 work are recorded in [`docs/MILESTONE_5_PROGRESS.md`](docs/MILESTONE_5_PROGRESS.md).
