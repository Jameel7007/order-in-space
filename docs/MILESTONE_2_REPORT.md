# Milestone 2 report — Packing derivations

## Implemented

- `closestPacking(shells, R)` performs a deterministic breadth-first traversal of the FCC nearest-neighbor lattice. Shell 1 contains one nucleus and twelve kissing neighbors; shell 2 extends the same construction rather than using a second coordinate fixture.
- `packingContacts` and `minimumSurfaceGap` expose contact and overlap invariants.
- `hullOfCenters` constructs topology from sphere centers. Convex-hull extraction now correctly discards interior inputs such as the nucleus.
- `tightenFirstShell(t, R)` removes the nucleus and continuously maps the three FCC coordinate-plane families into three mutually orthogonal golden rectangles. A frame-local uniform contact scale keeps the equal spheres non-overlapping while the common center radius contracts monotonically from `2R` to `sqrt(1 + phi^2) R`.
- The tightening endpoint hull is an icosahedron; face-plane reciprocation produces its dodecahedral dual.
- `deriveRhombicDodecahedronFromFCC(R)` intersects the twelve perpendicular-bisector half-spaces between the nucleus and its FCC neighbors. The resulting Voronoi cell is not supplied as a named mesh.
- A reusable three-dimensional half-space intersection utility supports the FCC derivation.

## Verification

Run from the repository root:

```sh
npm run check
```

The check runs geometry dependency-boundary validation, strict TypeScript checking, Vitest, and the production library build. Packing tests verify:

- FCC totals `1`, `13`, and `55` through shells 0, 1, and 2.
- Twelve nucleus contacts and 24 outer-shell contacts.
- Cuboctahedral center hull `V/E/F = 12/24/14`, with 8 triangular and 6 square faces.
- Non-overlap and monotonic contraction at 101 tightening samples.
- Icosahedral endpoint `12/30/20` and dodecahedral dual `20/30/12`.
- FCC Voronoi cell `14/24/12`, with twelve equal rhombic faces and one face corresponding to each nearest FCC neighbor.

No lint command exists yet; this compact pure-TypeScript kernel is covered by strict type checking and the boundary script.

## Visual check

There is no browser route in this milestone. The derivations are ready to drive Milestone 3's `/lab` page. That page will be the first visual preview: generated solid, packing/tightening controls, thick edges, construction spheres, generator inset, faces toggle, and numeric topology diagnostics.

## Remaining risks and mathematical qualification

- The contact-scaled tightening is a legitimate continuous, reversible, non-overlapping deformation, but is not presented as the rigid triangular-hinge mechanism sometimes called a jitterbug. Scene copy must describe what is actually computed.
- A regular rhombic dodecahedron is not vertex-cospherical: its eight degree-three vertices lie at radius `sqrt(3/2) R`, while its six degree-four vertices lie at `sqrt(2) R`. Forcing every vertex onto one sphere would destroy the FCC Voronoi cell and its regular rhombi. The implementation therefore preserves the packing-derived scale and records the outer containing radius as `circumradius`; `radiusSpread` makes the two-radius structure explicit.
- Hull and half-space enumeration remain correctness-first and should be profiled before dense animated use.

## Next milestone

Milestone 3: create the Vite geometry laboratory and solve the production edge language. The first preview route will be `/lab`.

