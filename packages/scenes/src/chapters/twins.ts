import {
  alignSolids,
  convexHull,
  dual,
  edgeMidpoints,
  inradius,
  midradius,
  platonic,
  scalePolyhedron,
  transformPolyhedron,
  vec3,
  type Polyhedron,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type SceneFrame } from "../frame.js";
import { OPACITY, SHELL_RADIUS, cameraPose } from "../world.js";
import { firstShellPacking, shellHull } from "./twelve.js";

export interface TwinPair {
  readonly cube: Polyhedron;
  readonly octahedron: Polyhedron;
  /** Scale at which the octahedron's corners sit on the cube's face centers. */
  readonly birthScale: number;
}

let cachedPair: TwinPair | undefined;

/**
 * The cube whose edge midpoints are the twelve sphere centers, and its polar
 * twin scaled to the same midsphere so their edges bisect one another. The
 * cuboctahedron of centers is the part of space they share.
 */
export function twinPair(): TwinPair {
  if (cachedPair !== undefined) return cachedPair;
  const cuboctahedron = shellHull();
  const unitCube = platonic("cube");
  const sized = scalePolyhedron(unitCube, SHELL_RADIUS / midradius(unitCube));
  const midpointHull = convexHull(edgeMidpoints(sized), { symbol: "cube edge midpoints" });
  const cube = transformPolyhedron(sized, alignSolids(midpointHull, cuboctahedron));
  const octahedron = dual(cube, { symbol: "{3,4}" });
  const compound = scalePolyhedron(octahedron, midradius(cube) / midradius(octahedron));
  cachedPair = {
    cube,
    octahedron: compound,
    birthScale: inradius(cube) / compound.circumradius,
  };
  return cachedPair;
}

export function sampleTwins(progress: number): SceneFrame {
  const { cube, octahedron, birthScale } = twinPair();
  const packing = firstShellPacking();
  const cuboctahedron = shellHull();

  const cubeOpacity = Math.min(smooth(phase(progress, 0, 0.16)), 1 - smooth(phase(progress, 0.74, 0.9)));
  const octahedronOpacity = Math.min(smooth(phase(progress, 0.2, 0.3)), 1 - smooth(phase(progress, 0.74, 0.9)));
  const growth = smooth(phase(progress, 0.2, 0.52));
  const octahedronScale = mix(birthScale, 1, growth);
  const dimming = Math.min(smooth(phase(progress, 0.12, 0.3)), 1 - smooth(phase(progress, 0.84, 1)));
  const shellOpacity = mix(OPACITY.shell, OPACITY.shellGhost, dimming);
  const nucleusOpacity = mix(OPACITY.nucleus, OPACITY.nucleusGhost, dimming);
  const compound = growth >= 1 - 1e-9 && octahedronOpacity > 0;
  const headline = octahedronOpacity <= 0
    ? cubeOpacity > 0 ? "Cube" : "Cuboctahedron"
    : compound ? "Cube and octahedron" : "The twin is born";
  const featured = headline === "Cube" ? cube : headline === "Cuboctahedron" ? cuboctahedron : octahedron;

  return {
    chapter: 4,
    progress,
    solids: visible([
      solid("twelve:hull", cuboctahedron, { opacity: 1, role: "primary" }),
      solid("twins:cube", cube, { opacity: cubeOpacity, role: "secondary", showFaces: false }),
      solid("twins:octahedron", octahedron, {
        opacity: octahedronOpacity,
        role: "accent",
        scale: octahedronScale,
        showFaces: false,
        vertexOpacity: 1 - growth,
      }),
    ]),
    spheres: visible(packing.map((sphere, index) => ({
      key: sphere.shell === 0 ? "nucleus" : `shell:${String(index - 1)}`,
      spheres: [sphere],
      role: sphere.shell === 0 ? "point" as const : "shell" as const,
      opacity: sphere.shell === 0 ? nucleusOpacity : shellOpacity,
    }))),
    polygons: [],
    lines: [],
    guides: [],
    camera: { ...cameraPose(3 + progress), zoom: 1, focus: vec3(0, 0, 0) },
    readout: {
      name: headline,
      invitation: octahedronOpacity <= 0
        ? cubeOpacity > 0 ? "Its twelve edges pass through the twelve centers" : "Twelve centers, one shared core"
        : compound ? "Edge crosses edge exactly at the centers" : "Corners grow out of the cube's faces",
      detail: compound
        ? `cube ${String(cube.vertices.length)} corners ↔ octahedron ${String(octahedron.faces.length)} faces · shared midsphere ${midradius(cube).toFixed(3)}`
        : `octahedron scale ${octahedronScale.toFixed(3)} · corners on face centers at ${birthScale.toFixed(3)}`,
      measure: `${String(cube.vertices.length)} ↔ ${String(octahedron.faces.length)}`,
      counts: counts(featured),
    },
  };
}

export const twinsChapter: Chapter = {
  number: 4,
  id: "twins",
  title: "The inside-out twin",
  kicker: "Every solid has a twin",
  screens: 6,
  beats: [
    {
      eyebrow: "Look again",
      heading: "A cube was hiding around the twelve.",
      body: "Each sphere center sits exactly at the middle of one cube edge. The cuboctahedron is the cube with its corners sliced away.",
    },
    {
      eyebrow: "Corners become faces",
      heading: "Plant a point on every face and let it grow.",
      body: "Six faces give six points. Join them and an octahedron rises out of the cube: eight faces for the cube's eight corners.",
    },
    {
      eyebrow: "Twins",
      heading: "Grown to the right size, their edges cross at the sphere centers.",
      body: "Cube and octahedron are each other's inside-out twin. Corners trade places with faces, and edges meet edges. What they share is the cuboctahedron.",
    },
    {
      eyebrow: "Every solid",
      heading: "Do it twice and you are back where you started.",
      body: "The tetrahedron is its own twin. The icosahedron and dodecahedron are a pair. We will meet them next.",
    },
  ],
  sample: sampleTwins,
};
