import { describe, expect, it } from "vitest";

import {
  edgeLengthSpread,
  eulerCharacteristic,
  isFaceWoundOutward,
  length,
  platonic,
  type PlatonicName,
} from "../src/index.js";

const EXPECTED: Readonly<Record<PlatonicName, readonly [number, number, number]>> = {
  tetrahedron: [4, 6, 4],
  cube: [8, 12, 6],
  octahedron: [6, 12, 8],
  dodecahedron: [20, 30, 12],
  icosahedron: [12, 30, 20],
};

describe("Platonic solids from Wythoff mirror positions", () => {
  it.each(Object.entries(EXPECTED) as [PlatonicName, readonly [number, number, number]][])(
    "constructs the %s with correct invariants",
    (name, [vertices, edges, faces]) => {
      const radius = 7.25;
      const polyhedron = platonic(name, radius);

      expect([
        polyhedron.vertices.length,
        polyhedron.edges.length,
        polyhedron.faces.length,
      ]).toEqual([vertices, edges, faces]);
      expect(eulerCharacteristic(polyhedron)).toBe(2);
      expect(edgeLengthSpread(polyhedron)).toBeLessThan(1e-8);
      expect(polyhedron.vertices.every((vertex) => Math.abs(length(vertex) - radius) < 1e-9)).toBe(true);
      expect(polyhedron.faces.every((_, index) => isFaceWoundOutward(polyhedron, index))).toBe(true);
    },
  );
});

