export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Edge = readonly [start: number, end: number];
export type Face = readonly number[];

export interface Polyhedron {
  readonly vertices: readonly Vec3[];
  readonly edges: readonly Edge[];
  readonly faces: readonly Face[];
  readonly symbol: string;
  readonly circumradius: number;
}

export type CoxeterTriangle = readonly [number, number, number];
export type MirrorDistances = readonly [number, number, number];

