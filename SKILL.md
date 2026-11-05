---
name: hand-drawn-storybook-film
description: Créer un court film vertical « livre jeunesse » dessiné image par image en JavaScript/Canvas 2D (poses clés, breakdowns, feuille d'exposition, boil), prévisualisable en direct dans le navigateur et exporté en MP4 par Chromium headless (Playwright) + FFmpeg. À utiliser pour toute animation de personnages dessinée au code avec un rendu déterministe.
---

# Film dessiné image par image au code — mode d'emploi

À lire avec `SKILLS_USAGE_NOTES.md` (quelles idées viennent de quel dépôt) et `ANIMATION_ENVIRONMENT_GUIDE.md` (installations, commandes validées, erreurs). Projet de référence : « Mamie & le gâteau » (`public/web/film/`).

## 1. Architecture (une seule, ne pas en créer d'autres)
- `core.js` : PRNG `mulberry32(hash(clé#n°dessin))`, `shape()` (points de contrôle jittés → Catmull-Rom → aplat opaque → ruban encré à pression variable → repasse partielle), `crayon()`, `ik()` deux os **avec direction préférée**, `kf()` (clés + easing), `buildExposure()`.
- `characters.js` : `skeleton(pose)` (IK) puis `drawCharacter(pose)` qui **redessine toute la pose** (membres en contour continu avec pli au coude/genou, vêtements recalculés depuis genoux/hanches, tête selon l'angle face/3-4/profil/dos, expressions, mains moufle+pouce).
- `world.js` : décor et accessoires, chacun redessiné à chaque dessin.
- `story.js` : storyboard (`BEATS`), poses clés (`GK`), pistes de pieds plantés, accessoires attachés aux mains, `EVENTS` (sons), `drawFrame(ctx, i)`, `G.mount(canvas)` → `window.__anim`.
- `player.js` : lecture `requestAnimationFrame` qui appelle la même `drawFrame` (ne redessine que si le n° de dessin change).
- `render/render-frames.mjs` : Playwright ouvre `preview.html?capture=1`, appelle `__anim.drawFrame(i)`, `canvas.toDataURL()` → PNG. `scripts/export-video.sh` enchaîne rendu + FFmpeg (HTML, séquence, vidéo ; mp4/webm/mov/gif).

## 2. Méthode qui a bien marché
1. **Composer d'abord le plan** (9:16) : visage et action entre 25 % et 75 % de la hauteur, profondeur par couches (jardin par une porte, sol en perspective, premier plan), une seule échelle de profondeur `depthScale(y)` partagée par tous.
2. **Poses clés en données** `[t, bassin x, y, inclinaison, rotation, tête]`, puis breakdowns (mi-chemin, arcs) ; easing `io` par défaut, `in` pour une chute, `out` pour un amorti.
3. **Pieds plantés** : piste par pied ; le pied ne bouge (en arc) que pendant son pas → aucun patinage. Bassin bas au contact, haut au passage.
4. **Contacts** : les mains ciblent les accessoires (bol, moule, poignée du four qui pivote) ; l'accessoire change de propriétaire seulement au contact (bol posé → le fouet reste dedans). Rien n'apparaît ni ne disparaît : les objets viennent d'un tiroir, d'une poche, d'un bol.
5. **Articulations** : `ik(root, cible, a, b, pref)` ; genou `pref` vers l'avant du regard, coude vers l'arrière/extérieur. Bras pointé vers la caméra : réduire les longueurs (`armScale` ≈ 0,6) au lieu de laisser le coude partir sur le côté.
6. **Physique simple** pour le crédible : vol balistique (gravité) pour un saut, porte qui retombe avec un petit rebond, balançoire amortie, ballon freiné.
7. **Exposition** : en deux (12 dessins/s) partout, en un pour course/saut ; graine = n° de dessin → un dessin tenu garde ses traits, chaque nouveau dessin est différent (« boil »), jamais d'A-B-A.
8. **Mouvement secondaire** : couettes et jupe calculées depuis la vitesse de la tête/bassin (pose à t et t−0,07 s) — reste une fonction pure du temps.
9. **Petits détails chaleureux** : fredonnement (notes), coup de pantoufle pour fermer le four, horloge accélérée pendant la cuisson, « ! » au-dessus des enfants, doigt dans la crème quand Mamie a le dos tourné, mains sur les genoux + sifflement innocent, sourcil levé, applaudissements, pieds qui se balancent, chat réveillé par l'odeur, cœur final.
10. **Regarder les images** : planche contact, bandes consécutives sur chaque action rapide, recadrages pleine taille, pelures d'oignon. Corriger, régénérer, re-regarder.

## 3. Ce qui n'a pas donné de bons résultats / pièges
- Formes tracées à la main qui « se touchent » : de petits interstices laissent voir l'image précédente si le canvas n'est pas effacé → **toujours** remplir la feuille d'un aplat opaque avant chaque dessin et mettre un aplat de fond sous les pavages (sol).
- Placer un personnage du jardin derrière la table : il disparaît → vérifier les occlusions sur la planche.
- Un personnage assis derrière une table : dessiner corps et jambes **avant** la table et les bras **après** (passe `part:'body'` / `part:'arms'`), sauf quand les mains sont sous la table.
- Main/enfant React dans le même conteneur qu'un lecteur impératif → conteneur dédié.
- `grep -q` + `pipefail` en bash → faux négatif ; capturer la sortie.
- Le Chromium de Playwright ne lit pas le H.264 : fournir un WebM de secours dans la page ; valider le MP4 avec ffprobe.
- p5.brush / aquarelle (ClaudeAnimationBase) : trop lent sans GPU ; morphing de cels (hand-drawn-canvas-animation) : peu adapté aux aplats colorés.

## 4. Quel dépôt pour quoi
| Besoin | Source |
|---|---|
| Philosophie poses entières, exposition, IK de contact | alesha-pro `hand-drawn-canvas-animation` |
| QA du mouvement (pops, A-B-A, figé, onion) | anzal1 `hand-drawn-film` (`review.mjs`, `craft.md`) |
| Contrat d'export `window.__anim`, son sur les mêmes temps | beriki770 `code-animations` |
| Vertical, gate de déterminisme, docs de planification | kuhnhomeuk `procedural-film` |
| Fiche personnage, ancrages, ordre de dessin | iart-ai `javascript-animation` |
| Mains et prises | illodev `drawn-by-code` (skill hands) |
| Pièges IK/état, bible de détails | buildwithhanif `claude-animation` |
| Boil 12 Hz, « rien n'est figé » | JohnHeibel `ClaudeAnimationBase` |
| Texture crayon | hoangkien1703 (idée, pas de licence) |
| Hasard seedé, composition | anthropics `algorithmic-art`, `canvas-design` |
| Accessibilité de la page | vercel `web-design-guidelines` |

## 5. Commandes
```bash
node render/render-frames.mjs web/preview.html render/frames            # 192 PNG + exposure.json + events.json
python3 render/make-audio.py render/frames/events.json web/soundtrack.wav 8
./scripts/export-video.sh web/preview.html final/film.mp4 --frames render/frames
python3 qa/qa.py render/frames qa/out final/film.mp4
cd web && python3 -m http.server 8080                                    # aperçu en direct
```

## 6. Style utilisé
Livre jeunesse chaleureux : aplats opaques emboîtés (collage), encre brun chaud à pression variable, crayon clipé, grain de papier fixe, palette crème/terre cuite/sauge/vichy rouge, personnages ronds aux grandes têtes, joues roses, lunettes, couettes ; lumière de fin d'après-midi (tache de soleil, vignette chaude). Bruitages synthétisés discrets (fouet, four, ding, pas, assiettes, ronronnement) + boîte à musique très douce, sans voix.
