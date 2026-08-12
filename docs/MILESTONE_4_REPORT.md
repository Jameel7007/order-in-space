# Milestone 4 — Visual language

**Status: complete (2026-08-12).**

Milestone 4 locks a restrained, construction-led visual system for the geometry laboratory. The interface is deliberately closer to a working drawing and editorial plate than a generic 3D configurator: warm paper, graphite structure, one muted oxide accent, orthographic projection, and compact typographic evidence around the rendered form.

## Locked visual system

- **Edges:** instanced, rough, flat-shaded graphite cylinders; radius tapers with edge count so the 180-edge truncated icosidodecahedron remains legible.
- **Faces:** warm neutral supporting planes at low opacity, with polygon offset to prevent surface fighting and keep edges dominant.
- **Construction guide:** three quiet great circles expose the active circumsphere or cell radius without becoming another solid surface.
- **Ground:** warm paper with a low-contrast masked grid and center mark; no bloom, particles, neon, or ornamental atmosphere.
- **Lighting:** one warm key, a restrained cool fill, and ambient contribution under neutral tone mapping.
- **Camera:** orthographic projection, slow damped orbit, no pan, bounded zoom, and an asymmetric mobile frustum that reserves the lower field for the topology plate.
- **Typography:** Georgia for authored titles and object names; system sans for explanatory copy; monospaced numerals for topology and measured state.

## Interaction and information hierarchy

The former mode dropdown is now a three-part study switcher:

1. **Generator** — mirror family, named position, Wythoff diagram, mirror distances, orbit order, and a plain-language construction state.
2. **Packing** — shell contraction, explicit construction stages, contact count, nucleus state, and optional face-center dual.
3. **Space cell** — FCC-to-Voronoi derivation ledger showing the 12 centers, 12 bisector planes, 14 vertices, and 12 rhombic faces.

Every study updates the title plate, construction caption, guide label, topology counts, and shareable URL. The drawing controls use explicit labels, visible keyboard focus, 44 px primary targets, and 40 px toggle rows. Automatic rotation remains opt-in and is disabled when reduced motion is requested.

## Deterministic visual fixtures

These URL states are the visual-regression baseline. Paths are relative to `/order-in-space/lab/` in the GitHub Pages deployment.

- `?mode=wythoff&solid=p%3Aicosahedron` — primary edge, face, sphere-guide, and topology-plate fixture.
- `?mode=wythoff&solid=a%3AtruncatedIcosidodecahedron` — dense 120-vertex / 180-edge / 62-face readability fixture.
- `?mode=wythoff&solid=a%3AsnubDodecahedron&faces=0&vertices=1` — chiral orbit and vertex-point fixture.
- `?mode=packing&solid=p%3Aicosahedron&t=0.000` — twelve-around-one contact-shell fixture.
- `?mode=packing&solid=p%3Aicosahedron&t=1.000&dual=1` — golden closure with face-center dual fixture.
- `?mode=fcc&solid=p%3Aicosahedron` — dense nested packing and derived Voronoi-cell fixture.

## Validation

- Browser visual checks at 1440×900, the app's natural 551×798 viewport, and 390×844.
- Generator, packing, and FCC studies exercised independently.
- Dense 180-edge fixture checked on desktop and mobile.
- No horizontal overflow at phone width; the desktop control column scrolls independently when required.
- Reduced-motion CSS and runtime rotation gating remain active.
- Renderer disposal now includes line-based construction guides.
- 49 unit tests pass; TypeScript and the production build pass.

The renderer is now stable enough for Milestone 5 scene choreography without reinventing its visual language per scene.
