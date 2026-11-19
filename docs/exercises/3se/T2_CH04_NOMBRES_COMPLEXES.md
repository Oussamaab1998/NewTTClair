# 3ème Sc. exp. — Tome 2, Chapitre 4 : Nombres complexes

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20–21 : partie réelle et partie imaginaire, affixe d'un point, d'un vecteur, conjugué, somme, produit et quotient, module et argument d'un nombre complexe, d'un produit, d'un quotient ; écriture trigonométrique ; repérer un point du plan orienté par son affixe, ses coordonnées cartésiennes ou polaires.
- Manuel CNP (p. 70–87) : écriture algébrique, puissances de i, inverse, propriétés du conjugué, équation z² = α avec α réel non nul, MN = |z_N − z_M|, écriture trigonométrique, module et argument d'un produit et d'un quotient. Le manuel ne fait ni forme exponentielle, ni formule de Moivre, ni équation du second degré générale, ni racines n-ièmes : les corrigés n'en utilisent pas. Les angles des triangles ne sont pas obtenus par des arguments : l'angle droit vient de la réciproque de Pythagore.
- Outils autorisés : ce chapitre, les chapitres 1 à 3 du tome 2 (produit scalaire dans le plan, angles orientés, trigonométrie) et la géométrie analytique du plan des années précédentes.
- Notation : z̄ désigne le conjugué de z ; le plan complexe est muni d'un repère orthonormé direct (O, u, v) ; vec(AB) désigne le vecteur AB, et AB la distance de A à B (AB = |z_B − z_A|).
- Toutes les valeurs sont vérifiées par `check_t2_ch04.py` (calcul exact dans ℚ(√3) et ℚ(√3)[i], arguments et valeurs décimales en flottants avec tolérance).

---

## Exercice 1 — Forme algébrique, conjugué, module, argument

1. a) Écrire sous forme algébrique les nombres complexes

       z₁ = (2 − 3i)(1 + 2i)      z₂ = (3 + i) / (1 − 2i)      z₃ = i²⁰²⁶

   b) Donner le conjugué et le module de z₁ et de z₂.
2. Résoudre dans ℂ les équations suivantes :
   a) z² = −9 ;
   b) 2z − i·z̄ = 1 + 4i (on pourra poser z = x + iy, avec x et y réels).
3. On considère les nombres complexes

       a = 1 + i√3      b = 1 + i

   a) Déterminer le module et un argument de a et de b, puis écrire a et b sous forme trigonométrique.
   b) En déduire le module et un argument de ab et de a/b.
   c) Écrire ab sous forme algébrique. En déduire les valeurs exactes de cos(7π/12) et de sin(7π/12).
   d) Déterminer le module et un argument de a², puis de a³ = a² × a. En déduire que a³ est un réel que l'on précisera, puis vérifier ce résultat par le calcul algébrique.
4. Le plan complexe est muni d'un repère orthonormé direct (O, u, v). On note A le point d'affixe a.
   a) Déterminer et représenter l'ensemble Δ des points M d'affixe z non nulle tels que arg(z) ≡ π/3 [2π].
   b) Déterminer l'ensemble Γ des points M d'affixe z tels que |z| = 2.
   c) Montrer que Δ et Γ ont un seul point commun, que l'on précisera.

### Corrigé

**1. a)** z₁ = 2 + 4i − 3i − 6i² = 2 + i + 6 = 8 + i.

Pour z₂, on multiplie le numérateur et le dénominateur par 1 + 2i, conjugué du dénominateur :

    z₂ = (3 + i)(1 + 2i) / ((1 − 2i)(1 + 2i)) = (3 + 6i + i + 2i²) / (1 + 4) = (1 + 7i) / 5

z₂ = 1/5 + (7/5)i = 0.2 + 1.4i.

Pour z₃ : i⁴ = (i²)² = 1 et 2026 = 4 × 506 + 2, donc i²⁰²⁶ = (i⁴)⁵⁰⁶ × i² = 1 × (−1) = −1.

**b)** z̄₁ = 8 − i et |z₁| = √(8² + 1²) = √65.
z̄₂ = (1 − 7i)/5 = 0.2 − 1.4i et |z₂| = √(1² + 7²) / 5 = √50 / 5 = 5√2 / 5 = √2.
Contrôle avec le module d'un quotient : |z₂| = |3 + i| / |1 − 2i| = √10 / √5 = √2.

**2. a)** (3i)² = 9i² = −9, donc z² = −9 ⟺ z² − (3i)² = 0 ⟺ (z − 3i)(z + 3i) = 0 ⟺ z = 3i ou z = −3i.
S = {−3i ; 3i}. (C'est le théorème du cours : pour α < 0, les solutions de z² = α sont i√(−α) et −i√(−α).)

**b)** Posons z = x + iy avec x et y réels. Alors z̄ = x − iy et i·z̄ = ix − i²y = y + ix.

    2z − i·z̄ = 2x + 2iy − y − ix = (2x − y) + i(2y − x)

