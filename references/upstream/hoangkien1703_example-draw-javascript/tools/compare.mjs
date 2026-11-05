// Put the reference and your render side by side, and print how far apart their
// colors are in named regions. This is the loop: compare, fix the worst region, repeat.
//
//   npm run compare                          full frame -> out/compare.png
//   npm run compare -- --crop 0,60,500,500   zoom on one area -> out/compare-crop.png
//   npm run compare -- --ref other.png --seed 42
//
// Regions to measure live in reference/points.json:
//   [{ "name": "cat", "x": 300, "y": 180 }, ...]  (x, y in reference pixels; a 16px box is averaged)
import fs from 'node:fs';
import path from 'node:path';
import { args, browser, renderScene, withImages, dataUrl, savePng, OUT, ROOT } from './lib.mjs';

const a = args();
const refFile = path.resolve(ROOT, a.ref || 'reference/ref.png');
if (!fs.existsSync(refFile)) {
  console.error(`No reference image at ${path.relative(process.cwd(), refFile)}. See "Get the reference frame" in the README.`);
  process.exit(1);
}
const pointsFile = path.join(ROOT, 'reference/points.json');
const points = fs.existsSync(pointsFile) ? JSON.parse(fs.readFileSync(pointsFile, 'utf8')) : [];
const crop = a.crop ? String(a.crop).split(',').map(Number) : null;

const b = await browser();
const render = await renderScene(b, { page: a.page, seed: a.seed });
savePng(path.join(OUT, 'render.png'), render);

const res = await withImages(b, [dataUrl(refFile), render], (imgs, o) => {
  const [ref, out] = imgs;
  // scale the render to the reference size so coordinates line up
  const W = ref.naturalWidth, H = ref.naturalHeight;
  const grab = img => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H); return x; };
  const rc = grab(ref), oc = grab(out);
  const [cx, cy, cw, ch] = o.crop || [0, 0, W, H];
  const scale = Math.min(1, 900 / Math.max(cw, ch));
  const tw = Math.round(cw * scale), th = Math.round(ch * scale), gap = 12;
  const s = document.createElement('canvas'); s.width = tw * 2 + gap; s.height = th + 28;
  const sx = s.getContext('2d');
  sx.fillStyle = '#fff'; sx.fillRect(0, 0, s.width, s.height);
  sx.drawImage(rc.canvas, cx, cy, cw, ch, 0, 28, tw, th);
  sx.drawImage(oc.canvas, cx, cy, cw, ch, tw + gap, 28, tw, th);
  sx.fillStyle = '#222'; sx.font = '16px sans-serif';
  sx.fillText('reference', 6, 19); sx.fillText('render', tw + gap + 6, 19);
  const mean = (x, px, py) => {
    const d = x.getImageData(px - 8, py - 8, 16, 16).data; const m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; }
    return m.map(v => Math.round(v / (d.length / 4)));
  };
  const rows = o.points.map(p => {
    const r = mean(rc, p.x, p.y), m = mean(oc, p.x, p.y);
    return { name: p.name, ref: r, render: m, diff: Math.round(Math.hypot(r[0] - m[0], r[1] - m[1], r[2] - m[2])) };
  });
  return { png: s.toDataURL('image/png'), rows };
}, { crop, points });

const file = path.join(OUT, crop ? 'compare-crop.png' : 'compare.png');
savePng(file, res.png);
await b.close();
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
if (res.rows.length) {
  console.log('\nregion'.padEnd(18) + 'reference'.padEnd(18) + 'render'.padEnd(18) + 'distance');
  res.rows.sort((p, q) => q.diff - p.diff).forEach(r =>
    console.log(r.name.padEnd(17) + r.ref.join(',').padEnd(18) + r.render.join(',').padEnd(18) + r.diff));
  console.log('\nBiggest distance first. Under ~15 is hard to see.');
}
