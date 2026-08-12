import type { Vec3 } from "./types.js";
import { dot, vec3 } from "./vector.js";

export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const IDENTITY_MATRIX: Matrix3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

export function matrixFromRows(row0: Vec3, row1: Vec3, row2: Vec3): Matrix3 {
  return [
    row0.x, row0.y, row0.z,
    row1.x, row1.y, row1.z,
    row2.x, row2.y, row2.z,
  ];
}

export function multiplyMatrices(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

export function applyMatrix(matrix: Matrix3, vector: Vec3): Vec3 {
  return vec3(
    matrix[0] * vector.x + matrix[1] * vector.y + matrix[2] * vector.z,
    matrix[3] * vector.x + matrix[4] * vector.y + matrix[5] * vector.z,
    matrix[6] * vector.x + matrix[7] * vector.y + matrix[8] * vector.z,
  );
}

export function reflectionMatrix(unitNormal: Vec3): Matrix3 {
  const { x, y, z } = unitNormal;
  return [
    1 - 2 * x * x, -2 * x * y, -2 * x * z,
    -2 * y * x, 1 - 2 * y * y, -2 * y * z,
    -2 * z * x, -2 * z * y, 1 - 2 * z * z,
  ];
}

export function determinant(matrix: Matrix3): number {
  return (
    matrix[0] * (matrix[4] * matrix[8] - matrix[5] * matrix[7])
    - matrix[1] * (matrix[3] * matrix[8] - matrix[5] * matrix[6])
    + matrix[2] * (matrix[3] * matrix[7] - matrix[4] * matrix[6])
  );
}

export function solveLinear3(rows: readonly [Vec3, Vec3, Vec3], values: Vec3): Vec3 {
  const coefficients = matrixFromRows(rows[0], rows[1], rows[2]);
  const denominator = determinant(coefficients);
  if (Math.abs(denominator) <= 1e-12) {
    throw new Error("Mirror system is singular");
  }

  const columnX = matrixFromRows(
    vec3(values.x, rows[0].y, rows[0].z),
    vec3(values.y, rows[1].y, rows[1].z),
    vec3(values.z, rows[2].y, rows[2].z),
  );
  const columnY = matrixFromRows(
    vec3(rows[0].x, values.x, rows[0].z),
    vec3(rows[1].x, values.y, rows[1].z),
    vec3(rows[2].x, values.z, rows[2].z),
  );
  const columnZ = matrixFromRows(
    vec3(rows[0].x, rows[0].y, values.x),
    vec3(rows[1].x, rows[1].y, values.y),
    vec3(rows[2].x, rows[2].y, values.z),
  );

  return vec3(
    determinant(columnX) / denominator,
    determinant(columnY) / denominator,
    determinant(columnZ) / denominator,
  );
}

export function matrixKey(matrix: Matrix3, epsilon = 1e-9): string {
  return matrix.map((value) => Math.round(value / epsilon)).join(":");
}

export function isOrthogonal(matrix: Matrix3, epsilon = 1e-9): boolean {
  const row0 = vec3(matrix[0], matrix[1], matrix[2]);
  const row1 = vec3(matrix[3], matrix[4], matrix[5]);
  const row2 = vec3(matrix[6], matrix[7], matrix[8]);
  return (
    Math.abs(dot(row0, row0) - 1) <= epsilon
    && Math.abs(dot(row1, row1) - 1) <= epsilon
    && Math.abs(dot(row2, row2) - 1) <= epsilon
    && Math.abs(dot(row0, row1)) <= epsilon
    && Math.abs(dot(row0, row2)) <= epsilon
    && Math.abs(dot(row1, row2)) <= epsilon
  );
}

