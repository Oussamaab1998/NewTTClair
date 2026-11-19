# 2ème Sciences — Tome 1, Chapitre 6 : Barycentre

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 22 (activités géométriques) : barycentre de deux ou de trois points pondérés ; construire le barycentre de deux ou de trois points pondérés ; résoudre des problèmes d'alignement ou de concours en utilisant la notion de barycentre ; problèmes de construction et de lieux géométriques.
- Manuel CNP (tome 1, p. 93–108) : barycentre G de (A, α) et (B, β) avec α + β ≠ 0, défini par α vec(GA) + β vec(GB) = 0, ou par vec(AG) = (β/(α + β)) vec(AB) ; G ∈ (AB), et G ∈ [AB] ⟺ α et β sont de même signe ; le barycentre ne change pas si l'on multiplie les coefficients par un même réel k ≠ 0 ; pour tout point M, α vec(MA) + β vec(MB) = (α + β) vec(MG) ; constructions (méthode des parallèles, du parallélogramme) ; barycentre de trois points (α + β + γ ≠ 0), α vec(MA) + β vec(MB) + γ vec(MC) = (α + β + γ) vec(MG), isobarycentre = centre de gravité ; barycentre partiel ; recherche d'ensembles de points. Lorsque la somme des coefficients est nulle, le vecteur obtenu ne dépend pas de M (activité 5).
- Outils autorisés : ce chapitre, le chapitre 5 (calcul vectoriel, colinéarité, repère cartésien, déterminant, norme) et les acquis de 1ère (médiatrice, cercle, Thalès).
- Notation : vec(AB) est le vecteur AB et AB la distance ; ‖u‖ est la norme du vecteur u ; 0 désigne aussi le vecteur nul ; (A, 2) est le point A affecté du coefficient 2.
- Toutes les valeurs sont vérifiées par `check_t1_ch06.py` (calcul exact en fractions ; les figures sont mises en coordonnées, avec 300 positions aléatoires du point C dans l'exercice 1 et 300 triangles aléatoires dans l'exercice 2).

---

## Exercice 1 — Barycentre de deux points, réduction, ensembles de points

Soit [AB] un segment tel que AB = 6 (l'unité est le centimètre).

1. a) Construire le barycentre G des points pondérés (A, 2) et (B, 1). Calculer AG.
   b) Construire le barycentre K des points pondérés (A, −1) et (B, 4). Calculer AK et BK. Le point K appartient-il au segment [AB] ?
2. a) Montrer que B est le barycentre des points pondérés (G, 1) et (K, 2).
   b) Montrer que pour tout point M du plan :

       2 vec(MA) + vec(MB) = 3 vec(MG)     et     −vec(MA) + 4 vec(MB) = 3 vec(MK)

3. Déterminer et construire :
   a) l'ensemble Γ₁ des points M du plan tels que ‖2 vec(MA) + vec(MB)‖ = ‖−vec(MA) + 4 vec(MB)‖ ;
   b) l'ensemble Γ₂ des points M du plan tels que ‖2 vec(MA) + vec(MB)‖ = ‖vec(MA) − vec(MB)‖.
4. Soit C un point du plan qui n'appartient pas à la droite (AB). On note O le milieu de [AB] et P le barycentre des points pondérés (A, 2), (B, 1) et (C, 3).
   a) Montrer que P est le milieu du segment [GC].
   b) Montrer que le vecteur vec(MA) + vec(MB) − 2 vec(MC) ne dépend pas du point M et qu'il est égal à 2 vec(CO).
   c) Déterminer l'ensemble Δ des points M du plan tels que les vecteurs 2 vec(MA) + vec(MB) + 3 vec(MC) et vec(MA) + vec(MB) − 2 vec(MC) soient colinéaires.
   d) Montrer que Δ coupe la droite (AB) au milieu X du segment [GO]. Calculer AX.

### Corrigé

