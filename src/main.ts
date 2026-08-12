import {
  ARCHIMEDEAN_SPECS,
  PLATONIC_SPECS,
  archimedean,
  closestPacking,
  convexHull,
  createCoxeterSystem,
  deriveRhombicDodecahedronFromFCC,
  dual,
  eulerCharacteristic,
  hullOfCenters,
  packingContacts,
  platonic,
  radiusSpread,
  rotationalWythoffCorrespondence,
  solveSnubGenerator,
  tightenFirstShell,
  wythoff,
  type ArchimedeanName,
  type CoxeterTriangle,
  type MirrorDistances,
  type PlatonicName,
  type Polyhedron,
} from "@order-in-space/geometry";
import {
  PolyhedronDrawing,
  clearAndDispose,
  createCircumsphereGuide,
  createSphereMesh,
} from "@order-in-space/render";
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
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import "./styles.css";

type LabMode = "wythoff" | "packing" | "fcc";
type WythoffOrbitMode = "full" | "chiral";

interface NamedSolidEntry {
  readonly value: string;
  readonly label: string;
  readonly kind: "platonic" | "archimedean";
  readonly name: PlatonicName | ArchimedeanName;
}

const FAMILY_TRIANGLES: Readonly<Record<string, CoxeterTriangle>> = {
  "233": [2, 3, 3],
  "234": [2, 3, 4],
  "235": [2, 3, 5],
};

const SOLID_LABELS: Readonly<Record<PlatonicName | ArchimedeanName, string>> = {
  tetrahedron: "Tetrahedron",
  cube: "Cube",
  octahedron: "Octahedron",
  dodecahedron: "Dodecahedron",
  icosahedron: "Icosahedron",
  truncatedTetrahedron: "Truncated tetrahedron",
  cuboctahedron: "Cuboctahedron",
  truncatedCube: "Truncated cube",
  truncatedOctahedron: "Truncated octahedron",
  rhombicuboctahedron: "Rhombicuboctahedron",
  truncatedCuboctahedron: "Truncated cuboctahedron",
  snubCube: "Snub cube",
  icosidodecahedron: "Icosidodecahedron",
  truncatedDodecahedron: "Truncated dodecahedron",
  truncatedIcosahedron: "Truncated icosahedron",
  rhombicosidodecahedron: "Rhombicosidodecahedron",
  truncatedIcosidodecahedron: "Truncated icosidodecahedron",
  snubDodecahedron: "Snub dodecahedron",
};

const NAMED_SOLIDS: readonly NamedSolidEntry[] = [
  ...Object.keys(PLATONIC_SPECS).map((name) => ({
    value: `p:${name}`,
    label: SOLID_LABELS[name as PlatonicName],
    kind: "platonic" as const,
    name: name as PlatonicName,
  })),
  ...Object.keys(ARCHIMEDEAN_SPECS).map((name) => ({
    value: `a:${name}`,
    label: SOLID_LABELS[name as ArchimedeanName],
    kind: "archimedean" as const,
    name: name as ArchimedeanName,
  })),
];

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing required lab element #${id}`);
  return element as T;
}

