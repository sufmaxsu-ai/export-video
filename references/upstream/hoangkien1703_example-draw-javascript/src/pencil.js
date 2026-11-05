// pencil.js: a tiny colored-pencil toolkit for <canvas>.
//
// createPencil(canvas) returns helpers that draw with a seeded random generator:
//   crayon(shape, box, opts)  fill a shape with many short strokes, then knock the paper tooth out
//   pline(x1, y1, x2, y2, o)  a wobbly graphite line with broken pressure
//   roughPoly / roughRect     jittered outlines so edges look hand drawn
//   reset(seed)               re-seed the generator and rebuild the paper-tooth mask
//   seed(s)                   re-seed only (for animation frames)
// Same seed + same call order = the same picture, pixel for pixel.
(function (global) {
function createPencil(canvas) {
const W = canvas.width, H = canvas.height;
const ctx = canvas.getContext('2d');

let R;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = (a, b) => a + (b - a) * R();
const pick = arr => arr[Math.floor(R() * arr.length)];

// ---------- paper tooth: a speckle mask used to knock holes in pencil layers ----------
const TP = 256;
const tooth = document.createElement('canvas');
tooth.width = W + TP; tooth.height = H + TP;
function buildTooth() {
  const tc = tooth.getContext('2d');
  const w = tooth.width, h = tooth.height;
  const img = tc.createImageData(w, h);
  const d = img.data;
  // coarse cells so specks clump like paper grain
  const cw = Math.ceil(w / 2) + 1, ch = Math.ceil(h / 2) + 1;
  const coarse = new Float32Array(cw * ch);
  for (let i = 0; i < coarse.length; i++) coarse[i] = R();
  const cw3 = Math.ceil(w / 5) + 1, ch3 = Math.ceil(h / 5) + 1;
  const big = new Float32Array(cw3 * ch3);
  for (let i = 0; i < big.length; i++) big[i] = R();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = 0.45 * coarse[(y >> 1) * cw + (x >> 1)] + 0.35 * R() + 0.2 * big[((y / 5) | 0) * cw3 + ((x / 5) | 0)];
      const a = Math.max(0, Math.min(1, (n - 0.5) * 3.2));
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = a * 255;
    }
  }
  tc.putImageData(img, 0, 0);
}

// ---------- offscreen layer for one crayon fill ----------
const layer = document.createElement('canvas');
layer.width = W; layer.height = H;
const lx = layer.getContext('2d');

function col(c, a, dl = 0) {
  return `rgba(${Math.round(c[0] + dl)},${Math.round(c[1] + dl)},${Math.round(c[2] + dl)},${a})`;
}

// rough polygon helpers ----------------------------------------------------
function roughPoly(pts, j = 1.5, step = 14) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([x1 + (x2 - x1) * t + rand(-j, j), y1 + (y2 - y1) * t + rand(-j, j)]);
    }
  }
  return out;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function polyPath(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function roughRect(x, y, w, h, j = 1.5) { const p = roughPoly(rectPts(x, y, w, h), j); return c => polyPath(c, p); }

// ---------- crayon fill: many short strokes clipped to a shape, then paper tooth removed ----------
function crayon(shape, box, o) {
  const opt = Object.assign({
    color: [0, 0, 0], angle: 0, angleVar: 0.12, len: [20, 60], width: [1, 2.2],
    alpha: [0.35, 0.8], density: 1, tooth: 0.6, light: 10, curve: 3, pad: 10
  }, o);
  const [bx, by, bw, bh] = box;
  lx.clearRect(bx - 20, by - 20, bw + 40, bh + 40);
  lx.save();
  lx.beginPath(); shape(lx); lx.clip();
  const avgL = (opt.len[0] + opt.len[1]) / 2, avgW = (opt.width[0] + opt.width[1]) / 2;
  const n = Math.round((bw * bh) / (avgL * avgW) * opt.density * 1.4);
  lx.lineCap = 'round';
  const cols = opt.colors || [opt.color];
  for (let i = 0; i < n; i++) {
    const cx = rand(bx - opt.pad, bx + bw + opt.pad), cy = rand(by - opt.pad, by + bh + opt.pad);
    const a = opt.angle + rand(-opt.angleVar, opt.angleVar) + (opt.cross && R() < opt.cross ? opt.crossAngle : 0);
    const L = rand(opt.len[0], opt.len[1]);
    const dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    const bend = rand(-opt.curve, opt.curve);
    lx.strokeStyle = col(pick(cols), rand(opt.alpha[0], opt.alpha[1]), rand(-opt.light, opt.light));
    lx.lineWidth = rand(opt.width[0], opt.width[1]);
    lx.beginPath();
    lx.moveTo(cx - dx, cy - dy);
    lx.quadraticCurveTo(cx - dy / L * bend * 2, cy + dx / L * bend * 2, cx + dx, cy + dy);
    lx.stroke();
  }
  lx.restore();
  if (opt.tooth > 0) {
    lx.save();
    lx.globalCompositeOperation = 'destination-out';
    lx.globalAlpha = opt.tooth;
    lx.beginPath(); lx.rect(bx - 20, by - 20, bw + 40, bh + 40); lx.clip();
    lx.drawImage(tooth, -rand(0, TP), -rand(0, TP));
    lx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = opt.blend || 'source-over';
  ctx.drawImage(layer, bx - 20, by - 20, bw + 40, bh + 40, bx - 20, by - 20, bw + 40, bh + 40);
  ctx.restore();
}

// graphite line: a couple of wobbly passes with broken pressure
function pline(x1, y1, x2, y2, o = {}) {
  const c = o.color || [90, 88, 85], w = o.width || 1.2, a = o.alpha || 0.7, passes = o.passes || 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const seg = Math.max(1, Math.round(len / 18));
  ctx.save(); ctx.lineCap = 'round';
  for (let p = 0; p < passes; p++) {
    const off = rand(-0.6, 0.6);
    let px = x1, py = y1 + off;
    for (let s = 1; s <= seg; s++) {
      const t = s / seg;
      const nx = x1 + (x2 - x1) * t + rand(-0.5, 0.5), ny = y1 + (y2 - y1) * t + off + rand(-0.5, 0.5);
      ctx.strokeStyle = col(c, a * rand(0.45, 1));
      ctx.lineWidth = w * rand(0.7, 1.15);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      px = nx; py = ny;
    }
  }
  ctx.restore();
}

function reset(seed) { R = mulberry32(seed); buildTooth(); }
// re-seed only, keeping the paper-tooth mask (cheap; use it between animation frames)
function seed(s) { R = mulberry32(s); }

return { W, H, ctx, reset, seed, random: () => R(), rand, pick, col, roughPoly, rectPts, polyPath, roughRect, crayon, pline };
}
global.createPencil = createPencil;
})(window);
