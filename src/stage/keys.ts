import type { Polyhedron } from "@order-in-space/geometry";
import type { FrameLines, FramePolygons, FrameSpheres } from "@order-in-space/scenes";

/** Cheap geometry fingerprints: a slot re-uploads only when its key changes. */
export function round4(value: number): string {
  return value.toFixed(4);
}

export function vertexKey(polyhedron: Polyhedron): string {
  let sum = 0;
  let weighted = 0;
  polyhedron.vertices.forEach((vertex, index) => {
    sum += vertex.x + vertex.y + vertex.z;
    weighted += (index + 1) * (vertex.x * 0.7 + vertex.y * 1.3 + vertex.z * 1.9);
  });
  return `${String(polyhedron.vertices.length)}:${String(polyhedron.edges.length)}:${round4(sum)}:${round4(weighted)}`;
}

export function spheresKey(entry: FrameSpheres): string {
  return entry.spheres.map((sphere) => (
    `${round4(sphere.center.x)},${round4(sphere.center.y)},${round4(sphere.center.z)},${round4(sphere.radius)}`
  )).join(";");
}

export function polygonsKey(entry: FramePolygons): string {
  return entry.polygons.map((polygon) => polygon.map((corner) => (
    `${round4(corner.x)},${round4(corner.y)},${round4(corner.z)}`
  )).join(";")).join("/");
}

export function linesKey(entry: FrameLines): string {
  let sum = 0;
  entry.segments.forEach(([a, b], index) => {
    sum += (index + 1) * (a.x + a.y * 1.3 + a.z * 1.7 + b.x * 0.7 + b.y * 1.1 + b.z * 1.9);
  });
  return `${String(entry.segments.length)}:${round4(sum)}`;
}
