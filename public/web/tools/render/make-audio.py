#!/usr/bin/env python3
"""Bruitages discrets synthétisés localement (NumPy), synchronisés sur la
timeline du film (events.json exporté par la page : même source que l'image).
Usage : python3 render/make-audio.py <events.json> <sortie.wav> [durée=8]
48 kHz, stéréo, 16 bits. Aucune voix."""
import sys, json, wave
import numpy as np

ev_path, out = sys.argv[1], sys.argv[2]
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 8.0
SR = 48000
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1234)  # graine fixe : son déterministe

def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def noise(n): return rng.standard_normal(n)
def lp(x, k):  # passe-bas simple (moyenne glissante)
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def hp(x, k): return x - lp(x, k)
def sine(f, n, ph=0):
    t = np.arange(n) / SR
    f = np.broadcast_to(f, (n,)) if np.ndim(f) else np.full(n, f)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)
def bell(f, n, d=0.6):
    return (sine(f, n) + 0.5 * sine(f * 2.76, n) * np.exp(-np.arange(n) / SR / (d * 0.4)) + 0.25 * sine(f * 5.4, n) * np.exp(-np.arange(n) / SR / (d * 0.2))) * env(n, 0.002, d)
def add(t, sig, gain=0.3, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[:N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2) * 1.41
    R[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2) * 1.41

def sfx(e):
    ty, t = e['type'], e['t']; n = int(SR * 0.6)
    if ty == 'whisk':
        for k in range(3):
            m = int(SR * 0.05); add(t + k * 0.06, hp(noise(m), 6) * env(m, 0.001, 0.015), 0.10, 0.25)
    elif ty == 'pour':
        m = int(SR * e.get('dur', 0.35)); s = lp(noise(m), 30) * (0.6 + 0.4 * np.sin(np.arange(m) / SR * 2 * np.pi * 9)) * np.hanning(m)
        add(t, s, 0.35, 0.1)
    elif ty in ('clunk_soft', 'clunk', 'thud', 'door', 'land', 'chair', 'drawer_close'):
        f = {'clunk_soft': 140, 'clunk': 110, 'thud': 90, 'door': 75, 'land': 120, 'chair': 210, 'drawer_close': 160}[ty]
        g = {'clunk_soft': 0.25, 'clunk': 0.32, 'thud': 0.35, 'door': 0.45, 'land': 0.28, 'chair': 0.22, 'drawer_close': 0.25}[ty]
        m = int(SR * 0.35); s = sine(f * np.exp(-np.arange(m) / SR * 6), m) * env(m, 0.001, 0.08) + 0.3 * lp(noise(m), 4) * env(m, 0.001, 0.02)
        add(t, s, g, -0.3 if ty in ('land', 'chair') else 0.3)
    elif ty == 'slide':
        m = int(SR * 0.25); s = lp(hp(noise(m), 3), 2) * np.hanning(m); add(t, s, 0.12, 0.4)
    elif ty == 'drawer':
        m = int(SR * 0.18); s = lp(noise(m), 6) * np.hanning(m); add(t, s, 0.16, 0.2)
    elif ty == 'tick':
        m = int(SR * 0.02); add(t, hp(noise(m), 3) * env(m, 0.0005, 0.004), 0.12, -0.1)
    elif ty == 'ding':
        add(t, bell(1568, int(SR * 1.4), 0.9), 0.22, 0.35)
    elif ty == 'creak':
        m = int(SR * 0.2); s = np.sign(sine(180 + 60 * np.sin(np.arange(m) / SR * 40), m)) * 0.3 * np.hanning(m); add(t, lp(s, 8), 0.10, 0.35)
    elif ty == 'creak_swing':
        m = int(SR * 0.22); s = lp(np.sign(sine(320 + 120 * np.sin(np.arange(m) / SR * 25), m)), 10) * np.hanning(m); add(t, s, 0.035, -0.6)
    elif ty == 'step':
        m = int(SR * 0.12); add(t, lp(noise(m), 20) * env(m, 0.002, 0.03), 0.22, 0.1)
    elif ty == 'patter':
        m = int(SR * 0.08); add(t, lp(noise(m), 10) * env(m, 0.001, 0.02), 0.18, -0.4)
    elif ty == 'plop':
        m = int(SR * 0.12); add(t, sine(900 * np.exp(-np.arange(m) / SR * 25), m) * env(m, 0.001, 0.04), 0.18, 0.0)
    elif ty == 'chime':
        add(t, bell(1046.5, int(SR * 1.0), 0.6), 0.16, -0.1); add(t + 0.12, bell(1318.5, int(SR * 1.0), 0.6), 0.16, -0.1)
    elif ty == 'boop':
        m = int(SR * 0.1); add(t, sine(500 + 900 * np.arange(m) / m, m) * env(m, 0.002, 0.04), 0.1, -0.1)
    elif ty == 'clink':
        add(t, bell(2637, int(SR * 0.5), 0.25), 0.12, -0.1)
    elif ty == 'clap':
        m = int(SR * 0.06); add(t, hp(noise(m), 4) * env(m, 0.0005, 0.012), 0.18, -0.15)
    elif ty == 'purr':
        m = int(SR * e.get('dur', 0.6)); s = lp(noise(m), 60) * (0.5 + 0.5 * np.sin(np.arange(m) / SR * 2 * np.pi * 24)) * np.hanning(m); add(t, s, 0.25, 0.5)
    elif ty == 'bird':
        for k in range(3):
            m = int(SR * 0.07); f = 3200 + 1200 * np.sin(np.linspace(0, np.pi, m)); add(t + k * 0.09, sine(f, m) * np.hanning(m), 0.04, -0.7)

events = json.load(open(ev_path))
for e in events: sfx(e)
# ambiance : pièce + boîte à musique très douce (berceuse en do majeur)
amb = lp(noise(N), 200) * 0.02
L += amb; R += amb
mel = [523.3, 659.3, 784.0, 659.3, 698.5, 880.0, 784.0, 659.3, 587.3, 698.5, 659.3, 523.3, 587.3, 659.3, 523.3, 392.0]
for i in range(int(DUR / 0.5)):
    f = mel[i % len(mel)]
    add(i * 0.5 + 0.02, bell(f, int(SR * 1.2), 0.7), 0.045, -0.2 + 0.4 * (i % 2))
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
peak = np.max(np.abs(mix)); mix = mix / max(peak, 1e-9) * 0.7
fade = int(SR * 0.25); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'{out}: {DUR}s, {SR} Hz stéréo, {len(events)} événements')
