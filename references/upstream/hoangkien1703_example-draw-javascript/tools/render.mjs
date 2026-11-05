// Render the scene to out/render.png.
//   npm run render                 default seed
//   npm run render -- --seed 42    another set of pencil strokes
import path from 'node:path';
import { args, browser, renderScene, savePng, OUT } from './lib.mjs';

const a = args();
const b = await browser();
const png = await renderScene(b, { page: a.page, seed: a.seed });
const file = path.join(OUT, 'render.png');
savePng(file, png);
await b.close();
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
