/* =====================================================================
 * story.js — storyboard, poses clés, timeline, feuille d'exposition,
 * événements sonores et drawFrame(frameIndex) déterministe.
 * La prévisualisation (requestAnimationFrame) et l'export Chromium
 * appellent EXACTEMENT la même fonction drawFrame.
 * ===================================================================== */
(function (G) {
  'use strict';
  const { kf, E, V, clamp, lerp, prog, PAL, INK, shape, line, ell, letters, rnd } = G;

  G.mixCol = (a, b, u) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), k = clamp(u, 0, 1);
    const ch = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };

  /* ================= STORYBOARD (beats) ================= */
  const BEATS = [
    { a: 0.00, b: 0.80, id: 'S1', title: 'Mamie fouette la pâte en fredonnant', granny: 'fouette (bol calé dans le bras)', leo: 'court après son ballon', lina: 'se balance' },
    { a: 0.80, b: 1.45, id: 'S2', title: 'Elle verse la pâte dans le moule', granny: 'incline le bol, sort le fouet', leo: 'court', lina: 'se balance' },
    { a: 1.45, b: 2.10, id: 'S3', title: 'Bol posé, moule soulevé, un pas vers le four', granny: 'pose, saisit, pivote, marche', leo: 'court', lina: 'se balance' },
    { a: 2.10, b: 2.72, id: 'S4', title: 'Le moule entre dans le four', granny: 'se penche (genoux fléchis)', leo: 'court', lina: 'se balance' },
    { a: 2.72, b: 3.00, id: 'S5', title: 'Petit coup de pantoufle : la porte se ferme', granny: 'équilibre sur une jambe', leo: 'court', lina: 'se balance', cat: 'oreille qui sursaute' },
    { a: 3.00, b: 3.72, id: 'S6', title: 'Le temps passe : l’horloge tourne, le gâteau gonfle', granny: 'mains sur les hanches, regarde l’horloge, tape du pied, enfile les maniques', leo: 'court', lina: 'se balance' },
    { a: 3.72, b: 4.40, id: 'S7', title: 'Ding ! Elle ouvre et sort le gâteau doré', granny: 'tire la poignée, se penche, sort le moule', leo: 'court', lina: 'se balance' },
    { a: 4.40, b: 5.12, id: 'S8', title: 'Coup de talon pour fermer, marche vers la table', granny: 'pivote, ferme du talon, 3 pas, pose le gâteau', leo: 'court', lina: 'se balance' },
    { a: 5.12, b: 5.45, id: 'S9', title: 'Maniques dans la poche, une fraise sur le dessus', granny: 'range, cueille, dépose', leo: 'court', lina: 'se balance' },
    { a: 5.45, b: 5.92, id: 'S10', title: '« À table ! »', granny: 'inspire, mains en porte-voix', leo: 's’arrête net « ! »', lina: 'saute de la balançoire « ! »' },
    { a: 5.92, b: 6.45, id: 'S11', title: 'Les enfants accourent et grimpent sur leurs chaises', granny: 'va chercher la pelle à tarte (dos tourné)', leo: 'court, saute sur la chaise', lina: 'atterrit, court, grimpe' },
    { a: 6.45, b: 6.85, id: 'S12', title: 'Pendant que Mamie a le dos tourné…', granny: 'tiroir, coup de hanche', leo: 'pouffe de rire, main sur la bouche', lina: 'doigt dans la crème, se lèche le doigt' },
    { a: 6.85, b: 7.16, id: 'S13', title: '…l’innocence même', granny: 'revient, remarque la trace, sourcil levé', leo: 'pieds qui se balancent', lina: 'mains sur les genoux, siffle' },
    { a: 7.16, b: 7.80, id: 'S14', title: 'Une part pour chacun', granny: 'coupe et sert Lina puis Léo', leo: 'tend son assiette', lina: 'applaudit' },
    { a: 7.80, b: 8.00, id: 'S15', title: 'Bonheur', granny: 'mains sur le cœur', leo: 'ravi', lina: 'ravie', cat: 'se réveille, renifle' }
  ];

  /* ================= outils de pistes ================= */
  function kfF(t, keys) { // valeurs : tableau, nombre ou fonction(t)
    const val = v => (typeof v === 'function' ? v(t) : v);
    if (t <= keys[0][0]) return val(keys[0][1]);
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = (E[b[2] || 'io'])((t - a[0]) / (b[0] - a[0]));
      const va = val(a[1]), vb = val(b[1]);
      return Array.isArray(va) ? va.map((x, j) => lerp(x, vb[j], u)) : lerp(va, vb, u);
    }
    return val(keys[keys.length - 1][1]);
  }
  /** piste de pied : contacts plantés, arc levé seulement pendant le déplacement */
  function footTrack(t, keys, gy, lift) {
    const P = k => (Array.isArray(k[1]) ? k[1] : [k[1], gy]);
    if (t <= keys[0][0]) return P(keys[0]);
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const a = P(keys[i - 1]), b = P(keys[i]), u = E.io((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      const moving = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 0.5;
      const p = V.mix(a, b, u);
      if (moving && keys[i][2] !== 0) p[1] -= Math.sin(Math.PI * u) * (keys[i][2] || lift);
      return p;
    }
    return P(keys[keys.length - 1]);
  }
  const pick = (t, list) => { let v = list[0][1]; for (const [tt, vv] of list) if (t >= tt) v = vv; return v; };

  /* ================= MAMIE ================= */
  const GY = 1582; // ligne des chevilles de Mamie
  // [t, px, py, lean, turn, headTilt] — poses clés (K) et breakdowns
  const GK = [
    [0.00, 700, 1222, -0.03, -0.30, -0.10], [0.80, 700, 1222, -0.03, -0.30, -0.10],
    [1.05, 698, 1228, -0.12, -0.42, -0.14], [1.30, 698, 1228, -0.12, -0.42, -0.14],
    [1.45, 704, 1224, -0.03, -0.22, -0.06], [1.62, 700, 1234, -0.20, -0.50, -0.10],
    [1.80, 704, 1222, 0.00, 0.25, -0.04], [2.10, 770, 1222, 0.05, 0.85, 0.00],
    [2.32, 768, 1262, 0.32, 0.90, -0.15], [2.55, 766, 1292, 0.52, 0.90, -0.25],
    [2.70, 766, 1268, 0.32, 0.90, -0.20], [2.86, 760, 1214, -0.08, 0.80, 0.04],
    [3.00, 768, 1222, 0.00, 0.55, 0.00], [3.22, 768, 1222, 0.00, 0.10, -0.22],
    [3.45, 768, 1222, 0.00, 0.10, -0.22], [3.58, 768, 1226, 0.04, 0.25, 0.10],
    [3.72, 768, 1236, 0.20, 0.85, -0.10], [3.87, 768, 1250, 0.26, 0.90, -0.15],
    [4.12, 766, 1292, 0.52, 0.90, -0.25], [4.40, 765, 1222, 0.00, 0.70, 0.00],
    [4.52, 768, 1216, -0.06, -0.40, 0.00], [4.64, 760, 1222, 0.00, -0.75, 0.00],
    [4.97, 660, 1222, -0.05, -0.85, -0.05], [5.12, 658, 1234, -0.26, -0.85, -0.12],
    [5.27, 662, 1226, -0.04, -0.30, -0.15], [5.44, 660, 1228, -0.20, -0.80, -0.15],
    [5.56, 662, 1216, 0.07, -0.55, 0.12], [5.74, 660, 1224, -0.08, -0.55, 0.00],
    [5.90, 662, 1222, 0.00, -0.40, 0.00], [6.05, 700, 1222, 0.00, 0.40, 0.00],
    [6.15, 738, 1222, 0.00, 0.00, 0.00], [6.30, 738, 1234, 0.12, 0.00, 0.00],
    [6.45, 738, 1226, 0.00, 0.00, 0.00], [6.53, 750, 1222, 0.06, 0.00, 0.00],
    [6.62, 740, 1222, 0.00, 0.00, 0.00], [6.74, 738, 1222, 0.00, -0.50, 0.00],
    [6.80, 734, 1222, 0.00, -0.80, 0.00], [7.02, 662, 1222, -0.08, -0.80, 0.00],
    [7.16, 660, 1230, -0.30, -0.80, -0.10], [7.32, 655, 1236, -0.42, -0.85, -0.10],
    [7.46, 660, 1230, -0.28, -0.80, -0.10], [7.62, 655, 1236, -0.40, -0.85, -0.05],
    [7.80, 664, 1222, 0.04, -0.40, 0.05], [8.00, 664, 1220, 0.05, -0.30, 0.05]
  ];
  const gField = (t, i) => kf(t, GK.map(k => [k[0], k[i]]));
  const gBase = t => ({ px: gField(t, 1), py: gField(t, 2), lean: gField(t, 3), turn: gField(t, 4), headTilt: gField(t, 5) });

  // pieds : [t, x | [x,y], lift?]
  const GFL = [[0, 678], [1.97, 678], [2.10, 748], [4.64, 748], [4.76, 700], [4.87, 700], [4.98, 638], [6.04, 638], [6.15, 716], [6.75, 716], [6.88, 638]];
  const GFR = [[0, 722], [1.84, 722], [1.97, 792], [2.72, 792], [2.85, [830, 1500], 8], [2.97, 794], [4.42, 794], [4.52, [840, 1515], 8], [4.62, 790], [4.76, 790], [4.87, 682], [5.92, 682], [6.04, 760], [6.88, 760], [7.00, 682]];

  // accessoires de Mamie
  const BOWL = [[0, [650, 1104, 0]], [0.80, [650, 1104, 0]], [1.05, [628, 1022, -1.05]], [1.30, [628, 1022, -1.05]], [1.45, [702, 1068, -0.12]], [1.55, [712, 1076, 0]]];
  const bowlAt = t => { const v = kf(t, BOWL); return { p: [v[0], v[1]], a: v[2] }; };
  const PAN = [[0, [600, 1120]], [1.62, [600, 1120]], [1.80, [668, 1132]], [2.10, [838, 1132]], [2.32, [900, 1250]], [2.55, [928, 1366]],
    [4.12, [928, 1366]], [4.26, [900, 1250]], [4.40, [840, 1132]], [4.52, [760, 1128]], [4.64, [700, 1132]], [4.97, [598, 1132]], [5.12, [478, 1240]]];
  const panAt = t => kf(t, PAN);
  const panLoc = t => (t < 1.62 ? 'counter' : t < 2.55 ? 'hand' : t < 4.12 ? 'oven' : t < 5.12 ? 'hand' : 'table');
  const panL = t => V.add(panAt(t), [-58, -20]), panR = t => V.add(panAt(t), [58, -20]);
  const bowlSup = t => { const b = bowlAt(t); return V.add(b.p, V.rot([-16, 50], b.a)); };
  const whiskHand = t => { const w = t * Math.PI * 2 * 2.5, b = bowlAt(t).p; return [b[0] + 18 + 16 * Math.cos(w), b[1] - 40 + 6 * Math.sin(w)]; };
  const doorAngle = t => kf(t, [[0, 1], [2.74, 1], [2.85, 0.72], [2.97, 0, 'in'], [3.72, 0], [3.87, 0.45], [3.97, 1, 'in'], [4.02, 0.93, 'out'], [4.07, 1, 'in'], [4.50, 1], [4.58, 0.7], [4.72, 0, 'in']]);
  const handleAt = t => { const th = doorAngle(t) * Math.PI / 2, top = 1418 - 226 * Math.cos(th) + 64 * Math.sin(th); return [905, lerp(top, 1418, 0.06) + 4]; };
  const pocketAt = t => { const b = gBase(t), at = Math.abs(b.turn); return [b.px + b.turn * 34 + 34 * (1 - 0.35 * at) + 10, b.py + 46]; };
  const SERVE_DIR = V.norm([-1, 0.35]);
  const serveHand = tip => V.add(tip, V.mul(SERVE_DIR, -70));
  const CUT1 = [462, 1214], PLB = [345, 1244], CUT2 = [492, 1212], PLA_UP = [305, 1178];
  const mouthOf = (t, side) => { // porte-voix : mains de part et d'autre de la bouche
    const b = gBase(t), p = grannyBare(t, b); const k = G.skeleton(p), R = 86;
    const m = V.add(k.head, [b.turn * 0.5 * R, 0.46 * R]);
    return side < 0 ? V.add(m, [-30, 6]) : V.add(m, [14, 14]);
  };
  function grannyBare(t, b) {
    return { kind: 'granny', id: 'g', s: 1, pelvis: [b.px, b.py], lean: b.lean, turn: b.turn, headTilt: b.headTilt, hL: [b.px - 60, b.py], hR: [b.px + 60, b.py], fL: footTrack(t, GFL, GY, 26), fR: footTrack(t, GFR, GY, 26) };
  }
  const HL = [[0, bowlSup], [1.55, bowlSup], [1.62, panL], [2.55, panL], [2.70, [800, 1240]], [2.86, [690, 1120]], [3.00, [712, 1200]], [3.22, [722, 1196]], [3.45, [722, 1196]],
    [3.55, pocketAt], [3.62, pocketAt], [3.72, [792, 1186]], [3.87, [800, 1196]], [4.12, panL], [5.12, panL], [5.20, pocketAt], [5.27, pocketAt],
    [5.33, [548, 1240]], [5.36, [548, 1240]], [5.44, [482, 1196]], [5.48, [490, 1192]], [5.58, t => mouthOf(t, -1)], [5.85, t => mouthOf(t, -1)], [5.95, [700, 1190]],
    [6.15, [706, 1180]], [6.22, [684, 1166]], [6.33, [684, 1186]], [6.40, [700, 1176]], [6.50, [712, 1110]], [6.72, [714, 1118]], [6.85, [650, 1150]], [7.02, [590, 1162]],
    [7.16, serveHand(CUT1)], [7.20, serveHand([458, 1200])], [7.32, serveHand(PLB)], [7.46, serveHand(CUT2)], [7.50, serveHand([488, 1198])], [7.62, serveHand(PLA_UP)],
    [7.72, [566, 1214]], [7.82, [652, 1086]], [8.00, [652, 1083]]];
  const HR = [[0, whiskHand], [0.80, whiskHand], [1.05, [700, 1000]], [1.30, [700, 1000]], [1.48, [730, 1026]], [1.56, [734, 1032]], [1.62, panR], [2.55, panR],
    [2.70, [880, 1250]], [2.86, [866, 1108]], [3.00, [820, 1200]], [3.22, [812, 1196]], [3.45, [812, 1196]], [3.55, pocketAt], [3.62, pocketAt], [3.72, handleAt], [3.87, handleAt],
    [4.00, [900, 1250]], [4.12, panR], [5.12, panR], [5.20, pocketAt], [5.27, pocketAt], [5.44, [640, 1200]], [5.58, t => mouthOf(t, 1)], [5.85, t => mouthOf(t, 1)], [5.95, [762, 1192]],
    [6.20, [792, 1182]], [6.72, [792, 1182]], [6.85, [704, 1200]], [7.02, [640, 1205]], [7.16, [588, 1230]], [7.62, [588, 1230]], [7.82, [674, 1090]], [8.00, [674, 1088]]];

  function grannyPose(t) {
    const b = gBase(t), p = grannyBare(t, b);
    p.hL = kfF(t, HL); p.hR = kfF(t, HR);
    p.back = t >= 6.08 && t < 6.72;
    p.armsBehind = p.back;
    // tape du pied en attendant
    p.footAngR = t > 3.24 && t < 3.46 ? -0.35 * Math.max(0, Math.sin((t - 3.24) * Math.PI * 2 * 4.5)) : 0;
    p.skirt = Math.sin(t * 7) * 3 + (gField(t + 0.02, 1) - gField(t - 0.06, 1)) * -0.25;
    // raccourci (bras vers la caméra)
    p.armScale = t < 1.55 ? 0.62 : (t > 5.12 && t < 5.3) ? 0.7 : 1;
    p.mittsInPocket = t < 3.6 || t >= 5.24;
    const mitts = t >= 3.6 && t < 5.24;
    p.handL = mitts ? 'mitt' : (t > 5.5 && t < 5.9) ? 'cup' : (t >= 1.6 && t < 2.6) || (t >= 4.1) && t < 5.12 ? 'grip' : (t > 6.38 && t < 7.72) ? 'grip' : t > 5.3 && t < 5.46 ? 'grip' : 'open';
    p.handR = mitts ? 'mitt' : t < 0.8 || (t > 0.8 && t < 1.5) ? 'grip' : (t > 5.5 && t < 5.9) ? 'cup' : (t >= 1.6 && t < 2.6) ? 'grip' : 'open';
    // expression
    const ex = { eyes: 'open', mouth: 'smile', look: [0, 0] };
    if (t < 0.8) { ex.eyes = 'half'; ex.look = [-0.4, 1]; ex.mouth = Math.floor(t * 5) % 2 ? 'o' : 'smile'; }
    else if (t < 1.45) { ex.eyes = 'half'; ex.look = [-0.5, 1]; }
    else if (t < 2.1) { ex.look = [0.8, 0.3]; }
    else if (t < 2.7) { ex.eyes = 'half'; ex.mouth = 'flat'; ex.look = [1, 0.6]; }
    else if (t < 3.0) { ex.eyes = 'happy'; }
    else if (t < 3.47) { ex.look = [-0.7, -1]; ex.mouth = t > 3.2 ? 'o' : 'smile'; ex.brow = 0.6; }
    else if (t < 3.72) { ex.look = [0.3, 0.8]; }
    else if (t < 4.3) { ex.mouth = 'flat'; ex.look = [1, 0.7]; }
    else if (t < 5.45) { ex.eyes = t > 4.6 && t < 5.0 ? 'happy' : 'open'; ex.look = [-1, 0.8]; }
    else if (t < 5.56) { ex.mouth = 'o'; ex.look = [-1, -0.3]; ex.brow = 0.5; }
    else if (t < 5.9) { ex.eyes = 'happy'; ex.mouth = 'call'; ex.brow = 0.8; }
    else if (t < 7.02) { ex.look = [-1, 0.6]; if (t > 6.86) { ex.brow = 1; ex.mouth = 'o'; } }
    else if (t < 7.78) { ex.look = [-1, 0.7]; ex.mouth = 'open'; }
    else { ex.eyes = 'happy'; ex.mouth = 'big'; }
    for (const bt of [1.92, 4.66, 7.02]) if (t >= bt && t < bt + 0.09) ex.blink = 1;
    p.expr = ex;
    // ordre de dessin bras / accessoires
    if (t < 0.8) p.order = ['armL', 'bowlBack', 'whisk', 'bowlFront', 'armR'];
    else if (t < 1.55) p.order = ['armL', 'bowlBack', 'bowlFront', 'whisk', 'armR'];
    else if (panLoc(t) === 'hand') p.order = p.turn > 0 ? ['armL', 'pan', 'armR'] : ['armR', 'pan', 'armL'];
    else if (t >= 5.3 && t < 5.48) p.order = ['armR', 'armL', 'berry'];
    else if (t >= 6.38 && t < 7.72) p.order = ['armR', 'server', 'armL'];
    else p.order = p.turn > 0 ? ['armL', 'armR'] : ['armR', 'armL'];
    p.farArmBehind = (t > 2.7 && t < 3.0);
    p.props = grannyProps(t);
    return p;
  }

  function bowlPart(ctx, b, part, t) {
    const R = (x, y) => V.add(b.p, V.rot([x, y], b.a));
    if (part === 'back') {
      shape(ctx, ell(b.p[0], b.p[1], 58, 15, b.a, 18), { fill: '#efe2c8', key: 'bowlIn', lw: 2.6 });
      const fillLvl = t < 0.95 ? 1 : 1 - prog(t, 0.95, 1.32);
      if (fillLvl > 0.05) { const c = R(0, 4); shape(ctx, ell(c[0], c[1], 50 * (0.6 + 0.4 * fillLvl), 11 * (0.6 + 0.4 * fillLvl), b.a, 16), { fill: PAL.batter, key: 'bowlBatter', lw: 1.8 }); }
    } else {
      const pts = [R(-58, 0), R(-54, 22), R(-34, 42), R(0, 48), R(34, 42), R(54, 22), R(58, 0), R(40, 10), R(0, 15), R(-40, 10)];
      shape(ctx, pts, { fill: '#f6efe0', key: 'bowlF', lw: 3 });
      line(ctx, [R(-52, 14), R(0, 26), R(52, 14)], 5, '#7fb2d8', 'bowlBand', 0.6);
    }
  }
  function whiskAt(ctx, hand, dir, key) {
    const end = V.add(hand, V.mul(dir, 34)), n = V.perp(dir);
    line(ctx, [V.add(hand, V.mul(dir, -8)), end], 5, '#b07a4a', key + 'h', 0.4, false);
    for (let i = -1; i <= 1; i++) {
      const tip = V.add(end, V.mul(dir, 34));
      shape(ctx, [end, V.add(V.mix(end, tip, 0.5), V.mul(n, 11 * i + 3)), tip, V.add(V.mix(end, tip, 0.5), V.mul(n, 11 * i - 3))], { key: key + 'w' + i, lw: 1.6, ink: '#8a8a8a', jit: 0.6 });
    }
  }
  function server(ctx, hand, key) {
    const tip = V.add(hand, V.mul(SERVE_DIR, 70)), n = V.perp(SERVE_DIR);
    line(ctx, [V.add(hand, V.mul(SERVE_DIR, -16)), V.add(hand, V.mul(SERVE_DIR, 26))], 7, '#e0c9a0', key + 'hd', 0.4, false);
    shape(ctx, [V.add(hand, V.mul(SERVE_DIR, 26)), V.add(tip, V.mul(n, 16)), V.add(tip, V.mul(SERVE_DIR, 8)), V.add(tip, V.mul(n, -12))], { fill: '#d6d6d6', key: key + 'bl', lw: 2.2 });
    return tip;
  }
  function grannyProps(t) {
    const pr = {};
    if (t < 1.55) {
      const b = bowlAt(t);
      pr.bowlBack = c => bowlPart(c, b, 'back', t);
      pr.bowlFront = c => bowlPart(c, b, 'front', t);
      pr.whisk = (c, k) => {
        const h = k.armR.end;
        const dir = t < 0.8 ? V.norm([-0.35, 1]) : t < 1.3 ? V.norm([-0.2, 1]) : V.norm([-0.5, 1]);
        whiskAt(c, h, dir, 'whisk');
        if (t > 0.85 && t < 1.3) { const d = (t * 3) % 1, tip = V.add(h, V.mul(dir, 72)); shape(c, ell(tip[0], tip[1] + d * 40, 4, 6, 0, 8), { fill: PAL.batter, key: 'drip', lw: 1.4 }); }
      };
    }
    if (panLoc(t) === 'hand') pr.pan = c => G.cakeShape(c, panAt(t), 1, cakeState(t), 'cakeH');
    if (t >= 5.3 && t < 5.48) pr.berry = (c, k) => { const h = k.armL.end; shape(c, ell(h[0], h[1] + 6, 8, 9, 0.2, 8), { fill: PAL.berry, key: 'berryH', lw: 1.6 }); };
    if (t >= 6.38 && t < 7.72) pr.server = (c, k) => {
      const tip = server(c, k.armL.end, 'srv');
      if ((t >= 7.18 && t < 7.32) || (t >= 7.48 && t < 7.62)) G.slice(c, tip[0] + 6, tip[1] - 8, 0.85, 'sliceS' + (t < 7.4 ? 'B' : 'A'));
    };
    return pr;
  }

  /* ================= ENFANTS ================= */
  const KID_ANK = 18; // hauteur de cheville (unités du rig enfant)
  function runLegs(pos, s, turn, phase, front) {
    const res = {};
    for (const [sd, ph] of [['L', phase], ['R', phase + Math.PI]]) {
      const lift = Math.max(0, Math.cos(ph)) * 34 * s;
      if (front) res['f' + sd] = [pos[0] + (sd === 'L' ? -16 : 16) * s + turn * 18 * s * Math.sin(ph), pos[1] - KID_ANK * s + Math.sin(ph) * 9 * s - lift];
      else res['f' + sd] = [pos[0] + Math.sign(turn) * Math.sin(ph) * 44 * s, pos[1] - KID_ANK * s - lift];
    }
    res.bob = Math.abs(Math.sin(phase)) * 8 * s;
    return res;
  }
  function runArms(sh, s, turn, phase, front) {
    // bras opposés aux jambes, coudes pliés
    const a = {};
    for (const [sd, ph] of [['L', phase + Math.PI], ['R', phase]]) {
      const base = sd === 'L' ? sh.L : sh.R;
      if (front) a['h' + sd] = [base[0] + (sd === 'L' ? -14 : 14) * s, base[1] + 62 * s - Math.sin(ph) * 22 * s];
      else a['h' + sd] = [base[0] + Math.sign(turn) * Math.sin(ph) * 40 * s, base[1] + 64 * s - Math.abs(Math.sin(ph)) * 16 * s];
    }
    return a;
  }
  const pathPoint = (pts, u) => { // polyligne paramétrée par longueur
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + V.len(V.sub(pts[i], pts[i - 1])));
    const d = clamp(u, 0, 1) * L[L.length - 1];
    for (let i = 1; i < pts.length; i++) if (d <= L[i] + 1e-6) { const k = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1); return { p: V.mix(pts[i - 1], pts[i], k), dir: V.norm(V.sub(pts[i], pts[i - 1])), dist: d }; }
    return { p: pts[pts.length - 1], dir: V.norm(V.sub(pts[pts.length - 1], pts[pts.length - 2])), dist: L[L.length - 1] };
  };
  const shoulderGuess = (pelvis, s, lean) => ({ L: V.add(pelvis, V.rot([-40 * s, -100 * s], lean)), R: V.add(pelvis, V.rot([40 * s, -100 * s], lean)) });

  /* ---- Léo ---- */
  const LEO_LOOP = { c: [262, 1128], rx: 82, ry: 16, P: 2.4 };
  const LEO_STOP = 5.52;
  const leoLoopAngle = t => { const tt = t < LEO_STOP ? t : LEO_STOP + (1 - Math.pow(1 - clamp((t - LEO_STOP) / 0.1, 0, 1), 2)) * 0.05; return tt / LEO_LOOP.P * Math.PI * 2; };
  const LEO_SEAT = [78, 1262];
  function leoPose(t) {
    const p = { kind: 'leo', id: 'leo', expr: { eyes: 'open', mouth: 'big', look: [0, 0] } };
    if (t < 5.62) { // jardin : court après le ballon (boucle)
      const a = leoLoopAngle(t), pos = [LEO_LOOP.c[0] + LEO_LOOP.rx * Math.cos(a), LEO_LOOP.c[1] + LEO_LOOP.ry * Math.sin(a)];
      const vx = -Math.sin(a), s = G.depthScale(pos[1]);
      const stopping = t >= LEO_STOP;
      let turn = clamp(vx * 1.6, -0.85, 0.85);
      if (stopping) turn = lerp(turn, 0, prog(t, LEO_STOP, 5.6));
      const phase = a * 4.2;
      const legs = runLegs(pos, s, turn, stopping ? phase * (1 - prog(t, LEO_STOP, 5.62)) : phase, Math.abs(turn) < 0.35);
      const pelvis = [pos[0], pos[1] - (KID_ANK + 170) * s - (stopping ? 0 : legs.bob)];
      Object.assign(p, { s, pelvis, turn, lean: stopping ? -0.08 : turn * 0.12, fL: legs.fL, fR: legs.fR, layer: 'garden' });
      const arms = runArms(shoulderGuess(pelvis, s, p.lean), s, turn, phase, Math.abs(turn) < 0.35);
      p.hL = arms.hL; p.hR = arms.hR;
      if (stopping) { p.expr = { eyes: 'wide', mouth: 'o', look: [0, -0.3] }; p.hL = V.add(pelvis, [-46 * s, -40 * s]); p.hR = V.add(pelvis, [46 * s, -40 * s]); p.exclaim = prog(t, LEO_STOP, LEO_STOP + 0.06); }
      p.groundY = pos[1];
      return p;
    }
    const start = (() => { const a = leoLoopAngle(5.62); return [LEO_LOOP.c[0] + LEO_LOOP.rx * Math.cos(a), LEO_LOOP.c[1] + LEO_LOOP.ry * Math.sin(a)]; })();
    if (t < 6.2) { // course vers la cuisine
      const u = E.in(prog(t, 5.62, 6.2)) * 0.25 + prog(t, 5.62, 6.2) * 0.75;
      const path = [start, [150, 1450], [140, 1580]];
      const pp = pathPoint(path, u), s = G.depthScale(pp.p[1]);
      const turn = clamp(pp.dir[0] * 0.9, -0.5, 0.5);
      const phase = pp.dist / 34 + 1.2;
      const legs = runLegs(pp.p, s, turn, phase, true);
      const pelvis = [pp.p[0], pp.p[1] - (KID_ANK + 168) * s - legs.bob];
      const arms = runArms(shoulderGuess(pelvis, s, 0), s, turn, phase, true);
      Object.assign(p, { s, pelvis, turn, lean: turn * 0.1, fL: legs.fL, fR: legs.fR, hL: arms.hL, hR: arms.hR, groundY: pp.p[1], layer: pp.p[1] < 1450 ? 'garden' : 'kitchen' });
      p.exclaim = 1 - prog(t, 5.62, 5.75);
      return p;
    }
    const s = 1.0;
    // saut sur la chaise puis assis de profil
    const swingL = 0.3 + 0.45 * Math.sin(t * Math.PI * 2 * 1.6), swingR = 0.3 + 0.45 * Math.sin(t * Math.PI * 2 * 1.6 + Math.PI);
    const seatedFeet = pel => ({ fL: V.add(pel, [(-4 + 95 + 88 * Math.sin(swingL)) * s, (2 + 88 * Math.cos(swingL)) * s]), fR: V.add(pel, [(95 + 88 * Math.sin(swingR)) * s, (6 + 88 * Math.cos(swingR)) * s]) });
    if (t < 6.42) {
      const pel = kf(t, [[6.2, [140, 1580 - 186 * s]], [6.26, [136, 1580 - 160 * s], 'out'], [6.34, [104, 1215], 'out'], [6.42, LEO_SEAT, 'in']]);
      const turn = kf(t, [[6.2, -0.3], [6.34, 0.6], [6.42, 0.95]]);
      const tuck = prog(t, 6.26, 6.34);
      const sf = seatedFeet(pel);
      const fl = t < 6.26 ? { fL: [126, 1580 - KID_ANK], fR: [154, 1580 - KID_ANK] } : { fL: V.mix(V.add(pel, [10, 120]), sf.fL, prog(t, 6.34, 6.42)), fR: V.mix(V.add(pel, [30, 118]), sf.fR, prog(t, 6.34, 6.42)) };
      Object.assign(p, { s, pelvis: pel, turn, lean: lerp(0.15, 0, tuck), fL: fl.fL, fR: fl.fR, hL: V.add(pel, [-20 + tuck * 20, -30]), hR: V.add(pel, [30, -40 + tuck * 10]), layer: 'kitchen', seated: t > 6.36, groundY: 1580 });
      p.expr = { eyes: 'happy', mouth: 'big' };
      return p;
    }
    const pel = [LEO_SEAT[0] + (t > 6.5 && t < 6.85 ? Math.sin(t * 50) * 1.5 : 0), LEO_SEAT[1] + (t > 6.5 && t < 6.85 ? Math.abs(Math.sin(t * 50)) * -3 : 0)];
    const sf = seatedFeet(pel);
    Object.assign(p, { s, pelvis: pel, turn: 0.92, lean: 0.05, fL: sf.fL, fR: sf.fR, layer: 'kitchen', seated: true, groundY: 1580 });
    p.hL = [196, 1224]; p.hR = [214, 1232];
    p.handL = 'open'; p.handR = 'open';
    p.expr = { eyes: 'open', mouth: 'smile', look: [1, 0.4] };
    // pouffe de rire en voyant Lina
    if (t >= 6.5 && t < 6.9) {
      const k = G.skeleton(Object.assign({}, p, { hL: p.hL, hR: p.hR }));
      p.hR = kfF(t, [[6.5, [214, 1232]], [6.58, V.add(k.head, [30, 34])], [6.82, V.add(k.head, [30, 34])], [6.9, [214, 1232]]]);
      p.headTurn = -0.55 * Math.sin(Math.PI * prog(t, 6.5, 6.9));
      p.expr = { eyes: 'happy', mouth: 'giggle' }; p.handR = 'open';
    }
    if (t >= 7.38 && t < 7.92) { // tend l'assiette à Mamie
      const plt = kf(t, [[7.38, [240, 1246]], [7.52, PLA_UP], [7.72, PLA_UP], [7.88, [240, 1246]]]);
      p.hL = V.add(plt, [-36, 4]); p.hR = V.add(plt, [36, 6]); p.handL = 'grip'; p.handR = 'grip';
      p.lean = kf(t, [[7.38, 0.05], [7.52, 0.22], [7.72, 0.22], [7.88, 0.05]]);
      p.plate = plt; p.expr = { eyes: 'wide', mouth: 'big', look: [1, -0.3] };
    }
    if (t >= 7.88) p.expr = { eyes: 'happy', mouth: 'big' };
    if (t >= 7.0 && t < 7.38) p.expr = { eyes: 'open', mouth: 'smile', look: [1, 0.2] };
    return p;
  }

  /* ---- Lina ---- */
  const SW = { piv: [240, 646], L: 280, A: 0.32, P: 1.8, t0: 0.15, jump: 5.6 };
  const swingAngle = t => { const base = SW.A * Math.sin((t - SW.t0) / SW.P * Math.PI * 2); return t < SW.jump ? base : base * Math.exp(-(t - SW.jump) * 1.1); };
  const swingSeat = t => { const a = swingAngle(t); return V.add(SW.piv, [Math.sin(a) * SW.L, Math.cos(a) * SW.L]); };
  const LINA_SEAT = [330, 1257];
  const LINA_LAND = 5.94, LINA_LAND_P = [368, 1150];
  function linaCore(t) {
    const p = { kind: 'lina', id: 'lina', expr: { eyes: 'open', mouth: 'big', look: [0, 0] } };
    if (t < SW.jump) { // sur la balançoire, de profil
      const a = swingAngle(t), da = swingAngle(t + 0.02) - a, seat = swingSeat(t), s = 0.47;
      const pump = clamp(da * 60, -1, 1) * 0.5 + 0.5;
      const pelvis = V.add(seat, [0, -8 * s]);
      const lean = -a * 0.9 - 0.08;
      const hipF = V.add(pelvis, V.rot([0, 0], lean));
      const knee = V.add(hipF, V.rot([92 * s, -4 * s], -a * 0.3));
      const fdir = V.norm(V.mix([-0.25, 1], [0.95, 0.35], pump));
      const foot = V.add(knee, V.mul(fdir, 86 * s));
      const rope = V.add(SW.piv, V.mul([Math.sin(a), Math.cos(a)], SW.L * 0.6));
      Object.assign(p, { s, pelvis, turn: 0.85, lean, fL: V.add(foot, [-4, -2]), fR: foot, hL: V.add(rope, [-3, 6]), hR: V.add(rope, [4, 10]), layer: 'garden-back', groundY: 1150, seated: true, handL: 'grip', handR: 'grip' });
      p.expr = { eyes: pump > 0.5 ? 'happy' : 'open', mouth: 'big', look: [0.6, -0.3] };
      if (t > 5.52) { p.expr = { eyes: 'wide', mouth: 'o', look: [-0.5, 0] }; p.exclaim = prog(t, 5.52, 5.58); }
      return p;
    }
    if (t < LINA_LAND + 0.08) { // saut, vol balistique, atterrissage (gravité)
      const s0 = swingSeat(SW.jump), s = G.depthScale(LINA_LAND_P[1]) * 0.98;
      const u = prog(t, SW.jump, LINA_LAND), tau = (t - SW.jump);
      const x = lerp(s0[0], LINA_LAND_P[0], u), Ty = LINA_LAND - SW.jump;
      const y0 = s0[1] - 8 * 0.47, yL = LINA_LAND_P[1] - (KID_ANK + 160) * s;
      const g = 2 * (yL - y0 + 60 * Ty) / (Ty * Ty); // vy initial = -60 px/s (petite impulsion)
      let py = t < LINA_LAND ? y0 - 60 * tau + 0.5 * g * tau * tau : yL + Math.sin(Math.PI * prog(t, LINA_LAND, LINA_LAND + 0.08)) * 16 * s; // écrasement
      const pelvis = [t < LINA_LAND ? x : LINA_LAND_P[0], py];
      const air = t < LINA_LAND;
      const fL = air ? V.add(pelvis, [-14 * s + 30 * s * (1 - u), 150 * s]) : [LINA_LAND_P[0] - 18 * s, LINA_LAND_P[1] - KID_ANK * s];
      const fR = air ? V.add(pelvis, [16 * s + 30 * s * (1 - u), 155 * s]) : [LINA_LAND_P[0] + 18 * s, LINA_LAND_P[1] - KID_ANK * s];
      const sh = shoulderGuess(pelvis, s, 0);
      Object.assign(p, { s, pelvis, turn: lerp(0.6, 0, u), lean: 0, fL, fR, hL: V.add(sh.L, [-40 * s, -50 * s]), hR: V.add(sh.R, [40 * s, -50 * s]), layer: 'garden', groundY: LINA_LAND_P[1] });
      p.expr = { eyes: 'happy', mouth: 'big' }; p.exclaim = 1 - prog(t, SW.jump, SW.jump + 0.15);
      return p;
    }
    if (t < 6.3) { // course vers sa chaise (derrière la table)
      const u = prog(t, LINA_LAND + 0.08, 6.3);
      const pp = pathPoint([LINA_LAND_P, [318, 1450], [420, 1505]], u), s = G.depthScale(pp.p[1]);
      const turn = clamp(pp.dir[0] * 0.9, -0.5, 0.6);
      const phase = pp.dist / 32;
      const legs = runLegs(pp.p, s, turn, phase, true);
      const pelvis = [pp.p[0], pp.p[1] - (KID_ANK + 168) * s - legs.bob];
      const arms = runArms(shoulderGuess(pelvis, s, 0), s, turn, phase, true);
      Object.assign(p, { s, pelvis, turn, lean: turn * 0.1, fL: legs.fL, fR: legs.fR, hL: arms.hL, hR: arms.hR, groundY: pp.p[1], layer: pp.p[1] < 1450 ? 'garden' : 'kitchen' });
      return p;
    }
    const s = 0.95;
    const sw1 = Math.sin(t * Math.PI * 2 * 1.45), sw2 = Math.sin(t * Math.PI * 2 * 1.45 + 2.6);
    const seated = pel => {
      const kL = V.add(pel, [-22 * s, 30 * s]), kR = V.add(pel, [22 * s, 30 * s]);
      return { kneeL: kL, kneeR: kR, fL: V.add(kL, [-3 * s + sw1 * 5 * s, 88 * s * (1 - 0.22 * Math.max(0, sw1))]), fR: V.add(kR, [3 * s + sw2 * 5 * s, 88 * s * (1 - 0.22 * Math.max(0, sw2))]), footAngL: Math.max(0, sw1) * 0.4, footAngR: Math.max(0, sw2) * 0.4 };
    };
    if (t < 6.45) { // grimpe sur la chaise
      const pel = kf(t, [[6.3, [420, 1505 - 186 * s]], [6.35, [416, 1505 - 160 * s], 'out'], [6.4, [370, 1210], 'out'], [6.45, LINA_SEAT, 'in']]);
      const tuck = prog(t, 6.35, 6.42);
      Object.assign(p, { s, pelvis: pel, turn: lerp(-0.4, 0.1, tuck), lean: 0, layer: 'kitchen', groundY: 1505 });
      if (t < 6.35) { p.fL = [404, 1505 - KID_ANK * s]; p.fR = [436, 1505 - KID_ANK * s]; }
      else { p.fL = V.add(pel, [-20 * s, 110 * s]); p.fR = V.add(pel, [20 * s, 112 * s]); }
      p.hL = V.add(pel, [-60 * s, -60 * s]); p.hR = V.add(pel, [50 * s, -70 * s]);
      p.expr = { eyes: 'happy', mouth: 'big' };
      return p;
    }
    Object.assign(p, { s, pelvis: LINA_SEAT, turn: 0.12, lean: 0, layer: 'kitchen', seatedFront: true, seated: true, groundY: 1505 }, seated(LINA_SEAT));
    p.hL = [300, 1230]; p.hR = [362, 1232]; p.armScale = 0.6; p.handL = 'open'; p.handR = 'open';
    p.expr = { eyes: 'open', mouth: 'smile', look: [0.8, 0.5] };
    if (t >= 6.47 && t < 6.78) { // le doigt dans la crème !
      const k = G.skeleton(Object.assign({}, p));
      const mouth = V.add(k.head, [6, 0.46 * 80 * s + 4]);
      p.hR = kfF(t, [[6.47, [362, 1232]], [6.53, [452, 1204]], [6.57, [454, 1210]], [6.64, V.add(mouth, [10, 14])], [6.72, V.add(mouth, [10, 14])], [6.78, [372, 1260]]]);
      p.handR = 'point'; p.armScale = t < 6.6 ? 0.85 : 0.6;
      p.expr = t < 6.58 ? { eyes: 'open', mouth: 'smile', look: [1, 0.6] } : { eyes: 'closed', mouth: 'lick' };
      p.headTurn = t < 6.6 ? 0.25 : 0;
    }
    if (t >= 6.78 && t < 7.18) { // sage comme une image : mains sur les genoux, elle siffle
      p.hL = [312, 1290]; p.hR = [350, 1292]; p.armsUnderTable = true;
      p.expr = { eyes: 'open', mouth: 'whistle', look: [-0.4, -1] }; p.headTilt = Math.sin(t * 9) * 0.06;
    }
    if (t >= 7.18 && t < 7.34) { p.hL = kfF(t, [[7.18, [312, 1290]], [7.3, [300, 1230]]]); p.hR = kfF(t, [[7.18, [350, 1292]], [7.3, [362, 1232]]]); p.armsUnderTable = t < 7.22; p.expr = { eyes: 'wide', mouth: 'big', look: [0.5, 0.6] }; }
    if (t >= 7.34 && t < 7.62) { // applaudit
      const c = Math.abs(Math.sin((t - 7.34) * Math.PI * 2 * 3.6));
      p.hL = [330 - 8 - c * 22, 1176]; p.hR = [330 + 8 + c * 22, 1178]; p.armScale = 0.7;
      p.expr = { eyes: 'happy', mouth: 'big' };
    }
    if (t >= 7.62) { p.hL = kfF(t, [[7.62, [308, 1180]], [7.72, [300, 1230]]]); p.hR = kfF(t, [[7.62, [352, 1180]], [7.72, [362, 1232]]]); p.expr = { eyes: 'happy', mouth: 'big' }; }
    return p;
  }
  function linaPose(t) {
    const p = linaCore(t), q = linaCore(Math.max(0, t - 0.07));
    const kp = G.skeleton(p).head, kq = G.skeleton(q).head;
    const v = V.sub(kp, kq);
    p.pig = clamp(-v[0] * 0.03, -0.8, 0.8) + clamp(-v[1] * 0.012, -0.3, 0.3) * 0;
    p.skirt = clamp(-v[0] * 0.35, -12, 12);
    return p;
  }

  /* ================= ÉTAT DU MONDE ================= */
  function cakeState(t) {
    return { loc: panLoc(t), fill: prog(t, 0.97, 1.32), rise: E.io(prog(t, 3.0, 3.7)), bake: prog(t, 3.0, 3.75), berry: t >= 5.44, finger: t >= 6.55 ? 1 : 0, slices: t >= 7.48 ? 2 : t >= 7.18 ? 1 : 0 };
  }
  function worldState(t) {
    const a = leoLoopAngle(Math.min(t, 5.62));
    let ball;
    if (t < LEO_STOP) ball = [LEO_LOOP.c[0] + LEO_LOOP.rx * Math.cos(a + 0.55), LEO_LOOP.c[1] + LEO_LOOP.ry * Math.sin(a + 0.55)];
    else { const b0 = [LEO_LOOP.c[0] + LEO_LOOP.rx * Math.cos(leoLoopAngle(LEO_STOP) + 0.55), LEO_LOOP.c[1] + LEO_LOOP.ry * Math.sin(leoLoopAngle(LEO_STOP) + 0.55)]; const u = E.out(prog(t, LEO_STOP, 6.1)); ball = V.add(b0, [-40 * u, 22 * u]); }
    return {
      t, swing: swingAngle(t), ball, ballRot: t < LEO_STOP ? t * 9 : LEO_STOP * 9 + E.out(prog(t, LEO_STOP, 6.1)) * 3,
      clockMin: 12 + t * 0.4 + E.io(prog(t, 3.0, 3.7)) * 40, clockSpin: t > 3.02 && t < 3.68 ? 1 : 0,
      ovenDoor: doorAngle(t), ovenOn: true, glow: 0.55 + 0.35 * prog(t, 2.9, 3.2) + Math.sin(t * 11) * 0.04,
      cake: cakeState(t), drawer: kf(t, [[6.2, 0], [6.33, 1], [6.47, 1], [6.56, 0, 'in']]),
      berries: t >= 5.34 ? 3 : 4, leoPlateHeld: t >= 7.38 && t < 7.88, sliceA: t >= 7.62, sliceB: t >= 7.32,
      cat: { x: 925, y: 1782, s: 1, breath: t * 3.2, tail: Math.sin(t * 1.4) * 0.5 + (t > 7.3 ? Math.sin(t * 9) * 0.8 : 0), wake: E.io(prog(t, 7.3, 7.6)), ear: (t > 2.96 && t < 3.08) || (t > 4.71 && t < 4.83) ? 1 : 0 }
    };
  }

  /* ================= SURIMPRESSIONS DESSINÉES ================= */
  function bubble(ctx, t, gp) {
    const sc = kf(t, [[5.5, 0], [5.6, 1.08, 'out'], [5.66, 1], [5.86, 1], [5.95, 0, 'in']]);
    if (sc <= 0.01) return;
    const c = [420, 700], k = G.skeleton(gp), m = V.add(k.head, [-50, 30]);
    ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]);
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 1 + (i % 2) * 0.08; pts.push([c[0] + Math.cos(a) * 190 * r, c[1] + Math.sin(a) * 86 * r]); }
    shape(ctx, [[c[0] + 90, c[1] + 60], V.mix([c[0] + 120, c[1] + 70], m, 0.6), [c[0] + 150, c[1] + 40]], { fill: '#fffaf0', key: 'btail', lw: 3 });
    shape(ctx, pts, { fill: '#fffaf0', key: 'bubble', lw: 3.4 });
    letters(ctx, 'À table !', c[0], c[1] + 2, 78, '#c0392b', 'btxt', prog(t, 5.52, 5.68));
    ctx.restore();
    for (let i = -1; i <= 1; i++) { const a = V.add(m, [-20, i * 18]); line(ctx, [a, V.add(a, [-26, i * 14])], 3, INK, 'shout' + i, 0.6); }
  }
  function exclaim(ctx, kp, amt) {
    if (!amt || amt <= 0.01) return;
    const k = G.skeleton(kp), R = 80 * kp.s, top = V.add(k.head, [0, -R * 1.5]);
    const s = amt * kp.s * 1.2;
    shape(ctx, [[top[0] - 7 * s, top[1] - 34 * s], [top[0] + 7 * s, top[1] - 34 * s], [top[0] + 3 * s, top[1]], [top[0] - 3 * s, top[1]]], { fill: '#ffd04a', key: kp.id + 'ex', lw: 2.4 });
    shape(ctx, ell(top[0], top[1] + 10 * s, 5 * s, 5 * s, 0, 8), { fill: '#ffd04a', key: kp.id + 'exd', lw: 2 });
  }
  function notes(ctx, t, gp) {
    const k = G.skeleton(gp);
    for (let i = 0; i < 3; i++) {
      const t0 = 0.05 + i * 0.32, u = (t - t0) / 0.75;
      if (u <= 0 || u >= 1) continue;
      const s = Math.sin(Math.PI * u) * 1.1, p = V.add(k.head, [-90 - u * 70 + Math.sin(u * 7 + i) * 12, -90 - u * 110]);
      shape(ctx, ell(p[0], p[1], 10 * s, 7.5 * s, -0.4, 10), { fill: INK, key: 'note' + i, lw: 0, jit: 0.6 });
      line(ctx, [[p[0] + 9 * s, p[1] - 2 * s], [p[0] + 9 * s, p[1] - 34 * s], [p[0] + 22 * s, p[1] - 24 * s]], 2.6 * s, INK, 'noteS' + i, 0.6);
    }
  }
  function steam(ctx, t, c, key) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i * 0.33) % 1, x = c[0] - 22 + i * 22;
      line(ctx, [[x, c[1] - ph * 60], [x + Math.sin(ph * 7 + i) * 9, c[1] - 30 - ph * 70], [x - 3, c[1] - 60 - ph * 80]], 3.2 * Math.sin(Math.PI * ph), '#fffaf0', key + i, 0.8);
    }
  }
  function heart(ctx, t, c) {
    const s = kf(t, [[7.82, 0], [7.92, 1.1, 'out'], [8, 1]]);
    if (s <= 0.01) return;
    const y = c[1] - (t - 7.82) * 60;
    shape(ctx, [[c[0], y + 18 * s], [c[0] - 22 * s, y - 2 * s], [c[0] - 14 * s, y - 16 * s], [c[0], y - 8 * s], [c[0] + 14 * s, y - 16 * s], [c[0] + 22 * s, y - 2 * s]], { fill: '#ef6f7a', key: 'heart', lw: 2.6 });
  }

  /* ================= SCÈNE COMPLÈTE ================= */
  function drawScene(ctx, t) {
    const st = worldState(t), gp = grannyPose(t), lp = leoPose(t), np = linaPose(t);
    const kids = [np, lp];
    const drawKid = (ctx2, kp) => {
      const props = {};
      if (kp.plate) props.plate = c => { G.plate(c, kp.plate[0], kp.plate[1], 'plateAH'); if (st.sliceA) G.slice(c, kp.plate[0], kp.plate[1] - 6, 0.9, 'sliceAH'); };
      if (kp.plate) kp.order = ['armL', 'plate', 'armR'];
      kp.props = props;
      G.drawCharacter(ctx2, kp);
    };
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = PAL.wall; ctx.fillRect(0, 0, G.W, G.H); // feuille opaque : chaque dessin repart de zéro
    G.wall(ctx, t);
    G.garden(ctx, t, st, (c2, layer) => { for (const kp of kids) if (kp.layer === layer) drawKid(c2, kp); });
    G.windowAndWall(ctx, t, st);
    G.counter(ctx, st);
    if (st.cake.loc === 'counter') G.cakeShape(ctx, [600, 1120], 1, st.cake, 'cakeC');
    if (t >= 1.55) { const b = bowlAt(t); bowlPart(ctx, b, 'back', t); whiskAt(ctx, V.add(b.p, [30, -52]), V.norm([-0.5, 1]), 'whiskB'); bowlPart(ctx, b, 'front', t); }
    G.oven(ctx, st);
    G.floor(ctx);
    G.lamp(ctx, t);
    // Lina (derrière la table)
    G.chairLina(ctx);
    if (np.layer === 'kitchen') {
      if (np.seated && !np.armsUnderTable) G.drawCharacter(ctx, Object.assign({}, np, { part: 'body' }));
      else drawKid(ctx, np);
    }
    G.table(ctx, st);
    if (t >= 7.72) server(ctx, [600, 1226], 'srvT');
    if (st.cake.loc === 'table' && t > 5.1) steam(ctx, t, [478, 1180], 'stT');
    if (np.layer === 'kitchen' && np.seated && !np.armsUnderTable) G.drawCharacter(ctx, Object.assign({}, np, { part: 'arms', props: {} }));
    // Léo (bout de table, au premier plan)
    G.chairLeo(ctx);
    if (lp.layer === 'kitchen') drawKid(ctx, lp);
    // Mamie
    G.drawCharacter(ctx, gp);
    if (st.cake.loc === 'hand' && t > 4.2) steam(ctx, t, V.add(panAt(t), [0, -60]), 'stH');
    // premier plan
    G.basket(ctx, st);
    G.plant(ctx, t);
    // surimpressions dessinées
    if (t < 1.3) notes(ctx, t, gp);
    bubble(ctx, t, gp);
    for (const kp of kids) exclaim(ctx, kp, kp.exclaim);
    heart(ctx, t, [664, 640]);
    // papier (une seule graine, enregistré sur la feuille) + vignette chaude
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.18; ctx.fillStyle = G.paperPattern(ctx); ctx.fillRect(0, 0, G.W, G.H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(540, 1000, 500, 540, 1000, 1250); vg.addColorStop(0, 'rgba(90,40,20,0)'); vg.addColorStop(1, 'rgba(90,40,20,0.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
    ctx.restore();
  }

  /* ================= FEUILLE D'EXPOSITION ================= */
  const EXPO = G.buildExposure([{ at: 0, on: 2 }, { at: 5.5, on: 1 }, { at: 6.5, on: 2 }]);
  const keyTimes = GK.map(k => k[0]);
  function exposureSheet() {
    const rows = [];
    for (let f = 0; f < G.NFRAMES; f++) {
      const t = EXPO.tOf[f], d = EXPO.drawOf[f], held = f > 0 && EXPO.drawOf[f - 1] === d;
      const beat = BEATS.find(b => t >= b.a && t < b.b) || BEATS[BEATS.length - 1];
      const nearKey = keyTimes.some(k => Math.abs(k - t) < 0.5 / G.FPS + 1e-6);
      let kind = nearKey ? 'KEY' : 'IB';
      if (!nearKey) { for (let i = 1; i < keyTimes.length; i++) { const m = (keyTimes[i - 1] + keyTimes[i]) / 2; if (Math.abs(m - t) < 1 / G.FPS && t > keyTimes[i - 1] && t < keyTimes[i]) kind = 'BD'; } }
      rows.push({ frame: f, time: +t.toFixed(4), drawing: d + 1, held, exposure: f >= 132 && f < 156 ? 'ones' : 'twos', kind, beat: beat.id, action: beat.title, granny: beat.granny, leo: beat.leo, lina: beat.lina });
    }
    return rows;
  }

  /* ================= ÉVÉNEMENTS SONORES (même timeline) ================= */
  const EVENTS = (() => {
    const ev = [];
    for (let x = 0.05; x < 0.8; x += 0.2) ev.push({ t: +x.toFixed(3), type: 'whisk' });
    ev.push({ t: 0.97, type: 'pour', dur: 0.35 }, { t: 1.53, type: 'clunk_soft' }, { t: 1.97, type: 'step' }, { t: 2.10, type: 'step' }, { t: 2.48, type: 'slide' }, { t: 2.95, type: 'door' });
    for (let x = 3.02; x < 3.7; x += 0.075) ev.push({ t: +x.toFixed(3), type: 'tick' });
    ev.push({ t: 3.72, type: 'ding' }, { t: 3.86, type: 'creak' }, { t: 3.97, type: 'clunk' }, { t: 4.07, type: 'clunk_soft' }, { t: 4.3, type: 'slide' }, { t: 4.7, type: 'door' });
    for (const x of [4.76, 4.87, 4.98, 6.04, 6.15, 6.88, 7.0]) ev.push({ t: x, type: 'step' });
    ev.push({ t: 5.12, type: 'thud' }, { t: 5.44, type: 'plop' }, { t: 5.52, type: 'chime' }, { t: 5.6, type: 'creak_swing' }, { t: 5.94, type: 'land' });
    for (let x = 5.64; x < 6.2; x += 0.1) ev.push({ t: +x.toFixed(3), type: 'patter' });
    for (let x = 6.04; x < 6.3; x += 0.09) ev.push({ t: +x.toFixed(3), type: 'patter' });
    ev.push({ t: 6.41, type: 'chair' }, { t: 6.45, type: 'chair' }, { t: 6.26, type: 'drawer' }, { t: 6.55, type: 'drawer_close' }, { t: 6.55, type: 'boop' });
    ev.push({ t: 7.16, type: 'clink' }, { t: 7.32, type: 'clink' }, { t: 7.62, type: 'clink' }, { t: 7.36, type: 'clap' }, { t: 7.5, type: 'clap' }, { t: 7.32, type: 'purr', dur: 0.65 });
    for (let k = 0; k < 6; k++) ev.push({ t: +(0.6 + 0.9 * k).toFixed(3), type: 'creak_swing' });
    for (const x of [0.4, 2.2, 4.9, 7.0]) ev.push({ t: x, type: 'bird' });
    return ev.sort((a, b) => a.t - b.t);
  })();

  /* ================= API ================= */
  function drawFrame(ctx, f) {
    f = clamp(Math.floor(f), 0, G.NFRAMES - 1);
    G.S.drawing = EXPO.drawOf[f];
    drawScene(ctx, EXPO.tOf[f]);
  }
  const frameAt = t => clamp(Math.floor(t * G.FPS + 1e-6), 0, G.NFRAMES - 1);
  G.drawFrame = drawFrame; G.frameAt = frameAt; G.EXPO = EXPO; G.BEATS = BEATS; G.EVENTS = EVENTS; G.exposureSheet = exposureSheet; G.GK = GK;
  G.poses = { grannyPose, leoPose, linaPose, worldState };

  /** Monte le film sur un canvas et expose le contrat window.__anim (export Chromium). */
  G.mount = function (canvas) {
    canvas.width = G.W; canvas.height = G.H;
    const ctx = canvas.getContext('2d');
    let last = -1;
    const api = {
      duration: G.DURATION, fps: G.FPS, width: G.W, height: G.H, frames: G.NFRAMES, canvas, ready: true,
      drawings: EXPO.count, marks: EVENTS, beats: BEATS,
      drawFrame(i) { drawFrame(ctx, i); last = i; return i; },
      seek(t) { return api.drawFrame(frameAt(t)); },
      // lecture temps réel : ne redessine que si le dessin change (twos)
      show(t) { const f = frameAt(t); if (last >= 0 && EXPO.drawOf[f] === EXPO.drawOf[last]) { last = f; return f; } return api.drawFrame(f); },
      exposureSheet
    };
    window.__anim = api;
    return api;
  };
})(window.GF = window.GF || {});
