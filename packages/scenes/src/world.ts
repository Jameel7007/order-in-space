import { PHI } from "@order-in-space/geometry";

/** Radius of every spherepoint in the story. */
export const SPHERE_RADIUS = 0.5;
/** Radius the first point starts and ends with. */
export const POINT_RADIUS = 0.02;
/** Twelve touching spheres put their centers 2R from the nucleus. */
export const SHELL_RADIUS = 2 * SPHERE_RADIUS;
/** Center radius of the tightened, nucleus-free icosahedral shell. */
export const ICOSAHEDRAL_RADIUS = Math.sqrt(1 + PHI * PHI) * SPHERE_RADIUS;

export const OPACITY = {
  shell: 0.42,
  shellGhost: 0.16,
  nucleus: 0.62,
  nucleusGhost: 0.3,
  guide: 0.9,
} as const;

export const CHAPTER_COUNT = 9;

const TURNS_PER_STORY = 1;

/**
 * One slow, periodic camera drift for the whole story. Periodicity is what
 * lets the final frame coincide with the first.
 */
export function cameraPose(globalProgress: number): { readonly yaw: number; readonly pitch: number } {
  const u = globalProgress;
  return {
    yaw: -0.58 + (2 * Math.PI * TURNS_PER_STORY * u) / CHAPTER_COUNT + 0.22 * Math.sin(2 * Math.PI * u),
    pitch: 0.2 + 0.09 * Math.sin((2 * Math.PI * u) / CHAPTER_COUNT) + 0.05 * Math.sin(4 * Math.PI * u),
  };
}
