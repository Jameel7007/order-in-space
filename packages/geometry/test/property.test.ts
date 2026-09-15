import { describe, expect, it } from "vitest";

import {
  ARCHIMEDEAN_SPECS,
  PHI,
  angularDeficiency,
  archimedean,
  closestPacking,
  convexHull,
  edgeLengthSpread,
  eulerCharacteristic,
  goldenRectangles,
  hullOfCenters,
  isFaceWoundOutward,
  length,
  packingContacts,
  platonic,
  rotationAboutAxis,
  transformPolyhedron,
  vec3,
  wythoff,
  wythoffOrbit,
  type ArchimedeanName,
  type Polyhedron,
  type Vec3,
} from "../src/index.js";

/**
 * Randomised properties. The canonical fixtures prove the named solids come
 * out right; these prove the algorithms do not depend on the fixtures'
 * orientation, scale, or exact generator positions, and they pin down where
 * the tolerances actually bite. Every case is seeded so a failure is
 * reproducible: the seed is part of the assertion message.
 */

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRotation(random: () => number) {
  const axis = vec3(random() - 0.5, random() - 0.5, random() - 0.5);
  return rotationAboutAxis(axis, random() * Math.PI * 2);
}

function topology(polyhedron: Polyhedron): string {
  const faceSizes = polyhedron.faces.map((face) => face.length).sort((a, b) => a - b).join(",");
  return `${String(polyhedron.vertices.length)}/${String(polyhedron.edges.length)}/${String(polyhedron.faces.length)}:${faceSizes}`;
}

function jitter(point: Vec3, amount: number, random: () => number): Vec3 {
  return vec3(
    point.x + (random() - 0.5) * 2 * amount,
    point.y + (random() - 0.5) * 2 * amount,
    point.z + (random() - 0.5) * 2 * amount,
  );
}

const SAMPLES = 40;
const NAMES = Object.keys(ARCHIMEDEAN_SPECS) as ArchimedeanName[];

describe("hull invariance under random rotation and scale", () => {
  it("recovers the same topology at any orientation and over seven orders of magnitude", () => {
    for (let seed = 1; seed <= SAMPLES; seed += 1) {
      const random = mulberry32(seed);
      const name = NAMES[seed % NAMES.length] ?? "cuboctahedron";
      const scale = Math.exp((random() - 0.5) * 16); // roughly 3e-4 to 3e3
      const base = archimedean(name, scale);
      const rotated = transformPolyhedron(base, randomRotation(random));
      const rebuilt = convexHull(rotated.vertices);
      const label = `seed ${String(seed)} ${name} scale ${scale.toExponential(2)}`;

      expect(topology(rebuilt), label).toBe(topology(base));
      expect(eulerCharacteristic(rebuilt), label).toBe(2);
      expect(rebuilt.faces.every((_, index) => isFaceWoundOutward(rebuilt, index)), label).toBe(true);
      expect(edgeLengthSpread(rebuilt) / scale, label).toBeLessThan(1e-9);
      expect(Math.abs(angularDeficiency(rebuilt).total - 4 * Math.PI), label).toBeLessThan(1e-7);
    }
  });
});

describe("generator anywhere in the chamber", () => {
  it("gives the omnitruncated topology for every interior point", () => {
    const expected: Readonly<Record<string, string>> = {
      "2,3,3": "24/36/14:4,4,4,4,4,4,6,6,6,6,6,6,6,6",
      "2,3,4": "48/72/26:" + [...Array<number>(12).fill(4), ...Array<number>(8).fill(6), ...Array<number>(6).fill(8)].join(","),
      "2,3,5": "120/180/62:" + [...Array<number>(30).fill(4), ...Array<number>(20).fill(6), ...Array<number>(12).fill(10)].join(","),
    };
    for (let seed = 1; seed <= SAMPLES; seed += 1) {
      const random = mulberry32(100 + seed);
      const triangle = ([[2, 3, 3], [2, 3, 4], [2, 3, 5]] as const)[seed % 3] ?? [2, 3, 5];
      const distances = [0.05 + random() * 1.4, 0.05 + random() * 1.4, 0.05 + random() * 1.4] as const;
      const solid = wythoff(triangle, distances);
      const label = `seed ${String(seed)} (${triangle.join(",")}) [${distances.map((d) => d.toFixed(3)).join(", ")}]`;
      expect(topology(solid), label).toBe(expected[triangle.join(",")]);
      expect(solid.vertices.every((vertex) => Math.abs(length(vertex) - 1) < 1e-9), label).toBe(true);
    }
  });
});

