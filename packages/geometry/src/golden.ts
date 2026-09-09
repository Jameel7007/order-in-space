import type { Polyhedron, Vec3 } from "./types.js";
import { cross, distance, dot, normalize, scale, subtract } from "./vector.js";

export const PHI = (1 + Math.sqrt(5)) / 2;

export interface GoldenRectangle {
  /** Four corners in cyclic order; consecutive corners are joined by sides. */
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly vertexIndices: readonly [number, number, number, number];
  readonly normal: Vec3;
  readonly shortSide: number;
  readonly longSide: number;
  readonly ratio: number;
}

function antipodeIndex(polyhedron: Polyhedron, index: number, epsilon: number): number {
  const vertex = polyhedron.vertices[index];
  if (vertex === undefined) throw new Error("Vertex index out of range");
  const target = scale(vertex, -1);
  const found = polyhedron.vertices.findIndex((candidate) => distance(candidate, target) <= epsilon);
  if (found < 0) throw new Error("Polyhedron is not centrally symmetric");
  return found;
}

/**
 * Every edge of an icosahedron, together with the antipodes of its two ends,
 * spans a golden rectangle. Nothing is stored: the rectangles are read off the
 * given vertices, and the ratio is measured rather than assumed.
 */
export function goldenRectangles(icosahedron: Polyhedron, epsilon = 1e-8): readonly GoldenRectangle[] {
  const tolerance = epsilon * Math.max(1, icosahedron.circumradius);
  const seen = new Set<string>();
  const rectangles: GoldenRectangle[] = [];
  for (const [start, end] of icosahedron.edges) {
    const a = icosahedron.vertices[start];
    const b = icosahedron.vertices[end];
    if (a === undefined || b === undefined) throw new Error("Edge references a missing vertex");
    const aPrime = antipodeIndex(icosahedron, start, tolerance);
    const bPrime = antipodeIndex(icosahedron, end, tolerance);
    const key = [start, end, aPrime, bPrime].sort((x, y) => x - y).join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    const aOpposite = icosahedron.vertices[aPrime];
    const bOpposite = icosahedron.vertices[bPrime];
    if (aOpposite === undefined || bOpposite === undefined) throw new Error("Antipode lookup failed");
    const corners: readonly [Vec3, Vec3, Vec3, Vec3] = [a, b, aOpposite, bOpposite];
    const shortSide = distance(a, b);
    const longSide = distance(b, aOpposite);
    rectangles.push({
      corners,
      vertexIndices: [start, end, aPrime, bPrime],
      normal: normalize(cross(subtract(b, a), subtract(aOpposite, a))),
      shortSide,
      longSide,
      ratio: longSide / shortSide,
    });
  }
  return rectangles;
}

/**
 * Group the rectangles into sets of three whose planes are mutually
 * perpendicular. A regular icosahedron yields five such triads.
 */
export function orthogonalGoldenTriads(
  icosahedron: Polyhedron,
  epsilon = 1e-8,
): readonly (readonly [GoldenRectangle, GoldenRectangle, GoldenRectangle])[] {
  const rectangles = goldenRectangles(icosahedron, epsilon);
  const triads: (readonly [GoldenRectangle, GoldenRectangle, GoldenRectangle])[] = [];
  const perpendicular = (left: GoldenRectangle, right: GoldenRectangle): boolean => (
    Math.abs(dot(left.normal, right.normal)) <= 1e-7
  );
  for (let i = 0; i < rectangles.length; i += 1) {
    const first = rectangles[i];
    if (first === undefined) continue;
    for (let j = i + 1; j < rectangles.length; j += 1) {
      const second = rectangles[j];
      if (second === undefined || !perpendicular(first, second)) continue;
      for (let k = j + 1; k < rectangles.length; k += 1) {
        const third = rectangles[k];
        if (third === undefined) continue;
        if (perpendicular(first, third) && perpendicular(second, third)) {
          triads.push([first, second, third]);
        }
      }
    }
  }
  return triads;
}

/**
 * Choose the triad whose planes align best with the coordinate axes. This is a
 * presentation choice among mathematically equivalent triads, not a
 * construction step.
 */
export function axisAlignedGoldenTriad(
  icosahedron: Polyhedron,
): readonly [GoldenRectangle, GoldenRectangle, GoldenRectangle] {
  const triads = orthogonalGoldenTriads(icosahedron);
  let best: readonly [GoldenRectangle, GoldenRectangle, GoldenRectangle] | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const triad of triads) {
    const score = triad.reduce((sum, rectangle) => (
      sum + Math.max(Math.abs(rectangle.normal.x), Math.abs(rectangle.normal.y), Math.abs(rectangle.normal.z))
    ), 0);
    if (score > bestScore) {
      bestScore = score;
      best = triad;
    }
  }
  if (best === undefined) throw new Error("No orthogonal golden triad was found");
  return best;
}
