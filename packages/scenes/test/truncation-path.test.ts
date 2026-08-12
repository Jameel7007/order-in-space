import { describe, expect, it } from "vitest";

import {
  ICOSAHEDRAL_TRUNCATION_WAYPOINTS,
  sampleTruncationPath,
} from "../src/index.js";

describe("Scene 6 truncation path", () => {
  it("passes exactly through every named construction position", () => {
    for (const waypoint of ICOSAHEDRAL_TRUNCATION_WAYPOINTS) {
      const sample = sampleTruncationPath(waypoint.progress);
      expect(sample.distances).toEqual(waypoint.distances);
      expect(sample.nearestWaypoint.name).toBe(waypoint.name);
      expect(sample.atNamedPosition).toBe(true);
    }
  });

  it("is deterministic in both scroll directions", () => {
    const forward = [0, 0.13, 0.37, 0.64, 0.91, 1].map(sampleTruncationPath);
    const backward = [1, 0.91, 0.64, 0.37, 0.13, 0].map(sampleTruncationPath).reverse();
    expect(backward).toEqual(forward);
  });

  it("clamps progress without producing an invalid all-zero generator", () => {
    expect(sampleTruncationPath(-5).progress).toBe(0);
    expect(sampleTruncationPath(8).progress).toBe(1);
    expect(sampleTruncationPath(Number.NaN).distances.some((value) => value > 0)).toBe(true);
  });
});
