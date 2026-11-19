# 2ème Sciences — Tome 1, Chapitre 3 : Notion de polynômes

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (2ème Sciences et Technologie de l'informatique), p. 20, activités algébriques : notion de polynômes. Aptitudes : reconnaître un zéro d'un polynôme, factoriser un polynôme connaissant un ou plusieurs de ses zéros, déterminer le signe d'une expression algébrique, résoudre des inéquations se ramenant au second degré, résoudre des problèmes d'optimisation, modéliser des situations réelles.
- Manuel CNP (tome 1, p. 37–54) : notion de fonction (ensemble de définition, image, antécédent), fonction polynôme et coefficients, polynôme nul, égalité de deux polynômes (mêmes coefficients), degré (le degré d'un produit est la somme des degrés), racine ou zéro d'un polynôme, factorisation par (x − α) quand α est une racine (méthode d'identification ; la division est présentée en « Math et culture »), un polynôme de degré n admet au plus n racines (admis), fonctions rationnelles (ensemble de définition, simplification, signe).
- Outils autorisés : ce chapitre, les chapitres 1 et 2 (trinôme : discriminant, discriminant réduit, factorisation, signe) et les acquis de 1ère année (volume d'un pavé droit).
- Notation : d°(P) est le degré du polynôme P ; || dans un tableau de signe marque une valeur interdite.
- Toutes les valeurs sont vérifiées par `check_t1_ch03.py` (calcul exact en fractions et en nombres de la forme p + q√65).

---

## Exercice 1 — Racine, factorisation, signe, fonction rationnelle

Soit a un réel et P le polynôme défini sur ℝ par

    P(x) = 2x³ + ax² − 11x + 6

1. Déterminer a pour que 3 soit une racine de P.

Dans la suite, a = −3, donc P(x) = 2x³ − 3x² − 11x + 6.

2. a) Déterminer trois réels m, n et p tels que, pour tout réel x, P(x) = (x − 3)(mx² + nx + p).
   b) Écrire P(x) comme un produit de trois binômes du premier degré, puis résoudre l'équation P(x) = 0.
3. Dresser le tableau de signe de P(x). En déduire les solutions de l'inéquation P(x) > 0.
4. Soit Q le polynôme défini par Q(x) = (x² + 1)P(x) − 2x⁵.
   a) Sans développer complètement, déterminer le degré de Q et le coefficient de son terme de plus haut degré.
   b) Calculer Q(3). Le réel 3 est-il une racine de Q ?
5. Soit f la fonction définie par f(x) = P(x) / (x² − 9).
   a) Déterminer l'ensemble de définition D de f.
   b) Montrer que pour tout x de D, f(x) = (x + 2)(2x − 1) / (x + 3).
   c) Résoudre l'inéquation f(x) ≤ 0.
   d) Déterminer les antécédents de 0 par f.

### Corrigé

**1.** P(3) = 2 × 27 + 9a − 33 + 6 = 27 + 9a.
3 est une racine de P ⟺ P(3) = 0 ⟺ 27 + 9a = 0 ⟺ a = −3.

**2. a)** Pour tout réel x : (x − 3)(mx² + nx + p) = mx³ + (n − 3m)x² + (p − 3n)x − 3p.
Deux polynômes sont égaux si et seulement si leurs coefficients de même degré sont égaux :

    m = 2 ;   n − 3m = −3 ;   p − 3n = −11 ;   −3p = 6

On obtient m = 2, n = 3, p = −2 (et −3p = 6 est bien vérifié). Donc P(x) = (x − 3)(2x² + 3x − 2).

**b)** Pour 2x² + 3x − 2 : Δ = 9 + 16 = 25, donc les racines sont (−3 − 5)/4 = −2 et (−3 + 5)/4 = 1/2.
2x² + 3x − 2 = 2(x + 2)(x − 1/2) = (x + 2)(2x − 1), d'où

    P(x) = (x − 3)(x + 2)(2x − 1)

Un produit est nul si et seulement si l'un des facteurs est nul : S = {−2 ; 1/2 ; 3}. (P est de degré 3, il n'a pas d'autre racine.)

