import {
  PHI,
  angularDeficiency,
  distance,
  edgeLengthSpread,
  length,
  packingContacts,
  vertexSetDistance,
} from "@order-in-space/geometry";
import { describe, expect, it } from "vitest";

import {
  CLOSURE_EPISODES,
  GENERATOR_SEGMENTS,
  GENERATOR_WAYPOINTS,
  ICOSAHEDRAL_RADIUS,
  POINT_RADIUS,
  ROOMS,
  SPHERE_RADIUS,
  generatorEndTetrahedron,
  generatorSolid,
  sampleCell,
  sampleClosing,
  sampleGenerator,
  sampleGeneratorPath,
  sampleGolden,
  sampleLattice,
  sampleReturn,
  sampleSpherepoint,
  sampleTwelve,
  sampleTwins,
  storyIcosahedron,
  tetrahedralCluster,
  twinPair,
} from "../src/index.js";

describe("Scene 1 · the spherepoint", () => {
  it("grows one point into the story's sphere and comes closer", () => {
    const start = sampleSpherepoint(0);
    const end = sampleSpherepoint(1);
    expect(start.spheres[0]?.spheres[0]?.radius).toBe(POINT_RADIUS);
    expect(end.spheres[0]?.spheres[0]?.radius).toBe(SPHERE_RADIUS);
    expect(end.camera.zoom).toBeGreaterThan(start.camera.zoom);
  });
});

describe("Scene 2 · closing space", () => {
  it("folds each regular corner shut and finishes on the bare sphere", () => {
    CLOSURE_EPISODES.forEach((episode, index) => {
      const local = (index + 0.4) / CLOSURE_EPISODES.length;
      const frame = sampleClosing(local);
      expect(frame.polygons[0]?.polygons).toHaveLength(episode.count);
      const closedFrame = sampleClosing((index + 0.6) / CLOSURE_EPISODES.length);
      if (episode.solid !== undefined) {
        expect(closedFrame.solids).toHaveLength(1);
        expect(closedFrame.readout.counts?.vertices).toBeGreaterThan(0);
        const solid = closedFrame.solids[0]?.polyhedron;
        if (solid === undefined) throw new Error("Missing solid");
        expect(angularDeficiency(solid).total).toBeCloseTo(4 * Math.PI, 9);
        // The folded corner coincides with the solid's top corner.
        const fold = closedFrame.polygons[0]?.polygons.flat() ?? [];
        for (const vertex of fold) {
          expect(Math.min(...solid.vertices.map((candidate) => distance(candidate, vertex)))).toBeLessThan(1e-7);
        }
      } else {
        expect(closedFrame.solids).toHaveLength(0);
        expect(closedFrame.readout.detail).toMatch(/never closes/u);
      }
    });
    const end = sampleClosing(1);
    expect(end.solids).toHaveLength(0);
    expect(end.polygons).toHaveLength(0);
  });
});

describe("Scene 3 · twelve around one", () => {
  it("brings twelve spheres to contact without overlap and hulls them", () => {
    const frame = sampleTwelve(1);
    const centers = frame.spheres.flatMap(({ spheres }) => spheres);
    expect(centers).toHaveLength(13);
    expect(packingContacts(centers)).toHaveLength(36);
    expect(frame.readout.counts).toEqual({ vertices: 12, edges: 24, faces: 14 });
    const midway = sampleTwelve(0.3);
    const arrivingCenters = midway.spheres.flatMap(({ spheres }) => spheres).filter(({ shell }) => shell === 1);
    expect(arrivingCenters.length).toBeLessThan(12);
    expect(arrivingCenters.every((sphere) => length(sphere.center) >= 2 * SPHERE_RADIUS - 1e-9)).toBe(true);
  });
});

