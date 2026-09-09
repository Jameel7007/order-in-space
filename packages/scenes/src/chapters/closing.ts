import {
  angularDeficiency,
  edgeLengths,
  foldVertexFigure,
  orientVertexToTop,
  platonic,
  scale,
  scalePolyhedron,
  vec3,
  type PlatonicName,
  type Polyhedron,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type SceneFrame } from "../frame.js";
import { OPACITY, SPHERE_RADIUS, cameraPose } from "../world.js";
import { CLOSE_ZOOM } from "./spherepoint.js";

export interface ClosureEpisode {
  readonly sides: number;
  readonly count: number;
  readonly name: string;
  readonly solid: PlatonicName | undefined;
  readonly polygonName: string;
}

export const CLOSURE_EPISODES: readonly ClosureEpisode[] = [
  { sides: 3, count: 3, name: "Tetrahedron", solid: "tetrahedron", polygonName: "triangles" },
  { sides: 3, count: 4, name: "Octahedron", solid: "octahedron", polygonName: "triangles" },
  { sides: 3, count: 5, name: "Icosahedron", solid: "icosahedron", polygonName: "triangles" },
  { sides: 4, count: 3, name: "Cube", solid: "cube", polygonName: "squares" },
  { sides: 5, count: 3, name: "Dodecahedron", solid: "dodecahedron", polygonName: "pentagons" },
  { sides: 3, count: 6, name: "The flat plane", solid: undefined, polygonName: "triangles" },
];

interface PosedSolid {
  readonly polyhedron: Polyhedron;
  readonly edge: number;
  readonly cornerCount: number;
}

const posedCache = new Map<PlatonicName, PosedSolid>();

/** The named solid inscribed in the spherepoint with one corner on top. */
export function posedClosure(name: PlatonicName): PosedSolid {
  const cached = posedCache.get(name);
  if (cached !== undefined) return cached;
  const polyhedron = orientVertexToTop(platonic(name, SPHERE_RADIUS), 0);
  const posed = {
    polyhedron,
    edge: edgeLengths(polyhedron)[0] ?? 1,
    cornerCount: polyhedron.vertices.length,
  };
  posedCache.set(name, posed);
  return posed;
}

function degrees(radians: number): string {
  return `${String(Math.round((radians * 180) / Math.PI))}°`;
}

