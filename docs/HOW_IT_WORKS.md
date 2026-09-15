# How it works

A plain-language tour of what happens when you scroll the page, written so the ideas can be explained without the code in front of you.

## The one rule behind everything

Nothing on the page is stored as a list of points. Every shape is calculated, on the spot, from a rule:

- **The regular and semi-regular solids** come from one point reflected in three mirrors. Put a point inside a triangular room whose walls are mirrors; the reflections of the reflections settle into a finite set of copies (24, 48, or 120 depending on the room). Join the copies with straight edges and you get a solid. Move the point and the solid changes shape; put it in a corner or on a wall and you get the famous named ones. Eighteen named solids, three rooms, one rule. The "snub" solids need one extra idea: keep only the copies made by turning, never by reflecting, then slide the point until every edge is the same length. The program finds that spot by searching, not by looking it up.
- **The packing shapes** come from equal spheres touching. Twelve spheres can touch one sphere; join their centres and you get the cuboctahedron. Take the middle sphere away and let the twelve pull inward until every neighbour touches and you get the icosahedron. Neither shape is drawn: they are what the touching implies.
- **The space cell** comes from fairness. Between a sphere and each of its twelve neighbours, draw a wall exactly halfway. The walls close into the rhombic dodecahedron, and identical cells fill space with no gaps.
- **Why only five regular solids** comes from folding paper. Lay regular polygons around one corner. They leave a gap; close the gap and the sheet lifts into a corner. Every closed solid spends exactly 720 degrees of gap in total (Descartes' theorem), which is why there are only five ways to do it.

## Three layers that are not allowed to mix

The code is split into three packages with a strict one-way dependency, and a script fails the build if anyone breaks it.

1. **geometry**: pure mathematics. Vectors, mirrors, reflection groups, convex hulls, sphere packing, half-space cuts, duality, the paper fold. It never imports Three.js or touches the browser, so every function can be tested with plain numbers.
2. **render**: turns abstract polyhedra into Three.js objects. Edges are instanced cylinders, faces are quiet fills, spheres are instanced meshes. It knows nothing about scrolling.
3. **scenes**: the nine chapters. Each chapter is a function: give it a number from 0 to 1 and it returns a description of what should be on screen (which solids, spheres, sheets, struts, camera pose, and captions). It never draws anything itself.

The page ties them together: scrolling produces the number, the chapter turns it into a frame, and a small "stage" draws the frame, reusing what is already on screen and only rebuilding geometry that actually changed.

## Why scrolling backwards works

Because a frame is a pure function of the scroll position, there is no animation state to unwind. Scroll up and you see the same pictures in reverse, exactly. Two tests make this a promise rather than a hope:

- Every chapter's last frame is compared with the next chapter's first frame by a geometry fingerprint. They must match, so chapters join without a seam.
- The final frame of the story is compared with the very first. They match too: the story really does return to the point.

## The reduced-motion mode

Some people prefer still images to continuous motion. The page follows the system setting and also offers a toggle. In that mode each chapter has one resting position per beat, and scrolling steps between those still drawings instead of morphing them.

## What the tests check

There are 121 automated checks. Some of the more telling ones:

- The three mirror rooms close at 24, 48, and 120 reflections.
- All eighteen named solids have the right number of corners, edges, and faces, equal edges, and one shared sphere.
- The snub solids' equal-edge search converges to a residual near zero.
- Twelve spheres touch the nucleus, twenty-four touch each other, and the shell tightens without any two spheres overlapping.
- Golden rectangles read from the icosahedron have the ratio 1.618 to nine decimal places.
- The paper fold closes onto the real corner of the real solid.
- Lattice shells hold 12, 42, and 92 spheres, following 10n² + 2.
- The space cell has the lattice's fair share of volume, 4√2 R³.
- Seeded random tests: any of the thirteen Archimedean solids, rotated at random and scaled anywhere from about 0.0003 to 3000, hulls back to the same topology with outward faces and 720° of deficiency; a generator dropped anywhere inside a mirror room gives the omnitruncated form; jittering a cube's corners keeps its six faces below the 1e-9 hull tolerance and triangulates them above it while always closing; and a generator walked towards a mirror keeps the truncated topology down to 1e-7 away, merges at 1e-8, and is the icosahedron below that. The seed is in every failure message, so a failing case can be replayed. This suite found a real bug: the outward-winding test used an absolute tolerance and failed on solids smaller than about 0.001.

## Things that went wrong, and what they taught

- A naive convex hull took 170 ms for a 120-corner solid, too slow for scrolling. Replacing it with quickhull brought it to about 13 ms.
- Three.js compiles "opaque" into a material's shader. When a solid sphere was later made translucent it stayed solid until the material was told to recompile.
- A lit, double-sided sheet flips from its bright top to its dark underside in the single frame it passes edge-on. Sheets that fold are drawn unlit.
- Fading one set of edges in over another identical set draws both at once and looks like jitter. The fold now hands over to the solid in one frame, with matching thickness and colour.
