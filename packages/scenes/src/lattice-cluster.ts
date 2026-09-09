import {
  centroid,
  closestPacking,
  convexHull,
  subtract,
  type Polyhedron,
  type Sphere,
  type Vec3,
} from "@order-in-space/geometry";

import { SPHERE_RADIUS } from "./world.js";

export interface TetrahedralCluster {
  /** The nucleus and the three mutually touching neighbors in the positive octant. */
  readonly spheres: readonly Sphere[];
  readonly centroid: Vec3;
  /** Hull of the four centers, moved so its centroid sits at the origin. */
  readonly tetrahedron: Polyhedron;
}

let cached: TetrahedralCluster | undefined;

/**
 * Four touching spherepoints are the smallest closed packing, and they already
 * live inside the FCC lattice: the nucleus plus its three neighbors whose
 * coordinates are all non-negative touch one another pairwise.
 */
export function tetrahedralCluster(): TetrahedralCluster {
  if (cached !== undefined) return cached;
  const packing = closestPacking(1, SPHERE_RADIUS);
  const spheres = packing.filter(({ center, shell }) => (
    shell === 0 || (center.x >= -1e-9 && center.y >= -1e-9 && center.z >= -1e-9)
  ));
  if (spheres.length !== 4) throw new Error("Expected exactly four spheres in the tetrahedral cluster");
  const center = centroid(spheres.map(({ center: point }) => point));
  const tetrahedron = convexHull(
    spheres.map(({ center: point }) => subtract(point, center)),
    { symbol: "four spherepoints" },
  );
  cached = { spheres, centroid: center, tetrahedron };
  return cached;
}
