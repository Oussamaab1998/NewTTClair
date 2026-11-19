# Exercices 3ème Sciences expérimentales (mathématiques)

40 exercices avec corrigé : 2 par chapitre, pour les 20 chapitres des deux manuels CNP de 3ème Sc. exp.

- Sources : programme officiel de mathématiques 3ème & 4ème (sept. 2006), pages 16–22 (section Sciences expérimentales), et les manuels CNP 3ème Sc. exp. tome 1 et tome 2 (copie sur sigmaths.net).
- Langue : français, comme le manuel et l'examen. Les explications en derja ne sont pas encore écrites.
- Niveau : un devoir normal de 3ème. Dans chaque chapitre, l'exercice 1 travaille les techniques et l'exercice 2 est un problème (plusieurs notions ou une situation concrète).
- Outils : chaque exercice n'utilise que le chapitre, les chapitres précédents du même tome et les années précédentes. Le chapitre 8 du tome 1 utilise aussi les formules de trigonométrie du tome 2 (chapitre 3), comme le manuel.
- Notation (sans flèches) : vec(AB) est un vecteur, vec(AB)(1, −1, 2) ses composantes, AB une longueur, u·v un produit scalaire. Nombres décimaux avec un point (0.5), comme dans le manuel.
- Relecture : chaque chapitre a été résolu une seconde fois, à partir des énoncés seuls, par un vérificateur indépendant, puis comparé au corrigé. Aucune réponse fausse n'a été trouvée. Les points corrigés ensuite étaient des outils pris d'un chapitre plus loin (règle de symétrie f(2a − x), ensemble vec(AM)·n = 0, équation de cercle) et des justifications incomplètes.
- Vérification : chaque chapitre a un script `check_*.py` qui recalcule toutes les valeurs des corrigés (fractions exactes, ou dénombrement complet pour les probabilités). Lancer `python3 -I docs/exercises/3se/check_t1_ch03.py` ; il doit afficher `all N checks passed`.
- Statut : `reviewed: false` partout. Un professeur de mathématiques doit tout relire avant utilisation. Les formules du manuel sont des images dans la copie PDF ; certaines définitions (déterminant, médiane et quartiles…) ont été reprises sous leur forme usuelle et sont signalées dans l'en-tête du chapitre.

## Tome 1 — Analyse et suites

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 1 | [Généralités sur les fonctions](T1_CH01_GENERALITES_FONCTIONS.md) | Parité, majorant, minorant, sens de variation | Fonctions affines par intervalles, partie entière |
| 2 | [Continuité](T1_CH02_CONTINUITE.md) | Continuité en un réel, à droite et à gauche | Image d'un intervalle, équation f(x) = k, dichotomie |
| 3 | [Limites et continuité](T1_CH03_LIMITES_ET_CONTINUITE.md) | Calcul de limites, prolongement par continuité | Choisir des paramètres pour une fonction continue |
| 4 | [Limites et comportements asymptotiques](T1_CH04_LIMITES_COMPORTEMENTS_ASYMPTOTIQUES.md) | Limites, asymptotes d'une fonction rationnelle | Distance d'une voiture à une antenne |
| 5 | [Nombre dérivé](T1_CH05_NOMBRE_DERIVE.md) | Nombre dérivé, tangente, approximation affine, demi-tangentes | Le profil d'un toboggan |
| 6 | [Fonction dérivée](T1_CH06_FONCTION_DERIVEE.md) | Dérivées, sens de variation, extrema locaux | Optimisation : une porte sous une arche |
| 7 | [Exemples d'étude de fonctions](T1_CH07_ETUDE_DE_FONCTIONS.md) | Étude de x ↦ (x² + 2x + 5)/(x + 1) | Longueur d'une tangente à un cercle : x ↦ √(x² + 2x − 8) |
| 8 | [Fonctions trigonométriques](T1_CH08_FONCTIONS_TRIGONOMETRIQUES.md) | Étude de x ↦ cos 2x + √3 sin 2x ; tan x et sa tangente en O | La grande roue |
| 9 | [Suites réelles](T1_CH09_SUITES_REELLES.md) | Variations, bornes, suite récurrente homographique | Deux plans d'épargne |
| 10 | [Limites de suites réelles](T1_CH10_LIMITES_DE_SUITES.md) | Techniques de calcul de limites | Des fractions qui s'approchent de √2 |

## Tome 2 — Géométrie, complexes, dénombrement, statistiques, probabilités

| Ch. | Fichier | Exercice 1 | Exercice 2 |
|---|---|---|---|
| 1 | [Produit scalaire dans le plan](T2_CH01_PRODUIT_SCALAIRE_PLAN.md) | Al-Kashi, projection orthogonale, médiane, lignes de niveau | Triangle dans un repère : hauteurs, cercle circonscrit |
| 2 | [Angles orientés](T2_CH02_ANGLES_ORIENTES.md) | Mesure principale, Chasles, angle inscrit, déterminant | Carré et triangles équilatéraux : alignement, arc de cercle |
| 3 | [Trigonométrie](T2_CH03_TRIGONOMETRIE.md) | Formules d'addition et de duplication, équations, inéquations | La grande roue |
| 4 | [Nombres complexes](T2_CH04_NOMBRES_COMPLEXES.md) | Forme algébrique, conjugué, module, argument | Un carré dans le plan complexe, ensembles de points |
| 5 | [Vecteurs de l'espace](T2_CH05_VECTEURS_ESPACE.md) | Coordonnées, déterminant, base, coplanarité | Un parallélogramme dans un tétraèdre |
| 6 | [Produit scalaire dans l'espace](T2_CH06_PRODUIT_SCALAIRE_ESPACE.md) | Produit scalaire et orthogonalité dans un repère | Une tente en forme de pyramide |
| 7 | [Équations de droites et de plans](T2_CH07_DROITES_ET_PLANS.md) | Représentations paramétriques, équation cartésienne, intersections | Dans un cube : plan, droite perpendiculaire, projeté orthogonal |
| 8 | [Dénombrement](T2_CH08_DENOMBREMENT.md) | Cardinal, arrangements, combinaisons, binôme | Un club : bureau, comité, vote, photo |
| 9 | [Statistiques](T2_CH09_STATISTIQUES.md) | Notes d'un devoir : position, dispersion | Sport et endurance : séries à deux caractères |
| 10 | [Probabilités](T2_CH10_PROBABILITES.md) | Loi de probabilité, réunion, intersection, contraire | Une urne, trois façons de tirer |
