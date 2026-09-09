import type { Edge, Face, Polyhedron, Vec3 } from "./types.js";
import {
  centroid,
  cross,
  distance,
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

interface Triangle {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly normal: Vec3;
  readonly offset: number;
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

function makeTriangle(points: readonly Vec3[], a: number, b: number, c: number): Triangle | undefined {
  const pa = points[a];
  const pb = points[b];
  const pc = points[c];
  if (pa === undefined || pb === undefined || pc === undefined) {
    throw new Error("Triangle references a missing point");
  }
  const raw = cross(subtract(pb, pa), subtract(pc, pa));
  const magnitude = length(raw);
  if (magnitude <= 1e-18) return undefined;
  const normal = scale(raw, 1 / magnitude);
  return { a, b, c, normal, offset: dot(normal, pa) };
}

function signedDistance(triangle: Triangle, point: Vec3): number {
  return dot(triangle.normal, point) - triangle.offset;
}

function initialSimplex(points: readonly Vec3[], epsilon: number): Triangle[] {
  let minX = 0;
  let maxX = 0;
  points.forEach((point, index) => {
    const low = points[minX];
    const high = points[maxX];
    if (low !== undefined && point.x < low.x) minX = index;
    if (high !== undefined && point.x > high.x) maxX = index;
  });
  const first = points[minX];
  const second = points[maxX];
  if (first === undefined || second === undefined || distance(first, second) <= epsilon) {
    throw new Error("Points do not form a closed three-dimensional convex hull");
  }

  let third = -1;
  let widest = epsilon;
  const axis = subtract(second, first);
  points.forEach((point, index) => {
    const spread = length(cross(axis, subtract(point, first))) / length(axis);
    if (spread > widest) {
      widest = spread;
      third = index;
    }
  });
  if (third < 0) throw new Error("Points do not form a closed three-dimensional convex hull");

  const base = makeTriangle(points, minX, maxX, third);
  if (base === undefined) throw new Error("Points do not form a closed three-dimensional convex hull");
  let fourth = -1;
  let tallest = epsilon;
  points.forEach((point, index) => {
    const height = Math.abs(signedDistance(base, point));
    if (height > tallest) {
      tallest = height;
      fourth = index;
    }
  });
  if (fourth < 0) throw new Error("Points do not form a closed three-dimensional convex hull");

  const apex = points[fourth];
  if (apex === undefined) throw new Error("Simplex apex is missing");
  const [a, b, c] = signedDistance(base, apex) > 0
    ? [base.b, base.a, base.c]
    : [base.a, base.b, base.c];
  const candidates = [
    makeTriangle(points, a, b, c),
    makeTriangle(points, a, c, fourth),
    makeTriangle(points, c, b, fourth),
    makeTriangle(points, b, a, fourth),
  ];
  const simplex: Triangle[] = [];
  for (const triangle of candidates) {
    if (triangle === undefined) throw new Error("Initial simplex is degenerate");
    simplex.push(triangle);
  }
  return simplex;
}

/**
 * Incremental quickhull. Every step adds the point farthest outside the
 * current hull, removes the faces it can see, and closes the horizon with new
 * triangles. Points inside or on the hull are never promoted to vertices.
 */
function quickhullTriangles(points: readonly Vec3[], epsilon: number): readonly Triangle[] {
  let triangles = initialSimplex(points, epsilon);
  const pending = new Set<number>(points.map((_, index) => index));
  for (const triangle of triangles) {
    pending.delete(triangle.a);
    pending.delete(triangle.b);
    pending.delete(triangle.c);
  }

  for (;;) {
    let farthestIndex = -1;
    let farthestDistance = epsilon;
    for (const index of pending) {
      const point = points[index];
      if (point === undefined) continue;
      let outside = Number.NEGATIVE_INFINITY;
      for (const triangle of triangles) {
        outside = Math.max(outside, signedDistance(triangle, point));
      }
      if (outside <= epsilon) {
        pending.delete(index);
        continue;
      }
      if (outside > farthestDistance) {
        farthestDistance = outside;
        farthestIndex = index;
      }
    }
    if (farthestIndex < 0) break;
    pending.delete(farthestIndex);
    const apex = points[farthestIndex];
    if (apex === undefined) throw new Error("Hull apex is missing");

    const visible = new Set<Triangle>();
    for (const triangle of triangles) {
      if (signedDistance(triangle, apex) > epsilon) visible.add(triangle);
    }
    const directedEdges = new Map<string, readonly [number, number]>();
    for (const triangle of visible) {
      for (const [start, end] of [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]] as const) {
        directedEdges.set(`${String(start)}:${String(end)}`, [start, end]);
      }
    }
    const horizon: (readonly [number, number])[] = [];
    for (const [start, end] of directedEdges.values()) {
      if (!directedEdges.has(`${String(end)}:${String(start)}`)) horizon.push([start, end]);
    }
    const next = triangles.filter((triangle) => !visible.has(triangle));
    for (const [start, end] of horizon) {
      const triangle = makeTriangle(points, start, end, farthestIndex);
      if (triangle !== undefined) next.push(triangle);
    }
    triangles = next;
  }
  return triangles;
}

interface PlaneGroup {
  readonly normal: Vec3;
  readonly offset: number;
  readonly indices: Set<number>;
}

function groupCoplanarTriangles(
  triangles: readonly Triangle[],
  points: readonly Vec3[],
  epsilon: number,
): readonly PlaneGroup[] {
  const groups: PlaneGroup[] = [];
  for (const triangle of triangles) {
    const group = groups.find((candidate) => (
      dot(candidate.normal, triangle.normal) > 1 - 1e-9
      && [triangle.a, triangle.b, triangle.c].every((index) => {
        const point = points[index];
        return point !== undefined && Math.abs(dot(candidate.normal, point) - candidate.offset) <= epsilon;
      })
    ));
    if (group === undefined) {
      groups.push({
        normal: triangle.normal,
        offset: triangle.offset,
        indices: new Set([triangle.a, triangle.b, triangle.c]),
      });
    } else {
      group.indices.add(triangle.a);
      group.indices.add(triangle.b);
      group.indices.add(triangle.c);
    }
  }
  return groups;
}

export function convexHull(points: readonly Vec3[], options: HullOptions = {}): Polyhedron {
  if (points.length < 4) {
    throw new Error("A three-dimensional convex hull needs at least four points");
  }

  const scaleMagnitude = Math.max(...points.map(length));
  const epsilon = (options.epsilon ?? 1e-8) * Math.max(1, scaleMagnitude);
  const triangles = quickhullTriangles(points, epsilon);
  if (triangles.length < 4) {
    throw new Error("Points do not form a closed three-dimensional convex hull");
  }
  const groups = groupCoplanarTriangles(triangles, points, epsilon);
  const faces = groups
    .map((group) => orderFace([...group.indices].sort((a, b) => a - b), points, group.normal, epsilon))
    .sort((left, right) => {
      const leftKey = [...left].sort((a, b) => a - b);
      const rightKey = [...right].sort((a, b) => a - b);
      for (let index = 0; index < Math.min(leftKey.length, rightKey.length); index += 1) {
        const difference = (leftKey[index] ?? 0) - (rightKey[index] ?? 0);
        if (difference !== 0) return difference;
      }
      return leftKey.length - rightKey.length;
    });
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
