# ANIMATION_ENVIRONMENT_GUIDE — environnement, commandes validées, erreurs

## Outils (versions réellement installées et testées)
| Outil | Version | Installation |
|---|---|---|
| Debian | 12 (bookworm) | — |
| Node.js / npm | 20.20.2 / 10.8.2 | préinstallés |
| Git | 2.39.5 | préinstallé |
| Playwright | 1.49.1 (`render/package.json`) | `cd render && npm install` |
| Chromium headless | 131.0.6778.33 (build Playwright 1148) | `npx playwright install --with-deps chromium` |
| FFmpeg / ffprobe | 5.1.9 (Debian) — libx264, libvpx-vp9, libopus, aac, prores_ks | `sudo apt-get install -y ffmpeg` |
| Python | 3.11.2 | préinstallé |
| Pillow / NumPy / OpenCV headless | 13.0.0 / 2.4.6 / 5.0.0 | `pip3 install --break-system-packages pillow numpy opencv-python-headless` |
| Vite + React + Tailwind | 7.3 / 19.2 / 4.1 | projet hôte (page de présentation) |

Tout est gratuit, local, sans clé API.

## Arborescence
```
public/web/            ← DOSSIER WEB AUTONOME (copié tel quel dans dist/web)
  index.html           page : aperçu JS en direct + MP4 + téléchargement + caractéristiques
  preview.html         prévisualisation plein écran (et source de l'export, ?capture=1)
  film/core.js         PRNG, rubans encrés, crayon, IK, feuille d'exposition
  film/characters.js   Mamie, Léo, Lina, le chat (squelette + dessin complet)
  film/world.js        décor et accessoires
  film/story.js        storyboard, poses clés, timeline, sons, drawFrame(), window.__anim
  film/player.js|.css  lecteur requestAnimationFrame (lecture, pause, début, barre, image/image, pelure d'oignon, son)
  mamie-gateau.mp4     film final (H.264) · mamie-gateau.webm (VP9, secours) · poster.jpg
  soundtrack.wav|.m4a  bruitages synthétisés
  tools/               export-video.sh + render/ (Playwright) + qa.py → export possible depuis ce seul dossier
web -> public/web      lien symbolique (commandes du brief)
render/                render-frames.mjs, make-audio.py, frames/ (192 PNG + exposure.json, events.json)
scripts/export-video.sh
qa/qa.py, qa/out/      planche contact, bandes, pelures d'oignon, qa_metrics.json
docs/                  storyboard, bible, feuille d'exposition, planches poses clés / breakdowns, keyposes/
final/                 mamie-gateau.mp4 (+ .mov, test-depuis-images.mp4)
references/upstream/   les 11 dépôts étudiés
src/App.tsx            page React (même moteur chargé depuis web/film/)
```

## Pipeline reproductible (commandes validées)
```bash
# 0. dépendances (une fois)
sudo apt-get install -y ffmpeg
pip3 install --break-system-packages pillow numpy opencv-python-headless
(cd render && npm install && npx playwright install chromium)

# 1. rendre les 192 images (Chromium appelle __anim.drawFrame(i) pour chacune)
node render/render-frames.mjs web/preview.html render/frames          # ~90 s

# 2. bruitages synchronisés sur la même timeline (events.json écrit à l'étape 1)
python3 render/make-audio.py render/frames/events.json web/soundtrack.wav 8
ffmpeg -y -i web/soundtrack.wav -c:a aac -b:a 160k -ar 48000 web/soundtrack.m4a

# 3. tout-en-un : rendu + encodage + son (le script trouve web/soundtrack.wav)
./scripts/export-video.sh web/preview.html final/mamie-gateau.mp4 --frames render/frames

# 4. contrôle qualité
python3 qa/qa.py render/frames qa/out final/mamie-gateau.mp4

# 5. autres formats
./scripts/export-video.sh final/mamie-gateau.mp4 web/mamie-gateau.webm
./scripts/export-video.sh final/mamie-gateau.mp4 final/mamie-gateau.mov
./scripts/export-video.sh render/frames final/depuis-images.mp4 --fps 24 --audio web/soundtrack.wav

# 6. page web
npm run build && python3 -m http.server 8080 --directory dist   # http://localhost:8080/
# ou le dossier autonome seul :
cd public/web && python3 -m http.server 8080                    # http://localhost:8080/
```
Encodage FFmpeg utilisé : `-framerate 24 -i %05d.png -i soundtrack.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -r 24 -movflags +faststart`.

## Erreurs rencontrées et solutions
| Erreur | Cause | Solution |
|---|---|---|
| `apt-get install ffmpeg` → `dpkg returned an error code (1)` | lancé en parallèle de `playwright install --with-deps` (verrou dpkg) | relancer seul : OK |
| Images « tenues » différentes de la précédente (QA : 84 écarts) | interstices entre carreaux tracés à la main → l'image précédente transparaissait (canvas non effacé) | aplat de joint plein sous le carrelage + fond opaque avant chaque dessin → 0 écart, alpha 100 % opaque |
| `Cannot find module 'render/frames/render-meta.json'` | `require()` avec chemin relatif | chemin absolu + lecture `fs.readFileSync` |
| `libvpx-vp9 absent` alors qu'il est présent | `grep -q` + `set -o pipefail` (SIGPIPE sur ffmpeg) | capturer la liste d'encodeurs dans une variable |
| Page React : lecteur vidé après montage | React gérait un enfant dans le conteneur du lecteur impératif (+ StrictMode) | conteneur dédié sans enfant React, garde anti double montage |
| Vidéo « absente » dans Chromium de Playwright | ce Chromium n'a **pas de décodeur H.264** (`canPlayType` = "") | source WebM/VP9 de secours ; `onError` seulement sur la dernière source. Chrome/Firefox/Safari lisent le MP4 |
| Léo caché par la table quand il joue au jardin | boucle de jeu trop proche | boucle déplacée plus loin (y 1128) |

## Notes
- Déterminisme : `mulberry32(hash(clé + n° de dessin))`; même image = mêmes octets à chaque rendu (vérifié : les images tenues sont identiques au pixel près).
- Les polices du lettrage « À table ! » dépendent du système (Comic Sans → DejaVu Sans en repli) ; le reste est 100 % tracé.
- Le dossier `public/web/` (ou `dist/web/`) se déploie seul : chemins relatifs uniquement.
