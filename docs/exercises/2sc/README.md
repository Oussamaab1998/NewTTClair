# Exercices 2ème Sciences (mathématiques)

38 exercices avec corrigé : 2 par chapitre, pour les 19 chapitres des deux manuels CNP de 2ème année, sections Sciences et Technologie de l'informatique (même programme, même manuel).

- Sources : programme officiel de mathématiques 1ère & 2ème années (sept. 2005), pages 16–26 (filières Sciences et Technologie de l'informatique), et les manuels CNP 2ème année tome 1 et tome 2 (copie sur sigmaths.net). Attention : sur sigmaths, le fichier `2sc_t1.pdf` contient le tome 2 et `2sc_t2.pdf` le tome 1.
- Le dénombrement du programme (principe additif, arbres de choix) n'a pas de chapitre à lui : il est traité dans l'exercice 2 du chapitre Arithmétique.
- Langue, niveau, notation : comme pour la 3ème (voir `../3se/README.md`). Français, devoir normal de 2ème, vec(AB) pour un vecteur, AB pour une longueur, point décimal (0.5). Pas de limites, pas de dérivées : les variations se font par la définition ou la forme réduite. En géométrie dans l'espace, les vecteurs ne sont utilisés que dans un plan, comme dans le manuel.
- Relecture : chaque chapitre a été résolu une seconde fois, à partir des énoncés seuls, par un vérificateur indépendant. Aucune réponse fausse n'a été trouvée. Les points corrigés ensuite : des critères non enseignés (cercles tangents, intersection de deux cercles), des égalités de vecteurs de l'espace, une question mal ordonnée, des encadrements qui ne permettaient pas de conclure, des notations en double, et des vérifications de script trop faibles.
- Vérification : chaque chapitre a un script `check_*.py` (`python3 -I docs/exercises/2sc/check_t1_ch04.py` affiche `all N checks passed`).
- Statut : `reviewed: false` partout. Un professeur de mathématiques doit tout relire. Les définitions illisibles dans la copie PDF sont rappelées dans les énoncés (« On rappelle que … ») et signalées dans l'en-tête du chapitre.

## Tome 1

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 1 | [Calcul dans ℝ](T1_CH01_CALCUL_DANS_R.md) | Radicaux, valeur absolue, comparaison, encadrements | Un terrain triangulaire |
| 2 | [Problèmes du 1er et du 2nd degré](T1_CH02_PREMIER_SECOND_DEGRE.md) | Trinôme : forme canonique, racines, signe | Un enclos le long d'un mur |
| 3 | [Notion de polynômes](T1_CH03_POLYNOMES.md) | Racine, factorisation, signe, fonction rationnelle | Un bac en tôle le plus économique |
| 4 | [Arithmétique](T1_CH04_ARITHMETIQUE.md) | Critères de divisibilité, restes, diviseurs communs | Codes à trois chiffres : arbres de choix, principe additif |
| 5 | [Calcul vectoriel](T1_CH05_CALCUL_VECTORIEL.md) | Règles du calcul vectoriel, alignement | Repère orthonormé : carré, orthogonalité |
| 6 | [Barycentre](T1_CH06_BARYCENTRE.md) | Barycentre de deux points, ensembles de points | Concours et alignement dans un triangle |
| 7 | [Translations](T1_CH07_TRANSLATIONS.md) | Images, reconnaître une translation | Lieu géométrique et construction |
| 8 | [Homothéties](T1_CH08_HOMOTHETIES.md) | Image d'un triangle, centre d'une homothétie | Deux cercles tangents |
| 9 | [Rotations](T1_CH09_ROTATIONS.md) | Radians, images, carré inscrit dans un carré | Deux triangles équilatéraux, lieu géométrique |

## Tome 2

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 1 | [Suites arithmétiques](T2_CH01_SUITES_ARITHMETIQUES.md) | Reconnaître, terme général, sommes, graphique | Deux offres d'emploi |
| 2 | [Suites géométriques](T2_CH02_SUITES_GEOMETRIQUES.md) | Reconnaître, terme général, sommes | Intérêts simples, intérêts composés, épargne |
| 3 | [Généralités sur les fonctions](T2_CH03_GENERALITES_FONCTIONS.md) | Image, antécédent, parité, variations, extremums | Un carré dans un carré |
| 4 | [Fonctions de référence](T2_CH04_FONCTIONS_DE_REFERENCE.md) | Parabole et courbe de x ↦ √(x + 4) | L'image donnée par une lentille (hyperbole) |
| 5 | [Trigonométrie et mesure des grandeurs](T2_CH05_TRIGONOMETRIE.md) | cos, sin, tan, cotan d'un réel de [0, π] | Partager un terrain triangulaire (Al-Kashi, loi des sinus) |
| 6 | [Géométrie analytique](T2_CH06_GEOMETRIE_ANALYTIQUE.md) | Colinéarité, droites, parallélisme, orthogonalité | Une antenne, trois villages, deux routes (cercle) |
| 7 | [Droites et plans de l'espace](T2_CH07_DROITES_PLANS_ESPACE.md) | Positions relatives dans un tétraèdre | Une lampe en verre |
| 8 | [Parallélisme dans l'espace](T2_CH08_PARALLELISME_ESPACE.md) | Droites et plans parallèles dans un cube | Une pyramide sciée parallèlement à une face |
| 9 | [Orthogonalité dans l'espace](T2_CH09_ORTHOGONALITE_ESPACE.md) | Orthogonalité dans un cube | Un présentoir en forme de pyramide |
| 10 | [Statistiques](T2_CH10_STATISTIQUES.md) | Série discrète : position, dispersion | Durée des trajets, série chronologique |
