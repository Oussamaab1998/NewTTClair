# 2ème Sciences — Tome 1, Chapitre 5 : Calcul vectoriel

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 22 (activités géométriques) : calcul vectoriel ; calculer et simplifier une expression vectorielle ; résoudre des problèmes d'alignement ou de concours avec les règles du calcul vectoriel. p. 24 (activités dans un repère) : condition de colinéarité de deux vecteurs, norme d'un vecteur, condition d'orthogonalité de deux vecteurs.
- Manuel CNP (tome 1, p. 67–92) : somme et produit par un réel (règles), vecteurs colinéaires (l'un est le produit de l'autre par un réel), base de l'ensemble des vecteurs du plan et composantes, déterminant det(u, v) = xy' − x'y et condition analytique de colinéarité det(u, v) = 0, repère cartésien et coordonnées, base et repère orthonormés, norme ‖u‖ = √(x² + y²) et distance (base orthonormée), condition d'orthogonalité xx' + yy' = 0 (base orthonormée), vecteurs et configurations : A, B, C alignés ⟺ vec(AB) et vec(AC) colinéaires, (AB) // (CD) ⟺ vec(AB) et vec(CD) colinéaires, M ∈ (AB) ⟺ vec(AM) = x vec(AB), milieu, centre de gravité (vec(GA) + vec(GB) + vec(GC) = 0), forme vectorielle du théorème de Thalès.
- Outils autorisés : ce chapitre et les acquis de 1ère (milieu, parallélogramme, centre de gravité aux deux tiers de chaque médiane, Pythagore). Pas de produit scalaire ni d'équation cartésienne de droite (tome 2, chapitre 6) : l'appartenance d'un point à une droite se traduit par la colinéarité de deux vecteurs.
- Notation : vec(AB) est le vecteur AB et AB la distance ; u(x, y) ou vec(AB)(x, y) donne les composantes d'un vecteur ; 0 désigne aussi le vecteur nul ; det(u, v) est le déterminant de u et v dans la base du repère.
- Toutes les valeurs sont vérifiées par `check_t1_ch05.py` (calcul exact en fractions ; l'exercice 1 est contrôlé sur 300 triangles tirés au hasard).

---

## Exercice 1 — Règles du calcul vectoriel, parallélisme, alignement

Soit ABC un triangle. On note I le milieu de [BC] et G le centre de gravité du triangle ABC.

1. Simplifier les vecteurs suivants, où M est un point quelconque du plan :

       u = vec(MA) − vec(MB) + vec(BC) − vec(AC)
       v = 3 vec(AB) − 2 vec(AC) + 2 vec(BC)

2. On considère les points E et F tels que

       2 vec(EA) + vec(EB) = 0     et     vec(CF) = 2 vec(FA)

   a) Montrer que vec(AE) = (1/3) vec(AB) et que vec(AF) = (1/3) vec(AC). Construire les points E et F.
   b) Exprimer vec(EF) en fonction de vec(BC). Que peut-on en déduire pour les droites (EF) et (BC) ?
3. a) En utilisant l'égalité vec(GA) + vec(GB) + vec(GC) = 0, montrer que vec(AG) = (1/3)(vec(AB) + vec(AC)).
   b) Montrer que le quadrilatère AEGF est un parallélogramme.
   c) Soit J le milieu de [EF]. Montrer que J est le milieu de [AG], puis que vec(AJ) = (1/3) vec(AI).
4. Soit P le symétrique de A par rapport à B et Q le point tel que vec(AQ) = (2/3) vec(AC).
   a) Exprimer vec(PI) et vec(PQ) en fonction de vec(AB) et vec(AC).
   b) En déduire que les points P, I et Q sont alignés.
5. On munit le plan du repère cartésien (A, vec(AB), vec(AC)).
   a) Donner les coordonnées des points B, C, I, G, E, F, P et Q.
   b) Retrouver, à l'aide de déterminants, que les droites (EF) et (BC) sont parallèles et que les points P, I et Q sont alignés.

### Corrigé

**1.** Par la relation de Chasles : vec(MA) − vec(MB) = vec(MA) + vec(BM) = vec(BM) + vec(MA) = vec(BA), et vec(BC) − vec(AC) = vec(BC) + vec(CA) = vec(BA). Donc

    u = 2 vec(BA)

u ne dépend pas du point M.
Comme vec(BC) = vec(BA) + vec(AC) = −vec(AB) + vec(AC) :

    v = 3 vec(AB) − 2 vec(AC) − 2 vec(AB) + 2 vec(AC) = vec(AB)

**2. a)** 2 vec(EA) + vec(EB) = 0 ⟺ 2 vec(EA) + vec(EA) + vec(AB) = 0 ⟺ 3 vec(EA) = −vec(AB) ⟺ vec(AE) = (1/3) vec(AB).
vec(CF) = 2 vec(FA) ⟺ vec(CA) + vec(AF) = −2 vec(AF) ⟺ 3 vec(AF) = −vec(CA) = vec(AC) ⟺ vec(AF) = (1/3) vec(AC).
Construction : on partage [AB] en trois segments de même longueur ; E est le point de partage le plus proche de A (AE = AB/3). De même, F est le point de [AC] tel que AF = AC/3.

