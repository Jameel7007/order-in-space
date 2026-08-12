import type { Sphere } from "@order-in-space/geometry";
import {
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

export interface SphereDrawingStyle {
  readonly color?: number;
  readonly opacity?: number;
  readonly widthSegments?: number;
  readonly heightSegments?: number;
}

export function createSphereMesh(
  spheres: readonly Sphere[],
  style: SphereDrawingStyle = {},
): InstancedMesh {
  const opacity = style.opacity ?? 0.15;
  const geometry = new SphereGeometry(
    1,
    style.widthSegments ?? 24,
    style.heightSegments ?? 16,
  );
  const material = new MeshStandardMaterial({
    color: style.color ?? 0xa79c8c,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 0.3,
    roughness: 0.9,
    metalness: 0,
  });
  const mesh = new InstancedMesh(geometry, material, spheres.length);
  mesh.name = "construction spheres";
  const transform = new Matrix4();
  spheres.forEach((sphere, index) => {
    transform.makeScale(sphere.radius, sphere.radius, sphere.radius);
    transform.setPosition(sphere.center.x, sphere.center.y, sphere.center.z);
    mesh.setMatrixAt(index, transform);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

