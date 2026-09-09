import { vec3 } from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { mix, phase, smooth, visible, type SceneFrame } from "../frame.js";
import { OPACITY, POINT_RADIUS, SPHERE_RADIUS, cameraPose } from "../world.js";

export const CLOSE_ZOOM = 1.9;

export function pointRadiusAt(progress: number): number {
  return mix(POINT_RADIUS, SPHERE_RADIUS, smooth(phase(progress, 0, 0.45)));
}

export function sampleSpherepoint(progress: number): SceneFrame {
  const radius = pointRadiusAt(progress);
  const guideOpacity = OPACITY.guide * smooth(phase(progress, 0.3, 0.62));
  const zoom = mix(1, CLOSE_ZOOM, smooth(phase(progress, 0.5, 1)));
  const grown = radius >= SPHERE_RADIUS - 1e-9;
  return {
    chapter: 1,
    progress,
    solids: [],
    spheres: [{
      key: "spherepoint",
      spheres: [{ center: vec3(0, 0, 0), radius, shell: 0 }],
      role: "point",
      opacity: 1,
    }],
    polygons: [],
    lines: [],
    guides: visible([{ key: "master", radius: SPHERE_RADIUS, opacity: guideOpacity }]),
    camera: { ...cameraPose(progress), zoom, focus: vec3(0, 0, 0) },
    readout: {
      name: grown ? "The spherepoint" : "A point",
      invitation: grown ? "Turned every way, a point becomes a sphere" : "Begin with one point",
      detail: `radius ${radius.toFixed(3)} · the most economical form`,
      measure: `${String(Math.round((radius / SPHERE_RADIUS) * 100))}% grown`,
    },
  };
}

export const spherepointChapter: Chapter = {
  number: 1,
  id: "spherepoint",
  title: "The spherepoint",
  kicker: "Begin with a point",
  screens: 3,
  beats: [
    {
      eyebrow: "First, a point.",
      heading: "Everything here starts with one point.",
      body: "Treat it as real. Something you could hold, move, and look at from every side.",
    },
    {
      eyebrow: "Turn it every way",
      heading: "A point turned in every direction traces a sphere.",
      body: "No shape is more even-handed. It has no corners, no favorite direction, and the least surface for what it holds.",
    },
    {
      eyebrow: "The spherepoint",
      heading: "So our point will wear a sphere.",
      body: "Every shape in this story is built from spheres like this one: touching, gathering, and sharing space.",
    },
  ],
  sample: sampleSpherepoint,
};
