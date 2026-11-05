// Render the animation frame by frame and encode it with ffmpeg.
//   npm run video                 -> out/piano-cat.mp4
//   npm run video -- --gif        also out/piano-cat.gif (400px, for READMEs)
//   npm run video -- --loops 2    repeat the 8 s loop
// Needs ffmpeg on your PATH, or FFMPEG_PATH=/path/to/ffmpeg.
// Without ffmpeg the PNG frames are still written to out/frames/.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { args, browser, savePng, OUT, ROOT } from './lib.mjs';

const a = args();
const loops = Number(a.loops) || 1;
const framesDir = path.join(OUT, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const b = await browser();
const p = await b.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(pathToFileURL(path.join(ROOT, a.page || 'index.html')).href + '?export');
try {
  await p.waitForFunction(() => window.pianoCat?.ready, null, { timeout: 120000 });
} catch {
  throw new Error(`Animation never became ready. Page errors: ${errors.join(' | ') || 'none'}`);
}
const { FRAMES, FPS } = await p.evaluate(() => ({ FRAMES: pianoCat.FRAMES, FPS: pianoCat.FPS }));
const total = FRAMES * loops;
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const png = await p.evaluate(f => { pianoCat.renderFrame(f); return document.querySelector('canvas').toDataURL('image/png'); }, f);
  savePng(path.join(framesDir, String(f).padStart(4, '0') + '.png'), png);
  process.stdout.write(`\rframe ${f + 1}/${total}`);
}
await b.close();
console.log(`\nRendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const run = argv => spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...argv], { stdio: 'inherit' });
const input = ['-framerate', String(FPS), '-i', path.join(framesDir, '%04d.png')];
const mp4 = path.join(OUT, 'piano-cat.mp4');
const res = run([...input, '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', mp4]);
if (res.error || res.status !== 0) {
  console.error(`\nCould not run ffmpeg (${res.error ? res.error.message : 'exit ' + res.status}).`);
  console.error(`The frames are in ${path.relative(process.cwd(), framesDir)}. Encode them with:`);
  console.error(`  ffmpeg -framerate ${FPS} -i out/frames/%04d.png -r 24 -c:v libx264 -pix_fmt yuv420p out/piano-cat.mp4`);
  process.exit(1);
}
console.log(`Wrote ${path.relative(process.cwd(), mp4)}`);
if (a.gif) {
  const gif = path.join(OUT, 'piano-cat.gif');
  run([...input, '-vf', 'scale=400:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', gif]);
  console.log(`Wrote ${path.relative(process.cwd(), gif)}`);
}
