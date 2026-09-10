import type {
  CoxeterTriangle,
  MirrorDistances,
  Polyhedron,
  Sphere,
  Vec3,
} from "@order-in-space/geometry";

export type SolidRole = "primary" | "secondary" | "ghost" | "accent";
export type SphereRole = "point" | "shell";
export type PolygonRole = "fold" | "wall";
export type LineRole = "strut" | "rectangle" | "trace";

export interface FrameSolid {
  /** Geometry identity; a new key means new vertices. */
  readonly key: string;
  /** Element identity across frames; defaults to the key. A changing solid keeps one slot. */
  readonly slot: string;
  readonly polyhedron: Polyhedron;
  readonly role: SolidRole;
  readonly opacity: number;
  readonly scale: number;
  readonly showFaces: boolean;
  readonly showEdges: boolean;
  readonly vertexOpacity: number;
}

export interface FrameSpheres {
  readonly key: string;
  readonly spheres: readonly Sphere[];
  readonly role: SphereRole;
  readonly opacity: number;
}

export interface FramePolygons {
  readonly key: string;
  readonly polygons: readonly (readonly Vec3[])[];
  readonly role: PolygonRole;
  readonly opacity: number;
  /** Fill strength relative to the outline, 0–1; defaults to 1. */
  readonly fill?: number;
}

export interface FrameLines {
  readonly key: string;
  readonly segments: readonly (readonly [Vec3, Vec3])[];
  readonly role: LineRole;
  readonly opacity: number;
}

export interface FrameGuide {
  readonly key: string;
  readonly radius: number;
  readonly opacity: number;
}

export interface FrameGenerator {
  readonly triangle: CoxeterTriangle;
  readonly distances: MirrorDistances;
  readonly orbit: "full" | "chiral";
  readonly room: string;
}

export interface FrameCamera {
  readonly zoom: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly focus: Vec3;
}

export interface FrameCounts {
  readonly vertices: number;
  readonly edges: number;
  readonly faces: number;
}

export interface FrameReadout {
  readonly name: string;
  readonly invitation: string;
  readonly detail: string;
  readonly measure: string;
  readonly counts?: FrameCounts;
}

export interface SceneFrame {
  readonly chapter: number;
  readonly progress: number;
  readonly solids: readonly FrameSolid[];
  readonly spheres: readonly FrameSpheres[];
  readonly polygons: readonly FramePolygons[];
  readonly lines: readonly FrameLines[];
  readonly guides: readonly FrameGuide[];
  readonly generator?: FrameGenerator;
  readonly camera: FrameCamera;
  readonly readout: FrameReadout;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Local progress of a sub-phase, clamped to [0,1]. */
export function phase(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}

export function smooth(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

export function mix(from: number, to: number, amount: number): number {
  const clamped = clamp01(amount);
  if (clamped <= 0) return from;
  if (clamped >= 1) return to;
  return from + (to - from) * clamped;
}

export function counts(polyhedron: Polyhedron): FrameCounts {
  return {
    vertices: polyhedron.vertices.length,
    edges: polyhedron.edges.length,
    faces: polyhedron.faces.length,
  };
}

export function solid(
  key: string,
  polyhedron: Polyhedron,
  options: Partial<Omit<FrameSolid, "key" | "polyhedron">> = {},
): FrameSolid {
  return {
    key,
    slot: options.slot ?? key,
    polyhedron,
    role: options.role ?? "primary",
    opacity: clamp01(options.opacity ?? 1),
    scale: options.scale ?? 1,
    showFaces: options.showFaces ?? true,
    showEdges: options.showEdges ?? true,
    vertexOpacity: clamp01(options.vertexOpacity ?? 0),
  };
}

/** Drop invisible elements so boundary frames compare cleanly. */
export function visible<T extends { readonly opacity: number }>(elements: readonly (T | undefined)[]): readonly T[] {
  return elements.filter((element): element is T => element !== undefined && element.opacity > 1e-6);
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function roundVec(vector: Vec3): readonly [number, number, number] {
  return [round(vector.x), round(vector.y), round(vector.z)];
}

/**
 * A geometry-only description of what a frame puts on screen, independent of
 * element keys, labels, and copy. Two frames with equal signatures render the
 * same picture; the story uses this to prove chapter boundaries are seamless
 * and that the ending returns exactly to the opening.
 */
export function frameSignature(frame: SceneFrame): string {
  const solids = frame.solids.map((entry) => ({
    role: entry.role,
    opacity: round(entry.opacity),
    faces: entry.showFaces,
    edges: entry.showEdges,
    vertexOpacity: round(entry.vertexOpacity),
    vertices: entry.polyhedron.vertices.map((vertex) => roundVec({
      x: vertex.x * entry.scale, y: vertex.y * entry.scale, z: vertex.z * entry.scale,
    })).sort(),
    edgeCount: entry.polyhedron.edges.length,
    faceCount: entry.polyhedron.faces.length,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const spheres = frame.spheres.flatMap((entry) => entry.spheres.map((sphere) => (
    JSON.stringify([entry.role, round(entry.opacity), ...roundVec(sphere.center), round(sphere.radius)])
  ))).sort();
  const polygons = frame.polygons.flatMap((entry) => entry.polygons.map((polygon) => (
    JSON.stringify([entry.role, round(entry.opacity), polygon.map(roundVec)])
  ))).sort();
  const lines = frame.lines.flatMap((entry) => entry.segments.map(([a, b]) => (
    JSON.stringify([entry.role, round(entry.opacity), roundVec(a), roundVec(b)])
  ))).sort();
  const guides = frame.guides.map((entry) => [round(entry.radius), round(entry.opacity)]).sort();
  const camera = {
    zoom: round(frame.camera.zoom),
    yaw: round(((frame.camera.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)),
    pitch: round(frame.camera.pitch),
    focus: roundVec(frame.camera.focus),
  };
  return JSON.stringify({ solids, spheres, polygons, lines, guides, camera });
}