**1. a)** 2 + 1 = 3 ≠ 0, donc G existe. 2 vec(GA) + vec(GB) = 0 ⟺ 2 vec(GA) + vec(GA) + vec(AB) = 0 ⟺ vec(AG) = (1/3) vec(AB).
Les coefficients sont de même signe : G ∈ [AB], avec AG = 6/3 = 2 (et GB = 4). On place G sur [AB] à 2 cm de A.

**b)** −1 + 4 = 3 ≠ 0, donc K existe. −vec(KA) + 4 vec(KB) = 0 ⟺ −vec(KA) + 4 vec(KA) + 4 vec(AB) = 0 ⟺ 3 vec(KA) = −4 vec(AB) ⟺ vec(AK) = (4/3) vec(AB).
Donc AK = (4/3) × 6 = 8 : K est sur la demi-droite [AB), au-delà de B, et BK = AK − AB = 2.
Les coefficients −1 et 4 sont de signes contraires : K n'appartient pas au segment [AB], ce qui est cohérent.

**2. a)** vec(BG) = vec(BA) + vec(AG) = −vec(AB) + (1/3) vec(AB) = −(2/3) vec(AB) et vec(BK) = vec(BA) + vec(AK) = (1/3) vec(AB). Donc

    vec(BG) + 2 vec(BK) = −(2/3) vec(AB) + (2/3) vec(AB) = 0

Comme 1 + 2 ≠ 0, B est le barycentre de (G, 1) et (K, 2).

**b)** Par la relation de Chasles, pour tout point M :

    2 vec(MA) + vec(MB) = 2(vec(MG) + vec(GA)) + (vec(MG) + vec(GB)) = 3 vec(MG) + (2 vec(GA) + vec(GB)) = 3 vec(MG)
    −vec(MA) + 4 vec(MB) = 3 vec(MK) + (−vec(KA) + 4 vec(KB)) = 3 vec(MK)

**3. a)** D'après le 2. b) : M ∈ Γ₁ ⟺ ‖3 vec(MG)‖ = ‖3 vec(MK)‖ ⟺ MG = MK.
Γ₁ est la médiatrice du segment [GK] (G ≠ K). Le milieu E de [GK] vérifie AE = (AG + AK)/2 = (2 + 8)/2 = 5, car G et K sont sur la même demi-droite [AB).
Construction : Γ₁ est la perpendiculaire à (AB) au point E de [AB] tel que AE = 5 (EB = 1).

**b)** vec(MA) − vec(MB) = vec(MA) + vec(BM) = vec(BA) ne dépend pas de M, et ‖vec(BA)‖ = 6. Donc

    M ∈ Γ₂ ⟺ 3 MG = 6 ⟺ MG = 2

Γ₂ est le cercle de centre G et de rayon 2. Il passe par A (AG = 2) et par le point F de [AB] tel que AF = 4 : [AF] est un diamètre de Γ₂.

**4. a)** 2 + 1 + 3 = 6 ≠ 0, donc P existe. Avec le 2. b) appliqué en M = P :

    2 vec(PA) + vec(PB) + 3 vec(PC) = 3 vec(PG) + 3 vec(PC) = 0,   donc   vec(PG) + vec(PC) = 0

P est le milieu de [GC]. (C'est le barycentre partiel : P est le barycentre de (G, 3) et (C, 3).)

**b)** Pour tout point M :

    vec(MA) + vec(MB) − 2 vec(MC) = (vec(MC) + vec(CA)) + (vec(MC) + vec(CB)) − 2 vec(MC) = vec(CA) + vec(CB)

Ce vecteur ne dépend pas de M. Comme O est le milieu de [AB], vec(CA) + vec(CB) = 2 vec(CO).

**c)** Pour tout point M, d'après le 2. b) et le a) (P milieu de [GC]) :

    2 vec(MA) + vec(MB) + 3 vec(MC) = 3 vec(MG) + 3 vec(MC) = 3 × 2 vec(MP) = 6 vec(MP)

