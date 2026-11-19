# 2ème Sciences — Tome 1, Chapitre 2 : Problèmes du premier degré et problèmes du second degré

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (2ème Sciences et Technologie de l'informatique), p. 20, activités algébriques : problèmes du premier et du second degré, équations et inéquations du second degré à une inconnue réelle. Aptitudes : reconnaître un zéro d'un trinôme, factoriser un trinôme, résoudre des équations et inéquations se ramenant au premier degré, résoudre des équations se ramenant au second degré, déterminer deux réels connaissant leur somme et leur produit, déterminer le signe d'un trinôme, résoudre des inéquations se ramenant au second degré, résoudre des problèmes d'optimisation, modéliser des situations réelles.
- Manuel CNP (tome 1, p. 17–36) : problèmes et inéquations du premier degré, forme canonique a[(x + p)² + q], discriminant Δ = b² − 4ac, discriminant réduit Δ' = b'² − ac quand b = 2b' (racines (−b' ± √Δ') / a), somme −b/a et produit c/a des racines, cas a + b + c = 0 (1 est racine, l'autre est c/a), factorisation a(x − x₁)(x − x₂), signe du trinôme (signe de a à l'extérieur des racines, signe de −a entre les racines), équations se ramenant au second degré (bicarrées, avec √x, avec des fractions), inéquations produits et quotients, maximum d'une hauteur par la forme canonique.
- Outils autorisés : ce chapitre, le chapitre 1 et les acquis de 1ère année (Pythagore, aires). Pas de polynômes de degré 3 (chapitre 3), pas d'étude de fonctions (tome 2).
- Notation : x₁ et x₂ sont les racines d'un trinôme ; || dans un tableau de signe marque une valeur interdite.
- Toutes les valeurs sont vérifiées par `check_t1_ch02.py` (calcul exact en fractions et en nombres de la forme p + q√3 ou p + q√5).

---

## Exercice 1 — Trinôme : forme canonique, racines, signe, équations qui s'y ramènent

On considère le trinôme

    f(x) = 2x² − 5x − 3

1. a) Écrire f(x) sous forme canonique.
   b) En déduire que pour tout réel x, f(x) ≥ −49/8. Pour quelle valeur de x a-t-on f(x) = −49/8 ?
2. a) Résoudre dans ℝ l'équation f(x) = 0.
   b) Factoriser f(x).
3. a) Étudier le signe de f(x) suivant les valeurs du réel x. En déduire les solutions de l'inéquation f(x) ≤ 0.
   b) Résoudre dans ℝ l'inéquation (2x² − 5x − 3) / (x − 1) ≥ 0.
4. Résoudre dans ℝ :
   a) 2x⁴ − 5x² − 3 = 0 ;
   b) 2x − 5√x − 3 = 0 ;
   c) 2x⁴ − 5x² − 3 < 0.
5. a) Sans calculer de discriminant, vérifier que 1 est une racine de l'équation 3x² + 7x − 10 = 0, puis déterminer l'autre racine.
   b) Déterminer deux réels dont la somme est 7 et le produit est 11.
   c) Existe-t-il deux réels dont la somme est 7 et le produit est 13 ?

### Corrigé

**1. a)** f(x) = 2[x² − (5/2)x] − 3 = 2[(x − 5/4)² − 25/16] − 3 = 2[(x − 5/4)² − 25/16 − 24/16], soit

    f(x) = 2[(x − 5/4)² − 49/16] = 2(x − 5/4)² − 49/8

**b)** Pour tout réel x, (x − 5/4)² ≥ 0, donc f(x) ≥ −49/8.
f(x) = −49/8 ⟺ (x − 5/4)² = 0 ⟺ x = 5/4.

**2. a)** Δ = (−5)² − 4 × 2 × (−3) = 25 + 24 = 49 > 0 et √Δ = 7. L'équation a deux racines :
x₁ = (5 − 7) / 4 = −1/2 et x₂ = (5 + 7) / 4 = 3. S = {−1/2 ; 3}.

**b)** f(x) = 2(x − x₁)(x − x₂) = 2(x + 1/2)(x − 3) = (2x + 1)(x − 3).

**3. a)** a = 2 > 0 et Δ > 0 : f(x) est du signe de a à l'extérieur des racines et du signe de −a entre les racines.

    x    |   −∞           −1/2           3             +∞
    f(x) |          +      0      −      0      +

f(x) ≤ 0 ⟺ x ∈ [−1/2, 3].

**b)** Le quotient est défini pour x ≠ 1. On utilise le signe de f(x) et celui de x − 1 :

    x            |   −∞           −1/2           1             3             +∞
    2x² − 5x − 3 |          +      0      −             −      0      +
    x − 1        |          −             −      0      +             +
    quotient     |          −      0      +      ||     −      0      +

