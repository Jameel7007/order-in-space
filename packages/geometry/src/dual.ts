import { convexHull } from "./hull.js";
import { normalizeCircumradius } from "./normalize.js";
import type { Polyhedron, Vec3 } from "./types.js";
import { cross, dot, normalize, scale, subtract } from "./vector.js";

export interface DualOptions {
  readonly circumradius?: number;
  readonly symbol?: string;
}

function reciprocalFaceVertex(
  polyhedron: Polyhedron,
  faceIndex: number,
  reciprocalSphereRadius: number,
): Vec3 {
  const face = polyhedron.faces[faceIndex];
  if (face === undefined || face.length < 3) {
    throw new Error("Duality requires faces with at least three vertices");
  }
  const a = polyhedron.vertices[face[0] ?? -1];
  const b = polyhedron.vertices[face[1] ?? -1];
  const c = polyhedron.vertices[face[2] ?? -1];
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("Face references a missing vertex");
  }

  let normal = normalize(cross(subtract(b, a), subtract(c, a)));
  let faceDistance = dot(normal, a);
  if (faceDistance < 0) {
    normal = scale(normal, -1);
    faceDistance *= -1;
  }
  if (faceDistance <= 1e-10) {
    throw new Error("Duality requires the origin to lie strictly inside every face plane");
  }

  return scale(normal, (reciprocalSphereRadius * reciprocalSphereRadius) / faceDistance);
}

/**
 * Construct the polar reciprocal. Each outward face plane maps to one vertex;
 * the hull then recovers the swapped incidence structure. A final uniform
 * scale keeps the pair in the requested master spherical frame.
 */
export function dual(polyhedron: Polyhedron, options: DualOptions = {}): Polyhedron {
  const targetRadius = options.circumradius ?? polyhedron.circumradius;
  if (!Number.isFinite(targetRadius) || targetRadius <= 0) {
    throw new Error("Dual circumradius must be positive and finite");
  }
  const reciprocalVertices = polyhedron.faces.map((_, faceIndex) => reciprocalFaceVertex(
    polyhedron,
    faceIndex,
    polyhedron.circumradius,
  ));
  const reciprocal = convexHull(reciprocalVertices, {
    symbol: options.symbol ?? `dual(${polyhedron.symbol})`,
  });
  return normalizeCircumradius(reciprocal, targetRadius);
}

