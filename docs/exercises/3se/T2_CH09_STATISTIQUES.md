# 3ème Sc. exp. — Tome 2, Chapitre 9 : Statistiques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 22 : séries statistiques à un caractère (paramètres de position et de dispersion) ; séries statistiques à deux caractères : tableau à deux entrées, distributions marginales, fréquences marginales, paramètres de position et de dispersion des distributions marginales, nuage de points, point moyen.
- Manuel CNP (tome 2, p. 158–174) : médiane et quartiles définis par les rangs des valeurs rangées dans l'ordre croissant, écart interquartile, diagramme en boîte ; moyenne, variance V = (1/N) Σ nᵢxᵢ² − x̄², écart-type σ = √V ; effet d'une transformation y = ax + b ; distribution normale (environ 68 %, 95 % et 99 % des valeurs dans [x̄ − σ, x̄ + σ], [x̄ − 2σ, x̄ + 2σ], [x̄ − 3σ, x̄ + 3σ]) ; écart à la moyenne en unités d'écart-type ; écart-type relatif σ / x̄ ; ajustement affine par la droite (G₁G₂) des points moyens de deux parties du nuage.
- Toutes les valeurs sont vérifiées par `check_t2_ch09.py` (calcul exact en fractions ; écarts-types en flottants, arrondis).
- Outils autorisés : ceux du chapitre ; calculatrice autorisée. Pas de covariance ni de droite des moindres carrés (hors programme de 3ème).

---

## Exercice 1 — Notes d'un devoir : position, dispersion, transformation affine

Le tableau donne les notes (sur 20) obtenues par les 35 élèves d'une classe de 3ème année à un devoir de mathématiques.

    Note xᵢ       |  4   6   8   9   10   11   12   14   16   18
    Effectif nᵢ   |  1   3   4   5    7    5    4    3    2    1

1. a) Donner le mode de la série. Calculer la moyenne x̄.
   b) Calculer la variance V et l'écart-type σ de la série (σ arrondi à 0.01 près).
2. a) Dresser le tableau des effectifs cumulés croissants.
   b) Déterminer la médiane Me, le premier quartile Q1, le troisième quartile Q3 et l'écart interquartile.
   c) Représenter le diagramme en boîte de la série et l'interpréter.
3. a) Calculer le pourcentage des élèves dont la note appartient à chacun des intervalles [x̄ − σ, x̄ + σ], [x̄ − 2σ, x̄ + 2σ] et [x̄ − 3σ, x̄ + 3σ].
   b) Peut-on considérer que la série est proche d'une distribution normale ? Justifier.
4. Le professeur décide d'« harmoniser » les notes : chaque note x est remplacée par y = 0.8x + 4.
   a) Que deviennent les notes 20, 4 et 18 ?
   b) Sans refaire de tableau, déterminer la moyenne, l'écart-type, la médiane, les quartiles et l'écart interquartile de la nouvelle série.
   c) Comparer le pourcentage d'élèves ayant au moins 10 avant et après l'harmonisation.
5. Le même devoir a été donné dans une autre classe ; les notes (non harmonisées) y ont pour moyenne 11.5 et pour écart-type 3.2. Ali, de la première classe, a obtenu 13 ; Sami, de la seconde classe, a obtenu 14. En calculant l'écart de chaque note à la moyenne de sa classe en unités d'écart-type, dire lequel des deux élèves est le mieux placé dans sa classe.

### Corrigé

**1. a)** Le mode est 10 (c'est la note de plus grand effectif, 7).
Σ nᵢxᵢ = 4 + 18 + 32 + 45 + 70 + 55 + 48 + 42 + 32 + 18 = 364, donc x̄ = 364 / 35 = 10.4.

**b)** On utilise la formule du manuel V = (1/N) Σ nᵢxᵢ² − x̄².
Σ nᵢxᵢ² = 16 + 108 + 256 + 405 + 700 + 605 + 576 + 588 + 512 + 324 = 4090.

    V = 4090 / 35 − 10.4² ≈ 116.857 − 108.16 ≈ 8.697      (valeur exacte : 1522/175)
    σ = √V ≈ 2.949, soit σ ≈ 2.95

**2. a)**

    Note               |  4   6   8   9   10   11   12   14   16   18
    Effectifs cumulés  |  1   4   8   13  20   25   29   32   34   35