describe("Scene 4 · the inside-out twin", () => {
  it("derives a cube whose edge midpoints are the sphere centers and a compound octahedron", () => {
    const { cube, octahedron, birthScale } = twinPair();
    const cuboctahedron = sampleTwins(0).solids[0]?.polyhedron;
    if (cuboctahedron === undefined) throw new Error("Missing cuboctahedron");
    const midpoints = cube.edges.map(([a, b]) => {
      const start = cube.vertices[a];
      const end = cube.vertices[b];
      if (start === undefined || end === undefined) throw new Error("Missing vertex");
      return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 };
    });
    for (const midpoint of midpoints) {
      expect(Math.min(...cuboctahedron.vertices.map((vertex) => distance(vertex, midpoint)))).toBeLessThan(1e-8);
    }
    const octahedronMidpoints = octahedron.edges.map(([a, b]) => {
      const start = octahedron.vertices[a];
      const end = octahedron.vertices[b];
      if (start === undefined || end === undefined) throw new Error("Missing vertex");
      return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 };
    });
    for (const midpoint of octahedronMidpoints) {
      expect(Math.min(...cuboctahedron.vertices.map((vertex) => distance(vertex, midpoint)))).toBeLessThan(1e-8);
    }
    expect(cube.vertices).toHaveLength(octahedron.faces.length);
    expect(cube.faces).toHaveLength(octahedron.vertices.length);
    expect(birthScale).toBeCloseTo(0.5, 9);
  });

  it("begins and ends in the twelve-around-one state", () => {
    expect(sampleTwins(0).solids).toHaveLength(1);
    expect(sampleTwins(1).solids).toHaveLength(1);
    expect(sampleTwins(0.6).solids).toHaveLength(3);
  });
});

describe("Scene 5 · the golden tightening", () => {
  it("tightens to the icosahedron and draws three golden rectangles", () => {
    const frame = sampleGolden(0.75);
    expect(frame.readout.counts).toEqual({ vertices: 12, edges: 30, faces: 20 });
    const segments = frame.lines[0]?.segments ?? [];
    expect(segments).toHaveLength(12);
    const lengths = segments.map(([a, b]) => distance(a, b)).sort((x, y) => x - y);
    expect((lengths[11] ?? 0) / (lengths[0] ?? 1)).toBeCloseTo(PHI, 9);
    const icosahedron = storyIcosahedron();
    expect(edgeLengthSpread(icosahedron)).toBeLessThan(1e-9);
    expect(icosahedron.circumradius).toBeCloseTo(ICOSAHEDRAL_RADIUS, 9);
  });
});

