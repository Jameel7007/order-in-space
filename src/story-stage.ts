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
  SceneFrame,
} from "@order-in-space/scenes";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

import { linesKey, polygonsKey, round4, spheresKey, vertexKey } from "./stage/keys.js";
import { setMaterialOpacity, setRenderOrder } from "./stage/materials.js";
import {
  LINE_STYLES,
  POLYGON_STYLES,
  RENDER_ORDER,
  SOLID_STYLES,
  SPHERE_COLORS,
} from "./stage/styles.js";

export type Drawing = PolyhedronDrawing | SphereDrawing | PolygonSheet | SegmentDrawing | { group: Group; dispose(): void };

interface StageEntry {
  readonly drawing: Drawing;
  /** Identity of the geometry currently uploaded for this slot. */
  key: string;
  /** Identity of the style; a change here needs a fresh drawing. */
  readonly styleKey: string;
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
