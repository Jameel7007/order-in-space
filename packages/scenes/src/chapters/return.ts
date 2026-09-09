import { scale, vec3 } from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { mix, phase, smooth, solid, visible, type SceneFrame } from "../frame.js";
import { OPACITY, POINT_RADIUS, SPHERE_RADIUS, cameraPose } from "../world.js";
import { CELL_ZOOM, cellModel } from "./cell.js";
import { latticeModel } from "./lattice.js";

const TRAVEL_MULTIPLIER = 3.2;
const DEPART_START = 0.44;
const DEPART_STEP = 0.024;
const DEPART_LENGTH = 0.1;

export function departureOf(progress: number, index: number): number {
  const start = DEPART_START + (11 - index) * DEPART_STEP;
  return smooth(phase(progress, start, start + DEPART_LENGTH));
}

export function sampleReturn(progress: number): SceneFrame {
  const lattice = latticeModel();
  const model = cellModel();
  const neighborsGone = smooth(phase(progress, 0, 0.24));
  const cellGone = smooth(phase(progress, 0.26, 0.42));
  const zoom = mix(mix(CELL_ZOOM, 0.8, neighborsGone), 1, cellGone);
  const brighten = smooth(phase(progress, 0.3, 0.44));
  const shrink = smooth(phase(progress, 0.78, 1));
  const radius = mix(SPHERE_RADIUS, POINT_RADIUS, shrink);

  const inner = lattice.spheres.filter(({ shell }) => shell <= 1);
  const shell = inner.filter(({ shell: index }) => index === 1);
  const nucleus = inner.find(({ shell: index }) => index === 0);
  if (nucleus === undefined) throw new Error("Lattice has no nucleus");
  const departures = shell.map((_, index) => departureOf(progress, index));
  const remaining = departures.filter((value) => value < 1 - 1e-9).length;

  return {
    chapter: 9,
    progress,
    solids: visible([
      solid("cell:nucleus", model.cell, { opacity: 1 - cellGone, role: "primary" }),
      ...model.neighbors.map(({ cell }, index) => solid(`cell:neighbor:${String(index)}`, cell, {
        role: "secondary",
        opacity: 1 - neighborsGone,
      })),
    ]),
    spheres: visible([
      {
        key: "nucleus",
        spheres: [{ ...nucleus, radius }],
        role: "point",
        opacity: mix(OPACITY.nucleusGhost, 1, brighten),
      },
      ...shell.map((sphere, index) => {
        const departure = departures[index] ?? 0;
        return {
          key: `shell:${String(index)}`,
          spheres: [{ ...sphere, center: scale(sphere.center, 1 + departure * TRAVEL_MULTIPLIER) }],
          role: "shell" as const,
          opacity: mix(OPACITY.shellGhost, OPACITY.shell, brighten) * (1 - departure),
        };
      }),
    ]),
    polygons: [],
    lines: [],
    guides: [],
    camera: { ...cameraPose(8 + progress), zoom, focus: vec3(0, 0, 0) },
    readout: {
      name: shrink >= 1 ? "A point" : remaining === 0 ? "The spherepoint" : cellGone >= 1 ? "The twelve depart" : "Letting go",
      invitation: shrink >= 1
        ? "Where we began"
        : remaining === 0
          ? "One sphere, holding all of it"
          : cellGone >= 1 ? `${String(remaining)} of 12 still touching` : "Take the walls away and the spheres remain",
      detail: `radius ${radius.toFixed(3)} · every shape in this story was a consequence of this one`,
      measure: remaining === 0 ? `${String(Math.round((1 - shrink) * 100))}%` : `${String(remaining)} / 12`,
    },
  };
}

export const returnChapter: Chapter = {
  number: 9,
  id: "return",
  title: "The return",
  kicker: "Back to the point",
  screens: 6,
  beatStarts: [0, 0.4, 0.66, 0.84],
  beats: [
    {
      eyebrow: "Undo the walls",
      heading: "Take the cells away. The spheres were always there.",
      body: "The walls were a way of seeing fairness. Remove them and the twelve are still touching the one.",
    },
    {
      eyebrow: "Let the crowd go",
      heading: "One by one, the twelve leave.",
      body: "Everything they built, the cuboctahedron, the twins, the golden shell, the eighteen solids, the lattice, came from their touching.",
    },
    {
      eyebrow: "One sphere",
      heading: "The spherepoint is alone again, and it has lost nothing.",
      body: "All of that order was inside the idea of one round thing touching others like it.",
    },
    {
      eyebrow: "The point",
      heading: "And a sphere, turned back on itself, is a point.",
      body: "We are exactly where we started. Scroll up and it all unfolds again, the same way, every time.",
    },
  ],
  sample: sampleReturn,
};