**b)** Définition du manuel : les N valeurs étant rangées dans l'ordre croissant, Q1 est la valeur de rang E(N/4) + 1, Me celle de rang E(N/2) + 1 et Q3 celle de rang E(3N/4) + 1 (E désigne la partie entière).
Ici N = 35 : N/4 = 8.75, N/2 = 17.5 et 3N/4 = 26.25, donc on lit les valeurs de rangs 9, 18 et 27.

- Les rangs 9 à 13 portent la note 9 : Q1 = 9.
- Les rangs 14 à 20 portent la note 10 : Me = 10.
- Les rangs 26 à 29 portent la note 12 : Q3 = 12.

Écart interquartile : Q3 − Q1 = 3.
Contrôle : 13 notes sur 35 (37 %) sont inférieures ou égales à 9 et 27 (77 %) lui sont supérieures ou égales ; 20 notes (57 %) sont ≤ 10 et 22 (63 %) sont ≥ 10 ; 29 notes (83 %) sont ≤ 12 et 10 (29 %) sont ≥ 12.
(N est impair et N/4 n'est pas entier : les autres règles usuelles de calcul donnent les mêmes valeurs.)

**c)** Sur un axe gradué de 0 à 20 : un trait (moustache) de 4 (minimum) à 9, une boîte de 9 (Q1) à 12 (Q3) coupée par un trait à 10 (médiane), puis une moustache de 12 à 18 (maximum).
Interprétation : au moins la moitié des élèves (ici 21 sur 35) ont une note comprise entre 9 et 12. La boîte est étroite (écart interquartile 3) : les notes centrales sont assez regroupées. La médiane est plus proche de Q1 que de Q3.

**3. a)** x̄ − σ ≈ 7.45 et x̄ + σ ≈ 13.35 : les notes 8, 9, 10, 11 et 12 sont dans l'intervalle, soit 4 + 5 + 7 + 5 + 4 = 25 élèves, c'est-à-dire 25 / 35 ≈ 71.43 %.
x̄ − 2σ ≈ 4.50 et x̄ + 2σ ≈ 16.30 : toutes les notes sauf 4 et 18, soit 33 élèves, c'est-à-dire ≈ 94.29 %.
x̄ − 3σ ≈ 1.55 et x̄ + 3σ ≈ 19.25 : les 35 élèves, soit 100 %.

**b)** Les pourcentages obtenus (environ 71 %, 94 % et 100 %) sont proches de 68 %, 95 % et 99 %, et le polygone des effectifs a à peu près une forme de cloche autour de 10. On peut considérer que la série est proche d'une distribution normale (avec seulement 35 notes, ce n'est qu'une approximation).

**4. a)** y = 0.8 × 20 + 4 = 20, y = 0.8 × 4 + 4 = 7.2 et y = 0.8 × 18 + 4 = 18.4. Les notes faibles augmentent beaucoup, les notes fortes un peu, et 20 reste 20.

**b)** D'après les propriétés du cours (ici a = 0.8 > 0 et b = 4) :

- moyenne : ȳ = 0.8 x̄ + 4 = 0.8 × 10.4 + 4 = 12.32 ;
- écart-type : σ' = |0.8| σ ≈ 0.8 × 2.949 ≈ 2.36 ;
- médiane : 0.8 × 10 + 4 = 12 ; quartiles : Q1' = 0.8 × 9 + 4 = 11.2 et Q3' = 0.8 × 12 + 4 = 13.6 ;
- écart interquartile : 13.6 − 11.2 = 2.4 (= 0.8 × 3).

Les notes sont plus élevées et moins dispersées.

**c)** Avant : 7 + 5 + 4 + 3 + 2 + 1 = 22 élèves ont au moins 10, soit 22 / 35 ≈ 62.86 %.
Après : y ≥ 10 ⟺ 0.8x + 4 ≥ 10 ⟺ x ≥ 7.5, c'est-à-dire x ≥ 8 dans ce tableau. Cela fait 35 − 1 − 3 = 31 élèves, soit 31 / 35 ≈ 88.57 %.

**5.** Écart en unités d'écart-type :

    Ali  : (13 − 10.4) / 2.949 ≈ 0.88
    Sami : (14 − 11.5) / 3.2 ≈ 0.78