**3.**

    x      |   −∞            −2           1/2            3             +∞
    x + 2  |          −      0      +             +             +
    2x − 1 |          −             −      0      +             +
    x − 3  |          −             −             −      0      +
    P(x)   |          −      0      +      0      −      0      +

P(x) > 0 ⟺ x ∈ ]−2, 1/2[ ∪ ]3, +∞[.

**4. a)** (x² + 1)P(x) est le produit d'un polynôme de degré 2 et d'un polynôme de degré 3 : il est de degré 5 et son terme de plus haut degré est x² × 2x³ = 2x⁵. En retranchant 2x⁵, ce terme disparaît : Q n'est pas de degré 5.
Le terme en x⁴ de (x² + 1)P(x) vient seulement de x² × (−3x²) = −3x⁴ (car P n'a pas de terme en x⁴). Donc d°(Q) = 4 et le coefficient du terme de plus haut degré est −3.
(Développement complet, pour contrôle : Q(x) = −3x⁴ − 9x³ + 3x² − 11x + 6.)

**b)** Q(3) = (9 + 1) × P(3) − 2 × 3⁵ = 10 × 0 − 486 = −486.
Q(3) ≠ 0 : 3 n'est pas une racine de Q.

**5. a)** x² − 9 = (x − 3)(x + 3) = 0 ⟺ x = 3 ou x = −3. Donc D = ℝ \ {−3 ; 3}.

**b)** Pour x ∈ D, x − 3 ≠ 0, donc

    f(x) = (x − 3)(x + 2)(2x − 1) / ((x − 3)(x + 3)) = (x + 2)(2x − 1) / (x + 3)

**c)** On étudie le signe sur D (les valeurs −3 et 3 sont interdites) :

    x      |   −∞            −3            −2           1/2            3             +∞
    x + 2  |          −             −      0      +             +             +
    2x − 1 |          −             −             −      0      +             +
    x + 3  |          −      0      +             +             +             +
    f(x)   |          −      ||     +      0      −      0      +      ||     +

f(x) ≤ 0 ⟺ x ∈ ]−∞, −3[ ∪ [−2, 1/2].

**d)** f(x) = 0 ⟺ x ∈ D et (x + 2)(2x − 1) = 0 ⟺ x = −2 ou x = 1/2.
Les antécédents de 0 par f sont −2 et 1/2. Attention : 3 est une racine de P, mais 3 n'appartient pas à D, donc 3 n'a pas d'image par f.

---

## Exercice 2 — Un bac en tôle le plus économique

Un artisan fabrique des bacs sans couvercle en tôle. Chaque bac a la forme d'un pavé droit à base carrée : le côté de la base mesure x dm et la hauteur h dm (x > 0, h > 0). Chaque bac doit contenir 32 litres, c'est-à-dire avoir un volume de 32 dm³. On note S(x) l'aire de tôle utilisée, en dm² : le fond et les quatre faces latérales (on néglige les soudures).

1. a) Exprimer h en fonction de x.
   b) Montrer que S(x) = x² + 128/x.
   c) Calculer S(2), S(4) et S(8), ainsi que les hauteurs correspondantes.
2. Soit P le polynôme défini par P(x) = x³ − 48x + 128.
   a) Vérifier que 4 est une racine de P.
   b) Déterminer trois réels m, n et p tels que, pour tout réel x, P(x) = (x − 4)(mx² + nx + p).
   c) En déduire que P(x) = (x − 4)²(x + 8) pour tout réel x.
3. a) Montrer que pour tout réel x > 0, S(x) − 48 = P(x) / x.
   b) En déduire que S(x) ≥ 48 pour tout x > 0. Quelles dimensions l'artisan doit-il choisir pour utiliser le moins de tôle possible ?
4. L'artisan ne veut pas utiliser plus de 68 dm² de tôle par bac. On cherche les valeurs de x pour lesquelles S(x) ≤ 68.
   a) Montrer que, pour x > 0 : S(x) ≤ 68 ⟺ x³ − 68x + 128 ≤ 0.
   b) Soit T(x) = x³ − 68x + 128. Vérifier que 2 est une racine de T, puis déterminer deux réels b et c tels que, pour tout réel x, T(x) = (x − 2)(x² + bx + c).
   c) Résoudre l'inéquation T(x) ≤ 0 dans ]0, +∞[. Conclure, et donner un encadrement d'amplitude 10⁻² de la plus grande valeur de x possible.

