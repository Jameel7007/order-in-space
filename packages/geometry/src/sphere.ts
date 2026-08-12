import type { Vec3 } from "./types.js";

export interface Sphere {
  readonly center: Vec3;
  readonly radius: number;
  /** Minimum number of nearest-neighbor FCC steps from the nucleus. */
  readonly shell: number;
}

