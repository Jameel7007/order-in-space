import type { Polyhedron, Sphere, Vec3 } from "@order-in-space/geometry";
import {
  PolyhedronDrawing,
  clearAndDispose,
  createCircumsphereGuide,
  createPolygonGroup,
  createSegmentMesh,
  createSphereMesh,
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

const POLYGON_STYLES: Readonly<Record<PolygonRole, { edgeColor: number; faceColor: number; faceOpacity: number; edgeRadius: number }>> = {
  fold: { edgeColor: 0x9a4e32, faceColor: 0xc9a98a, faceOpacity: 0.24, edgeRadius: 0.009 },
  wall: { edgeColor: 0x733c2b, faceColor: 0xc2a98c, faceOpacity: 0.2, edgeRadius: 0.007 },
};

const LINE_STYLES: Readonly<Record<LineRole, { color: number; radius: number }>> = {
  strut: { color: 0x7d766b, radius: 0.007 },
  rectangle: { color: 0x9a4e32, radius: 0.012 },
  trace: { color: 0x8a8378, radius: 0.006 },
};

interface StageEntry {
  readonly object: Object3D;
  readonly kind: "solid" | "spheres" | "polygons" | "lines" | "guide";
  readonly signature: string;
}

function setMaterialOpacity(object: Object3D | undefined, opacity: number, base = 1): void {
  if (object === undefined) return;
  object.traverse((child) => {
    if (!(child instanceof Mesh) && !(child instanceof Line)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials as Material[]) {
      const value = Math.max(0, Math.min(1, opacity * base));
      material.opacity = value;
      material.transparent = value < 0.999;
      material.depthWrite = value >= 0.5;
      material.needsUpdate = false;
    }
  });
  object.visible = opacity > 1e-4;
}

function solidSignature(entry: FrameSolid): string {
  return `${entry.key}|${entry.role}|${entry.showFaces ? "f" : ""}${entry.showEdges ? "e" : ""}${entry.vertexOpacity > 0 ? "v" : ""}`;
}

function spheresSignature(entry: FrameSpheres): string {
  return `${entry.key}|${entry.role}|${entry.spheres.map((sphere) => (
    `${sphere.center.x.toFixed(5)},${sphere.center.y.toFixed(5)},${sphere.center.z.toFixed(5)},${sphere.radius.toFixed(5)}`
  )).join(";")}`;
}

function polygonsSignature(entry: FramePolygons): string {
  return `${entry.key}|${entry.role}|${entry.polygons.map((polygon) => polygon.map((corner) => (
    `${corner.x.toFixed(4)},${corner.y.toFixed(4)},${corner.z.toFixed(4)}`
  )).join(";")).join("/")}`;
}

function linesSignature(entry: FrameLines): string {
  return `${entry.key}|${entry.role}|${entry.segments.length}|${entry.segments.slice(0, 4).map(([a, b]) => (
    `${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)}-${b.x.toFixed(3)},${b.y.toFixed(3)},${b.z.toFixed(3)}`
  )).join(";")}`;
}

/**
 * Draws scene frames. Objects are keyed by the frame element keys and only
 * rebuilt when their geometry changes; opacity, scale, and visibility are
 * updated in place every frame.
 */
export class StoryStage {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly stage = new Group();
  private readonly world = new Group();
  private readonly camera = new OrthographicCamera(-2, 2, 2, -2, 0.01, 100);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
    clearAndDispose(this.world);
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

    for (const [key, entry] of this.entries) {
      if (live.has(key)) continue;
      this.world.remove(entry.object);
      disposeObject(entry.object);
      this.entries.delete(key);
    }

