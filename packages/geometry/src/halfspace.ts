import { convexHull } from "./hull.js";
import { determinant, matrixFromRows, solveLinear3 } from "./matrix.js";
import type { Polyhedron, Vec3 } from "./types.js";
import { distance, dot, length, vec3 } from "./vector.js";

export interface HalfSpace {
  /** The retained region satisfies dot(normal, point) <= offset. */
  readonly normal: Vec3;
  readonly offset: number;
}

export interface HalfSpaceIntersectionOptions {
  readonly symbol?: string;
  readonly epsilon?: number;
}

export function intersectHalfSpaces(
  halfSpaces: readonly HalfSpace[],
  options: HalfSpaceIntersectionOptions = {},
): Polyhedron {
  if (halfSpaces.length < 4) {
    throw new Error("A bounded three-dimensional cell needs at least four half-spaces");
  }
  const scaleMagnitude = Math.max(1, ...halfSpaces.map(({ offset, normal }) => (
    Math.abs(offset) / Math.max(length(normal), 1e-12)
  )));
  const epsilon = (options.epsilon ?? 1e-8) * scaleMagnitude;
  const candidates: Vec3[] = [];

  for (let i = 0; i < halfSpaces.length - 2; i += 1) {
    const first = halfSpaces[i];
    if (first === undefined) continue;
    for (let j = i + 1; j < halfSpaces.length - 1; j += 1) {
      const second = halfSpaces[j];
      if (second === undefined) continue;
      for (let k = j + 1; k < halfSpaces.length; k += 1) {
        const third = halfSpaces[k];
        if (third === undefined) continue;
        const rows = [first.normal, second.normal, third.normal] as const;
        if (Math.abs(determinant(matrixFromRows(...rows))) <= 1e-10) continue;
        const point = solveLinear3(rows, vec3(first.offset, second.offset, third.offset));
        const isInside = halfSpaces.every(({ normal, offset }) => (
          dot(normal, point) <= offset + epsilon * Math.max(1, length(normal))
        ));
        if (!isInside) continue;
        if (!candidates.some((existing) => distance(existing, point) <= epsilon)) {
          candidates.push(point);
        }
      }
    }
  }

  if (candidates.length < 4) {
    throw new Error("Half-spaces do not define a bounded three-dimensional cell");
  }
  const hullOptions = options.epsilon === undefined
    ? { symbol: options.symbol ?? "half-space intersection" }
    : { symbol: options.symbol ?? "half-space intersection", epsilon: options.epsilon };
  return convexHull(candidates, hullOptions);
}
