import {
  axisAlignedGoldenTriad,
  hullOfCenters,
  packingContacts,
  tightenFirstShell,
  vec3,
  type Polyhedron,
  type Vec3,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type SceneFrame } from "../frame.js";
import { OPACITY, SPHERE_RADIUS, cameraPose } from "../world.js";
import { firstShellPacking } from "./twelve.js";

const TIGHTEN_STEPS = 240;
const tightenCache = new Map<number, { readonly hull: Polyhedron; readonly frame: ReturnType<typeof tightenFirstShell> }>();

export function tighteningAt(amount: number) {
  const step = Math.round(amount * TIGHTEN_STEPS);
  const cached = tightenCache.get(step);
  if (cached !== undefined) return cached;
  const frame = tightenFirstShell(step / TIGHTEN_STEPS, SPHERE_RADIUS);
  const hull = hullOfCenters(frame.spheres, step === 0 ? "twelve around one" : step === TIGHTEN_STEPS ? "{3,5}" : "tightening shell");
  const entry = { hull, frame };
  tightenCache.set(step, entry);
  return entry;
}

let cachedRectangles: readonly (readonly [Vec3, Vec3])[] | undefined;

export function goldenRectangleSegments(): readonly (readonly [Vec3, Vec3])[] {
  if (cachedRectangles !== undefined) return cachedRectangles;
  const { hull } = tighteningAt(1);
  cachedRectangles = axisAlignedGoldenTriad(hull).flatMap(({ corners }) => (
    corners.map((corner, index) => [corner, corners[(index + 1) % 4] ?? corner] as const)
  ));
  return cachedRectangles;
}

/** The icosahedron every Scene 6 solid shares its sphere with. */
export function storyIcosahedron(): Polyhedron {
  return tighteningAt(1).hull;
}

export function sampleGolden(progress: number): SceneFrame {
  const nucleus = firstShellPacking().filter(({ shell }) => shell === 0);
  const release = smooth(phase(progress, 0, 0.14));
  const amount = smooth(phase(progress, 0.16, 0.66));
  const { hull, frame } = tighteningAt(amount);
  const rectangleOpacity = Math.min(smooth(phase(progress, 0.64, 0.78)), 1 - smooth(phase(progress, 0.92, 1)));
  const sphereFade = smooth(phase(progress, 0.8, 0.92));
  const shellOpacity = mix(OPACITY.shell, 0.72, release) * (1 - sphereFade);
  const contacts = packingContacts(frame.spheres).length;
  const tightened = amount >= 1 - 1e-9;

  return {
    chapter: 5,
    progress,
    solids: [solid(tightened ? "golden:icosahedron" : `golden:shell:${String(Math.round(amount * TIGHTEN_STEPS))}`, hull, {
      opacity: 1,
      role: "primary",
    })],
    spheres: visible([
      { key: "nucleus", spheres: nucleus, role: "point", opacity: OPACITY.nucleus * (1 - release) },
      ...frame.spheres.map((sphere, index) => ({
        key: `shell:${String(index)}`,
        spheres: [sphere],
        role: "shell" as const,
        opacity: shellOpacity,
      })),
    ]),
    polygons: [],
    lines: visible([{
      key: "golden:rectangles",
      segments: rectangleOpacity > 0 ? goldenRectangleSegments() : [],
      role: "rectangle",
      opacity: rectangleOpacity,
    }]),
    guides: [],
    camera: { ...cameraPose(4 + progress), zoom: 1, focus: vec3(0, 0, 0) },
    readout: {
      name: tightened ? "Icosahedron" : amount > 0 ? "Tightening shell" : release >= 1 ? "Twelve without a center" : "Cuboctahedron",
      invitation: rectangleOpacity > 0
        ? "Three golden rectangles hold the corners"
        : tightened
          ? "Thirty touches now, and every edge equal"
          : amount > 0
            ? `${String(contacts)} touches as the shell pulls in`
            : release >= 1 ? "Take the center away" : "Twelve equal spheres around one",
      detail: `shell radius ${frame.centerRadius.toFixed(3)} · ${String(contacts)} touches · ${tightened ? "long side ÷ short side = 1.618" : "squares fold along a diagonal"}`,
      measure: `r = ${frame.centerRadius.toFixed(3)}`,
      counts: counts(hull),
    },
  };
}

export const goldenChapter: Chapter = {
  number: 5,
  id: "golden",
  title: "The golden tightening",
  kicker: "Remove the center",
  screens: 7,
  beats: [
    {
      eyebrow: "An empty middle",
      heading: "Take the center sphere away.",
      body: "The twelve are left holding a hollow. The square gaps in their shell are wider than they need to be.",
    },
    {
      eyebrow: "Pull inward",
      heading: "Let the twelve close in until every neighbor touches.",
      body: "Each square opening folds along a diagonal into two triangles. Twenty-four touches become thirty. This is a real motion, not a swap of shapes.",
    },
    {
      eyebrow: "The icosahedron",
      heading: "The shell clicks into the roundest solid.",
      body: "Twenty triangles, all alike. The twelve spheres are now closer to the middle than before, and no bigger sphere could sit inside.",
    },
    {
      eyebrow: "The golden ratio",
      heading: "Three rectangles, each 1.618 times longer than wide.",
      body: "Slide three golden rectangles through one another at right angles and their twelve corners are exactly these twelve centers.",
    },
  ],
  sample: sampleGolden,
};
