# 2ème Sciences — Tome 2, Chapitre 10 : Statistiques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 23 (activités statistiques) : séries statistiques à une variable ; paramètres de position (médiane, quartiles, moyenne, mode) ; paramètres de dispersion (étendue, variance, écart type) ; représentations graphiques d'une série statistique ou chronologique (diagrammes, histogramme, courbes) ; lire un diagramme, un histogramme ou une courbe.
- Manuel CNP (tome 2, p. 167–199) : série chronologique, courbe d'évolution, coefficient multiplicateur et indice (base 100) ; diagramme en bâtons, histogramme, polygone des effectifs, courbe des fréquences cumulées croissantes. Quartiles d'une série discrète : Q1 est la plus petite valeur xᵢ telle qu'au moins 25 % de l'effectif prennent des valeurs inférieures ou égales à Q1 (Q3 : même définition avec 75 %). Série continue (répartition supposée régulière dans chaque classe) : médiane et quartiles par interpolation linéaire, ou lus sur la courbe des fréquences cumulées croissantes aux ordonnées 0.5, 0.25 et 0.75. Écart interquartile Q3 − Q1, diagramme en boîte. Variance V = (1/n)(n₁x₁² + n₂x₂² + ... + nₚxₚ²) − x̄², écart type σ = √V ; pour une série continue, les xᵢ sont les centres des classes.
- La définition de la médiane d'une série discrète n'est pas redonnée dans le manuel de 2ème (elle est vue en 1ère) : elle est rappelée dans l'énoncé (« On rappelle que ... »). Les données sont choisies pour que la règle des rangs (N + 1)/2 ou N/2 et N/2 + 1, la règle « au moins 50 % » et, pour les quartiles, la règle des rangs E(N/4) + 1 et E(3N/4) + 1 donnent toutes les mêmes valeurs.
- Outils autorisés : ceux du chapitre et de la 1ère année (moyenne, médiane, mode, étendue, pourcentages) ; calculatrice autorisée. Pas de séries à deux variables, pas de distribution normale (programme de 3ème).
- Notation : x̄ la moyenne, V la variance, σ l'écart type, Me ou m la médiane, Q1 et Q3 les quartiles.
- Toutes les valeurs sont vérifiées par `check_t2_ch10.py` (calcul exact en fractions ; écarts types en flottants, arrondis).

---

## Exercice 1 — Livres empruntés à la bibliothèque : série discrète

Le tableau donne le nombre de livres empruntés à la bibliothèque du lycée pendant le premier trimestre par 45 élèves de 2ème année.

    Nombre de livres xᵢ  |  0   1   2   3   4   5   6   7
    Effectif nᵢ          |  3   6   9  11   7   5   3   1

1. a) Préciser la population, le caractère étudié et sa nature.
   b) Représenter la série par un diagramme en bâtons.
   c) Donner le mode et l'étendue de la série.
2. a) Dresser le tableau des effectifs cumulés croissants et des fréquences cumulées croissantes (en %, arrondies à 0.01).
   b) On rappelle que, les N valeurs d'une série étant rangées dans l'ordre croissant, la médiane est la valeur de rang (N + 1)/2 si N est impair, et la demi-somme des valeurs de rangs N/2 et N/2 + 1 si N est pair. Déterminer la médiane Me de la série.
   c) Déterminer le premier quartile Q1, le troisième quartile Q3 et l'écart interquartile.
   d) Construire le diagramme en boîte de la série et l'interpréter.
3. a) Calculer le nombre moyen x̄ de livres empruntés par élève.
   b) Calculer la variance V et l'écart type σ de la série (σ arrondi à 0.01).
   c) Quel est le pourcentage des élèves dont le nombre de livres appartient à l'intervalle [x̄ − σ, x̄ + σ] ?
4. On apprend que 5 autres élèves de 2ème année, absents le jour de l'enquête, n'ont emprunté aucun livre pendant le trimestre. On les ajoute à la série, qui compte maintenant 50 élèves.
   a) Calculer la nouvelle moyenne.
   b) Déterminer la nouvelle médiane et les nouveaux quartiles.
   c) Lequel des deux paramètres, la moyenne ou la médiane, a été modifié par l'ajout de ces 5 élèves ? Expliquer pourquoi.

### Corrigé

