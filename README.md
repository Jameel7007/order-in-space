# Order in Space

Order in Space is a geometry-first, scroll-driven study of polyhedral construction. The repository was initialized from an empty workspace on 2026-08-12.

Milestones 1–3 are complete. The renderer-independent kernel produces all five Platonic and thirteen Archimedean solids, including snub forms derived from an equal-edge solve on the rotational subgroup. It also generates multi-shell FCC sphere packing, derives the cuboctahedral first-shell hull, continuously tightens that shell into the icosahedral/golden-rectangle relationship, and derives the rhombic dodecahedron from FCC Voronoi bisectors. The `/lab` geometry laboratory now renders and exposes these systems interactively. Scene choreography remains gated on locking the visual language in Milestone 4.

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
