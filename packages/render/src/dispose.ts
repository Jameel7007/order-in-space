import {
  BufferGeometry,
  Group,
  Line,
  Material,
  Mesh,
  type Object3D,
} from "three";

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
  } else {
    material.dispose();
  }
}

export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh || child instanceof Line) {
      (child.geometry as BufferGeometry).dispose();
      disposeMaterial(child.material);
    }
  });
}

export function clearAndDispose(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}
