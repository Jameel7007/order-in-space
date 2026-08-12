import { createCoxeterSystem } from "./coxeter.js";
import { convexHull } from "./hull.js";
import { applyMatrix, solveLinear3 } from "./matrix.js";
import type {
  CoxeterTriangle,
  MirrorDistances,
  Polyhedron,
  Vec3,
} from "./types.js";
import { distance, normalize, scale, vec3 } from "./vector.js";

export interface CorrespondencePoint {
  readonly groupElement: number;
  readonly position: Vec3;
}

export interface OrbitVertex {
  readonly position: Vec3;
  readonly groupElements: readonly number[];
}

export interface WythoffOptions {
  readonly circumradius?: number;
  readonly symbol?: string;
  readonly mergeEpsilon?: number;
}

function validateDistances(distances: MirrorDistances): void {
  if (distances.every((value) => Math.abs(value) <= 1e-12)) {
    throw new Error("A Wythoff generator cannot lie on all three mirrors");
  }
  for (const value of distances) {
    if (!Number.isFinite(value) || value < -1e-12) {
      throw new Error("Mirror distances must be finite and non-negative inside the fundamental chamber");
    }
  }
}

export function wythoffGenerator(
  triangle: CoxeterTriangle,
  distances: MirrorDistances,
  circumradius = 1,
): Vec3 {
  validateDistances(distances);
  if (!Number.isFinite(circumradius) || circumradius <= 0) {
    throw new Error("Circumradius must be positive and finite");
  }
  const system = createCoxeterSystem(triangle);
  const raw = solveLinear3(system.mirrors, vec3(...distances));
  return scale(normalize(raw), circumradius);
}

export function wythoffCorrespondence(
  triangle: CoxeterTriangle,
  distances: MirrorDistances,
  circumradius = 1,
): readonly CorrespondencePoint[] {
  const system = createCoxeterSystem(triangle);
  const generator = wythoffGenerator(triangle, distances, circumradius);
  return system.group.map((element, groupElement) => ({
    groupElement,
    position: applyMatrix(element, generator),
  }));
}

export function mergeWythoffOrbit(
  correspondence: readonly CorrespondencePoint[],
  epsilon = 1e-8,
): readonly OrbitVertex[] {
  const vertices: { position: Vec3; groupElements: number[] }[] = [];
  for (const point of correspondence) {
    const existing = vertices.find((vertex) => distance(vertex.position, point.position) <= epsilon);
    if (existing === undefined) {
      vertices.push({ position: point.position, groupElements: [point.groupElement] });
    } else {
      existing.groupElements.push(point.groupElement);
    }
  }
  return vertices;
}

export function wythoffOrbit(
  triangle: CoxeterTriangle,
  distances: MirrorDistances,
  options: WythoffOptions = {},
): readonly OrbitVertex[] {
  const radius = options.circumradius ?? 1;
  return mergeWythoffOrbit(
    wythoffCorrespondence(triangle, distances, radius),
    (options.mergeEpsilon ?? 1e-8) * radius,
  );
}

export function wythoff(
  triangle: CoxeterTriangle,
  distances: MirrorDistances,
  options: WythoffOptions = {},
): Polyhedron {
  const orbit = wythoffOrbit(triangle, distances, options);
  return convexHull(orbit.map((vertex) => vertex.position), {
    symbol: options.symbol ?? `(${triangle.join(",")})`,
  });
}

