import { describe, expect, it } from "vitest";

import {
  closestPacking,
  dual,
  edgeLengthSpread,
  eulerCharacteristic,
  hullOfCenters,
  length,
  minimumSurfaceGap,
  packingContacts,
  tightenFirstShell,
} from "../src/index.js";

function faceCounts(polyhedron: ReturnType<typeof hullOfCenters>): Readonly<Record<number, number>> {
  return polyhedron.faces.reduce<Record<number, number>>((counts, face) => {
    counts[face.length] = (counts[face.length] ?? 0) + 1;
    return counts;
  }, {});
}

describe("FCC closest packing", () => {
  it.each([
    { shells: 0, total: 1, outer: 1 },
    { shells: 1, total: 13, outer: 12 },
    { shells: 2, total: 55, outer: 42 },
  ])("generates $shells shell(s) by nearest-neighbor traversal", ({ shells, total, outer }) => {
    const packing = closestPacking(shells, 2.5);
    expect(packing).toHaveLength(total);
    expect(packing.filter(({ shell }) => shell === shells)).toHaveLength(outer);
    expect(minimumSurfaceGap(packing)).toBeGreaterThanOrEqual(-1e-8);
  });

  it("places twelve contacting spheres around the nucleus", () => {
    const radius = 3;
    const packing = closestPacking(1, radius);
    const contacts = packingContacts(packing);
    const nucleusContacts = contacts.filter(([start, end]) => start === 0 || end === 0);
    const shellContacts = contacts.filter(([start, end]) => start !== 0 && end !== 0);

    expect(packing[0]?.shell).toBe(0);
    expect(nucleusContacts).toHaveLength(12);
    expect(shellContacts).toHaveLength(24);
    expect(contacts).toHaveLength(36);
    expect(packing.slice(1).every(({ center }) => Math.abs(length(center) - 2 * radius) < 1e-9)).toBe(true);
  });

  it("hulls the generated centers into cuboctahedral order and drops the interior nucleus", () => {
    const hull = hullOfCenters(closestPacking(1, 1), "derived cuboctahedron");

    expect(hull.vertices).toHaveLength(12);
    expect(hull.edges).toHaveLength(24);
    expect(hull.faces).toHaveLength(14);
    expect(faceCounts(hull)).toEqual({ 3: 8, 4: 6 });
    expect(eulerCharacteristic(hull)).toBe(2);
    expect(edgeLengthSpread(hull)).toBeLessThan(1e-9);
  });
});

describe("nucleus-free shell tightening", () => {
  it("remains non-overlapping and contracts monotonically", () => {
    const radius = 2;
    let previousCenterRadius = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 100; step += 1) {
      const frame = tightenFirstShell(step / 100, radius);
      expect(frame.spheres).toHaveLength(12);
      expect(minimumSurfaceGap(frame.spheres)).toBeGreaterThanOrEqual(-1e-8);
      expect(frame.centerRadius).toBeLessThanOrEqual(previousCenterRadius + 1e-9);
      expect(frame.spheres.every(({ center }) => Math.abs(length(center) - frame.centerRadius) < 1e-9)).toBe(true);
      previousCenterRadius = frame.centerRadius;
    }
  });

  it("starts cuboctahedral and ends in the icosahedral/dual relationship", () => {
    const radius = 1.75;
    const start = tightenFirstShell(0, radius);
    const end = tightenFirstShell(1, radius);
    const cuboctahedron = hullOfCenters(start.spheres);
    const icosahedron = hullOfCenters(end.spheres);
    const dodecahedron = dual(icosahedron);
    const phi = (1 + Math.sqrt(5)) / 2;

    expect([cuboctahedron.vertices.length, cuboctahedron.edges.length, cuboctahedron.faces.length])
      .toEqual([12, 24, 14]);
    expect([icosahedron.vertices.length, icosahedron.edges.length, icosahedron.faces.length])
      .toEqual([12, 30, 20]);
    expect([dodecahedron.vertices.length, dodecahedron.edges.length, dodecahedron.faces.length])
      .toEqual([20, 30, 12]);
    expect(packingContacts(start.spheres)).toHaveLength(24);
    expect(packingContacts(end.spheres)).toHaveLength(30);
    expect(start.centerRadius).toBeCloseTo(2 * radius, 10);
    expect(end.centerRadius).toBeCloseTo(Math.sqrt(1 + phi * phi) * radius, 10);
    expect(edgeLengthSpread(icosahedron)).toBeLessThan(1e-8);
  });
});

