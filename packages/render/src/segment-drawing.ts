import type { Vec3 } from "@order-in-space/geometry";
import {
  CylinderGeometry,
  Group,
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

const midpoint = new Vector3();
const direction = new Vector3();
const quaternion = new Quaternion();
const transform = new Matrix4();
const instanceScale = new Vector3();

export function writeSegmentInstances(
  mesh: InstancedMesh,
  segments: readonly (readonly [Vec3, Vec3])[],
  radius: number,
): void {
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
  mesh.count = segments.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * Straight struts between arbitrary points, drawn with the same instanced
 * graphite cylinders as polyhedron edges so contact lines, construction
 * rectangles, and edges share one visual language. The material persists
 * across updates so animated struts never force a shader rebuild.
 */
export class SegmentDrawing {
  readonly group = new Group();
  readonly material: MeshStandardMaterial;
  private readonly geometry: CylinderGeometry;
  private readonly radius: number;
  private mesh: InstancedMesh | undefined;

  constructor(segments: readonly (readonly [Vec3, Vec3])[], style: SegmentDrawingStyle = {}) {
    this.radius = style.radius ?? 0.012;
    const opacity = style.opacity ?? 1;
    this.geometry = new CylinderGeometry(1, 1, 1, style.radialSegments ?? 8, 1, false);
    this.material = new MeshStandardMaterial({
      color: style.color ?? 0x292825,
      roughness: 0.82,
      metalness: 0,
      flatShading: true,
      opacity,
      transparent: opacity < 1,
    });
    this.group.name = "segment struts";
    this.update(segments);
  }

  update(segments: readonly (readonly [Vec3, Vec3])[]): void {
    if (this.mesh === undefined || this.mesh.instanceMatrix.count < segments.length) {
      if (this.mesh !== undefined) this.group.remove(this.mesh);
      this.mesh = new InstancedMesh(this.geometry, this.material, Math.max(1, segments.length));
      this.mesh.name = "segment struts";
      this.group.add(this.mesh);
    }
    writeSegmentInstances(this.mesh, segments, this.radius);
  }

  dispose(): void {
    if (this.mesh !== undefined) this.group.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

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
  writeSegmentInstances(mesh, segments, radius);
  return mesh;
}
