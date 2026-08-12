import { describe, expect, it } from "vitest";

import {
  distance,
  dual,
  eulerCharacteristic,
  isFaceWoundOutward,
  platonic,
  type PlatonicName,
} from "../src/index.js";

const PAIRS: readonly (readonly [PlatonicName, PlatonicName])[] = [
  ["cube", "octahedron"],
  ["dodecahedron", "icosahedron"],
  ["tetrahedron", "tetrahedron"],
];

function vertexDegrees(polyhedron: ReturnType<typeof platonic>): readonly number[] {
  const degrees = Array.from({ length: polyhedron.vertices.length }, () => 0);
  for (const [start, end] of polyhedron.edges) {
    degrees[start] = (degrees[start] ?? 0) + 1;
    degrees[end] = (degrees[end] ?? 0) + 1;
  }
  return degrees.sort((a, b) => a - b);
}

describe("polar duality", () => {
  it.each(PAIRS)("constructs %s <-> %s by face-plane reciprocation", (primalName, dualName) => {
    const primal = platonic(primalName, 5);
    const expected = platonic(dualName, 5);
    const reciprocal = dual(primal);

    expect(reciprocal.vertices).toHaveLength(expected.vertices.length);
    expect(reciprocal.edges).toHaveLength(expected.edges.length);
    expect(reciprocal.faces).toHaveLength(expected.faces.length);
    expect(reciprocal.vertices).toHaveLength(primal.faces.length);
    expect(reciprocal.faces).toHaveLength(primal.vertices.length);
    expect(eulerCharacteristic(reciprocal)).toBe(2);
    expect(reciprocal.faces.every((_, index) => isFaceWoundOutward(reciprocal, index))).toBe(true);

    const reciprocalFaceSizes = reciprocal.faces.map((face) => face.length).sort((a, b) => a - b);
    expect(reciprocalFaceSizes).toEqual(vertexDegrees(primal));
  });

  it.each(PAIRS)("is an involution for %s up to ordering and tolerance", (name) => {
    const original = platonic(name, 2.75);
    const recovered = dual(dual(original), { symbol: original.symbol });

    expect(recovered.vertices).toHaveLength(original.vertices.length);
    for (const vertex of recovered.vertices) {
      expect(Math.min(...original.vertices.map((candidate) => distance(vertex, candidate)))).toBeLessThan(1e-8);
    }
  });
});

