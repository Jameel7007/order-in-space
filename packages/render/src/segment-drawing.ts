import type { Vec3 } from "@order-in-space/geometry";
import {
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

const Y_AXIS = new Vector3(0, 1, 0);

export interface SegmentDrawingStyle {
  readonly color?: number;
  readonly radius?: number;
  readonly opacity?: number;
  readonly radialSegments?: number;
}

/**
 * Straight struts between arbitrary points, drawn with the same instanced
 * graphite cylinders as polyhedron edges so contact lines, construction
 * rectangles, and edges share one visual language.
 */
export function createSegmentMesh(
  segments: readonly (readonly [Vec3, Vec3])[],
  style: SegmentDrawingStyle = {},
): InstancedMesh {
  const radius = style.radius ?? 0.012;
  const opacity = style.opacity ?? 1;
  const geometry = new CylinderGeometry(1, 1, 1, style.radialSegments ?? 8, 1, false);
  const material = new MeshStandardMaterial({
    color: style.color ?? 0x292825,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
    opacity,
    transparent: opacity < 1,
  });
  const mesh = new InstancedMesh(geometry, material, Math.max(1, segments.length));
  mesh.name = "segment struts";
  mesh.count = segments.length;

  const midpoint = new Vector3();
  const direction = new Vector3();
  const quaternion = new Quaternion();
  const transform = new Matrix4();
  const instanceScale = new Vector3();
  segments.forEach(([startValue, endValue], instance) => {
    const start = new Vector3(startValue.x, startValue.y, startValue.z);
    const end = new Vector3(endValue.x, endValue.y, endValue.z);
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start);
    const segmentLength = direction.length();
    if (segmentLength <= 1e-12) throw new Error("Cannot render a zero-length segment");
    quaternion.setFromUnitVectors(Y_AXIS, direction.multiplyScalar(1 / segmentLength));
    instanceScale.set(radius, segmentLength, radius);
    transform.compose(midpoint, quaternion, instanceScale);
    mesh.setMatrixAt(instance, transform);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
