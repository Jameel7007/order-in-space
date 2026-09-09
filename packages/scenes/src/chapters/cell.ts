import {
  dot,
  faceNormal,
  normalize,
  spaceFillingCells,
  vec3,
  volume,
  type Polyhedron,
  type Vec3,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type FrameSolid, type SceneFrame } from "../frame.js";
import { OPACITY, SPHERE_RADIUS, cameraPose } from "../world.js";
import { LATTICE_ZOOM, SHELL_OPACITY, latticeModel, shellReveal } from "./lattice.js";

export const CELL_ZOOM = 0.55;

interface CellModel {
  readonly cell: Polyhedron;
  readonly neighbors: readonly { readonly offset: Vec3; readonly cell: Polyhedron }[];
  /** Cell faces ordered to match the neighbor that generated each wall. */
  readonly walls: readonly (readonly Vec3[])[];
  readonly volume: number;
}

let cachedModel: CellModel | undefined;

export function cellModel(): CellModel {
  if (cachedModel !== undefined) return cachedModel;
  const { cell, neighbors } = spaceFillingCells(SPHERE_RADIUS);
  const walls = neighbors.map(({ offset }) => {
    const direction = normalize(offset);
    const faceIndex = cell.faces.findIndex((_, index) => dot(normalize(faceNormal(cell, index)), direction) > 1 - 1e-9);
    const face = cell.faces[faceIndex];
    if (face === undefined) throw new Error("A neighbor has no matching cell wall");
    return face.map((vertexIndex) => {
      const vertex = cell.vertices[vertexIndex];
      if (vertex === undefined) throw new Error("Wall references a missing vertex");
      return vertex;
    });
  });
  cachedModel = { cell, neighbors, walls, volume: volume(cell) };
  return cachedModel;
}

export function sampleCell(progress: number): SceneFrame {
  const lattice = latticeModel();
  const model = cellModel();
  const outerFade = smooth(phase(progress, 0, 0.22));
  const zoom = mix(mix(LATTICE_ZOOM, 0.8, outerFade), CELL_ZOOM, smooth(phase(progress, 0.66, 0.9)));
  const innerDim = smooth(phase(progress, 0.5, 0.7));
  const strutFade = smooth(phase(progress, 0.4, 0.55));
  const cellOpacity = smooth(phase(progress, 0.5, 0.62));
  const wallFade = smooth(phase(progress, 0.56, 0.66));

  const spheres = lattice.spheres.map((sphere, index) => {
    const base = (SHELL_OPACITY[sphere.shell] ?? 0.2) * shellReveal(1, sphere.shell);
    const inner = sphere.shell <= 1;
    const opacity = inner
      ? mix(base, sphere.shell === 0 ? OPACITY.nucleusGhost : OPACITY.shellGhost, innerDim)
      : base * (1 - outerFade);
    return {
      key: `lattice:${String(index)}`,
      spheres: [sphere],
      role: sphere.shell === 0 ? "point" as const : "shell" as const,
      opacity,
    };
  });
  const lines = lattice.strutsByShell.map((segments, shell) => ({
    key: `struts:${String(shell)}`,
    segments,
    role: "strut" as const,
    opacity: shell === 0 ? 0 : 0.55 * (shell <= 1 ? 1 - strutFade : 1 - outerFade),
  }));
  const walls = model.walls.map((polygon, index) => ({
    key: `wall:${String(index)}`,
    polygons: [polygon],
    role: "wall" as const,
    opacity: smooth(phase(progress, 0.22 + index * 0.02, 0.28 + index * 0.02)) * (1 - wallFade),
  }));
  const wallsShown = walls.filter(({ opacity }) => opacity > 0).length;
  const neighborSolids: FrameSolid[] = model.neighbors.map(({ cell }, index) => solid(`cell:neighbor:${String(index)}`, cell, {
    role: "secondary",
    opacity: smooth(phase(progress, 0.66 + index * 0.015, 0.72 + index * 0.015)),
    showFaces: true,
  }));
  const neighborsShown = neighborSolids.filter(({ opacity }) => opacity >= 1 - 1e-9).length;

  return {
    chapter: 8,
    progress,
    solids: visible([
      solid("lattice:outer-hull", lattice.outerHull, { opacity: 1 - outerFade, role: "primary", showFaces: false }),
      solid("cell:nucleus", model.cell, { opacity: cellOpacity, role: "primary" }),
      ...neighborSolids,
    ]),
    spheres: visible(spheres),
    polygons: visible(walls),
    lines: visible(lines),
    guides: [],
    camera: { ...cameraPose(7 + progress), zoom, focus: vec3(0, 0, 0) },
    readout: {
      name: neighborsShown > 0 ? "Space, filled" : cellOpacity > 0 ? "Rhombic dodecahedron" : wallsShown > 0 ? "Fair walls" : "One sphere among twelve",
      invitation: neighborsShown > 0
        ? `${String(neighborsShown)} of 12 neighbors fitted, no gaps`
        : cellOpacity > 0
          ? "Twelve diamond faces, one for each neighbor"
          : wallsShown > 0
            ? `${String(wallsShown)} of 12 walls, each halfway to a neighbor`
            : "How much space is its fair share?",
      detail: `cell volume ${model.volume.toFixed(3)} · 14 corners · 24 edges · 12 rhombi · two corner radii ${Math.sqrt(1.5).toFixed(3)}R and ${Math.SQRT2.toFixed(3)}R`,
      measure: neighborsShown > 0 ? `${String(neighborsShown + 1)} cells` : `${String(wallsShown)} / 12 walls`,
      counts: counts(model.cell),
    },
  };
}

export const cellChapter: Chapter = {
  number: 8,
  id: "cell",
  title: "The space cell",
  kicker: "Every sphere's fair share",
  screens: 7,
  beats: [
    {
      eyebrow: "Back to one",
      heading: "Give every sphere the space that is closest to it.",
      body: "Between our sphere and each neighbor, draw a wall exactly halfway. Twelve neighbors, twelve walls.",
    },
    {
      eyebrow: "The walls meet",
      heading: "The walls close into a cell with twelve diamond faces.",
      body: "The rhombic dodecahedron. Nobody chose its shape. It is what is left when twelve fair walls meet.",
    },
    {
      eyebrow: "No gaps",
      heading: "Every neighbor has an identical cell, and they fit together perfectly.",
      body: "Face to face, with nothing left over. This is the cell honeybees would build if they worked in every direction at once.",
    },
    {
      eyebrow: "Order in space",
      heading: "Spheres cannot fill space. Their fair shares can.",
      body: "That is the whole trick. Round things touching, and the straight-edged order that their touching implies.",
    },
  ],
  sample: sampleCell,
};
