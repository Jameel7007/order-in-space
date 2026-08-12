import { platonic } from "@order-in-space/geometry";
import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "three";

import { createEdgeMesh, createFaceMesh, createVertexMesh, disposeObject } from "../src/index.js";

describe("renderer-independent geometry adapters", () => {
  it("creates one instanced cylinder per abstract edge", () => {
    const cube = platonic("cube", 2);
    const edges = createEdgeMesh(cube, { edgeRadius: 0.05 });
    const transform = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    expect(edges.count).toBe(cube.edges.length);
    edges.getMatrixAt(0, transform);
    transform.decompose(position, quaternion, scale);
    expect(scale.x).toBeCloseTo(0.05, 6);
    expect(scale.z).toBeCloseTo(0.05, 6);
    expect(scale.y).toBeGreaterThan(0);
    disposeObject(edges);
  });

  it("triangulates polygon faces without altering source topology", () => {
    const cube = platonic("cube");
    const faces = createFaceMesh(cube);
    const positions = faces.geometry.getAttribute("position");

    expect(positions.count).toBe(6 * 2 * 3);
    expect(cube.faces.every((face) => face.length === 4)).toBe(true);
    disposeObject(faces);
  });

  it("creates one optional marker per vertex", () => {
    const icosahedron = platonic("icosahedron");
    const vertices = createVertexMesh(icosahedron);
    expect(vertices.count).toBe(12);
    disposeObject(vertices);
  });
});
