// Shared helpers for the render / compare / crop scripts. Everything runs in a
// headless Chromium via Playwright, so no image library is needed.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const OUT = path.join(ROOT, 'out');

export function args() {
  const a = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      a[k] = v;
    }
  }
  return a;
}

export async function browser() {
  // CHROMIUM_PATH lets you point at an existing Chromium instead of `npx playwright install chromium`.
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  return chromium.launch({ executablePath });
}

export function dataUrl(file) {
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function savePng(file, url) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}

// Render the scene page and return its canvas as a PNG data URL.
export async function renderScene(b, { page = 'index.html', seed } = {}) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1400 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const url = pathToFileURL(path.join(ROOT, page)).href + '?still' + (seed ? `&seed=${seed}` : '');
  await p.goto(url);
  try {
    await p.waitForFunction(() => document.querySelector('canvas')?.dataset.done === '1', null, { timeout: 60000 });
  } catch (e) {
    throw new Error(`Scene never finished drawing. Page errors: ${errors.join(' | ') || 'none'}`);
  }
  const png = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  await p.close();
  return png;
}

// Run a function inside a blank page that has the given images loaded as <img> elements.
export async function withImages(b, urls, fn, arg) {
  const p = await b.newPage();
  await p.setContent('<body></body>');
  const result = await p.evaluate(async ({ urls, fnSrc, arg }) => {
    const imgs = await Promise.all(urls.map(u => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u;
    })));
    return new Function('imgs', 'arg', `return (${fnSrc})(imgs, arg);`)(imgs, arg);
  }, { urls, fnSrc: fn.toString(), arg });
  await p.close();
  return result;
}
