import type { CoxeterTriangle, MirrorDistances } from "@order-in-space/geometry";

export interface TruncationWaypoint {
  readonly progress: number;
  readonly name: string;
  readonly invitation: string;
  readonly symbol: string;
  readonly distances: MirrorDistances;
}

export interface TruncationPathSample {
  readonly progress: number;
  readonly segment: number;
  readonly segmentProgress: number;
  readonly triangle: CoxeterTriangle;
  readonly distances: MirrorDistances;
  readonly nearestWaypoint: TruncationWaypoint;
  readonly atNamedPosition: boolean;
}

export const ICOSAHEDRAL_TRUNCATION_WAYPOINTS: readonly TruncationWaypoint[] = [
  {
    progress: 0,
    name: "Icosahedron",
    invitation: "Twelve corners wake up",
    symbol: "{3,5}",
    distances: [0, 0, 1],
  },
  {
    progress: 0.24,
    name: "Truncated icosahedron",
    invitation: "The familiar football appears",
    symbol: "t{3,5}",
    distances: [0, 1, 1],
  },
  {
    progress: 0.5,
    name: "Icosidodecahedron",
    invitation: "Triangles and pentagons meet",
    symbol: "r{5,3}",
    distances: [0, 1, 0],
  },
  {
    progress: 0.76,
    name: "Truncated dodecahedron",
    invitation: "The pentagons open out",
    symbol: "t{5,3}",
    distances: [1, 1, 0],
  },
  {
    progress: 1,
    name: "Dodecahedron",
    invitation: "Twenty corners settle into place",
    symbol: "{5,3}",
    distances: [1, 0, 0],
  },
] as const;

const TRIANGLE: CoxeterTriangle = [2, 3, 5];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function interpolateDistances(
  left: MirrorDistances,
  right: MirrorDistances,
  progress: number,
): MirrorDistances {
  return left.map((value, index) => (
    value + ((right[index] ?? value) - value) * progress
  )) as unknown as MirrorDistances;
}

/**
 * A reversible, renderer-independent sample of the icosahedral portion of
 * Scene 6. The solid is always a consequence of the moving generator.
 */
export function sampleTruncationPath(progress: number): TruncationPathSample {
  const normalized = clamp01(progress);
  let segment = ICOSAHEDRAL_TRUNCATION_WAYPOINTS.length - 2;
  for (let index = 0; index < ICOSAHEDRAL_TRUNCATION_WAYPOINTS.length - 1; index += 1) {
    const right = ICOSAHEDRAL_TRUNCATION_WAYPOINTS[index + 1];
    if (right !== undefined && normalized <= right.progress) {
      segment = index;
      break;
    }
  }

  const left = ICOSAHEDRAL_TRUNCATION_WAYPOINTS[segment];
  const right = ICOSAHEDRAL_TRUNCATION_WAYPOINTS[segment + 1];
  if (left === undefined || right === undefined) {
    throw new Error("Truncation path segment is incomplete");
  }
  const span = right.progress - left.progress;
  const segmentProgress = span <= 0 ? 0 : (normalized - left.progress) / span;
  const nearestWaypoint = segmentProgress < 0.5 ? left : right;
  const namedDistance = Math.min(
    Math.abs(normalized - left.progress),
    Math.abs(normalized - right.progress),
  );

  return {
    progress: normalized,
    segment,
    segmentProgress,
    triangle: TRIANGLE,
    distances: interpolateDistances(left.distances, right.distances, segmentProgress),
    nearestWaypoint,
    atNamedPosition: namedDistance <= 1e-9,
  };
}
