import type { Polyhedron, Vec3 } from "./types.js";
import { centroid, cross, distance, dot, length, subtract } from "./vector.js";

export function eulerCharacteristic(polyhedron: Polyhedron): number {
  return polyhedron.vertices.length - polyhedron.edges.length + polyhedron.faces.length;
}

export function edgeLengths(polyhedron: Polyhedron): readonly number[] {
  return polyhedron.edges.map(([start, end]) => {
    const a = polyhedron.vertices[start];
    const b = polyhedron.vertices[end];
    if (a === undefined || b === undefined) {
      throw new Error("Edge references a missing vertex");
    }
    return distance(a, b);
  });
}

export function radiusSpread(polyhedron: Polyhedron): number {
  const radii = polyhedron.vertices.map(length);
  return Math.max(...radii) - Math.min(...radii);
}

export function edgeLengthSpread(polyhedron: Polyhedron): number {
  const lengths = edgeLengths(polyhedron);
  return Math.max(...lengths) - Math.min(...lengths);
}

export function faceNormal(polyhedron: Polyhedron, faceIndex: number): Vec3 {
  const face = polyhedron.faces[faceIndex];
  if (face === undefined || face.length < 3) {
    throw new Error("A face normal needs at least three vertices");
  }
  const a = polyhedron.vertices[face[0] ?? -1];
  const b = polyhedron.vertices[face[1] ?? -1];
  const c = polyhedron.vertices[face[2] ?? -1];
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("Face references a missing vertex");
  }
  return cross(subtract(b, a), subtract(c, a));
}

export function isFaceWoundOutward(polyhedron: Polyhedron, faceIndex: number, epsilon = 1e-10): boolean {
  const face = polyhedron.faces[faceIndex];
  if (face === undefined) return false;
  const faceCenter = centroid(face.map((index) => {
    const vertex = polyhedron.vertices[index];
    if (vertex === undefined) throw new Error("Face references a missing vertex");
    return vertex;
  }));
  return dot(faceNormal(polyhedron, faceIndex), faceCenter) > epsilon;
}

