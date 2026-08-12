# Milestone 1 report — Geometry kernel

## Implemented

- Pure TypeScript vector, matrix, and polyhedron types with no rendering dependency.
- Finite spherical Coxeter reflection groups `(2,3,3)`, `(2,3,4)`, and `(2,3,5)` generated from mirror angles, closing at orders 24, 48, and 120.
- Continuous Wythoff generators expressed as mirror distances, plus stable correspondence keyed by group action rather than arbitrary hull vertex order.
- Convex-hull face discovery, coplanar polygon recovery, outward winding, edge extraction, and master-circumsphere scaling.
- Five Platonic and thirteen Archimedean named forms from shared ring-pattern constructions.
- Snub cube and snub dodecahedron from rotational subgroups. Their off-mirror generator is solved by equalizing the five nearest orbit-neighbor distances; no named-solid coordinate table is stored.
- Polar duality by face-plane reciprocation with common-sphere rescaling.
- Automated geometry/render dependency-boundary check.

## Verification

Run from the repository root:

```sh
npm run check
```

The check runs boundary validation, strict TypeScript checking, all Vitest tests, and the geometry production build. The milestone verifies exact named `V/E/F` and face-type counts, Euler characteristic, uniform edges, common radius, outward winding, group orders, 5 + 13 coverage, Critchlow's 1 + 6 + 6 grouping, snub solve residuals, dual incidence, dual involution, mirror-boundary merging, and generator correspondence under continuous motion.

## Visual check

There is deliberately no browser route yet. Milestone 3 creates `/lab` only after the packing derivations in Milestone 2. For this milestone, the relevant debug output is numeric topology and tolerance data from tests or a small Node consumer of the built package.

## Remaining risks

- The snub equal-edge search is deterministic and tested, but the future authored path into and out of a chiral rotational orbit must declare its topology boundary explicitly.
- The hull implementation is intentionally correctness-first. Dense repeated recomputation should be profiled in the lab before optimizing or caching topology.
- The packing-shell tightening narrative still needs an exact constraint model; it is not part of this milestone.

## Next milestone

Milestone 2: derive the twelve-around-one shell, cuboctahedral hull, nucleus-removal/tightening relationship, and FCC rhombic dodecahedron from packing data with contact and provenance tests.

