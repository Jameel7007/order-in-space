import { describe, expect, it } from "vitest";

import {
  deriveRhombicDodecahedronFromFCC,
  dot,
  edgeLengthSpread,
  eulerCharacteristic,
  faceNormal,
  isFaceWoundOutward,
  length,
  normalize,
  radiusSpread,
  rhombicDodecahedronFromFCC,
} from "../src/index.js";

describe("FCC Voronoi derivation", () => {
  it("intersects twelve neighbor bisectors into a rhombic dodecahedron", () => {
    const radius = 2.25;
    const derivation = deriveRhombicDodecahedronFromFCC(radius);
    const { cell } = derivation;

    expect(derivation.neighborCenters).toHaveLength(12);
    expect(derivation.bisectorHalfSpaces).toHaveLength(12);
    expect(cell.vertices).toHaveLength(14);
    expect(cell.edges).toHaveLength(24);
    expect(cell.faces).toHaveLength(12);
    expect(cell.faces.every((face) => face.length === 4)).toBe(true);
    expect(eulerCharacteristic(cell)).toBe(2);
    expect(edgeLengthSpread(cell)).toBeLessThan(1e-8);
    expect(cell.faces.every((_, index) => isFaceWoundOutward(cell, index))).toBe(true);
    expect(cell.circumradius).toBeCloseTo(Math.SQRT2 * radius, 10);
  });

  it("keeps a one-to-one relationship between FCC neighbors and cell faces", () => {
    const { cell, neighborCenters } = deriveRhombicDodecahedronFromFCC(1);
    const neighborDirections = neighborCenters.map(normalize);

    for (let faceIndex = 0; faceIndex < cell.faces.length; faceIndex += 1) {
      const normal = normalize(faceNormal(cell, faceIndex));
      expect(Math.max(...neighborDirections.map((neighbor) => dot(normal, neighbor)))).toBeCloseTo(1, 9);
    }
  });

  it("records the unavoidable two-radius vertex structure", () => {
    const cell = rhombicDodecahedronFromFCC(1);
    const radii = cell.vertices.map(length).sort((a, b) => a - b);
    const distinct = [...new Set(radii.map((value) => value.toFixed(9)))];

    expect(distinct).toHaveLength(2);
    expect(radii.slice(0, 8).every((value) => Math.abs(value - Math.sqrt(3 / 2)) < 1e-9)).toBe(true);
    expect(radii.slice(8).every((value) => Math.abs(value - Math.SQRT2) < 1e-9)).toBe(true);
    expect(radiusSpread(cell)).toBeGreaterThan(0.1);
  });
});

