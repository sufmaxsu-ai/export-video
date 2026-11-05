# Mamie & le gâteau — film d'animation dessiné image par image (JavaScript → Chromium → FFmpeg)

8 s · 1080×1920 (9:16) · 24 i/s · 108 dessins uniques · H.264/AAC. Une grand-mère prépare un gâteau, appelle « À table ! », ses petits-enfants accourent du jardin, Lina goûte la crème en douce, chacun reçoit sa part.

## Regarder
- **En direct dans le navigateur (dessiné par JavaScript, sans MP4)** : `web/preview.html` ou `web/index.html`.
  ```bash
  cd web && python3 -m http.server 8080      # puis http://localhost:8080/  (ou /preview.html)
  ```
  Ou la page React du projet : `npm run build && python3 -m http.server 8080 --directory dist` → `http://localhost:8080/`.
- **Vidéo** : `final/mamie-gateau.mp4` (identique à `web/mamie-gateau.mp4`).

## Exporter soi-même
```bash
./scripts/export-video.sh web/preview.html final/animation.mp4      # HTML/JS : Chromium dessine chaque image puis FFmpeg
./scripts/export-video.sh web/preview.html final/animation.webm     # VP9 + Opus
./scripts/export-video.sh final/animation.mp4 final/animation.mov   # réencodage d'une vidéo
./scripts/export-video.sh render/frames final/images.mp4 --fps 24   # séquence PNG numérotée
./scripts/export-video.sh --help
```
Prérequis : Node.js 18+, FFmpeg. Playwright et Chromium sont installés automatiquement au premier export HTML (dans `render/`). Le dossier `web/` contient sa propre copie (`web/tools/export-video.sh`) et fonctionne seul :
```bash
cd web && ./tools/export-video.sh preview.html mamie.mp4
```
FFmpeg direct pour une séquence :
```bash
ffmpeg -framerate 24 -i frames/%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart animation.mp4
```

## Documents
`SKILL.md` (mode d'emploi pour une autre IA) · `SKILLS_USAGE_NOTES.md` (11 dépôts) · `ANIMATION_ENVIRONMENT_GUIDE.md` (outils, commandes, erreurs) · `QA_REPORT.md` · `docs/STORYBOARD.md` · `docs/CHARACTER_AND_SET_BIBLE.md` · `docs/EXPOSURE_SHEET.md` + `.csv` · `docs/keyposes_sheet.jpg`, `docs/breakdowns_sheet.jpg`, `docs/keyposes/` · images rendues `render/frames/` · QA visuel `qa/out/`.