describe("tolerance boundaries near a mirror", () => {
  it("keeps the truncated topology until the generator is within the merge tolerance of the mirror", () => {
    // [0, ε, 1] in the icosahedral room: on two mirrors it is the icosahedron;
    // a hair off the second mirror it is a (tiny-edged) truncated icosahedron.
    for (const epsilon of [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7]) {
      const solid = wythoff([2, 3, 5], [0, epsilon, 1]);
      expect(topology(solid).startsWith("60/90/32"), `ε = ${String(epsilon)}`).toBe(true);
      expect(eulerCharacteristic(solid), `ε = ${String(epsilon)}`).toBe(2);
    }
    // At the documented 1e-8 merge tolerance the orbit is still 60 points but
    // the hull's coplanarity tolerance folds them into the icosahedron.
    const boundary = wythoff([2, 3, 5], [0, 1e-8, 1]);
    expect(wythoffOrbit([2, 3, 5], [0, 1e-8, 1])).toHaveLength(60);
    expect(eulerCharacteristic(boundary)).toBe(2);
    expect([12, 60]).toContain(boundary.vertices.length);
    // Below it, the orbit itself merges: exactly the icosahedron.
    for (const epsilon of [1e-9, 1e-10, 1e-12]) {
      expect(wythoffOrbit([2, 3, 5], [0, epsilon, 1]), `ε = ${String(epsilon)}`).toHaveLength(12);
      expect(topology(wythoff([2, 3, 5], [0, epsilon, 1])).startsWith("12/30/20"), `ε = ${String(epsilon)}`).toBe(true);
    }
  });
});

describe("tolerance boundaries under jitter", () => {
  it("merges coplanar faces below the hull tolerance and triangulates above it, but always closes", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const random = mulberry32(200 + seed);
      const cube = platonic("cube");
      for (const amount of [1e-12, 1e-10, 1e-9]) {
        const hull = convexHull(cube.vertices.map((vertex) => jitter(vertex, amount, random)));
        expect(topology(hull), `seed ${String(seed)} jitter ${String(amount)}`).toBe(topology(cube));
      }
      for (const amount of [1e-7, 1e-6, 1e-4, 1e-2]) {
        const hull = convexHull(cube.vertices.map((vertex) => jitter(vertex, amount, random)));
        const label = `seed ${String(seed)} jitter ${String(amount)}`;
        expect(hull.vertices, label).toHaveLength(8);
        expect(eulerCharacteristic(hull), label).toBe(2);
        expect(hull.faces.every((_, index) => isFaceWoundOutward(hull, index)), label).toBe(true);
        // Eight points in general position hull into 12 triangles.
        expect(hull.faces.length, label).toBeGreaterThanOrEqual(6);
        expect(hull.faces.length, label).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("packing and golden properties at random scale and orientation", () => {
  it("finds twelve around one at any sphere radius", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const random = mulberry32(300 + seed);
      const radius = Math.exp((random() - 0.5) * 14);
      const packing = closestPacking(1, radius);
      const label = `seed ${String(seed)} radius ${radius.toExponential(2)}`;
      expect(packingContacts(packing), label).toHaveLength(36);
      expect(topology(hullOfCenters(packing)).startsWith("12/24/14"), label).toBe(true);
    }
  });

  it("reads fifteen golden rectangles from any rotated, scaled icosahedron", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const random = mulberry32(400 + seed);
      const scale = 0.2 + random() * 40;
      const icosahedron = transformPolyhedron(platonic("icosahedron", scale), randomRotation(random));
      const rectangles = goldenRectangles(icosahedron);
      const label = `seed ${String(seed)} scale ${scale.toFixed(3)}`;
      expect(rectangles, label).toHaveLength(15);
      expect(Math.max(...rectangles.map(({ ratio }) => Math.abs(ratio - PHI))), label).toBeLessThan(1e-9);
    }
  });
});
