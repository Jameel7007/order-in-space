import { eulerCharacteristic, wythoff, type Polyhedron } from "@order-in-space/geometry";
import {
  PolyhedronDrawing,
  clearAndDispose,
  createCircumsphereGuide,
} from "@order-in-space/render";
import {
  ICOSAHEDRAL_TRUNCATION_WAYPOINTS,
  sampleTruncationPath,
} from "@order-in-space/scenes";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

import "./story.css";

function requireElement<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing required story element #${id}`);
  return element as unknown as T;
}

function nearbyWaypoint(progress: number) {
  return ICOSAHEDRAL_TRUNCATION_WAYPOINTS.find((waypoint) => (
    Math.abs(waypoint.progress - progress) <= 0.018
  ));
}

class ShapeStory {
  private readonly canvas = requireElement<HTMLCanvasElement>("story-canvas");
  private readonly scene = new Scene();
  private readonly stage = new Group();
  private readonly camera = new OrthographicCamera(-2, 2, 2, -2, 0.01, 100);
  private readonly renderer: WebGLRenderer;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly beats = Array.from(document.querySelectorAll<HTMLElement>("[data-beat]"));
  private readonly scrubber = requireElement<HTMLInputElement>("story-scrubber");
  private lastGeometryKey = "";

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
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
    this.scene.add(this.stage);
    this.scene.add(new AmbientLight(0xfffbef, 2.1));
    const key = new DirectionalLight(0xffeed5, 3.4);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new DirectionalLight(0x94a7ba, 0.72);
    fill.position.set(-4, -2, -3);
    this.scene.add(fill);