    this.stage.rotation.set(frame.camera.pitch, frame.camera.yaw, 0);
    this.world.position.set(-frame.camera.focus.x, -frame.camera.focus.y, -frame.camera.focus.z);
    this.camera.zoom = frame.camera.zoom;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private replace(key: string, signature: string, kind: StageEntry["kind"], build: () => Object3D): Object3D {
    const existing = this.entries.get(key);
    if (existing !== undefined && existing.signature === signature) return existing.object;
    if (existing !== undefined) {
      this.world.remove(existing.object);
      disposeObject(existing.object);
    }
    const object = build();
    this.world.add(object);
    this.entries.set(key, { object, kind, signature });
    return object;
  }

  private drawSolid(entry: FrameSolid): string {
    const key = `solid:${entry.key}`;
    const style = SOLID_STYLES[entry.role];
    const object = this.replace(key, solidSignature(entry), "solid", () => {
      const group = new Group();
      group.name = entry.key;
      const drawing = new PolyhedronDrawing(entry.polyhedron, {
        edgeColor: style.edgeColor,
        edgeRadius: style.edgeRadius(entry.polyhedron),
        faceColor: style.faceColor,
        faceOpacity: style.faceOpacity,
        showFaces: entry.showFaces,
        showVertices: entry.vertexOpacity > 0,
        vertexColor: 0x9a4e32,
        vertexRadius: 0.026,
      });
      if (!entry.showEdges) {
        const edges = drawing.group.getObjectByName("polyhedron edges");
        if (edges !== undefined) edges.visible = false;
      }
      group.add(drawing.group);
      return group;
    });
    object.scale.setScalar(entry.scale);
    object.visible = entry.opacity > 1e-4;
    setMaterialOpacity(object.getObjectByName("polyhedron edges"), entry.showEdges ? entry.opacity : 0);
    setMaterialOpacity(object.getObjectByName("supporting faces"), entry.opacity, style.faceOpacity);
    setMaterialOpacity(object.getObjectByName("polyhedron vertices"), entry.opacity * entry.vertexOpacity);
    return key;
  }

  private drawSpheres(entry: FrameSpheres): string {
    const key = `spheres:${entry.key}`;
    const object = this.replace(key, spheresSignature(entry), "spheres", () => (
      createSphereMesh(entry.spheres as readonly Sphere[], {
        color: SPHERE_COLORS[entry.role],
        opacity: 1,
        widthSegments: entry.role === "point" ? 40 : 26,
        heightSegments: entry.role === "point" ? 28 : 18,
      })
    ));
    setMaterialOpacity(object, entry.opacity);
    return key;
  }

  private drawPolygons(entry: FramePolygons): string {
    const key = `polygons:${entry.key}`;
    const style = POLYGON_STYLES[entry.role];
    const object = this.replace(key, polygonsSignature(entry), "polygons", () => createPolygonGroup(entry.polygons, {
      edgeColor: style.edgeColor,
      edgeRadius: style.edgeRadius,
      faceColor: style.faceColor,
      faceOpacity: style.faceOpacity,
    }));
    setMaterialOpacity(object.getObjectByName("polygon edges"), entry.opacity);
    setMaterialOpacity(object.getObjectByName("polygon faces"), entry.opacity, style.faceOpacity);
    object.visible = entry.opacity > 1e-4;
    return key;
  }

  private drawLines(entry: FrameLines): string {
    const key = `lines:${entry.key}`;
    const style = LINE_STYLES[entry.role];
    const object = this.replace(key, linesSignature(entry), "lines", () => createSegmentMesh(entry.segments, {
      color: style.color,
      radius: style.radius,
      opacity: 1,
      radialSegments: entry.role === "strut" ? 5 : 8,
    }));
    setMaterialOpacity(object, entry.opacity);
    return key;
  }

  private drawGuide(keyName: string, radius: number, opacity: number): string {
    const key = `guide:${keyName}`;
    const object = this.replace(key, `${keyName}|${radius.toFixed(5)}`, "guide", () => createCircumsphereGuide(radius, {
      color: 0x956852,
      opacity: 1,
    }));
    setMaterialOpacity(object, opacity, 0.14);
    return key;
  }
}

export type { Vec3 };
