# 3ème Sc. exp. — Tome 2, Chapitre 1 : Produit scalaire dans le plan

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20 : produit scalaire dans le plan ; l'exploiter pour calculer des grandeurs, déterminer des lieux géométriques et étudier des configurations. Les lignes de niveau ne font pas l'objet d'une étude spécifique : elles se traitent sur des exemples.
- Manuel CNP : définition u·v = OA × OB × cos(angle AOB) (angle géométrique), propriétés, formule d'Al-Kashi, produit scalaire et projection orthogonale, expression analytique xx' + yy' dans une base orthonormée, lignes de niveau (AM·AB = k, MA·MB = k, MA² − MB² = k), théorème de la médiane, hauteurs d'un triangle.
- Notation : vec(AB) est le vecteur AB et AB la distance ; AB·AC est le produit scalaire des vecteurs vec(AB) et vec(AC) ; × est le produit de deux nombres.
- Outils autorisés : ce chapitre et les acquis antérieurs (vecteurs, repères, équations de droites, cosinus d'un angle aigu, valeurs pour π/6, π/4, π/3). Pas d'angles orientés ni de trigonométrie des réels (chapitres 2 et 3).
- Toutes les valeurs sont vérifiées par `check_t2_ch01.py` (calcul exact : fractions et nombres de la forme a + b√3).

---

## Exercice 1 — Al-Kashi, projection orthogonale, médiane, lignes de niveau

ABC est un triangle tel que AB = 4, AC = 6 et l'angle géométrique BAC mesure π/3. On note I le milieu de [BC].

1. a) Calculer le produit scalaire AB·AC.
   b) En déduire la distance BC.
2. a) Calculer BA·BC et CA·CB.
   b) En déduire que les trois angles du triangle ABC sont aigus.
   c) Calculer le cosinus de l'angle ABC et celui de l'angle ACB. Donner une valeur approchée à 10⁻² près, en radians, de chacun de ces deux angles.
3. a) On note H le projeté orthogonal de C sur (AB). En utilisant AB·AC, calculer AH, puis préciser la position de H.
   b) Calculer CH, puis l'aire du triangle ABC.
   c) On note K le projeté orthogonal de A sur (BC). Calculer BK, puis AK.
4. a) Calculer AI.
   b) Calculer AI·BC. En déduire la distance KI.
5. a) Montrer que pour tout point M du plan :

       MB·MC = MI² − 7

   b) Déterminer l'ensemble Γ des points M du plan tels que MB·MC = 12. Vérifier que A appartient à Γ.
   c) Déterminer l'ensemble Δ des points M du plan tels que AM·AB = 12. Vérifier que C appartient à Δ.

### Corrigé

**1. a)** Par définition : AB·AC = AB × AC × cos(angle BAC) = 4 × 6 × 1/2 = 12.

**b)** vec(BC) = vec(AC) − vec(AB), donc

    BC² = AC² − 2 AB·AC + AB² = 36 − 24 + 16 = 28

BC = √28 = 2√7. (C'est la formule d'Al-Kashi.)

**2. a)** vec(AC) = vec(BC) − vec(BA), donc AC² = BC² − 2 BA·BC + BA², soit

    BA·BC = (BA² + BC² − AC²) / 2 = (16 + 28 − 36) / 2 = 4

De même, vec(AB) = vec(CB) − vec(CA) donne

    CA·CB = (CA² + CB² − AB²) / 2 = (36 + 28 − 16) / 2 = 24

**b)** Dans un triangle, l'angle en A est aigu si et seulement si AB·AC > 0 (son cosinus est alors positif). Ici AB·AC = 12 > 0, BA·BC = 4 > 0 et CA·CB = 24 > 0 : les trois angles sont aigus.

**c)**

- cos(angle ABC) = BA·BC / (BA × BC) = 4 / (4 × 2√7) = 1 / (2√7) = √7/14 ≈ 0.189, d'où angle ABC ≈ 1.38 rad.
- cos(angle ACB) = CA·CB / (CA × CB) = 24 / (6 × 2√7) = 2/√7 = 2√7/7 ≈ 0.756, d'où angle ACB ≈ 0.71 rad.

Contrôle : π/3 + 1.3807 + 0.7137 ≈ 3.1416 ≈ π.

**3. a)** H est le projeté orthogonal de C sur (AB), donc AB·AC = AB·AH.
Comme AB·AC = 12 > 0, les vecteurs vec(AH) et vec(AB) ont le même sens et AB·AH = AB × AH = 4 AH.
Donc 4 AH = 12, soit AH = 3. Comme 0 < 3 < 4, H est le point du segment [AB] tel que AH = 3 (et HB = 1).

**b)** Le triangle AHC est rectangle en H : CH² = AC² − AH² = 36 − 9 = 27, donc CH = 3√3.
Aire du triangle ABC : (1/2) × AB × CH = (1/2) × 4 × 3√3 = 6√3.

**c)** K est le projeté orthogonal de A sur (BC), donc BA·BC = BK·BC. Comme BA·BC = 4 > 0, vec(BK) et vec(BC) ont le même sens :

    BK × BC = 4,   donc   BK = 4 / (2√7) = 2/√7 = 2√7/7