Donc M ∈ Δ ⟺ 6 vec(MP) et 2 vec(CO) sont colinéaires ⟺ vec(PM) et vec(CO) sont colinéaires (vec(CO) ≠ 0 car C n'est pas sur (AB)).
Δ est la droite passant par P et parallèle à (CO).

**d)** AO = 3 et AG = 2, donc G ≠ O ; X est le point de [AB] tel que AX = (2 + 3)/2 = 5/2 = 2.5.
P est le milieu de [GC] et X le milieu de [GO], donc

    vec(PX) = vec(PG) + vec(GX) = (1/2) vec(CG) + (1/2) vec(GO) = (1/2) vec(CO)

vec(PX) est colinéaire à vec(CO), donc X ∈ Δ. D'autre part, Δ n'est pas parallèle à (AB), car (CO) ne l'est pas (C ∉ (AB)) : Δ coupe (AB) en un seul point, qui est donc X.
(C'est la droite des milieux dans le triangle GCO.) AX = 2.5.

---

## Exercice 2 — Concours et alignement dans un triangle

Soit ABC un triangle. On considère les points :

- I, barycentre des points pondérés (B, 2) et (C, 1) ;
- J, barycentre des points pondérés (A, 3) et (C, 1) ;
- K, barycentre des points pondérés (A, 3) et (B, 2) ;
- G, barycentre des points pondérés (A, 3), (B, 2) et (C, 1).

1. Exprimer vec(BI) en fonction de vec(BC), vec(AJ) en fonction de vec(AC) et vec(AK) en fonction de vec(AB). Placer les points I, J et K.
2. a) Montrer que G est le barycentre des points pondérés (A, 3) et (I, 3). En déduire que G est le milieu de [AI].
   b) Montrer que G est aussi le barycentre de (B, 2) et (J, 4), puis le barycentre de (C, 1) et (K, 5).
   c) En déduire que les droites (AI), (BJ) et (CK) sont concourantes.
3. a) Montrer que vec(AG) = (1/3) vec(AB) + (1/6) vec(AC).
   b) Déterminer les réels x et y tels que vec(BG) = x vec(BJ) et vec(CG) = y vec(CK).
4. Soit L le symétrique de C par rapport à B.
   a) Montrer que L est le barycentre des points pondérés (B, 2) et (C, −1).
   b) Montrer que pour tout point M du plan : 5 vec(MK) − 4 vec(MJ) = vec(ML).
   c) En déduire que les points J, K et L sont alignés.
5. On munit le plan du repère cartésien (A, vec(AB), vec(AC)).
   a) Donner les coordonnées des points I, J, K, G et L.
   b) Vérifier par le calcul que G est le milieu de [AI], que G appartient à (BJ) et à (CK), et que les points J, K et L sont alignés.

### Corrigé

**1.**

- 2 vec(IB) + vec(IC) = 0 ⟺ 2 vec(IB) + vec(IB) + vec(BC) = 0 ⟺ vec(BI) = (1/3) vec(BC).
- 3 vec(JA) + vec(JC) = 0 ⟺ 4 vec(JA) + vec(AC) = 0 ⟺ vec(AJ) = (1/4) vec(AC).
- 3 vec(KA) + 2 vec(KB) = 0 ⟺ 5 vec(KA) + 2 vec(AB) = 0 ⟺ vec(AK) = (2/5) vec(AB).

Les coefficients sont chaque fois de même signe : I est le point de [BC] tel que BI = BC/3, J le point de [AC] tel que AJ = AC/4, et K le point de [AB] tel que AK = (2/5) AB.

**2. a)** 2 + 1 = 3 ≠ 0 et I est le barycentre de (B, 2) et (C, 1), donc pour tout point M, 2 vec(MB) + vec(MC) = 3 vec(MI). En M = G :

    3 vec(GA) + 2 vec(GB) + vec(GC) = 3 vec(GA) + 3 vec(GI) = 0

G est le barycentre de (A, 3) et (I, 3), c'est-à-dire de (A, 1) et (I, 1) : G est le milieu de [AI].

