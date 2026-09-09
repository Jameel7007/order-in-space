import {
  alignSolids,
  convexHull,
  rotationalWythoffCorrespondence,
  scalePolyhedron,
  solveSnubGenerator,
  transformPolyhedron,
  vec3,
  wythoff,
  type CoxeterTriangle,
  type Matrix3,
  type MirrorDistances,
  type Polyhedron,
} from "@order-in-space/geometry";

import type { Beat, Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type FrameSolid, type SceneFrame } from "../frame.js";
import { tetrahedralCluster } from "../lattice-cluster.js";
import { ICOSAHEDRAL_RADIUS, cameraPose } from "../world.js";
import { storyIcosahedron } from "./golden.js";

export type RoomKey = "icosahedral" | "octahedral" | "tetrahedral";
export type OrbitMode = "full" | "chiral";

export interface Room {
  readonly key: RoomKey;
  readonly triangle: CoxeterTriangle;
  readonly label: string;
}

export interface GeneratorWaypoint {
  readonly name: string;
  readonly symbol: string;
  readonly invitation: string;
  readonly room: RoomKey;
  readonly distances: MirrorDistances;
  readonly orbit: OrbitMode;
}

export type SegmentKind = "slide" | "alternate" | "room";

export interface GeneratorSegment {
  readonly index: number;
  readonly from: GeneratorWaypoint;
  readonly to: GeneratorWaypoint;
  readonly kind: SegmentKind;
  readonly start: number;
  readonly end: number;
}

export interface GeneratorSample {
  readonly progress: number;
  readonly segment: GeneratorSegment;
  readonly segmentProgress: number;
  readonly room: Room;
  readonly distances: MirrorDistances;
  readonly orbit: OrbitMode;
  readonly nearestWaypoint: GeneratorWaypoint;
  readonly atNamedPosition: boolean;
}

export const ROOMS: Readonly<Record<RoomKey, Room>> = {
  icosahedral: { key: "icosahedral", triangle: [2, 3, 5], label: "(2,3,5) · the icosahedral room" },
  octahedral: { key: "octahedral", triangle: [2, 3, 4], label: "(2,3,4) · the octahedral room" },
  tetrahedral: { key: "tetrahedral", triangle: [2, 3, 3], label: "(2,3,3) · the tetrahedral room" },
};

function snubDistances(triangle: CoxeterTriangle): MirrorDistances {
  return solveSnubGenerator(triangle).generator;
}

const OMNI: MirrorDistances = [1, 1, 1];

export const GENERATOR_WAYPOINTS: readonly GeneratorWaypoint[] = [
  { name: "Icosahedron", symbol: "{3,5}", invitation: "Twelve corners wake up", room: "icosahedral", distances: [0, 0, 1], orbit: "full" },
  { name: "Truncated icosahedron", symbol: "t{3,5}", invitation: "The familiar football appears", room: "icosahedral", distances: [0, 1, 1], orbit: "full" },
  { name: "Icosidodecahedron", symbol: "r{5,3}", invitation: "Triangles and pentagons meet", room: "icosahedral", distances: [0, 1, 0], orbit: "full" },
  { name: "Truncated dodecahedron", symbol: "t{5,3}", invitation: "The pentagons open out", room: "icosahedral", distances: [1, 1, 0], orbit: "full" },
  { name: "Dodecahedron", symbol: "{5,3}", invitation: "Twenty corners settle into place", room: "icosahedral", distances: [1, 0, 0], orbit: "full" },
  { name: "Rhombicosidodecahedron", symbol: "rr{5,3}", invitation: "Step off the mirror and squares appear", room: "icosahedral", distances: [1, 0, 1], orbit: "full" },
  { name: "Truncated icosidodecahedron", symbol: "tr{5,3}", invitation: "Every one of the 120 echoes is in play", room: "icosahedral", distances: OMNI, orbit: "full" },
  { name: "Alternated omnitruncate", symbol: "h(tr{5,3})", invitation: "Dismiss every other echo", room: "icosahedral", distances: OMNI, orbit: "chiral" },
  { name: "Snub dodecahedron", symbol: "s{5,3}", invitation: "Slide until every edge agrees", room: "icosahedral", distances: snubDistances([2, 3, 5]), orbit: "chiral" },
  { name: "Snub cube", symbol: "s{4,3}", invitation: "A smaller room, the same twist", room: "octahedral", distances: snubDistances([2, 3, 4]), orbit: "chiral" },
  { name: "Alternated omnitruncate", symbol: "h(tr{4,3})", invitation: "Back to the middle of the room", room: "octahedral", distances: OMNI, orbit: "chiral" },
  { name: "Truncated cuboctahedron", symbol: "tr{4,3}", invitation: "Every echo returns: 48 corners", room: "octahedral", distances: OMNI, orbit: "full" },
  { name: "Rhombicuboctahedron", symbol: "rr{4,3}", invitation: "Squares between squares", room: "octahedral", distances: [1, 0, 1], orbit: "full" },
  { name: "Cube", symbol: "{4,3}", invitation: "The point rests in a corner", room: "octahedral", distances: [1, 0, 0], orbit: "full" },
  { name: "Truncated cube", symbol: "t{4,3}", invitation: "Corners become triangles", room: "octahedral", distances: [1, 1, 0], orbit: "full" },
  { name: "Cuboctahedron", symbol: "r{4,3}", invitation: "Twelve around one, seen again", room: "octahedral", distances: [0, 1, 0], orbit: "full" },
  { name: "Truncated octahedron", symbol: "t{3,4}", invitation: "Squares and hexagons", room: "octahedral", distances: [0, 1, 1], orbit: "full" },
  { name: "Octahedron", symbol: "{3,4}", invitation: "Six corners, eight faces", room: "octahedral", distances: [0, 0, 1], orbit: "full" },
  { name: "Octahedron", symbol: "{3,4}", invitation: "The same solid, in the smallest room", room: "tetrahedral", distances: [0, 1, 0], orbit: "full" },
  { name: "Truncated tetrahedron", symbol: "t{3,3}", invitation: "Hexagons and triangles", room: "tetrahedral", distances: [1, 1, 0], orbit: "full" },
  { name: "Tetrahedron", symbol: "{3,3}", invitation: "Four corners: the simplest solid of all", room: "tetrahedral", distances: [1, 0, 0], orbit: "full" },
];

