import type { Polyhedron } from "@order-in-space/geometry";
import {
  PolygonSheet,
  PolyhedronDrawing,
  SegmentDrawing,
  SphereDrawing,
  createCircumsphereGuide,
  disposeObject,
} from "@order-in-space/render";
import type {
  FrameLines,
  FramePolygons,
  FrameSolid,
  FrameSpheres,
  LineRole,
  PolygonRole,
  SceneFrame,
  SolidRole,
  SphereRole,
} from "@order-in-space/scenes";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Line,
  Material,
  Mesh,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Object3D,
} from "three";

interface SolidStyle {
  readonly edgeColor: number;
  readonly edgeRadius: (polyhedron: Polyhedron) => number;
  readonly faceColor: number;
  readonly faceOpacity: number;
}

const SOLID_STYLES: Readonly<Record<SolidRole, SolidStyle>> = {
  primary: {
    edgeColor: 0x25231f,
    edgeRadius: (polyhedron) => Math.max(0.008, 0.022 - polyhedron.edges.length * 0.000055),
    faceColor: 0xcab499,
    faceOpacity: 0.13,
  },
  secondary: {
    edgeColor: 0x9a4e32,
    edgeRadius: () => 0.0105,
    faceColor: 0xc2a98c,
    faceOpacity: 0.08,
  },
  ghost: {
    edgeColor: 0x8f8a80,
    edgeRadius: () => 0.0075,
    faceColor: 0xc2a98c,
    faceOpacity: 0.04,
  },
  accent: {
    edgeColor: 0x4b5f70,
    edgeRadius: () => 0.012,
    faceColor: 0xb7c0c8,
    faceOpacity: 0.08,
  },
};

const SPHERE_COLORS: Readonly<Record<SphereRole, number>> = {
  point: 0x9a4e32,
  shell: 0xa7957d,
};

// Sheet outlines share the solids' graphite so a folded corner becomes the
// finished corner with no color change; only the fills differ.
// The fold outline matches a small solid's edge radius so the closed corner
// and the solid's corner are the same cylinders.
const POLYGON_STYLES: Readonly<Record<PolygonRole, { edgeColor: number; faceColor: number; faceOpacity: number; edgeRadius: number }>> = {
  fold: { edgeColor: 0x25231f, faceColor: 0xd6b48f, faceOpacity: 0.34, edgeRadius: 0.0213 },
  wall: { edgeColor: 0x25231f, faceColor: 0xc9a98a, faceOpacity: 0.26, edgeRadius: 0.008 },
};

const LINE_STYLES: Readonly<Record<LineRole, { color: number; radius: number }>> = {
  strut: { color: 0x7d766b, radius: 0.007 },
  rectangle: { color: 0x9a4e32, radius: 0.012 },
  trace: { color: 0x8a8378, radius: 0.006 },
};

/** Draw order among translucent objects, so sorting never flips frame to frame. */
const RENDER_ORDER = { guide: -2, spheres: -1, solid: 0, polygons: 1, lines: 2 } as const;

type Drawing = PolyhedronDrawing | SphereDrawing | PolygonSheet | SegmentDrawing | { group: Group; dispose(): void };

interface StageEntry {
  readonly drawing: Drawing;
  /** Identity of the geometry currently uploaded for this slot. */
  key: string;
  /** Identity of the style; a change here needs a fresh drawing. */
  readonly styleKey: string;
}

type DepthMode = "always" | "never" | "auto";

/**
 * Edges and struts always write depth: a thin translucent cylinder that
 * suddenly starts occluding at half opacity reads as a pop. Fills and
 * sheets never write depth; spheres decide by opacity.
 */
