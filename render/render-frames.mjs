#!/usr/bin/env node
/* =====================================================================
 * render-frames.mjs — Chromium headless (Playwright) : dessine et capture
 * CHAQUE image individuellement via le contrat window.__anim.
 *
 *   node render/render-frames.mjs <source.html> <dossier_sortie> [options]
 *     --only 0,48,96     ne rendre que ces images
 *     --start N --end M  plage d'images
 *     --jpeg             JPEG (q=95) au lieu de PNG
 *
 * Contrat attendu dans la page (compatible code-animations / hand-drawn) :
 *   window.__anim = { fps, frames | duration, width, height, canvas,
 *                     drawFrame(i) | seek(t), marks?, exposureSheet? }
 * La page peut lire ?capture=1 pour masquer son interface.
 * ===================================================================== */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flags = {}; const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { const k = args[i].slice(2); if (['jpeg'].includes(k)) flags[k] = true; else flags[k] = args[++i]; }
  else pos.push(args[i]);
}
if (pos.length < 2) { console.error('Usage: node render-frames.mjs <source.html|URL> <out_dir> [--only a,b] [--start N --end M] [--jpeg]'); process.exit(2); }
const [src, outDir] = pos;
const url = /^https?:\/\//.test(src) ? src : pathToFileURL(path.resolve(src)).href;
if (!/^https?:/.test(src) && !existsSync(src)) { console.error(`Source introuvable : ${src}`); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const sep = url.includes('?') ? '&' : '?';
  await page.goto(url + sep + 'capture=1', { waitUntil: 'load' });
  await page.waitForFunction('window.__anim && (window.__anim.ready !== false)', null, { timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const meta = await page.evaluate(() => {
    const a = window.__anim;
    const fps = a.fps || 24, frames = a.frames || Math.round((a.duration || 0) * fps);
    return { fps, frames, width: a.width || a.canvas.width, height: a.height || a.canvas.height, drawings: a.drawings || null,
      hasDraw: typeof a.drawFrame === 'function', hasSeek: typeof a.seek === 'function', marks: a.marks || [], beats: a.beats || [],
      exposure: typeof a.exposureSheet === 'function' ? a.exposureSheet() : null };
  });
  if (!meta.hasDraw && !meta.hasSeek) throw new Error('La page ne fournit ni __anim.drawFrame(i) ni __anim.seek(t).');
  if (!meta.frames) throw new Error('Nombre d’images inconnu (__anim.frames ou __anim.duration manquant).');
  console.log(`Source : ${src}\n  ${meta.width}x${meta.height} · ${meta.fps} i/s · ${meta.frames} images${meta.drawings ? ` · ${meta.drawings} dessins uniques` : ''}`);
  writeFileSync(path.join(outDir, 'render-meta.json'), JSON.stringify({ source: src, fps: meta.fps, frames: meta.frames, width: meta.width, height: meta.height, drawings: meta.drawings }, null, 2));
  if (meta.marks.length) writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(meta.marks, null, 1));
  if (meta.exposure) writeFileSync(path.join(outDir, 'exposure.json'), JSON.stringify(meta.exposure, null, 1));
  if (meta.beats.length) writeFileSync(path.join(outDir, 'beats.json'), JSON.stringify(meta.beats, null, 1));

  let list;
  if (flags.only) list = flags.only.split(',').map(Number);
  else { const a = +(flags.start || 0), b = flags.end !== undefined ? +flags.end : meta.frames - 1; list = []; for (let i = a; i <= b; i++) list.push(i); }
  const type = flags.jpeg ? 'image/jpeg' : 'image/png', ext = flags.jpeg ? 'jpg' : 'png';
  const t0 = Date.now();
  for (const [k, i] of list.entries()) {
    const data = await page.evaluate(([i, type, fps]) => {
      const a = window.__anim;
      if (typeof a.drawFrame === 'function') a.drawFrame(i); else a.seek(i / fps);
      return a.canvas.toDataURL(type, 0.95);
    }, [i, type, meta.fps]);
    writeFileSync(path.join(outDir, `${String(i).padStart(5, '0')}.${ext}`), Buffer.from(data.split(',')[1], 'base64'));
    if (errors.length) throw new Error(`Image ${i} : ${errors.join('\n')}`);
    if ((k + 1) % 24 === 0 || k === list.length - 1) console.log(`  image ${k + 1}/${list.length} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
} finally { await browser.close(); }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
