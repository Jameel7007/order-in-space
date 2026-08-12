import {
  IDENTITY_MATRIX,
  matrixKey,
  multiplyMatrices,
  reflectionMatrix,
  type Matrix3,
} from "./matrix.js";
import type { CoxeterTriangle, Vec3 } from "./types.js";
import { lengthSquared, vec3 } from "./vector.js";

export interface CoxeterSystem {
  readonly triangle: CoxeterTriangle;
  readonly mirrors: readonly [Vec3, Vec3, Vec3];
  readonly reflections: readonly [Matrix3, Matrix3, Matrix3];
  readonly group: readonly Matrix3[];
}

const systemCache = new Map<string, CoxeterSystem>();

function validateTriangle(triangle: CoxeterTriangle): void {
  for (const order of triangle) {
    if (!Number.isInteger(order) || order < 2) {
      throw new Error(`Coxeter orders must be integers >= 2; received ${String(order)}`);
    }
  }

  const sphericalExcess = triangle.reduce((sum, order) => sum + 1 / order, 0) - 1;
  if (sphericalExcess <= 0) {
    throw new Error(`Triangle (${triangle.join(",")}) is not a finite spherical Coxeter triangle`);
  }
}

function constructMirrors(triangle: CoxeterTriangle): readonly [Vec3, Vec3, Vec3] {
  // triangle = (m02, m12, m01), matching the conventional [m01, m12]
  // linear Coxeter diagram when m02 = 2.
  const [m02, m12, m01] = triangle;
  const normal0 = vec3(1, 0, 0);
  const normal1 = vec3(-Math.cos(Math.PI / m01), Math.sin(Math.PI / m01), 0);
  const x = -Math.cos(Math.PI / m02);
  const target12 = -Math.cos(Math.PI / m12);
  const y = (target12 - normal1.x * x) / normal1.y;
  const zSquared = 1 - x * x - y * y;

  if (zSquared <= 1e-12) {
    throw new Error(`Triangle (${triangle.join(",")}) has a degenerate mirror Gram matrix`);
  }

  const normal2 = vec3(x, y, Math.sqrt(zSquared));
  if (Math.abs(lengthSquared(normal2) - 1) > 1e-9) {
    throw new Error("Constructed mirror normal is not unit length");
  }
  return [normal0, normal1, normal2];
}

function closeReflectionGroup(reflections: readonly [Matrix3, Matrix3, Matrix3]): readonly Matrix3[] {
  const elements: Matrix3[] = [IDENTITY_MATRIX];
  const known = new Set<string>([matrixKey(IDENTITY_MATRIX)]);

  for (let cursor = 0; cursor < elements.length; cursor += 1) {
    const current = elements[cursor];
    if (current === undefined) {
      throw new Error("Reflection-group queue became inconsistent");
    }

    for (const reflection of reflections) {
      const candidate = multiplyMatrices(reflection, current);
      const key = matrixKey(candidate);
      if (!known.has(key)) {
        known.add(key);
        elements.push(candidate);
        if (elements.length > 240) {
          throw new Error("Reflection group did not close at the expected finite order");
        }
      }
    }
  }

  return elements;
}

export function createCoxeterSystem(triangle: CoxeterTriangle): CoxeterSystem {
  validateTriangle(triangle);
  const cacheKey = triangle.join(":");
  const cached = systemCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const mirrors = constructMirrors(triangle);
  const reflections = mirrors.map(reflectionMatrix) as unknown as readonly [Matrix3, Matrix3, Matrix3];
  const system: CoxeterSystem = {
    triangle: [...triangle],
    mirrors,
    reflections,
    group: closeReflectionGroup(reflections),
  };
  systemCache.set(cacheKey, system);
  return system;
}