function setMaterialOpacity(object: Object3D | undefined, opacity: number, base = 1, depth: DepthMode = "auto"): void {
  if (object === undefined) return;
  object.traverse((child) => {
    if (!(child instanceof Mesh) && !(child instanceof Line)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials as Material[]) {
      const value = Math.max(0, Math.min(1, opacity * base));
      material.opacity = value;
      const transparent = value < 0.999;
      if (material.transparent !== transparent) {
        // three.js compiles opacity handling into the shader, so crossing the
        // opaque/translucent boundary needs a recompile; it happens rarely.
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = depth === "always" ? true : depth === "never" ? false : value >= 0.5;
    }
  });
  object.visible = opacity > 1e-4;
}

function setRenderOrder(object: Object3D, order: number): void {
  object.traverse((child) => {
    child.renderOrder = order;
  });
}

function round4(value: number): string {
  return value.toFixed(4);
}

function vertexKey(polyhedron: Polyhedron): string {
  let sum = 0;
  let weighted = 0;
  polyhedron.vertices.forEach((vertex, index) => {
    sum += vertex.x + vertex.y + vertex.z;
    weighted += (index + 1) * (vertex.x * 0.7 + vertex.y * 1.3 + vertex.z * 1.9);
  });
  return `${String(polyhedron.vertices.length)}:${String(polyhedron.edges.length)}:${round4(sum)}:${round4(weighted)}`;
}

function spheresKey(entry: FrameSpheres): string {
  return entry.spheres.map((sphere) => (
    `${round4(sphere.center.x)},${round4(sphere.center.y)},${round4(sphere.center.z)},${round4(sphere.radius)}`
  )).join(";");
}

function polygonsKey(entry: FramePolygons): string {
  return entry.polygons.map((polygon) => polygon.map((corner) => (
    `${round4(corner.x)},${round4(corner.y)},${round4(corner.z)}`
  )).join(";")).join("/");
}

function linesKey(entry: FrameLines): string {
  let sum = 0;
  entry.segments.forEach(([a, b], index) => {
    sum += (index + 1) * (a.x + a.y * 1.3 + a.z * 1.7 + b.x * 0.7 + b.y * 1.1 + b.z * 1.9);
  });
  return `${String(entry.segments.length)}:${round4(sum)}`;
}

/**
 * Draws scene frames. Each frame element owns a slot; the drawing in a slot
 * keeps its materials for the life of the slot and only re-uploads geometry
 * when the element's geometry key changes. Opacity, scale, and visibility
 * are updated in place every frame.
 */
export class StoryStage {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly stage = new Group();
  private readonly world = new Group();
  // Depth range hugs the content (all of it lies within 4.5 units of the
  // origin) so mobile 16-bit depth buffers still separate coincident planes.
  private readonly camera = new OrthographicCamera(-2, 2, 2, -2, 5, 15);
  private readonly entries = new Map<string, StageEntry>();
  private frustumHeight = 4.35;
  private horizontalShift = 0;
  private verticalShift = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.setClearColor(0xf1eee5, 0);
    // Phones pay for every pixel of a full-screen canvas; 1.5× is still crisp.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth <= 680 ? 1.5 : 2));

    this.scene.background = new Color(0xf1eee5);
    this.stage.add(this.world);
    this.scene.add(this.stage);
    this.scene.add(new AmbientLight(0xfffbef, 2.1));
    const key = new DirectionalLight(0xffeed5, 3.4);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new DirectionalLight(0x94a7ba, 0.72);
    fill.position.set(-4, -2, -3);
    this.scene.add(fill);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
  }

  setComposition(options: { frustumHeight: number; horizontalShift: number; verticalShift: number }): void {
    this.frustumHeight = options.frustumHeight;
    this.horizontalShift = options.horizontalShift;
    this.verticalShift = options.verticalShift;
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const aspect = width / height;
    this.camera.left = (-this.frustumHeight * aspect) / 2;
    this.camera.right = (this.frustumHeight * aspect) / 2;
    this.camera.top = this.frustumHeight / 2 + this.verticalShift;
    this.camera.bottom = -this.frustumHeight / 2 + this.verticalShift;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.stage.position.x = this.horizontalShift;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      this.world.remove(entry.drawing.group);
      entry.drawing.dispose();
    }
    this.entries.clear();
    this.renderer.dispose();
  }

  draw(frame: SceneFrame): void {
    const live = new Set<string>();
    for (const entry of frame.solids) live.add(this.drawSolid(entry));
    for (const entry of frame.spheres) live.add(this.drawSpheres(entry));
    for (const entry of frame.polygons) live.add(this.drawPolygons(entry));
    for (const entry of frame.lines) live.add(this.drawLines(entry));
    for (const entry of frame.guides) live.add(this.drawGuide(entry.key, entry.radius, entry.opacity));

    for (const [slot, entry] of this.entries) {
      if (live.has(slot)) continue;
      this.world.remove(entry.drawing.group);
      entry.drawing.dispose();
      this.entries.delete(slot);
    }

    this.stage.rotation.set(frame.camera.pitch, frame.camera.yaw, 0);
    this.world.position.set(-frame.camera.focus.x, -frame.camera.focus.y, -frame.camera.focus.z);
    this.camera.zoom = frame.camera.zoom;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  /**
   * Fetch the drawing for a slot, creating it when the slot is new or its
   * style changed, and re-uploading geometry when only the key changed.
   */
  private slotDrawing<T extends Drawing>(
    slot: string,
    key: string,
    styleKey: string,
    order: number,
    create: () => T,
    update: (drawing: T) => void,
  ): T {
    const existing = this.entries.get(slot);
    if (existing !== undefined && existing.styleKey === styleKey) {
      if (existing.key !== key) {
        update(existing.drawing as T);
        existing.key = key;
      }
      return existing.drawing as T;
    }
    if (existing !== undefined) {
      this.world.remove(existing.drawing.group);
      existing.drawing.dispose();
    }
    const drawing = create();
    setRenderOrder(drawing.group, order);
    this.world.add(drawing.group);
    this.entries.set(slot, { drawing, key, styleKey });
    return drawing;
  }

  private drawSolid(entry: FrameSolid): string {
    const slot = `solid:${entry.slot}`;
    const style = SOLID_STYLES[entry.role];
    const styleKey = `${entry.role}|${entry.showFaces ? "f" : ""}${entry.vertexOpacity > 0 || entry.slot !== entry.key ? "v" : ""}|${round4(style.edgeRadius(entry.polyhedron))}`;
    const drawing = this.slotDrawing(
      slot,
      `${entry.key}|${vertexKey(entry.polyhedron)}`,
      styleKey,
      RENDER_ORDER.solid,
      () => new PolyhedronDrawing(entry.polyhedron, {
        edgeColor: style.edgeColor,
        edgeRadius: style.edgeRadius(entry.polyhedron),
        faceColor: style.faceColor,
        faceOpacity: style.faceOpacity,
        showFaces: entry.showFaces,
        showVertices: true,
        vertexColor: 0x9a4e32,
        vertexRadius: 0.026,
      }),
      (existing) => existing.update(entry.polyhedron),
    );
    const object = drawing.group;
    object.scale.setScalar(entry.scale);
    object.visible = entry.opacity > 1e-4;
    setMaterialOpacity(object.getObjectByName("polyhedron edges"), entry.showEdges ? entry.opacity : 0, 1, "always");
    setMaterialOpacity(object.getObjectByName("supporting faces"), entry.opacity, style.faceOpacity, "never");
    setMaterialOpacity(object.getObjectByName("polyhedron vertices"), entry.opacity * entry.vertexOpacity, 1, "always");
    return slot;
  }

  private drawSpheres(entry: FrameSpheres): string {
    const slot = `spheres:${entry.key}`;
    const drawing = this.slotDrawing(
      slot,
      spheresKey(entry),
      entry.role,
      RENDER_ORDER.spheres,
      () => new SphereDrawing(entry.spheres, {
        color: SPHERE_COLORS[entry.role],
        opacity: 1,
        widthSegments: entry.role === "point" ? 40 : 26,
        heightSegments: entry.role === "point" ? 28 : 18,
      }),
      (existing) => existing.update(entry.spheres),
    );
    setMaterialOpacity(drawing.group, entry.opacity);
    return slot;
  }

  private drawPolygons(entry: FramePolygons): string {
    const slot = `polygons:${entry.key}`;
    const style = POLYGON_STYLES[entry.role];
    const drawing = this.slotDrawing(
      slot,
      polygonsKey(entry),
      entry.role,
      RENDER_ORDER.polygons,
      () => new PolygonSheet(entry.polygons, {
        edgeColor: style.edgeColor,
        edgeRadius: style.edgeRadius,
        faceColor: style.faceColor,
        faceOpacity: style.faceOpacity,
      }),
      (existing) => existing.update(entry.polygons),
    );
    setMaterialOpacity(drawing.edges.group, entry.opacity, 1, "always");
    setMaterialOpacity(drawing.faces, entry.opacity * (entry.fill ?? 1), style.faceOpacity, "never");
    drawing.group.visible = entry.opacity > 1e-4;
    return slot;
  }

  private drawLines(entry: FrameLines): string {
    const slot = `lines:${entry.key}`;
    const style = LINE_STYLES[entry.role];
    const drawing = this.slotDrawing(
      slot,
      linesKey(entry),
      entry.role,
      RENDER_ORDER.lines,
      () => new SegmentDrawing(entry.segments, {
        color: style.color,
        radius: style.radius,
        opacity: 1,
        radialSegments: entry.role === "strut" ? 5 : 8,
      }),
      (existing) => existing.update(entry.segments),
    );
    setMaterialOpacity(drawing.group, entry.opacity, 1, "always");
    return slot;
  }

  private drawGuide(keyName: string, radius: number, opacity: number): string {
    const slot = `guide:${keyName}`;
    const drawing = this.slotDrawing(
      slot,
      round4(radius),
      "guide",
      RENDER_ORDER.guide,
      () => {
        const group = createCircumsphereGuide(radius, { color: 0x956852, opacity: 1 });
        return { group, dispose: () => disposeObject(group) };
      },
      (existing) => {
        for (const child of [...existing.group.children]) {
          existing.group.remove(child);
          disposeObject(child);
        }
        const fresh = createCircumsphereGuide(radius, { color: 0x956852, opacity: 1 });
        existing.group.add(...fresh.children);
      },
    );
    setMaterialOpacity(drawing.group, opacity, 0.14);
    return slot;
  }
}
