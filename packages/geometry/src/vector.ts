import type { Vec3 } from "./types.js";

export const VECTOR_EPSILON = 1e-12;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scale(vector: Vec3, scalar: number): Vec3 {
  return vec3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function lengthSquared(vector: Vec3): number {
  return dot(vector, vector);
}

export function length(vector: Vec3): number {
  return Math.sqrt(lengthSquared(vector));
}

export function distance(a: Vec3, b: Vec3): number {
  return length(subtract(a, b));
}

export function normalize(vector: Vec3): Vec3 {
  const magnitude = length(vector);
  if (magnitude <= VECTOR_EPSILON) {
    throw new Error("Cannot normalize a zero-length vector");
  }
  return scale(vector, 1 / magnitude);
}

export function centroid(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) {
    throw new Error("Cannot find the centroid of no points");
  }

  const sum = points.reduce((current, point) => add(current, point), vec3(0, 0, 0));
  return scale(sum, 1 / points.length);
}

export function approximatelyEqual(a: Vec3, b: Vec3, epsilon = 1e-9): boolean {
  return distance(a, b) <= epsilon;
}

