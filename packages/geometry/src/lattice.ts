import { deriveRhombicDodecahedronFromFCC } from "./fcc.js";
import { convexHull } from "./hull.js";
import { closestPacking, packingContacts } from "./packing.js";
import type { Sphere } from "./sphere.js";
import { translatePolyhedron } from "./transform.js";
import type { Edge, Polyhedron, Vec3 } from "./types.js";

export interface LatticeShell {
  readonly index: number;
  readonly spheres: readonly Sphere[];
  readonly hull: Polyhedron | undefined;
}

/**
 * Group an FCC packing into its nearest-neighbor shells. Every shell beyond
 * the nucleus holds 10n² + 2 spheres and its outermost centers hull into a
 * cuboctahedron of edge n·2R: the same twelve-around-one order, repeated at
 * every scale.
 */
export function latticeShells(shells: number, radius = 1): readonly LatticeShell[] {
  const packing = closestPacking(shells, radius);
  return Array.from({ length: shells + 1 }, (_, index) => {
    const spheres = packing.filter((sphere) => sphere.shell === index);
    return {
      index,
      spheres,
      hull: index === 0 ? undefined : convexHull(spheres.map(({ center }) => center), {
        symbol: `FCC shell ${String(index)}`,
      }),
    };
  });
}

export function latticeContacts(spheres: readonly Sphere[]): readonly Edge[] {
  return packingContacts(spheres);
}

export interface SpaceFillingCells {
  readonly radius: number;
  readonly cell: Polyhedron;
  readonly neighbors: readonly { readonly offset: Vec3; readonly cell: Polyhedron }[];
}

/**
 * The nucleus cell and the twelve identical cells of its nearest neighbors.
 * Each neighbor cell is the same Voronoi derivation translated by that
 * neighbor's center, so any face they share is shared exactly.
 */
export function spaceFillingCells(radius = 1): SpaceFillingCells {
  const derivation = deriveRhombicDodecahedronFromFCC(radius);
  return {
    radius,
    cell: derivation.cell,
    neighbors: derivation.neighborCenters.map((offset) => ({
      offset,
      cell: translatePolyhedron(derivation.cell, offset),
    })),
  };
}