S = [−1/2, 1[ ∪ [3, +∞[.

**4. a)** On pose X = x², avec X ≥ 0. L'équation devient 2X² − 5X − 3 = 0, soit f(X) = 0 ⟺ X = −1/2 ou X = 3.
x² = −1/2 est impossible ; x² = 3 ⟺ x = −√3 ou x = √3. S = {−√3 ; √3}.

**b)** L'équation a un sens pour x ≥ 0. On pose X = √x, avec X ≥ 0 et x = X². L'équation devient 2X² − 5X − 3 = 0 ⟺ X = −1/2 ou X = 3.
X = −1/2 est refusé car X ≥ 0. X = 3 donne x = 9. Vérification : 2 × 9 − 5 × 3 − 3 = 0. S = {9}.

**c)** Avec X = x² : 2X² − 5X − 3 < 0 ⟺ −1/2 < X < 3 (d'après 3. a), les racines étant exclues).
Comme X = x² ≥ 0 > −1/2 est toujours vrai, l'inéquation équivaut à x² < 3, soit |x| < √3, c'est-à-dire −√3 < x < √3.
S = ]−√3, √3[.

**5. a)** 3 × 1² + 7 × 1 − 10 = 0 : 1 est une racine (ici a + b + c = 3 + 7 − 10 = 0).
Le produit des racines est c/a = −10/3, donc l'autre racine est −10/3. (Contrôle : 1 + (−10/3) = −7/3 = −b/a.)

**b)** Si u + v = 7 et uv = 11, alors (X − u)(X − v) = X² − 7X + 11 : u et v sont les racines de l'équation X² − 7X + 11 = 0.
Δ = 49 − 44 = 5 > 0, donc les racines sont (7 − √5)/2 et (7 + √5)/2.
Les deux réels cherchés sont (7 − √5)/2 et (7 + √5)/2. (Contrôle : leur somme est 7 et leur produit est (49 − 5)/4 = 11.)

**c)** De même, deux tels réels seraient les racines de X² − 7X + 13 = 0. Or Δ = 49 − 52 = −3 < 0 : cette équation n'a pas de racine réelle.
Il n'existe donc pas deux réels de somme 7 et de produit 13. (Autre justification : si u + v = 7, alors uv = u(7 − u) = 49/4 − (u − 7/2)² ≤ 49/4 < 13.)

---

## Exercice 2 — Un enclos le long d'un mur

### Partie A — Le prix du grillage

Un éleveur veut acheter du grillage. Deux fournisseurs proposent :

- fournisseur 1 : 7.5 dinars le mètre, livraison gratuite ;
- fournisseur 2 : 6 dinars le mètre, plus 54 dinars de livraison.

On note L la longueur de grillage achetée, en mètres (L > 0).

1. a) Calculer le prix payé chez chaque fournisseur pour L = 30, puis pour L = 60.
   b) Déterminer, suivant les valeurs de L, le fournisseur le plus avantageux.

### Partie B — L'enclos

L'éleveur achète 60 m de grillage. Il construit un enclos rectangulaire contre un long mur rectiligne : le côté le long du mur n'a pas besoin de grillage, les trois autres côtés sont faits avec les 60 m de grillage. On note x la longueur, en mètres, de chacun des deux côtés perpendiculaires au mur.

1. a) Montrer que le côté parallèle au mur mesure 60 − 2x, puis que x ∈ ]0, 30[.
   b) Montrer que l'aire de l'enclos, en m², est A(x) = −2x² + 60x.
2. a) Écrire A(x) sous forme canonique.
   b) En déduire l'aire maximale de l'enclos et ses dimensions dans ce cas.
3. a) Déterminer les dimensions de l'enclos pour que son aire soit 352 m².
   b) L'éleveur a 30 moutons et veut au moins 12 m² par mouton. Déterminer les valeurs de x possibles. On donne 2.236 < √5 < 2.237. Donner l'arrondi à 10⁻² des bornes obtenues.
4. On note d la longueur d'une diagonale de l'enclos, en mètres.
   a) Montrer que d² = 5x² − 240x + 3600.
   b) Déterminer x pour que la diagonale mesure 30 m.
   c) Montrer que d² = 5(x − 24)² + 720. En déduire la plus petite longueur possible de la diagonale et les dimensions de l'enclos correspondant.

### Corrigé — Partie A

**1. a)** Pour L mètres, le prix est 7.5L dinars chez le fournisseur 1 et 6L + 54 dinars chez le fournisseur 2.

- L = 30 : 7.5 × 30 = 225 D chez le fournisseur 1 ; 6 × 30 + 54 = 234 D chez le fournisseur 2.
- L = 60 : 7.5 × 60 = 450 D chez le fournisseur 1 ; 6 × 60 + 54 = 414 D chez le fournisseur 2.

