/* =====================================================================
 * world.js — le décor et les accessoires, redessinés à chaque dessin.
 * Composition verticale 1080×1920 entièrement couverte (aucun vide) :
 * plafond/poutre · mur à fleurettes · porte-fenêtre sur le jardin (profondeur)
 * · fenêtre · horloge · plan de travail · four · carrelage en perspective
 * · tapis · table ronde · chaises · chat · plante de premier plan.
 * ===================================================================== */
(function (G) {
  'use strict';
  const { shape, line, ell, V, PAL, INK, clamp, lerp, rnd, rndStatic, dots } = G;

  const DOOR = { x0: 50, x1: 390, y0: 470, y1: 1450 };
  const GROUND = 1450;               // pied du mur du fond
  const VP = [540, 820];             // point de fuite (hauteur des yeux)
  // échelle de profondeur : identique dans le jardin et dans la cuisine
  const depthScale = y => clamp(0.3 + (y - 1010) * 0.55 / 440, 0.28, 1.02);

  function doorPath(ctx) {
    const { x0, x1, y0, y1 } = DOOR, cx = (x0 + x1) / 2, r = (x1 - x0) / 2;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0 + r * 0.55);
    ctx.ellipse(cx, y0 + r * 0.55, r, r * 0.55, 0, Math.PI, 0); ctx.lineTo(x1, y1); ctx.closePath();
  }

  /* ---------------- mur, plafond ---------------- */
  function wall(ctx, t) {
    shape(ctx, [[-10, 100], [1090, 100], [1090, GROUND + 4], [-10, GROUND + 4]], { fill: PAL.wall, key: 'wall', lw: 0, jit: 0, smooth: false, crayon: { color: PAL.wallDeep, alpha: 0.35, len: 28, angle: -1.2, density: 0.9, max: 1400 } });
    // papier peint à fleurettes (positions fixes, tracé redessiné)
    const r = rndStatic('sprigs');
    for (let i = 0; i < 70; i++) {
      const x = 20 + (i % 10) * 106 + (Math.floor(i / 10) % 2) * 53 + r() * 10, y = 150 + Math.floor(i / 10) * 160 + r() * 12;
      if (x > DOOR.x0 - 20 && x < DOOR.x1 + 20 && y > DOOR.y0 - 30) continue;
      if (x > 630 && x < 1030 && y > 360 && y < 780) continue;
      if (x > 545 && y > 940) continue;
      if (y > 1240) continue;
      line(ctx, [[x, y + 14], [x + 2, y], [x - 1, y - 8]], 1.6, PAL.sprigLeaf, 'spst' + i, 0.8);
      shape(ctx, ell(x - 7, y + 6, 6, 3, -0.6, 8), { fill: PAL.sprigLeaf, key: 'spl' + i, lw: 0, jit: 0.6 });
      shape(ctx, ell(x, y - 10, 5, 5, 0, 8), { fill: PAL.sprig, key: 'spf' + i, lw: 0, jit: 0.7 });
    }
    // lambris
    shape(ctx, [[-10, 1255], [560, 1255], [560, GROUND + 4], [-10, GROUND + 4]], { fill: PAL.wains, key: 'wains', lw: 2.6, smooth: false, steps: 3, crayon: { color: PAL.wainsDeep, alpha: 0.4, len: 30, angle: 1.5 } });
    shape(ctx, [[-10, 1244], [560, 1244], [560, 1258], [-10, 1258]], { fill: PAL.wainsDeep, key: 'wainsrail', lw: 2.4, smooth: false, steps: 3 });
    for (let x = 30; x < 560; x += 46) if (x < DOOR.x0 - 10 || x > DOOR.x1 + 10) line(ctx, [[x, 1262], [x, GROUND]], 1.4, PAL.wainsDeep, 'wl' + x, 0.8, false);
    // plafond et poutre
    shape(ctx, [[-10, -10], [1090, -10], [1090, 104], [-10, 104]], { fill: PAL.beam, key: 'beam', lw: 3, smooth: false, steps: 4, crayon: { color: PAL.beamDeep, alpha: 0.5, len: 60, angle: 0.02, density: 1.2 } });
    for (let i = 0; i < 5; i++) line(ctx, [[i * 260 - 40, 30 + (i % 2) * 30], [i * 260 + 140, 36 + (i % 2) * 30]], 1.6, PAL.beamDeep, 'grain' + i, 1);
    line(ctx, [[-10, 104], [1090, 104]], 4, INK, 'beamEdge', 1);
    // bouquets d'herbes séchées au-dessus de la porte
    for (let i = 0; i < 3; i++) {
      const x = 120 + i * 85, sw = Math.sin(t * 1.4 + i) * 2;
      line(ctx, [[x, 104], [x + sw * 0.3, 140]], 1.6, INK, 'herbS' + i, 0.6);
      shape(ctx, [[x - 6 + sw * 0.3, 138], [x + 6 + sw * 0.3, 138], [x + 22 + sw, 210], [x + sw, 222], [x - 22 + sw, 210]], { fill: i === 1 ? '#a7b56f' : '#8ea862', key: 'herb' + i, lw: 2.4 });
      line(ctx, [[x - 8 + sw * 0.3, 146], [x + 8 + sw * 0.3, 146]], 3, '#b5533f', 'herbT' + i, 0.4);
    }
    // casseroles en cuivre suspendues
    line(ctx, [[820, 150], [1070, 150]], 5, '#7d5a3c', 'rail', 0.6);
    for (let i = 0; i < 3; i++) {
      const x = 860 + i * 78, sw = Math.sin(t * 1.1 + i * 1.7) * 0.04, len = 70 + i * 10;
      const c = [x + Math.sin(sw) * len, 150 + Math.cos(sw) * len];
      line(ctx, [[x, 150], [c[0], c[1] - 28]], 2, INK, 'panH' + i, 0.5);
      shape(ctx, ell(c[0], c[1] + 10, 30 + i * 4, 30 + i * 4, 0, 16), { fill: '#d0824a', key: 'cop' + i, lw: 2.8, crayon: { color: '#a85f2e', alpha: 0.4, len: 10, angle: 0.7 } });
      shape(ctx, [[c[0] - 4, c[1] - 30], [c[0] + 4, c[1] - 30], [c[0] + 5, c[1] - 18], [c[0] - 5, c[1] - 18]], { fill: '#7d5a3c', key: 'copH' + i, lw: 2 });
      line(ctx, [[c[0] - 12, c[1]], [c[0] - 4, c[1] - 8]], 2.4, '#ffe2b8', 'copG' + i, 0.4);
    }
  }

  /* ---------------- jardin (vu par la porte-fenêtre) ---------------- */
  function garden(ctx, t, st, drawKids) {
    ctx.save(); doorPath(ctx); ctx.clip();
    const { x0, x1, y0, y1 } = DOOR;
    shape(ctx, [[x0 - 5, y0 - 10], [x1 + 5, y0 - 10], [x1 + 5, 900], [x0 - 5, 900]], { fill: PAL.sky, key: 'sky', lw: 0, jit: 0, smooth: false });
    shape(ctx, [[x0 - 5, 820], [x1 + 5, 820], [x1 + 5, 1000], [x0 - 5, 1000]], { fill: PAL.skyLow, key: 'skylow', lw: 0, jit: 0, smooth: false });
    for (let i = 0; i < 2; i++) { // nuages qui dérivent lentement
      const cx = 120 + i * 190 + t * 9, cy = 560 + i * 90;
      shape(ctx, [[cx - 60, cy + 14], [cx - 52, cy - 6], [cx - 24, cy - 22], [cx + 10, cy - 18], [cx + 38, cy - 26], [cx + 62, cy - 4], [cx + 64, cy + 14]], { fill: PAL.cloud, key: 'cloud' + i, lw: 2.2 });
    }
    shape(ctx, [[x0 - 10, 960], [120, 905], [230, 925], [330, 890], [x1 + 10, 915], [x1 + 10, 1010], [x0 - 10, 1010]], { fill: PAL.hillFar, key: 'hillfar', lw: 2.2 });
    shape(ctx, [[x0 - 10, 990], [160, 950], [300, 975], [x1 + 10, 955], [x1 + 10, 1060], [x0 - 10, 1060]], { fill: PAL.hill, key: 'hill', lw: 2.4 });
    shape(ctx, [[x0 - 10, 1010], [x1 + 10, 1010], [x1 + 10, y1 + 10], [x0 - 10, y1 + 10]], { fill: PAL.grass, key: 'grass', lw: 0, jit: 0, smooth: false, crayon: { color: PAL.grassDeep, alpha: 0.45, len: 14, angle: -1.45, density: 1.4 } });
    // barrière blanche
    for (let x = x0; x < x1 + 20; x += 34) shape(ctx, [[x, 1030], [x + 8, 1018], [x + 16, 1030], [x + 16, 1072], [x, 1072]], { fill: '#fffaf0', key: 'fence' + x, lw: 2, smooth: false, steps: 2 });
    line(ctx, [[x0, 1046], [x1 + 10, 1046]], 4, '#fffaf0', 'fenceRail', 0.6, false);
    // pas japonais vers la porte (perspective)
    for (let i = 0; i < 5; i++) { const y = 1110 + i * 72 + i * i * 6, s = depthScale(y); shape(ctx, ell(250 - i * 10, y, 34 * s * 1.4, 11 * s * 1.4, 0, 12), { fill: '#d8cdb8', key: 'stone' + i, lw: 2 }); }
    // fleurs
    const r = rndStatic('flowers');
    for (let i = 0; i < 14; i++) {
      const fx = x0 + 10 + r() * (x1 - x0 - 20), fy = 1090 + r() * 330, s = depthScale(fy);
      line(ctx, [[fx, fy], [fx + Math.sin(t * 2 + i) * 2 * s, fy - 26 * s]], 1.6, PAL.treeDeep, 'fst' + i, 0.5);
      shape(ctx, ell(fx + Math.sin(t * 2 + i) * 2 * s, fy - 28 * s, 7 * s, 7 * s, 0, 8), { fill: ['#f6a5b5', '#fff3a8', '#f08d6a', '#c9a6e8'][i % 4], key: 'fl' + i, lw: 1.6 });
    }
    // arbre + branche + balançoire
    shape(ctx, [[70, 1100], [86, 860], [92, 700], [118, 700], [122, 860], [134, 1100]], { fill: PAL.trunk, key: 'trunk', lw: 3, crayon: { color: '#6b4428', alpha: 0.45, len: 20, angle: 1.5 } });
    shape(ctx, [[110, 660], [200, 640], [300, 628], [380, 640], [384, 654], [300, 646], [200, 660], [112, 690]], { fill: PAL.trunk, key: 'branch', lw: 2.8 });
    shape(ctx, [[20, 640], [40, 520], [120, 470], [230, 480], [300, 540], [340, 600], [270, 630], [160, 640], [80, 690]], { fill: PAL.tree, key: 'canopy', lw: 3, crayon: { color: PAL.treeDeep, alpha: 0.5, len: 16, angle: 0.6, density: 1.3 } });
    for (let i = 0; i < 6; i++) { const a = rndStatic('app' + i); shape(ctx, ell(60 + a() * 240, 520 + a() * 100, 7, 7, 0, 8), { fill: '#e85b4a', key: 'apple' + i, lw: 1.6 }); }
    const sw = st.swing; // balançoire
    const piv = [240, 646], ropeL = 280, seat = V.add(piv, [Math.sin(sw) * ropeL, Math.cos(sw) * ropeL]);
    if (drawKids) drawKids(ctx, 'garden-back');
    line(ctx, [V.add(piv, [-6, 0]), V.add(seat, [-6, -2])], 2.4, '#8b6a45', 'ropeA', 0.4, false);
    line(ctx, [V.add(piv, [6, 0]), V.add(seat, [6, -2])], 2.4, '#8b6a45', 'ropeB', 0.4, false);
    shape(ctx, [V.add(seat, [-26, -4]), V.add(seat, [26, -4]), V.add(seat, [24, 6]), V.add(seat, [-24, 6])], { fill: '#b07a4a', key: 'swingSeat', lw: 2.4, smooth: false, steps: 2 });
    // papillon
    const bx = 160 + Math.sin(t * 0.9) * 120 + t * 4, by = 1000 + Math.sin(t * 2.3) * 50, fl = Math.abs(Math.sin(t * 22));
    shape(ctx, [[bx, by], [bx - 14, by - 12 * fl - 2], [bx - 16, by + 4]], { fill: '#f6a14a', key: 'bfl', lw: 1.6 });
    shape(ctx, [[bx, by], [bx + 14, by - 12 * fl - 2], [bx + 16, by + 4]], { fill: '#f6a14a', key: 'bfr', lw: 1.6 });
    // ballon de Léo
    const b = st.ball, bs = depthScale(b[1]);
    shape(ctx, ell(b[0], b[1] + 4 * bs, 20 * bs, 5 * bs, 0, 10), { fill: '#6c9a4a', key: 'ballSh', lw: 0 });
    shape(ctx, ell(b[0], b[1] - 18 * bs, 20 * bs, 20 * bs, 0, 12), { fill: '#e8473f', key: 'ball', lw: 2.4 });
    line(ctx, [[b[0] - 18 * bs, b[1] - 18 * bs], [b[0], b[1] - 12 * bs + Math.sin(st.ballRot) * 6 * bs], [b[0] + 18 * bs, b[1] - 18 * bs]], 3 * bs, '#fffaf0', 'ballS', 0.4);
    if (drawKids) drawKids(ctx, 'garden');
    ctx.restore();
    // encadrement de la porte
    ctx.save(); doorPath(ctx); ctx.lineWidth = 26; ctx.strokeStyle = PAL.frame; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); doorPath(ctx); ctx.lineWidth = 3.2; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
    shape(ctx, [[DOOR.x0 - 20, DOOR.y1 - 6], [DOOR.x1 + 20, DOOR.y1 - 6], [DOOR.x1 + 26, DOOR.y1 + 6], [DOOR.x0 - 26, DOOR.y1 + 6]], { fill: PAL.frameDeep, key: 'sill', lw: 2.6, smooth: false, steps: 2 });
    // rideau noué qui ondule avec la brise
    const fl2 = Math.sin(t * 2.2) * 6;
    shape(ctx, [[DOOR.x1 - 4, DOOR.y0 + 40], [DOOR.x1 + 40, DOOR.y0 + 40], [DOOR.x1 + 30 + fl2 * 0.5, 820], [DOOR.x1 + 46 + fl2, 1130], [DOOR.x1 + 10 + fl2, 1140], [DOOR.x1 + 12, 830]], { fill: '#f4d6a0', key: 'curtainD', lw: 2.6, crayon: { color: '#e0b874', alpha: 0.45, len: 30, angle: 1.5 } });
    line(ctx, [[DOOR.x1 + 6, 830], [DOOR.x1 + 40, 840]], 4, PAL.check, 'tieD', 0.6);
  }

  /* ---------------- fenêtre, horloge, dessin d'enfant, étagère ---------------- */
  function windowAndWall(ctx, t, st) {
    const wx0 = 650, wx1 = 1010, wy0 = 380, wy1 = 740;
    ctx.save(); ctx.beginPath(); ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.clip();
    shape(ctx, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]], { fill: PAL.sky, key: 'wsky', lw: 0, jit: 0, smooth: false });
    shape(ctx, [[wx0 - 10, 640], [760, 600], [880, 625], [wx1 + 10, 590], [wx1 + 10, wy1 + 10], [wx0 - 10, wy1 + 10]], { fill: PAL.hill, key: 'whill', lw: 2.4 });
    shape(ctx, [[820, 700], [800, 590], [840, 520], [920, 500], [990, 540], [1010, 620], [980, 700]], { fill: PAL.tree, key: 'wtree', lw: 2.6, crayon: { color: PAL.treeDeep, alpha: 0.5, len: 14, angle: 0.6 } });
    line(ctx, [[wx0, 560], [wx1, 545]], 1.6, INK, 'wline', 0.5); // fil à linge
    for (let i = 0; i < 3; i++) { const x = 690 + i * 80, fl = Math.sin(t * 3 + i) * 5; shape(ctx, [[x, 556 - i], [x + 44, 554 - i], [x + 46 + fl, 600], [x + fl, 604]], { fill: ['#f6b2b2', '#fffaf0', '#a8cbe8'][i], key: 'linen' + i, lw: 2 }); }
    for (let i = 0; i < 2; i++) { const bx = 700 + ((t * 40 + i * 140) % 330), by = 450 + i * 30 + Math.sin(t * 3 + i) * 8, w = Math.sin(t * 14 + i) * 6; line(ctx, [[bx - 10, by - w], [bx, by], [bx + 10, by - w]], 2.2, INK, 'bird' + i, 0.4); }
    ctx.restore();
    ctx.lineWidth = 18; ctx.strokeStyle = '#fffaf0'; ctx.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    shape(ctx, [[wx0 - 9, wy0 - 9], [wx1 + 9, wy0 - 9], [wx1 + 9, wy1 + 9], [wx0 - 9, wy1 + 9]], { key: 'wframeO', lw: 3, smooth: false, steps: 3, jit: 1 });
    line(ctx, [[(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1]], 10, '#fffaf0', 'wcross1', 0.4, false);
    line(ctx, [[wx0, (wy0 + wy1) / 2], [wx1, (wy0 + wy1) / 2]], 10, '#fffaf0', 'wcross2', 0.4, false);
    shape(ctx, [[wx0 - 24, wy1 + 4], [wx1 + 24, wy1 + 4], [wx1 + 30, wy1 + 22], [wx0 - 30, wy1 + 22]], { fill: '#fffaf0', key: 'wsill', lw: 2.6, smooth: false, steps: 2 });
    // pot de basilic sur le rebord
    shape(ctx, [[930, wy1 + 4], [976, wy1 + 4], [970, wy1 - 34], [936, wy1 - 34]], { fill: '#d0784a', key: 'potB', lw: 2.4, smooth: false, steps: 2 });
    for (let i = 0; i < 5; i++) shape(ctx, ell(940 + i * 7, wy1 - 46 - (i % 2) * 10, 10, 7, i - 2, 8), { fill: PAL.leaf, key: 'basil' + i, lw: 1.8 });
    // rideaux vichy
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? wx0 - 6 : wx1 + 6, fl = Math.sin(t * 2.1 + sd) * 5;
      const pts = [[x, wy0 - 30], [x + sd * 60, wy0 - 30], [x + sd * 34 + fl, 560], [x + sd * 52 + fl, wy1 - 10], [x + sd * 8 + fl, wy1 - 6], [x - sd * 6, 560]];
      const P = shape(ctx, pts, { fill: '#fbefe0', key: 'curt' + sd, lw: 2.6 });
      ctx.save(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (const q of P) ctx.lineTo(q[0], q[1]); ctx.clip();
      ctx.globalAlpha = 0.35; ctx.fillStyle = PAL.check;
      for (let y = wy0 - 30; y < wy1; y += 22) ctx.fillRect(x - 80, y, 160, 10);
      for (let xx = x - 80; xx < x + 80; xx += 22) ctx.fillRect(xx, wy0 - 30, 10, wy1 - wy0 + 30);
      ctx.restore();
    }
    line(ctx, [[wx0 - 50, wy0 - 32], [wx1 + 50, wy0 - 32]], 6, '#9a6b45', 'crod', 0.4);

    // horloge (le temps passe pendant la cuisson)
    const cx = 525, cy = 290, R = 58;
    const pend = Math.sin(t * Math.PI * 2 * 0.9) * 0.28;
    line(ctx, [[cx, cy + R - 4], [cx + Math.sin(pend) * 80, cy + R + Math.cos(pend) * 80]], 2.4, '#8b6a45', 'pendR', 0.4);
    shape(ctx, ell(cx + Math.sin(pend) * 86, cy + R + Math.cos(pend) * 86, 14, 14, 0, 10), { fill: '#e0b25a', key: 'pendB', lw: 2.4 });
    shape(ctx, ell(cx, cy, R + 10, R + 10, 0, 20), { fill: '#a26c40', key: 'clockO', lw: 3 });
    shape(ctx, ell(cx, cy, R, R, 0, 20), { fill: '#fffaf0', key: 'clockF', lw: 2.4 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; line(ctx, [[cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78], [cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92]], i % 3 ? 1.6 : 3, INK, 'tick' + i, 0.3, false); }
    const mA = st.clockMin / 60 * 6.283 - 1.5708, hA = (3 + st.clockMin / 60) / 12 * 6.283 - 1.5708;
    line(ctx, [[cx, cy], [cx + Math.cos(hA) * R * 0.5, cy + Math.sin(hA) * R * 0.5]], 5, INK, 'hourH', 0.4, false);
    line(ctx, [[cx, cy], [cx + Math.cos(mA) * R * 0.78, cy + Math.sin(mA) * R * 0.78]], 3.4, INK, 'minH', 0.4, false);
    if (st.clockSpin > 0) for (let i = 1; i <= 2; i++) line(ctx, [[cx + Math.cos(mA - i * 0.35) * R * 0.7, cy + Math.sin(mA - i * 0.35) * R * 0.7], [cx + Math.cos(mA - i * 0.35 - 0.3) * R * 0.7, cy + Math.sin(mA - i * 0.35 - 0.3) * R * 0.7]], 1.6, '#c08a5a', 'spinL' + i, 0.3);
    // dessin d'enfant scotché : Mamie et les deux petits
    const ax = 440, ay = 470;
    ctx.save(); ctx.translate(ax + 60, ay + 50); ctx.rotate(-0.07); ctx.translate(-ax - 60, -ay - 50);
    shape(ctx, [[ax, ay], [ax + 130, ay], [ax + 130, ay + 104], [ax, ay + 104]], { fill: '#fffdf5', key: 'art', lw: 2.4, smooth: false, steps: 3 });
    shape(ctx, ell(ax + 108, ay + 20, 11, 11, 0, 10), { fill: '#ffd04a', key: 'artSun', lw: 1.4, ink: '#e0a020' });
    for (let i = 0; i < 3; i++) { const fx = ax + 30 + i * 32, h = i === 0 ? 46 : 32; shape(ctx, ell(fx, ay + 96 - h, 7, 7, 0, 8), { key: 'artH' + i, lw: 1.6, ink: '#d9534b' }); line(ctx, [[fx, ay + 103 - h], [fx, ay + 88]], 1.6, '#4f6fa8', 'artB' + i, 0.6); line(ctx, [[fx - 8, ay + 98], [fx, ay + 88], [fx + 8, ay + 98]], 1.6, '#4f6fa8', 'artL' + i, 0.6); }
    line(ctx, [[ax + 50, ay + 30], [ax + 56, ay + 24], [ax + 62, ay + 30]], 1.6, '#d9534b', 'artHeart', 0.5);
    for (const [tx, ty] of [[ax - 6, ay - 4], [ax + 118, ay - 4]]) shape(ctx, [[tx, ty], [tx + 20, ty], [tx + 20, ty + 10], [tx, ty + 10]], { fill: '#f3e9b8', key: 'tape' + tx, lw: 0, smooth: false });
    ctx.restore();
    // étagère avec bocaux
    shape(ctx, [[640, 800], [1030, 800], [1030, 816], [640, 816]], { fill: PAL.wood, key: 'shelf', lw: 2.6, smooth: false, steps: 3 });
    const jars = [['FARINE', 670, 70, '#fffaf0'], ['SUCRE', 760, 60, '#fffaf0'], ['', 840, 46, '#f6c9a0'], ['', 900, 52, '#e86a5a'], ['', 960, 40, '#c7a2df']];
    for (const [lab, x, h, col] of jars) {
      shape(ctx, [[x, 800], [x + 54, 800], [x + 54, 800 - h], [x, 800 - h]], { fill: col, key: 'jar' + x, lw: 2.4, smooth: false, steps: 3 });
      shape(ctx, [[x - 3, 800 - h], [x + 57, 800 - h], [x + 57, 790 - h], [x - 3, 790 - h]], { fill: '#c9413c', key: 'lid' + x, lw: 2, smooth: false, steps: 2 });
      if (lab) { ctx.fillStyle = INK; ctx.font = '700 11px "DejaVu Sans",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(lab, x + 27, 800 - h / 2 + 4); }
    }
  }

  /* ---------------- plan de travail ---------------- */
  function counter(ctx, st) {
    shape(ctx, [[560, 960], [1065, 960], [1065, 1112], [560, 1112]], { fill: '#fdf8ee', key: 'splash', lw: 2.4, smooth: false, steps: 3 });
    for (let y = 990; y < 1112; y += 30) line(ctx, [[560, y], [1065, y]], 1.2, '#9fc6d6', 'tileH' + y, 0.5, false);
    for (let x = 590; x < 1065; x += 30) line(ctx, [[x, 960], [x, 1112]], 1.2, '#9fc6d6', 'tileV' + x, 0.5, false);
    shape(ctx, [[562, 1135], [805, 1135], [805, GROUND], [562, GROUND]], { fill: PAL.cab, key: 'cab', lw: 3, smooth: false, steps: 4, crayon: { color: PAL.cabDeep, alpha: 0.45, len: 24, angle: 1.5 } });
    // tiroir (s'ouvre vers nous)
    const d = st.drawer || 0;
    if (d > 0.02) shape(ctx, [[580, 1146], [788, 1146], [788, 1146 + 16 * d], [580, 1146 + 16 * d]], { fill: '#5a3a2a', key: 'drawerIn', lw: 2, smooth: false, steps: 2 });
    shape(ctx, [[578 - 6 * d, 1146 + 16 * d], [790 + 6 * d, 1146 + 16 * d], [790 + 6 * d, 1200 + 22 * d], [578 - 6 * d, 1200 + 22 * d]], { fill: PAL.cabDeep, key: 'drawer', lw: 2.6, smooth: false, steps: 3 });
    shape(ctx, ell(684, 1173 + 19 * d, 14, 6, 0, 10), { fill: '#e6c27a', key: 'drawerK', lw: 2 });
    for (const x of [580, 690]) { shape(ctx, [[x, 1218], [x + 100, 1218], [x + 100, 1430], [x, 1430]], { key: 'cabD' + x, lw: 2.4, smooth: false, steps: 3 }); shape(ctx, ell(x + (x === 580 ? 88 : 12), 1320, 6, 6, 0, 8), { fill: '#e6c27a', key: 'cabK' + x, lw: 1.8 }); }
    shape(ctx, [[552, 1108], [812, 1108], [812, 1138], [552, 1138]], { fill: PAL.wood, key: 'ctop', lw: 3, smooth: false, steps: 4, crayon: { color: PAL.woodDeep, alpha: 0.5, len: 40, angle: 0.03 } });
    // coquilles d'œufs (on a vraiment cuisiné !)
    shape(ctx, [[770, 1108], [778, 1094], [786, 1100], [792, 1092], [798, 1108]], { fill: '#fff4e2', key: 'egg1', lw: 2 });
    shape(ctx, ell(756, 1104, 10, 6, 0.2, 10), { fill: '#fff4e2', key: 'egg2', lw: 2 });
  }

  /* ---------------- four ---------------- */
  function cakeShape(ctx, c, s, cs, key) {
    // c = centre du fond du moule ; cs : {fill, rise, bake, berry, finger, slices}
    const rx = 62 * s, ry = 17 * s, h = 34 * s, cx = c[0], cy = c[1];
    const rim = cy - h;
    shape(ctx, ell(cx, rim, rx, ry, 0, 20), { fill: PAL.tinDeep, key: key + 'tinIn', lw: 2.6 });
    const fill = cs.fill || 0;
    if (fill > 0.01) {
      const level = cy - h * 0.1 - fill * h * 0.62, dome = (cs.rise || 0) * 26 * s;
      const col = G.mixCol(PAL.batter, PAL.cake, cs.bake || 0), top = G.mixCol(PAL.batter, PAL.cakeTop, cs.bake || 0);
      const surf = level - dome;
      const sl = cs.slices || 0;
      if (dome > 1) {
        // dôme au-dessus du bord
        const pts = [];
        for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; pts.push([cx + Math.cos(a) * rx * 0.97, rim + Math.sin(a) * ry * 0.9 - Math.sin(i / 16 * Math.PI) * dome]); }
        for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; pts.push([cx + Math.cos(a) * rx * 0.97 * (i === 0 || i === 10 ? 1 : 1), rim + Math.sin(a) * ry * 0.85]); }
        shape(ctx, pts, { fill: top, key: key + 'dome', lw: 2.6, crayon: { color: '#a8622a', alpha: 0.3 * (cs.bake || 0), len: 8, angle: 0.4 } });
        if (sl > 0) { // parts découpées : coin en vue plongeante
          for (let k = 0; k < sl; k++) {
            const a0 = 0.55 + k * 0.62, a1 = a0 + 0.55;
            const p0 = [cx + Math.cos(a0) * rx * 0.95, rim + Math.sin(a0) * ry * 0.85], p1 = [cx + Math.cos(a1) * rx * 0.95, rim + Math.sin(a1) * ry * 0.85];
            const cc = [cx, rim - dome * 0.55];
            shape(ctx, [cc, p0, [p0[0], p0[1] + 4 * s], [p1[0], p1[1] + 4 * s], p1], { fill: PAL.tinDeep, key: key + 'cut' + k, lw: 2.2, smooth: false, steps: 2 });
            shape(ctx, [cc, [cc[0], cc[1] + 22 * s], [p0[0], p0[1] + 2 * s], p0], { fill: PAL.sponge, key: key + 'face' + k, lw: 2, smooth: false, steps: 2 });
            line(ctx, [[cc[0], cc[1] + 11 * s], [p0[0], p0[1] - 1 * s]], 3 * s, PAL.cream, key + 'creamL' + k, 0.4, false);
          }
        }
        if (cs.finger > 0) line(ctx, [[cx - 22 * s, rim + 4 * s - dome * 0.4], [cx - 10 * s, rim + 6 * s - dome * 0.5]], 4 * s, PAL.sponge, key + 'finger', 0.3);
      } else {
        shape(ctx, ell(cx, Math.max(surf, rim + 2), rx * 0.95, ry * 0.88, 0, 18), { fill: col, key: key + 'batter', lw: 2 });
      }
      if (cs.berry) {
        const by = rim - dome - 4 * s;
        shape(ctx, ell(cx, by + 6 * s, 16 * s, 7 * s, 0, 10), { fill: PAL.cream, key: key + 'cream', lw: 2 });
        shape(ctx, [[cx - 10 * s, by], [cx + 10 * s, by], [cx + 3 * s, by - 16 * s], [cx - 3 * s, by - 16 * s]].map((p, i) => i < 2 ? p : p), { fill: PAL.berry, key: key + 'berry', lw: 2 });
        shape(ctx, [[cx - 7 * s, by - 13 * s], [cx, by - 20 * s], [cx + 7 * s, by - 13 * s], [cx, by - 15 * s]], { fill: PAL.leaf, key: key + 'berryL', lw: 1.6 });
      }
    }
    // paroi avant du moule
    const front = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; front.push([cx + Math.cos(a) * rx, rim + Math.sin(a) * ry]); }
    for (let i = 12; i >= 0; i--) { const a = i / 12 * Math.PI; front.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    shape(ctx, front, { fill: PAL.tin, key: key + 'tin', lw: 2.8, crayon: { color: PAL.tinDeep, alpha: 0.4, len: 10, angle: 1.5 } });
    line(ctx, [[cx - rx * 0.6, rim + ry * 0.9], [cx - rx * 0.5, cy + ry * 0.6]], 2.4, '#efece6', key + 'tinG', 0.4);
  }

  function oven(ctx, st) {
    shape(ctx, [[815, 1100], [1062, 1100], [1062, GROUND], [815, GROUND]], { fill: PAL.enamel, key: 'oven', lw: 3.2, smooth: false, steps: 4, crayon: { color: PAL.enamelDeep, alpha: 0.4, len: 24, angle: 1.5 } });
    shape(ctx, [[808, 1092], [1070, 1092], [1070, 1112], [808, 1112]], { fill: '#5a4136', key: 'stovetop', lw: 2.6, smooth: false, steps: 3 });
    // bouilloire et sa vapeur
    shape(ctx, [[975, 1092], [1045, 1092], [1040, 1050], [1010, 1035], [980, 1050]], { fill: '#e86a5a', key: 'kettle', lw: 2.6 });
    line(ctx, [[985, 1050], [960, 1040], [955, 1028]], 4, '#e86a5a', 'spout', 0.4);
    for (let i = 0; i < 2; i++) { const ph = (st.t * 0.8 + i * 0.5) % 1; line(ctx, [[955, 1020 - ph * 60], [948 + Math.sin(ph * 6 + i) * 8, 1000 - ph * 70], [956, 980 - ph * 80]], 2.4 * (1 - ph), '#ffffff', 'steamK' + i, 0.6); }
    // boutons et voyant
    for (let i = 0; i < 4; i++) shape(ctx, ell(850 + i * 46, 1146, 13, 13, 0, 10), { fill: i === 1 ? '#c9413c' : '#3a2a22', key: 'knob' + i, lw: 2 });
    shape(ctx, ell(1036, 1146, 6, 6, 0, 8), { fill: st.ovenOn ? '#ffb347' : '#8a7a6a', key: 'lamp', lw: 1.6 });
    // intérieur
    const inside = c2 => {
      shape(c2, [[840, 1195], [1040, 1195], [1040, 1408], [840, 1408]], { fill: PAL.ovenDark, key: 'ovenIn', lw: 2.4, smooth: false, steps: 3 });
      const g = st.glow;
      if (g > 0.02) {
        shape(c2, [[850, 1225], [1030, 1225], [1030, 1400], [850, 1400]], { fill: G.mixCol(PAL.ovenDark, PAL.glow, g * 0.75), key: 'glow1', lw: 0, smooth: false });
        shape(c2, ell(940, 1330, 80, 50, 0, 14), { fill: G.mixCol(PAL.glow, PAL.glowHot, g * 0.8), key: 'glow2', lw: 0, jit: 3 });
      }
      const zz = []; for (let i = 0; i <= 12; i++) zz.push([856 + i * 14, 1210 + (i % 2) * 10]);
      line(c2, zz, 3, g > 0.1 ? '#ff6a2a' : '#7a4a3a', 'coil', 0.5, false);
      line(c2, [[848, 1368], [1032, 1368]], 3, '#a89a8a', 'rack', 0.4, false);
      if (st.cake.loc === 'oven') cakeShape(c2, [928, 1366], 1, st.cake, 'cakeO');
    };
    const th = st.ovenDoor * Math.PI / 2, hy = 1418, top = hy - 226 * Math.cos(th) + 64 * Math.sin(th);
    const sx = 1 + 0.07 * Math.sin(th), x0 = 939 - 107 * sx, x1 = 939 + 107 * sx;
    if (st.ovenDoor > 0.02) inside(ctx);
    if (st.ovenDoor < 0.5) {
      shape(ctx, [[832, hy], [1046, hy], [x1, top], [x0, top]], { fill: PAL.enamel, key: 'odoor', lw: 3, smooth: false, steps: 3 });
      if (st.ovenDoor < 0.05) { // hublot
        ctx.save(); ctx.beginPath(); ctx.rect(872, 1238, 134, 100); ctx.clip(); inside(ctx);
        line(ctx, [[880, 1330], [930, 1244]], 4, 'rgba(255,255,255,0.35)', 'glassR', 0.5, false); ctx.restore();
        shape(ctx, [[872, 1238], [1006, 1238], [1006, 1338], [872, 1338]], { key: 'window', lw: 3, smooth: false, steps: 3 });
      }
      const hy2 = lerp(top, hy, 0.06);
      line(ctx, [[x0 + 30, hy2], [x1 - 30, hy2]], 7, '#c9a26a', 'handle', 0.5, false);
    } else {
      shape(ctx, [[832, hy], [1046, hy], [x1, top], [x0, top]], { fill: PAL.enamelDeep, key: 'odoorIn', lw: 3, smooth: false, steps: 3 });
      line(ctx, [[x0 + 30, top - 5], [x1 - 30, top - 5]], 7, '#c9a26a', 'handleO', 0.5, false);
    }
    shape(ctx, [[828, 1420], [1050, 1420], [1050, 1446], [828, 1446]], { fill: PAL.enamelDeep, key: 'ovenBase', lw: 2.4, smooth: false, steps: 2 });
  }

  /* ---------------- sol ---------------- */
  function floor(ctx) {
    const rows = [GROUND, 1519, 1606, 1711, 1834, 1975];
    const xAt = (xb, y) => VP[0] + (xb - VP[0]) * (y - VP[1]) / (GROUND - VP[1]);
    // joint de carrelage : aplat plein sous les carreaux (aucun vide entre les formes)
    ctx.fillStyle = '#b86a44'; ctx.fillRect(-10, GROUND - 4, 1100, 1920 - GROUND + 14);
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = -7; j < 7; j++) {
        const a = 540 + j * 100, b = a + 100, y0 = rows[i], y1 = rows[i + 1];
        const q = [[xAt(a, y0), y0], [xAt(b, y0), y0], [xAt(b, y1), y1], [xAt(a, y1), y1]];
        if (q[1][0] < -20 || q[0][0] > 1100) continue;
        shape(ctx, q, { fill: (i + j) % 2 === 0 ? PAL.floorA : PAL.floorB, key: 'tile' + i + '_' + j, lw: 1.8, ink: '#8a4a2e', smooth: false, steps: 2, jit: 1 });
      }
    }
    // tache de soleil venue de la porte-fenêtre
    ctx.fillStyle = 'rgba(255,236,180,0.32)';
    ctx.beginPath(); ctx.moveTo(DOOR.x0 + 10, GROUND); ctx.lineTo(DOOR.x1 - 10, GROUND); ctx.lineTo(760, 1920); ctx.lineTo(190, 1920); ctx.closePath(); ctx.fill();
    // plinthe
    shape(ctx, [[-10, GROUND - 2], [1090, GROUND - 2], [1090, GROUND + 8], [-10, GROUND + 8]], { fill: '#8d5b3a', key: 'plinth', lw: 2.2, smooth: false, steps: 3 });
    // tapis tressé
    const rings = [[370, 84, '#c96b5a'], [330, 72, '#f0c070'], [285, 60, '#7fb2a8'], [235, 48, '#f4e0c0']];
    for (const [rx, ry, col] of rings) shape(ctx, ell(390, 1606, rx, ry, 0, 26), { fill: col, key: 'rug' + rx, lw: 2.4, crayon: { color: '#8a5a3a', alpha: 0.2, len: 10, angle: 0.3 } });
  }

  /* ---------------- table, chaises, vaisselle ---------------- */
  const TABLE = { cx: 390, cy: 1240, rx: 205, ry: 50 };
  function plate(ctx, x, y, key, s = 1) {
    shape(ctx, ell(x, y, 42 * s, 13 * s, 0, 16), { fill: PAL.plate, key: key, lw: 2.4 });
    shape(ctx, ell(x, y, 30 * s, 8 * s, 0, 14), { key: key + 'in', lw: 1.6, ink: PAL.plateRim, jit: 0.6 });
  }
  function slice(ctx, x, y, s, key) {
    // part de gâteau posée (prisme triangulaire)
    shape(ctx, [[x - 26 * s, y - 2 * s], [x + 22 * s, y - 8 * s], [x + 24 * s, y + 10 * s], [x - 24 * s, y + 14 * s]], { fill: PAL.sponge, key: key + 'f', lw: 2.2 });
    line(ctx, [[x - 25 * s, y + 6 * s], [x + 23 * s, y + 1 * s]], 3 * s, PAL.cream, key + 'c', 0.4, false);
    shape(ctx, [[x - 26 * s, y - 2 * s], [x + 22 * s, y - 8 * s], [x + 6 * s, y - 20 * s]], { fill: PAL.cakeTop, key: key + 't', lw: 2.2 });
  }
  function chairLina(ctx) {
    for (const x of [290, 372]) shape(ctx, [[x - 6, 1300], [x + 6, 1300], [x + 7, 1528], [x - 5, 1528]], { fill: PAL.woodDeep, key: 'lcl' + x, lw: 2.4, smooth: false, steps: 3 });
    for (const x of [282, 380]) shape(ctx, [[x - 7, 1110], [x + 7, 1110], [x + 6, 1300], [x - 6, 1300]], { fill: PAL.wood, key: 'lcp' + x, lw: 2.4, smooth: false, steps: 3 });
    shape(ctx, [[270, 1098], [392, 1098], [392, 1128], [270, 1128]], { fill: PAL.wood, key: 'lctop', lw: 2.6 });
    shape(ctx, [[286, 1430], [376, 1430], [376, 1440], [286, 1440]], { fill: PAL.woodDeep, key: 'lcbar', lw: 1.8, smooth: false, steps: 2 });
  }
  function chairLeo(ctx) {
    shape(ctx, [[18, 1300], [30, 1300], [32, 1582], [20, 1582]], { fill: PAL.woodDeep, key: 'ecb', lw: 2.4, smooth: false, steps: 3 });
    shape(ctx, [[110, 1318], [122, 1318], [124, 1582], [112, 1582]], { fill: PAL.wood, key: 'ecf', lw: 2.4, smooth: false, steps: 3 });
    shape(ctx, [[16, 1074], [36, 1070], [36, 1305], [20, 1305]], { fill: PAL.wood, key: 'ecp', lw: 2.4, smooth: false, steps: 3 });
    shape(ctx, [[12, 1306], [130, 1306], [130, 1324], [12, 1324]], { fill: PAL.wood, key: 'ecs', lw: 2.6, smooth: false, steps: 3 });
    shape(ctx, [[26, 1450], [116, 1450], [116, 1460], [26, 1460]], { fill: PAL.woodDeep, key: 'ecbar', lw: 1.8, smooth: false, steps: 2 });
    shape(ctx, [[30, 1306], [128, 1306], [124, 1278], [36, 1276]], { fill: PAL.cushion, key: 'ecush', lw: 2.4 });
  }
  function table(ctx, st) {
    const { cx, cy, rx, ry } = TABLE;
    shape(ctx, [[372, 1290], [408, 1290], [402, 1440], [422, 1530], [358, 1530], [378, 1440]], { fill: PAL.woodDeep, key: 'ped', lw: 2.8, crayon: { color: '#7a4a2a', alpha: 0.4, len: 20, angle: 1.5 } });
    shape(ctx, ell(cx, 1540, 92, 16, 0, 16), { fill: PAL.wood, key: 'tfoot', lw: 2.6 });
    // nappe : retombée festonnée + dessus vichy
    const drop = [];
    for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI; drop.push([cx + Math.cos(a) * rx * 1.02, cy + Math.sin(a) * ry * 1.02]); }
    for (let i = 18; i >= 0; i--) { const a = i / 18 * Math.PI; drop.push([cx + Math.cos(a) * rx * 1.04, cy + Math.sin(a) * ry * 1.04 + 40 + (i % 2) * 10]); }
    const PD = shape(ctx, drop, { fill: PAL.cloth, key: 'cdrop', lw: 2.8 });
    gingham(ctx, PD, cx, 'gd', 13);
    const PT = shape(ctx, ell(cx, cy, rx, ry, 0, 26), { fill: PAL.cloth, key: 'ctop', lw: 2.8 });
    gingham(ctx, PT, cx, 'gt', 7);
    // vaisselle
    shape(ctx, ell(478, 1238, 80, 21, 0, 18), { fill: PAL.wood, key: 'board', lw: 2.4 });
    if (!st.leoPlateHeld) { plate(ctx, 240, 1246, 'plateA'); if (st.sliceA) slice(ctx, 240, 1240, 0.9, 'sliceA'); }
    plate(ctx, 345, 1254, 'plateB'); if (st.sliceB) slice(ctx, 345, 1248, 0.9, 'sliceB');
    for (const [gx, gy, k] of [[208, 1214, 'glA'], [292, 1212, 'glB']]) {
      shape(ctx, [[gx - 13, gy - 40], [gx + 13, gy - 40], [gx + 11, gy], [gx - 11, gy]], { fill: '#fdfdf8', key: k, lw: 2.2 });
      line(ctx, [[gx - 8, gy - 34], [gx - 7, gy - 6]], 2, '#ffffff', k + 'g', 0.4);
    }
    line(ctx, [[282, 1262], [300, 1236]], 3, '#9a9a9a', 'forkA', 0.4); line(ctx, [[388, 1268], [404, 1242]], 3, '#9a9a9a', 'forkB', 0.4);
    // bol de fraises
    shape(ctx, ell(550, 1258, 32, 10, 0, 14), { fill: '#7fb2d8', key: 'bbowl', lw: 2.4 });
    for (let i = 0; i < st.berries; i++) shape(ctx, ell(536 + i * 10, 1250 - (i % 2) * 4, 7, 8, 0.2, 8), { fill: PAL.berry, key: 'bb' + i, lw: 1.6 });
    shape(ctx, [[530, 1258], [570, 1258], [562, 1272], [538, 1272]], { fill: '#7fb2d8', key: 'bbowlF', lw: 2.2 });
    if (st.cake.loc === 'table') cakeShape(ctx, [478, 1240], 1, st.cake, 'cakeT');
  }
  function gingham(ctx, P, cx, key, step) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (const q of P) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(224,104,92,0.42)';
    for (let x = cx - 260; x < cx + 260; x += 30) ctx.fillRect(x, 1150, 14, 220);
    for (let y = 1150; y < 1340; y += step * 2) ctx.fillRect(cx - 260, y, 520, step);
    ctx.restore();
  }

  /* ---------------- premier plan : panier du chat, plante ---------------- */
  function basket(ctx, st) {
    shape(ctx, ell(905, 1800, 128, 44, 0, 20), { fill: PAL.basketDeep, key: 'basketIn', lw: 3 });
    shape(ctx, ell(905, 1796, 108, 32, 0, 18), { fill: '#f0d9c0', key: 'blanket', lw: 2.4 });
    G.drawCat(ctx, st.cat);
    const f = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; f.push([905 + Math.cos(a) * 128, 1800 + Math.sin(a) * 44]); }
    for (let i = 12; i >= 0; i--) { const a = i / 12 * Math.PI; f.push([905 + Math.cos(a) * 118, 1850 + Math.sin(a) * 40]); }
    shape(ctx, f, { fill: PAL.basket, key: 'basketF', lw: 3, crayon: { color: PAL.basketDeep, alpha: 0.55, len: 12, angle: 0.9, density: 1.5 } });
  }
  function plant(ctx, t) {
    const sw = Math.sin(t * 1.2) * 4;
    const leaves = [[-0.9, 190], [-0.45, 230], [-0.1, 210], [0.3, 180], [0.7, 150]];
    leaves.forEach(([a, L], i) => {
      const base = [80, 1790], tip = [80 + Math.sin(a) * L + sw * (i % 2 ? 1 : -1), 1790 - Math.cos(a) * L];
      const n = V.norm(V.perp(V.sub(tip, base)));
      const mid = V.mix(base, tip, 0.5);
      shape(ctx, [base, V.add(mid, V.mul(n, 34)), tip, V.add(mid, V.mul(n, -34))], { fill: i % 2 ? '#5f9a4f' : '#4f8a44', key: 'leaf' + i, lw: 2.6 });
      line(ctx, [base, V.mix(base, tip, 0.9)], 1.6, '#3e6e36', 'vein' + i, 0.6);
    });
    shape(ctx, [[-10, 1780], [170, 1780], [150, 1930], [10, 1930]], { fill: '#c86f45', key: 'pot', lw: 3, crayon: { color: '#a5552f', alpha: 0.45, len: 18, angle: 1.4 } });
    shape(ctx, [[-16, 1770], [176, 1770], [176, 1800], [-16, 1800]], { fill: '#d98458', key: 'potRim', lw: 2.6, smooth: false, steps: 3 });
  }
  function lamp(ctx, t) {
    const a = Math.sin(t * 1.3) * 0.015, top = [390, 104], end = [390 + Math.sin(a) * 370, 104 + Math.cos(a) * 370];
    line(ctx, [top, end], 2.4, INK, 'cord', 0.4, false);
    shape(ctx, ell(end[0], end[1] + 62, 22, 10, 0, 10), { fill: '#fff2b0', key: 'bulb', lw: 2 });
    shape(ctx, [[end[0] - 14, end[1]], [end[0] + 14, end[1]], [end[0] + 74, end[1] + 62], [end[0] - 74, end[1] + 62]], { fill: '#e0685c', key: 'shade', lw: 3 });
    line(ctx, [[end[0] - 70, end[1] + 58], [end[0] + 70, end[1] + 58]], 3, '#fffaf0', 'shadeTrim', 0.5, false);
  }

  Object.assign(G, { DOOR, GROUND, depthScale, wall, garden, windowAndWall, counter, oven, floor, table, chairLina, chairLeo, basket, plant, lamp, cakeShape, plate, slice, TABLE });
})(window.GF = window.GF || {});
