import type { Polyhedron } from "./types.js";
import { length, scale } from "./vector.js";

export function normalizeCircumradius(polyhedron: Polyhedron, radius = 1): Polyhedron {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`Circumradius must be positive and finite; received ${String(radius)}`);
  }
  const currentRadius = Math.max(...polyhedron.vertices.map(length));
  if (currentRadius <= 1e-12) {
    throw new Error("Cannot normalize a polyhedron with zero circumradius");
  }
  const factor = radius / currentRadius;
  return {
    ...polyhedron,
    vertices: polyhedron.vertices.map((vertex) => scale(vertex, factor)),
    circumradius: radius,
  };
}
