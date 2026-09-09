# Scenes package

Normalized-progress narrative choreography. The package consumes geometry types and constructions, but it does not own mathematical algorithms, import Three.js, or read browser scroll state. The application maps ScrollTrigger progress into these deterministic chapter models and draws the frames they return.

- `frame.ts`: the renderer-independent frame description and `frameSignature`, a geometry-only fingerprint used to prove seamless chapter boundaries and the exact return.
- `chapters/`: the nine chapter models, each a pure `sample(progress)` with its own copy.
- `story.ts`: chapter ordering, `sampleStory(globalProgress)` over 0–9, and beat selection.
- `world.ts`: shared radii, opacities, and the periodic camera drift.