    this.camera.position.set(3.4, 2.4, 4.3);
    this.camera.lookAt(0, 0, 0);
    this.bindInteraction();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    this.setProgress(0);
    this.createScrollStory();
    this.animateHero();
  }

  private bindInteraction(): void {
    this.scrubber.addEventListener("input", () => {
      this.setProgress(Number(this.scrubber.value));
    });
    this.scrubber.addEventListener("change", () => {
      const sequence = requireElement<HTMLElement>("discovery");
      const available = Math.max(0, sequence.offsetHeight - window.innerHeight);
      const target = sequence.offsetTop + available * Number(this.scrubber.value);
      window.scrollTo({
        top: target,
        behavior: this.reducedMotion.matches ? "auto" : "smooth",
      });
    });
  }

  private createScrollStory(): void {
    ScrollTrigger.create({
      trigger: "#discovery",
      start: "top top",
      end: "bottom bottom",
      scrub: this.reducedMotion.matches ? false : 0.55,
      onUpdate: ({ progress }) => this.setProgress(progress),
    });
  }

  private animateHero(): void {
    if (this.reducedMotion.matches) return;
    gsap.timeline({ repeat: -1, repeatDelay: 0.45 })
      .fromTo(".hero-point", { scale: 0.8 }, { scale: 1.18, duration: 0.65, ease: "power2.out" })
      .to(".hero-ring-one", { scale: 1.14, opacity: 0.22, duration: 0.8 }, 0)
      .to(".hero-ring-two", { scale: 1.11, rotate: 22, opacity: 0.2, duration: 0.95 }, 0.12)
      .to(".hero-ring-three", { scale: 1.08, rotate: -16, opacity: 0.16, duration: 1.05 }, 0.24)
      .to(".hero-point", { scale: 0.92, duration: 0.55, ease: "sine.inOut" });
  }

  private setProgress(progress: number): void {
    const sample = sampleTruncationPath(progress);
    const geometryKey = sample.distances.map((value) => value.toFixed(2)).join(":");
    let polyhedron: Polyhedron | undefined;
    if (geometryKey !== this.lastGeometryKey) {
      polyhedron = wythoff(sample.triangle, sample.distances, {
        symbol: sample.atNamedPosition ? sample.nearestWaypoint.symbol : "moving point",
      });
      this.rebuildDrawing(polyhedron);
      this.lastGeometryKey = geometryKey;
    }

    this.stage.rotation.set(
      0.18 + Math.sin(sample.progress * Math.PI) * 0.08,
      -0.58 + sample.progress * 1.08,
      -0.06 + sample.progress * 0.12,
    );
    this.updateGenerator(sample.distances);
    this.updateCopy(sample.progress, polyhedron);
    this.renderer.render(this.scene, this.camera);
  }

  private rebuildDrawing(polyhedron: Polyhedron): void {
    clearAndDispose(this.stage);
    this.stage.add(createCircumsphereGuide(polyhedron.circumradius, {
      color: 0x956852,
      opacity: 0.12,
    }));
    const drawing = new PolyhedronDrawing(polyhedron, {
      edgeColor: 0x25231f,
      edgeRadius: Math.max(0.008, 0.022 - polyhedron.edges.length * 0.000055),
      faceColor: 0xcab499,
      faceOpacity: 0.13,
      showFaces: true,
      showVertices: false,
    });
    this.stage.add(drawing.group);
  }

  private updateGenerator(distances: readonly number[]): void {
    const [a = 0, b = 0, c = 0] = distances;
    const sum = Math.max(a + b + c, 1e-9);
    const x = (a * 120 + b * 22 + c * 218) / sum;
    const y = (a * 18 + b * 166 + c * 166) / sum;
    const point = requireElement<SVGCircleElement>("story-generator");
    point.setAttribute("cx", x.toFixed(2));
    point.setAttribute("cy", y.toFixed(2));
  }

  private updateCopy(progress: number, rebuilt?: Polyhedron): void {
    const named = nearbyWaypoint(progress);
    const name = named?.name ?? "A shape in motion";
    const invitation = named?.invitation ?? "Something new is taking shape";
    requireElement<HTMLElement>("story-name").textContent = name;
    requireElement<HTMLElement>("story-invitation").textContent = invitation;
    requireElement<HTMLElement>("story-progress").textContent = `${String(Math.round(progress * 100))}%`;
    this.scrubber.value = progress.toFixed(3);

    if (rebuilt !== undefined) {
      requireElement<HTMLElement>("story-vertices").textContent = String(rebuilt.vertices.length);
      requireElement<HTMLElement>("story-edges").textContent = String(rebuilt.edges.length);
      requireElement<HTMLElement>("story-faces").textContent = String(rebuilt.faces.length);
      requireElement<HTMLElement>("story-technical").textContent = named === undefined
        ? `Moving Wythoff generator · family (2,3,5) · Euler ${String(eulerCharacteristic(rebuilt))}`
        : `${named.symbol} · Wythoff family (2,3,5) · Euler ${String(eulerCharacteristic(rebuilt))}`;
    }

    const activeBeat = Math.min(this.beats.length - 1, Math.round(progress * (this.beats.length - 1)));
    this.beats.forEach((beat, index) => beat.toggleAttribute("data-active", index === activeBeat));
  }

  private resize(): void {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const aspect = width / height;
    const frustumHeight = window.innerWidth <= 760 ? 5.05 : 4.35;
    const verticalOffset = window.innerWidth <= 760 ? -0.72 : 0;
    this.camera.left = (-frustumHeight * aspect) / 2;
    this.camera.right = (frustumHeight * aspect) / 2;
    this.camera.top = frustumHeight / 2 + verticalOffset;
    this.camera.bottom = -frustumHeight / 2 + verticalOffset;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
    ScrollTrigger.refresh();
  }
}

try {
  new ShapeStory();
} catch (cause) {
  const story = document.getElementById("story-app");
  if (story !== null) {
    const message = document.createElement("p");
    message.className = "story-error";
    message.textContent = cause instanceof Error
      ? `The shape story could not begin: ${cause.message}`
      : "The shape story could not begin in this browser.";
    story.prepend(message);
  }
}