function segmentKind(from: GeneratorWaypoint, to: GeneratorWaypoint): SegmentKind {
  if (from.room !== to.room) return "room";
  if (from.orbit !== to.orbit) return "alternate";
  return "slide";
}

const SEGMENT_WEIGHTS: Readonly<Record<SegmentKind, number>> = { slide: 1, alternate: 0.6, room: 0.5 };

function buildSegments(): readonly GeneratorSegment[] {
  const pairs = GENERATOR_WAYPOINTS.slice(0, -1).map((from, index) => {
    const to = GENERATOR_WAYPOINTS[index + 1];
    if (to === undefined) throw new Error("Waypoint list ended unexpectedly");
    return { from, to, kind: segmentKind(from, to) };
  });
  const total = pairs.reduce((sum, { kind }) => sum + SEGMENT_WEIGHTS[kind], 0);
  let cursor = 0;
  return pairs.map(({ from, to, kind }, index) => {
    const start = cursor / total;
    cursor += SEGMENT_WEIGHTS[kind];
    const end = index === pairs.length - 1 ? 1 : cursor / total;
    return { index, from, to, kind, start, end };
  });
}

export const GENERATOR_SEGMENTS: readonly GeneratorSegment[] = buildSegments();

const GEOMETRY_STEPS = 160;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function interpolateDistances(left: MirrorDistances, right: MirrorDistances, amount: number): MirrorDistances {
  return left.map((value, index) => value + ((right[index] ?? value) - value) * amount) as unknown as MirrorDistances;
}

export function sampleGeneratorPath(progress: number): GeneratorSample {
  const normalized = clamp01(progress);
  const segment = GENERATOR_SEGMENTS.find((candidate) => normalized <= candidate.end)
    ?? GENERATOR_SEGMENTS[GENERATOR_SEGMENTS.length - 1];
  if (segment === undefined) throw new Error("Generator path has no segments");
  const span = segment.end - segment.start;
  const segmentProgress = span <= 0 ? 0 : clamp01((normalized - segment.start) / span);
  const active = segment.kind === "room" && segmentProgress >= 0.5 ? segment.to : segment.from;
  const distances = segment.kind === "slide"
    ? interpolateDistances(segment.from.distances, segment.to.distances, segmentProgress)
    : active.distances;
  const nearestWaypoint = segmentProgress < 0.5 ? segment.from : segment.to;
  const namedDistance = Math.min(segmentProgress, 1 - segmentProgress);
  return {
    progress: normalized,
    segment,
    segmentProgress,
    room: ROOMS[active.room],
    distances,
    orbit: segment.kind === "slide" ? segment.from.orbit : active.orbit,
    nearestWaypoint,
    atNamedPosition: namedDistance <= 1e-9 || segment.kind !== "slide",
  };
}

const rotationCache = new Map<RoomKey, Matrix3>();

