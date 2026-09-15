# Milestone 7 report — Finish

**Status: complete (2026-09-09).**

## Captions

Every caption is generated from the frame it describes: corner angles, deficiencies, touch counts, shell radii, mirror distances, cell volume, and vertex/edge/face counts are read from the same geometry that is drawn. The chapter copy lives beside the scene models in `packages/scenes/src/chapters/` and is checked for presence and length by the story tests; its numerical claims (720°, 12/42/92, φ, thirty touches, 4√2·R³) are the quantities the tests assert.

## Responsive choreography

- Desktop (≥ 920 px): chapter copy on the left, a protected central-right field for the geometry, the object identity beneath it, the mirror-room inset top-right during Scene 6, a chapter rail on the right, and the chapter scrubber below.
- Portrait tablets and phones: the inset and rail step aside. The identity card and the chapter copy form one bottom block above a full-width scrubber, and the geometry gets its own band above them: the orthographic field is at least 3.2 world units wide and 6.4 tall, with its center lifted to about 35% of the screen height. Chapter 2 zooms less closely than before so the folding corner fits the band.
- Nav labels shorten on phones (Contents · Motion · Lab).
- Verified in the in-app browser at 1440×900 and 390×844, and in the app's own 528×863 pane, with no horizontal overflow.

## Reduced motion

Reduced motion is a real mode, not just shorter transitions. It follows the operating-system preference by default and can be switched either way with the **Reduce motion** toggle in the navigation; the choice is remembered in local storage. In this mode every chapter rests on one finished drawing per beat (`Chapter.stills`), so scrolling steps between still constructions instead of morphing them, scroll scrubbing and smooth scrolling are off, CSS transitions and the loader pulse are disabled, and the scrubber snaps to the same stills. The story tests check that each chapter offers exactly one still per beat.

## Loader, About, fallback

- A paper-colored loader covers the page until the stage has drawn its first frame, then fades.
- An About section closes the page: how the shapes are derived, the Critchlow source, the verification story, and the link to `/lab`.
- If WebGL cannot start, the stage is hidden, an alert explains why, and a text version of all nine chapters is revealed.

## Accessibility

Skip link, a Contents menu listing all chapters with anchors, a keyboard-operable range scrubber with `aria-valuetext`, live-region identity and chapter copy, a labelled canvas, 44 px navigation targets, and `prefers-reduced-motion` handling (no scrub smoothing, instant transitions, no loader animation).

## Performance and resources

- Quickhull replaces the exhaustive hull: dense generators rebuild in about 13 ms; the full test suite runs in under a second.
- Scene sampling is memoized by geometry key. Every frame element owns a slot on the stage; a slot keeps its materials for its whole life and only re-uploads geometry when the element's geometry key changes, so a solid that changes shape on every scroll frame (Scene 6) or a sheet that folds on every frame (Scene 2) never forces a shader rebuild. Opacity, scale, and visibility update in place; removed slots are disposed.
- In Scene 2 the folding sheet hands over to the solid in a single frame: its closed outline is drawn with the solid's own graphite and edge radius, so the corner does not change and only the rest of the solid appears. Nothing is ever drawn twice, and the sheet fill is unlit so a face passing edge-on never flips from lit to shadowed.
- Edge cylinders and struts always write depth; fills and sheets never do. This avoids the pop that occurs when a translucent edge suddenly starts occluding at half opacity.
- Translucent objects draw in a fixed order (guides, spheres, solids, sheets, struts), the sheet fill carries a negative depth offset so it never fights a coincident polyhedron face, and the camera depth range hugs the content (5 to 15 units) so mobile 16-bit depth buffers keep coincident planes apart.
- Story frames are drawn directly from ScrollTrigger's ticker; there is no free-running render loop.
- The production bundle keeps Three.js in one shared chunk (about 555 kB minified, 142 kB gzip), which still triggers Vite's 500 kB advisory; splitting it would not reduce what the first paint needs.

## Production checks

`npm run check` runs the dependency-boundary script (22 geometry and 7 render files), oxlint with warnings denied, strict TypeScript, 121 Vitest tests, the package builds, and the GitHub Pages build with root and `lab/` entries. Two GitHub Actions workflows run it: `ci.yml` on every pull request and non-main push, and `deploy-pages.yml` before every publish from `main`. The repository is MIT licensed.