(BK ≈ 0.76 < BC, donc K appartient au segment [BC].)
Le triangle ABK est rectangle en K : AK² = AB² − BK² = 16 − 4/7 = 108/7, donc AK = √(108/7) = 6√21/7.
Contrôle : (1/2) × BC × AK = (1/2) × 2√7 × 6√21/7 = 6√147/7 = 6√3, on retrouve l'aire du 3. b).

**4. a)** Théorème de la médiane : AB² + AC² = 2 AI² + BC²/2, soit 52 = 2 AI² + 14.
Donc AI² = 19 et AI = √19.

**b)** vec(AI) = (1/2)(vec(AB) + vec(AC)) et vec(BC) = vec(AC) − vec(AB), donc

    AI·BC = (1/2)(AC² − AB²) = (36 − 16) / 2 = 10

Les projetés orthogonaux de A et de I sur (BC) sont K et I, donc AI·BC = KI·BC. Comme AI·BC = 10 > 0, vec(KI) et vec(BC) ont le même sens :

    KI × BC = 10,   donc   KI = 10 / (2√7) = 5/√7 = 5√7/7

Contrôle : BK + KI = 2/√7 + 5/√7 = 7/√7 = √7 = BI (K est entre B et I).

**5. a)** On décompose avec le point I : vec(MB) = vec(MI) + vec(IB) et vec(MC) = vec(MI) + vec(IC), avec vec(IC) = −vec(IB). Donc

    MB·MC = (vec(MI) + vec(IB))·(vec(MI) − vec(IB)) = MI² − IB²

Or IB = BC/2 = √7, donc IB² = 7 et MB·MC = MI² − 7.

**b)** MB·MC = 12 ⟺ MI² − 7 = 12 ⟺ MI² = 19 ⟺ MI = √19.
Γ est le cercle de centre I et de rayon √19.
Pour M = A : AB·AC = 12 (question 1. a)), donc A ∈ Γ. C'est cohérent avec AI = √19 (question 4. a)).

**c)** D'après le 3. a), AH·AB = AC·AB = 12. Donc

    AM·AB = 12 ⟺ AM·AB = AH·AB ⟺ (vec(AM) − vec(AH))·vec(AB) = 0 ⟺ HM·AB = 0

Δ est la droite perpendiculaire à (AB) passant par H, c'est-à-dire la droite (CH).
C appartient à Δ, puisque AC·AB = 12 (ou puisque H est le projeté orthogonal de C sur (AB)).

---

## Exercice 2 — Triangle dans un repère : hauteurs, cercle circonscrit, cercle de diamètre [AH]

Le plan est muni d'un repère orthonormé (O, i, j). On considère les points

    A(−3, −1),   B(5, −1),   C(4, 6)

1. a) Calculer AB·AC, puis les distances AB et AC.
   b) En déduire la mesure exacte de l'angle BAC. Donner une valeur approchée à 10⁻² près, en radians, des angles ABC et ACB.
   c) On note K le projeté orthogonal de C sur (AB). Donner les coordonnées de K, puis calculer l'aire du triangle ABC.
2. a) Déterminer une équation de la hauteur 𝒟_A issue de A et une équation de la hauteur 𝒟_B issue de B.
   b) En déduire les coordonnées de l'orthocentre H du triangle ABC. Vérifier que (CH) est perpendiculaire à (AB).
3. a) Montrer que pour tout point M(x, y) du plan :

       MA² − MB² = 16(x − 1)     et     MA² − MC² = 14(x + y − 3)

   b) En déduire les coordonnées du centre Ω et le rayon R du cercle circonscrit au triangle ABC.
   c) Vérifier que vec(ΩA) + vec(ΩB) + vec(ΩC) = vec(ΩH).
4. a) Soit Γ l'ensemble des points M(x, y) du plan tels que MA·MH = 0. Montrer que

       M ∈ Γ ⟺ x² + y² − x + y − 12 = 0

   puis préciser la nature de Γ, son centre et son rayon.
   b) On note L le pied de la hauteur issue de B. Calculer les coordonnées de L. Montrer que K et L appartiennent à Γ.
   c) Déterminer l'ensemble des points M du plan tels que AM·AB = 56. Que représente cet ensemble pour le triangle ABC ?

### Corrigé

**1. a)** vec(AB) = (8, 0) et vec(AC) = (7, 7). Dans la base orthonormée (i, j) :

    AB·AC = 8 × 7 + 0 × 7 = 56,   AB = √64 = 8,   AC = √98 = 7√2

**b)** cos(angle BAC) = AB·AC / (AB × AC) = 56 / (8 × 7√2) = 1/√2 = √2/2, donc angle BAC = π/4.

- vec(BA) = (−8, 0), vec(BC) = (−1, 7) : BA·BC = 8 et BC = √50 = 5√2. cos(angle ABC) = 8 / (8 × 5√2) = √2/10 ≈ 0.141, d'où angle ABC ≈ 1.43 rad.
- vec(CA) = (−7, −7), vec(CB) = (1, −7) : CA·CB = −7 + 49 = 42. cos(angle ACB) = 42 / (7√2 × 5√2) = 42/70 = 0.6, d'où angle ACB ≈ 0.93 rad.

