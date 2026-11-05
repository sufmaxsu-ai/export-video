/* =====================================================================
 * core.js — moteur de dessin "à la main" (Canvas 2D, zéro dépendance)
 * Mamie & le gâteau — film dessiné image par image.
 *
 * Techniques retenues (voir SKILLS_USAGE_NOTES.md) :
 *  - hand-drawn-canvas-animation / hand-drawn-film : feuille d'exposition
 *    (twos / ones), graine par DESSIN (pas par image de sortie), IK de contact
 *    qui ne rallonge jamais les os, rubans encrés à pression variable.
 *  - code-animations : contrat window.__anim, seek(t) pur, rngFor(clé).
 *  - ClaudeAnimationBase : "boil" — chaque nouveau dessin re-trace les traits.
 *  - example-draw-javascript : remplissage crayon (traits courts clipés).
 * ===================================================================== */
(function (G) {
  'use strict';
  const W = 1080, H = 1920, FPS = 24, DURATION = 8, NFRAMES = FPS * DURATION;
  Object.assign(G, { W, H, FPS, DURATION, NFRAMES });

  /* ---------- hasard déterministe ---------- */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return h >>> 0;
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // S.drawing = numéro du dessin courant (feuille d'exposition). Un dessin tenu
  // deux images garde exactement les mêmes traits ; un nouveau dessin les re-trace.
  const S = { drawing: 0, boil: 1 };
  const rnd = key => mulberry(hashStr(key + '#' + S.drawing));
  const rndStatic = key => mulberry(hashStr(String(key)));

  /* ---------- maths & easing ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const E = {
    lin: u => u,
    io: u => 0.5 - 0.5 * Math.cos(Math.PI * u),          // slow in / slow out
    out: u => 1 - (1 - u) * (1 - u),                       // cushion into the end
    in: u => u * u,                                        // leave gently
    out3: u => 1 - Math.pow(1 - u, 3),
    back: u => { const c = 1.6; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
    hold: u => (u < 1 ? 0 : 1)
  };
  const lerpV = (a, b, u) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], u)) : lerp(a, b, u));
  /** keys: [[t, valeur, ease?], ...] — ease de la clé d'ARRIVÉE. Valeurs nombres ou tableaux. */
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        const u = (E[b[2] || 'io'])((t - a[0]) / (b[0] - a[0]));
        return lerpV(a[1], b[1], u);
      }
    }
    return keys[keys.length - 1][1];
  }
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, k) => [a[0] * k, a[1] * k],
    len: a => Math.hypot(a[0], a[1]),
    norm: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
    perp: a => [-a[1], a[0]],
    rot: (a, r) => [a[0] * Math.cos(r) - a[1] * Math.sin(r), a[0] * Math.sin(r) + a[1] * Math.cos(r)],
    mix: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1]
  };

  /* ---------- IK deux os (genou / coude) ----------
   * Les longueurs sont conservées ; une cible hors d'atteinte est bornée (jamais
   * d'os élastique). `pref` = direction préférée de l'articulation, ce qui
   * garantit le bon sens des articulations (genou vers l'avant, coude vers l'arrière). */
  function ik(root, target, a, b, pref) {
    const d0 = V.sub(target, root), want = V.len(d0);
    const d = clamp(want, Math.abs(a - b) + 0.01, a + b - 0.01);
    const u = want > 1e-6 ? V.mul(d0, 1 / want) : [0, 1];
    const along = (a * a - b * b + d * d) / (2 * d);
    const side = Math.sqrt(Math.max(0, a * a - along * along));
    const n = V.perp(u);
    const j1 = V.add(root, V.add(V.mul(u, along), V.mul(n, side)));
    const j2 = V.add(root, V.add(V.mul(u, along), V.mul(n, -side)));
    const mid = V.add(root, V.mul(u, along));
    const joint = V.dot(V.sub(j1, mid), pref) >= V.dot(V.sub(j2, mid), pref) ? j1 : j2;
    return { joint, end: V.add(root, V.mul(u, d)), error: want - d };
  }

  /* ---------- courbes ---------- */
  function sampleCR(pts, closed, steps) {
    const n = pts.length, out = [];
    if (n < 3) return pts.slice();
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function sampleLin(pts, closed, steps) {
    const out = [], n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      for (let k = 0; k < steps; k++) out.push(V.mix(a, b, k / steps));
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  function ell(cx, cy, rx, ry, rot = 0, n = 18, a0 = 0, a1 = Math.PI * 2) {
    const pts = [], full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
    const cnt = full ? n : n + 1;
    for (let i = 0; i < cnt; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return pts;
  }

  /* ---------- palette ---------- */
  const INK = '#3a281f';
  const PAL = {
    ink: INK, inkSoft: '#6b4a3a',
    wall: '#f4e2bf', wallDeep: '#ead2a6', sprig: '#d98f72', sprigLeaf: '#9cb37c',
    wains: '#a9c29a', wainsDeep: '#8fae84', beam: '#8d5b3a', beamDeep: '#6e4329',
    floorA: '#d08458', floorB: '#e7a877', floorSun: '#f3c48d',
    sky: '#bfe3ee', skyLow: '#e9f4e6', cloud: '#fffaf0', hill: '#a6cf86', hillFar: '#c4dfa2',
    grass: '#8cc06b', grassDeep: '#74aa58', tree: '#5f9a4f', treeDeep: '#4b8040', trunk: '#8a5d3d',
    frame: '#6f93ae', frameDeep: '#577a94',
    wood: '#c48a59', woodDeep: '#a26c40', cab: '#a9d0bb', cabDeep: '#8bb9a2',
    enamel: '#f2e6cc', enamelDeep: '#d9c7a4', ovenDark: '#4a2b22', glow: '#ff9b4a', glowHot: '#ffd27a',
    cloth: '#fbf4e6', check: '#e0685c', plate: '#fffdf6', plateRim: '#9fc6d6',
    skin: '#f2c6a2', skinDeep: '#e3a984', cheek: '#ef9c8e', kidSkin: '#f3c39b',
    grannyHair: '#eceaf0', grannyHairDeep: '#c9c5d3', dress: '#d98a8f', dressDeep: '#bf6f76',
    cardi: '#5f9e9b', cardiDeep: '#4a8481', apron: '#fffaf0', apronDot: '#e36b62', slipper: '#8c3b47', stocking: '#e7c0a1',
    leoHair: '#7b4a2b', leoShirt: '#fbf3e6', leoStripe: '#d9534b', shorts: '#4f6fa8', sneaker: '#fffaf2', sneakerAccent: '#5aa36a',
    linaHair: '#4a3025', linaDress: '#f2b93f', linaDressDeep: '#d99d2a', ribbon: '#d8463f', sock: '#fffaf2', shoe: '#c9413c',
    cake: '#e8b15e', cakeTop: '#c97d35', sponge: '#f6d68f', cream: '#fff6e8', berry: '#e2373b', leaf: '#5aa34b',
    batter: '#f3d38c', tin: '#b9b4ad', tinDeep: '#8f8a84', mitt: '#d9463e', mittCheck: '#fff3e2',
    cat: '#e79a50', catStripe: '#c06f2c', basket: '#c9965a', basketDeep: '#a87642', cushion: '#7fb2d8',
    paperGrain: '#7a5a3c'
  };

  /* ---------- trait encré à pression variable (ruban) ---------- */
  function ribbon(ctx, P, closed, lw, color, key, taper) {
    const n = P.length; if (n < 2) return;
    const r = rnd(key + ':w');
    const ph1 = r() * 6.28, ph2 = r() * 6.28, f1 = 1.5 + r() * 2, f2 = 4 + r() * 4;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const t = V.norm(V.sub(b, a)), nn = V.perp(t), u = i / (n - 1);
      let w = lw * (0.78 + 0.22 * Math.sin(u * f1 * 6.28 + ph1) + 0.12 * Math.sin(u * f2 * 6.28 + ph2));
      if (!closed && taper) w *= Math.min(1, 0.25 + u * 5, 0.25 + (1 - u) * 4);
      w = Math.max(0.35, w) / 2;
      L.push([P[i][0] + nn[0] * w, P[i][1] + nn[1] * w]); R.push([P[i][0] - nn[0] * w, P[i][1] - nn[1] * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    if (closed) { ctx.lineTo(L[0][0], L[0][1]); ctx.moveTo(R[0][0], R[0][1]); }
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    if (closed) ctx.lineTo(R[n - 1][0], R[n - 1][1]);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(closed ? 'evenodd' : 'nonzero');
  }

  function trace(ctx, P) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); }

  /**
   * shape(ctx, points, options) — LA primitive de dessin : chaque forme est
   * re-tracée à la main pour chaque nouveau dessin (jitter des points de
   * contrôle selon la graine du dessin), remplie d'aplat opaque puis encrée.
   * Retourne la polyligne dense (utile pour clip / crayon).
   */
  function shape(ctx, pts, o = {}) {
    const closed = o.closed !== false, jit = (o.jit === undefined ? 1.6 : o.jit) * S.boil;
    const key = o.key || 'k';
    let p = pts;
    if (jit > 0) { const r = rnd(key); p = pts.map(q => [q[0] + (r() * 2 - 1) * jit, q[1] + (r() * 2 - 1) * jit]); }
    const P = o.smooth === false ? sampleLin(p, closed, o.steps || 1) : sampleCR(p, closed, o.steps || 5);
    if (o.fill) {
      ctx.beginPath(); trace(ctx, P); if (closed) ctx.closePath();
      ctx.fillStyle = o.fill; ctx.fill();
      if (o.crayon) crayon(ctx, P, o.crayon, key);
    }
    const lw = o.lw === undefined ? 3.2 : o.lw;
    if (lw > 0) {
      ribbon(ctx, P, closed, lw, o.ink || INK, key, o.taper !== false);
      if (o.sketch) { // repasse de crayon légère et partielle
        const r = rnd(key + ':sk'), a = Math.floor(r() * P.length * 0.5), b = Math.min(P.length, a + Math.floor(P.length * (0.25 + r() * 0.3)));
        const off = [(r() - 0.5) * 3, (r() - 0.5) * 3];
        const Q = P.slice(a, b).map(q => [q[0] + off[0], q[1] + off[1]]);
        if (Q.length > 2) { ctx.globalAlpha = 0.45; ribbon(ctx, Q, false, lw * 0.45, o.ink || INK, key + ':sk2', true); ctx.globalAlpha = 1; }
      }
    }
    return P;
  }
  /** ligne ouverte encrée (cheveux, plis, détails) */
  function line(ctx, pts, lw = 2.4, color = INK, key = 'l', jit = 1.2, smooth = true) {
    let p = pts;
    if (jit > 0) { const r = rnd(key); p = pts.map(q => [q[0] + (r() * 2 - 1) * jit * S.boil, q[1] + (r() * 2 - 1) * jit * S.boil]); }
    const P = smooth && p.length > 2 ? sampleCR(p, false, 5) : sampleLin(p, false, 6);
    ribbon(ctx, P, false, lw, color, key, true);
  }
  /** texture crayon : traits courts clipés dans la forme (re-tirés à chaque dessin) */
  function crayon(ctx, P, c, key) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of P) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const area = (x1 - x0) * (y1 - y0); if (area < 30) return;
    const r = rnd(key + ':cr'), dens = c.density || 1, len = c.len || 18;
    const n = Math.min(c.max || 900, Math.round(area / (len * 9) * dens));
    ctx.save(); ctx.beginPath(); trace(ctx, P); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = c.color; ctx.lineCap = 'round'; ctx.lineWidth = c.width || 2;
    ctx.globalAlpha = c.alpha || 0.18;
    const ang = c.angle === undefined ? -0.9 : c.angle;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const cx = lerp(x0, x1, r()), cy = lerp(y0, y1, r()), a = ang + (r() - 0.5) * 0.35, L = len * (0.5 + r());
      const dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
      ctx.moveTo(cx - dx, cy - dy); ctx.quadraticCurveTo(cx + (r() - 0.5) * 4, cy + (r() - 0.5) * 4, cx + dx, cy + dy);
    }
    ctx.stroke(); ctx.restore();
  }
  /** points de texture (grain, pois) */
  function dots(ctx, P, color, n, rad, key) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of P) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const r = rnd(key + ':dt');
    ctx.save(); ctx.beginPath(); trace(ctx, P); ctx.closePath(); ctx.clip(); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(lerp(x0, x1, r()), lerp(y0, y1, r()), rad * (0.6 + r() * 0.7), 0, 6.283); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- papier : une seule graine, enregistré sur la feuille ---------- */
  let paper = null;
  function paperPattern(ctx) {
    if (paper) return paper;
    const c = document.createElement('canvas'); c.width = c.height = 384;
    const x = c.getContext('2d'), r = rndStatic('paper-grain'), img = x.createImageData(384, 384);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + r() * 55 + (r() < 0.02 ? -60 : 0);
      img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // fibres
    x.strokeStyle = 'rgba(120,90,60,0.10)'; x.lineWidth = 1;
    for (let i = 0; i < 160; i++) { const px = r() * 384, py = r() * 384, a = r() * 6.28; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); x.stroke(); }
    paper = ctx.createPattern(c, 'repeat');
    return paper;
  }

  /* ---------- lettrage à la main (lettre par lettre) ---------- */
  function letters(ctx, text, x, y, size, color, key, progress = 1) {
    ctx.save(); ctx.font = `700 ${size}px "Comic Sans MS","Chalkboard SE","Comic Neue","DejaVu Sans",sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const chars = [...text], widths = chars.map(ch => ctx.measureText(ch).width * 1.02), total = widths.reduce((a, b) => a + b, 0);
    let cx = x - total / 2; const r = rnd(key), shown = Math.ceil(chars.length * progress);
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i], jx = (r() - 0.5) * 3, jy = (r() - 0.5) * 5, ro = (r() - 0.5) * 0.16;
      if (i < shown && chars[i] !== ' ') {
        ctx.save(); ctx.translate(cx + w / 2 + jx, y + jy + Math.sin(i * 1.7) * 4); ctx.rotate(ro);
        ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#fffaf0'; ctx.lineJoin = 'round'; ctx.strokeText(chars[i], 0, 0);
        ctx.fillStyle = color; ctx.fillText(chars[i], 0, 0); ctx.restore();
      }
      cx += w;
    }
    ctx.restore();
  }

  /* ---------- feuille d'exposition ---------- */
  // Segments en secondes alignés sur les images : on:2 = "en deux" (12 dessins/s),
  // on:1 = "en un" (24 dessins/s) pour les actions rapides (course, saut).
  function buildExposure(segments) {
    const tOf = [], drawOf = [];
    let last = -1, id = -1;
    for (let f = 0; f < NFRAMES; f++) {
      let s = segments[0];
      for (const k of segments) if (Math.round(k.at * FPS) <= f) s = k;
      const sf = Math.round(s.at * FPS);
      const df = s.hold ? sf : sf + Math.floor((f - sf) / s.on) * s.on;
      if (df !== last) { id++; last = df; }
      tOf.push(df / FPS); drawOf.push(id);
    }
    return { tOf, drawOf, count: id + 1 };
  }

  Object.assign(G, { S, rnd, rndStatic, hashStr, mulberry, clamp, lerp, prog, E, kf, V, ik, ell, sampleCR,
    shape, line, crayon, dots, ribbon, PAL, INK, paperPattern, letters, buildExposure });
})(window.GF = window.GF || {});
