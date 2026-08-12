import { describe, expect, it } from "vitest";

import {
  ARCHIMEDEAN_FAMILIES,
  ARCHIMEDEAN_SPECS,
  archimedean,
  edgeLengthSpread,
  eulerCharacteristic,
  isFaceWoundOutward,
  length,
  PLATONIC_SPECS,
  solveSnubGenerator,
  type ArchimedeanName,
} from "../src/index.js";

interface ExpectedTopology {
  readonly vertices: number;
  readonly edges: number;
  readonly faces: Readonly<Record<number, number>>;
}

const EXPECTED: Readonly<Record<ArchimedeanName, ExpectedTopology>> = {
  truncatedTetrahedron: { vertices: 12, edges: 18, faces: { 3: 4, 6: 4 } },
  cuboctahedron: { vertices: 12, edges: 24, faces: { 3: 8, 4: 6 } },
  truncatedCube: { vertices: 24, edges: 36, faces: { 3: 8, 8: 6 } },
  truncatedOctahedron: { vertices: 24, edges: 36, faces: { 4: 6, 6: 8 } },
  rhombicuboctahedron: { vertices: 24, edges: 48, faces: { 3: 8, 4: 18 } },
  truncatedCuboctahedron: { vertices: 48, edges: 72, faces: { 4: 12, 6: 8, 8: 6 } },
  snubCube: { vertices: 24, edges: 60, faces: { 3: 32, 4: 6 } },
  icosidodecahedron: { vertices: 30, edges: 60, faces: { 3: 20, 5: 12 } },
  truncatedDodecahedron: { vertices: 60, edges: 90, faces: { 3: 20, 10: 12 } },
  truncatedIcosahedron: { vertices: 60, edges: 90, faces: { 5: 12, 6: 20 } },
  rhombicosidodecahedron: { vertices: 60, edges: 120, faces: { 3: 20, 4: 30, 5: 12 } },
  truncatedIcosidodecahedron: { vertices: 120, edges: 180, faces: { 4: 30, 6: 20, 10: 12 } },
  snubDodecahedron: { vertices: 60, edges: 150, faces: { 3: 80, 5: 12 } },
};

function faceCountsBySides(faceSizes: readonly number[]): Readonly<Record<number, number>> {
  return faceSizes.reduce<Record<number, number>>((counts, sides) => {
    counts[sides] = (counts[sides] ?? 0) + 1;
    return counts;
  }, {});
}

describe("Archimedean solids from shared Wythoff constructions", () => {
  it.each(Object.entries(EXPECTED) as [ArchimedeanName, ExpectedTopology][])(
    "constructs $0 with uniform edges and expected topology",
    (name, expected) => {
      const radius = 3.75;
      const polyhedron = archimedean(name, radius);

      expect(polyhedron.vertices).toHaveLength(expected.vertices);
      expect(polyhedron.edges).toHaveLength(expected.edges);
      expect(faceCountsBySides(polyhedron.faces.map((face) => face.length))).toEqual(expected.faces);
      expect(eulerCharacteristic(polyhedron)).toBe(2);
      expect(edgeLengthSpread(polyhedron)).toBeLessThan(1e-8);
      expect(polyhedron.vertices.every((vertex) => Math.abs(length(vertex) - radius) < 1e-9)).toBe(true);
      expect(polyhedron.faces.every((_, index) => isFaceWoundOutward(polyhedron, index))).toBe(true);
    },
  );

  it("follows the 1 + 6 + 6 Critchlow family grouping", () => {
    expect(ARCHIMEDEAN_FAMILIES.tetrahedral).toHaveLength(1);
    expect(ARCHIMEDEAN_FAMILIES.octahedral).toHaveLength(6);
    expect(ARCHIMEDEAN_FAMILIES.icosahedral).toHaveLength(6);
    expect(new Set(Object.values(ARCHIMEDEAN_FAMILIES).flat())).toHaveLength(13);
  });

  it("covers 5 Platonic plus 13 Archimedean named positions", () => {
    expect(Object.keys(PLATONIC_SPECS)).toHaveLength(5);
    expect(Object.keys(ARCHIMEDEAN_SPECS)).toHaveLength(13);
    const symbols = [
      ...Object.values(PLATONIC_SPECS).map(({ symbol }) => symbol),
      ...Object.values(ARCHIMEDEAN_SPECS).map(({ symbol }) => symbol),
    ];
    expect(new Set(symbols)).toHaveLength(18);
  });

  it.each([
    { triangle: [2, 3, 4] as const },
    { triangle: [2, 3, 5] as const },
  ])("derives the ($triangle) snub point by equal-edge solving", ({ triangle }) => {
    const solution = solveSnubGenerator(triangle);
    expect(solution.generator.every((distance) => distance > 0)).toBe(true);
    expect(solution.relativeEdgeResidual).toBeLessThan(1e-9);
  });
});