### Corrigé

**1. a)** Le volume du pavé est x² × h = 32, donc h = 32 / x².

**b)** Le fond est un carré d'aire x². Chaque face latérale est un rectangle de côtés x et h, d'aire xh = 32/x. Donc

    S(x) = x² + 4 × 32/x = x² + 128/x

**c)** S(2) = 4 + 64 = 68, avec h = 32/4 = 8 ;
S(4) = 16 + 32 = 48, avec h = 32/16 = 2 ;
S(8) = 64 + 16 = 80, avec h = 32/64 = 0.5.

**2. a)** P(4) = 64 − 192 + 128 = 0 : 4 est une racine de P.

**b)** (x − 4)(mx² + nx + p) = mx³ + (n − 4m)x² + (p − 4n)x − 4p. Par identification avec x³ + 0x² − 48x + 128 :

    m = 1 ;   n − 4m = 0 ;   p − 4n = −48 ;   −4p = 128

On obtient m = 1, n = 4, p = −32 (et −4p = 128 est bien vérifié). Donc P(x) = (x − 4)(x² + 4x − 32).

**c)** Pour x² + 4x − 32 : b' = 2 et Δ' = 4 + 32 = 36, donc les racines sont −2 − 6 = −8 et −2 + 6 = 4.
x² + 4x − 32 = (x − 4)(x + 8), d'où P(x) = (x − 4)²(x + 8).

**3. a)** Pour x > 0 : S(x) − 48 = x² + 128/x − 48 = (x³ − 48x + 128)/x = P(x)/x.

**b)** Pour x > 0 : (x − 4)² ≥ 0, x + 8 > 0 et x > 0, donc S(x) − 48 = (x − 4)²(x + 8)/x ≥ 0, soit S(x) ≥ 48.
L'égalité a lieu si et seulement si (x − 4)² = 0, c'est-à-dire x = 4.
L'aire minimale de tôle est 48 dm² : base carrée de côté 4 dm et hauteur h = 32/16 = 2 dm. (Le côté de la base est le double de la hauteur.)

**4. a)** Pour x > 0 : S(x) ≤ 68 ⟺ x² + 128/x − 68 ≤ 0 ⟺ (x³ − 68x + 128)/x ≤ 0 ⟺ x³ − 68x + 128 ≤ 0, car x > 0.

**b)** T(2) = 8 − 136 + 128 = 0 : 2 est une racine de T.
(x − 2)(x² + bx + c) = x³ + (b − 2)x² + (c − 2b)x − 2c. Par identification : b − 2 = 0, c − 2b = −68 et −2c = 128.
Donc b = 2 et c = −64 (et −2c = 128 est bien vérifié) : T(x) = (x − 2)(x² + 2x − 64).

**c)** Pour x² + 2x − 64 : b' = 1 et Δ' = 1 + 64 = 65, donc les racines sont −1 − √65 et −1 + √65 = √65 − 1.
On a −1 − √65 < 0, et √65 > √9 = 3, donc √65 − 1 > 2. Sur ]0, +∞[, le trinôme est négatif entre 0 et √65 − 1, et positif après √65 − 1 (a = 1 > 0, signe de −a entre les racines).

    x            |    0                 2              √65 − 1              +∞
    x − 2        |             −        0        +                 +
    x² + 2x − 64 |             −                 −        0        +
    T(x)         |             +        0        −        0        +

Dans ]0, +∞[ : T(x) ≤ 0 ⟺ x ∈ [2, √65 − 1]. D'après a), S(x) ≤ 68 ⟺ 2 ≤ x ≤ √65 − 1.
8.06² = 64.9636 < 65 < 65.1249 = 8.07², donc 8.06 < √65 < 8.07 et 7.06 < √65 − 1 < 7.07.
Conclusion : le côté de la base doit être compris entre 2 dm et √65 − 1 ≈ 7.06 dm.
