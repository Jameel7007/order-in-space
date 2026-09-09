# Milestone 7 report — Finish

**Status: complete (2026-09-09).**

## Captions

Every caption is generated from the frame it describes: corner angles, deficiencies, touch counts, shell radii, mirror distances, cell volume, and vertex/edge/face counts are read from the same geometry that is drawn. The chapter copy lives beside the scene models in `packages/scenes/src/chapters/` and is checked for presence and length by the story tests; its numerical claims (720°, 12/42/92, φ, thirty touches, 4√2·R³) are the quantities the tests assert.

## Responsive choreography

- Desktop (≥ 920 px): chapter copy on the left, a protected central-right field for the geometry, the object identity beneath it, the mirror-room inset top-right during Scene 6, a chapter rail on the right, and the chapter scrubber below.
- Portrait tablets and phones: the inset and rail step aside, the identity card sits top-right, chapter copy sits above a full-width scrubber at the bottom, and the orthographic frustum widens with a vertical offset so the geometry clears the copy.
- Verified in the in-app browser at 1440×900 and 390×844, and in the app's own 528×863 pane, with no horizontal overflow.

## Loader, About, fallback

- A paper-colored loader covers the page until the stage has drawn its first frame, then fades.
- An About section closes the page: how the shapes are derived, the Critchlow source, the verification story, and the link to `/lab`.
- If WebGL cannot start, the stage is hidden, an alert explains why, and a text version of all nine chapters is revealed.

## Accessibility

Skip link, a Contents menu listing all chapters with anchors, a keyboard-operable range scrubber with `aria-valuetext`, live-region identity and chapter copy, a labelled canvas, 44 px navigation targets, and `prefers-reduced-motion` handling (no scrub smoothing, instant transitions, no loader animation).

## Performance and resources

- Quickhull replaces the exhaustive hull: dense generators rebuild in about 13 ms; the full test suite runs in under a second.
- Scene sampling is memoized by geometry key; the renderer rebuilds Three.js objects only when a frame element's geometry changes and otherwise updates opacity, scale, and visibility in place. Removed elements are disposed.
- Story frames are drawn directly from ScrollTrigger's ticker; there is no free-running render loop.
- The production bundle keeps Three.js in one shared chunk (about 555 kB minified, 142 kB gzip), which still triggers Vite's 500 kB advisory; splitting it would not reduce what the first paint needs.

## Production checks

`npm run check` runs the dependency-boundary script (22 geometry and 7 render files), strict TypeScript, 112 Vitest tests, the package builds, and the GitHub Pages build with root and `lab/` entries. The GitHub Actions workflow repeats the same check before publishing.