export function sampleClosing(progress: number): SceneFrame {
  const episodeCount = CLOSURE_EPISODES.length;
  const scaled = Math.min(progress * episodeCount, episodeCount - 1e-9);
  const episodeIndex = Math.floor(scaled);
  const episode = CLOSURE_EPISODES[episodeIndex];
  if (episode === undefined) throw new Error("Closure episode out of range");
  const local = scaled - episodeIndex;

  const foldProgress = smooth(phase(local, 0.04, 0.56));
  const foldOpacity = Math.min(smooth(phase(local, 0, 0.08)), 1 - smooth(phase(local, 0.8, 0.9)));
  const solidOpacity = episode.solid === undefined
    ? 0
    : Math.min(smooth(phase(local, 0.46, 0.72)), 1 - smooth(phase(local, 0.86, 1)));

  const fold = foldVertexFigure({ sides: episode.sides, count: episode.count }, foldProgress);
  const posed = episode.solid === undefined ? undefined : posedClosure(episode.solid);
  // With no solid to inherit an edge from, the flat sheet borrows the
  // icosahedral edge so six triangles read at the same size as five.
  const edge = posed?.edge ?? posedClosure("icosahedron").edge;
  const apex = vec3(0, SPHERE_RADIUS, 0);
  const polygons = fold.polygons.map((polygon) => polygon.map((vertex) => {
    const grown = scale(vertex, edge);
    return vec3(grown.x + apex.x, grown.y + apex.y, grown.z + apex.z);
  }));

  // Turn the spherepoint into a translucent ground while the corners fold on
  // it, and restore it at both ends so the neighboring chapters join exactly.
  const veil = Math.min(smooth(phase(progress, 0, 0.03)), 1 - smooth(phase(progress, 0.97, 1)));
  const sphereOpacity = mix(1, OPACITY.veil, veil);
  const pose = cameraPose(1 + progress);
  const pitchLift = 0.42 * Math.min(smooth(phase(progress, 0, 0.16)), 1 - smooth(phase(progress, 0.84, 1)));
  const deficiency = angularDeficiency(posed?.polyhedron ?? platonic("icosahedron"));
  const totalDeficiency = posed === undefined ? 0 : deficiency.total;
  const closed = fold.closed;
  const name = episode.solid === undefined
    ? episode.name
    : closed ? episode.name : `${String(episode.count)} ${episode.polygonName} at a corner`;

  return {
    chapter: 2,
    progress,
    solids: visible([
      posed === undefined ? undefined : solid(`closing:${episode.solid ?? "plane"}`, scalePolyhedron(posed.polyhedron, 1), {
        opacity: solidOpacity,
        role: "primary",
      }),
    ]),
    spheres: [{
      key: "spherepoint",
      spheres: [{ center: vec3(0, 0, 0), radius: SPHERE_RADIUS, shell: 0 }],
      role: "point",
      opacity: sphereOpacity,
    }],
    polygons: visible([{ key: `fold:${String(episodeIndex)}`, polygons, role: "fold", opacity: foldOpacity }]),
    lines: [],
    guides: [{ key: "master", radius: SPHERE_RADIUS, opacity: OPACITY.guide }],
    camera: { yaw: pose.yaw, pitch: pose.pitch + pitchLift, zoom: CLOSE_ZOOM, focus: vec3(0, 0, 0) },
    readout: {
      name,
      invitation: episode.solid === undefined
        ? "Six triangles fill the whole turn"
        : closed
          ? `${String(posed?.cornerCount ?? 0)} corners × ${degrees(fold.deficiency)} = ${degrees(totalDeficiency)}`
          : `${String(episode.count)} × ${degrees(fold.cornerAngle)} = ${degrees(fold.angleSum)}, leaving ${degrees(fold.deficiency)}`,
      detail: episode.solid === undefined
        ? "3 × 6 × 60° = 360° · deficiency 0° · never closes"
        : `${String(episode.count)} × ${degrees(fold.cornerAngle)} · deficiency ${degrees(fold.deficiency)} per corner · total ${degrees(totalDeficiency)}`,
      measure: fold.closes ? `gap ${degrees(fold.gapAngle)}` : "gap 0° · flat",
      ...(posed !== undefined && solidOpacity > 0 ? { counts: counts(posed.polyhedron) } : {}),
    },
  };
}

export const closingChapter: Chapter = {
  number: 2,
  id: "closing",
  title: "Closing space",
  kicker: "How corners close",
  screens: 8,
  beats: [
    {
      eyebrow: "A corner is a decision",
      heading: "Three triangles meet. The gap between them folds shut.",
      body: "Lay three triangles around one point and half a turn is left over. Close that gap and the sheet lifts into a corner. Four such corners make the tetrahedron.",
    },
    {
      eyebrow: "Four triangles",
      heading: "Add a fourth triangle and the corner opens wider.",
      body: "Now only a quarter turn is missing. Six of these corners close into the octahedron.",
    },
    {
      eyebrow: "Five triangles",
      heading: "Five triangles leave the smallest gap of all.",
      body: "Just sixty degrees short of flat. Twelve corners like this make the icosahedron, the roundest of the family.",
    },
    {
      eyebrow: "Three squares",
      heading: "Squares can do it too, but only three at a time.",
      body: "Three right angles, a quarter turn to spare: the cube. A fourth square would lie flat and refuse to close.",
    },
    {
      eyebrow: "Three pentagons",
      heading: "Pentagons manage it once.",
      body: "Three pentagons leave thirty-six degrees. Twenty such corners fold into the dodecahedron, and that is the last one possible.",
    },
    {
      eyebrow: "Why only five",
      heading: "Six triangles use up the whole turn. Nothing is left to fold.",
      body: "A corner needs a gap. Every closed solid spends exactly 720 degrees of gap in total, which is why these five are the only regular ones.",
    },
  ],
  sample: sampleClosing,
};
