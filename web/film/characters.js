/* =====================================================================
 * characters.js — Mamie, Léo, Lina et Moustache le chat.
 * Un squelette (IK deux os avec sens d'articulation imposé) place les
 * articulations et les contacts ; puis CHAQUE pose est re-dessinée en entier :
 * contours continus des membres, vêtements recalculés depuis genoux/hanches,
 * tête redessinée selon l'angle (face, 3/4, profil, dos), expressions.
 * ===================================================================== */
(function (G) {
  'use strict';
  const { shape, line, ell, V, ik, PAL, INK, clamp, lerp, rnd } = G;

  const RIG = {
    granny: { headY: -712, headR: 86, neckY: -604, sh: 74, pelvisY: -400, hip: 42, thigh: 186, shin: 184, upper: 142, fore: 132, hand: 30, armW: [42, 33, 25], legW: [40, 31, 22] },
    kid: { headY: -405, headR: 80, neckY: -318, sh: 46, pelvisY: -205, hip: 23, thigh: 95, shin: 90, upper: 70, fore: 64, hand: 20, armW: [23, 19, 15], legW: [25, 20, 16] }
  };
  const rigOf = p => (p.kind === 'granny' ? RIG.granny : RIG.kid);

  /* ---------------- squelette ---------------- */
  function skeleton(p) {
    const r = rigOf(p), s = p.s, turn = p.turn || 0, at = Math.abs(turn);
    const lean = p.lean || 0;
    const up = [Math.sin(lean), -Math.cos(lean)], side = [Math.cos(lean), Math.sin(lean)];
    const wf = 1 - 0.42 * at;
    const L = (x, y) => V.add(p.pelvis, V.add(V.mul(side, x * s), V.mul(up, y * s)));
    const torso = r.pelvisY - r.neckY;
    const neck = L(turn * 4, torso);
    const shL = L(-r.sh * wf + turn * 6, torso - 12), shR = L(r.sh * wf + turn * 6, torso - 12);
    const hipL = L(-r.hip * wf, 0), hipR = L(r.hip * wf, 0);
    const headUp = V.rot(up, p.headTilt || 0);
    let head = V.add(neck, V.mul(headUp, (r.neckY - r.headY) * s));
    if (p.headOff) head = V.add(head, V.mul(p.headOff, s));
    const prefArm = sg => [sg * (1 - at) * 0.9 - turn * 1.1, 0.75];
    // raccourci : un bras pointé vers la caméra paraît plus court (armScale < 1)
    const ak = p.armScale || 1;
    const armL = ik(shL, p.hL, r.upper * s * ak, r.fore * s * ak, p.elbowL || prefArm(-1));
    const armR = ik(shR, p.hR, r.upper * s * ak, r.fore * s * ak, p.elbowR || prefArm(1));
    const prefLeg = sg => [turn * 1.2 + sg * (1 - at) * 0.35, -0.25];
    const legL = p.kneeL ? { joint: p.kneeL, end: p.fL } : ik(hipL, p.fL, r.thigh * s, r.shin * s, prefLeg(-1));
    const legR = p.kneeR ? { joint: p.kneeR, end: p.fR } : ik(hipR, p.fR, r.thigh * s, r.shin * s, prefLeg(1));
    return { r, s, turn, at, up, side, wf, L, neck, shL, shR, hipL, hipR, head, armL, armR, legL, legR };
  }

  /* ---------------- membre : contour continu ---------------- */
  function tube(ctx, a, j, e, w, fill, key, o = {}) {
    const d1 = V.norm(V.sub(j, a)), d2 = V.norm(V.sub(e, j));
    const n1 = V.perp(d1), n2 = V.perp(d2), nj = V.norm(V.add(n1, n2));
    const h0 = w[0] / 2, h1 = w[1] / 2, h2 = w[2] / 2;
    const cross = d1[0] * d2[1] - d1[1] * d2[0];
    const kIn = 0.75, kOut = 1.12; // pli intérieur / coude extérieur
    const jl = V.add(j, V.mul(nj, h1 * (cross > 0 ? kIn : kOut)));
    const jr = V.add(j, V.mul(nj, -h1 * (cross > 0 ? kOut : kIn)));
    const pts = [
      V.add(a, V.mul(n1, h0)), V.add(V.mix(a, j, 0.5), V.mul(n1, (h0 + h1) / 2)), jl,
      V.add(V.mix(j, e, 0.5), V.mul(n2, (h1 + h2) / 2)), V.add(e, V.mul(n2, h2)),
      V.add(e, V.add(V.mul(d2, h2 * 0.9), V.mul(n2, h2 * 0.5))), V.add(e, V.mul(d2, h2 * 1.05)), V.add(e, V.add(V.mul(d2, h2 * 0.9), V.mul(n2, -h2 * 0.5))),
      V.add(e, V.mul(n2, -h2)), V.add(V.mix(j, e, 0.5), V.mul(n2, -(h1 + h2) / 2)), jr,
      V.add(V.mix(a, j, 0.5), V.mul(n1, -(h0 + h1) / 2)), V.add(a, V.mul(n1, -h0)),
      V.add(a, V.mul(d1, -h0 * 0.95))
    ];
    shape(ctx, pts, { fill, key, lw: o.lw || 3, jit: o.jit === undefined ? 1.1 : o.jit, crayon: o.crayon });
    if (o.crease && Math.abs(cross) > 0.25) {
      const c = cross > 0 ? 1 : -1, cp = V.add(j, V.mul(nj, c * h1 * 0.55));
      line(ctx, [V.add(cp, V.mul(d1, -h1 * 0.5)), cp, V.add(cp, V.mul(d2, h1 * 0.4))], 1.6, INK, key + ':cr');
    }
  }
  const at01 = (a, b, u) => V.mix(a, b, u);

  /* ---------------- mains ---------------- */
  function hand(ctx, wrist, dir, s, kind, key, thumb = 1, skin = PAL.skin) {
    const n = V.perp(dir), hs = s;
    const c = V.add(wrist, V.mul(dir, hs * 0.55));
    const ang = Math.atan2(dir[1], dir[0]);
    if (kind === 'mitt') {
      const mc = V.add(wrist, V.mul(dir, hs * 0.75));
      const P = shape(ctx, ell(mc[0], mc[1], hs * 1.1, hs * 0.85, ang, 14), { fill: PAL.mitt, key: key + 'm', lw: 3 });
      G.dots(ctx, P, PAL.mittCheck, 10, hs * 0.09, key + 'md');
      const tc = V.add(wrist, V.add(V.mul(dir, hs * 0.5), V.mul(n, thumb * hs * 0.8)));
      shape(ctx, ell(tc[0], tc[1], hs * 0.45, hs * 0.32, ang + thumb * 0.6, 10), { fill: PAL.mitt, key: key + 'mt', lw: 2.6 });
      const cuff = V.add(wrist, V.mul(dir, -hs * 0.1));
      shape(ctx, ell(cuff[0], cuff[1], hs * 0.3, hs * 0.75, ang, 10), { fill: PAL.mittCheck, key: key + 'mc', lw: 2.4 });
      return;
    }
    // pouce d'abord (derrière la paume), puis paume
    const tc = V.add(wrist, V.add(V.mul(dir, hs * 0.35), V.mul(n, thumb * hs * 0.48)));
    const thumbDir = V.norm(V.add(dir, V.mul(n, thumb * 0.9)));
    if (kind !== 'fist') shape(ctx, ell(tc[0] + thumbDir[0] * hs * 0.15, tc[1] + thumbDir[1] * hs * 0.15, hs * 0.38, hs * 0.2, Math.atan2(thumbDir[1], thumbDir[0]), 10), { fill: skin, key: key + 't', lw: 2.2 });
    const rx = kind === 'fist' || kind === 'grip' ? hs * 0.58 : hs * 0.72, ry = kind === 'fist' || kind === 'grip' ? hs * 0.5 : hs * 0.5;
    shape(ctx, ell(c[0], c[1], rx, ry, ang, 14), { fill: skin, key: key + 'p', lw: 2.6 });
    if (kind === 'point') {
      const tip = V.add(c, V.mul(dir, hs * 1.15));
      shape(ctx, [V.add(c, V.mul(n, hs * 0.16)), V.add(tip, V.mul(n, hs * 0.12)), V.add(tip, V.mul(dir, hs * 0.12)), V.add(tip, V.mul(n, -hs * 0.12)), V.add(c, V.mul(n, -hs * 0.16))], { fill: skin, key: key + 'f', lw: 2.2 });
    } else if (kind === 'open' || kind === 'cup') {
      for (let i = -1; i <= 1; i++) {
        const a = V.add(c, V.add(V.mul(dir, hs * 0.2), V.mul(n, i * hs * 0.17))), b = V.add(a, V.mul(dir, hs * 0.42));
        line(ctx, [a, b], 1.3, INK, key + 'fl' + i, 0.6);
      }
    } else { // grip / fist : jointures
      line(ctx, [V.add(c, V.add(V.mul(dir, hs * 0.3), V.mul(n, -hs * 0.3))), V.add(c, V.add(V.mul(dir, hs * 0.42), V.mul(n, hs * 0.05))), V.add(c, V.add(V.mul(dir, hs * 0.3), V.mul(n, hs * 0.3)))], 1.4, INK, key + 'kn', 0.6);
    }
  }

  /* ---------------- chaussures ---------------- */
  function shoe(ctx, ankle, s, dirX, kind, key, ang = 0) {
    const len = (16 + 20 * Math.abs(dirX)) * s, c = [ankle[0] + dirX * len * 0.55, ankle[1] + 7 * s];
    const fills = { slipper: PAL.slipper, sneaker: PAL.sneaker, mary: PAL.shoe };
    const P = shape(ctx, ell(c[0], c[1], len, 11 * s, ang * Math.sign(dirX || 1), 14), { fill: fills[kind], key, lw: 2.8 });
    if (kind === 'slipper') { shape(ctx, ell(c[0] + dirX * len * 0.55, c[1] - 6 * s, 7 * s, 6 * s, 0, 8), { fill: '#f6d9e1', key: key + 'pom', lw: 2 }); }
    if (kind === 'sneaker') { line(ctx, [[c[0] - len * 0.7, c[1] + 6 * s], [c[0] + len * 0.7, c[1] + 6 * s]], 4 * s, PAL.sneakerAccent, key + 'st', 0.5, false); }
    if (kind === 'mary') { line(ctx, [[ankle[0] - 9 * s, ankle[1] + 1 * s], [ankle[0] + 9 * s, ankle[1] + 1 * s]], 2.4 * s, INK, key + 'strap', 0.5, false); }
    return P;
  }

  /* ---------------- tête ---------------- */
  function head(ctx, p, k) {
    const { r, s } = k, R = r.headR * s, c = k.head, kind = p.kind, id = p.id;
    const turn = clamp((p.turn || 0) + (p.headTurn || 0), -1, 1), at = Math.abs(turn);
    const back = !!p.back, tilt = (p.lean || 0) * 0.5 + (p.headTilt || 0);
    const ex = p.expr || {};
    const rot = (x, y) => { const q = V.rot([x * R, y * R], tilt); return [c[0] + q[0], c[1] + q[1]]; };
    const skin = kind === 'granny' ? PAL.skin : PAL.kidSkin;

    // --- arrière : chignon, couettes, cheveux du dos
    if (kind === 'granny') {
      const bun = rot(-turn * 0.18, -1.02);
      shape(ctx, ell(bun[0], bun[1], R * 0.44, R * 0.36, tilt, 14), { fill: PAL.grannyHair, key: id + 'bun', lw: 3, crayon: { color: PAL.grannyHairDeep, alpha: 0.35, len: 10, angle: 0.4 } });
      line(ctx, [rot(-turn * 0.18 - 0.25, -1.12), rot(-turn * 0.18 + 0.3, -0.92)], 2.6, '#b07a4a', id + 'pin');
    }
    if (kind === 'lina') {
      for (const sd of [-1, 1]) {
        if (at > 0.6 && sd === Math.sign(turn)) continue; // couette cachée derrière la tête
        const sw = (p.pig || 0) + sd * 0.25;
        const root = rot(sd * (0.92 - at * 0.25) - turn * 0.3, -0.25);
        const dir = V.norm(V.rot([sd * 0.55, 1], sw));
        const tip = V.add(root, V.mul(dir, R * 0.95)), nn = V.perp(dir);
        shape(ctx, [V.add(root, V.mul(nn, R * 0.17)), V.add(V.mix(root, tip, 0.5), V.mul(nn, R * 0.22)), V.add(tip, V.mul(nn, R * 0.06)), V.add(tip, V.mul(dir, R * 0.1)), V.add(tip, V.mul(nn, -R * 0.06)), V.add(V.mix(root, tip, 0.5), V.mul(nn, -R * 0.2)), V.add(root, V.mul(nn, -R * 0.15))], { fill: PAL.linaHair, key: id + 'pig' + sd, lw: 2.8 });
        // noeud rouge
        const b = V.add(root, V.mul(dir, R * 0.1));
        shape(ctx, [b, V.add(b, [-R * 0.26, -R * 0.16]), V.add(b, [-R * 0.26, R * 0.14])], { fill: PAL.ribbon, key: id + 'bowA' + sd, lw: 2.2 });
        shape(ctx, [b, V.add(b, [R * 0.26, -R * 0.16]), V.add(b, [R * 0.26, R * 0.14])], { fill: PAL.ribbon, key: id + 'bowB' + sd, lw: 2.2 });
      }
    }
    // --- oreilles
    const earXs = back ? [-0.92, 0.92] : at < 0.35 ? [-0.94, 0.94] : [-turn * 0.5];
    for (const ex_ of earXs) { const e = rot(ex_, 0.08); shape(ctx, ell(e[0], e[1], R * 0.17, R * 0.22, tilt, 10), { fill: skin, key: id + 'ear' + ex_, lw: 2.4 }); }
    // --- visage
    const facePts = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      let x = Math.cos(a) * 0.96, y = Math.sin(a) * (kind === 'granny' ? 0.98 : 0.92);
      if (y > 0) { y *= 1.06; x *= 1 - 0.08 * y; }               // joues/menton
      if (!back && at > 0.55 && Math.sign(Math.cos(a)) === Math.sign(turn) && y > -0.1 && y < 0.5) x += turn * 0.06; // profil : pommette
      facePts.push(rot(x, y));
    }
    shape(ctx, facePts, { fill: skin, key: id + 'face', lw: 3.2, crayon: { color: PAL.skinDeep, alpha: 0.12, len: 8, angle: 0.8, density: 0.6 } });
    const fx = turn * 0.42;
    if (!back) {
      if (at > 0.55) { // nez en profil
        const nb = rot(turn * 0.93, 0.12);
        shape(ctx, [rot(turn * 0.9, 0.0), V.add(nb, V.mul([turn, 0], R * 0.13)), rot(turn * 0.9, 0.24)], { fill: skin, key: id + 'nosep', lw: 2.4, closed: false });
      }
      // joues
      const ce = 0.42 * (1 - at * 0.3);
      for (const sd of [-1, 1]) {
        if (at > 0.6 && sd === -Math.sign(turn)) continue;
        const cc = rot(fx + sd * ce, 0.32); shape(ctx, ell(cc[0], cc[1], R * 0.15, R * 0.09, tilt, 10), { fill: PAL.cheek, key: id + 'chk' + sd, lw: 0, jit: 0.8 });
      }
      // yeux
      const es = 0.31 * (1 - at * 0.45), lk = ex.look || [0, 0];
      for (const sd of [-1, 1]) {
        if (at > 0.62 && sd === -Math.sign(turn)) continue;
        const ec = rot(fx + sd * es, -0.06);
        const er = R * (kind === 'granny' ? 0.075 : 0.105) * (1 + (sd === Math.sign(turn) ? at * 0.15 : 0));
        const eyes = ex.eyes || 'open';
        if (eyes === 'closed' || (ex.blink || 0) > 0.6) line(ctx, [[ec[0] - er * 1.4, ec[1]], [ec[0], ec[1] + er * 0.7], [ec[0] + er * 1.4, ec[1]]], 2.8 * Math.max(0.7, s), INK, id + 'ecl' + sd, 0.6);
        else if (eyes === 'happy') line(ctx, [[ec[0] - er * 1.4, ec[1] + er * 0.4], [ec[0], ec[1] - er * 0.8], [ec[0] + er * 1.4, ec[1] + er * 0.4]], 3 * Math.max(0.7, s), INK, id + 'eh' + sd, 0.6);
        else {
          const sq = eyes === 'wide' ? 1.25 : eyes === 'half' ? 0.6 : 1;
          const pc = [ec[0] + lk[0] * er * 0.6, ec[1] + lk[1] * er * 0.5];
          shape(ctx, ell(pc[0], pc[1], er, er * 1.25 * sq, 0, 10), { fill: INK, key: id + 'eye' + sd, lw: 0, jit: 0.5 });
          ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(pc[0] - er * 0.3, pc[1] - er * 0.45, er * 0.33, 0, 6.283); ctx.fill();
          if (eyes === 'half') line(ctx, [[ec[0] - er * 1.4, ec[1] - er * 0.5], [ec[0] + er * 1.4, ec[1] - er * 0.6]], 2.4 * Math.max(0.7, s), INK, id + 'lid' + sd, 0.5);
        }
        if (ex.brow !== undefined || kind === 'granny') {
          const br = ex.brow || 0;
          line(ctx, [rot(fx + sd * es - 0.12, -0.3 - br * 0.12), rot(fx + sd * es + 0.12, -0.33 - br * 0.12 + sd * 0.02)], 2.4 * Math.max(0.7, s), kind === 'granny' ? '#9b8f9e' : INK, id + 'brow' + sd, 0.6);
        }
      }
      if (at <= 0.55) { const nc = rot(fx + turn * 0.12, 0.14); shape(ctx, ell(nc[0], nc[1], R * 0.1, R * 0.08, 0, 10), { fill: PAL.skinDeep, key: id + 'nose', lw: 2.2 }); }
      // bouche
      const mc = rot(fx + turn * 0.1, 0.46), mw = R * 0.2 * (1 - at * 0.35), m = ex.mouth || 'smile';
      if (m === 'smile') line(ctx, [[mc[0] - mw, mc[1] - 2], [mc[0], mc[1] + mw * 0.45], [mc[0] + mw, mc[1] - 2]], 2.6 * Math.max(0.7, s), INK, id + 'ms', 0.6);
      else if (m === 'o') shape(ctx, ell(mc[0], mc[1] + 2, mw * 0.4, mw * 0.5, 0, 10), { fill: '#7b2f2f', key: id + 'mo', lw: 2.2 });
      else if (m === 'flat') line(ctx, [[mc[0] - mw * 0.6, mc[1]], [mc[0] + mw * 0.6, mc[1] + 1]], 2.4, INK, id + 'mf', 0.6);
      else if (m === 'open' || m === 'big' || m === 'call') {
        const oh = m === 'call' ? mw * 1.2 : m === 'big' ? mw * 0.8 : mw * 0.55;
        shape(ctx, [[mc[0] - mw, mc[1] - oh * 0.2], [mc[0] + mw, mc[1] - oh * 0.2], [mc[0] + mw * 0.6, mc[1] + oh * 0.7], [mc[0], mc[1] + oh], [mc[0] - mw * 0.6, mc[1] + oh * 0.7]], { fill: '#7b2f2f', key: id + 'mopen', lw: 2.4 });
        shape(ctx, ell(mc[0], mc[1] + oh * 0.65, mw * 0.45, oh * 0.25, 0, 10), { fill: '#e57a7a', key: id + 'tongue', lw: 0, jit: 0.5 });
      } else if (m === 'lick') {
        line(ctx, [[mc[0] - mw, mc[1] - 2], [mc[0], mc[1] + mw * 0.35], [mc[0] + mw, mc[1] - 2]], 2.6, INK, id + 'ml', 0.6);
        shape(ctx, ell(mc[0] + mw * 0.45, mc[1] + mw * 0.45, mw * 0.32, mw * 0.4, 0.3, 10), { fill: '#e57a7a', key: id + 'tg', lw: 2 });
      } else if (m === 'whistle') {
        shape(ctx, ell(mc[0] + turn * mw * 0.3, mc[1], mw * 0.28, mw * 0.28, 0, 8), { fill: '#7b2f2f', key: id + 'mw', lw: 2.2 });
      } else if (m === 'giggle') {
        shape(ctx, [[mc[0] - mw, mc[1] - 3], [mc[0] + mw, mc[1] - 3], [mc[0], mc[1] + mw * 0.7]], { fill: '#7b2f2f', key: id + 'mg', lw: 2.4 });
      }
    }
    // --- cheveux (devant)
    if (kind === 'granny') {
      const hair = back
        ? [rot(-1.0, 0.25), rot(-1.02, -0.4), rot(-0.6, -0.95), rot(0, -1.05), rot(0.6, -0.95), rot(1.02, -0.4), rot(1.0, 0.25), rot(0.5, 0.42), rot(-0.5, 0.42)]
        : [rot(-1.02 + Math.max(0, turn) * 0.25, 0.12), rot(-1.04, -0.45), rot(-0.62, -0.96), rot(0, -1.06), rot(0.62, -0.96), rot(1.04, -0.45), rot(1.02 - Math.max(0, -turn) * 0.25, 0.12), rot(0.85 - turn * 0.2, -0.05), rot(0.5 + fx, -0.48), rot(fx, -0.62), rot(-0.5 + fx, -0.48), rot(-0.85 - turn * 0.2, -0.05)];
      shape(ctx, hair, { fill: PAL.grannyHair, key: id + 'hair', lw: 3.2, crayon: { color: PAL.grannyHairDeep, alpha: 0.4, len: 14, angle: 0.5, density: 1.4 } });
      if (!back) for (let i = -1; i <= 1; i++) line(ctx, [rot(fx + i * 0.3, -0.58), rot(fx + i * 0.42, -0.85)], 1.5, '#a8a2b4', id + 'hl' + i, 0.7);
      if (!back) { // lunettes rondes
        const es = 0.31 * (1 - at * 0.45);
        for (const sd of [-1, 1]) {
          if (at > 0.62 && sd === -Math.sign(turn)) continue;
          const ec = rot(fx + sd * es, -0.06);
          shape(ctx, ell(ec[0], ec[1], R * 0.21, R * 0.19, 0, 14), { key: id + 'gl' + sd, lw: 3, ink: '#7a4b35', jit: 0.7 });
          const gr = rnd(id + 'glint' + sd); if (gr() > 0.35) line(ctx, [[ec[0] + R * 0.05, ec[1] - R * 0.13], [ec[0] + R * 0.12, ec[1] - R * 0.05]], 2.2, '#ffffff', id + 'gli' + sd, 0.4);
        }
        if (at < 0.62) line(ctx, [rot(fx - es + 0.21, -0.08), rot(fx, -0.12), rot(fx + es - 0.21, -0.08)], 2.6, '#7a4b35', id + 'bridge', 0.5);
        line(ctx, [rot(fx - Math.sign(turn || 1) * es * 0 + (turn >= 0 ? -es - 0.21 : es + 0.21), -0.06), rot(-turn * 0.55 + (turn >= 0 ? -0.15 : 0.15), 0.0)], 2.2, '#7a4b35', id + 'temple', 0.6);
      }
    } else if (kind === 'leo') {
      const hair = back
        ? [rot(-0.98, 0.2), rot(-1.05, -0.4), rot(-0.6, -0.98), rot(0.1, -1.1), rot(0.7, -0.92), rot(1.05, -0.35), rot(0.98, 0.2), rot(0.4, 0.3), rot(-0.4, 0.3)]
        : [rot(-0.98, 0.0), rot(-1.06, -0.45), rot(-0.7, -0.95), rot(-0.1, -1.12), rot(0.55, -1.0), rot(1.06, -0.48), rot(0.98, 0.0), rot(0.82 + fx * 0.3, -0.32), rot(0.55 + fx, -0.48), rot(0.35 + fx, -0.36), rot(0.12 + fx, -0.52), rot(-0.12 + fx, -0.38), rot(-0.38 + fx, -0.52), rot(-0.6 + fx, -0.36), rot(-0.85 + fx * 0.3, -0.3)];
      shape(ctx, hair, { fill: PAL.leoHair, key: id + 'hair', lw: 3, crayon: { color: '#5a321b', alpha: 0.35, len: 12, angle: 1.1 } });
      line(ctx, [rot(-0.1, -1.08), rot(-0.05, -1.32), rot(0.18, -1.3)], 3, INK, id + 'cowlick', 0.8);
    } else if (kind === 'lina') {
      const hair = back
        ? [rot(-0.98, 0.25), rot(-1.04, -0.42), rot(-0.6, -0.96), rot(0, -1.06), rot(0.6, -0.96), rot(1.04, -0.42), rot(0.98, 0.25), rot(0.4, 0.35), rot(-0.4, 0.35)]
        : [rot(-0.98, 0.05), rot(-1.04, -0.45), rot(-0.62, -0.96), rot(0, -1.06), rot(0.62, -0.96), rot(1.04, -0.45), rot(0.98, 0.05), rot(0.8 + fx * 0.3, -0.25), rot(0.5 + fx, -0.5), rot(fx + 0.04, -0.66), rot(fx - 0.04, -0.66), rot(-0.5 + fx, -0.5), rot(-0.8 + fx * 0.3, -0.25)];
      shape(ctx, hair, { fill: PAL.linaHair, key: id + 'hair', lw: 3, crayon: { color: '#2e1c14', alpha: 0.35, len: 12, angle: 0.9 } });
      if (!back) line(ctx, [rot(fx, -0.66), rot(fx * 0.6, -1.0)], 1.8, '#2e1c14', id + 'part', 0.6);
    }
  }

  /* ---------------- corps & vêtements ---------------- */
  function torsoGranny(ctx, p, k) {
    const { L, wf, s, turn, legL, legR } = k, id = p.id, at = Math.abs(turn);
    const X = x => x * wf + turn * 10;
    // jupe de la robe : l'ourlet suit les genoux
    const kneeY = Math.max(legL.joint[1], legR.joint[1]);
    const kx0 = Math.min(legL.joint[0], legR.joint[0]), kx1 = Math.max(legL.joint[0], legR.joint[0]);
    const hemY = kneeY + 52 * s, sw = (p.skirt || 0) * s;
    const hip0 = L(X(-112), -8), hip1 = L(X(112), -8);
    const hemL = [Math.min(kx0 - 46 * s, hip0[0] + 6 * s) + sw, hemY], hemR = [Math.max(kx1 + 46 * s, hip1[0] - 6 * s) + sw, hemY];
    const skirt = [L(X(-92), 48), hip0, hemL, [lerp(hemL[0], hemR[0], 0.25), hemY + 6 * s], [lerp(hemL[0], hemR[0], 0.5), hemY - 3 * s], [lerp(hemL[0], hemR[0], 0.75), hemY + 6 * s], hemR, hip1, L(X(92), 48)];
    shape(ctx, skirt, { fill: PAL.dress, key: id + 'skirt', lw: 3.4, sketch: true, crayon: { color: PAL.dressDeep, alpha: 0.3, len: 22, angle: 1.35, density: 1.2 } });
    for (let i = 1; i <= 2; i++) { const top = L(X(-50 + i * 33), 30); line(ctx, [top, [lerp(hemL[0], hemR[0], i / 3), hemY - 10 * s]], 1.6, PAL.dressDeep, id + 'fold' + i, 1); }
    // gilet (buste)
    const bust = [L(X(-28), 206), L(X(-78), 190), L(X(-100), 140), L(X(-96), 74), L(X(-86), 30), L(X(86), 30), L(X(96), 74), L(X(100), 140), L(X(78), 190), L(X(28), 206)];
    shape(ctx, bust, { fill: PAL.cardi, key: id + 'bust', lw: 3.4, crayon: { color: PAL.cardiDeep, alpha: 0.35, len: 16, angle: 1.4 } });
    if (!p.back) {
      // col blanc
      shape(ctx, [L(X(-30), 206), L(X(0), 186), L(X(30), 206), L(X(20), 214), L(X(-20), 214)], { fill: PAL.apron, key: id + 'collar', lw: 2.4 });
      // tablier : bavette + jupe de tablier + poche
      const ax = turn * 34, aw = 1 - at * 0.35;
      const bib = [L(ax - 44 * aw, 176), L(ax + 44 * aw, 176), L(ax + 50 * aw, 46), L(ax - 50 * aw, 46)];
      const P1 = shape(ctx, bib, { fill: PAL.apron, key: id + 'bib', lw: 2.8, smooth: false, steps: 4 });
      G.dots(ctx, P1, PAL.apronDot, 7, 3.2 * s, id + 'bibd');
      const aHem = hemY - 18 * s, mid = L(ax, 40);
      const apron = [L(ax - 70 * aw, 44), L(ax + 70 * aw, 44), [mid[0] + 82 * aw * s + sw * 0.8, aHem], [mid[0] + sw * 0.8, aHem + 6 * s], [mid[0] - 82 * aw * s + sw * 0.8, aHem]];
      const P2 = shape(ctx, apron, { fill: PAL.apron, key: id + 'apron', lw: 3, crayon: { color: '#e9dcc4', alpha: 0.4, len: 18, angle: 1.4 } });
      G.dots(ctx, P2, PAL.apronDot, 16, 3.4 * s, id + 'aprond');
      // trace de farine (petit détail)
      shape(ctx, ell(mid[0] - 30 * s, mid[1] + 70 * s, 14 * s, 9 * s, 0.3, 10), { fill: '#fdfbf4', key: id + 'flour', lw: 0, jit: 1.5 });
      // poche
      const pc = [mid[0] + 34 * aw * s + sw * 0.5, mid[1] + 92 * s];
      if (p.mittsInPocket) { // les maniques rangées dépassent de la poche
        shape(ctx, ell(pc[0] - 8 * s, pc[1] - 30 * s, 17 * s, 26 * s, -0.25, 12), { fill: PAL.mitt, key: id + 'pm1', lw: 2.6 });
        shape(ctx, ell(pc[0] + 10 * s, pc[1] - 26 * s, 16 * s, 24 * s, 0.3, 12), { fill: PAL.mitt, key: id + 'pm2', lw: 2.6 });
      }
      shape(ctx, [[pc[0] - 30 * s, pc[1] - 18 * s], [pc[0] + 30 * s, pc[1] - 18 * s], [pc[0] + 27 * s, pc[1] + 26 * s], [pc[0] - 27 * s, pc[1] + 26 * s]], { fill: '#f4ead7', key: id + 'pocket', lw: 2.4, smooth: false, steps: 3 });
      line(ctx, [L(X(-60), 44), L(X(60), 44)], 3, PAL.apronDot, id + 'waist', 0.8);
    } else {
      // dos : nœud du tablier
      const b = L(turn * 10, 44);
      shape(ctx, [b, V.add(b, [-34 * s, -18 * s]), V.add(b, [-36 * s, 16 * s])], { fill: PAL.apron, key: id + 'bowl', lw: 2.6 });
      shape(ctx, [b, V.add(b, [34 * s, -18 * s]), V.add(b, [36 * s, 16 * s])], { fill: PAL.apron, key: id + 'bowr', lw: 2.6 });
      line(ctx, [b, V.add(b, [-14 * s, 58 * s])], 4, PAL.apron, id + 'tail1', 0.8);
      line(ctx, [L(X(-90), 44), L(X(90), 44)], 3.4, PAL.apron, id + 'string', 0.8);
    }
  }

  function torsoKid(ctx, p, k) {
    const { L, wf, s, turn, legL, legR, hipL, hipR } = k, id = p.id;
    const X = x => x * wf + turn * 4;
    if (p.kind === 'leo') {
      // short : couvre le bassin jusqu'à mi-cuisse
      const tL = at01(hipL, legL.joint, 0.5), tR = at01(hipR, legR.joint, 0.5);
      const dL = V.norm(V.perp(V.sub(legL.joint, hipL))), dR = V.norm(V.perp(V.sub(legR.joint, hipR)));
      const w = 15 * s;
      shape(ctx, [L(X(-44), 14), L(X(44), 14), L(X(46), -10), V.add(tR, V.mul(dR, -w)), V.add(tR, V.mul(dR, w)), L(0, -22), V.add(tL, V.mul(dL, -w)), V.add(tL, V.mul(dL, w)), L(X(-46), -10)], { fill: PAL.shorts, key: id + 'shorts', lw: 2.8, crayon: { color: '#3b5688', alpha: 0.35, len: 10, angle: 1.2 } });
      const shirt = [L(X(-24), 118), L(X(-48), 108), L(X(-52), 60), L(X(-46), 4), L(X(46), 4), L(X(52), 60), L(X(48), 108), L(X(24), 118)];
      const P = shape(ctx, shirt, { fill: PAL.leoShirt, key: id + 'shirt', lw: 2.8 });
      ctx.save(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (const q of P) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip();
      for (let i = 0; i < 6; i++) { const a = L(X(-70), 100 - i * 19), b = L(X(70), 100 - i * 19); line(ctx, [a, b], 8 * s, PAL.leoStripe, id + 'stripe' + i, 1.2, false); }
      ctx.restore();
      shape(ctx, P.filter((_, i) => i % 3 === 0), { key: id + 'shirtO', lw: 2.6, jit: 0.4, fill: null });
    } else {
      const kneeY = Math.max(legL.joint[1], legR.joint[1]);
      const kx0 = Math.min(legL.joint[0], legR.joint[0]), kx1 = Math.max(legL.joint[0], legR.joint[0]);
      const sw = (p.skirt || 0) * s, hemY = p.seatedFront ? kneeY + 14 * s : kneeY + 4 * s;
      const hemL = [Math.min(kx0 - 26 * s, L(X(-60), 0)[0]) + sw, hemY], hemR = [Math.max(kx1 + 26 * s, L(X(60), 0)[0]) + sw, hemY];
      shape(ctx, [L(X(-40), 40), L(X(-58), 2), hemL, [lerp(hemL[0], hemR[0], 0.33), hemY + 5 * s], [lerp(hemL[0], hemR[0], 0.66), hemY - 2 * s], hemR, L(X(58), 2), L(X(40), 40)], { fill: PAL.linaDress, key: id + 'skirt', lw: 2.8, crayon: { color: PAL.linaDressDeep, alpha: 0.35, len: 14, angle: 1.4 } });
      shape(ctx, [L(X(-24), 118), L(X(-46), 108), L(X(-44), 50), L(X(-40), 30), L(X(40), 30), L(X(44), 50), L(X(46), 108), L(X(24), 118)], { fill: PAL.linaDress, key: id + 'bodice', lw: 2.8, crayon: { color: PAL.linaDressDeep, alpha: 0.3, len: 12, angle: 1.4 } });
      if (!p.back) {
        shape(ctx, [L(X(-26), 118), L(X(-4), 98), L(X(-30), 96)], { fill: '#fffaf0', key: id + 'colL', lw: 2.2 });
        shape(ctx, [L(X(26), 118), L(X(4), 98), L(X(30), 96)], { fill: '#fffaf0', key: id + 'colR', lw: 2.2 });
        for (let i = 0; i < 2; i++) { const b = L(X(0) + turn * 8, 80 - i * 24); shape(ctx, ell(b[0], b[1], 4 * s, 4 * s, 0, 8), { fill: '#fffaf0', key: id + 'btn' + i, lw: 1.6 }); }
      }
      line(ctx, [L(X(-42), 36), L(X(42), 36)], 4 * s, PAL.ribbon, id + 'belt', 0.6);
    }
  }

  /* ---------------- personnage complet ---------------- */
  function drawLimbArm(ctx, p, k, side) {
    const arm = side === 'L' ? k.armL : k.armR, sh = side === 'L' ? k.shL : k.shR;
    const { r, s } = k, id = p.id + 'arm' + side;
    const w = r.armW.map(v => v * s);
    const dir = V.norm(V.sub(arm.end, arm.joint));
    const kind = (side === 'L' ? p.handL : p.handR) || 'open';
    const thumb = (side === 'L' ? 1 : -1) * (p.turn > 0.3 ? -1 : 1) * (p.back ? -1 : 1);
    if (p.kind === 'granny') {
      // manche longue du gilet jusqu'au poignet
      const wrist = V.add(arm.end, V.mul(dir, -4 * s));
      tube(ctx, sh, arm.joint, wrist, w, PAL.cardi, id, { crease: true, crayon: { color: PAL.cardiDeep, alpha: 0.3, len: 12, angle: 1.3 } });
      const cuff = V.add(wrist, V.mul(dir, -6 * s));
      shape(ctx, ell(cuff[0], cuff[1], 9 * s, w[2] * 0.62, Math.atan2(dir[1], dir[0]), 10), { fill: PAL.cardiDeep, key: id + 'cuff', lw: 2.4 });
      hand(ctx, arm.end, dir, r.hand * s, kind, id + 'h', thumb, PAL.skin);
    } else {
      tube(ctx, sh, arm.joint, arm.end, w, PAL.kidSkin, id, { lw: 2.6 });
      const sleeveEnd = at01(sh, arm.joint, 0.62), d1 = V.norm(V.sub(arm.joint, sh)), n1 = V.perp(d1);
      const col = p.kind === 'leo' ? PAL.leoShirt : PAL.linaDress;
      shape(ctx, [V.add(sh, V.mul(n1, w[0] * 0.75)), V.add(sleeveEnd, V.mul(n1, w[0] * 0.68)), V.add(sleeveEnd, V.mul(n1, -w[0] * 0.68)), V.add(sh, V.mul(n1, -w[0] * 0.75)), V.add(sh, V.mul(d1, -w[0] * 0.6))], { fill: col, key: id + 'sleeve', lw: 2.4 });
      if (p.kind === 'leo') line(ctx, [V.add(at01(sh, sleeveEnd, 0.55), V.mul(n1, w[0] * 0.66)), V.add(at01(sh, sleeveEnd, 0.55), V.mul(n1, -w[0] * 0.66))], 6 * s, PAL.leoStripe, id + 'sst', 0.6, false);
      hand(ctx, arm.end, dir, r.hand * s, kind, id + 'h', thumb, PAL.kidSkin);
    }
  }
  function drawLeg(ctx, p, k, side, far) {
    const leg = side === 'L' ? k.legL : k.legR, hip = side === 'L' ? k.hipL : k.hipR;
    const { r, s, turn } = k, id = p.id + 'leg' + side;
    const w = r.legW.map(v => v * s);
    const fill = p.kind === 'granny' ? (far ? '#d7ae90' : PAL.stocking) : (far ? PAL.skinDeep : PAL.kidSkin);
    tube(ctx, hip, leg.joint, leg.end, w, fill, id, { lw: 2.6, crease: p.kind !== 'granny' });
    if (p.kind !== 'granny') { // chaussettes
      const d = V.norm(V.sub(leg.end, leg.joint)), a = V.add(leg.end, V.mul(d, -16 * s));
      shape(ctx, [V.add(a, V.mul(V.perp(d), w[2] * 0.62)), V.add(leg.end, V.mul(V.perp(d), w[2] * 0.62)), V.add(leg.end, V.mul(V.perp(d), -w[2] * 0.62)), V.add(a, V.mul(V.perp(d), -w[2] * 0.62))], { fill: p.kind === 'leo' ? '#fffaf2' : PAL.sock, key: id + 'sock', lw: 2.2, smooth: false, steps: 2 });
    }
    const dirX = p.seatedFront ? 0 : turn;
    const ang = (side === 'L' ? p.footAngL : p.footAngR) || 0;
    shoe(ctx, leg.end, s, p.back ? 0 : dirX, p.kind === 'granny' ? 'slipper' : p.kind === 'leo' ? 'sneaker' : 'mary', id + 'shoe', ang);
  }

  /**
   * drawCharacter(ctx, pose) — dessine un personnage complet.
   * pose.part: 'all' | 'body' (jambes, corps, tête) | 'arms' (bras + accessoires)
   * pose.order: ordre de dessin des bras et accessoires, ex. ['armL','bowl','armR']
   */
  function drawCharacter(ctx, p) {
    const k = skeleton(p), part = p.part || 'all';
    const turn = p.turn || 0;
    const farSide = turn > 0.25 ? 'L' : turn < -0.25 ? 'R' : null;
    if (part !== 'arms') {
      if (p.shadow !== false && !p.seatedFront && !p.seated) { // ombre portée au sol (aplat)
        const gy = Math.max(p.fL[1], p.fR[1]) + 10 * p.s, cx = (p.fL[0] + p.fR[0]) / 2;
        shape(ctx, ell(cx, gy, (p.kind === 'granny' ? 120 : 70) * p.s, 16 * p.s, 0, 14), { fill: p.shadowCol || 'rgba(110,60,40,0.22)', key: p.id + 'shadow', lw: 0, jit: 1 });
      }
      if (p.props && p.props.behind) p.props.behind(ctx, k);
      const legOrder = farSide === 'R' ? ['R', 'L'] : ['L', 'R'];
      for (const sd of legOrder) drawLeg(ctx, p, k, sd, sd === farSide);
      if (p.armsBehind) { drawLimbArm(ctx, p, k, 'L'); drawLimbArm(ctx, p, k, 'R'); }
      else if (p.farArmBehind && farSide) drawLimbArm(ctx, p, k, farSide);
      if (p.kind === 'granny') torsoGranny(ctx, p, k); else torsoKid(ctx, p, k);
      // cou
      const nk = k.neck, nr = (p.kind === 'granny' ? 24 : 15) * p.s;
      shape(ctx, [[nk[0] - nr, nk[1] + 6 * p.s], [nk[0] - nr * 0.9, nk[1] - 30 * p.s], [nk[0] + nr * 0.9, nk[1] - 30 * p.s], [nk[0] + nr, nk[1] + 6 * p.s]], { fill: p.kind === 'granny' ? PAL.skin : PAL.kidSkin, key: p.id + 'neck', lw: 2.4 });
      head(ctx, p, k);
      if (p.props && p.props.afterHead) p.props.afterHead(ctx, k);
    }
    if (part !== 'body') {
      const order = p.order || ['armL', 'armR'];
      for (const o of order) {
        if (o === 'armL' || o === 'armR') { const sd = o[3]; if (part === 'all' && (p.armsBehind || (p.farArmBehind && sd === farSide))) continue; drawLimbArm(ctx, p, k, sd); }
        else if (p.props && p.props[o]) p.props[o](ctx, k);
      }
    }
    return k;
  }

  /* ---------------- Moustache, le chat roux ---------------- */
  function drawCat(ctx, c) {
    // c: {x, y, s, wake 0..1, breath, tail, ear, eyes}
    const { x, y, s } = c, id = 'cat';
    const br = 1 + Math.sin(c.breath) * 0.035;
    // queue (derrière)
    const tw = c.tail;
    shape(ctx, [[x + 60 * s, y + 10 * s], [x + 100 * s, y - 4 * s + tw * 6], [x + 112 * s + tw * 10, y - 30 * s], [x + 100 * s + tw * 16, y - 46 * s], [x + 92 * s + tw * 14, y - 36 * s], [x + 96 * s, y - 14 * s], [x + 58 * s, y - 2 * s]], { fill: PAL.cat, key: id + 'tail', lw: 2.6 });
    // corps lové
    const body = shape(ctx, ell(x + 18 * s, y - 2 * s, 74 * s, 34 * s * br, 0, 18), { fill: PAL.cat, key: id + 'body', lw: 3, crayon: { color: PAL.catStripe, alpha: 0.3, len: 10, angle: 1.4 } });
    for (let i = 0; i < 4; i++) line(ctx, [[x - 10 * s + i * 22 * s, y - 30 * s * br], [x - 4 * s + i * 22 * s, y - 14 * s]], 3 * s, PAL.catStripe, id + 'str' + i, 0.8);
    // tête (se relève quand il se réveille)
    const hx = x - 46 * s, hy = y - 8 * s - c.wake * 30 * s;
    const ear = c.ear || 0;
    shape(ctx, [[hx - 26 * s, hy - 14 * s], [hx - 22 * s - ear * 3, hy - 44 * s], [hx - 4 * s, hy - 24 * s]], { fill: PAL.cat, key: id + 'earL', lw: 2.4 });
    shape(ctx, [[hx + 6 * s, hy - 24 * s], [hx + 22 * s, hy - 44 * s + ear * 4], [hx + 28 * s, hy - 12 * s]], { fill: PAL.cat, key: id + 'earR', lw: 2.4 });
    shape(ctx, ell(hx, hy, 32 * s, 27 * s, 0, 16), { fill: PAL.cat, key: id + 'head', lw: 3 });
    shape(ctx, ell(hx, hy + 9 * s, 13 * s, 9 * s, 0, 10), { fill: '#fbe6cc', key: id + 'muzzle', lw: 0 });
    if (c.wake > 0.5) {
      for (const sd of [-1, 1]) { shape(ctx, ell(hx + sd * 12 * s, hy - 4 * s, 4.5 * s, 6.5 * s, 0, 8), { fill: '#3e6b2f', key: id + 'eye' + sd, lw: 1.8 }); ctx.fillStyle = INK; ctx.fillRect(hx + sd * 12 * s - 1.2, hy - 9 * s, 2.4, 10 * s); }
    } else for (const sd of [-1, 1]) line(ctx, [[hx + sd * 12 * s - 6 * s, hy - 4 * s], [hx + sd * 12 * s, hy - 1 * s], [hx + sd * 12 * s + 6 * s, hy - 4 * s]], 2.2, INK, id + 'ec' + sd, 0.5);
    shape(ctx, [[hx - 4 * s, hy + 4 * s], [hx + 4 * s, hy + 4 * s], [hx, hy + 8 * s]], { fill: '#e07a7a', key: id + 'nose', lw: 1.5 });
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) line(ctx, [[hx + sd * 10 * s, hy + 9 * s + i * 4 * s], [hx + sd * 34 * s, hy + 6 * s + i * 7 * s]], 1.2, INK, id + 'wh' + sd + i, 0.6);
    // pattes avant
    shape(ctx, ell(hx + 20 * s, y + 24 * s, 16 * s, 9 * s, 0, 10), { fill: PAL.cat, key: id + 'paw', lw: 2.4 });
  }

  Object.assign(G, { RIG, skeleton, drawCharacter, drawCat, hand, tube, shoe });
})(window.GF = window.GF || {});
