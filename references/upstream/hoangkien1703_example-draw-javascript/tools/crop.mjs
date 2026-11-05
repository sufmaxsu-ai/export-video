// Cut the video frame out of a phone screenshot so it can be used as the reference.
//   npm run crop -- --in screenshot.jpg --rect 44,912,1177,1176
// Writes reference/ref.png. Find the rect by opening the screenshot in any image
// viewer and reading off the frame's top-left corner, width and height.
import path from 'node:path';
import { args, browser, withImages, dataUrl, savePng, ROOT } from './lib.mjs';

const a = args();
if (!a.in || !a.rect) {
  console.error('Usage: npm run crop -- --in <screenshot> --rect x,y,w,h [--out reference/ref.png]');
  process.exit(1);
}
const [x, y, w, h] = String(a.rect).split(',').map(Number);
const b = await browser();
const png = await withImages(b, [dataUrl(a.in)], (imgs, r) => {
  const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
  c.getContext('2d').drawImage(imgs[0], r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return c.toDataURL('image/png');
}, { x, y, w, h });
const out = path.resolve(ROOT, a.out || 'reference/ref.png');
savePng(out, png);
await b.close();
console.log(`Wrote ${path.relative(process.cwd(), out)} (${w}x${h})`);
