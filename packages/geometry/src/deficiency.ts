import type { Polyhedron, Vec3 } from "./types.js";
import { dot, length, subtract } from "./vector.js";

export interface AngularDeficiency {
  /** Sum of the face angles meeting at each vertex, in radians. */
  readonly angleSums: readonly number[];
  /** 2π minus the angle sum at each vertex, in radians. */
  readonly deficiencies: readonly number[];
  /** Total deficiency; Descartes' theorem gives 4π for every convex polyhedron. */
  readonly total: number;
}

function angleBetween(a: Vec3, b: Vec3): number {
  const cosine = dot(a, b) / (length(a) * length(b));
  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

/**
 * Measure how far short of a full turn the faces around each corner fall.
 * The deficiency is what forces the surface to curve away from the plane and
 * close; its total is invariant, which is why flat tilings never close.
 */
export function angularDeficiency(polyhedron: Polyhedron): AngularDeficiency {
  const angleSums = polyhedron.vertices.map(() => 0);
  for (const face of polyhedron.faces) {
    for (let index = 0; index < face.length; index += 1) {
      const current = face[index];
      const previous = face[(index + face.length - 1) % face.length];
      const next = face[(index + 1) % face.length];
      if (current === undefined || previous === undefined || next === undefined) {
        throw new Error("Face references a missing vertex");
      }
      const vertex = polyhedron.vertices[current];
      const before = polyhedron.vertices[previous];
      const after = polyhedron.vertices[next];
      if (vertex === undefined || before === undefined || after === undefined) {
        throw new Error("Face references a missing vertex");
      }
      angleSums[current] = (angleSums[current] ?? 0)
        + angleBetween(subtract(before, vertex), subtract(after, vertex));
    }
  }
  const deficiencies = angleSums.map((sum) => 2 * Math.PI - sum);
  return {
    angleSums,
    deficiencies,
    total: deficiencies.reduce((sum, value) => sum + value, 0),
  };
}

export function regularCornerAngle(sides: number): number {
  if (!Number.isInteger(sides) || sides < 3) {
    throw new Error(`A polygon needs at least three sides; received ${String(sides)}`);
  }
  return (Math.PI * (sides - 2)) / sides;
}