Ali est le mieux placé dans sa classe, bien que sa note soit plus faible que celle de Sami.

---

## Exercice 2 — Sport et endurance : séries à deux caractères

### Partie A

On a interrogé les 50 élèves de 3ème année d'un lycée. Pour chaque élève, on a relevé X, le nombre d'heures de sport pratiquées par semaine en dehors des cours, et Y, le palier atteint à un test d'endurance (course navette). Le tableau donne les effectifs.

    Y \ X  |  0    2    4    6
    3      |  5    3    1    0
    5      |  3    7    4    1
    7      |  1    4    7    3
    9      |  0    1    4    6

(Par exemple, 7 élèves pratiquent 4 heures de sport par semaine et ont atteint le palier 7.)

1. a) Donner la distribution marginale de X et celle de Y (effectifs et fréquences marginales en %).
   b) Combien d'élèves pratiquent au moins 4 heures de sport par semaine ? Combien atteignent au moins le palier 7 ?
2. a) Calculer la moyenne et l'écart-type de chacune des deux distributions marginales (écarts-types arrondis à 0.01).
   b) Déterminer la médiane et les quartiles de la distribution marginale de Y.
   c) Comparer les dispersions de X et de Y à l'aide des écarts-types relatifs.
3. a) Le nuage de points de (X, Y) est formé des points M(x, y) du tableau, chacun étant affecté de son effectif. Déterminer les coordonnées du point moyen G.
   b) Quel pourcentage des 50 élèves pratique au moins 4 heures de sport et atteint au moins le palier 7 ? Quel pourcentage pratique au plus 2 heures et atteint au moins le palier 7 ? Commenter.

### Partie B

L'entraîneur du club d'athlétisme du lycée a relevé, pour 8 élèves du club, le nombre x d'heures d'entraînement par semaine et la distance y (en mètres) parcourue en 12 minutes (test de Cooper).

    Élève   |  1     2     3     4     5     6     7     8
    x (h)   |  5     2     7     1     3     8     2     6
    y (m)   | 2400  2000  2600  1850  2150  2740  2100  2520

1. Représenter le nuage de points de la série (x, y) dans un repère orthogonal (en abscisses 1 cm pour 1 h ; en ordonnées 1 cm pour 100 m, en commençant à 1800 m). Calculer les coordonnées du point moyen G.
2. On range les élèves suivant les valeurs croissantes de x et on partage le nuage en deux parties de 4 points : les 4 points d'abscisses les plus petites, puis les 4 autres.
   a) Calculer les coordonnées des points moyens G₁ et G₂ de ces deux parties.
   b) Déterminer une équation de la droite (G₁G₂) et vérifier qu'elle passe par G.
3. On prend la droite (G₁G₂) comme ajustement affine du nuage.
   a) Estimer la distance parcourue par un élève qui s'entraîne 4.5 heures par semaine.
   b) Selon cet ajustement, combien d'heures d'entraînement par semaine faudrait-il pour parcourir 2500 m ?

### Corrigé — Partie A

**1. a)** La distribution marginale de X s'obtient en additionnant chaque colonne, celle de Y en additionnant chaque ligne.

    xᵢ               |  0    2    4    6   | total
    effectif         |  9   15   16   10   |  50
    fréquence (%)    | 18   30   32   20   | 100

    yᵢ               |  3    5    7    9   | total
    effectif         |  9   15   15   11   |  50
    fréquence (%)    | 18   30   30   22   | 100

**b)** Au moins 4 heures : 16 + 10 = 26 élèves. Au moins le palier 7 : 15 + 11 = 26 élèves.

**2. a)** Distribution de X :

    Σ nᵢxᵢ = 0 + 30 + 64 + 60 = 154            x̄ = 154 / 50 = 3.08
    Σ nᵢxᵢ² = 0 + 60 + 256 + 360 = 676          V(X) = 676 / 50 − 3.08² = 13.52 − 9.4864 = 4.0336
    σ_X = √4.0336 ≈ 2.01

Distribution de Y :

    Σ nᵢyᵢ = 27 + 75 + 105 + 99 = 306           ȳ = 306 / 50 = 6.12
    Σ nᵢyᵢ² = 81 + 375 + 735 + 891 = 2082       V(Y) = 2082 / 50 − 6.12² = 41.64 − 37.4544 = 4.1856
    σ_Y = √4.1856 ≈ 2.05