function faceSignature(polyhedron: Polyhedron): string {
  const counts = polyhedron.faces.reduce<Record<number, number>>((result, face) => {
    result[face.length] = (result[face.length] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([sides, count]) => `${count}×${sides}-gon`)
    .join(" · ");
}

function familyKey(triangle: CoxeterTriangle): string {
  return triangle.join("");
}

class GeometryLab {
  private readonly canvas = requireElement<HTMLCanvasElement>("geometry-canvas");
  private readonly scene = new Scene();
  private readonly stage = new Group();
  private readonly camera = new OrthographicCamera(-2, 2, 2, -2, 0.01, 100);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private renderScheduled = false;
  private customOrbitMode: WythoffOrbitMode = "full";

  private readonly modeInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="study"]'),
  );
  private readonly solidSelect = requireElement<HTMLSelectElement>("solid-select");
  private readonly familySelect = requireElement<HTMLSelectElement>("family-select");
  private readonly distanceInputs = [0, 1, 2].map((index) => (
    requireElement<HTMLInputElement>(`distance-${String(index)}`)
  )) as [HTMLInputElement, HTMLInputElement, HTMLInputElement];
  private readonly packingProgress = requireElement<HTMLInputElement>("packing-progress");
  private readonly showDual = requireElement<HTMLInputElement>("show-dual");
  private readonly showFaces = requireElement<HTMLInputElement>("show-faces");
  private readonly showVertices = requireElement<HTMLInputElement>("show-vertices");
  private readonly showGuide = requireElement<HTMLInputElement>("show-guide");
  private readonly autoRotate = requireElement<HTMLInputElement>("auto-rotate");
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor() {
    requireElement<HTMLAnchorElement>("lab-home").href = `${import.meta.env.BASE_URL}lab`;
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setClearColor(0xeeece5, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.background = new Color(0xeeece5);
    this.scene.add(this.stage);
    this.scene.add(new AmbientLight(0xfffbf2, 1.75));
    const key = new DirectionalLight(0xfff5df, 3.25);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new DirectionalLight(0x9fadc1, 0.6);
    fill.position.set(-4, -1, -3);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = false;
    this.controls.minZoom = 0.65;
    this.controls.maxZoom = 3.5;
    this.controls.autoRotateSpeed = 0.42;
    this.resetCamera();

    this.populateSolidSelect();
    this.bindControls();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    this.applyURLState();
    this.updateControlVisibility();
    this.renderCurrent();
    this.animate();
  }

  private populateSolidSelect(): void {
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Moving generator · custom";
    this.solidSelect.append(custom);

    const platonicGroup = document.createElement("optgroup");
    platonicGroup.label = "Platonic positions";
    const archimedeanGroup = document.createElement("optgroup");
    archimedeanGroup.label = "Archimedean positions";
    for (const entry of NAMED_SOLIDS) {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      (entry.kind === "platonic" ? platonicGroup : archimedeanGroup).append(option);
    }
    this.solidSelect.append(platonicGroup, archimedeanGroup);
  }

  private bindControls(): void {
    this.modeInputs.forEach((input) => input.addEventListener("change", () => {
      if (!input.checked) return;
      this.updateControlVisibility();
      this.resetCamera();
      this.scheduleRender();
    }));
    this.solidSelect.addEventListener("change", () => {
      if (this.solidSelect.value !== "custom") this.selectNamedSolid(this.solidSelect.value);
      this.scheduleRender();
    });
    this.familySelect.addEventListener("change", () => {
      this.customOrbitMode = "full";
      this.solidSelect.value = "custom";
      this.setDistances([1, 0, 0]);
      this.scheduleRender();
    });
    this.distanceInputs.forEach((input) => input.addEventListener("input", () => {
      this.solidSelect.value = "custom";
      this.updateDistanceOutputs();
      this.drawWythoffDiagram();
      this.scheduleRender();
    }));
    this.packingProgress.addEventListener("input", () => this.scheduleRender());
    this.showDual.addEventListener("change", () => this.scheduleRender());
    this.showFaces.addEventListener("change", () => this.scheduleRender());
    this.showVertices.addEventListener("change", () => this.scheduleRender());
    this.showGuide.addEventListener("change", () => this.scheduleRender());
    this.autoRotate.addEventListener("change", () => {
      this.controls.autoRotate = this.autoRotate.checked && !this.reducedMotion.matches;
    });
    this.reducedMotion.addEventListener("change", () => {
      this.controls.autoRotate = this.autoRotate.checked && !this.reducedMotion.matches;
    });
    requireElement<HTMLButtonElement>("reset-view").addEventListener("click", () => this.resetCamera());
    requireElement<HTMLButtonElement>("share-state").addEventListener("click", () => {
      void this.copyStateLink();
    });
  }

  private currentMode(): LabMode {
    const selected = this.modeInputs.find((input) => input.checked)?.value;
    return selected === "packing" || selected === "fcc" ? selected : "wythoff";
  }

  private setMode(mode: LabMode): void {
    for (const input of this.modeInputs) input.checked = input.value === mode;
  }

  private applyURLState(): void {
    const params = new URL(window.location.href).searchParams;
    const mode = params.get("mode");
    this.setMode(mode === "packing" || mode === "fcc" ? mode : "wythoff");

    const solid = params.get("solid") ?? "p:icosahedron";
    if (NAMED_SOLIDS.some((entry) => entry.value === solid)) {
      this.selectNamedSolid(solid);
    } else {
      this.selectNamedSolid("p:icosahedron");
    }

    const family = params.get("family");
    const distances = ["d0", "d1", "d2"].map((key) => Number(params.get(key)));
    if (family !== null && FAMILY_TRIANGLES[family] !== undefined) {
      this.familySelect.value = family;
      if (distances.every((value) => Number.isFinite(value) && value >= 0)
        && distances.some((value) => value > 0)) {
        this.solidSelect.value = "custom";
        this.setDistances(distances as unknown as MirrorDistances);
      }
    }

    const packingProgress = Number(params.get("t"));
    if (Number.isFinite(packingProgress)) {
      this.packingProgress.value = String(Math.min(1, Math.max(0, packingProgress)));
    }
    this.showDual.checked = params.get("dual") === "1";
    this.showFaces.checked = params.get("faces") !== "0";
    this.showVertices.checked = params.get("vertices") === "1";
    this.showGuide.checked = params.get("guide") !== "0";
  }

  private persistURLState(): void {
    const params = new URLSearchParams();
    const mode = this.currentMode();
    params.set("mode", mode);
    if (this.solidSelect.value === "custom") {
      params.set("solid", "custom");
      params.set("family", this.familySelect.value);
      this.currentDistances().forEach((value, index) => params.set(`d${String(index)}`, value.toFixed(3)));
    } else {
      params.set("solid", this.solidSelect.value);
    }
    if (mode === "packing") {
      params.set("t", Number(this.packingProgress.value).toFixed(3));
      if (this.showDual.checked) params.set("dual", "1");
    }
    if (!this.showFaces.checked) params.set("faces", "0");
    if (this.showVertices.checked) params.set("vertices", "1");
    if (!this.showGuide.checked) params.set("guide", "0");
    const nextURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextURL);
  }

  private async copyStateLink(): Promise<void> {
    this.persistURLState();
    const status = requireElement<HTMLElement>("copy-status");
    try {
      await navigator.clipboard.writeText(window.location.href);
      status.textContent = "State link copied.";
    } catch {
      status.textContent = "Copy unavailable; use the address bar.";
    }
    window.setTimeout(() => {
      status.textContent = "";
    }, 2400);
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.renderCurrent();
    });
  }

  private selectNamedSolid(value: string): void {
    const entry = NAMED_SOLIDS.find((candidate) => candidate.value === value);
    if (entry === undefined) return;
    this.solidSelect.value = value;
    if (entry.kind === "platonic") {
      this.customOrbitMode = "full";
      const spec = PLATONIC_SPECS[entry.name as PlatonicName];
      this.familySelect.value = familyKey(spec.triangle);
      this.setDistances(spec.generator);
    } else {
      const spec = ARCHIMEDEAN_SPECS[entry.name as ArchimedeanName];
      this.customOrbitMode = spec.kind === "snub" ? "chiral" : "full";
      this.familySelect.value = familyKey(spec.triangle);
      this.setDistances(spec.kind === "snub" ? solveSnubGenerator(spec.triangle).generator : spec.generator);
    }
  }

  private setDistances(distances: MirrorDistances): void {
    this.distanceInputs.forEach((input, index) => {
      input.value = String(distances[index]);
    });
    this.updateDistanceOutputs();
    this.drawWythoffDiagram();
  }

  private currentDistances(): MirrorDistances {
    return this.distanceInputs.map((input) => Number(input.value)) as unknown as MirrorDistances;
  }

  private currentTriangle(): CoxeterTriangle {
    const triangle = FAMILY_TRIANGLES[this.familySelect.value];
    if (triangle === undefined) throw new Error("Unknown Wythoff mirror family");
    return triangle;
  }

  private updateDistanceOutputs(): void {
    this.distanceInputs.forEach((input, index) => {
      requireElement<HTMLOutputElement>(`distance-${String(index)}-value`).value = Number(input.value).toFixed(3);
    });
  }

  private updateControlVisibility(): void {
    const mode = this.currentMode();
    requireElement<HTMLElement>("wythoff-controls").hidden = mode !== "wythoff";
    requireElement<HTMLElement>("packing-controls").hidden = mode !== "packing";
    requireElement<HTMLElement>("fcc-controls").hidden = mode !== "fcc";
  }

  private renderCurrent(): void {
    try {
      const mode = this.currentMode();
      if (mode === "packing") this.renderPacking();
      else if (mode === "fcc") this.renderFCC();
      else this.renderWythoff();
      this.updateStudyChrome(mode);
      this.persistURLState();
      const error = requireElement<HTMLElement>("render-error");
      error.hidden = true;
      error.textContent = "";
    } catch (cause) {
      const error = requireElement<HTMLElement>("render-error");
      error.textContent = cause instanceof Error ? cause.message : "The geometry could not be constructed.";
      error.hidden = false;
    }
  }

  private updateStudyChrome(mode: LabMode): void {
    const number = mode === "wythoff" ? "01" : mode === "packing" ? "02" : "03";
    requireElement<HTMLElement>("study-number").textContent = `Study ${number} / 03`;
    const guideLabel = mode === "fcc" ? "Outer cell radius" : mode === "packing" ? "Center sphere" : "Master sphere";
    requireElement<HTMLElement>("guide-label").textContent = guideLabel;
    requireElement<HTMLElement>("radius-legend-label").textContent = `${guideLabel} · R`;
  }

  private renderWythoff(): void {
    const selected = NAMED_SOLIDS.find((entry) => entry.value === this.solidSelect.value);
    let polyhedron: Polyhedron;
    let title: string;
    if (selected?.kind === "platonic") {
      polyhedron = platonic(selected.name as PlatonicName);
      title = selected.label;
    } else if (selected?.kind === "archimedean") {
      polyhedron = archimedean(selected.name as ArchimedeanName);
      title = selected.label;
    } else {
      if (this.customOrbitMode === "chiral") {
        const correspondence = rotationalWythoffCorrespondence(
          this.currentTriangle(),
          this.currentDistances(),
        );
        polyhedron = convexHull(correspondence.map(({ position }) => position), {
          symbol: "moving chiral generator",
        });
        title = "Moving chiral generator";
      } else {
        polyhedron = wythoff(this.currentTriangle(), this.currentDistances(), {
          symbol: "moving generator",
        });
        title = "Moving generator";
      }
    }

    this.replaceStage(polyhedron);
    const system = createCoxeterSystem(this.currentTriangle());
    const orbitOrder = this.customOrbitMode === "chiral" ? system.group.length / 2 : system.group.length;
    requireElement<HTMLOutputElement>("group-order").value = `orbit order ${String(orbitOrder)}`;
    requireElement<HTMLElement>("mode-caption").textContent = "One generator, reflected into order.";
    const mirrorCount = this.currentDistances().filter((distance) => distance <= 1e-8).length;
    const generatorState = this.customOrbitMode === "chiral"
      ? "interior · chiral orbit"
      : mirrorCount >= 2
        ? "corner · regular closure"
        : mirrorCount === 1
          ? "mirror path · uniform transition"
          : "interior · full orbit";
    requireElement<HTMLElement>("generator-state").textContent = generatorState;
    requireElement<HTMLElement>("object-state").textContent = generatorState;
    this.updateTopology(polyhedron, title, this.customOrbitMode === "chiral" ? "Rotational Wythoff orbit" : "Wythoff orbit");
    this.drawWythoffDiagram();
  }

  private renderPacking(): void {
    const progress = Number(this.packingProgress.value);
    const sphereRadius = 0.52;
    const frame = tightenFirstShell(progress, sphereRadius);
    const hull = hullOfCenters(frame.spheres, "tightening shell hull");
    clearAndDispose(this.stage);
    if (this.showGuide.checked) {
      this.stage.add(createCircumsphereGuide(hull.circumradius, { opacity: 0.09 }));
    }
    this.stage.add(createSphereMesh(frame.spheres, { color: 0xa7957d, opacity: 0.14 }));
    const nucleusOpacity = Math.max(0, 0.24 * (1 - progress * 4));
    if (nucleusOpacity > 0.005) {
      const nucleus = closestPacking(0, sphereRadius);
      this.stage.add(createSphereMesh(nucleus, { color: 0x9a4e32, opacity: nucleusOpacity }));
    }
    const drawing = new PolyhedronDrawing(hull, this.drawingStyle(hull));
    this.stage.add(drawing.group);
    if (this.showDual.checked) {
      const reciprocal = dual(hull, { circumradius: hull.circumradius, symbol: "face-center dual" });
      const dualDrawing = new PolyhedronDrawing(reciprocal, {
        edgeColor: 0x9a4e32,
        edgeRadius: 0.011,
        showFaces: false,
        showVertices: false,
      });
      this.stage.add(dualDrawing.group);
    }

    const contacts = packingContacts(frame.spheres).length;
    const percent = Math.round(progress * 100);
    requireElement<HTMLOutputElement>("packing-progress-value").value = `${String(percent)}%`;
    requireElement<HTMLElement>("packing-note").textContent = progress === 0
      ? "Twelve equal spheres touch a nucleus. Their generated center hull is cuboctahedral."
      : `${String(contacts)} shell contacts hold while the common center radius contracts to ${frame.centerRadius.toFixed(3)}.`;
    requireElement<HTMLElement>("mode-caption").textContent = "Packing becomes polyhedral relation.";
    const activeStep = progress < 0.08 ? 0 : progress > 0.92 ? 2 : 1;
    for (const item of document.querySelectorAll<HTMLElement>("#packing-steps li")) {
      const isActive = Number(item.dataset.step) === activeStep;
      item.toggleAttribute("data-active", isActive);
      if (isActive) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    requireElement<HTMLElement>("object-state").textContent = activeStep === 0
      ? "Nucleus present · 24 shell contacts"
      : activeStep === 1
        ? `Nucleus released · ${String(contacts)} shell contacts`
        : "Golden rectangles close · 30 shell contacts";
    const title = progress === 0 ? "Cuboctahedral shell" : progress === 1 ? "Icosahedral shell" : "Tightening shell";
    this.updateTopology(hull, title, "Twelve around one");
  }

  private renderFCC(): void {
    const radius = 0.52;
    const packing = closestPacking(1, radius);
    const derivation = deriveRhombicDodecahedronFromFCC(radius);
    clearAndDispose(this.stage);
    if (this.showGuide.checked) {
      this.stage.add(createCircumsphereGuide(derivation.cell.circumradius, { color: 0x8d5c46, opacity: 0.1 }));
    }
    this.stage.add(createSphereMesh(packing, { color: 0xa7957d, opacity: 0.075 }));
    const drawing = new PolyhedronDrawing(derivation.cell, {
      ...this.drawingStyle(derivation.cell),
      edgeColor: 0x733c2b,
      faceColor: 0xc2a98c,
      faceOpacity: 0.16,
    });
    this.stage.add(drawing.group);
    requireElement<HTMLElement>("mode-caption").textContent = "Packing partitions continuous space.";
    requireElement<HTMLElement>("object-state").textContent = "12 neighbor planes · two vertex radii";
    this.updateTopology(derivation.cell, "Rhombic dodecahedron", "FCC Voronoi cell");
  }

  private drawingStyle(polyhedron: Polyhedron) {
    return {
      edgeRadius: Math.max(0.009, 0.022 - polyhedron.edges.length * 0.00005),
      showFaces: this.showFaces.checked,
      showVertices: this.showVertices.checked,
      faceOpacity: 0.11,
    };
  }

  private replaceStage(polyhedron: Polyhedron): void {
    clearAndDispose(this.stage);
    if (this.showGuide.checked) {
      this.stage.add(createCircumsphereGuide(polyhedron.circumradius));
    }
    const drawing = new PolyhedronDrawing(polyhedron, this.drawingStyle(polyhedron));
    this.stage.add(drawing.group);
  }

  private updateTopology(polyhedron: Polyhedron, title: string, family: string): void {
    requireElement<HTMLElement>("object-family").textContent = family;
    requireElement<HTMLElement>("object-title").textContent = title;
    requireElement<HTMLElement>("vertex-count").textContent = String(polyhedron.vertices.length);
    requireElement<HTMLElement>("edge-count").textContent = String(polyhedron.edges.length);
    requireElement<HTMLElement>("face-count").textContent = String(polyhedron.faces.length);
    requireElement<HTMLElement>("euler-count").textContent = String(eulerCharacteristic(polyhedron));
    requireElement<HTMLElement>("edge-count-label").textContent = `${String(polyhedron.edges.length)} edges`;
    const spread = radiusSpread(polyhedron);
    const radiusText = spread < 1e-8
      ? `common radius ${polyhedron.circumradius.toFixed(3)}`
      : `outer radius ${polyhedron.circumradius.toFixed(3)} · Δr ${spread.toFixed(3)}`;
    requireElement<HTMLElement>("object-detail").textContent = `${polyhedron.symbol} · ${faceSignature(polyhedron)} · ${radiusText}`;
  }

  private drawWythoffDiagram(): void {
    const canvas = requireElement<HTMLCanvasElement>("wythoff-diagram");
    const context = canvas.getContext("2d");
    if (context === null) return;
    const [a, b, c] = this.currentDistances();
    const sum = Math.max(a + b + c, 1e-9);
    const vertices = [
      { x: canvas.width * 0.5, y: 28 },
      { x: 46, y: canvas.height - 32 },
      { x: canvas.width - 46, y: canvas.height - 32 },
    ] as const;
    const point = {
      x: (a * vertices[0].x + b * vertices[1].x + c * vertices[2].x) / sum,
      y: (a * vertices[0].y + b * vertices[1].y + c * vertices[2].y) / sum,
    };
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    context.strokeStyle = "rgba(41,40,37,.68)";
    context.beginPath();
    context.moveTo(vertices[0].x, vertices[0].y);
    context.lineTo(vertices[1].x, vertices[1].y);
    context.lineTo(vertices[2].x, vertices[2].y);
    context.closePath();
    context.stroke();
    context.setLineDash([5, 7]);
    context.strokeStyle = "rgba(41,40,37,.2)";
    for (const vertex of vertices) {
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(vertex.x, vertex.y);
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = "#9a4e32";
    context.beginPath();
    context.arc(point.x, point.y, 8, 0, Math.PI * 2);
    context.fill();
    context.font = "22px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "rgba(41,40,37,.72)";
    const triangle = this.currentTriangle();
    context.fillText(String(triangle[0]), vertices[0].x - 7, vertices[0].y + 31);
    context.fillText(String(triangle[1]), vertices[1].x + 18, vertices[1].y - 8);
    context.fillText(String(triangle[2]), vertices[2].x - 34, vertices[2].y - 8);
  }

  private resetCamera(): void {
    this.camera.position.set(3.35, 2.55, 4.15);
    this.camera.zoom = 1;
    this.controls.target.set(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const aspect = width / height;
    const frustumHeight = 4.25;
    // Mobile compositions reserve the lower field for the topology plate.
    // An asymmetric frustum keeps the construction clear of that type without
    // changing its geometry or the orbit-control pivot.
    const verticalOffset = window.innerWidth <= 820 ? -0.56 : 0;
    this.camera.left = (-frustumHeight * aspect) / 2;
    this.camera.right = (frustumHeight * aspect) / 2;
    this.camera.top = frustumHeight / 2 + verticalOffset;
    this.camera.bottom = -frustumHeight / 2 + verticalOffset;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (): void => {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
}

try {
  const basePath = import.meta.env.BASE_URL;
  if (window.location.pathname === basePath || window.location.pathname === basePath.slice(0, -1)) {
    window.history.replaceState({}, "", `${basePath}lab`);
  }
  new GeometryLab();
} catch (cause) {
  const error = requireElement<HTMLElement>("render-error");
  error.textContent = cause instanceof Error ? cause.message : "This browser could not initialize the geometry laboratory.";
  error.hidden = false;
}
