import { describe, expect, it } from "vitest";

import { createCoxeterSystem, isOrthogonal } from "../src/index.js";

describe("finite spherical Coxeter groups", () => {
  it.each([
    { triangle: [2, 3, 3] as const, order: 24 },
    { triangle: [2, 3, 4] as const, order: 48 },
    { triangle: [2, 3, 5] as const, order: 120 },
  ])("closes ($triangle) at group order $order", ({ triangle, order }) => {
    const system = createCoxeterSystem(triangle);

    expect(system.group).toHaveLength(order);
    expect(system.group.every((element) => isOrthogonal(element))).toBe(true);
  });

  it("rejects Euclidean and hyperbolic triangles", () => {
    expect(() => createCoxeterSystem([2, 3, 6])).toThrow(/not a finite spherical/);
    expect(() => createCoxeterSystem([2, 3, 7])).toThrow(/not a finite spherical/);
  });
});

