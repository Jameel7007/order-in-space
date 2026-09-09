import { applyMatrix, matrixFromRows, multiplyMatrices, type Matrix3 } from "./matrix.js";
import type { Polyhedron, Vec3 } from "./types.js";
import {
  add,
  cross,
  dot,
  length,
  normalize,
  scale,
  subtract,
  vec3,
} from "./vector.js";

export function transposeMatrix(matrix: Matrix3): Matrix3 {
  return [
    matrix[0], matrix[3], matrix[6],
    matrix[1], matrix[4], matrix[7],
    matrix[2], matrix[5], matrix[8],
  ];
}

/** Rodrigues rotation about a unit axis. */
export function rotationAboutAxis(axis: Vec3, angle: number): Matrix3 {
  const { x, y, z } = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

function orthonormalFrame(primary: Vec3, secondary: Vec3): readonly [Vec3, Vec3, Vec3] {
  const a = normalize(primary);
  const projected = subtract(secondary, scale(a, dot(secondary, a)));
  if (length(projected) <= 1e-12) {
    throw new Error("Frame vectors must not be parallel");
  }
  const b = normalize(projected);
  return [a, b, cross(a, b)];
}

function matrixFromColumns(c0: Vec3, c1: Vec3, c2: Vec3): Matrix3 {
  return [
    c0.x, c1.x, c2.x,
    c0.y, c1.y, c2.y,
    c0.z, c1.z, c2.z,
  ];
}

/**
 * The proper rotation that carries the orthonormal frame built from
 * (sourcePrimary, sourceSecondary) onto the frame built from
 * (targetPrimary, targetSecondary). Used to bring one construction into the
 * orientation of another without any hand-tuned angles.
 */
export function rotationFromFrames(
  sourcePrimary: Vec3,
  sourceSecondary: Vec3,
  targetPrimary: Vec3,
  targetSecondary: Vec3,
): Matrix3 {
  const source = orthonormalFrame(sourcePrimary, sourceSecondary);
  const target = orthonormalFrame(targetPrimary, targetSecondary);
  const sourceInverse = matrixFromRows(source[0], source[1], source[2]);
  const targetMatrix = matrixFromColumns(target[0], target[1], target[2]);
  return multiplyMatrices(targetMatrix, sourceInverse);
}

export function transformPolyhedron(polyhedron: Polyhedron, matrix: Matrix3): Polyhedron {
  return {
    ...polyhedron,
    vertices: polyhedron.vertices.map((vertex) => applyMatrix(matrix, vertex)),
  };
}

export function translatePolyhedron(polyhedron: Polyhedron, offset: Vec3): Polyhedron {
  const vertices = polyhedron.vertices.map((vertex) => add(vertex, offset));
  return {
    ...polyhedron,
    vertices,
    circumradius: Math.max(...vertices.map(length)),
  };
}

export function scalePolyhedron(polyhedron: Polyhedron, factor: number): Polyhedron {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(`Scale factor must be positive and finite; received ${String(factor)}`);
  }
  return {
    ...polyhedron,
    vertices: polyhedron.vertices.map((vertex) => scale(vertex, factor)),
    circumradius: polyhedron.circumradius * factor,
  };
}

export function vertexNeighbors(polyhedron: Polyhedron, vertexIndex: number): readonly number[] {
  const neighbors: number[] = [];
  for (const [start, end] of polyhedron.edges) {
    if (start === vertexIndex) neighbors.push(end);
    else if (end === vertexIndex) neighbors.push(start);
  }
  return neighbors.sort((a, b) => a - b);
}

/**
 * Rotate a polyhedron so that one vertex points along +y and one of its
 * edges leaves that vertex towards the +x half-plane (zero azimuth). This is
 * the canonical "corner on top" pose shared by the vertex-figure fold.
 */
export function orientVertexToTop(polyhedron: Polyhedron, vertexIndex = 0): Polyhedron {
  const vertex = polyhedron.vertices[vertexIndex];
  if (vertex === undefined) throw new Error("Vertex index out of range");
  const neighborIndex = vertexNeighbors(polyhedron, vertexIndex)[0];
  const neighbor = neighborIndex === undefined ? undefined : polyhedron.vertices[neighborIndex];
  if (neighbor === undefined) throw new Error("Vertex has no incident edge");
  const rotation = rotationFromFrames(
    vertex,
    subtract(neighbor, vertex),
    vec3(0, 1, 0),
    vec3(1, 0, 0),
  );
  return transformPolyhedron(polyhedron, rotation);
}

export function edgeMidpoints(polyhedron: Polyhedron): readonly Vec3[] {
  return polyhedron.edges.map(([start, end]) => {
    const a = polyhedron.vertices[start];
    const b = polyhedron.vertices[end];
    if (a === undefined || b === undefined) throw new Error("Edge references a missing vertex");
    return scale(add(a, b), 0.5);
  });
}

/**
 * Rotate `source` so that its first vertex and first incident edge land on the
 * corresponding vertex and edge of `target`. For regular solids the rotation
 * group acts transitively on directed edges, so this carries the whole vertex
 * set of one copy onto the other.
 */
export function alignSolids(source: Polyhedron, target: Polyhedron): Matrix3 {
  const sourceVertex = source.vertices[0];
  const targetVertex = target.vertices[0];
  const sourceNeighborIndex = vertexNeighbors(source, 0)[0];
  const targetNeighborIndex = vertexNeighbors(target, 0)[0];
  const sourceNeighbor = sourceNeighborIndex === undefined ? undefined : source.vertices[sourceNeighborIndex];
  const targetNeighbor = targetNeighborIndex === undefined ? undefined : target.vertices[targetNeighborIndex];
  if (sourceVertex === undefined || targetVertex === undefined
    || sourceNeighbor === undefined || targetNeighbor === undefined) {
    throw new Error("Both solids need a vertex with an incident edge");
  }
  return rotationFromFrames(
    sourceVertex,
    subtract(sourceNeighbor, sourceVertex),
    targetVertex,
    subtract(targetNeighbor, targetVertex),
  );
}

/** Largest distance from any vertex of `a` to the nearest vertex of `b`. */
export function vertexSetDistance(a: Polyhedron, b: Polyhedron): number {
  return Math.max(...a.vertices.map((vertex) => (
    Math.min(...b.vertices.map((candidate) => length(subtract(candidate, vertex))))
  )));
}
