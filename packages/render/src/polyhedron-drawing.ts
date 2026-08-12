import type { Polyhedron } from "@order-in-space/geometry";
import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import { clearAndDispose } from "./dispose.js";

const Y_AXIS = new Vector3(0, 1, 0);

export interface PolyhedronDrawingStyle {
  readonly edgeColor?: number;
  readonly edgeRadius?: number;
  readonly faceColor?: number;
  readonly faceOpacity?: number;
  readonly vertexColor?: number;
  readonly vertexRadius?: number;
  readonly showFaces?: boolean;
  readonly showVertices?: boolean;
}

const DEFAULT_STYLE: Required<PolyhedronDrawingStyle> = {
  edgeColor: 0x292825,
  edgeRadius: 0.018,
  faceColor: 0xb3a58f,
  faceOpacity: 0.12,
  vertexColor: 0x9a4e32,
  vertexRadius: 0.035,
  showFaces: true,
  showVertices: false,
};

function vector({ x, y, z }: { readonly x: number; readonly y: number; readonly z: number }): Vector3 {
  return new Vector3(x, y, z);
}

export function createEdgeMesh(polyhedron: Polyhedron, style: PolyhedronDrawingStyle = {}): InstancedMesh {
  const resolved = { ...DEFAULT_STYLE, ...style };
  const geometry = new CylinderGeometry(1, 1, 1, 10, 1, false);
  const material = new MeshStandardMaterial({
    color: resolved.edgeColor,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new InstancedMesh(geometry, material, polyhedron.edges.length);
  mesh.name = "polyhedron edges";
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const midpoint = new Vector3();
  const direction = new Vector3();
  const quaternion = new Quaternion();
  const transform = new Matrix4();
  const instanceScale = new Vector3();
  polyhedron.edges.forEach(([startIndex, endIndex], instance) => {
    const startValue = polyhedron.vertices[startIndex];
    const endValue = polyhedron.vertices[endIndex];
    if (startValue === undefined || endValue === undefined) {
      throw new Error("Polyhedron edge references a missing vertex");
    }
    const start = vector(startValue);
    const end = vector(endValue);
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start);
    const edgeLength = direction.length();
    if (edgeLength <= 1e-12) throw new Error("Cannot render a zero-length edge");
    quaternion.setFromUnitVectors(Y_AXIS, direction.multiplyScalar(1 / edgeLength));
    instanceScale.set(resolved.edgeRadius, edgeLength, resolved.edgeRadius);
    transform.compose(midpoint, quaternion, instanceScale);
    mesh.setMatrixAt(instance, transform);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export function createFaceMesh(polyhedron: Polyhedron, style: PolyhedronDrawingStyle = {}): Mesh {
  const resolved = { ...DEFAULT_STYLE, ...style };
  const positions: number[] = [];
  for (const face of polyhedron.faces) {
    const first = polyhedron.vertices[face[0] ?? -1];
    if (first === undefined) throw new Error("Face references a missing vertex");
    for (let index = 1; index < face.length - 1; index += 1) {
      const second = polyhedron.vertices[face[index] ?? -1];
      const third = polyhedron.vertices[face[index + 1] ?? -1];
      if (second === undefined || third === undefined) {
        throw new Error("Face references a missing vertex");
      }
      positions.push(
        first.x, first.y, first.z,
        second.x, second.y, second.z,
        third.x, third.y, third.z,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = new MeshStandardMaterial({
    color: resolved.faceColor,
    opacity: resolved.faceOpacity,
    transparent: resolved.faceOpacity < 1,
    depthWrite: true,
    roughness: 1,
    metalness: 0,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "supporting faces";
  mesh.receiveShadow = true;
  return mesh;
}

export function createVertexMesh(polyhedron: Polyhedron, style: PolyhedronDrawingStyle = {}): InstancedMesh {
  const resolved = { ...DEFAULT_STYLE, ...style };
  const geometry = new SphereGeometry(resolved.vertexRadius, 14, 10);
  const material = new MeshStandardMaterial({
    color: resolved.vertexColor,
    roughness: 0.76,
  });
  const mesh = new InstancedMesh(geometry, material, polyhedron.vertices.length);
  mesh.name = "polyhedron vertices";
  const transform = new Matrix4();
  polyhedron.vertices.forEach((position, index) => {
    transform.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(index, transform);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export class PolyhedronDrawing {
  readonly group = new Group();
  private polyhedron: Polyhedron;
  private style: PolyhedronDrawingStyle;

  constructor(polyhedron: Polyhedron, style: PolyhedronDrawingStyle = {}) {
    this.polyhedron = polyhedron;
    this.style = style;
    this.group.name = "polyhedron drawing";
    this.rebuild();
  }

  update(polyhedron: Polyhedron, style: PolyhedronDrawingStyle = this.style): void {
    this.polyhedron = polyhedron;
    this.style = style;
    this.rebuild();
  }

  setFacesVisible(visible: boolean): void {
    const faces = this.group.getObjectByName("supporting faces");
    if (faces !== undefined) faces.visible = visible;
  }

  setVerticesVisible(visible: boolean): void {
    const vertices = this.group.getObjectByName("polyhedron vertices");
    if (vertices !== undefined) vertices.visible = visible;
  }

  dispose(): void {
    clearAndDispose(this.group);
  }

  private rebuild(): void {
    clearAndDispose(this.group);
    const resolved = { ...DEFAULT_STYLE, ...this.style };
    if (resolved.showFaces) this.group.add(createFaceMesh(this.polyhedron, resolved));
    this.group.add(createEdgeMesh(this.polyhedron, resolved));
    if (resolved.showVertices) this.group.add(createVertexMesh(this.polyhedron, resolved));
  }
}
