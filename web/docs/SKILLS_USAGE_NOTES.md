# SKILLS_USAGE_NOTES — analyse des 11 dépôts et décisions

Copies locales : `references/upstream/<owner>_<repo>/` (clone `--depth 1`, le 2026-11-05).
Règle suivie : **un seul pipeline**. On a pris les meilleures idées de chaque dépôt et on les a réécrites dans un moteur unique (`public/web/film/*.js`). Aucun pipeline concurrent, aucun nouveau dépôt GitHub.

| # | Dépôt (skill) | Commit | Licence | Rôle retenu |
|---|---|---|---|---|
| 1 | alesha-pro/tools — `skills/hand-drawn-canvas-animation` | `90e9662` | MIT (Alexey Fateev) | **Méthode principale** : poses entières, feuille d'exposition, IK de contact, traits stables par dessin |
| 2 | anzal1/hand-drawn-film | `c4e600c` | MIT (fork du n°1) | **Contrôle qualité du mouvement** : pops, A-B-A, figé, pelures d'oignon, « craft numbers » |
| 3 | kuhnhomeuk-cell/procedural-film | `f594139` | MIT (Dean Kuhn) | Vertical 1080×1920, « gate » de déterminisme, timeline unique image+son |
| 4 | beriki770-ship-it/code-animations | `46accf6` | MIT (Beri Kirsh) | **Contrat `window.__anim`** (`seek(t)`, `marks`), rngFor(clé), son calé sur les mêmes temps |
| 5 | iart-ai/javascript-animation-skills | `f7d0882` | MIT (iart.ai) | Fiche personnage unique avec options, points d'ancrage (mains/bouche), dessiner du fond vers l'avant |
| 6 | illodev/drawn-by-code | `993968a` | MIT (illodev) | Skill **hands** (pouce, latéralité, ce que la caméra voit), boucle « rendre puis regarder » |
| 7 | buildwithhanif/claude-animation-skill | `4ddb8c8` | MIT (Hanif) | « Detail bible » (base → texture → contour), **traps** (IK qui croise, état entre images) |
| 8 | JohnHeibel/ClaudeAnimationBase | `0ac8bf2` | MIT (John Heibel) | **Boil 12 Hz** : chaque dessin retrace les traits ; rien n'est jamais figé |
| 9 | hoangkien1703/example-draw-javascript | `a31a4aa` | aucune licence déclarée | Recette **crayon** (traits courts clipés, « paper tooth ») — idée seulement, code non copié |
| 10 | anthropics/skills — `algorithmic-art`, `canvas-design` | `ca45fc4` | Apache-2.0 (LICENSE.txt des skills) | Hasard **seedé**, philosophie visuelle (aplats, composition, peu de texte) |
| 11 | vercel-labs/agent-skills — `web-design-guidelines` | `1a2c79d` | section License du README | Règles d'interface (récupérées depuis `command.md`) appliquées aux pages web |

## Détail par dépôt

### 1. hand-drawn-canvas-animation (alesha-pro/tools)
Lu : `SKILL.md`, `references/redrawn-animation.md`, `studio.md`, `architecture.md`, `assets/studio.js` (`exposureTrack`, `drawingTrack`, `solveLimb`, `motionPath`), `scripts/render.mjs` (puppeteer-core, `window.__frame(i)`, `--grid/--strip`).
- **Pris** : (a) poses clés → breakdowns → intervalles, puis seulement la texture ; (b) **exposition** explicite (`on:2`, `on:1`) ; (c) **graine par dessin, jamais par image de sortie** (« A held drawing holds its marks too ») ; (d) IK qui **borne** une cible inaccessible au lieu d'étirer l'os ; (e) rubans encrés à pression variable ; (f) inspecter grille + bandes + images pleine taille.
- **Pas pris** : `cels.js`/morphing de cels (pensé pour des traits crayon monochromes ; notre style est en aplats colorés), sand/paper3d/roto (hors sujet), puppeteer-core + Chrome système (on a Playwright qui embarque Chromium).
- **Limite notée** : le skill lui-même dit qu'un rig ne suffit pas — d'où nos têtes redessinées selon l'angle (face/3-4/profil/dos) et nos contours de membres continus.

