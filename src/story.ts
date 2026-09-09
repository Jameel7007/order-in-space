import {
  STORY_CHAPTERS,
  activeBeat,
  sampleChapter,
  type Chapter,
  type SceneFrame,
} from "@order-in-space/scenes";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { StoryStage } from "./story-stage.js";
import "./story.css";

function requireElement<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing required story element #${id}`);
  return element as unknown as T;
}

function pad(number: number): string {
  return String(number).padStart(2, "0");
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

class TextCache {
  private readonly last = new Map<string, string>();

  set(id: string, value: string): void {
    if (this.last.get(id) === value) return;
    this.last.set(id, value);
    requireElement<HTMLElement>(id).textContent = value;
  }
}

class ShapeStory {
  private readonly canvas = requireElement<HTMLCanvasElement>("story-canvas");
  private readonly scrubber = requireElement<HTMLInputElement>("story-scrubber");
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly text = new TextCache();
  private readonly sections: HTMLElement[] = [];
  private readonly beatArticles = new Map<number, HTMLElement[]>();
  private readonly railItems: HTMLElement[] = [];
  private stage: StoryStage | undefined;
  private current = { chapter: 1, progress: 0 };
  private lastBeatKey = "";

  constructor() {
    gsap.registerPlugin(ScrollTrigger);
    this.buildContents();
    this.buildChapters();
    this.buildBeats();
    this.buildRail();
    this.buildTextVersion();
    this.startStage();
    this.bindInteraction();
    this.applyComposition();
    new ResizeObserver(() => this.applyComposition()).observe(this.canvas.parentElement ?? this.canvas);
    this.setProgress(1, 0);
    this.createScrollStory();
    this.hideLoader();
  }

  private buildContents(): void {
    const list = requireElement<HTMLOListElement>("contents-list");
    for (const chapter of STORY_CHAPTERS) {
      const item = element("li");
      const link = element("a");
      link.href = `#chapter-${String(chapter.number)}`;
      link.append(element("span", "contents-number", pad(chapter.number)));
      link.append(element("strong", undefined, chapter.title));
      link.append(element("small", undefined, chapter.kicker));
      link.addEventListener("click", () => {
        requireElement<HTMLDetailsElement>("contents-menu").open = false;
      });
      item.append(link);
      list.append(item);
    }
  }

  private buildChapters(): void {
    const container = requireElement<HTMLElement>("story-chapters");
    for (const chapter of STORY_CHAPTERS) {
      const section = element("section", "story-chapter");
      section.id = `chapter-${String(chapter.number)}`;
      section.dataset.chapter = String(chapter.number);
      section.style.height = `${String(chapter.screens * 100)}svh`;
      section.setAttribute("aria-label", `Chapter ${String(chapter.number)}: ${chapter.title}`);
      container.append(section);
      this.sections.push(section);
    }
  }

  private buildBeats(): void {
    const container = requireElement<HTMLElement>("story-beats");
    for (const chapter of STORY_CHAPTERS) {
      const articles = chapter.beats.map((beat, index) => {
        const article = element("article");
        article.dataset.chapter = String(chapter.number);
        article.dataset.beat = String(index);
        article.hidden = true;
        article.append(element("p", "beat-number", beat.eyebrow));
        article.append(element("h2", undefined, beat.heading));
        article.append(element("p", undefined, beat.body));
        container.append(article);
        return article;
      });
      this.beatArticles.set(chapter.number, articles);
    }
  }

  private buildRail(): void {
    const rail = requireElement<HTMLOListElement>("chapter-rail");
    for (const chapter of STORY_CHAPTERS) {
      const item = element("li");
      const link = element("a");
      link.href = `#chapter-${String(chapter.number)}`;
      link.setAttribute("aria-label", `Chapter ${String(chapter.number)}: ${chapter.title}`);
      link.append(element("span", undefined, pad(chapter.number)));
      item.append(link);
      rail.append(item);
      this.railItems.push(item);
    }
  }

  private buildTextVersion(): void {
    const container = requireElement<HTMLElement>("story-text");
    for (const chapter of STORY_CHAPTERS) {
      const block = element("section");
      block.append(element("h2", undefined, `${pad(chapter.number)} · ${chapter.title}`));
      for (const beat of chapter.beats) {
        block.append(element("h3", undefined, beat.heading));
        block.append(element("p", undefined, beat.body));
      }
      container.append(block);
    }
  }

  private startStage(): void {
    try {
      this.stage = new StoryStage(this.canvas);
    } catch (cause) {
      this.showFallback(cause);
    }
  }

  private showFallback(cause: unknown): void {
    const shell = requireElement<HTMLElement>("story-app");
    shell.classList.add("story-fallback");
    requireElement<HTMLElement>("story-text").hidden = false;
    const message = element("p", "story-error");
    message.setAttribute("role", "alert");
    message.textContent = cause instanceof Error
      ? `The drawings could not start in this browser (${cause.message}). The story is available as text below.`
      : "The drawings could not start in this browser. The story is available as text below.";
    shell.prepend(message);
  }

  private bindInteraction(): void {
    this.scrubber.addEventListener("input", () => {
      this.setProgress(this.current.chapter, Number(this.scrubber.value));
    });
    this.scrubber.addEventListener("change", () => {
      const section = this.sections[this.current.chapter - 1];
      if (section === undefined) return;
      const available = Math.max(0, section.offsetHeight - window.innerHeight);
      window.scrollTo({
        top: section.offsetTop + available * Number(this.scrubber.value),
        behavior: this.reducedMotion.matches ? "auto" : "smooth",
      });
    });
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      requireElement<HTMLDetailsElement>("contents-menu").open = false;
    });
  }

  private createScrollStory(): void {
    const hero = document.querySelector<HTMLElement>(".story-hero");
    if (hero !== null) {
      ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        onUpdate: () => this.scheduleProgress(1, 0),
      });
    }
    this.sections.forEach((section, index) => {
      const number = index + 1;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: this.reducedMotion.matches ? false : 0.5,
        onUpdate: ({ progress }) => this.scheduleProgress(number, progress),
        onEnter: () => this.scheduleProgress(number, 0),
        onEnterBack: () => this.scheduleProgress(number, 1),
      });
    });
    ScrollTrigger.refresh();
  }

  private scheduleProgress(chapter: number, progress: number): void {
    // ScrollTrigger already coalesces updates on GSAP's ticker; drawing
    // directly keeps the picture one frame behind the scroll at most.
    this.setProgress(chapter, progress);
  }

  setProgress(chapterNumber: number, progress: number): SceneFrame {
    this.current = { chapter: chapterNumber, progress };
    const frame = sampleChapter(chapterNumber, progress);
    this.stage?.draw(frame);
    const chapter = STORY_CHAPTERS[chapterNumber - 1];
    if (chapter !== undefined) this.updateHud(chapter, progress, frame);
    this.updateHeroState();
    return frame;
  }

  private updateHeroState(): void {
    const hero = document.querySelector<HTMLElement>(".story-hero");
    if (hero === null) return;
    const inHero = window.scrollY < hero.offsetHeight * 0.62;
    requireElement<HTMLElement>("story-app").classList.toggle("is-hero", inHero);
  }

  /** Development hook: draw any chapter position without scrolling. */
  snapshot(chapterNumber: number, progress: number, width = 420): string {
    if (this.stage === undefined) throw new Error("No stage");
    this.setProgress(chapterNumber, progress);
    const source = this.stage.renderer.domElement;
    const scale = width / source.width;
    const thumbnail = document.createElement("canvas");
    thumbnail.width = width;
    thumbnail.height = Math.round(source.height * scale);
    const context = thumbnail.getContext("2d");
    if (context === null) throw new Error("No 2D context");
    context.fillStyle = "#f1eee5";
    context.fillRect(0, 0, thumbnail.width, thumbnail.height);
    context.drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
    return thumbnail.toDataURL("image/jpeg", 0.82);
  }

  private updateHud(chapter: Chapter, progress: number, frame: SceneFrame): void {
    this.text.set("chapter-number", pad(chapter.number));
    this.text.set("chapter-title", chapter.title);
    this.text.set("story-name", frame.readout.name);
    this.text.set("story-invitation", frame.readout.invitation);
    this.text.set("story-measure", frame.readout.measure);
    this.text.set("story-technical", frame.readout.detail);
    this.text.set("scrubber-label", `Try it: move through chapter ${pad(chapter.number)}`);
    const stats = requireElement<HTMLElement>("friendly-stats");
    if (frame.readout.counts === undefined) {
      stats.hidden = true;
    } else {
      stats.hidden = false;
      this.text.set("story-vertices", String(frame.readout.counts.vertices));
      this.text.set("story-edges", String(frame.readout.counts.edges));
      this.text.set("story-faces", String(frame.readout.counts.faces));
    }

    const percent = Math.round(progress * 100);
    this.scrubber.value = progress.toFixed(3);
    this.scrubber.setAttribute("aria-valuetext", `${String(percent)}% of chapter ${String(chapter.number)}`);

    this.updateMirrorRoom(frame);
    this.updateBeats(chapter, progress);
    this.railItems.forEach((item, index) => {
      item.toggleAttribute("data-active", index === chapter.number - 1);
      item.toggleAttribute("data-passed", index < chapter.number - 1);
    });
  }

  private updateMirrorRoom(frame: SceneFrame): void {
    const room = requireElement<HTMLElement>("mirror-room");
    if (frame.generator === undefined) {
      room.hidden = true;
      return;
    }
    room.hidden = false;
    const [a = 0, b = 0, c = 0] = frame.generator.distances;
    const sum = Math.max(a + b + c, 1e-9);
    const x = (a * 120 + b * 22 + c * 218) / sum;
    const y = (a * 18 + b * 166 + c * 166) / sum;
    const point = requireElement<SVGCircleElement>("story-generator");
    point.setAttribute("cx", x.toFixed(2));
    point.setAttribute("cy", y.toFixed(2));
    requireElement<SVGPathElement>("mirror-rays").setAttribute(
      "d",
      `M120 18 L${x.toFixed(1)} ${y.toFixed(1)} M22 166 L${x.toFixed(1)} ${y.toFixed(1)} M218 166 L${x.toFixed(1)} ${y.toFixed(1)}`,
    );
    this.text.set("mirror-room-label", frame.generator.room.split(" · ")[0] ?? "The mirror room");
    this.text.set("story-orbit", frame.generator.orbit === "chiral" ? "half the echoes" : "every echo");
  }

  private updateBeats(chapter: Chapter, progress: number): void {
    const active = activeBeat(chapter, progress);
    const key = `${String(chapter.number)}:${String(active)}`;
    if (key === this.lastBeatKey) return;
    this.lastBeatKey = key;
    for (const [number, articles] of this.beatArticles) {
      articles.forEach((article, index) => {
        const isCurrentChapter = number === chapter.number;
        article.hidden = !isCurrentChapter;
        article.toggleAttribute("data-active", isCurrentChapter && index === active);
      });
    }
  }

  private applyComposition(): void {
    if (this.stage === undefined) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(1, height);
    const portrait = width <= 920 && width < height;
    // Chapters are composed for a wide field. Portrait screens keep at least
    // 3.2 world units visible across, and lift the field above the copy.
    const frustumHeight = portrait ? Math.max(5.2, 3.2 / aspect) : 4.35;
    this.stage.setComposition({
      frustumHeight,
      horizontalShift: portrait ? 0 : aspect > 1.25 ? 0.55 : 0.2,
      verticalShift: portrait ? -0.09 * frustumHeight : 0,
    });
    this.stage.draw(sampleChapter(this.current.chapter, this.current.progress));
    ScrollTrigger.refresh();
  }

  private hideLoader(): void {
    const loader = requireElement<HTMLElement>("story-loader");
    loader.classList.add("is-done");
    window.setTimeout(() => {
      loader.hidden = true;
    }, this.reducedMotion.matches ? 0 : 520);
  }
}

declare global {
  interface Window {
    __orderInSpace?: ShapeStory;
  }
}

try {
  const story = new ShapeStory();
  if (import.meta.env.DEV) window.__orderInSpace = story;
} catch (cause) {
  const story = document.getElementById("story-app");
  const loader = document.getElementById("story-loader");
  if (loader !== null) loader.hidden = true;
  if (story !== null) {
    const message = document.createElement("p");
    message.className = "story-error";
    message.textContent = cause instanceof Error
      ? `The story could not begin: ${cause.message}`
      : "The story could not begin in this browser.";
    story.prepend(message);
  }
}