**b)** vec(EF) = vec(EA) + vec(AF) = −(1/3) vec(AB) + (1/3) vec(AC) = (1/3)(vec(BA) + vec(AC)) = (1/3) vec(BC).
Les vecteurs vec(EF) et vec(BC) sont colinéaires, donc (EF) // (BC). Ces droites sont distinctes, car E appartient à [AB] et E ≠ B, donc E n'est pas sur (BC). De plus EF = BC/3.
(C'est la forme vectorielle du théorème de Thalès dans le triangle ABC.)

**3. a)** vec(GB) = vec(GA) + vec(AB) et vec(GC) = vec(GA) + vec(AC). L'égalité vec(GA) + vec(GB) + vec(GC) = 0 devient

    3 vec(GA) + vec(AB) + vec(AC) = 0,   soit   vec(AG) = (1/3)(vec(AB) + vec(AC))

**b)** vec(AE) + vec(AF) = (1/3) vec(AB) + (1/3) vec(AC) = vec(AG).
Les vecteurs vec(AE) et vec(AF) ne sont pas colinéaires (E est sur (AB), F sur (AC), tous deux distincts de A). Par la règle du parallélogramme, AEGF est un parallélogramme. On a donc vec(AE) = vec(FG) et vec(AF) = vec(EG).

**c)** Les diagonales du parallélogramme AEGF sont [AG] et [EF] ; elles ont le même milieu. Donc J, milieu de [EF], est aussi le milieu de [AG] : vec(AJ) = (1/2) vec(AG).
I est le milieu de [BC], donc vec(AB) + vec(AC) = 2 vec(AI) et, d'après le a), vec(AG) = (2/3) vec(AI). Ainsi

    vec(AJ) = (1/2) × (2/3) vec(AI) = (1/3) vec(AI)

Les points A, J, G et I sont alignés sur la médiane issue de A.

**4. a)** B est le milieu de [AP], donc vec(AP) = 2 vec(AB) et vec(PA) = −2 vec(AB).

    vec(PI) = vec(PA) + vec(AI) = −2 vec(AB) + (1/2) vec(AB) + (1/2) vec(AC) = −(3/2) vec(AB) + (1/2) vec(AC)
    vec(PQ) = vec(PA) + vec(AQ) = −2 vec(AB) + (2/3) vec(AC)

**b)** (4/3) vec(PI) = (4/3) × (−3/2) vec(AB) + (4/3) × (1/2) vec(AC) = −2 vec(AB) + (2/3) vec(AC) = vec(PQ).
Les vecteurs vec(PI) et vec(PQ) sont colinéaires : les points P, I et Q sont alignés (I est entre P et Q, avec PI = (3/4) PQ).

**5. a)** Dans le repère (A, vec(AB), vec(AC)), un point M a pour coordonnées (x, y) lorsque vec(AM) = x vec(AB) + y vec(AC). D'après les questions précédentes :

    B(1, 0)     C(0, 1)     I(1/2, 1/2)     G(1/3, 1/3)
    E(1/3, 0)   F(0, 1/3)   P(2, 0)         Q(0, 2/3)

**b)** vec(EF)(−1/3, 1/3) et vec(BC)(−1, 1) :

    det(vec(EF), vec(BC)) = (−1/3) × 1 − (−1) × (1/3) = −1/3 + 1/3 = 0

Les vecteurs sont colinéaires : (EF) // (BC).
vec(PI)(−3/2, 1/2) et vec(PQ)(−2, 2/3) :

    det(vec(PI), vec(PQ)) = (−3/2) × (2/3) − (−2) × (1/2) = −1 + 1 = 0

Les vecteurs sont colinéaires : P, I et Q sont alignés.

---

## Exercice 2 — Dans un repère orthonormé : carré, orthogonalité, point d'intersection

Le plan est muni d'un repère orthonormé (O, i, j). On considère les points

    A(−1, 2),   B(3, 4),   C(5, 0)

1. a) Calculer les composantes des vecteurs vec(AB), vec(BC) et vec(AC). Montrer que les points A, B et C ne sont pas alignés.
   b) Calculer les distances AB, BC et AC. Montrer que le triangle ABC est rectangle et isocèle en B.
2. a) Déterminer les coordonnées du point D tel que ABCD soit un parallélogramme.
   b) Montrer que ABCD est un carré.
   c) Déterminer les coordonnées du centre Ω de ce carré. Montrer que les points A, B, C et D appartiennent à un même cercle dont on précisera le centre et le rayon.
3. On note I le milieu de [AB] et J le milieu de [BC].
   a) Calculer les coordonnées de I et de J.
   b) Montrer que les droites (AJ) et (DI) sont perpendiculaires et que AJ = DI.
