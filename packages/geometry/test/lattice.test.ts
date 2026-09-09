import { describe, expect, it } from "vitest";

import {
  dot,
  edgeLengthSpread,
  edgeLengths,
  faceNormal,
  latticeShells,
  length,
  normalize,
  spaceFillingCells,
  volume,
} from "../src/index.js";

describe("FCC lattice shells", () => {
  it("holds 10n² + 2 spheres per shell and hulls each shell into a cuboctahedron", () => {
    const radius = 0.5;
    const shells = latticeShells(3, radius);
    expect(shells.map(({ spheres }) => spheres.length)).toEqual([1, 12, 42, 92]);
    for (const shell of shells.slice(1)) {
      const hull = shell.hull;
      expect(hull).toBeDefined();
      if (hull === undefined) return;
      expect([hull.vertices.length, hull.edges.length, hull.faces.length]).toEqual([12, 24, 14]);
      expect(edgeLengthSpread(hull)).toBeLessThan(1e-9);
      expect(edgeLengths(hull)[0]).toBeCloseTo(shell.index * 2 * radius, 9);
    }
  });
});

describe("space-filling cells", () => {
  it("shares exactly one face between the nucleus cell and each neighbor cell", () => {
    const radius = 0.5;
    const { cell, neighbors } = spaceFillingCells(radius);
    expect(neighbors).toHaveLength(12);
    for (const { offset, cell: neighborCell } of neighbors) {
      const direction = normalize(offset);
      const facing = cell.faces
        .map((_, index) => index)
        .filter((index) => dot(normalize(faceNormal(cell, index)), direction) > 1 - 1e-9);
      expect(facing).toHaveLength(1);
      const faceIndex = facing[0];
      if (faceIndex === undefined) return;
      const face = cell.faces[faceIndex] ?? [];
      const shared = face.filter((vertexIndex) => {
        const vertex = cell.vertices[vertexIndex];
        if (vertex === undefined) return false;
        return neighborCell.vertices.some((candidate) => length({
          x: candidate.x - vertex.x, y: candidate.y - vertex.y, z: candidate.z - vertex.z,
        }) < 1e-9);
      });
      expect(shared).toHaveLength(4);
      // No neighbor corner crosses into the nucleus cell.
      const planeOffset = dot(direction, offset) / 2;
      expect(neighborCell.vertices.every((vertex) => dot(direction, vertex) >= planeOffset - 1e-9)).toBe(true);
    }
  });

  it("gives every sphere the lattice's fair share of volume", () => {
    const radius = 0.75;
    const { cell } = spaceFillingCells(radius);
    expect(volume(cell)).toBeCloseTo(4 * Math.SQRT2 * radius ** 3, 9);
  });
});