**1. a)** La population est formée des 45 élèves interrogés. Le caractère étudié est le nombre de livres empruntés pendant le trimestre : c'est un caractère quantitatif discret.

**b)** Sur l'axe des abscisses, on place les valeurs 0, 1, ..., 7 ; au-dessus de chaque valeur xᵢ, on trace un bâton vertical de hauteur proportionnelle à l'effectif nᵢ (par exemple 1 cm pour 2 élèves) : 3, 6, 9, 11, 7, 5, 3 et 1. Le plus haut bâton est au-dessus de 3.

**c)** Le mode est 3 (effectif maximal 11). L'étendue est 7 − 0 = 7.

**2. a)**

    xᵢ                          |  0      1     2     3       4     5       6       7
    Effectifs cumulés           |  3      9    18    29      36    41      44      45
    Fréquences cumulées (%)     |  6.67  20    40    64.44   80    91.11   97.78   100

**b)** N = 45 est impair : la médiane est la valeur de rang (45 + 1)/2 = 23. D'après les effectifs cumulés, les valeurs de rangs 19 à 29 sont égales à 3. Donc Me = 3.
(Contrôle : 29 élèves, soit 64.44 %, ont emprunté au plus 3 livres, et 45 − 18 = 27 élèves, soit 60 %, en ont emprunté au moins 3.)

**c)** On utilise la définition du manuel.

- 25 % de 45 font 11.25. La fréquence cumulée vaut 20 % pour la valeur 1 (moins de 25 %) et 40 % pour la valeur 2 (au moins 25 %). Donc Q1 = 2.
- 75 % de 45 font 33.75. La fréquence cumulée vaut 64.44 % pour la valeur 3 (moins de 75 %) et 80 % pour la valeur 4 (au moins 75 %). Donc Q3 = 4.

Écart interquartile : Q3 − Q1 = 4 − 2 = 2.
(N/4 = 11.25 n'est pas entier : la règle des rangs E(N/4) + 1 = 12 et E(3N/4) + 1 = 34 donne les mêmes quartiles.)

**d)** Sur un axe gradué de 0 à 7 : un trait (moustache) de 0 (valeur minimale) à 2 ; un rectangle de 2 (Q1) à 4 (Q3), de largeur quelconque, coupé par un trait vertical en 3 (médiane) ; puis une moustache de 4 à 7 (valeur maximale).
Interprétation : 9 + 11 + 7 = 27 élèves, soit 60 %, ont emprunté entre 2 et 4 livres ; la moustache de droite est plus longue que celle de gauche : quelques élèves empruntent beaucoup plus de livres que les autres.

**3. a)**

    Σ nᵢxᵢ = 0 + 6 + 18 + 33 + 28 + 25 + 18 + 7 = 135          x̄ = 135 / 45 = 3

Un élève a emprunté en moyenne 3 livres.

**b)**

    Σ nᵢxᵢ² = 0 + 6 + 36 + 99 + 112 + 125 + 108 + 49 = 535
    V = 535 / 45 − 3² = 107/9 − 81/9 = 26/9 ≈ 2.889
    σ = √(26/9) ≈ 1.70

**c)** x̄ − σ ≈ 1.30 et x̄ + σ ≈ 4.70. Les valeurs de la série qui appartiennent à cet intervalle sont 2, 3 et 4, soit 9 + 11 + 7 = 27 élèves : 27 / 45 = 60 % des élèves.

**4.** La nouvelle série a pour effectifs 8, 6, 9, 11, 7, 5, 3, 1 (N = 50) ; ses effectifs cumulés croissants sont 8, 14, 23, 34, 41, 46, 49, 50.

**a)** La somme Σ nᵢxᵢ ne change pas (on ajoute des valeurs nulles) : la nouvelle moyenne est 135 / 50 = 2.7.

**b)** N = 50 est pair : la médiane est la demi-somme des valeurs de rangs 25 et 26. Les valeurs de rangs 24 à 34 sont égales à 3, donc Me = (3 + 3)/2 = 3.
25 % de 50 font 12.5 : la fréquence cumulée vaut 16 % pour 0 et 28 % pour 1, donc Q1 = 1.
75 % de 50 font 37.5 : la fréquence cumulée vaut 68 % pour 3 et 82 % pour 4, donc Q3 = 4.
(Les rangs 25 et 26 portent la même valeur, et E(N/4) + 1 = 13, E(3N/4) + 1 = 38 donnent aussi Q1 = 1 et Q3 = 4 : toutes les règles usuelles coïncident.)