Deux nombres complexes sont égaux si et seulement si ils ont même partie réelle et même partie imaginaire :

    2z − i·z̄ = 1 + 4i  ⟺  2x − y = 1  et  −x + 2y = 4

La première équation donne y = 2x − 1. En remplaçant : −x + 4x − 2 = 4, soit 3x = 6, donc x = 2 et y = 3.
S = {2 + 3i}. Vérification : 2(2 + 3i) − i(2 − 3i) = 4 + 6i − (2i + 3) = 1 + 4i.

**3. a)** |a| = √(1 + 3) = 2, donc a = 2(1/2 + i√3/2). Le réel θ = π/3 vérifie cos θ = 1/2 et sin θ = √3/2, donc

    a = 2(cos(π/3) + i sin(π/3))      arg(a) ≡ π/3 [2π]

|b| = √(1 + 1) = √2, donc b = √2(√2/2 + i√2/2), et

    b = √2(cos(π/4) + i sin(π/4))      arg(b) ≡ π/4 [2π]

**b)** Module et argument d'un produit et d'un quotient :

- |ab| = |a| × |b| = 2√2 et arg(ab) ≡ arg(a) + arg(b) ≡ π/3 + π/4 ≡ 7π/12 [2π].
- |a/b| = |a| / |b| = 2/√2 = √2 et arg(a/b) ≡ arg(a) − arg(b) ≡ π/3 − π/4 ≡ π/12 [2π].

**c)** ab = (1 + i√3)(1 + i) = 1 + i + i√3 + i²√3 = (1 − √3) + i(1 + √3).
D'après le b), ab = 2√2(cos(7π/12) + i sin(7π/12)) = 2√2 cos(7π/12) + i·2√2 sin(7π/12).
En identifiant les parties réelles et les parties imaginaires, puis en multipliant numérateur et dénominateur par √2 :

    cos(7π/12) = (1 − √3) / (2√2) = (√2 − √6) / 4
    sin(7π/12) = (1 + √3) / (2√2) = (√2 + √6) / 4

Contrôle : 7π/12 est compris entre π/2 et π, donc son cosinus est négatif et son sinus positif (valeurs approchées : −0.2588 et 0.9659).

**d)** a² = a × a : |a²| = |a|² = 4 et arg(a²) ≡ arg(a) + arg(a) ≡ 2π/3 [2π].
a³ = a² × a : |a³| = 4 × 2 = 8 et arg(a³) ≡ 2π/3 + π/3 ≡ π [2π].
Donc a³ = 8(cos π + i sin π) = 8(−1 + 0i) = −8 : a³ est le réel −8.
Calcul algébrique : a² = 1 + 2i√3 + (i√3)² = 1 + 2i√3 − 3 = −2 + 2i√3, puis

    a³ = (−2 + 2i√3)(1 + i√3) = −2 − 2i√3 + 2i√3 + 2i²·3 = −2 − 6 = −8

**4. a)** Pour M ≠ O, arg(z) est une mesure de l'angle orienté (u, vec(OM)). Ainsi M ∈ Δ ⟺ M ≠ O et (u, vec(OM)) ≡ π/3 [2π].
Comme arg(a) ≡ π/3 [2π], A appartient à Δ. Plus précisément, M ∈ Δ ⟺ z = r(cos(π/3) + i sin(π/3)) avec r = |z| > 0 ⟺ z = (r/2)·a avec r > 0 ⟺ vec(OM) = (r/2)·vec(OA) avec r/2 > 0.
Δ est la demi-droite [OA) privée du point O, où A(1, √3) (A ≈ (1, 1.73)). On la trace à partir de O en passant par A, le point O étant exclu.

**b)** |z| = OM, donc M ∈ Γ ⟺ OM = 2 : Γ est le cercle de centre O et de rayon 2.

**c)** M ∈ Δ ∩ Γ ⟺ z = r(cos(π/3) + i sin(π/3)) avec r > 0 et r = |z| = 2 ⟺ z = 2(cos(π/3) + i sin(π/3)) = a.
Δ ∩ Γ = {A} : le seul point commun est A, d'affixe 1 + i√3.

---

## Exercice 2 — Un carré dans le plan complexe, ensembles de points

Le plan complexe est muni d'un repère orthonormé direct (O, u, v). On considère les points A, B et C d'affixes respectives

    z_A = 1 + i      z_B = 3 + 2i      z_C = 3i

1. a) Placer les points A, B et C.
   b) Déterminer les affixes de vec(AB) et de vec(AC), puis vérifier que z_C − z_A = i(z_B − z_A).
2. a) En déduire que AB = AC.
   b) Calculer BC. Montrer que le triangle ABC est rectangle et isocèle en A.
3. a) Déterminer l'affixe z_D du point D tel que ABDC soit un parallélogramme.
   b) Montrer que ABDC est un carré.
   c) Déterminer l'affixe z_Ω du centre Ω de ce carré.
4. Soit E l'ensemble des points M d'affixe z tels que

       |z − 3 − 2i| = |z − 3i|

   a) Vérifier que A et D appartiennent à E.
   b) Déterminer la nature de E. En déduire que E est la droite (AD).
   c) On pose z = x + iy, avec x et y réels. Montrer que M ∈ E ⟺ y = 3x − 2.
