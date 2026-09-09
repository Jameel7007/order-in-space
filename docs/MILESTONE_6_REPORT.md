# Milestone 6 report — Remaining scenes

**Status: complete (2026-09-09).**

Scenes 2, 4, 5, 7, 8, and 9 join Scenes 1, 3, and 6 to form one reversible geometric argument. Each scene is a pure function of its progress in `packages/scenes/src/chapters/`, and every scene reuses construction stages from the geometry kernel rather than introducing scene-local mathematics.

## The nine chapters

1. **The spherepoint.** A point becomes the sphere that every later shape is built from.
2. **Closing space.** Regular polygons fold around one corner exactly as a paper sheet with a wedge removed closes into a cone (`foldVertexFigure`). Three, four, and five triangles, three squares, and three pentagons close; six triangles lie flat. The closed corner coincides with the top corner of the finished solid, and every solid spends 4π of deficiency (`angularDeficiency`).
3. **Twelve around one.** Twelve spheres arrive at contact and their centers hull into the cuboctahedron.
4. **The inside-out twin.** The cube whose edge midpoints are the twelve centers is derived by aligning a Wythoff cube to the packing hull; its polar dual is scaled to the shared midsphere so edges bisect edges. The cuboctahedron is the shared core; involution and incidence are tested.
5. **The golden tightening.** The nucleus leaves, the shell contracts by the verified contact-preserving deformation to the icosahedron, and three golden rectangles are read from its edges and antipodes (`goldenRectangles`, ratio measured at φ).
6. **Move one point.** All eighteen named solids from a single generator in three mirror rooms, with declared alternation and room-change boundaries.
7. **The lattice.** The tetrahedron is four touching spherepoints that already sit in the FCC lattice; shells of 12, 42, and 92 spheres arrive, each hulling into a cuboctahedron of edge n·2R (`latticeShells`, 10n² + 2 verified for n ≤ 3), with every contact drawn as a strut.
8. **The space cell.** Twelve halfway walls close into the rhombic dodecahedron, and the twelve neighbor cells are the same derivation translated by their centers (`spaceFillingCells`): each shares exactly one face with the nucleus cell, none crosses it, and the volume is the lattice's fair share 4√2·R³.
9. **The return.** Cells and neighbors withdraw in reverse, the twelve depart, and the sphere shrinks back to the opening point.

## Tests added

- Angular deficiency totals 4π for all 18 named solids; corner sums match the five regular closures.
- Vertex-figure folds stay rigid and regular at every step, open flat with the deficiency wedge, close onto the genuine solid corner, and never close for six triangles, four squares, or three hexagons.
- Fifteen golden rectangles per icosahedron, five mutually perpendicular triads, and the axis-aligned triad at the tightened shell.
- Lattice shell counts and cuboctahedral shell hulls; space-filling adjacency and volume.
- Duality involution and midsphere incidence at the compound state.
- Rigid transforms, frame alignment, and vertex-on-top posing.
- Story-level: nine chapters with copy, seamless boundary signatures between every adjacent pair, exact return of the closing frame to the opening frame, forward/backward determinism, and bounded camera change per step.

`npm test` runs 112 tests across 15 files.
