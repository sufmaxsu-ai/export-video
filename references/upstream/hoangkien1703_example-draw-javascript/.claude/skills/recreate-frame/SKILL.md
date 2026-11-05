---
name: recreate-frame
description: Recreate a still frame or illustration (from a screenshot or image) as a procedural canvas drawing in plain JavaScript, matching it as closely as possible with the pencil toolkit and the compare loop in this repo.
---

# Recreate a frame in JavaScript

Use this when someone gives you a screenshot or picture and asks you to redraw it in JavaScript. The goal is a drawing that reads the same as the reference at a glance and has the same texture up close. The finished example is `src/piano-cat.js`; read it before starting, it shows every technique below in use.

## Setup

Run `npm install` once. If `npx playwright install chromium` is not possible, find an existing Chromium and export `CHROMIUM_PATH` for every script call.

## Steps

1. **Crop the reference.** Look at the screenshot, find the frame's pixel box, and run
   `npm run crop -- --in <screenshot> --rect x,y,w,h`. Check `reference/ref.png` by viewing it. Do not commit it; it is someone else's artwork and `.gitignore` already excludes it.

2. **Measure.** Make the canvas the same size as `reference/ref.png`. List every object with its box in reference pixels and its main color. Sample colors by adding entries to `reference/points.json` and running `npm run compare` once you have any render. Compute repeating structures (keys, tiles, windows) from one measured period instead of placing each by eye.

3. **Write the scene.** Create `src/<name>.js` modeled on `src/piano-cat.js`: get helpers from `createPencil(canvas)`, write one function per object, and call them back to front in `draw(seed)`, which starts with `P.reset(seed)` and ends by setting `canvas.dataset.done = '1'` (the scripts wait for that). Point a copy of `index.html` at the new scene, or swap the script tag. Use only the toolkit's `rand`, `pick` and `random`, never `Math.random()`, so a seed always gives the same picture.

4. **First pass for placement.** Put everything on the canvas with rough fills before tuning any texture.

5. **Compare loop.** Run `npm run compare`, view `out/compare.png`, then zoom into areas with `npm run compare -- --crop x,y,w,h` and view `out/compare-crop.png`. Pick the one or two worst differences, fix them, and run again. Stop when the full view reads the same and the zoomed crops have the same stroke texture, usually after four to six rounds. Always look at the images; the color table only catches overall tone.

## Texture recipes

- Colored-pencil fill: `crayon` with short strokes (`len` about 6 to 35), `width` 1.2 to 3, and `tooth` 0.5 to 0.75.
- Directional hatching: set `angle`, keep `angleVar` small (0.05 to 0.25).
- Solid crayon with no visible direction: `angleVar` above 1 and high `density` (3 or more).
- Too dark or saturated: lower `alpha` and `density` first, then the color.
- Very dark areas (black fur): fill the shape solid at about 0.8 opacity, crayon over it, then scatter thousands of 0.4 to 1.3 px cream specks inside a clip of the shape.
- Paper objects lying on colored areas: an opaque fill first, then the pencil texture.
- Outlines: `pline` with low alpha and one or two passes.
- Finish with a light per-pixel grain over the whole canvas.

## Animating the scene

If asked for a video or animation, follow "Animate it" in the README and the code in `src/piano-cat.js`:

- Split each moving object into a function that draws it at rest; apply motion as transforms or offsets.
- Write `stateAt(t)` with every period dividing the loop length so it loops cleanly.
- Render at 12 fps and re-seed every frame (`P.seed`) so the lines boil.
- Cache anything slow: static background variants and one sprite per moving piece per variant. Aim for under 80 ms per frame so the page plays live.
- Expose `window.pianoCat`-style `{ FPS, FRAMES, renderFrame, ready }` so `npm run video` can export it, then view a contact sheet of a few frames before delivering.

## Deliverable

The scene file, the page that loads it, and a final `npm run compare` image to show the match. Mention what still differs from the reference.
