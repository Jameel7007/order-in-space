import type { Edge, Face, Polyhedron, Vec3 } from "./types.js";
import {
  centroid,
  cross,
  dot,
  length,
  normalize,
  scale,
  subtract,
} from "./vector.js";

export interface HullOptions {
  readonly symbol?: string;
  readonly epsilon?: number;
}

function planeKey(normal: Vec3, offset: number, epsilon: number): string {
  return [normal.x, normal.y, normal.z, offset]
    .map((value) => Math.round(value / epsilon))
    .join(":");
}

interface PlanarPoint {
  readonly index: number;
  readonly u: number;
  readonly v: number;
}

function planarCross(o: PlanarPoint, a: PlanarPoint, b: PlanarPoint): number {
  return (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
}

/**
 * Keep only the strict corners of a supporting plane's point set, in
 * counter-clockwise order about the outward normal. Points that lie on a face
 * interior or along an edge (a sphere sitting mid-face in a packing shell, for
 * instance) support the plane but are not vertices of the polygon.
 */
function orderFace(
  indices: readonly number[],
  points: readonly Vec3[],
  outwardNormal: Vec3,
  epsilon: number,
): Face {
  const faceCenter = centroid(indices.map((index) => {
    const point = points[index];
    if (point === undefined) {
      throw new Error("Face references a missing point");
    }
    return point;
  }));
  const seed = indices
    .map((index) => {
      const point = points[index];
      if (point === undefined) throw new Error("Face references a missing point");
      return { index, offset: subtract(point, faceCenter) };
    })
    .reduce((best, candidate) => (length(candidate.offset) > length(best.offset) ? candidate : best));
  const basisU = normalize(seed.offset);
  const basisV = cross(outwardNormal, basisU);
  const planar = indices
    .map((index) => {
      const point = points[index];
      if (point === undefined) throw new Error("Face references a missing point");
      const relative = subtract(point, faceCenter);
      return { index, u: dot(relative, basisU), v: dot(relative, basisV) };
    })
    .sort((left, right) => left.u - right.u || left.v - right.v || left.index - right.index);

  const cornerEpsilon = epsilon * length(seed.offset);
  const lower: PlanarPoint[] = [];
  for (const point of planar) {
    while (lower.length >= 2) {
      const a = lower[lower.length - 2];
      const b = lower[lower.length - 1];
      if (a === undefined || b === undefined || planarCross(a, b, point) > cornerEpsilon) break;
      lower.pop();
    }
    lower.push(point);
  }
  const upper: PlanarPoint[] = [];
  for (let cursor = planar.length - 1; cursor >= 0; cursor -= 1) {
    const point = planar[cursor];
    if (point === undefined) continue;
    while (upper.length >= 2) {
      const a = upper[upper.length - 2];
      const b = upper[upper.length - 1];
      if (a === undefined || b === undefined || planarCross(a, b, point) > cornerEpsilon) break;
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  // The chain never pops its own end points, so a point lying on an edge that
  // happens to be extreme in u (within rounding) can survive. Remove any
  // remaining corner that is collinear with its cyclic neighbors.
  const ring = [...lower, ...upper];
  let pruned = true;
  while (pruned && ring.length > 3) {
    pruned = false;
    for (let cursor = 0; cursor < ring.length; cursor += 1) {
      const before = ring[(cursor + ring.length - 1) % ring.length];
      const current = ring[cursor];
      const after = ring[(cursor + 1) % ring.length];
      if (before === undefined || current === undefined || after === undefined) continue;
      if (Math.abs(planarCross(before, current, after)) <= cornerEpsilon) {
        ring.splice(cursor, 1);
        pruned = true;
        break;
      }
    }
  }
  const corners = ring.map(({ index }) => index);
  if (corners.length < 3) {
    throw new Error("A supporting plane produced fewer than three corners");
  }
  return corners;
}

function extractEdges(faces: readonly Face[]): readonly Edge[] {
  const edges = new Map<string, Edge>();
  for (const face of faces) {
    for (let index = 0; index < face.length; index += 1) {
      const start = face[index];
      const end = face[(index + 1) % face.length];
      if (start === undefined || end === undefined) {
        throw new Error("Face edge references a missing vertex");
      }
      const edge: Edge = start < end ? [start, end] : [end, start];
      edges.set(`${edge[0]}:${edge[1]}`, edge);
    }
  }
  return [...edges.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function convexHull(points: readonly Vec3[], options: HullOptions = {}): Polyhedron {
  if (points.length < 4) {
    throw new Error("A three-dimensional convex hull needs at least four points");
  }

  const scaleMagnitude = Math.max(...points.map(length));
  const epsilon = (options.epsilon ?? 1e-8) * Math.max(1, scaleMagnitude);
  const facesByPlane = new Map<string, Face>();

  for (let i = 0; i < points.length - 2; i += 1) {
    const a = points[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < points.length - 1; j += 1) {
      const b = points[j];
      if (b === undefined) continue;
      for (let k = j + 1; k < points.length; k += 1) {
        const c = points[k];
        if (c === undefined) continue;
        const rawNormal = cross(subtract(b, a), subtract(c, a));
        if (length(rawNormal) <= epsilon * epsilon) continue;

        let normal = normalize(rawNormal);
        let offset = dot(normal, a);
        let maximum = Number.NEGATIVE_INFINITY;
        let minimum = Number.POSITIVE_INFINITY;
        for (const point of points) {
          const signedDistance = dot(normal, point) - offset;
          maximum = Math.max(maximum, signedDistance);
          minimum = Math.min(minimum, signedDistance);
        }

        if (maximum > epsilon && minimum < -epsilon) continue;
        if (minimum >= -epsilon) {
          normal = scale(normal, -1);
          offset *= -1;
        }

        const coplanar: number[] = [];
        points.forEach((point, pointIndex) => {
          if (Math.abs(dot(normal, point) - offset) <= epsilon) {
            coplanar.push(pointIndex);
          }
        });
        if (coplanar.length < 3) continue;

        const key = planeKey(normal, offset, epsilon * 10);
        if (!facesByPlane.has(key)) {
          facesByPlane.set(key, orderFace(coplanar, points, normal, epsilon));
        }
      }
    }
  }

  const faces = [...facesByPlane.values()];
  if (faces.length < 4) {
    throw new Error("Points do not form a closed three-dimensional convex hull");
  }
  // A hull may be constructed from packing centers that also contain interior
  // points (notably the nucleus). Keep only vertices referenced by supporting
  // planes and remap topology deterministically.
  const usedIndices = [...new Set(faces.flat())].sort((a, b) => a - b);
  const remap = new Map(usedIndices.map((original, compact) => [original, compact]));
  const vertices = usedIndices.map((index) => {
    const point = points[index];
    if (point === undefined) throw new Error("Hull references a missing point");
    return point;
  });
  const compactFaces = faces.map((face) => face.map((index) => {
    const compact = remap.get(index);
    if (compact === undefined) throw new Error("Hull vertex remapping failed");
    return compact;
  }));
  const edges = extractEdges(compactFaces);
  // For non-vertex-transitive cells this is the radius of the smallest
  // origin-centered containing sphere, not a claim that every vertex is
  // cospherical. `radiusSpread` exposes that distinction.
  const circumradius = Math.max(...vertices.map(length));
  return {
    vertices,
    edges,
    faces: compactFaces,
    symbol: options.symbol ?? "",
    circumradius,
  };
}
