import { createCoxeterSystem } from "./coxeter.js";
import { convexHull } from "./hull.js";
import { applyMatrix, determinant } from "./matrix.js";
import type { CoxeterTriangle, MirrorDistances, Polyhedron } from "./types.js";
import { distance } from "./vector.js";
import {
  wythoffGenerator,
  type CorrespondencePoint,
} from "./wythoff.js";

export type Chirality = "left" | "right";

export interface SnubGeneratorSolution {
  readonly generator: MirrorDistances;
  readonly relativeEdgeResidual: number;
}

export interface SnubOptions {
  readonly chirality?: Chirality;
  readonly circumradius?: number;
  readonly symbol?: string;
}

const solutionCache = new Map<string, SnubGeneratorSolution>();
const searchDirections: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function rotationalElements(triangle: CoxeterTriangle, chirality: Chirality) {
  const determinantSign = chirality === "right" ? 1 : -1;
  return createCoxeterSystem(triangle).group
    .map((matrix, groupElement) => ({ matrix, groupElement }))
    .filter(({ matrix }) => Math.sign(determinant(matrix)) === determinantSign);
}

function nearestFiveResidual(
  triangle: CoxeterTriangle,
  logarithmicDistance1: number,
  logarithmicDistance2: number,
): number {
  const generatorDistances: MirrorDistances = [
    1,
    Math.exp(logarithmicDistance1),
    Math.exp(logarithmicDistance2),
  ];
  const seed = wythoffGenerator(triangle, generatorDistances);
  const neighborDistances = rotationalElements(triangle, "right")
    .map(({ matrix }) => distance(seed, applyMatrix(matrix, seed)))
    .filter((value) => value > 1e-8)
    .sort((a, b) => a - b)
    .slice(0, 5);

  if (neighborDistances.length !== 5) {
    return Number.POSITIVE_INFINITY;
  }
  const mean = neighborDistances.reduce((sum, value) => sum + value, 0) / neighborDistances.length;
  const minimum = neighborDistances[0];
  const maximum = neighborDistances[4];
  if (minimum === undefined || maximum === undefined || mean <= 1e-12) {
    return Number.POSITIVE_INFINITY;
  }
  return (maximum - minimum) / mean;
}

/**
 * Derive the off-mirror snub generator by equalizing its five nearest
 * rotational-orbit neighbors. The logarithmic variables keep every mirror
 * distance positive, and the calculation starts without a coordinate table or
 * named-solid constants.
 */
export function solveSnubGenerator(triangle: CoxeterTriangle): SnubGeneratorSolution {
  const key = triangle.join(":");
  const cached = solutionCache.get(key);
  if (cached !== undefined) return cached;

  if (triangle[0] !== 2 || triangle[1] !== 3 || triangle[2] < 4) {
    throw new Error("The five-neighbor snub construction requires a (2,3,n) group with n >= 4");
  }

  let x = 0;
  let y = 0;
  let step = 0.25;
  let residual = nearestFiveResidual(triangle, x, y);

  for (let iteration = 0; iteration < 200 && step > 1e-13; iteration += 1) {
    let improved = false;
    for (const [directionX, directionY] of searchDirections) {
      const candidateX = x + directionX * step;
      const candidateY = y + directionY * step;
      const candidateResidual = nearestFiveResidual(triangle, candidateX, candidateY);
      if (candidateResidual + 1e-16 < residual) {
        x = candidateX;
        y = candidateY;
        residual = candidateResidual;
        improved = true;
        break;
      }
    }
    if (!improved) step *= 0.5;
  }

  if (!Number.isFinite(residual) || residual > 1e-9) {
    throw new Error(`Snub generator equal-edge solve did not converge; residual ${String(residual)}`);
  }

  const solution: SnubGeneratorSolution = {
    generator: [1, Math.exp(x), Math.exp(y)],
    relativeEdgeResidual: residual,
  };
  solutionCache.set(key, solution);
  return solution;
}

export function rotationalWythoffCorrespondence(
  triangle: CoxeterTriangle,
  distances: MirrorDistances,
  chirality: Chirality = "right",
  circumradius = 1,
): readonly CorrespondencePoint[] {
  const seed = wythoffGenerator(triangle, distances, circumradius);
  return rotationalElements(triangle, chirality).map(({ matrix, groupElement }) => ({
    groupElement,
    position: applyMatrix(matrix, seed),
  }));
}

export function snub(
  triangle: CoxeterTriangle,
  options: SnubOptions = {},
): Polyhedron {
  const solution = solveSnubGenerator(triangle);
  const correspondence = rotationalWythoffCorrespondence(
    triangle,
    solution.generator,
    options.chirality ?? "right",
    options.circumradius ?? 1,
  );
  return convexHull(correspondence.map(({ position }) => position), {
    symbol: options.symbol ?? `s(${triangle.join(",")})`,
  });
}

