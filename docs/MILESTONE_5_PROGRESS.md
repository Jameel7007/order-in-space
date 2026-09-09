# Milestone 5 — Load-bearing scenes

**Status: complete (2026-09-09).**

Milestone 5 began on 2026-08-12 with a five-beat slice of Scene 6 and finished on 2026-09-09 with Scenes 6, 3, and 1 complete inside a single nine-chapter story model. The first slice is preserved in the git history; this report describes the finished state.

## What changed from the first slice

- The story is no longer one sticky section. A fixed WebGL stage sits behind nine scrolling chapter sections; every chapter reports normalized progress to a renderer-independent `Chapter.sample(t)` in `@order-in-space/scenes`, and the application draws whatever frame comes back.
- Frames are data, not drawing calls: solids, spheres, free polygons, struts, sphere guides, an optional mirror-room generator, a camera pose, and a plain-language readout. The renderer keys objects by frame element and rebuilds geometry only when the key changes.
- Scene 6 now runs through all three mirror rooms. The icosahedral walk (icosahedron → truncated icosahedron → icosidodecahedron → truncated dodecahedron → dodecahedron) continues off the mirrors to the rhombicosidodecahedron and the truncated icosidodecahedron, then declares its one rule change: half the echoes are dismissed and the generator slides to the equal-edge snub position. A declared room change lands on the snub cube, walks the octahedral family down to the octahedron, and hands that octahedron, vertex for vertex, to the tetrahedral room, which ends on the tetrahedron.
- Scene 3, “Twelve around one,” brings twelve equal spheres in one at a time along their own radial lines until each touches the nucleus, then hulls their centers into the cuboctahedron.
- Scene 1, “The spherepoint,” is the opening condition: a point of radius 0.02 grows into the story's sphere while the camera comes closer. Scene 9 returns to exactly this frame.

## Verified properties

- Named waypoints are exact, forward and backward sampling agree, and every slide segment keeps a constant vertex/edge/face count; topology changes happen only at the two declared boundaries (alternation and room change).
- The icosahedral room is rotated onto the tightened shell of Scene 5, and the tetrahedral room onto the four-sphere cluster of Scene 7, by frame alignment rather than by hand-set angles.
- The convex hull was replaced with quickhull so a 120-vertex generator rebuilds in about 13 ms instead of 170 ms.

See `docs/MILESTONE_6_REPORT.md` for the remaining scenes and `docs/MILESTONE_7_REPORT.md` for the finish pass.
