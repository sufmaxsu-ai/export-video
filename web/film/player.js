/* =====================================================================
 * player.js — lecteur temps réel (requestAnimationFrame) du film dessiné.
 * Utilise la même timeline et le même drawFrame() que l'export Chromium.
 * GFPlayer.create(rootElement, {audio: 'soundtrack.m4a'})
 * ===================================================================== */
(function () {
  'use strict';
  const fmt = s => s.toFixed(2).padStart(5, '0') + '\u00a0s';
  function el(tag, attrs = {}, kids = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
    for (const k of kids) e.appendChild(k);
    return e;
  }
  function create(root, opts = {}) {
    const GF = window.GF, N = GF.NFRAMES, FPS = GF.FPS, DUR = GF.DURATION;
    root.classList.add('gfp');
    const canvas = el('canvas', { class: 'gfp-canvas', role: 'img', 'aria-label': 'Animation dessinée image par image : Mamie prépare un gâteau et appelle ses petits-enfants à table.' });
    const stage = el('div', { class: 'gfp-stage' }, [canvas]);
    const playBtn = el('button', { type: 'button', class: 'gfp-btn gfp-primary', 'aria-label': 'Lecture' });
    const restartBtn = el('button', { type: 'button', class: 'gfp-btn', 'aria-label': 'Redémarrer', text: '⟲ Début' });
    const stepB = el('button', { type: 'button', class: 'gfp-btn', 'aria-label': 'Image précédente', text: '◀︎' });
    const stepF = el('button', { type: 'button', class: 'gfp-btn', 'aria-label': 'Image suivante', text: '▶︎' });
    const loopBox = el('input', { type: 'checkbox', id: 'gfp-loop-' + Math.random().toString(36).slice(2, 7) });
    loopBox.checked = opts.loop !== false;
    const loopLbl = el('label', { class: 'gfp-check', for: loopBox.id }, [loopBox, document.createTextNode(' Boucle')]);
    const onionBox = el('input', { type: 'checkbox', id: 'gfp-onion-' + Math.random().toString(36).slice(2, 7) });
    const onionLbl = el('label', { class: 'gfp-check', for: onionBox.id, title: 'Pelure d’oignon : superpose le dessin précédent et le suivant (contrôle du mouvement)' }, [onionBox, document.createTextNode(' Pelure d’oignon')]);
    const soundBtn = el('button', { type: 'button', class: 'gfp-btn', 'aria-pressed': 'false', text: '🔇 Son' });
    const range = el('input', { type: 'range', min: '0', max: String(N - 1), step: '1', value: '0', class: 'gfp-range', 'aria-label': 'Position dans l’animation (image)' });
    const time = el('output', { class: 'gfp-time', 'aria-live': 'off' });
    const info = el('span', { class: 'gfp-info' });
    const bar = el('div', { class: 'gfp-bar' }, [playBtn, restartBtn, stepB, stepF, time]);
    const bar2 = el('div', { class: 'gfp-bar gfp-bar2' }, [loopLbl, onionLbl, soundBtn, info]);
    root.append(stage, range, bar, bar2);

    const api = GF.mount(canvas);
    const ctx = canvas.getContext('2d');
    let audio = null;
    if (opts.audio) { audio = new Audio(opts.audio); audio.preload = 'auto'; audio.muted = true; audio.addEventListener('error', () => { soundBtn.disabled = true; soundBtn.title = 'Piste son absente (le film fonctionne sans)'; }); }
    let playing = false, t0 = 0, tCur = 0, raf = 0, frame = -1;
    const off = document.createElement('canvas'); off.width = GF.W; off.height = GF.H; const octx = off.getContext('2d');

    function render(t) {
      const f = GF.frameAt(t);
      if (onionBox.checked) {
        GF.drawFrame(octx, Math.max(0, f - 2)); ctx.globalAlpha = 1; GF.drawFrame(ctx, f);
        ctx.save(); ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'hue-rotate(160deg) saturate(2)'; ctx.drawImage(off, 0, 0); ctx.restore();
        GF.drawFrame(octx, Math.min(N - 1, f + 2));
        ctx.save(); ctx.globalAlpha = 0.25; ctx.globalCompositeOperation = 'multiply'; ctx.filter = 'hue-rotate(-60deg) saturate(2)'; ctx.drawImage(off, 0, 0); ctx.restore();
        frame = -1;
      } else if (f !== frame) { api.show(t); frame = f; }
      range.value = String(f);
      time.textContent = fmt(t) + ' / ' + fmt(DUR);
      info.textContent = `image ${String(f + 1).padStart(3, '0')}/${N} · dessin n° ${GF.EXPO.drawOf[f] + 1}/${GF.EXPO.count} · ${GF.FPS} i/s`;
    }
    function setPlaying(v) {
      playing = v;
      playBtn.textContent = v ? '❚❚ Pause' : '► Lecture';
      playBtn.setAttribute('aria-label', v ? 'Pause' : 'Lecture');
      if (v) {
        if (tCur >= DUR - 1 / FPS) tCur = 0;
        t0 = performance.now() - tCur * 1000;
        if (audio && !audio.muted) { audio.currentTime = tCur; audio.play().catch(() => {}); }
        cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
      } else { cancelAnimationFrame(raf); if (audio) audio.pause(); }
    }
    function loop(now) {
      tCur = (now - t0) / 1000;
      if (tCur >= DUR) {
        if (loopBox.checked) { tCur = tCur % DUR; t0 = now - tCur * 1000; if (audio && !audio.muted) { audio.currentTime = tCur; audio.play().catch(() => {}); } }
        else { tCur = DUR - 1 / FPS; render(tCur); setPlaying(false); return; }
      }
      render(tCur);
      raf = requestAnimationFrame(loop);
    }
    function seekFrame(f) { tCur = Math.max(0, Math.min(N - 1, f)) / FPS + 1e-4; if (playing) t0 = performance.now() - tCur * 1000; if (audio) audio.currentTime = tCur; render(tCur); }
    playBtn.addEventListener('click', () => setPlaying(!playing));
    restartBtn.addEventListener('click', () => { seekFrame(0); setPlaying(true); });
    stepB.addEventListener('click', () => { setPlaying(false); seekFrame(GF.frameAt(tCur) - 1); });
    stepF.addEventListener('click', () => { setPlaying(false); seekFrame(GF.frameAt(tCur) + 1); });
    range.addEventListener('input', () => seekFrame(+range.value));
    onionBox.addEventListener('change', () => { frame = -1; render(tCur); });
    soundBtn.addEventListener('click', () => {
      if (!audio) return; audio.muted = !audio.muted;
      soundBtn.textContent = audio.muted ? '🔇 Son' : '🔊 Son'; soundBtn.setAttribute('aria-pressed', String(!audio.muted));
      if (!audio.muted && playing) { audio.currentTime = tCur; audio.play().catch(() => {}); } else audio.pause();
    });
    root.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'range' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') { setPlaying(false); seekFrame(GF.frameAt(tCur) + 1); }
      else if (e.key === 'ArrowLeft') { setPlaying(false); seekFrame(GF.frameAt(tCur) - 1); }
      else if (e.key === 'Home') seekFrame(0);
    });
    root.tabIndex = -1;
    render(0);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPlaying(opts.autoplay !== false && !reduce);
    return { play: () => setPlaying(true), pause: () => setPlaying(false), seekFrame, api };
  }
  window.GFPlayer = { create };
})();
