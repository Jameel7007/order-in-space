# Order in Space

**An interactive computational-geometry exploration of the Platonic and Archimedean solids.**

![One point moving through three mirror rooms makes all eighteen regular and semi-regular solids](docs/media/generator.gif)

`TypeScript · Three.js · Computational Geometry · Vitest · Vite`

[**▶ Live demo**](https://jameel7007.github.io/order-in-space/) · [**Shape lab**](https://jameel7007.github.io/order-in-space/lab/) · [**How it works**](docs/HOW_IT_WORKS.md) · [**Interview guide**](docs/INTERVIEW_GUIDE.md)

A nine-chapter, scroll-driven study after Keith Critchlow's *Order in Space* (1969). A point becomes a sphere, spheres gather, and their touching builds every regular solid; one moving point makes all eighteen named solids; a lattice grows; each sphere claims its cell; and everything returns to the point. Every frame is a pure function of scroll position, so the story runs backwards exactly, and the last frame equals the first.

Nothing is stored as a list of corners. The solids come from one point reflected in three mirrors, the packings from equal spheres touching, the space cell from cutting space fairly between neighbours, and the "why only five" argument from folding regular polygons around a corner. The `/lab` route is the deeper instrument: move the generator freely, tighten the shell of twelve spheres, or watch the Voronoi cell form, with every mirror distance, symbol, and count exposed.

## Architecture

```
scroll position
      ↓
scenes  ·  chapter.sample(progress)      pure: no Three.js, no DOM
      ↓
abstract frame  (solids, spheres, sheets, struts, camera, captions)
      ↓
render  ·  instanced edges, faces, spheres, sheets
      ↓
Three.js

geometry ─────→ scenes          geometry: pure mathematics, no renderer
   │                            render:   Three.js objects, no scroll
   └──────────→ render          scenes:   frames from progress, no Three.js
```

The arrows are the only allowed dependencies. `scripts/check-boundaries.mjs` reads every source file and fails the build if a package imports from the wrong direction.

## Engineering highlights

- **Procedural geometry, no stored meshes.** Eighteen named solids from one point reflected in three mirror rooms (finite Coxeter groups of order 24, 48, 120); snub solids from a chiral equal-edge search; packings from spheres touching; the space cell from half-space cuts; the five-solids argument from a rigid paper fold. See [`packages/geometry`](packages/geometry/src).
- **Deterministic scroll state.** Each chapter is a pure function from progress to a frame description. Tests fingerprint every chapter boundary and the story's first and last frames, so reversing is exact and the ending returns to the opening.
- **Enforced monorepo boundaries.** `geometry` → `render` → `scenes`, one direction only; [`scripts/check-boundaries.mjs`](scripts/check-boundaries.mjs) fails the build on any Three.js, DOM, or scroll import in the wrong layer.
- **Fixture and property tests.** Named solids are checked for group orders, topology, equal edges, Descartes' 720°, the golden ratio to nine decimals, lattice shell counts, and cell volume. Seeded randomised tests then rotate and rescale solids over seven orders of magnitude, drop generators anywhere in the chamber, jitter hull inputs, and walk a generator up to a mirror to pin down exactly where the 1e-8 tolerances take effect. Story tests fingerprint every chapter boundary.
- **Performance.** Replacing an exhaustive O(n⁴) hull with quickhull took a 120-vertex rebuild from about 170 ms to 13 ms; the stage keys drawings by slot and reuses materials so per-frame updates never recompile shaders.
- **Accessibility and motion.** A real reduced-motion mode (still drawings per beat, system default plus a toggle), keyboard scrubber, live regions, a text fallback when WebGL is unavailable, and a portrait layout verified at 390×844.
- **CI/CD.** Boundaries, lint, strict TypeScript, tests, and the production build run on every pull request and before every GitHub Pages deploy.

## Quickstart

Requires Node 20.19 or newer (the deploy uses Node 24).

```sh
git clone https://github.com/Jameel7007/order-in-space.git
cd order-in-space
npm install
npm run dev
```

Then open `http://127.0.0.1:5173/` for the story and `http://127.0.0.1:5173/lab` for the lab. Other commands:

```sh
npm test            # geometry, render, and story tests, fixtures and seeded properties
npm run lint        # oxlint
npm run typecheck   # strict TypeScript
npm run build       # production build for GitHub Pages
npm run check       # boundaries + lint + typecheck + tests + build (what CI runs)
```

## Use the geometry on its own

The mathematics lives in `packages/geometry` with no Three.js, DOM, or scroll dependency, and a script fails the build if that ever changes. It can be used without the visualizer:

```ts
import { wythoff, platonic, closestPacking, hullOfCenters, angularDeficiency } from "@order-in-space/geometry";

const football = wythoff([2, 3, 5], [0, 1, 1]);      // truncated icosahedron from a generator on one mirror
const cube = platonic("cube", 2);                     // circumradius 2
const shell = hullOfCenters(closestPacking(1, 0.5));  // cuboctahedron from twelve touching spheres
angularDeficiency(cube).total;                        // 4π, Descartes' theorem
```

## Packages

- `packages/geometry`: pure TypeScript mathematics. It must never import Three.js, browser APIs, or GPU APIs.
- `packages/render`: conversion of abstract geometry into Three.js objects (instanced edges, faces, spheres, struts, polygon sheets, sphere guides). It may consume `geometry`, but knows nothing about scroll.
- `packages/scenes`: normalized-progress choreography. Nine chapter models sample renderer-independent frames; it consumes `geometry` only and owns no construction algorithms.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for repository findings, milestone gates, risks, and completion criteria.

The visual-system decisions and deterministic review states are recorded in [`docs/MILESTONE_4_REPORT.md`](docs/MILESTONE_4_REPORT.md).

The story scenes are recorded in [`docs/MILESTONE_5_PROGRESS.md`](docs/MILESTONE_5_PROGRESS.md) and [`docs/MILESTONE_6_REPORT.md`](docs/MILESTONE_6_REPORT.md); the finish pass (captions, responsive choreography, loader, About, accessibility, fallback, performance, deployment checks) is in [`docs/MILESTONE_7_REPORT.md`](docs/MILESTONE_7_REPORT.md).

## License

MIT. See [LICENSE](LICENSE).