describe("Scene 6 · move one point", () => {
  it("passes exactly through every named waypoint", () => {
    for (const segment of GENERATOR_SEGMENTS) {
      const atStart = sampleGeneratorPath(segment.start);
      expect(atStart.nearestWaypoint.name).toBe(segment.from.name);
      atStart.distances.forEach((value, index) => {
        expect(value).toBeCloseTo(segment.from.distances[index] ?? Number.NaN, 9);
      });
    }
    const end = sampleGeneratorPath(1);
    expect(end.nearestWaypoint.name).toBe("Tetrahedron");
    expect(GENERATOR_WAYPOINTS.filter(({ orbit }) => orbit === "chiral")).toHaveLength(4);
  });

  it("visits all eighteen named solids with the expected topology", () => {
    const expected = new Map<string, readonly [number, number, number]>([
      ["{3,5}", [12, 30, 20]], ["t{3,5}", [60, 90, 32]], ["r{5,3}", [30, 60, 32]], ["t{5,3}", [60, 90, 32]],
      ["{5,3}", [20, 30, 12]], ["rr{5,3}", [60, 120, 62]], ["tr{5,3}", [120, 180, 62]], ["s{5,3}", [60, 150, 92]],
      ["s{4,3}", [24, 60, 38]], ["tr{4,3}", [48, 72, 26]], ["rr{4,3}", [24, 48, 26]], ["{4,3}", [8, 12, 6]],
      ["t{4,3}", [24, 36, 14]], ["r{4,3}", [12, 24, 14]], ["t{3,4}", [24, 36, 14]], ["{3,4}", [6, 12, 8]],
      ["t{3,3}", [12, 18, 8]], ["{3,3}", [4, 6, 4]],
    ]);
    const seen = new Set<string>();
    for (const waypoint of GENERATOR_WAYPOINTS) {
      const topology = expected.get(waypoint.symbol);
      if (topology === undefined) continue;
      const solid = generatorSolid(ROOMS[waypoint.room], waypoint.distances, waypoint.orbit, waypoint.symbol);
      expect([solid.vertices.length, solid.edges.length, solid.faces.length], waypoint.symbol).toEqual(topology);
      expect(edgeLengthSpread(solid), waypoint.symbol).toBeLessThan(1e-7);
      expect(solid.circumradius).toBeCloseTo(ICOSAHEDRAL_RADIUS, 9);
      seen.add(waypoint.symbol);
    }
    expect(seen.size).toBe(18);
  });

  it("changes topology only at declared boundaries", () => {
    for (const segment of GENERATOR_SEGMENTS.filter(({ kind }) => kind === "slide")) {
      const interior = [0.1, 0.35, 0.5, 0.65, 0.9].map((amount) => {
        const frame = sampleGenerator(segment.start + (segment.end - segment.start) * amount);
        const solid = frame.solids[0]?.polyhedron;
        if (solid === undefined) throw new Error("Missing solid");
        return `${String(solid.vertices.length)}/${String(solid.edges.length)}/${String(solid.faces.length)}`;
      });
      expect(new Set(interior).size, `${segment.from.name} → ${segment.to.name}`).toBe(1);
    }
  });

  it("aligns the icosahedral room to Scene 5 and the rooms to each other", () => {
    const first = sampleGenerator(0).solids[0]?.polyhedron;
    if (first === undefined) throw new Error("Missing icosahedron");
    expect(vertexSetDistance(first, storyIcosahedron())).toBeLessThan(1e-8);
    const octahedral = generatorSolid(ROOMS.octahedral, [0, 0, 1], "full", "{3,4}");
    const tetrahedral = generatorSolid(ROOMS.tetrahedral, [0, 1, 0], "full", "{3,4}");
    expect(vertexSetDistance(octahedral, tetrahedral)).toBeLessThan(1e-8);
    const cluster = tetrahedralCluster();
    const scaledCluster = {
      ...cluster.tetrahedron,
      vertices: cluster.tetrahedron.vertices.map((vertex) => ({
        x: (vertex.x * ICOSAHEDRAL_RADIUS) / cluster.tetrahedron.circumradius,
        y: (vertex.y * ICOSAHEDRAL_RADIUS) / cluster.tetrahedron.circumradius,
        z: (vertex.z * ICOSAHEDRAL_RADIUS) / cluster.tetrahedron.circumradius,
      })),
    };
    expect(vertexSetDistance(generatorEndTetrahedron(), scaledCluster)).toBeLessThan(1e-8);
  });
});

describe("Scene 7 · the lattice", () => {
  it("grows shell by shell to 147 spheres and a threefold cuboctahedron", () => {
    const frame = sampleLattice(1);
    const spheres = frame.spheres.flatMap(({ spheres: entry }) => entry);
    expect(spheres).toHaveLength(147);
    expect(frame.readout.counts).toEqual({ vertices: 12, edges: 24, faces: 14 });
    expect(frame.readout.detail).toContain("1 + 12 + 42 + 92 = 147");
    const start = sampleLattice(0);
    expect(start.solids[0]?.polyhedron.vertices).toHaveLength(4);
    expect(start.spheres).toHaveLength(0);
  });
});

describe("Scene 8 · the space cell", () => {
  it("closes twelve walls into the cell and fits twelve neighbors", () => {
    const walls = sampleCell(0.5);
    expect(walls.polygons).toHaveLength(12);
    const end = sampleCell(1);
    expect(end.solids).toHaveLength(13);
    expect(end.readout.counts).toEqual({ vertices: 14, edges: 24, faces: 12 });
  });
});

describe("Scene 9 · the return", () => {
  it("sends the twelve away and shrinks the last sphere to a point", () => {
    const middle = sampleReturn(0.6);
    expect(middle.solids).toHaveLength(0);
    const end = sampleReturn(1);
    expect(end.spheres).toHaveLength(1);
    expect(end.spheres[0]?.spheres[0]?.radius).toBe(POINT_RADIUS);
    expect(end.camera.zoom).toBe(1);
  });
});