function rawSolid(room: Room, distances: MirrorDistances, orbit: OrbitMode, symbol: string): Polyhedron {
  if (orbit === "chiral") {
    const points = rotationalWythoffCorrespondence(room.triangle, distances, "right", ICOSAHEDRAL_RADIUS);
    return convexHull(points.map(({ position }) => position), { symbol });
  }
  return wythoff(room.triangle, distances, { circumradius: ICOSAHEDRAL_RADIUS, symbol });
}

/**
 * Each mirror room is turned so its solids meet their neighbors exactly:
 * the icosahedral room lands on the tightened shell of Scene 5, the
 * tetrahedral room lands on the four-sphere cluster of Scene 7, and the
 * octahedral room shares its octahedron with the tetrahedral room.
 */
export function roomRotation(key: RoomKey): Matrix3 {
  const cached = rotationCache.get(key);
  if (cached !== undefined) return cached;
  let rotation: Matrix3;
  if (key === "icosahedral") {
    rotation = alignSolids(rawSolid(ROOMS.icosahedral, [0, 0, 1], "full", "{3,5}"), storyIcosahedron());
  } else if (key === "tetrahedral") {
    const cluster = tetrahedralCluster();
    const target = scalePolyhedron(cluster.tetrahedron, ICOSAHEDRAL_RADIUS / cluster.tetrahedron.circumradius);
    rotation = alignSolids(rawSolid(ROOMS.tetrahedral, [1, 0, 0], "full", "{3,3}"), target);
  } else {
    const tetrahedralOctahedron = transformPolyhedron(
      rawSolid(ROOMS.tetrahedral, [0, 1, 0], "full", "{3,4}"),
      roomRotation("tetrahedral"),
    );
    rotation = alignSolids(rawSolid(ROOMS.octahedral, [0, 0, 1], "full", "{3,4}"), tetrahedralOctahedron);
  }
  rotationCache.set(key, rotation);
  return rotation;
}

const solidCache = new Map<string, Polyhedron>();

export function generatorSolid(room: Room, distances: MirrorDistances, orbit: OrbitMode, symbol: string): Polyhedron {
  const key = `${room.key}:${orbit}:${distances.map((value) => value.toFixed(6)).join(",")}`;
  const cached = solidCache.get(key);
  if (cached !== undefined) return cached;
  const built = transformPolyhedron(rawSolid(room, distances, orbit, symbol), roomRotation(room.key));
  if (solidCache.size > 2000) solidCache.clear();
  solidCache.set(key, built);
  return built;
}

/** The tetrahedron Scene 6 ends on and Scene 7 begins from. */
export function generatorEndTetrahedron(): Polyhedron {
  return generatorSolid(ROOMS.tetrahedral, [1, 0, 0], "full", "{3,3}");
}

function quantize(amount: number): number {
  return Math.round(amount * GEOMETRY_STEPS) / GEOMETRY_STEPS;
}

function waypointSolid(waypoint: GeneratorWaypoint): Polyhedron {
  return generatorSolid(ROOMS[waypoint.room], waypoint.distances, waypoint.orbit, waypoint.symbol);
}

function vertexReveal(segment: GeneratorSegment, amount: number): number {
  const before = GENERATOR_SEGMENTS[segment.index + 1];
  const after = GENERATOR_SEGMENTS[segment.index - 1];
  let opacity = 0;
  if (before?.kind === "alternate") opacity = Math.max(opacity, smooth(phase(amount, 0.68, 1)));
  if (after?.kind === "alternate") opacity = Math.max(opacity, 1 - smooth(phase(amount, 0, 0.32)));
  return opacity;
}

