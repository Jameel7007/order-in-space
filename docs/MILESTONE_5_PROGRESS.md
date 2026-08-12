# Milestone 5 — Progress report

**Status: in progress (2026-08-12).**

The first load-bearing slice of Scene 6 is live in the application architecture. It establishes the public story route, a reversible icosahedral generator path, and a deliberate separation between an inviting narrative experience and the deeper geometry laboratory.

## Public experience

The repository root is now the beginning of the story rather than a redirect into an engineering control surface.

- The opening promise is plain: **move one point, change the whole world**.
- A five-beat scroll sequence explains the mirror-room construction without assuming geometry vocabulary.
- The actual Wythoff generator moves through the `(2,3,5)` chamber; the solid is rebuilt from that generator instead of cross-fading completed meshes.
- The path visits the icosahedron, truncated icosahedron, icosidodecahedron, truncated dodecahedron, and dodecahedron.
- A visible triangle inset makes cause and effect legible: the dot moves, its reflections follow, and the rendered form answers.
- A direct-manipulation range control lets visitors move the point themselves and synchronizes back to the scroll position.
- Technical notation is progressive disclosure under “Curious about the geometry?” rather than the lead explanation.

## Laboratory language

`/lab` remains the precise instrument, but its first layer now uses human descriptions:

- “Shape-shifter” before “generator orbit”
- “Twelve around one” before “packing contraction”
- “Hidden space cell” before “FCC Voronoi derivation”
- “corners / connections / faces” in the story before symbolic topology

The exact counts, symbols, mirror families, distances, and Euler characteristic remain available for deeper exploration.

## Architecture and verification

- Added `@order-in-space/scenes` as a renderer-independent normalized-progress package.
- `sampleTruncationPath(t)` is clamped, reversible, deterministic, and exact at named waypoints.
- GSAP ScrollTrigger converts page progress into `setProgress(t)` without entering the render package.
- The same HTML artifact routes the root to the story and `/lab` to the advanced instrument, preserving GitHub Pages compatibility.
- Added tests for exact named positions, forward/backward equality, and invalid progress clamping.
- Visual review covers 1280×720 desktop and 390×844 mobile layouts, the opening, the sticky construction scene, a named football position, and mid-transition states.

## Remaining Milestone 5 work

- Extend Scene 6 through the tetrahedral, octahedral, and chiral/snubbing chapters without unexplained topology changes.
- Build Scene 3, “Twelve around one,” as a public scroll sequence using the verified packing kernel.
- Build Scene 1, “The spherepoint,” as the precise opening/return condition.
- Add broader browser-based regression automation around scene boundary transitions and production performance.
