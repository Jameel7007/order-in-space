import { convexHull } from "./hull.js";
import type { Sphere } from "./sphere.js";
import type { Edge, Polyhedron, Vec3 } from "./types.js";
import {
  add,
  distance,
  length,
  scale,
  subtract,
  vec3,
} from "./vector.js";

type LatticeCoordinate = readonly [number, number, number];

interface LatticeEntry {
  readonly coordinate: LatticeCoordinate;
  readonly shell: number;
}

const FCC_STEPS: readonly LatticeCoordinate[] = [
  [-1, -1, 0], [-1, 0, -1], [-1, 0, 1], [-1, 1, 0],
  [0, -1, -1], [0, -1, 1], [0, 1, -1], [0, 1, 1],
  [1, -1, 0], [1, 0, -1], [1, 0, 1], [1, 1, 0],
];

function validateSphereRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`Sphere radius must be positive and finite; received ${String(radius)}`);
  }
}

function coordinateKey([x, y, z]: LatticeCoordinate): string {
  return `${x}:${y}:${z}`;
}

function addCoordinate(a: LatticeCoordinate, b: LatticeCoordinate): LatticeCoordinate {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Generate an FCC closest packing by breadth-first nearest-neighbor steps.
 * `shells = 0` returns only the nucleus; `shells = 1` returns the nucleus plus
 * its twelve kissing neighbors. Every length is derived from sphere radius R.
 */
export function closestPacking(shells: number, radius = 1): readonly Sphere[] {
  if (!Number.isInteger(shells) || shells < 0) {
    throw new Error(`Shell count must be a non-negative integer; received ${String(shells)}`);
  }
  validateSphereRadius(radius);

  const origin: LatticeCoordinate = [0, 0, 0];
  const entries: LatticeEntry[] = [{ coordinate: origin, shell: 0 }];
  const known = new Map<string, number>([[coordinateKey(origin), 0]]);

  for (let cursor = 0; cursor < entries.length; cursor += 1) {
    const current = entries[cursor];
    if (current === undefined) throw new Error("FCC traversal queue became inconsistent");
    if (current.shell >= shells) continue;

    for (const step of FCC_STEPS) {
      const coordinate = addCoordinate(current.coordinate, step);
      const key = coordinateKey(coordinate);
      if (!known.has(key)) {
        const shell = current.shell + 1;
        known.set(key, shell);
        entries.push({ coordinate, shell });
      }
    }
  }

  const latticeScale = Math.SQRT2 * radius;
  return entries
    .sort((a, b) => (
      a.shell - b.shell
      || a.coordinate[0] - b.coordinate[0]
      || a.coordinate[1] - b.coordinate[1]
      || a.coordinate[2] - b.coordinate[2]
    ))
    .map(({ coordinate: [x, y, z], shell }) => ({
      center: vec3(x * latticeScale, y * latticeScale, z * latticeScale),
      radius,
      shell,
    }));
}

export function packingContacts(spheres: readonly Sphere[], epsilon = 1e-8): readonly Edge[] {
  const contacts: Edge[] = [];
  for (let left = 0; left < spheres.length - 1; left += 1) {
    const a = spheres[left];
    if (a === undefined) continue;
    for (let right = left + 1; right < spheres.length; right += 1) {
      const b = spheres[right];
      if (b === undefined) continue;
      const tolerance = epsilon * Math.max(1, a.radius + b.radius);
      if (Math.abs(distance(a.center, b.center) - (a.radius + b.radius)) <= tolerance) {
        contacts.push([left, right]);
      }
    }
  }
  return contacts;
}

export function minimumSurfaceGap(spheres: readonly Sphere[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < spheres.length - 1; left += 1) {
    const a = spheres[left];
    if (a === undefined) continue;
    for (let right = left + 1; right < spheres.length; right += 1) {
      const b = spheres[right];
      if (b === undefined) continue;
      minimum = Math.min(minimum, distance(a.center, b.center) - a.radius - b.radius);
    }
  }
  return minimum;
}

export function hullOfCenters(spheres: readonly Sphere[], symbol = "packing hull"): Polyhedron {
  if (spheres.length < 4) {
    throw new Error("At least four sphere centers are needed to form a three-dimensional hull");
  }
  return convexHull(spheres.map(({ center }) => center), { symbol });
}

function firstShell(radius: number): readonly Sphere[] {
  return closestPacking(1, radius).filter(({ shell }) => shell === 1);
}

function goldenIcosahedralTarget(center: Vec3, radius: number): Vec3 {
  const phi = (1 + Math.sqrt(5)) / 2;
  const sign = (value: number): number => (value < 0 ? -1 : 1);
  const epsilon = radius * 1e-8;

  // The three zero-coordinate families become three mutually orthogonal
  // golden rectangles. This is a construction rule, not a stored vertex list.
  if (Math.abs(center.x) <= epsilon) {
    return vec3(0, sign(center.y) * radius, sign(center.z) * phi * radius);
  }
  if (Math.abs(center.y) <= epsilon) {
    return vec3(sign(center.x) * phi * radius, 0, sign(center.z) * radius);
  }
  if (Math.abs(center.z) <= epsilon) {
    return vec3(sign(center.x) * radius, sign(center.y) * phi * radius, 0);
  }
  throw new Error("First FCC shell center does not belong to a coordinate-plane family");
}

function minimumCenterDistance(points: readonly Vec3[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < points.length - 1; left += 1) {
    const a = points[left];
    if (a === undefined) continue;
    for (let right = left + 1; right < points.length; right += 1) {
      const b = points[right];
      if (b !== undefined) minimum = Math.min(minimum, distance(a, b));
    }
  }
  return minimum;
}

export interface ShellTighteningFrame {
  readonly spheres: readonly Sphere[];
  readonly progress: number;
  readonly centerRadius: number;
  readonly contactScale: number;
}

/**
 * Continuously deform the nucleus-free cuboctahedral shell into the
 * icosahedral shell. Linear golden-rectangle motion supplies correspondence;
 * a single contact scale at every frame prevents sphere overlap. The resulting
 * shell radius decreases monotonically from 2R to sqrt(1 + phi^2) R.
 */
export function tightenFirstShell(progress: number, radius = 1): ShellTighteningFrame {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(`Tightening progress must lie in [0,1]; received ${String(progress)}`);
  }
  validateSphereRadius(radius);
  const source = firstShell(radius);
  const unscaledCenters = source.map(({ center }) => {
    const target = goldenIcosahedralTarget(center, radius);
    return add(scale(center, 1 - progress), scale(target, progress));
  });
  const closestDistance = minimumCenterDistance(unscaledCenters);
  const contactScale = (2 * radius) / closestDistance;
  const centers = unscaledCenters.map((center) => scale(center, contactScale));
  const firstCenter = centers[0];
  if (firstCenter === undefined) throw new Error("First packing shell is unexpectedly empty");
  const centerRadius = length(firstCenter);

  return {
    progress,
    centerRadius,
    contactScale,
    spheres: centers.map((center) => ({ center, radius, shell: 1 })),
  };
}

export function centeredPacking(spheres: readonly Sphere[], center: Vec3): readonly Sphere[] {
  return spheres.map((sphere) => ({
    ...sphere,
    center: subtract(sphere.center, center),
  }));
}