**b)** 3 + 1 = 4 ≠ 0 : 3 vec(GA) + vec(GC) = 4 vec(GJ), donc 2 vec(GB) + 4 vec(GJ) = 0. G est le barycentre de (B, 2) et (J, 4).
3 + 2 = 5 ≠ 0 : 3 vec(GA) + 2 vec(GB) = 5 vec(GK), donc vec(GC) + 5 vec(GK) = 0. G est le barycentre de (C, 1) et (K, 5).

**c)** Le barycentre de deux points appartient à la droite qui les joint. Donc G ∈ (AI), G ∈ (BJ) et G ∈ (CK) : les trois droites passent par G, elles sont concourantes en G.

**3. a)** On écrit vec(GB) = vec(GA) + vec(AB) et vec(GC) = vec(GA) + vec(AC) dans 3 vec(GA) + 2 vec(GB) + vec(GC) = 0 :

    6 vec(GA) + 2 vec(AB) + vec(AC) = 0,   donc   vec(AG) = (1/3) vec(AB) + (1/6) vec(AC)

Contrôle : vec(AI) = vec(AB) + (1/3) vec(BC) = (2/3) vec(AB) + (1/3) vec(AC), et (1/2) vec(AI) redonne vec(AG).

**b)** G est le barycentre de (B, 2) et (J, 4), donc vec(BG) = (4/6) vec(BJ) = (2/3) vec(BJ) : x = 2/3.
G est le barycentre de (C, 1) et (K, 5), donc vec(CG) = (5/6) vec(CK) : y = 5/6.

**4. a)** L est le symétrique de C par rapport à B : B est le milieu de [CL], donc vec(LB) = vec(BC). Alors

    2 vec(LB) − vec(LC) = 2 vec(LB) − (vec(LB) + vec(BC)) = vec(LB) − vec(BC) = 0

Comme 2 − 1 = 1 ≠ 0, L est le barycentre de (B, 2) et (C, −1).

**b)** Pour tout point M : 5 vec(MK) = 3 vec(MA) + 2 vec(MB) (K barycentre de (A, 3) et (B, 2)) et 4 vec(MJ) = 3 vec(MA) + vec(MC) (J barycentre de (A, 3) et (C, 1)). Donc

    5 vec(MK) − 4 vec(MJ) = 2 vec(MB) − vec(MC) = (2 − 1) vec(ML) = vec(ML)

**c)** En prenant M = J : 5 vec(JK) = vec(JL). Les vecteurs vec(JK) et vec(JL) sont colinéaires : J, K et L sont alignés. (L est le barycentre de (K, 5) et (J, −4).)

**5. a)** A(0, 0), B(1, 0) et C(0, 1). D'après les questions précédentes :

- vec(AI) = (2/3) vec(AB) + (1/3) vec(AC) : I(2/3, 1/3) ;
- J(0, 1/4) et K(2/5, 0) ;
- G(1/3, 1/6) ;
- vec(BL) = −vec(BC) a pour composantes (1, −1), donc L(1 + 1, 0 − 1) = L(2, −1).

**b)**

- Milieu de [AI] : ((0 + 2/3)/2, (0 + 1/3)/2) = (1/3, 1/6), ce sont les coordonnées de G.
- vec(BG)(−2/3, 1/6) et vec(BJ)(−1, 1/4) : det = (−2/3) × (1/4) − (−1) × (1/6) = −1/6 + 1/6 = 0, donc G ∈ (BJ).
- vec(CG)(1/3, −5/6) et vec(CK)(2/5, −1) : det = (1/3) × (−1) − (2/5) × (−5/6) = −1/3 + 1/3 = 0, donc G ∈ (CK).
- vec(JK)(2/5, −1/4) et vec(JL)(2, −5/4) : det = (2/5) × (−5/4) − 2 × (−1/4) = −1/2 + 1/2 = 0, donc J, K et L sont alignés (et vec(JL) = 5 vec(JK)).
