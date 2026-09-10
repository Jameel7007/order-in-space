import type { Vec3 } from "@order-in-space/geometry";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
} from "three";

import { SegmentDrawing } from "./segment-drawing.js";

export interface PolygonDrawingStyle {
  readonly edgeColor?: number;
  readonly edgeRadius?: number;
  readonly faceColor?: number;
  readonly faceOpacity?: number;
  readonly edgeOpacity?: number;
}

function sheetGeometry(polygons: readonly (readonly Vec3[])[]): BufferGeometry {
  const positions: number[] = [];
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
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function outlineOf(polygons: readonly (readonly Vec3[])[]): (readonly [Vec3, Vec3])[] {
  const outline: (readonly [Vec3, Vec3])[] = [];
  for (const polygon of polygons) {
    polygon.forEach((corner, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if (next !== undefined) outline.push([corner, next]);
    });
  }
  return outline;
}

/**
 * Free-standing planar polygons (a folding vertex figure, a Voronoi wall)
 * drawn as a soft fill with graphite outlines. They are not a polyhedron:
 * no topology is claimed beyond each polygon's own ring. The fill is unlit:
 * a sheet that folds past edge-on would otherwise flip from its lit top to
 * its shadowed underside in one frame. Materials persist across updates,
 * and the fill sits slightly in front of any coincident polyhedron face so
 * the two never fight for the same depth.
 */
export class PolygonSheet {
  readonly group = new Group();
  readonly faces: Mesh;
  readonly edges: SegmentDrawing;

  constructor(polygons: readonly (readonly Vec3[])[], style: PolygonDrawingStyle = {}) {
    this.group.name = "polygon sheet";
    const faceOpacity = style.faceOpacity ?? 0.2;
    this.faces = new Mesh(sheetGeometry(polygons), new MeshBasicMaterial({
      color: style.faceColor ?? 0xc9a98a,
      opacity: faceOpacity,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }));
    this.faces.name = "polygon faces";
    this.edges = new SegmentDrawing(outlineOf(polygons), {
      color: style.edgeColor ?? 0x9a4e32,
      radius: style.edgeRadius ?? 0.01,
      opacity: style.edgeOpacity ?? 1,
    });
    this.edges.group.name = "polygon edges";
    this.group.add(this.faces, this.edges.group);
  }

  update(polygons: readonly (readonly Vec3[])[]): void {
    this.faces.geometry.dispose();
    this.faces.geometry = sheetGeometry(polygons);
    this.edges.update(outlineOf(polygons));
  }

  dispose(): void {
    this.faces.geometry.dispose();
    (this.faces.material as MeshBasicMaterial).dispose();
    this.edges.dispose();
  }
}

export function createPolygonGroup(
  polygons: readonly (readonly Vec3[])[],
  style: PolygonDrawingStyle = {},
): Group {
  return new PolygonSheet(polygons, style).group;
}
