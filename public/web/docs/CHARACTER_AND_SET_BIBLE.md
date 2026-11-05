# Bible graphique — personnages et décor

## Style
Illustration chaleureuse de livre jeunesse, comme collée et dessinée à la tablette : **aplats opaques** qui s'emboîtent (aucun vide, aucun pixel transparent), **contours encrés brun chaud `#3a281f`** à pression variable (rubans effilés), **texture crayon** clipée dans chaque forme, **grain de papier** fixe (une seule graine, enregistré sur la feuille), légère vignette chaude. Les traits « bouillent » : chaque nouveau dessin re-trace toutes les formes (graine = n° de dessin) ; un dessin tenu deux images garde exactement ses traits.

Interprétation de « aucun élément ne se superpose » : comme un collage de papiers découpés, chaque pixel appartient à une seule forme opaque visible ; les parties cachées par la profondeur (table devant les jambes de Lina, corps de Mamie devant le four) ne sont tout simplement pas visibles. Aucune transparence empilée sauf la tache de soleil au sol et le grain de papier.

## Palette
Mur crème `#f4e2bf` à fleurettes · lambris sauge `#a9c29a` · carrelage terre cuite `#d08458/#e7a877` · poutre `#8d5b3a` · porte-fenêtre bleu-gris `#6f93ae` · jardin `#8cc06b` · nappe vichy rouge `#e0685c` · four émaillé crème `#f2e6cc`.

## Mamie (rig « granny », 820 px de haut à l'échelle 1)
Ronde et douce. Chignon argenté + épingle, lunettes rondes cuivrées avec reflet, joues roses, sourcils gris. Gilet sarcelle `#5f9e9b`, col blanc, robe vieux rose `#d98a8f` jusqu'aux genoux, tablier crème à pois rouges avec poche (où dépassent les maniques rouges), trace de farine, bas chair, pantoufles bordeaux à pompon. Proportions : tête r = 86, épaules 2×74, bassin à 400 px du sol, cuisse 186, tibia 184, bras 142 + 132.
Expressions : fredonne (« o »), concentrée (paupières mi-closes, bouche plate), malicieuse (yeux ^^), étonnée (sourcil levé), crie (bouche grande ouverte, yeux fermés), comblée.

## Léo (rig « kid », 500 px à l'échelle 1)
Cheveux châtains en bataille + épi, marinière blanche à rayures rouges, short bleu, baskets blanches à bande verte. Énergique : court en boucle derrière son ballon, pouffe la main sur la bouche, tend son assiette.

## Lina (rig « kid »)
Couettes brun foncé avec nœuds rouges (mouvement secondaire calculé sur la vitesse de la tête), robe jaune moutarde à col blanc et ceinture rouge, chaussettes blanches, babies rouges. Espiègle : saute de la balançoire, goûte la crème du doigt, siffle l'air innocent, applaudit.

## Moustache le chat
Chat roux tigré lové dans un panier ; respire, remue la queue, oreille qui sursaute aux claquements de porte, se réveille et renifle à la fin.

## Décor (plan fixe, profondeur)
Plafond/poutre avec herbes séchées et casseroles en cuivre qui oscillent · horloge à balancier (tourne vite pendant la cuisson) · dessin d'enfant scotché (Mamie et les deux petits) · fenêtre avec rideaux vichy, linge qui flotte, oiseaux · étagère FARINE/SUCRE · crédence carrelée · plan de travail avec tiroir et coquilles d'œufs · four à porte pivotante (perspective) et hublot, bouilloire qui fume · porte-fenêtre en arc sur le jardin (arbre, balançoire, barrière blanche, pas japonais en perspective, fleurs, papillon, collines, nuages qui dérivent) · carrelage en perspective (point de fuite 540, 820) · tache de soleil · tapis tressé · table ronde nappe vichy, assiettes, verres de lait, bol de fraises, planche à gâteau · chaises avec coussins · plante en pot au premier plan · panier du chat.
Profondeur : échelle unique `depthScale(y)` partagée par le jardin et la cuisine (les enfants grandissent en approchant), ellipses de perspective (table, assiettes, gâteau cylindrique avec parts découpées, porte du four).
