#!/usr/bin/env python3
"""Contrôle qualité du film dessiné image par image.

Usage : python3 qa/qa.py <dossier_frames> <dossier_sortie> [video.mp4]

Produit :
  contact_sheet.jpg      toutes les images (planche contact)
  strip_<a>-<b>.jpg      bandes d'images consécutives (actions rapides)
  onion_<nom>.jpg        pelures d'oignon colorées (trajectoires, espacement)
  qa_metrics.json        mesures (diffs, pops, A-B-A, vides, figées, exposition)
Inspirations : review.mjs de hand-drawn-film (pops, A-B-A flicker, frozen),
--grid/--strip de hand-drawn-canvas-animation, verify de code-animations.
"""
import sys, json, glob, os, subprocess
import numpy as np
import cv2
from PIL import Image, ImageDraw

frames_dir, out = sys.argv[1], sys.argv[2]
video = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(os.path.join(frames_dir, '*.png')))
N = len(files)
assert N > 0, 'aucune image'
expo = None
ep = os.path.join(frames_dir, 'exposure.json')
if os.path.exists(ep):
    expo = json.load(open(ep))

# ---------- chargement réduit pour les mesures ----------
small = []
for f in files:
    im = cv2.imread(f, cv2.IMREAD_COLOR)
    small.append(cv2.resize(im, (270, 480), interpolation=cv2.INTER_AREA).astype(np.int16))
H0, W0 = cv2.imread(files[0]).shape[:2]

diff = [0.0] + [float(np.mean(np.abs(small[i] - small[i - 1]))) for i in range(1, N)]
identical = [i for i in range(1, N) if diff[i] == 0.0]
# pops : changement très supérieur au voisinage (hors ones/twos)
pops = []
for i in range(1, N):
    nb = [diff[j] for j in range(max(1, i - 4), min(N, i + 5)) if j != i and diff[j] > 0]
    ref = max(nb) if nb else 0
    if diff[i] > 6 and ref > 0 and diff[i] > ref * 3.5:
        pops.append({'frame': i, 'diff': round(diff[i], 2), 'neighbour_max': round(ref, 2)})
# A-B-A : i+1 revient exactement à i-1 alors que i diffère
aba = [i for i in range(1, N - 1) if diff[i] > 0 and float(np.mean(np.abs(small[i + 1] - small[i - 1]))) < 0.05]
# images vides / quasi uniformes
blank = [i for i in range(N) if float(small[i].std()) < 8]
# séquences figées (plus de 3 images identiques)
frozen, run = [], 0
for i in range(1, N):
    run = run + 1 if diff[i] == 0 else 0
    if run == 3:
        frozen.append(i - 3)
# couverture : aucun pixel vide/transparent (canal alpha opaque, pas de blanc pur massif)
full = Image.open(files[0]); has_alpha = full.mode == 'RGBA'
alpha_ok = True
if has_alpha:
    alpha_ok = all(np.array(Image.open(f))[..., 3].min() == 255 for f in files[::12])
white_ratio = float(np.mean(np.all(cv2.imread(files[0]) > 250, axis=2)))

# conformité exposition : une image tenue doit être identique à la précédente
expo_err = []
if expo:
    for r in expo:
        i = r['frame']
        if i == 0 or i >= N:
            continue
        if r['held'] and diff[i] != 0:
            expo_err.append(i)
        if not r['held'] and diff[i] == 0:
            expo_err.append(i)
unique = 1 + sum(1 for i in range(1, N) if diff[i] > 0)

