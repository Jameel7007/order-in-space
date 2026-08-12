import { intersectHalfSpaces, type HalfSpace } from "./halfspace.js";
import { closestPacking } from "./packing.js";
import type { Polyhedron, Vec3 } from "./types.js";
import { lengthSquared, subtract } from "./vector.js";

export interface FCCVoronoiDerivation {
  readonly neighborCenters: readonly Vec3[];
  readonly bisectorHalfSpaces: readonly HalfSpace[];
  readonly cell: Polyhedron;
}

/**
 * Derive the Wigner-Seitz/Voronoi cell of an FCC packing. Each of the twelve
 * nearest sphere centers contributes the perpendicular-bisector half-space
 * of the nucleus-neighbor segment. Their intersection is the rhombic
 * dodecahedron; no rhombic-dodecahedral coordinates are supplied directly.
 */
export function deriveRhombicDodecahedronFromFCC(radius = 1): FCCVoronoiDerivation {
  const packing = closestPacking(1, radius);
  const nucleus = packing.find(({ shell }) => shell === 0);
  if (nucleus === undefined) throw new Error("FCC packing has no nucleus");
  const neighborCenters = packing
    .filter(({ shell }) => shell === 1)
    .map(({ center }) => subtract(center, nucleus.center));
  const bisectorHalfSpaces = neighborCenters.map((normal) => ({
    normal,
    offset: lengthSquared(normal) / 2,
  }));
  const cell = intersectHalfSpaces(bisectorHalfSpaces, {
    symbol: "FCC Voronoi cell",
  });
  return { neighborCenters, bisectorHalfSpaces, cell };
}

export function rhombicDodecahedronFromFCC(radius = 1): Polyhedron {
  return deriveRhombicDodecahedronFromFCC(radius).cell;
}