export function sampleGenerator(progress: number): SceneFrame {
  const sample = sampleGeneratorPath(progress);
  const { segment, segmentProgress } = sample;
  const solids: FrameSolid[] = [];
  let featured: Polyhedron;

  if (segment.kind === "slide") {
    const amount = quantize(segmentProgress);
    const distances = interpolateDistances(segment.from.distances, segment.to.distances, amount);
    const symbol = amount <= 0 ? segment.from.symbol : amount >= 1 ? segment.to.symbol : "moving point";
    featured = generatorSolid(sample.room, distances, sample.orbit, symbol);
    solids.push(solid(`generator:${sample.room.key}:${sample.orbit}:${segment.index}:${String(amount)}`, featured, {
      slot: "generator:moving",
      opacity: 1,
      vertexOpacity: vertexReveal(segment, amount),
    }));
  } else {
    const from = waypointSolid(segment.from);
    const to = waypointSolid(segment.to);
    const blend = smooth(segmentProgress);
    const alternate = segment.kind === "alternate";
    solids.push(
      solid(`generator:${segment.from.room}:${segment.from.orbit}:${segment.from.symbol}`, from, {
        opacity: 1 - blend,
        vertexOpacity: alternate ? 1 : 0,
      }),
      solid(`generator:${segment.to.room}:${segment.to.orbit}:${segment.to.symbol}`, to, {
        opacity: blend,
        vertexOpacity: alternate ? 1 : 0,
      }),
    );
    featured = blend < 0.5 ? from : to;
  }

  const named = sample.atNamedPosition ? sample.nearestWaypoint : undefined;
  const echoes = sample.orbit === "chiral" ? "half the echoes" : "every echo";
  return {
    chapter: 6,
    progress,
    solids: visible(solids),
    spheres: [],
    polygons: [],
    lines: [],
    guides: [],
    generator: {
      triangle: sample.room.triangle,
      distances: sample.distances,
      orbit: sample.orbit,
      room: sample.room.label,
    },
    camera: { ...cameraPose(5 + progress), zoom: 1, focus: vec3(0, 0, 0) },
    readout: {
      name: named?.name ?? "A shape in motion",
      invitation: named?.invitation ?? sample.nearestWaypoint.invitation,
      detail: `${named?.symbol ?? "moving point"} · ${sample.room.label} · ${echoes} · mirror distances ${sample.distances.map((value) => value.toFixed(2)).join(" · ")}`,
      measure: `${String(Math.round(sample.progress * 100))}%`,
      counts: counts(featured),
    },
  };
}

function waypointStart(index: number): number {
  return GENERATOR_SEGMENTS[index]?.start ?? 1;
}

const GENERATOR_BEATS: readonly (Beat & { readonly at: number })[] = [
  { at: 0, eyebrow: "The room of mirrors", heading: "One dot enters a room made of three mirrors.", body: "It looks alone. It isn't. The mirrors repeat it in every direction, and the copies are joined into a solid. Here the dot rests in a corner and the icosahedron appears." },
  { at: 1, eyebrow: "Then the echoes arrive", heading: "Slide the dot along one mirror and the corners open into faces.", body: "The football was hiding in the mirrors all along. The rule never changes; only the first point moves." },
  { at: 2, eyebrow: "Keep moving", heading: "Triangles and pentagons trade places.", body: "Halfway along the mirror, every corner is shared equally. Keep going and the pentagons take over." },
  { at: 4, eyebrow: "The twin, found by moving", heading: "The dot reaches the opposite corner: the dodecahedron.", body: "The icosahedron's inside-out twin was always the far corner of the same room." },
  { at: 5, eyebrow: "Off the mirrors", heading: "Step off every mirror and the room shows its whole hand.", body: "Sixty corners, then a hundred and twenty: each echo is a separate corner, and squares appear between the old faces." },
  { at: 7, eyebrow: "A twist", heading: "Dismiss every other echo.", body: "Keep only the copies made by turning, never by reflecting. Half the corners vanish, and the solid twists. This is the one step in the story where the rule itself changes." },
  { at: 8, eyebrow: "Settle the edges", heading: "Slide the dot until every edge agrees.", body: "There is exactly one spot where all the edges come out equal: the snub dodecahedron. Nothing about it was looked up. It was found by moving." },
  { at: 9, eyebrow: "Change rooms", heading: "A smaller room of mirrors holds the cube's family.", body: "Same three mirrors, set at a sharper angle. The same twist gives the snub cube, and the same walk visits every relative of the cube." },
  { at: 13, eyebrow: "The cube's family", heading: "Corner, edge, face: the cube, its truncations, and the cuboctahedron again.", body: "Twelve around one turns up here too. It is the midway point between the cube and the octahedron, just as it was between the twins." },
  { at: 17, eyebrow: "The last room", heading: "The octahedron belongs to two rooms at once.", body: "Walk it into the smallest room and it leads to the tetrahedron: four corners, four faces, the least a solid can have." },
  { at: 19, eyebrow: "Eighteen shapes, one rule", heading: "You have just changed a solid without ever touching it.", body: "Five regular solids and thirteen more, all from one point moving in three rooms. Form is a relationship, not a fixed object." },
];

export const generatorChapter: Chapter = {
  number: 6,
  id: "generator",
  title: "Move one point",
  kicker: "Change the whole world",
  screens: 16,
  beatStarts: GENERATOR_BEATS.map(({ at }) => waypointStart(at)),
  stills: GENERATOR_BEATS.map(({ at }, index) => (index === GENERATOR_BEATS.length - 1 ? 1 : waypointStart(at))),
  beats: GENERATOR_BEATS.map(({ eyebrow, heading, body }) => ({ eyebrow, heading, body })),
  sample: sampleGenerator,
};