**c)** La moyenne passe de 3 à 2.7 (elle baisse de 10 %), alors que la médiane reste égale à 3.
La moyenne tient compte de toutes les valeurs : ajouter des valeurs nulles la fait baisser. La médiane ne dépend que de la valeur située au milieu de la série rangée : les 5 nouveaux élèves se placent au début, et la valeur du milieu reste 3. Seul le premier quartile baisse (de 2 à 1).

---

## Exercice 2 — Durée des trajets et production d'huile d'olive

### Partie A

On a relevé la durée t (en minutes) du trajet domicile–lycée de 80 élèves d'un lycée. On suppose que, dans chaque classe, les durées sont réparties de façon régulière.

    Durée t (min)  |  [0, 10[   [10, 20[   [20, 30[   [30, 40[   [40, 50[
    Effectif       |      4         20         32         16          8

1. a) Représenter la série par un histogramme.
   b) Déterminer la classe modale.
   c) Quel est le pourcentage des élèves dont le trajet dure au moins 30 minutes ?
2. En utilisant les centres des classes, calculer la durée moyenne x̄, la variance V et l'écart type σ (σ arrondi à 0.01).
3. a) Dresser le tableau des effectifs cumulés croissants et des fréquences cumulées croissantes.
   b) Tracer le polygone des fréquences cumulées croissantes.
   c) Déterminer, par interpolation linéaire, la médiane m, le premier quartile Q1 et le troisième quartile Q3. Vérifier ces valeurs sur le graphique du b).
   d) Construire le diagramme en boîte de la série (on prendra 0 et 50 comme valeurs extrêmes).
4. Estimer le nombre d'élèves dont le trajet dure moins de 15 minutes.

### Partie B

Le tableau donne la production annuelle d'huile d'olive (en tonnes) d'une coopérative de 2018 à 2025.

    Année            |  2018   2019   2020   2021   2022   2023   2024   2025
    Production (t)   |   400    520    360    464    300    248    540    612

5. a) Représenter cette série chronologique par une courbe d'évolution.
   b) Décrire l'évolution de la production.
6. a) Pour chaque année, calculer le coefficient multiplicateur qui permet de passer de la production de 2018 à celle de cette année, puis l'indice de la production (base 100 en 2018).
   b) Interpréter l'indice de 2023 et celui de 2025.
7. a) Calculer la production annuelle moyenne de 2018 à 2025 et l'étendue de la série. Quelles années ont une production supérieure à la moyenne ?
   b) Entre 2024 et 2025, l'indice passe de 135 à 153. Un élève affirme : « la production a augmenté de 18 % ». A-t-il raison ? Calculer le pourcentage d'augmentation de la production entre 2024 et 2025 (arrondi à 0.1 %).

### Corrigé — Partie A

**1. a)** Les classes ont toutes la même amplitude 10 : on trace, au-dessus de chaque classe, un rectangle de hauteur proportionnelle à l'effectif (par exemple 1 cm pour 4 élèves) : 4, 20, 32, 16 et 8.

