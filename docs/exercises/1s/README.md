# Exercices 1ère année secondaire (mathématiques)

32 exercices avec corrigé : 2 par chapitre, pour les 16 chapitres du manuel CNP de 1ère année (tronc commun).

- Sources : programme officiel de mathématiques 1ère & 2ème années (sept. 2005), pages 3–14 (1ère année), et le manuel CNP « Mathématiques, Première année de l'enseignement secondaire » (un livre en deux parties, copie sur sigmaths.net). Attention : sur sigmaths, le fichier `1s_p2.pdf` contient les pages 1–130 (chapitres 1–8) et `1s_p1.pdf` les pages 131–272 (chapitres 9–16).
- Le manuel a deux moitiés enseignées en parallèle : travaux géométriques (ch. 1–8) et travaux numériques (ch. 9–16). Un exercice n'utilise que son chapitre, les chapitres précédents de sa moitié, les bases de l'autre moitié et le collège (9ème année de base).
- Langue, niveau, notation : comme pour la 3ème et la 2ème (voir `../3se/README.md`). Français, devoir normal de 1ère année, vec(AB) pour un vecteur, AB pour une longueur, « l'angle ABC » pour un angle, point décimal (0.5). Pas de discriminant, pas de barycentre, pas d'homothétie, pas d'autre rotation que le quart de tour.
- Relecture : chaque chapitre a été résolu une seconde fois, à partir des énoncés seuls, par un vérificateur indépendant. Aucune réponse fausse n'a été trouvée. Les points corrigés ensuite : un corrigé qui oubliait une deuxième bonne réponse (ch. 3 : l'angle BAH a aussi la tangente 0.75), des justifications incomplètes (point entre deux autres, produit non nul, égalité de vecteurs, plan parallèle à une arête), des données qui rendaient deux méthodes incohérentes (indices arrondis, ch. 16), des notations en double, et des vérifications de script trop faibles.
- Vérification : chaque chapitre a un script `check_chNN.py` (`python3 -I docs/exercises/1s/check_ch03.py` affiche `all N checks passed`).
- Statut : `reviewed: false` partout. Un professeur de mathématiques doit tout relire. Les règles que le manuel ne formule pas (unicité de la décomposition en facteurs premiers, principe additif, valeurs remarquables illisibles dans la copie PDF…) sont rappelées dans les énoncés (« On rappelle » / « On admet »).

## Travaux géométriques (partie 1)

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 1 | [Angles](CH01_ANGLES.md) | Bissectrice, angles alternes-internes et correspondants, losange | Le cadran d'une horloge (angle inscrit) |
| 2 | [Théorème de Thalès et sa réciproque](CH02_THALES.md) | Thalès, réciproque, réduction, partage d'un segment | Deux poteaux et deux câbles |
| 3 | [Rapports trigonométriques, relations métriques](CH03_TRIGONOMETRIE_TRIANGLE_RECTANGLE.md) | Cosinus, sinus, tangente, relations métriques | La maison : le toit et l'échelle |
| 4 | [Vecteurs et translations](CH04_VECTEURS_TRANSLATIONS.md) | Égalités vectorielles, images par une translation | Où construire le pont ? |
| 5 | [Somme de deux vecteurs, vecteurs colinéaires](CH05_SOMME_VECTEURS_COLINEAIRES.md) | Chasles, règle du parallélogramme, centre de gravité | Traverser une rivière en barque |
| 6 | [Activités dans un repère](CH06_ACTIVITES_REPERE.md) | Abscisses, coordonnées, composantes, distances | Choisir un repère pour démontrer |
| 7 | [Quart de tour](CH07_QUART_DE_TOUR.md) | Images dans un repère (point, segment, droite, cercle) | Un carré dans un carré |
| 8 | [Sections planes d'un solide](CH08_SECTIONS_PLANES.md) | Sections d'un pavé droit et d'une pyramide | Un cornet de glace (cône, sphère) |

## Travaux numériques (partie 2)

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 9 | [Activités numériques I](CH09_ACTIVITES_NUMERIQUES_I.md) | Facteurs premiers, PGCD, PPCM, fractions | La fête du lycée : PGCD, PPCM, dénombrement, pourcentages |
| 10 | [Activités numériques II](CH10_ACTIVITES_NUMERIQUES_II.md) | Puissances, racines carrées, ordre, valeur absolue, encadrements | Agrandir et réduire une photo |
| 11 | [Activités algébriques](CH11_ACTIVITES_ALGEBRIQUES.md) | Développer, factoriser, choisir la bonne forme | La boîte sans couvercle (optimisation) |
| 12 | [Fonctions linéaires](CH12_FONCTIONS_LINEAIRES.md) | Coefficient, image, antécédent, graphique | Hausse puis remise : enchaîner des pourcentages |
| 13 | [Équations et inéquations du 1er degré](CH13_EQUATIONS_INEQUATIONS.md) | Équations, équations produits, inéquations, tableau de signe | Choisir le tarif le plus avantageux |
| 14 | [Fonctions affines](CH14_FONCTIONS_AFFINES.md) | Déterminer, représenter, résoudre graphiquement | Rencontre de deux véhicules |
| 15 | [Systèmes de deux équations à deux inconnues](CH15_SYSTEMES.md) | Substitution, élimination, interprétation graphique | Prix et mélanges |
| 16 | [Exploitation de l'information](CH16_EXPLOITATION_INFORMATION.md) | Les livres lus pendant les vacances | Un projet de bus scolaire (histogramme, indices) |
