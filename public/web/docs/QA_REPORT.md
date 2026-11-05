# Rapport de contrôle qualité — Mamie & le gâteau

Outils : `qa/qa.py` (Pillow, NumPy, OpenCV), ffprobe, inspection visuelle des planches (`qa/out/`), tests navigateur Playwright.

## 1. Fichier final `final/mamie-gateau.mp4` (= `web/mamie-gateau.mp4`) — ffprobe
| Contrôle | Attendu | Mesuré |
|---|---|---|
| Résolution | 1080 × 1920 (9:16) | 1080 × 1920 ✅ |
| Cadence | 24 i/s constants | r_frame_rate = avg_frame_rate = 24/1 ✅ |
| Images | 192 | nb_frames 192, 192 décodées (`-count_frames`) ✅ |
| Durée | 5–8 s | 8,000 s ✅ |
| Codec / pixels | H.264, yuv420p | h264 High, yuv420p ✅ |
| Audio | AAC stéréo 48 kHz | aac LC, 2 canaux, 48 000 Hz ✅ |
| faststart | moov en tête | `-movflags +faststart` ✅ |
| Taille | — | 13,2 Mo |

## 2. Images rendues (`render/frames/`, 192 PNG) — mesures automatiques
| Contrôle | Résultat |
|---|---|
| Dessins uniques mesurés / déclarés par la feuille d'exposition | **108 / 108** ✅ |
| Images tenues (twos) identiques au pixel près | 84 / 84, **0 écart** à la feuille d'exposition ✅ |
| Pops (saut ≫ voisinage) | 0 ✅ |
| Scintillement A-B-A | 0 ✅ |
| Images vides | 0 ✅ |
| Séquences figées > 3 images | 0 ✅ (la fin bouge encore : pieds, cœur, chat) |
| Couverture (alpha 100 % opaque, aucun pixel vide) | ✅ (après correction, voir §4) |
| Changement moyen / max entre images | 6,45 / 8,41 (image 146 : course en « ones ») |

## 3. Inspection visuelle (planches dans `qa/out/`)
- `contact_sheet.jpg` : continuité des 192 images ; aucun objet n'apparaît/disparaît : bol posé (le fouet y reste), moule toujours visible (plan → mains → four → mains → table), maniques sorties de la poche puis rangées, pelle à tarte sortie du tiroir puis posée sur la planche, ballon qui roule puis s'arrête, balançoire qui continue à osciller en s'amortissant après le saut.
- `strip_run_132-156.jpg` : Léo grandit en perspective en franchissant la porte (échelle de profondeur unique jardin/cuisine) ; bras opposés aux jambes ; Lina : vol balistique (gravité), atterrissage avec écrasement.
- `strip_oven_40-76.jpg` : flexion des genoux vers l'avant (IK à direction préférée), dos penché, pieds plantés pendant l'effort ; coup de pantoufle pour fermer le four (équilibre sur une jambe, bras écartés).
- `strip_walk_108-124.jpg`, `onion_walk_to_table.jpg` : 3 pas avec contacts plantés, pied levé en arc uniquement pendant le déplacement, bassin qui suit les pieds.
- `strip_finger_154-176.jpg` : lecture claire du gag — Lina tend l'index, lèche (yeux fermés), cache ses mains sous la table et siffle en regardant en l'air quand Mamie revient (sourcil levé de Mamie).
- `onion_kids_run.jpg`, `onion_whisk.jpg` : espacement régulier, fouet sur cercle.
- Articulations : coudes vers l'arrière/extérieur, genoux vers l'avant ; aucune inversion observée. Les bras « vers la caméra » sont raccourcis (foreshortening) au lieu de déborder sur le côté.

## 4. Défauts trouvés et corrigés
| Défaut | Correction | Vérification |
|---|---|---|
| Interstices entre carreaux → image précédente visible (vide + images tenues non identiques) | joint plein sous le carrelage + feuille opaque avant chaque dessin | 0 écart d'exposition, alpha opaque |
| Léo masqué par la table dans le jardin | boucle de jeu repoussée au fond du jardin | planche contact |
| Jambes de Mamie trop fines | épaisseur 34→40 px | images pleine taille |
| Page React : lecteur effacé ; vidéo masquée à tort | conteneur dédié ; `onError` sur la dernière source | test Playwright : 0 erreur, vidéo 8,008 s |

## 5. Tests indépendants du MP4
- **Prévisualisation HTML** (`web/preview.html`, `web/index.html`, page React `/`) servie en HTTP : canvas 1080×1920 non vide, le temps avance pendant la lecture (ex. 0,98 s → 2,73 s en 1,5 s), aucune erreur console. Contrôles : lecture/pause/reprise, début, barre de progression (une position par image), image par image, boucle, pelure d'oignon, son optionnel.
- **Script d'export** : HTML→MP4 (192 images, audio auto), MP4→WebM (VP9+Opus), MP4→MOV (H.264+AAC), PNG→MP4 (+ `--audio`), et **depuis une copie isolée de `dist/web/`** (`/tmp/webcopy`) : installation automatique de Playwright puis export d'un extrait de 48 images → OK.
- Téléchargement : `HEAD web/mamie-gateau.mp4` → HTTP 200.

## 6. Limites connues (honnêtes)
- Le Chromium de Playwright ne décode pas le H.264 : le test de lecture vidéo a été fait via le WebM de secours ; le MP4 a été validé par ffprobe/décodage FFmpeg complet. Chrome, Edge, Firefox et Safari lisent le MP4.
- 8 s pour toute l'histoire : le rythme est vif (plans S1–S15 de 0,2 à 0,8 s). Les gags restent lisibles image par image mais passent vite à vitesse réelle.
- Personnages en 3/4 « cartoon » : la tête tourne par glissement des traits du visage et dessin de remplacement (profil/dos) ; les vues de dos sont un dessin de remplacement (une image de transition).
- Le lettrage dépend des polices du système.
