import type { Polyhedron } from "@order-in-space/geometry";
import type { LineRole, PolygonRole, SolidRole, SphereRole } from "@order-in-space/scenes";

export interface SolidStyle {
  readonly edgeColor: number;
  readonly edgeRadius: (polyhedron: Polyhedron) => number;
  readonly faceColor: number;
  readonly faceOpacity: number;
}

export const SOLID_STYLES: Readonly<Record<SolidRole, SolidStyle>> = {
  primary: {
    edgeColor: 0x25231f,
    edgeRadius: (polyhedron) => Math.max(0.008, 0.022 - polyhedron.edges.length * 0.000055),
    faceColor: 0xcab499,
    faceOpacity: 0.13,
  },
  secondary: {
    edgeColor: 0x9a4e32,
    edgeRadius: () => 0.0105,
    faceColor: 0xc2a98c,
    faceOpacity: 0.08,
  },
  ghost: {
    edgeColor: 0x8f8a80,
    edgeRadius: () => 0.0075,
    faceColor: 0xc2a98c,
    faceOpacity: 0.04,
  },
  accent: {
    edgeColor: 0x4b5f70,
    edgeRadius: () => 0.012,
    faceColor: 0xb7c0c8,
    faceOpacity: 0.08,
  },
};

export const SPHERE_COLORS: Readonly<Record<SphereRole, number>> = {
  point: 0x9a4e32,
  shell: 0xa7957d,
};

// Sheet outlines share the solids' graphite so a folded corner becomes the
// finished corner with no color change; only the fills differ.
// The fold outline matches a small solid's edge radius so the closed corner
// and the solid's corner are the same cylinders.
export const POLYGON_STYLES: Readonly<Record<PolygonRole, { edgeColor: number; faceColor: number; faceOpacity: number; edgeRadius: number }>> = {
  fold: { edgeColor: 0x25231f, faceColor: 0xd6b48f, faceOpacity: 0.34, edgeRadius: 0.0213 },
  wall: { edgeColor: 0x25231f, faceColor: 0xc9a98a, faceOpacity: 0.26, edgeRadius: 0.008 },
};

export const LINE_STYLES: Readonly<Record<LineRole, { color: number; radius: number }>> = {
  strut: { color: 0x7d766b, radius: 0.007 },
  rectangle: { color: 0x9a4e32, radius: 0.012 },
  trace: { color: 0x8a8378, radius: 0.006 },
};

/** Draw order among translucent objects, so sorting never flips frame to frame. */
export const RENDER_ORDER = { guide: -2, spheres: -1, solid: 0, polygons: 1, lines: 2 } as const;
