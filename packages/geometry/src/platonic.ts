import type { CoxeterTriangle, MirrorDistances, Polyhedron } from "./types.js";
import { wythoff } from "./wythoff.js";

export type PlatonicName = "tetrahedron" | "cube" | "octahedron" | "dodecahedron" | "icosahedron";

interface PlatonicSpec {
  readonly triangle: CoxeterTriangle;
  readonly generator: MirrorDistances;
  readonly symbol: string;
}

export const PLATONIC_SPECS: Readonly<Record<PlatonicName, PlatonicSpec>> = {
  tetrahedron: { triangle: [2, 3, 3], generator: [1, 0, 0], symbol: "{3,3}" },
  cube: { triangle: [2, 3, 4], generator: [1, 0, 0], symbol: "{4,3}" },
  octahedron: { triangle: [2, 3, 4], generator: [0, 0, 1], symbol: "{3,4}" },
  dodecahedron: { triangle: [2, 3, 5], generator: [1, 0, 0], symbol: "{5,3}" },
  icosahedron: { triangle: [2, 3, 5], generator: [0, 0, 1], symbol: "{3,5}" },
};

export function platonic(name: PlatonicName, circumradius = 1): Polyhedron {
  const spec = PLATONIC_SPECS[name];
  return wythoff(spec.triangle, spec.generator, {
    circumradius,
    symbol: spec.symbol,
  });
}

