import {
  add,
  latticeShells,
  packingContacts,
  scale,
  scalePolyhedron,
  translatePolyhedron,
  vec3,
  type LatticeShell,
  type Polyhedron,
  type Sphere,
  type Vec3,
} from "@order-in-space/geometry";

import type { Chapter } from "../chapter.js";
import { counts, mix, phase, smooth, solid, visible, type FrameLines, type SceneFrame } from "../frame.js";
import { tetrahedralCluster } from "../lattice-cluster.js";
import { ICOSAHEDRAL_RADIUS, OPACITY, SPHERE_RADIUS, cameraPose } from "../world.js";
import { generatorEndTetrahedron } from "./generator.js";

export const LATTICE_SHELLS = 3;
export const SHELL_OPACITY: readonly number[] = [OPACITY.nucleus, OPACITY.shell, 0.12, 0.08];
export const LATTICE_ZOOM = 0.42;

interface LatticeModel {
  readonly shells: readonly LatticeShell[];
  readonly spheres: readonly Sphere[];
  /** Contacts grouped by the outer shell of each touching pair. */
  readonly strutsByShell: readonly (readonly (readonly [Vec3, Vec3])[])[];
  readonly outerHull: Polyhedron;
}

let cachedModel: LatticeModel | undefined;

export function latticeModel(): LatticeModel {
  if (cachedModel !== undefined) return cachedModel;
  const shells = latticeShells(LATTICE_SHELLS, SPHERE_RADIUS);
  const spheres = shells.flatMap(({ spheres: shellSpheres }) => shellSpheres);
  const struts = Array.from({ length: LATTICE_SHELLS + 1 }, () => [] as (readonly [Vec3, Vec3])[]);
  for (const [left, right] of packingContacts(spheres)) {
    const a = spheres[left];
    const b = spheres[right];
    if (a === undefined || b === undefined) continue;
    struts[Math.max(a.shell, b.shell)]?.push([a.center, b.center]);
  }
  const outerHull = shells[LATTICE_SHELLS]?.hull;
  if (outerHull === undefined) throw new Error("Outer lattice shell has no hull");
  cachedModel = { shells, spheres, strutsByShell: struts, outerHull };
  return cachedModel;
}

const SHELL_REVEAL: readonly (readonly [number, number])[] = [
  [0.08, 0.3],
  [0.26, 0.42],
  [0.44, 0.62],
  [0.64, 0.82],
];

export function shellReveal(progress: number, shell: number): number {
  const window = SHELL_REVEAL[shell];
  if (window === undefined) return 0;
  return smooth(phase(progress, window[0], window[1]));
}

