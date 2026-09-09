import type { Vec3 } from "@order-in-space/geometry";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";

import { createSegmentMesh } from "./segment-drawing.js";

export interface PolygonDrawingStyle {
  readonly edgeColor?: number;
  readonly edgeRadius?: number;
  readonly faceColor?: number;
  readonly faceOpacity?: number;
  readonly edgeOpacity?: number;
}

/**
 * Free-standing planar polygons (a folding vertex figure, a Voronoi wall)
 * drawn as a soft fill with graphite outlines. They are not a polyhedron:
 * no topology is claimed beyond each polygon's own ring.
 */
export function createPolygonGroup(
  polygons: readonly (readonly Vec3[])[],
  style: PolygonDrawingStyle = {},
): Group {
  const group = new Group();
  group.name = "polygon sheet";
  const positions: number[] = [];
  const outline: (readonly [Vec3, Vec3])[] = [];
  for (const polygon of polygons) {
    if (polygon.length < 3) throw new Error("A polygon needs at least three corners");
    const first = polygon[0];
    if (first === undefined) continue;
    for (let index = 1; index < polygon.length - 1; index += 1) {
      const second = polygon[index];
      const third = polygon[index + 1];
      if (second === undefined || third === undefined) continue;
      positions.push(
        first.x, first.y, first.z,
        second.x, second.y, second.z,
        third.x, third.y, third.z,
      );
    }
    polygon.forEach((corner, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if (next !== undefined) outline.push([corner, next]);
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const faceOpacity = style.faceOpacity ?? 0.2;
  const faces = new Mesh(geometry, new MeshStandardMaterial({
    color: style.faceColor ?? 0xc9a98a,
    opacity: faceOpacity,
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  }));
  faces.name = "polygon faces";
  group.add(faces);
  if (outline.length > 0) {
    const edges = createSegmentMesh(outline, {
      color: style.edgeColor ?? 0x9a4e32,
      radius: style.edgeRadius ?? 0.01,
      opacity: style.edgeOpacity ?? 1,
    });
    edges.name = "polygon edges";
    group.add(edges);
  }
  return group;
}
