import { describe, expect, it } from "vitest";

import {
  PHI,
  axisAlignedGoldenTriad,
  dot,
  goldenRectangles,
  hullOfCenters,
  orthogonalGoldenTriads,
  platonic,
  tightenFirstShell,
} from "../src/index.js";

describe("golden rectangles of the icosahedron", () => {
  it("reads fifteen golden rectangles from the edges", () => {
    const rectangles = goldenRectangles(platonic("icosahedron", 3));
    expect(rectangles).toHaveLength(15);
    for (const rectangle of rectangles) {
      expect(rectangle.ratio).toBeCloseTo(PHI, 9);
      const [a, b, c, d] = rectangle.corners;
      expect(dot({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }))
        .toBeCloseTo(0, 9);
      expect(dot({ x: d.x - c.x, y: d.y - c.y, z: d.z - c.z }, { x: a.x - d.x, y: a.y - d.y, z: a.z - d.z }))
        .toBeCloseTo(0, 9);
    }
  });

  it("groups them into five mutually perpendicular triads covering all twelve corners", () => {
    const triads = orthogonalGoldenTriads(platonic("icosahedron"));
    expect(triads).toHaveLength(5);
    for (const triad of triads) {
      const indices = new Set(triad.flatMap((rectangle) => rectangle.vertexIndices));
      expect(indices.size).toBe(12);
    }
  });

  it("finds the coordinate-plane triad at the tightened packing shell", () => {
    const icosahedron = hullOfCenters(tightenFirstShell(1, 0.5).spheres);
    const triad = axisAlignedGoldenTriad(icosahedron);
    const axes = triad.map(({ normal }) => Math.max(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)));
    expect(axes.every((value) => Math.abs(value - 1) < 1e-9)).toBe(true);
    expect(triad.every(({ ratio }) => Math.abs(ratio - PHI) < 1e-9)).toBe(true);
  });

  it("rejects solids without central symmetry", () => {
    expect(() => goldenRectangles(platonic("tetrahedron"))).toThrow(/centrally symmetric/);
  });
});
