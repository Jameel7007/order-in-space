import {
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Vector3,
} from "three";

export interface CircumsphereGuideStyle {
  readonly color?: number;
  readonly opacity?: number;
  readonly segments?: number;
}

type CirclePlane = "xy" | "xz" | "yz";

function circlePoints(radius: number, segments: number, plane: CirclePlane): Vector3[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    const a = Math.cos(angle) * radius;
    const b = Math.sin(angle) * radius;
    if (plane === "xy") return new Vector3(a, b, 0);
    if (plane === "xz") return new Vector3(a, 0, b);
    return new Vector3(0, a, b);
  });
}

/**
 * Three restrained great circles make the shared radius perceptible without
 * competing with the structural edge drawing.
 */
export function createCircumsphereGuide(
  radius: number,
  style: CircumsphereGuideStyle = {},
): Group {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error("Guide radius must be positive and finite");
  }
  const segments = style.segments ?? 128;
  if (!Number.isInteger(segments) || segments < 12) {
    throw new Error("A circumsphere guide needs at least twelve segments");
  }

  const group = new Group();
  group.name = "circumsphere guide";
  for (const plane of ["xy", "xz", "yz"] as const) {
    const geometry = new BufferGeometry().setFromPoints(circlePoints(radius, segments, plane));
    const material = new LineBasicMaterial({
      color: style.color ?? 0x625e56,
      opacity: style.opacity ?? 0.14,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
    const circle = new LineLoop(geometry, material);
    circle.name = `${plane} radius circle`;
    circle.renderOrder = -1;
    group.add(circle);
  }
  return group;
}

