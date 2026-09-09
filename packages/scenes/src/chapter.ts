import type { SceneFrame } from "./frame.js";

export interface Beat {
  readonly eyebrow: string;
  readonly heading: string;
  readonly body: string;
}

export interface Chapter {
  readonly number: number;
  readonly id: string;
  readonly title: string;
  readonly kicker: string;
  readonly beats: readonly Beat[];
  /** Scroll length in viewport heights. */
  readonly screens: number;
  /** Chapter progress at which each beat begins; uniform when omitted. */
  readonly beatStarts?: readonly number[];
  /**
   * One resting progress per beat, showing that beat's finished state. When
   * motion is reduced the story jumps between these instead of morphing.
   */
  readonly stills?: readonly number[];
  sample(progress: number): SceneFrame;
}
