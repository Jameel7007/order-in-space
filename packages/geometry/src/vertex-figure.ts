import { regularCornerAngle } from "./deficiency.js";
import { applyMatrix } from "./matrix.js";
import { rotationAboutAxis } from "./transform.js";
import type { Vec3 } from "./types.js";
import { add, cross, distance, normalize, scale, subtract, vec3 } from "./vector.js";

export interface VertexFigureSpec {
  /** Number of sides of each regular polygon meeting at the corner. */
  readonly sides: number;
  /** How many of those polygons meet at the corner. */
  readonly count: number;
}

export interface VertexFigureFold {
  readonly spec: VertexFigureSpec;
  readonly progress: number;
  /** Interior angle of one polygon corner, in radians. */
  readonly cornerAngle: number;
  /** Sum of the corner angles around the apex, in radians. */
  readonly angleSum: number;
  /** 2π minus the angle sum; the wedge removed from the flat sheet. */
  readonly deficiency: number;
  /** Azimuthal opening still visible between the last and first polygon. */
  readonly gapAngle: number;
  /** Angle between each apex edge and the downward axis (π/2 when flat). */
  readonly coneAngle: number;
  /** Polygons in apex-first order; each has `sides` vertices and unit edges. */
  readonly polygons: readonly (readonly Vec3[])[];
  readonly closes: boolean;
  readonly closed: boolean;
}

const DOWN = vec3(0, -1, 0);

function edgeDirection(coneAngle: number, azimuth: number): Vec3 {
  return vec3(
    Math.sin(coneAngle) * Math.cos(azimuth),
    -Math.cos(coneAngle),
    Math.sin(coneAngle) * Math.sin(azimuth),
  );
}

function regularPolygonThrough(apex: Vec3, first: Vec3, last: Vec3, sides: number): readonly Vec3[] {
  const circumradius = 1 / (2 * Math.sin(Math.PI / sides));
  const bisector = normalize(add(subtract(first, apex), subtract(last, apex)));
  const center = add(apex, scale(bisector, circumradius));
  const normal = normalize(cross(subtract(first, apex), subtract(last, apex)));
  const step = (2 * Math.PI) / sides;
  const spoke = subtract(apex, center);
  const forward = Array.from({ length: sides }, (_, index) => (
    add(center, applyMatrix(rotationAboutAxis(normal, step * index), spoke))
  ));
  const second = forward[1];
  if (second !== undefined && distance(second, first) <= 1e-9) return forward;
  return Array.from({ length: sides }, (_, index) => (
    add(center, applyMatrix(rotationAboutAxis(normal, -step * index), spoke))
  ));
}

/**
 * Fold `count` regular `sides`-gons around one shared corner, exactly as a
 * paper sheet with a wedge removed closes into a cone. At progress 0 the
 * polygons lie flat with the deficiency wedge open; at progress 1 the wedge
 * has closed and the corner is the genuine vertex of the finished solid.
 * Polygons stay rigid and regular throughout; only the hinge angles change.
 */
export function foldVertexFigure(spec: VertexFigureSpec, progress: number): VertexFigureFold {
  if (!Number.isInteger(spec.count) || spec.count < 3) {
    throw new Error(`A corner needs at least three polygons; received ${String(spec.count)}`);
  }
  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const cornerAngle = regularCornerAngle(spec.sides);
  const angleSum = cornerAngle * spec.count;
  const deficiency = 2 * Math.PI - angleSum;
  if (deficiency < -1e-12) {
    throw new Error(`${String(spec.count)} ${String(spec.sides)}-gons overlap around one corner and cannot lie flat`);
  }
  const closes = deficiency > 1e-12;
  const gapAngle = closes ? deficiency * (1 - clamped) : 0;
  const azimuthStep = (2 * Math.PI - gapAngle) / spec.count;
  const cosineStep = Math.cos(azimuthStep);
  const cosineSquared = closes
    ? Math.min(1, Math.max(0, (Math.cos(cornerAngle) - cosineStep) / (1 - cosineStep)))
    : 0;
  const coneAngle = Math.acos(Math.sqrt(cosineSquared));
  const apex = vec3(0, 0, 0);
  const polygons = Array.from({ length: spec.count }, (_, index) => {
    const first = edgeDirection(coneAngle, azimuthStep * index);
    const last = edgeDirection(coneAngle, azimuthStep * (index + 1));
    return regularPolygonThrough(apex, first, last, spec.sides);
  });

  return {
    spec,
    progress: clamped,
    cornerAngle,
    angleSum,
    deficiency,
    gapAngle,
    coneAngle,
    polygons,
    closes,
    closed: closes && gapAngle <= 1e-12,
  };
}

export { DOWN as VERTEX_FIGURE_AXIS };