Contrôle : 0.7854 + 1.4289 + 0.9273 ≈ 3.1416 ≈ π.

**c)** A et B ont la même ordonnée −1 : (AB) est la droite d'équation y = −1, parallèle à l'axe des abscisses. Le projeté orthogonal de C(4, 6) sur cette droite est K(4, −1), et CK = 6 − (−1) = 7.
Aire du triangle ABC : (1/2) × AB × CK = (1/2) × 8 × 7 = 28.

**2. a)** Hauteur issue de A : M(x, y) ∈ 𝒟_A ⟺ AM·BC = 0. Avec vec(AM) = (x + 3, y + 1) et vec(BC) = (−1, 7) :

    −(x + 3) + 7(y + 1) = 0 ⟺ x − 7y − 4 = 0

Hauteur issue de B : M(x, y) ∈ 𝒟_B ⟺ BM·AC = 0. Avec vec(BM) = (x − 5, y + 1) et vec(AC) = (7, 7) :

    7(x − 5) + 7(y + 1) = 0 ⟺ x + y − 4 = 0

**b)** H est le point commun de 𝒟_A et 𝒟_B : x = 4 − y, puis 4 − y − 7y − 4 = 0, donc y = 0 et x = 4. H(4, 0).
vec(CH) = (0, −6) et vec(AB) = (8, 0) : CH·AB = 0, donc (CH) ⟂ (AB). On retrouve que les trois hauteurs sont concourantes en H (la troisième est la droite (CK) d'équation x = 4).

**3. a)**

    MA² − MB² = (x + 3)² + (y + 1)² − (x − 5)² − (y + 1)² = (6x + 9) − (−10x + 25) = 16x − 16 = 16(x − 1)
    MA² − MC² = (x + 3)² + (y + 1)² − (x − 4)² − (y − 6)² = 6x + 9 + 2y + 1 + 8x − 16 + 12y − 36 = 14(x + y − 3)

**b)** Ω est équidistant de A, B et C : ΩA² − ΩB² = 0 et ΩA² − ΩC² = 0, soit x = 1 et x + y − 3 = 0. Donc Ω(1, 2).
(La médiatrice de [AB] est la droite x = 1, celle de [AC] est la droite x + y − 3 = 0.)
R² = ΩA² = (−3 − 1)² + (−1 − 2)² = 16 + 9 = 25, donc R = 5. Contrôle : ΩB² = 16 + 9 = 25 et ΩC² = 9 + 16 = 25.

**c)** vec(ΩA) = (−4, −3), vec(ΩB) = (4, −3), vec(ΩC) = (3, 4). Leur somme est (3, −2).
vec(ΩH) = (4 − 1, 0 − 2) = (3, −2). Donc vec(ΩA) + vec(ΩB) + vec(ΩC) = vec(ΩH).

**4. a)** vec(MA) = (−3 − x, −1 − y) et vec(MH) = (4 − x, −y), donc

    MA·MH = (x + 3)(x − 4) + y(y + 1) = x² − x − 12 + y² + y

Donc M ∈ Γ ⟺ x² + y² − x + y − 12 = 0 ⟺ (x − 1/2)² + (y + 1/2)² = 12 + 1/4 + 1/4 = 25/2.
Soit P(1/2, −1/2). Dans le repère orthonormé, PM² = (x − 1/2)² + (y + 1/2)², donc M ∈ Γ ⟺ PM² = 25/2 ⟺ PM = 5√2/2 : Γ est le cercle de centre P et de rayon 5√2/2.
P est le milieu de [AH] et AH = √(49 + 1) = 5√2 : Γ est le cercle de diamètre [AH].
Remarque (méthode du cours) : avec P milieu de [AH], vec(MA)·vec(MH) = PM² − PA², donc MA·MH = 0 ⟺ PM = PA, et l'on retrouve directement le cercle de diamètre [AH].

**b)** La droite (AC) passe par A et a pour vecteur directeur (1, 1) : elle a pour équation y = x + 2.
L appartient à (AC) et à la hauteur 𝒟_B : x + (x + 2) − 4 = 0, donc x = 1 et y = 3. L(1, 3).

- K(4, −1) : 16 + 1 − 4 − 1 − 12 = 0, donc K ∈ Γ.
- L(1, 3) : 1 + 9 − 1 + 3 − 12 = 0, donc L ∈ Γ.

C'est normal : les angles AKH et ALH sont droits (K et L sont des pieds de hauteurs), donc K et L sont sur le cercle de diamètre [AH].

**c)** vec(AM) = (x + 3, y + 1) et vec(AB) = (8, 0), donc AM·AB = 8(x + 3).
AM·AB = 56 ⟺ x + 3 = 7 ⟺ x = 4. C'est la droite d'équation x = 4, qui passe par C(4, 6), K(4, −1) et H(4, 0) : c'est la hauteur du triangle ABC issue de C.
