import { describe, expect, it } from "vitest";

import {
  distance,
  wythoffCorrespondence,
  wythoffOrbit,
} from "../src/index.js";

describe("continuous Wythoff generator correspondence", () => {
  it("keeps stable group-action identities during a small generator movement", () => {
    const before = wythoffCorrespondence([2, 3, 5], [0.31, 0.47, 0.62]);
    const after = wythoffCorrespondence([2, 3, 5], [0.3101, 0.4702, 0.6199]);

    expect(before).toHaveLength(120);
    expect(after).toHaveLength(before.length);
    const displacements = before.map((point, index) => {
      const next = after[index];
      expect(next?.groupElement).toBe(point.groupElement);
      if (next === undefined) throw new Error("Correspondence length changed");
      return distance(point.position, next.position);
    });

    // Every group element is orthogonal, so the same seed displacement is
    // preserved for every corresponding orbit point.
    expect(Math.max(...displacements) - Math.min(...displacements)).toBeLessThan(1e-10);
    expect(Math.max(...displacements)).toBeLessThan(1e-3);
  });

  it("merges stabilizer duplicates only when a generator lies on mirrors", () => {
    const boundaryOrbit = wythoffOrbit([2, 3, 5], [0, 0, 1]);
    const interiorOrbit = wythoffOrbit([2, 3, 5], [0.2, 0.3, 0.4]);

    expect(boundaryOrbit).toHaveLength(12);
    expect(interiorOrbit).toHaveLength(120);
    expect(boundaryOrbit.every((vertex) => vertex.groupElements.length === 10)).toBe(true);
    expect(interiorOrbit.every((vertex) => vertex.groupElements.length === 1)).toBe(true);
  });

  it("rejects the undefined origin generator", () => {
    expect(() => wythoffOrbit([2, 3, 4], [0, 0, 0])).toThrow(/cannot lie on all three mirrors/);
  });
});