4. a) Montrer que les droites (DI) et (AC) sont sécantes. On note K leur point d'intersection.
   b) Le point K appartient à la droite (AC) : il existe donc un réel t tel que vec(AK) = t vec(AC). Exprimer les coordonnées de K en fonction de t. Déterminer t en écrivant que les vecteurs vec(DK) et vec(DI) sont colinéaires, puis donner les coordonnées de K.
   c) Montrer que K est le centre de gravité du triangle ABD. Expliquer ce résultat à l'aide de deux médianes du triangle ABD.

### Corrigé

**1. a)** vec(AB)(3 − (−1), 4 − 2) = vec(AB)(4, 2), vec(BC)(5 − 3, 0 − 4) = vec(BC)(2, −4), vec(AC)(5 − (−1), 0 − 2) = vec(AC)(6, −2).

    det(vec(AB), vec(AC)) = 4 × (−2) − 6 × 2 = −8 − 12 = −20 ≠ 0

Les vecteurs vec(AB) et vec(AC) ne sont pas colinéaires : A, B et C ne sont pas alignés.

**b)** Le repère est orthonormé :

    AB = √(4² + 2²) = √20 = 2√5,   BC = √(2² + (−4)²) = √20 = 2√5,   AC = √(6² + (−2)²) = √40 = 2√10

De plus 4 × 2 + 2 × (−4) = 0 : les vecteurs vec(AB) et vec(BC) sont orthogonaux, donc (AB) ⟂ (BC).
Le triangle ABC est rectangle en B et AB = BC : il est rectangle et isocèle en B.
Contrôle (Pythagore) : AB² + BC² = 20 + 20 = 40 = AC².

**2. a)** ABCD est un parallélogramme ⟺ vec(AD) = vec(BC). Avec D(x, y) : vec(AD)(x + 1, y − 2) = (2, −4), donc x = 1 et y = −2. D(1, −2).

**b)** ABCD est un parallélogramme dont deux côtés consécutifs [AB] et [BC] sont perpendiculaires et de même longueur : c'est à la fois un rectangle et un losange, donc un carré.

**c)** Le centre Ω est le milieu de la diagonale [AC] : Ω((−1 + 5)/2, (2 + 0)/2) = Ω(2, 1). Contrôle : le milieu de [BD] est ((3 + 1)/2, (4 − 2)/2) = (2, 1).

    ΩA = √((−3)² + 1²) = √10,   ΩB = √(1² + 3²) = √10,   ΩC = √(3² + (−1)²) = √10,   ΩD = √((−1)² + (−3)²) = √10

Les quatre sommets sont à la distance √10 de Ω : ils appartiennent au cercle de centre Ω(2, 1) et de rayon √10 (la moitié de la diagonale AC = 2√10).

**3. a)** I((−1 + 3)/2, (2 + 4)/2) = I(1, 3) et J((3 + 5)/2, (4 + 0)/2) = J(4, 2).

**b)** vec(AJ)(4 − (−1), 2 − 2) = vec(AJ)(5, 0) et vec(DI)(1 − 1, 3 − (−2)) = vec(DI)(0, 5).
5 × 0 + 0 × 5 = 0 : les vecteurs vec(AJ) et vec(DI) sont orthogonaux, donc (AJ) ⟂ (DI).
AJ = √(5² + 0²) = 5 et DI = √(0² + 5²) = 5, donc AJ = DI.

**4. a)** vec(DI)(0, 5) et vec(AC)(6, −2) : det(vec(DI), vec(AC)) = 0 × (−2) − 6 × 5 = −30 ≠ 0. Les vecteurs ne sont pas colinéaires, donc les droites (DI) et (AC) ne sont pas parallèles : elles sont sécantes.

**b)** vec(AK) = t vec(AC) = (6t, −2t), donc K(−1 + 6t, 2 − 2t).
Alors vec(DK)(−1 + 6t − 1, 2 − 2t + 2) = vec(DK)(−2 + 6t, 4 − 2t), et

    det(vec(DK), vec(DI)) = (−2 + 6t) × 5 − 0 × (4 − 2t) = 5(6t − 2)

K ∈ (DI) ⟺ vec(DK) et vec(DI) colinéaires ⟺ 6t − 2 = 0 ⟺ t = 1/3.
Donc K(−1 + 2, 2 − 2/3) = K(1, 4/3).
Contrôle : D et I ont la même abscisse 1, et K aussi.

**c)** vec(KA)(−2, 2/3), vec(KB)(2, 8/3) et vec(KD)(0, −10/3). La somme a pour composantes (−2 + 2 + 0, 2/3 + 8/3 − 10/3) = (0, 0) :

    vec(KA) + vec(KB) + vec(KD) = 0

K est donc le centre de gravité du triangle ABD.
Explication : I est le milieu de [AB], donc (DI) est la médiane issue de D du triangle ABD. Les diagonales du parallélogramme ABCD se coupent en leur milieu Ω, donc Ω est le milieu de [BD] et la droite (AC) = (AΩ) est la médiane issue de A. Deux médianes se coupent au centre de gravité. On retrouve aussi vec(AK) = (1/3) vec(AC) = (2/3) vec(AΩ).
