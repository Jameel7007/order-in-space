import type { Chapter } from "./chapter.js";
import { cellChapter } from "./chapters/cell.js";
import { closingChapter } from "./chapters/closing.js";
import { generatorChapter } from "./chapters/generator.js";
import { goldenChapter } from "./chapters/golden.js";
import { latticeChapter } from "./chapters/lattice.js";
import { returnChapter } from "./chapters/return.js";
import { spherepointChapter } from "./chapters/spherepoint.js";
import { twelveChapter } from "./chapters/twelve.js";
import { twinsChapter } from "./chapters/twins.js";
import { clamp01, type SceneFrame } from "./frame.js";
import { CHAPTER_COUNT } from "./world.js";

export const STORY_CHAPTERS: readonly Chapter[] = [
  spherepointChapter,
  closingChapter,
  twelveChapter,
  twinsChapter,
  goldenChapter,
  generatorChapter,
  latticeChapter,
  cellChapter,
  returnChapter,
];

if (STORY_CHAPTERS.length !== CHAPTER_COUNT) {
  throw new Error("The story must have exactly nine chapters");
}

export function chapterByNumber(number: number): Chapter {
  const chapter = STORY_CHAPTERS[number - 1];
  if (chapter === undefined) throw new Error(`No chapter ${String(number)}`);
  return chapter;
}

export function sampleChapter(number: number, progress: number): SceneFrame {
  return chapterByNumber(number).sample(clamp01(progress));
}

export interface StorySample {
  readonly chapter: Chapter;
  readonly chapterProgress: number;
  readonly frame: SceneFrame;
}

/**
 * Sample the whole argument with one number: 0 is the opening point, each
 * whole number is a chapter boundary, and 9 is the return to the opening.
 */
export function sampleStory(globalProgress: number): StorySample {
  const clamped = Number.isFinite(globalProgress)
    ? Math.min(CHAPTER_COUNT, Math.max(0, globalProgress))
    : 0;
  const index = Math.min(CHAPTER_COUNT - 1, Math.floor(clamped));
  const chapter = chapterByNumber(index + 1);
  const chapterProgress = clamp01(clamped - index);
  return { chapter, chapterProgress, frame: chapter.sample(chapterProgress) };
}

export function activeBeat(chapter: Chapter, progress: number): number {
  const count = chapter.beats.length;
  if (count === 0) return -1;
  if (chapter.beatStarts !== undefined) {
    let active = 0;
    chapter.beatStarts.forEach((start, index) => {
      if (progress >= start - 1e-9) active = index;
    });
    return active;
  }
  return Math.min(count - 1, Math.floor(clamp01(progress) * count));
}

/**
 * The resting position that stands in for `progress` when motion is reduced:
 * the still of the active beat, or the beat's start, or its midpoint.
 */
export function stillFor(chapter: Chapter, progress: number): number {
  const beat = activeBeat(chapter, progress);
  if (beat < 0) return clamp01(progress);
  const still = chapter.stills?.[beat];
  if (still !== undefined) return clamp01(still);
  const start = chapter.beatStarts?.[beat];
  if (start !== undefined) return clamp01(start);
  return Math.min(1, (beat + 0.5) / chapter.beats.length);
}

export const STORY_SCREENS = STORY_CHAPTERS.reduce((sum, { screens }) => sum + screens, 0);