export function sampleLattice(progress: number): SceneFrame {
  const cluster = tetrahedralCluster();
  const model = latticeModel();
  const endTetrahedron = generatorEndTetrahedron();
  const clusterFit = cluster.tetrahedron.circumradius / ICOSAHEDRAL_RADIUS;

  const settle = smooth(phase(progress, 0, 0.22));
  const tetrahedronScale = mix(1, clusterFit, settle);
  const focusShift = smooth(phase(progress, 0.3, 0.5));
  const focus = scale(cluster.centroid, settle * (1 - focusShift));
  const tetrahedron = translatePolyhedron(scalePolyhedron(endTetrahedron, tetrahedronScale), scale(cluster.centroid, settle));
  const tetrahedronOpacity = 1 - smooth(phase(progress, 0.34, 0.5));
  const zoom = mix(mix(mix(1, 0.82, smooth(phase(progress, 0.24, 0.42))), 0.6, smooth(phase(progress, 0.44, 0.62))), LATTICE_ZOOM, smooth(phase(progress, 0.64, 0.84)));

  const clusterKeys = new Set(cluster.spheres.map(({ center }) => `${center.x.toFixed(6)}:${center.y.toFixed(6)}:${center.z.toFixed(6)}`));
  const spheres = model.spheres.map((sphere, index) => {
    const isCluster = clusterKeys.has(`${sphere.center.x.toFixed(6)}:${sphere.center.y.toFixed(6)}:${sphere.center.z.toFixed(6)}`);
    const reveal = isCluster ? shellReveal(progress, 0) : shellReveal(progress, sphere.shell);
    const opacity = (SHELL_OPACITY[sphere.shell] ?? 0.2) * reveal;
    return {
      key: `lattice:${String(index)}`,
      spheres: [sphere],
      role: sphere.shell === 0 ? "point" as const : "shell" as const,
      opacity,
    };
  });
  const lines: FrameLines[] = model.strutsByShell.map((segments, shell) => ({
    key: `struts:${String(shell)}`,
    segments,
    role: "strut",
    opacity: 0.8 * shellReveal(progress, shell) * (shell === 0 ? 0 : 1),
  }));
  const hullOpacity = smooth(phase(progress, 0.82, 0.92));
  const visibleCount = model.spheres.filter((sphere) => shellReveal(progress, sphere.shell) >= 1 - 1e-9).length;
  const shellCounts = model.shells.map(({ spheres: shellSpheres }) => shellSpheres.length);

  return {
    chapter: 7,
    progress,
    solids: visible([
      solid("lattice:tetrahedron", tetrahedron, { opacity: tetrahedronOpacity, role: "primary" }),
      solid("lattice:outer-hull", model.outerHull, { opacity: hullOpacity, role: "primary", showFaces: false }),
    ]),
    spheres: visible(spheres),
    polygons: [],
    lines: visible(lines),
    guides: [],
    camera: { ...cameraPose(6 + progress), zoom, focus },
    readout: {
      name: hullOpacity > 0 ? "The lattice" : settle >= 1 ? `${String(visibleCount)} spherepoints` : "Four spherepoints",
      invitation: hullOpacity > 0
        ? "Twelve around one, at every scale"
        : settle >= 1 ? "Every sphere touches twelve others" : "The tetrahedron is four spheres touching",
      detail: `shells ${shellCounts.join(" + ")} = ${String(shellCounts.reduce((sum, value) => sum + value, 0))} · 10n² + 2 on shell n`,
      measure: `${String(visibleCount)} spheres`,
      ...(hullOpacity > 0 ? { counts: counts(model.outerHull) } : tetrahedronOpacity > 0 ? { counts: counts(tetrahedron) } : {}),
    },
  };
}

export function latticeFinalSpheres(): readonly { readonly sphere: Sphere; readonly opacity: number }[] {
  return latticeModel().spheres.map((sphere) => ({ sphere, opacity: SHELL_OPACITY[sphere.shell] ?? 0.2 }));
}

export function clusterOffset(): Vec3 {
  return add(vec3(0, 0, 0), tetrahedralCluster().centroid);
}

export const latticeChapter: Chapter = {
  number: 7,
  id: "lattice",
  title: "The lattice",
  kicker: "Order without end",
  screens: 7,
  beatStarts: [0, 0.24, 0.5, 0.82],
  beats: [
    {
      eyebrow: "The smallest crowd",
      heading: "The tetrahedron is four spherepoints touching.",
      body: "Three on the ground, one resting in the hollow between them. It is the tightest cluster spheres can make.",
    },
    {
      eyebrow: "Every sphere is a center",
      heading: "Around any one of them, twelve more gather.",
      body: "The tetrahedron was a corner of the same twelve-around-one shell. Every touch becomes a strut; the struts are tetrahedra and octahedra, and nothing else.",
    },
    {
      eyebrow: "Shell after shell",
      heading: "12, then 42, then 92.",
      body: "Each new shell is a bigger cuboctahedron: ten times the shell number squared, plus two. The order never runs out.",
    },
    {
      eyebrow: "A lattice",
      heading: "This is how crystals grow and how cannonballs stack.",
      body: "Copper, gold, and aluminium pack their atoms exactly like this. The same twelve-around-one, repeated without end.",
    },
  ],
  sample: sampleLattice,
};
