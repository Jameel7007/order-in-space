import { Line, Material, Mesh, type Object3D } from "three";

export type DepthMode = "always" | "never" | "auto";

/**
 * Edges and struts always write depth: a thin translucent cylinder that
 * suddenly starts occluding at half opacity reads as a pop. Fills and
 * sheets never write depth; spheres decide by opacity.
 */
export function setMaterialOpacity(object: Object3D | undefined, opacity: number, base = 1, depth: DepthMode = "auto"): void {
  if (object === undefined) return;
  object.traverse((child) => {
    if (!(child instanceof Mesh) && !(child instanceof Line)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials as Material[]) {
      const value = Math.max(0, Math.min(1, opacity * base));
      material.opacity = value;
      const transparent = value < 0.999;
      if (material.transparent !== transparent) {
        // three.js compiles opacity handling into the shader, so crossing the
        // opaque/translucent boundary needs a recompile; it happens rarely.
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = depth === "always" ? true : depth === "never" ? false : value >= 0.5;
    }
  });
  object.visible = opacity > 1e-4;
}

export function setRenderOrder(object: Object3D, order: number): void {
  object.traverse((child) => {
    child.renderOrder = order;
  });
}