**b)** La classe modale est [20, 30[ (effectif maximal 32).

**c)** 16 + 8 = 24 élèves ont un trajet d'au moins 30 minutes, soit 24 / 80 = 30 %.

**2.** Les centres des classes sont 5, 15, 25, 35 et 45.

    Σ nᵢxᵢ = 4 × 5 + 20 × 15 + 32 × 25 + 16 × 35 + 8 × 45 = 20 + 300 + 800 + 560 + 360 = 2040
    x̄ = 2040 / 80 = 25.5 min

    Σ nᵢxᵢ² = 4 × 25 + 20 × 225 + 32 × 625 + 16 × 1225 + 8 × 2025
            = 100 + 4500 + 20000 + 19600 + 16200 = 60400
    V = 60400 / 80 − 25.5² = 755 − 650.25 = 104.75
    σ = √104.75 ≈ 10.23 min

**3. a)**

    Durée t (min)                 |  [0, 10[   [10, 20[   [20, 30[   [30, 40[   [40, 50[
    Effectifs cumulés croissants  |      4         24         56         72         80
    Fréquences cumulées (%)       |      5         30         70         90        100

**b)** On place les points d'abscisse la borne supérieure de chaque classe et d'ordonnée la fréquence cumulée correspondante, ainsi que le point de départ (0, 0) : (0, 0), (10, 0.05), (20, 0.30), (30, 0.70), (40, 0.90) et (50, 1). On les relie par des segments.

**c)** Médiane : la moitié de l'effectif est 40. Il y a 24 élèves avant 20 minutes et 56 avant 30 minutes, donc m ∈ [20, 30[. Par interpolation linéaire :

    (m − 20) / (30 − 20) = (40 − 24) / (56 − 24)   donc   m = 20 + 10 × 16/32 = 25 min

Premier quartile : 25 % de l'effectif est 20, entre 4 (à 10 min) et 24 (à 20 min) :

    Q1 = 10 + 10 × (20 − 4) / (24 − 4) = 10 + 10 × 16/20 = 18 min

Troisième quartile : 75 % de l'effectif est 60, entre 56 (à 30 min) et 72 (à 40 min) :

    Q3 = 30 + 10 × (60 − 56) / (72 − 56) = 30 + 10 × 4/16 = 32.5 min

Sur le polygone du b), les points d'ordonnées 0.25, 0.5 et 0.75 ont pour abscisses 18, 25 et 32.5 : on retrouve Q1, m et Q3 (l'interpolation linéaire revient à lire sur ce polygone).
Écart interquartile : 32.5 − 18 = 14.5 min.

**d)** Sur un axe gradué de 0 à 50 : une moustache de 0 à 18, un rectangle de 18 (Q1) à 32.5 (Q3) coupé par un trait vertical en 25 (médiane), puis une moustache de 32.5 à 50.
La moitié environ des élèves ont un trajet compris entre 18 et 32.5 minutes. La moyenne 25.5 est très proche de la médiane 25.

**4.** 4 élèves ont un trajet de moins de 10 minutes. Les 20 élèves de la classe [10, 20[ sont supposés répartis régulièrement : environ la moitié d'entre eux, soit 10, ont un trajet de moins de 15 minutes.
Estimation : 4 + 10 = 14 élèves, soit 17.5 % des élèves.

### Corrigé — Partie B

**5. a)** Dans un repère, on porte les années en abscisses et la production en ordonnées (par exemple 1 cm pour 50 tonnes, en commençant à 200 tonnes) ; on place les points (2018, 400), (2019, 520), ..., (2025, 612) et on les relie par des segments.

**b)** De 2018 à 2021, la production alterne une hausse et une baisse (400, 520, 360, 464). Elle baisse ensuite deux années de suite jusqu'à son minimum, 248 tonnes en 2023, puis remonte fortement en 2024 et 2025, où elle atteint son maximum, 612 tonnes.

**6. a)** Le coefficient multiplicateur de l'année est (production de l'année) / 400, et l'indice est ce coefficient multiplié par 100.

    Année                       |  2018   2019   2020   2021   2022   2023   2024   2025
    Coefficient multiplicateur  |  1      1.3    0.9    1.16   0.75   0.62   1.35   1.53
    Indice (base 100 en 2018)   |  100    130    90     116    75     62     135    153

**b)** Indice 62 en 2023 : la production de 2023 représente 62 % de celle de 2018 ; elle a baissé de 38 % par rapport à 2018.
Indice 153 en 2025 : la production de 2025 a augmenté de 53 % par rapport à 2018.

**7. a)**

    Σ = 400 + 520 + 360 + 464 + 300 + 248 + 540 + 612 = 3444      moyenne = 3444 / 8 = 430.5 t

L'étendue est 612 − 248 = 364 t. Les années dont la production dépasse 430.5 t sont 2019 (520 t), 2021 (464 t), 2024 (540 t) et 2025 (612 t).

**b)** L'élève a tort : 153 − 135 = 18 points d'indice représentent 18 % de la production de 2018 (l'année de base), pas de celle de 2024.
Le coefficient multiplicateur de 2024 à 2025 est 612 / 540 = 153 / 135 ≈ 1.1333 : la production a augmenté d'environ 13.3 % entre 2024 et 2025.