5. Soit F l'ensemble des points M d'affixe z tels que

       |2z − 3 − 5i| = √10

   a) Montrer que F est le cercle de centre Ω et de rayon √10/2.
   b) Montrer que F passe par les points A, B, C et D.
   c) F coupe l'axe (O, v) en C et en un second point K. Déterminer l'affixe de K.

### Corrigé

**1. a)** Dans le repère (O, u, v) : A(1, 1), B(3, 2) et C(0, 3). Le point C est sur l'axe (O, v).

**b)** vec(AB) a pour affixe z_B − z_A = 2 + i ; vec(AC) a pour affixe z_C − z_A = −1 + 2i.
i(z_B − z_A) = i(2 + i) = 2i + i² = −1 + 2i = z_C − z_A.

**2. a)** AC = |z_C − z_A| = |i(z_B − z_A)| = |i| × |z_B − z_A| = AB, car |i| = 1.
Numériquement : AB = |2 + i| = √5 = AC.

**b)** BC = |z_C − z_B| = |−3 + i| = √(9 + 1) = √10.
AB² + AC² = 5 + 5 = 10 = BC² : d'après la réciproque du théorème de Pythagore, ABC est rectangle en A. Comme de plus AB = AC, le triangle ABC est rectangle et isocèle en A.
(Autre justification : avec vec(AB)(2, 1) et vec(AC)(−1, 2), on a vec(AB)·vec(AC) = 2 × (−1) + 1 × 2 = 0.)

**3. a)** ABDC est un parallélogramme ⟺ vec(AB) = vec(CD) ⟺ z_B − z_A = z_D − z_C.
Donc z_D = z_B − z_A + z_C = 2 + i + 3i = 2 + 4i, soit D(2, 4).

**b)** ABDC est un parallélogramme qui a un angle droit en A (question 2. b) : c'est un rectangle. Ses côtés consécutifs [AB] et [AC] ont la même longueur : c'est un carré.

**c)** Ω est le milieu de la diagonale [AD] : z_Ω = (z_A + z_D)/2 = (3 + 5i)/2 = 1.5 + 2.5i.
Contrôle avec l'autre diagonale : (z_B + z_C)/2 = (3 + 2i + 3i)/2 = (3 + 5i)/2.

**4. a)**

- |z_A − 3 − 2i| = |−2 − i| = √5 et |z_A − 3i| = |1 − 2i| = √5 : A ∈ E.
- |z_D − 3 − 2i| = |−1 + 2i| = √5 et |z_D − 3i| = |2 + i| = √5 : D ∈ E.

**b)** |z − 3 − 2i| = |z − z_B| = MB et |z − 3i| = |z − z_C| = MC. Donc M ∈ E ⟺ MB = MC : E est la médiatrice du segment [BC].
C'est une droite, et elle contient les deux points distincts A et D : E = (AD). (C'est la diagonale du carré qui coupe [BC] perpendiculairement en son milieu.)

**c)** Deux réels positifs sont égaux si et seulement si leurs carrés sont égaux, donc :

    M ∈ E ⟺ |z − 3 − 2i|² = |z − 3i|²
          ⟺ (x − 3)² + (y − 2)² = x² + (y − 3)²
          ⟺ −6x + 9 − 4y + 4 = −6y + 9
          ⟺ −6x + 2y + 4 = 0
          ⟺ y = 3x − 2

Contrôle : A(1, 1) vérifie 1 = 3 × 1 − 2 et D(2, 4) vérifie 4 = 3 × 2 − 2.

**5. a)** 2z − 3 − 5i = 2(z − (3 + 5i)/2) = 2(z − z_Ω), donc |2z − 3 − 5i| = 2|z − z_Ω| = 2ΩM.
M ∈ F ⟺ 2ΩM = √10 ⟺ ΩM = √10/2 : F est le cercle de centre Ω et de rayon √10/2.

**b)** On calcule 2z − 3 − 5i pour chaque point :

- A : 2 + 2i − 3 − 5i = −1 − 3i, de module √10 ;
- B : 6 + 4i − 3 − 5i = 3 − i, de module √10 ;
- C : 6i − 3 − 5i = −3 + i, de module √10 ;
- D : 4 + 8i − 3 − 5i = 1 + 3i, de module √10.

Les quatre points appartiennent à F : F est le cercle circonscrit au carré ABDC (ce que l'on savait aussi car le centre d'un carré est à égale distance des quatre sommets).

**c)** Un point de l'axe (O, v) a une affixe de la forme z = iy, avec y réel. Alors 2iy − 3 − 5i = −3 + i(2y − 5), et

    M ∈ F ⟺ 9 + (2y − 5)² = 10 ⟺ (2y − 5)² = 1 ⟺ 2y − 5 = 1 ou 2y − 5 = −1 ⟺ y = 3 ou y = 2

La valeur y = 3 donne le point C. Le second point est K(0, 2), d'affixe z_K = 2i.
