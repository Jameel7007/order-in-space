# Interview guide

The most likely question about this project is "how much of it do you understand?" This guide answers the questions an interviewer would ask, in the words you would use, with the file to open next to each answer. Read the file while you read the answer; the point is to be able to say these things from the code, not from memory.

## 1. "Walk me through how a solid is generated."

Open [`packages/geometry/src/wythoff.ts`](../packages/geometry/src/wythoff.ts) and [`coxeter.ts`](../packages/geometry/src/coxeter.ts).

> I represent a generating point by its three distances from three mirrors. The mirrors are the walls of a spherical triangle whose angles are π/2, π/3, and π/5 for the icosahedral family, and `createCoxeterSystem` builds their unit normals from those angles and then closes the reflection group by breadth-first multiplication until no new matrices appear: 24, 48, or 120 of them.
>
> `wythoffGenerator` turns the three distances into a point by solving a 3×3 linear system (distance from a plane is a dot product with its normal), then scales it onto the sphere. `wythoffCorrespondence` applies every group matrix to that point, so I get one copy per group element. `mergeWythoffOrbit` merges copies that coincide, which happens exactly when the point lies on a mirror: the reflection in that mirror maps it to itself. Then `convexHull` recovers faces and edges from the points.

Follow-ups you should be ready for:

- *Why solve for the point instead of storing coordinates?* Because then every solid is a consequence of one rule, the same rule the scroll animation moves through. There is nothing to get out of sync.
- *What are the named positions?* Corner of the triangle gives a Platonic solid (`[0,0,1]` is the icosahedron). On an edge gives a truncation or rectification. Interior gives the omnitruncated form. `platonic.ts` and `archimedean.ts` are just lists of those distances with names.
- *What about the snub solids?* They are not a reflection orbit. In `snub.ts` I keep only the rotation half of the group (matrices with determinant +1) and search for the one interior point whose five nearest orbit neighbours are equidistant. That is a small deterministic pattern search on the log of the distances; the residual is checked to be under 1e-9.

## 2. "Why does the correspondence array exist? Why not just the merged points?"

> Two reasons. During continuous motion I need to know which vertex is which from frame to frame. Hull vertex order is arbitrary, but the group element that produced a point is stable, so `CorrespondencePoint` carries `groupElement`. The continuity test (`wythoff-continuity.test.ts`) moves the generator slightly and checks that every element's point moves by the same small amount, which is only true if the identities are stable.
>
> The second reason is topology boundaries. When the point reaches a mirror, several group elements collapse onto one vertex. Keeping the raw correspondence lets me merge explicitly and record how many elements share a vertex; the icosahedron test checks each vertex is shared by ten elements, 120 ÷ 12.

## 3. "How does the scroll animation work? What happens when I scroll backwards?"

Open [`packages/scenes/src/frame.ts`](../packages/scenes/src/frame.ts), [`story.ts`](../packages/scenes/src/story.ts), and one chapter such as [`chapters/golden.ts`](../packages/scenes/src/chapters/golden.ts).

> Each chapter is a function from a number between 0 and 1 to a frame: a plain data description of what should be on screen, with no Three.js in it. Scrolling produces the number; nothing else is stored. So scrolling backwards is not "undoing" an animation, it is evaluating the same function at smaller inputs, and the picture is identical by construction.
>
> That purity is what makes the continuity tests possible. `frameSignature` turns a frame into a geometry-only fingerprint. `story.test.ts` asserts that chapter n at 1 equals chapter n+1 at 0 for every n, and that chapter 9 at 1 equals chapter 1 at 0. If someone edits a chapter so its ending no longer matches the next beginning, the test fails.

Follow-ups:

- *Isn't that expensive?* Sampling is memoised by geometry key inside the chapter, and the stage (`src/story-stage.ts`) only re-uploads geometry when a slot's key changes. Warm samples are well under a millisecond.
- *What does GSAP do then?* Only converts page scroll into that number, with light smoothing. It never touches geometry, and a script fails the build if the render package imports it.

## 4. "You mention a performance improvement. What was it?"

Open [`packages/geometry/src/hull.ts`](../packages/geometry/src/hull.ts).