**b)** Le fournisseur 2 est moins cher que le fournisseur 1 ⟺ 6L + 54 < 7.5L ⟺ 54 < 1.5L ⟺ L > 36.
Les deux prix sont égaux ⟺ 6L + 54 = 7.5L ⟺ L = 36 (270 D chez chacun).

- Si L < 36, le fournisseur 1 est le plus avantageux.
- Si L = 36, les deux prix sont égaux.
- Si L > 36, le fournisseur 2 est le plus avantageux. Pour 60 m, l'éleveur choisit le fournisseur 2 et paie 414 D.

### Corrigé — Partie B

**1. a)** Le grillage forme les deux côtés perpendiculaires au mur et le côté parallèle : x + x + (côté parallèle) = 60, donc le côté parallèle mesure 60 − 2x.
Les longueurs sont strictement positives : x > 0 et 60 − 2x > 0 ⟺ x < 30. Donc x ∈ ]0, 30[.

**b)** A(x) = x(60 − 2x) = −2x² + 60x.

**2. a)** A(x) = −2(x² − 30x) = −2[(x − 15)² − 225], soit

    A(x) = −2[(x − 15)² − 225] = −2(x − 15)² + 450

**b)** Pour tout x, −2(x − 15)² ≤ 0, donc A(x) ≤ 450, avec égalité si et seulement si x = 15, qui appartient à ]0, 30[.
L'aire maximale est 450 m² : les côtés perpendiculaires au mur mesurent 15 m et le côté parallèle 60 − 30 = 30 m.

**3. a)** A(x) = 352 ⟺ −2x² + 60x − 352 = 0 ⟺ x² − 30x + 176 = 0.
Ici b' = −15 et Δ' = (−15)² − 176 = 49, donc x = 15 − 7 = 8 ou x = 15 + 7 = 22. Les deux valeurs sont dans ]0, 30[.

- x = 8 : l'enclos mesure 8 m sur 60 − 16 = 44 m (8 × 44 = 352).
- x = 22 : l'enclos mesure 22 m sur 60 − 44 = 16 m (22 × 16 = 352).

**b)** Il faut A(x) ≥ 30 × 12 = 360 ⟺ −2x² + 60x − 360 ≥ 0 ⟺ x² − 30x + 180 ≤ 0.
Δ' = 225 − 180 = 45 = 9 × 5, donc les racines sont 15 − 3√5 et 15 + 3√5.
Le trinôme x² − 30x + 180 (a = 1 > 0) est négatif ou nul entre ses racines : x ∈ [15 − 3√5, 15 + 3√5].
Cet intervalle est contenu dans ]0, 30[, car 0 < 3√5 < 9 < 15 (puisque √5 < 3).
Avec 2.236 < √5 < 2.237 : 8.289 < 15 − 3√5 < 8.292 et 21.708 < 15 + 3√5 < 21.711, donc les arrondis à 10⁻² des bornes sont 8.29 et 21.71. Attention : ces arrondis ne conviennent pas eux-mêmes (A(8.29) = A(21.71) ≈ 359.95 < 360) ; au centimètre près, il faut 8.30 ≤ x ≤ 21.70.

**4. a)** Le théorème de Pythagore dans un des triangles rectangles délimités par la diagonale donne

    d² = x² + (60 − 2x)² = x² + 3600 − 240x + 4x² = 5x² − 240x + 3600

**b)** d > 0, donc d = 30 ⟺ d² = 900 ⟺ 5x² − 240x + 2700 = 0 ⟺ x² − 48x + 540 = 0.
Δ' = (−24)² − 540 = 576 − 540 = 36, donc x = 24 − 6 = 18 ou x = 24 + 6 = 30.
x = 30 n'appartient pas à ]0, 30[ (le côté parallèle au mur serait nul). Donc x = 18 : l'enclos mesure 18 m sur 24 m (18² + 24² = 324 + 576 = 900 = 30²).

**c)** 5(x − 24)² + 720 = 5(x² − 48x + 576) + 720 = 5x² − 240x + 2880 + 720 = 5x² − 240x + 3600 = d².
Comme 5(x − 24)² ≥ 0, d² ≥ 720 pour tout x, avec égalité si et seulement si x = 24, qui appartient à ]0, 30[.
d est positif et la racine carrée conserve l'ordre sur [0, +∞[, donc d ≥ √720 = √(144 × 5) = 12√5.
La plus petite diagonale mesure 12√5 ≈ 26.83 m ; elle est obtenue pour x = 24, c'est-à-dire un enclos de 24 m sur 60 − 48 = 12 m.
