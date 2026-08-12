# Implementation plan

## Repository findings

- **State:** empty/new repository. Only generated `work/` and `outputs/` directories existed.
- **Reusable infrastructure:** none. There is no code from *From the Point*, no package configuration, and no local Critchlow scan in the workspace.
- **Conventions:** none to preserve. npm is selected because it ships with the available Node runtime and adds no package-manager bootstrap dependency.
- **Baseline checks:** no pre-existing test, build, typecheck, lint, README, `AGENTS.md`, or Git repository existed, so there was no baseline command to run.
- **Conflicts:** none in existing code. The main specification risk is mathematical: ordinary mirror-orbit Wythoff construction covers the non-chiral uniform forms, while the snub forms require a deliberate chiral/alternation construction rather than pretending a generic reflected orbit is a snub.

The architecture begins with the required `geometry -> render -> scenes` dependency direction. The latter two packages remain documentation-only until their prerequisites are met.

## Milestone 1 — Geometry kernel

**Status: complete (2026-08-12).** All 18 named solids, polar duality, topology extraction, common-radius normalization, reflection-group closure, chiral snub solving, and stable generator correspondence are implemented and verified. The remaining milestones are intentionally unstarted.

### Files/modules

- `packages/geometry/src/vector.ts`: renderer-independent vector operations.
- `packages/geometry/src/matrix.ts`: small orthogonal-matrix and linear-solve utilities.
- `packages/geometry/src/coxeter.ts`: spherical triangle mirrors and finite reflection-group closure.
- `packages/geometry/src/wythoff.ts`: mirror-distance generator, stable group-action correspondence, and orbit construction.
- `packages/geometry/src/hull.ts`: convex hull faces, winding, and topology extraction.
- `packages/geometry/src/normalize.ts`: common master-circumsphere normalization.
- `packages/geometry/src/platonic.ts`: named Platonic positions selected from the shared Wythoff system.
- Tests colocated under `packages/geometry/test`.

### Mathematical work

Construct the `(2,3,3)`, `(2,3,4)`, and `(2,3,5)` spherical reflection groups from their mirror angles. Represent a generator by its signed distances from the three mirrors. Apply a precomputed, deterministically ordered reflection group to preserve correspondence while the generator moves. Merge coincident boundary-orbit points only when forming topology.

After the five Platonic positions pass, extend the same engine to rectified, truncated, and omnitruncated forms. Implement snub tetrahedral/octahedral and snub icosahedral forms through a documented chiral alternation step with chirality-stable correspondence; do not label a full reflection orbit as a snub.

### Renderer work

None. This milestone must have zero Three.js, DOM, or GPU imports.

### Tests and debug output

- Reflection group orders: 24, 48, 120.
- Platonic `V/E/F`, Euler characteristic, equal edges, master radius, and outward winding.
- Mirror-boundary orbit merging.
- Group-action continuity for small generator movement without relying on arbitrary vertex array indices.
- Later in the milestone: all 18 named forms and Archimedean topology.

Debug output is numeric: group order, orbit cardinality, topology, edge spread, and radius spread.

### Completion criteria

All five Platonic and thirteen Archimedean solids are produced from the shared construction; invariants and continuity tests pass; no renderer dependency enters `geometry`.

### Risks

- Stable correspondence at topology-changing mirror boundaries needs explicit provenance.
- Convex-hull coplanarity tolerances must be scale-aware.
- Snub alternation is chiral and cannot be conflated with ordinary full reflection closure.
- Uniform generator positions must be derived and verified, not copied as completed vertex tables.

## Milestone 2 — Packing derivations

**Status: complete (2026-08-12).** Multi-shell FCC packing, first-shell contacts and cuboctahedral hull, contact-preserving icosahedral tightening, the dodecahedral dual relationship, and the FCC Voronoi derivation are implemented and verified.

### Files/modules

Add `sphere.ts`, `packing.ts`, `fcc.ts`, and packing/property tests in `geometry`.

### Mathematical work

Generate the twelve-sphere first shell from contact constraints; hull those centers to obtain the cuboctahedral order; model the nucleus removal/tightening relation; derive the FCC Voronoi cell as the rhombic dodecahedron.

### Renderer work

None beyond defining renderer-independent construction-stage data if needed.

### Tests and debug output

Sphere counts, contact graph degrees and distances, hull topology, FCC bisector planes, and derivation provenance.

### Completion criteria

Packing structures arise from sphere centers/neighbor planes, not substituted named meshes.

### Risks

The shell-tightening narrative needs a precise continuous constraint model; the visual story must not imply that equal rigid spheres can tighten without changing radius or contact assumptions.

## Milestone 3 — Geometry laboratory

**Status: complete (2026-08-12).** The `/lab` Vite application, reusable Three.js render primitives, generator/packing/FCC modes, responsive control surface, reduced-motion handling, runtime preview, and GitHub Pages deployment are complete.

### Files/modules

Initialize the Vite application, implement `render` primitives, and add a `/lab` route with generator controls, topology readout, mirror-triangle inset, and debug toggles.

### Mathematical work

Expose generator/path APIs and topology-boundary events without moving algorithms into UI code.

### Renderer work

Prototype instanced cylindrical edges versus a supported screen-space thick-line path; use restrained faces and a narrow-FOV or orthographic camera.

### Tests and visual/debug output

Browser smoke test, generator control tests, performance sampling, and screenshots at named/boundary/interior positions.

### Completion criteria

Continuous movement is visibly stable, named positions resolve, edge quality is viable, and performance is acceptable.

### Risks

WebGPU fallback compatibility and transparent nested depth ordering.

## Milestone 4 — Visual language

Lock edge width/antialiasing, face treatment, background, lighting, camera, typography baseline, mobile composition, and reduced-motion behavior. Add visual regression fixtures for representative solids and dense nesting. Complete when geometry stays legible without glow or face dominance.

## Milestone 5 — Load-bearing scenes

Implement Scene 6, then Scene 3, then Scene 1 using reversible `setProgress(t)` state. Test forward/backward determinism, topology boundary handling, packing provenance, and scene transitions. Complete when continuous transformation, derivation, and presentation all work in production rendering.

## Milestone 6 — Remaining scenes

Implement Scenes 2, 4, 5, 7, 8, and 9 from reusable construction stages. Add angular-deficiency, duality involution/incidence, golden-rectangle, lattice, and exact-return tests. Complete when the nine scenes form one reversible geometric argument without scene-local math hacks.

## Milestone 7 — Finish

Add verified captions, responsive/mobile choreography, loader, About content, accessibility, fallback handling, performance/resource reuse, and production deployment checks. Run unit/property tests, typecheck, lint when configured, build, browser checks, reduced-motion checks, and final dependency/diff review.

## First mathematically testable slice

The first slice generated tetrahedron, cube, octahedron, dodecahedron, and icosahedron from mirror-position generators and proved topology, regularity, winding, common radius, group order, and motion correspondence. Work then continued through the remaining ring patterns, chiral snub solve, and duality, completing Milestone 1.