# ---------- planche contact ----------
cols = 12; tw, th = 150, 266
rows = (N + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), (250, 244, 232))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB')
    im = im.resize((540, 960), Image.LANCZOS).resize((tw, th), Image.LANCZOS)  # réduction progressive
    x, y = (i % cols) * tw, (i // cols) * (th + 18)
    sheet.paste(im, (x, y + 18))
    lab = f'{i:03d} {i/24:.2f}s'
    if expo:
        lab += f" d{expo[i]['drawing']}" + ('' if not expo[i]['held'] else '=')
    d.text((x + 3, y + 3), lab, fill=(60, 40, 30))
sheet.save(os.path.join(out, 'contact_sheet.jpg'), quality=85)

# ---------- bandes (actions rapides) ----------
def strip(a, b, step=1, name=None, crop=None):
    idx = list(range(a, min(b, N), step))
    tiles = []
    for i in idx:
        im = Image.open(files[i]).convert('RGB')
        if crop:
            im = im.crop(crop)
        im.thumbnail((240, 420), Image.LANCZOS)
        tiles.append((i, im))
    w = sum(t.width for _, t in tiles); h = max(t.height for _, t in tiles) + 16
    s = Image.new('RGB', (w, h), (250, 244, 232)); dd = ImageDraw.Draw(s); x = 0
    for i, t in tiles:
        s.paste(t, (x, 16)); dd.text((x + 3, 2), f'{i}', fill=(60, 40, 30)); x += t.width
    s.save(os.path.join(out, name or f'strip_{a}-{b}.jpg'), quality=85)

strip(132, 156, 2, 'strip_run_132-156.jpg', crop=(0, 700, 560, 1640))
strip(40, 76, 3, 'strip_oven_40-76.jpg', crop=(520, 700, 1080, 1640))
strip(108, 124, 2, 'strip_walk_108-124.jpg', crop=(380, 700, 1000, 1640))
strip(154, 176, 2, 'strip_finger_154-176.jpg', crop=(150, 950, 620, 1450))

# ---------- pelures d'oignon ----------
def onion(idx, name, crop):
    base = None
    cmap = [(220, 60, 60), (230, 150, 40), (60, 160, 70), (50, 110, 210), (150, 70, 200), (40, 170, 190)]
    acc = None
    for k, i in enumerate(idx):
        im = np.array(Image.open(files[i]).convert('L').crop(crop)).astype(np.float32) / 255
        ink = np.clip((0.45 - im) / 0.45, 0, 1)  # traits sombres seulement
        col = np.array(cmap[k % len(cmap)], np.float32) / 255
        layer = 1 - ink[..., None] * (1 - col[None, None, :])
        acc = layer if acc is None else acc * layer
    Image.fromarray((acc * 255).astype(np.uint8)).save(os.path.join(out, name), quality=88)

onion([96, 100, 104, 108, 112, 116], 'onion_walk_to_table.jpg', (380, 650, 1000, 1640))
onion([136, 140, 144, 148, 152], 'onion_kids_run.jpg', (0, 700, 600, 1640))
onion([0, 2, 4, 6, 8, 10], 'onion_whisk.jpg', (500, 900, 820, 1250))

m = {
    'frames': N, 'size': [W0, H0], 'unique_drawings_measured': unique,
    'unique_drawings_declared': (max(r['drawing'] for r in expo) if expo else None),
    'held_frames': len(identical), 'exposure_mismatches': expo_err,
    'pops': pops, 'aba_flicker': aba, 'blank_frames': blank, 'frozen_runs_over_3': frozen,
    'alpha_fully_opaque': alpha_ok, 'pure_white_ratio_frame0': round(white_ratio, 5),
    'mean_change': round(float(np.mean([x for x in diff if x > 0])), 3),
    'max_change': round(float(max(diff)), 3), 'max_change_frame': int(np.argmax(diff)),
}
if video and os.path.exists(video):
    pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels,duration:format=duration,size,bit_rate', '-of', 'json', video], capture_output=True, text=True)
    m['ffprobe'] = json.loads(pr.stdout)
    cnt = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', video], capture_output=True, text=True)
    m['decoded_frames'] = int(cnt.stdout.strip() or 0)
json.dump(m, open(os.path.join(out, 'qa_metrics.json'), 'w'), indent=2, ensure_ascii=False)
print(json.dumps({k: v for k, v in m.items() if k != 'ffprobe'}, indent=1, ensure_ascii=False))
