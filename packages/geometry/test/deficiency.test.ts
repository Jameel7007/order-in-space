import { describe, expect, it } from "vitest";

import {
  ARCHIMEDEAN_SPECS,
  PLATONIC_SPECS,
  angularDeficiency,
  archimedean,
  platonic,
  regularCornerAngle,
  type ArchimedeanName,
  type PlatonicName,
} from "../src/index.js";

describe("angular deficiency", () => {
  it.each(Object.keys(PLATONIC_SPECS) as PlatonicName[])("totals 4π on the %s", (name) => {
    const solid = platonic(name);
    const { deficiencies, total } = angularDeficiency(solid);
    expect(total).toBeCloseTo(4 * Math.PI, 9);
    expect(Math.max(...deficiencies) - Math.min(...deficiencies)).toBeLessThan(1e-9);
  });

  it.each(Object.keys(ARCHIMEDEAN_SPECS) as ArchimedeanName[])("totals 4π on the %s", (name) => {
    expect(angularDeficiency(archimedean(name)).total).toBeCloseTo(4 * Math.PI, 9);
  });

  it("matches the corner sums of the five regular closures", () => {
    const expected: Readonly<Record<PlatonicName, readonly [number, number]>> = {
      tetrahedron: [3, 3],
      octahedron: [3, 4],
      icosahedron: [3, 5],
      cube: [4, 3],
      dodecahedron: [5, 3],
    };
    for (const [name, [sides, count]] of Object.entries(expected) as [PlatonicName, readonly [number, number]][]) {
      const { angleSums } = angularDeficiency(platonic(name));
      for (const sum of angleSums) expect(sum).toBeCloseTo(regularCornerAngle(sides) * count, 9);
    }
  });
});