### 2. hand-drawn-film (anzal1)
Fork poli du n°1 (diff : `review.mjs`, `craft.md`, `sketch.js`, exemples chat). Lu `README.md`, `references/craft.md`, `scripts/review.mjs`.
- **Pris** : la logique de `review.mjs` réécrite en Python (`qa/qa.py`) : pops (changement ≫ voisinage), **A-B-A flicker**, séquences figées, images vides, réduction progressive pour les vignettes ; pelures d'oignon colorées ; tableaux de timing (pas de marche 12 images, chute en « ones », fin tenue).
- **Redondant** avec le n°1 pour le moteur → on n'installe qu'un seul des deux (aucun, en fait : on s'en inspire).

### 3. procedural-film (kuhnhomeuk-cell)
Lu `skills/procedural-film/SKILL.md`, exemple `butterfly-life/docs` (art-bible, storyboard, CONTRACT).
- **Pris** : format vertical 1080×1920 par défaut, documents de planification (bible, storyboard), « gate » de déterminisme (même instant → même image), timeline unique pour image et son.
- **Pas pris** : la grille de tempo en BPM (8 s de bruitages, pas de musique rythmée), le mode rétro/jeu, le build en fichier unique.

### 4. code-animations (beriki770-ship-it)
Lu `SKILL.md` (contrat, invariants, harness).
- **Pris tel quel** : le contrat `window.__anim = {duration,fps,width,height,canvas,ready,seek(t),marks}` — notre `render-frames.mjs` accepte donc aussi les œuvres de ce skill. `seek(t)` pur, aucun `Math.random()` au rendu, `marks` = temps des événements sonores.
- **Pas pris** : `film-fix.html`/TUNE (édition manuelle), Web Audio dans la page (on synthétise le son hors-ligne en Python, plus simple à mixer et déterministe).

### 5. javascript-animation-skills (iart-ai)
Lu `skills/javascript-animation/SKILL.md`, `references/character.md`, `qc.md`.
- **Pris** : un personnage = une fonction avec options ; points d'ancrage exposés (le gâteau, la pelle à tarte, le bol suivent les mains calculées) ; « toute tête repose sur un cou » ; mains en moufle + pouce ; dessiner arrière → avant (cheveux du dos, corps, visage, cheveux de devant).

### 6. drawn-by-code (illodev)
Lu `CLAUDE.md`, `.claude/skills/hands/SKILL.md`, liste des styles.
- **Pris** : vérifier ce que la caméra voit d'une prise (moufles vues de dos cachées par le corps → bras dessinés derrière le torse en vue de dos), latéralité du pouce selon le côté et l'orientation, « ne jamais valider sans regarder les images ».
- **Pas pris** : le moteur `engine/` et ses 14 styles (pipeline concurrent).

### 7. claude-animation-skill (buildwithhanif)
Lu `README.md`, `references/traps.md`, `characters.md`.
- **Pris** : trap n°2 (IK qui choisit le mauvais genou) → notre `ik()` reçoit une **direction préférée** (genou vers l'avant, coude vers l'arrière/extérieur) ; trap n°11 (état entre images) → tout est fonction pure du temps ; trap n°13 (image 0 vide) → on ouvre en pleine action ; « detail bible » : chaque surface = aplat + texture + contour.
- **Pas pris** : le runtime Node sans navigateur (le brief impose Chromium).

### 8. ClaudeAnimationBase (JohnHeibel)
Lu `README.md`, `ANIMATION_GUIDE.md` (règles 1-4, boil, `boilSeed`).
- **Pris** : la ligne qui « bout » à 12 Hz, chaque élément reseedé par une clé stable ; « rien n'est jamais immobile » (rideaux, pendule, chat qui respire, lampe, casseroles).
- **Incompatible** : p5.js + p5.brush (aquarelle lente sans GPU) — remplacé par Canvas 2D natif ; la règle « pas de texte » est levée pour la bulle « À table ! » demandée par l'histoire.

### 9. example-draw-javascript (hoangkien1703)
Lu `README.md`, `.claude/skills/recreate-frame/SKILL.md`, `src/pencil.js` (`crayon`, paper tooth). **Pas de licence** → aucune ligne copiée, seule l'idée est réimplémentée (`crayon()` dans `core.js`).

### 10. anthropics/skills — algorithmic-art, canvas-design
Lu les deux `SKILL.md`. **Pris** : hasard seedé et paramétrique, « 90 % visuel / 10 % texte », composition pensée avant le détail. **Pas pris** : p5.js, sorties PDF/PNG statiques.

### 11. vercel-labs/agent-skills — web-design-guidelines
Le skill demande de récupérer `web-interface-guidelines/command.md` (copie : `references/upstream/vercel-web-interface-guidelines.md`). Appliqué : boutons `<button>` avec `aria-label`, focus visible, lien d'évitement, titres hiérarchisés, `prefers-reduced-motion` (pas d'autolecture), chiffres tabulaires, `text-wrap: balance`, « … » typographiques, médias avec description.

## Architecture unique retenue
```
story.js (timeline, poses, exposition, sons)  ─┐
characters.js (squelette IK + dessin complet)   ├─► drawFrame(i)  ─┬─► player.js (requestAnimationFrame, navigateur)
world.js (décor, accessoires)                   │                  └─► render-frames.mjs (Playwright/Chromium, PNG) ─► FFmpeg
core.js (PRNG, rubans encrés, crayon, IK, expo) ┘
```
Moteur principal : **Canvas 2D natif + Playwright (Chromium headless) + FFmpeg**. Puppeteer, p5.js, p5.brush, WebGL : écartés (redondants ou lents).
