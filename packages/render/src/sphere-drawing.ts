import type { Sphere } from "@order-in-space/geometry";
import {
  Group,
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

const transform = new Matrix4();

function writeSphereInstances(mesh: InstancedMesh, spheres: readonly Sphere[]): void {
  spheres.forEach((sphere, index) => {
    transform.makeScale(sphere.radius, sphere.radius, sphere.radius);
    transform.setPosition(sphere.center.x, sphere.center.y, sphere.center.z);
    mesh.setMatrixAt(index, transform);
  });
  mesh.count = spheres.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function sphereMaterial(style: SphereDrawingStyle): MeshStandardMaterial {
  const opacity = style.opacity ?? 0.15;
  return new MeshStandardMaterial({
    color: style.color ?? 0xa79c8c,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity >= 0.3,
    roughness: 0.9,
    metalness: 0,
  });
}

export function createSphereMesh(
  spheres: readonly Sphere[],
  style: SphereDrawingStyle = {},
): InstancedMesh {
  const geometry = new SphereGeometry(1, style.widthSegments ?? 24, style.heightSegments ?? 16);
  const mesh = new InstancedMesh(geometry, sphereMaterial(style), Math.max(1, spheres.length));
  mesh.name = "construction spheres";
  writeSphereInstances(mesh, spheres);
  return mesh;
}

/** Instanced spheres whose positions and radii can change without a rebuild. */
export class SphereDrawing {
  readonly group = new Group();
  readonly material: MeshStandardMaterial;
  private readonly geometry: SphereGeometry;
  private mesh: InstancedMesh | undefined;

  constructor(spheres: readonly Sphere[], style: SphereDrawingStyle = {}) {
    this.geometry = new SphereGeometry(1, style.widthSegments ?? 24, style.heightSegments ?? 16);
    this.material = sphereMaterial(style);
    this.group.name = "construction spheres";
    this.update(spheres);
  }

  update(spheres: readonly Sphere[]): void {
    if (this.mesh === undefined || this.mesh.instanceMatrix.count < spheres.length) {
      if (this.mesh !== undefined) this.group.remove(this.mesh);
      this.mesh = new InstancedMesh(this.geometry, this.material, Math.max(1, spheres.length));
      this.mesh.name = "construction spheres";
      this.group.add(this.mesh);
    }
    writeSphereInstances(this.mesh, spheres);
  }

  dispose(): void {
    if (this.mesh !== undefined) this.group.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
