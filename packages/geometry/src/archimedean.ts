import { snub } from "./snub.js";
import type { CoxeterTriangle, MirrorDistances, Polyhedron } from "./types.js";
import { wythoff } from "./wythoff.js";

export type ArchimedeanName =
  | "truncatedTetrahedron"
  | "cuboctahedron"
  | "truncatedCube"
  | "truncatedOctahedron"
  | "rhombicuboctahedron"
  | "truncatedCuboctahedron"
  | "snubCube"
  | "icosidodecahedron"
  | "truncatedDodecahedron"
  | "truncatedIcosahedron"
  | "rhombicosidodecahedron"
  | "truncatedIcosidodecahedron"
  | "snubDodecahedron";

interface RingSpec {
  readonly kind: "ring";
  readonly triangle: CoxeterTriangle;
  readonly generator: MirrorDistances;
  readonly symbol: string;
}

interface SnubSpec {
  readonly kind: "snub";
  readonly triangle: CoxeterTriangle;
  readonly symbol: string;
}

type ArchimedeanSpec = RingSpec | SnubSpec;

/**
 * Named positions are ring selections in one of the three shared spherical
 * reflection families. They are not completed meshes or coordinate tables.
 */
export const ARCHIMEDEAN_SPECS: Readonly<Record<ArchimedeanName, ArchimedeanSpec>> = {
  truncatedTetrahedron: {
    kind: "ring", triangle: [2, 3, 3], generator: [1, 1, 0], symbol: "t{3,3}",
  },
  cuboctahedron: {
    kind: "ring", triangle: [2, 3, 4], generator: [0, 1, 0], symbol: "r{4,3}",
  },
  truncatedCube: {
    kind: "ring", triangle: [2, 3, 4], generator: [1, 1, 0], symbol: "t{4,3}",
  },
  truncatedOctahedron: {
    kind: "ring", triangle: [2, 3, 4], generator: [0, 1, 1], symbol: "t{3,4}",
  },
  rhombicuboctahedron: {
    kind: "ring", triangle: [2, 3, 4], generator: [1, 0, 1], symbol: "rr{4,3}",
  },
  truncatedCuboctahedron: {
    kind: "ring", triangle: [2, 3, 4], generator: [1, 1, 1], symbol: "tr{4,3}",
  },
  snubCube: {
    kind: "snub", triangle: [2, 3, 4], symbol: "s{4,3}",
  },
  icosidodecahedron: {
    kind: "ring", triangle: [2, 3, 5], generator: [0, 1, 0], symbol: "r{5,3}",
  },
  truncatedDodecahedron: {
    kind: "ring", triangle: [2, 3, 5], generator: [1, 1, 0], symbol: "t{5,3}",
  },
  truncatedIcosahedron: {
    kind: "ring", triangle: [2, 3, 5], generator: [0, 1, 1], symbol: "t{3,5}",
  },
  rhombicosidodecahedron: {
    kind: "ring", triangle: [2, 3, 5], generator: [1, 0, 1], symbol: "rr{5,3}",
  },
  truncatedIcosidodecahedron: {
    kind: "ring", triangle: [2, 3, 5], generator: [1, 1, 1], symbol: "tr{5,3}",
  },
  snubDodecahedron: {
    kind: "snub", triangle: [2, 3, 5], symbol: "s{5,3}",
  },
};

export const ARCHIMEDEAN_FAMILIES = {
  tetrahedral: ["truncatedTetrahedron"],
  octahedral: [
    "cuboctahedron",
    "truncatedCube",
    "truncatedOctahedron",
    "rhombicuboctahedron",
    "truncatedCuboctahedron",
    "snubCube",
  ],
  icosahedral: [
    "icosidodecahedron",
    "truncatedDodecahedron",
    "truncatedIcosahedron",
    "rhombicosidodecahedron",
    "truncatedIcosidodecahedron",
    "snubDodecahedron",
  ],
} as const satisfies Readonly<Record<string, readonly ArchimedeanName[]>>;

export function archimedean(name: ArchimedeanName, circumradius = 1): Polyhedron {
  const spec = ARCHIMEDEAN_SPECS[name];
  if (spec.kind === "snub") {
    return snub(spec.triangle, { circumradius, symbol: spec.symbol });
  }
  return wythoff(spec.triangle, spec.generator, {
    circumradius,
    symbol: spec.symbol,
  });
}
