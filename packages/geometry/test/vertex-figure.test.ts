import { describe, expect, it } from "vitest";

import {
  distance,
  dot,
  edgeLengths,
  foldVertexFigure,
  orientVertexToTop,
  platonic,
  scalePolyhedron,
  subtract,
  translatePolyhedron,
  vec3,
  vertexNeighbors,
  type PlatonicName,
} from "../src/index.js";

const CLOSURES: readonly { name: PlatonicName; sides: number; count: number }[] = [
  { name: "tetrahedron", sides: 3, count: 3 },
  { name: "octahedron", sides: 3, count: 4 },
  { name: "icosahedron", sides: 3, count: 5 },
  { name: "cube", sides: 4, count: 3 },
  { name: "dodecahedron", sides: 5, count: 3 },
];

function polygonEdgeLengths(polygon: readonly { x: number; y: number; z: number }[]): number[] {
  return polygon.map((vertex, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (next === undefined) throw new Error("Polygon is empty");
    return distance(vertex, next);
  });
}

describe("vertex-figure fold", () => {
  it.each(CLOSURES)("keeps $count rigid $sides-gons regular throughout the fold", ({ sides, count }) => {
    for (let step = 0; step <= 20; step += 1) {
      const fold = foldVertexFigure({ sides, count }, step / 20);
      expect(fold.polygons).toHaveLength(count);
      for (const polygon of fold.polygons) {
        expect(polygon).toHaveLength(sides);
        expect(distance(polygon[0] ?? vec3(1, 1, 1), vec3(0, 0, 0))).toBeLessThan(1e-12);
        for (const edge of polygonEdgeLengths(polygon)) expect(edge).toBeCloseTo(1, 9);
      }
      // Adjacent polygons share their hinge edge exactly.
      for (let index = 0; index < count - 1; index += 1) {
        const current = fold.polygons[index];
        const next = fold.polygons[index + 1];
        const hinge = current?.[current.length - 1];
        const start = next?.[1];
        if (hinge === undefined || start === undefined) throw new Error("Missing polygon corners");
        expect(distance(hinge, start)).toBeLessThan(1e-9);
      }
    }
  });

  it.each(CLOSURES)("opens flat with the deficiency wedge and closes into the $name corner", ({ name, sides, count }) => {
    const flat = foldVertexFigure({ sides, count }, 0);
    expect(flat.coneAngle).toBeCloseTo(Math.PI / 2, 9);
    expect(flat.gapAngle).toBeCloseTo(flat.deficiency, 12);
    expect(flat.polygons.flat().every((vertex) => Math.abs(vertex.y) < 1e-9)).toBe(true);

    const closed = foldVertexFigure({ sides, count }, 1);
    expect(closed.closed).toBe(true);
    expect(closed.gapAngle).toBeCloseTo(0, 12);
    const last = closed.polygons[count - 1]?.[sides - 1];
    const first = closed.polygons[0]?.[1];
    if (last === undefined || first === undefined) throw new Error("Missing polygon corners");
    expect(distance(last, first)).toBeLessThan(1e-9);

    const solid = platonic(name);
    const edge = edgeLengths(solid)[0] ?? 1;
    const posed = orientVertexToTop(scalePolyhedron(solid, 1 / edge), 0);
    const apex = posed.vertices[0];
    if (apex === undefined) throw new Error("Missing apex");
    const cornered = translatePolyhedron(posed, vec3(-apex.x, -apex.y, -apex.z));
    expect(vertexNeighbors(solid, 0)).toHaveLength(count);
    for (const polygon of closed.polygons) {
      for (const vertex of polygon) {
        const nearest = Math.min(...cornered.vertices.map((candidate) => distance(candidate, vertex)));
        expect(nearest).toBeLessThan(1e-8);
      }
    }
  });

  it("never closes six triangles, four squares, or three hexagons", () => {
    for (const spec of [{ sides: 3, count: 6 }, { sides: 4, count: 4 }, { sides: 6, count: 3 }]) {
      const fold = foldVertexFigure(spec, 1);
      expect(fold.closes).toBe(false);
      expect(fold.deficiency).toBeCloseTo(0, 12);
      expect(fold.polygons.flat().every((vertex) => Math.abs(vertex.y) < 1e-9)).toBe(true);
    }
    expect(() => foldVertexFigure({ sides: 3, count: 7 }, 0)).toThrow(/overlap/);
  });

  it("is monotone: the corner rises as the wedge closes", () => {
    let previousHeight = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 10; step += 1) {
      const fold = foldVertexFigure({ sides: 3, count: 5 }, step / 10);
      const rim = fold.polygons[0]?.[1];
      if (rim === undefined) throw new Error("Missing rim vertex");
      expect(rim.y).toBeLessThanOrEqual(previousHeight + 1e-12);
      expect(dot(subtract(rim, vec3(0, 0, 0)), vec3(0, -1, 0))).toBeGreaterThanOrEqual(-1e-12);
      previousHeight = rim.y;
    }
  });
});