> The first hull was correctness-first: test every triple of points as a candidate plane and check all other points against it. That is O(n⁴). For a 120-vertex solid it took about 170 ms, which is fine for a lab slider but not for a scroll that rebuilds the solid many times per segment. I replaced it with quickhull: start from a tetrahedron, repeatedly take the farthest outside point, remove the faces it can see, and stitch new triangles around the horizon. That is O(n log n) expected and brought the rebuild to about 13 ms.
>
> The subtle part is that my faces are polygons, not triangles. Coplanar triangles are grouped by plane and each group's points go through a 2-D monotone-chain pass that keeps only true corners, so a sphere sitting in the middle of a cuboctahedron face is not mistaken for a vertex. The existing tests on vertex, edge, and face counts for all eighteen solids caught every mistake while I did this.

## 5. "Pick one test and tell me what it proves."

Good choices, with what they prove:

- `deficiency.test.ts`: the sum over all corners of (360° minus the face angles meeting there) is 720° for every one of the eighteen solids. That is Descartes' theorem, and it is why Chapter 2 can say "every closed solid spends exactly 720° of gap".
- `vertex-figure.test.ts`: the paper fold keeps every polygon rigid and regular at every step, opens flat with exactly the deficiency wedge missing, and its closed corner coincides with the real solid's corner to 1e-8. The animation is not an approximation of the mathematics; it is the mathematics.
- `packing.test.ts`: while the twelve-sphere shell tightens from cuboctahedron to icosahedron, at 101 samples no two spheres overlap and the shell radius never increases. So the story's "pull inward until every neighbour touches" is a legitimate continuous motion.
- `lattice.test.ts`: shells of an FCC packing hold 12, 42, and 92 spheres and each hulls to a cuboctahedron of edge n·2R, which is the "10n² + 2" claim in Chapter 7.

## 5b. "How do you know your numerical code isn't just passing its own fixtures?"

Open [`packages/geometry/test/property.test.ts`](../packages/geometry/test/property.test.ts).

> The named solids are fixtures, so I added seeded property tests on top. They take any of the thirteen Archimedean solids, rotate it at random, scale it anywhere across seven orders of magnitude, and check the hull comes back with the same topology, outward faces, and 720° of deficiency. Others drop a generator anywhere in the mirror room, jitter a cube's corners to find where face merging stops, and walk a generator up to a mirror to find exactly where the 1e-8 tolerance takes effect.
>
> On the first run they exposed a real bug: my outward-winding check compared the raw dot product of a face normal and its centre against an absolute 1e-10, so solids smaller than about 0.001 failed. I changed the check to compare unit vectors, which is dimensionless, and kept the exact failing case in the suite as a named regression test. Every seed is in the failure message, so any case can be replayed.

That is testing → discovery → diagnosis → fix → regression protection, and it is a much stronger sentence than "I have 121 tests".

## 6. "How is the code organised, and why?"

> Three packages with a one-way dependency: `geometry` (pure maths, no Three.js or browser), `render` (Three.js objects, no scroll), `scenes` (frames, no Three.js). `scripts/check-boundaries.mjs` greps every source file and fails the build on a forbidden import. The benefit is testability: all the mathematics runs in Node with plain numbers, and the scene models can be tested for continuity without a GPU. The application in `src/` is the only place that knows about all three.

## 7. "What went wrong, and what did you learn?"

Choose one or two. The details are in `docs/HOW_IT_WORKS.md` under "Things that went wrong".

- Three.js compiles "opaque" into a material's shader; toggling `transparent` later needs a recompile flag or alpha is forced to 1.
- A lit double-sided sheet flips brightness the frame it passes edge-on; sheets that fold are drawn unlit.
- Crossfading two coincident sets of edges draws both and looks like jitter; hand over in one frame instead.

## 8. "What would you do next?"

> Catalan solids (the duals of the Archimedean ones) come almost free from `dual.ts`. Profiling on low-end phones. And the hull could keep per-face outside sets instead of rescanning all pending points each iteration, which would take it from O(n²) practical behaviour to true O(n log n).

## How to prepare

Spend an hour doing this once: open each file named above, read the function the answer describes, and say the answer out loud without looking at this page. If any sentence does not match what you see in the code, the sentence is wrong, and fixing it is exactly the understanding an interviewer is looking for.