**b)** N = 50 ; effectifs cumulés croissants de Y : 9, 24, 39, 50.
Avec la définition du manuel (rangs E(N/4) + 1 = 13, E(N/2) + 1 = 26 et E(3N/4) + 1 = 38) :

- la 13ème valeur est 5 : Q1 = 5 ;
- la 26ème valeur est 7 : Me = 7 ;
- la 38ème valeur est 7 : Q3 = 7.

(La 25ème et la 26ème valeur valent toutes les deux 7 : on trouve Me = 7 avec toutes les règles usuelles.)

**c)** Écarts-types relatifs : σ_X / x̄ ≈ 2.008 / 3.08 ≈ 65 % et σ_Y / ȳ ≈ 2.046 / 6.12 ≈ 33 %.
L'écart-type relatif n'a pas d'unité, ce qui permet de comparer des variables d'unités différentes. Les paliers sont relativement moins dispersés autour de leur moyenne que les heures de sport.

**3. a)** Le point moyen a pour coordonnées les moyennes des distributions marginales : G(3.08, 6.12).
(On obtient la même chose en faisant la moyenne des 50 couples du tableau.)

**b)** Au moins 4 heures et au moins le palier 7 : 7 + 3 + 4 + 6 = 20 élèves, soit 40 %.
Au plus 2 heures et au moins le palier 7 : 1 + 4 + 0 + 1 = 6 élèves, soit 12 %.
Commentaire : sur les 26 élèves qui atteignent au moins le palier 7, 20 pratiquent au moins 4 heures de sport. Les grands effectifs sont situés près de la diagonale du tableau : dans ce lycée, plus de sport va de pair avec une meilleure endurance. (Ce tableau ne prouve pas à lui seul une relation de cause à effet.)

### Corrigé — Partie B

**1.** Le nuage est formé des 8 points M₁(5, 2400), M₂(2, 2000), M₃(7, 2600), M₄(1, 1850), M₅(3, 2150), M₆(8, 2740), M₇(2, 2100), M₈(6, 2520). Les points sont presque alignés le long d'une droite « montante » : plus d'entraînement va de pair avec une plus grande distance.

    x̄ = (5 + 2 + 7 + 1 + 3 + 8 + 2 + 6) / 8 = 34 / 8 = 4.25
    ȳ = (2400 + 2000 + 2600 + 1850 + 2150 + 2740 + 2100 + 2520) / 8 = 18360 / 8 = 2295

G(4.25, 2295).

**2. a)** Rangés suivant x croissant : (1, 1850), (2, 2000), (2, 2100), (3, 2150) pour la première partie et (5, 2400), (6, 2520), (7, 2600), (8, 2740) pour la seconde.

    G₁ : x = (1 + 2 + 2 + 3) / 4 = 2        y = (1850 + 2000 + 2100 + 2150) / 4 = 8100 / 4 = 2025
    G₂ : x = (5 + 6 + 7 + 8) / 4 = 6.5      y = (2400 + 2520 + 2600 + 2740) / 4 = 10260 / 4 = 2565

G₁(2, 2025) et G₂(6.5, 2565).

**b)** Coefficient directeur : (2565 − 2025) / (6.5 − 2) = 540 / 4.5 = 120.
La droite a une équation de la forme y = 120x + p, avec 2025 = 120 × 2 + p, donc p = 1785.

    (G₁G₂) : y = 120x + 1785

Pour x = 4.25 : 120 × 4.25 + 1785 = 510 + 1785 = 2295 = ȳ. Donc G appartient à (G₁G₂). (Les deux parties ayant le même effectif, G est même le milieu de [G₁G₂].)

**3. a)** Pour x = 4.5 : y = 120 × 4.5 + 1785 = 540 + 1785 = 2325. Estimation : environ 2325 m.

**b)** 120x + 1785 = 2500 ⟺ x = 715 / 120 ≈ 5.96. Il faudrait environ 6 heures d'entraînement par semaine.
(Ces estimations restent dans le domaine observé, de 1 h à 8 h ; loin de ce domaine, l'ajustement affine n'a plus de sens.)
