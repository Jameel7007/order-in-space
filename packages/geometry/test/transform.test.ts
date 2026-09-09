import { describe, expect, it } from "vitest";

import {
  applyMatrix,
  distance,
  edgeMidpoints,
  isOrthogonal,
  orientVertexToTop,
  platonic,
  rotationAboutAxis,
  rotationFromFrames,
  scalePolyhedron,
  translatePolyhedron,
  vec3,
  vertexNeighbors,
} from "../src/index.js";

describe("rigid transforms", () => {
  it("rotates about an axis by the requested angle", () => {
    const quarter = rotationAboutAxis(vec3(0, 0, 1), Math.PI / 2);
    const turned = applyMatrix(quarter, vec3(1, 0, 0));
    expect(isOrthogonal(quarter)).toBe(true);
    expect(distance(turned, vec3(0, 1, 0))).toBeLessThan(1e-12);
  });

  it("carries one frame exactly onto another", () => {
    const rotation = rotationFromFrames(vec3(1, 1, 0), vec3(0, 0, 3), vec3(0, 1, 0), vec3(1, 0, 0));
    expect(isOrthogonal(rotation)).toBe(true);
    const primary = applyMatrix(rotation, vec3(1, 1, 0));
    expect(distance(primary, vec3(0, Math.SQRT2, 0))).toBeLessThan(1e-12);
    const secondary = applyMatrix(rotation, vec3(0, 0, 3));
    expect(distance(secondary, vec3(3, 0, 0))).toBeLessThan(1e-12);
  });

  it("poses any vertex on top with an edge at zero azimuth", () => {
    for (const name of ["tetrahedron", "cube", "icosahedron"] as const) {
      const solid = platonic(name, 2);
      const posed = orientVertexToTop(solid, 1);
      const top = posed.vertices[1];
      expect(top).toBeDefined();
      if (top === undefined) return;
      expect(distance(top, vec3(0, 2, 0))).toBeLessThan(1e-9);
      const neighbor = vertexNeighbors(posed, 1)[0];
      const edgeEnd = neighbor === undefined ? undefined : posed.vertices[neighbor];
      expect(edgeEnd?.z ?? 1).toBeCloseTo(0, 9);
      expect(edgeEnd?.x ?? -1).toBeGreaterThan(0);
    }
  });

  it("translates and scales while keeping topology", () => {
    const cube = platonic("cube", 1);
    const moved = translatePolyhedron(cube, vec3(3, 0, 0));
    expect(moved.edges).toBe(cube.edges);
    expect(moved.circumradius).toBeGreaterThan(cube.circumradius);
    const bigger = scalePolyhedron(cube, 2.5);
    expect(bigger.circumradius).toBeCloseTo(2.5, 12);
    expect(edgeMidpoints(bigger)).toHaveLength(12);
  });
});
