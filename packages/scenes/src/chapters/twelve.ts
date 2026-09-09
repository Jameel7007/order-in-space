import {
  closestPacking,
  hullOfCenters,
  length,
  packingContacts,
  scale,
  vec3,
  type Polyhedron,
  type Sphere,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type SceneFrame } from "../frame.js";
import { OPACITY, SPHERE_RADIUS, cameraPose } from "../world.js";
import { CLOSE_ZOOM } from "./spherepoint.js";

let cachedPacking: readonly Sphere[] | undefined;
let cachedHull: Polyhedron | undefined;

export function firstShellPacking(): readonly Sphere[] {
  cachedPacking ??= closestPacking(1, SPHERE_RADIUS);
  return cachedPacking;
}

export function shellHull(): Polyhedron {
  cachedHull ??= hullOfCenters(firstShellPacking(), "twelve around one");
  return cachedHull;
}

const ARRIVAL_START = 0.12;
const ARRIVAL_STEP = 0.042;
const ARRIVAL_LENGTH = 0.11;
const TRAVEL_MULTIPLIER = 3.2;

export function arrivalOf(progress: number, index: number): number {
  const start = ARRIVAL_START + index * ARRIVAL_STEP;
  return smooth(phase(progress, start, start + ARRIVAL_LENGTH));
}

export function sampleTwelve(progress: number): SceneFrame {
  const packing = firstShellPacking();
  const nucleus = packing.filter(({ shell }) => shell === 0);
  const shell = packing.filter(({ shell: index }) => index === 1);
  const zoom = mix(CLOSE_ZOOM, 1, smooth(phase(progress, 0, 0.18)));

  const arrivals = shell.map((_, index) => arrivalOf(progress, index));
  const arrived = arrivals.filter((value) => value >= 1 - 1e-9).length;
  const travelling = shell.map((sphere, index) => {
    const arrival = arrivals[index] ?? 0;
    const distance = 1 + (1 - arrival) * TRAVEL_MULTIPLIER;
    return { ...sphere, center: scale(sphere.center, distance) };
  });
  const settle = smooth(phase(progress, 0.66, 0.8));
  const hullOpacity = smooth(phase(progress, 0.74, 0.88));
  const shellOpacity = mix(1, OPACITY.shell, settle);
  const nucleusOpacity = mix(1, OPACITY.nucleus, settle);
  const visibleShell = travelling
    .map((sphere, index) => ({ sphere, arrival: arrivals[index] ?? 0 }))
    .filter(({ arrival }) => arrival > 1e-6);
  const contacts = packingContacts([...nucleus, ...travelling]).length;
  const hull = shellHull();

  return {
    chapter: 3,
    progress,
    solids: visible([solid("twelve:hull", hull, { opacity: hullOpacity, role: "primary" })]),
    spheres: visible([
      { key: "nucleus", spheres: nucleus, role: "point", opacity: nucleusOpacity },
      ...visibleShell.map(({ sphere, arrival }, index) => ({
        key: `shell:${String(index)}`,
        spheres: [sphere],
        role: "shell" as const,
        opacity: shellOpacity * arrival,
      })),
    ]),
    polygons: [],
    lines: [],
    guides: visible([{
      key: "master",
      radius: SPHERE_RADIUS,
      opacity: OPACITY.guide * (1 - smooth(phase(progress, 0.05, 0.25))),
    }]),
    camera: { ...cameraPose(2 + progress), zoom, focus: vec3(0, 0, 0) },
    readout: {
      name: hullOpacity > 0 ? "Cuboctahedron" : arrived === 12 ? "Twelve around one" : "Gathering",
      invitation: hullOpacity > 0
        ? "Their centers draw a shape of their own"
        : arrived === 12
          ? "No thirteenth sphere can touch the center"
          : `${String(arrived)} of 12 spheres touching`,
      detail: `${String(contacts)} touches · center distance ${length(shell[0]?.center ?? vec3(0, 0, 0)).toFixed(3)} = 2R`,
      measure: `${String(arrived)} / 12`,
      ...(hullOpacity > 0 ? { counts: counts(hull) } : {}),
    },
  };
}

export const twelveChapter: Chapter = {
  number: 3,
  id: "twelve",
  title: "Twelve around one",
  kicker: "Spheres gather",
  screens: 6,
  beatStarts: [0, 0.3, 0.7, 0.88],
  beats: [
    {
      eyebrow: "A crowd forms",
      heading: "How many equal spheres can touch one sphere at once?",
      body: "Let them arrive one at a time, each pressing in as close as it can without overlapping.",
    },
    {
      eyebrow: "Twelve, exactly",
      heading: "Twelve fit. A thirteenth never will.",
      body: "Four spheres around the middle, four above, four below. This is how oranges stack and how many metals hold their atoms.",
    },
    {
      eyebrow: "The hidden skeleton",
      heading: "Join their centers and a solid appears.",
      body: "Eight triangles and six squares: the cuboctahedron. Nobody drew it. The spheres found it by touching.",
    },
    {
      eyebrow: "Twenty-four touches",
      heading: "Every edge is a place where two spheres kiss.",
      body: "Twelve touches with the center, twenty-four between neighbors. The shape is a diagram of contact.",
    },
  ],
  sample: sampleTwelve,
};
