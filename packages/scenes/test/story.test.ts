import { describe, expect, it } from "vitest";

import {
  CHAPTER_COUNT,
  STORY_CHAPTERS,
  activeBeat,
  frameSignature,
  sampleChapter,
  sampleStory,
} from "../src/index.js";

describe("the nine-chapter argument", () => {
  it("has nine chapters in order with copy for every beat", () => {
    expect(STORY_CHAPTERS).toHaveLength(CHAPTER_COUNT);
    STORY_CHAPTERS.forEach((chapter, index) => {
      expect(chapter.number).toBe(index + 1);
      expect(chapter.beats.length).toBeGreaterThanOrEqual(3);
      expect(chapter.screens).toBeGreaterThanOrEqual(3);
      for (const beat of chapter.beats) {
        expect(beat.heading.length).toBeGreaterThan(10);
        expect(beat.body.length).toBeGreaterThan(20);
      }
      if (chapter.beatStarts !== undefined) {
        expect(chapter.beatStarts).toHaveLength(chapter.beats.length);
        expect([...chapter.beatStarts]).toEqual([...chapter.beatStarts].sort((a, b) => a - b));
      }
    });
  });

  it("is seamless at every chapter boundary", () => {
    for (let number = 1; number < CHAPTER_COUNT; number += 1) {
      const end = sampleChapter(number, 1);
      const next = sampleChapter(number + 1, 0);
      expect(frameSignature(next), `chapter ${String(number)} → ${String(number + 1)}`).toBe(frameSignature(end));
    }
  });

  it("returns exactly to the opening frame", () => {
    const opening = sampleStory(0).frame;
    const closing = sampleStory(CHAPTER_COUNT).frame;
    expect(frameSignature(closing)).toBe(frameSignature(opening));
    expect(opening.spheres).toHaveLength(1);
    expect(opening.solids).toHaveLength(0);
  });

  it("is deterministic in both scroll directions", () => {
    const stops = Array.from({ length: 91 }, (_, index) => index / 10);
    const forward = stops.map((stop) => frameSignature(sampleStory(stop).frame));
    const backward = [...stops].reverse().map((stop) => frameSignature(sampleStory(stop).frame)).reverse();
    expect(backward).toEqual(forward);
  });

  it("keeps camera zoom and focus continuous across all chapters", () => {
    let previous = sampleStory(0).frame.camera;
    for (let step = 1; step <= 900; step += 1) {
      const { camera } = sampleStory(step / 100).frame;
      expect(Math.abs(camera.zoom - previous.zoom)).toBeLessThan(0.08);
      expect(Math.abs(camera.yaw - previous.yaw)).toBeLessThan(0.08);
      expect(Math.abs(camera.pitch - previous.pitch)).toBeLessThan(0.05);
      previous = camera;
    }
  });

  it("clamps out-of-range progress", () => {
    expect(sampleStory(-4).chapter.number).toBe(1);
    expect(sampleStory(40).chapter.number).toBe(9);
    expect(sampleStory(Number.NaN).chapterProgress).toBe(0);
    expect(activeBeat(STORY_CHAPTERS[0] ?? STORY_CHAPTERS[0]!, 1)).toBe(2);
  });
});
