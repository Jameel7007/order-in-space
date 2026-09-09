import { platonic } from "@order-in-space/geometry";
import { describe, expect, it } from "vitest";
import { type InstancedMesh, Matrix4, type Mesh, Quaternion, Vector3 } from "three";

import {
  createCircumsphereGuide,
  createEdgeMesh,
  createFaceMesh,
  createVertexMesh,
  disposeObject,
} from "../src/index.js";

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

  it("draws the master radius as three subordinate great circles", () => {
    const guide = createCircumsphereGuide(2.5, { segments: 24 });
    expect(guide.children).toHaveLength(3);
    for (const circle of guide.children) {
      const position = (circle as { geometry?: { getAttribute(name: string): { count: number } } }).geometry
        ?.getAttribute("position");
      expect(position?.count).toBe(24);
    }
    disposeObject(guide);
  });
});

describe("free segments and polygons", () => {
  it("draws one strut per segment", async () => {
    const { createSegmentMesh } = await import("../src/index.js");
    const mesh = createSegmentMesh([
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }],
    ], { radius: 0.02 });
    expect(mesh.count).toBe(2);
    disposeObject(mesh);
  });

  it("outlines every polygon and fills it by fan triangulation", async () => {
    const { createPolygonGroup } = await import("../src/index.js");
    const square = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
    ];
    const group = createPolygonGroup([square, square]);
    const faces = group.getObjectByName("polygon faces") as Mesh | undefined;
    const edges = group.getObjectByName("polygon edges")?.children[0] as InstancedMesh | undefined;
    expect(faces?.geometry.getAttribute("position").count).toBe(2 * 2 * 3);
    expect(edges?.count).toBe(8);
    disposeObject(group);
  });
});

describe("updatable drawings keep their materials", () => {
  it("rebuilds a polyhedron's geometry without replacing materials", async () => {
    const { PolyhedronDrawing } = await import("../src/index.js");
    const drawing = new PolyhedronDrawing(platonic("cube"), { showVertices: true });
    const edgeMaterial = drawing.edgeMaterial;
    drawing.update(platonic("icosahedron"));
    const edges = drawing.group.getObjectByName("polyhedron edges") as InstancedMesh | undefined;
    expect(edges?.count).toBe(30);
    expect(edges?.material).toBe(edgeMaterial);
    drawing.dispose();
  });

  it("grows strut, sphere, and sheet drawings in place", async () => {
    const { PolygonSheet, SegmentDrawing, SphereDrawing } = await import("../src/index.js");
    const struts = new SegmentDrawing([[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]]);
    const strutMaterial = struts.material;
    struts.update([
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }],
    ]);
    expect((struts.group.children[0] as InstancedMesh).count).toBe(3);
    expect(struts.material).toBe(strutMaterial);
    struts.dispose();

    const spheres = new SphereDrawing([{ center: { x: 0, y: 0, z: 0 }, radius: 1, shell: 0 }]);
    spheres.update([
      { center: { x: 0, y: 0, z: 0 }, radius: 1, shell: 0 },
      { center: { x: 3, y: 0, z: 0 }, radius: 0.5, shell: 1 },
    ]);
    expect((spheres.group.children[0] as InstancedMesh).count).toBe(2);
    spheres.dispose();

    const square = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
    ];
    const sheet = new PolygonSheet([square]);
    const faceMaterial = sheet.faces.material;
    sheet.update([square, square]);
    expect(sheet.faces.geometry.getAttribute("position").count).toBe(12);
    expect(sheet.faces.material).toBe(faceMaterial);
    sheet.dispose();
  });
});
