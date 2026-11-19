# 1ère année — Chapitre 7 : Quart de tour

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10, « Activités géométriques » : transformations du plan (symétrie axiale, symétrie centrale, translation, quart de tour) ; construire l'image d'un point par un quart de tour ; reconnaître l'image d'une figure par un quart de tour ; construire un polygone régulier connaissant son centre et un sommet. P. 13, « Activités dans un repère » : coordonnées, milieu, distance de deux points dans un repère orthonormé.
- Manuel CNP, chapitre 7 (p. 101–116) : le sens direct est le sens contraire des aiguilles d'une montre, le sens indirect est le sens des aiguilles d'une montre. L'image d'un point M distinct de O par le quart de tour direct (ou indirect) de centre O est le point M' tel que OM' = OM et l'angle MOM' mesure 90°, en tournant dans le sens direct (ou indirect) ; l'image de O est O. « ABC est rectangle isocèle en A » équivaut à « C est l'image de B par un quart de tour de centre A ». Un quart de tour conserve les distances et l'alignement ; l'image d'un segment est un segment qui lui est isométrique ; l'image d'une droite est une droite qui lui est perpendiculaire ; l'image d'un cercle est un cercle de même rayon (son centre est l'image du centre) ; un polygone et son image sont superposables. Le demi-tour de centre O est la symétrie centrale de centre O.
- Outils autorisés : ce chapitre, les chapitres 1 à 6 (angles, Thalès, relations métriques dans le triangle rectangle, vecteurs, repères : coordonnées, milieu, distance dans un repère orthonormé) et le collège (Pythagore et sa réciproque, configurations de base, symétries, triangle rectangle inscrit dans un demi-cercle). On n'utilise ni produit scalaire, ni équation de droite, ni rotation d'angle quelconque.
- Orientation : le sens est précisé dans chaque énoncé. Dans un repère orthonormé (O, I, J), la figure est faite de façon usuelle (I à droite de O, J au-dessus de O), de sorte que J est l'image de I par le quart de tour direct de centre O.
- Notation : AB est une longueur ; un angle géométrique est noté « l'angle AOB » (le manuel met un chapeau sur AOB) ; repère (O, I, J) ; unité de longueur le centimètre.
- Toutes les valeurs sont vérifiées par `check_ch07.py` (calcul exact en fractions ; chaque image est testée avec la définition : même distance au centre, angle droit et sens de rotation).

---

## Exercice 1 — Image d'un point, d'un segment, d'une droite et d'un cercle dans un repère

Le plan est muni d'un repère orthonormé (O, I, J) ; on peut travailler sur papier quadrillé (un carreau pour une unité). La figure est faite de façon usuelle : I est à droite de O et J au-dessus de O, de sorte que J est l'image de I par le quart de tour direct de centre O.
On note R le quart de tour direct de centre O, et on donne les points

    A(3, 1),   B(6, 1),   P(2, 4)

1. a) Placer A. Construire le point A' = R(A) et le point A'', image de A par le quart de tour indirect de centre O. Lire les coordonnées de A' et de A''.
   b) Vérifier par le calcul que OA' = OA = OA'' et que les triangles AOA' et AOA'' sont rectangles en O.
   c) Montrer que O est le milieu de [A'A'']. Par quelle transformation passe-t-on de A' à A'' ?
2. a) Construire le point B' = R(B) et lire ses coordonnées.
   b) Calculer AB et A'B'. Quelle propriété du quart de tour retrouve-t-on ?
   c) Que peut-on dire des droites (AB) et (A'B') ? Le vérifier à l'aide des coordonnées, puis donner les coordonnées de leur point d'intersection K.
3. On note (C) le cercle de centre A passant par O.
   a) Donner le rayon de (C). Déterminer l'image (C') de (C) par R (centre et rayon). Montrer que (C') passe par O.
   b) Vérifier que P appartient à (C) et à (C').
   c) Montrer que le quadrilatère OAPA' est un carré.
4. a) Quelle est la nature du triangle AOP ?
   b) En déduire que P est l'image de O par un quart de tour de centre A. Ce quart de tour est-il direct ou indirect ? Justifier.

### Corrigé

**1. a)** Méthode du quadrillage. Pour aller de O à A, on avance de 3 carreaux vers la droite puis de 1 carreau vers le haut.
On fait tourner ce chemin d'un quart de tour dans le sens direct (contraire des aiguilles d'une montre) : « vers la droite » devient « vers le haut » et « vers le haut » devient « vers la gauche ». Pour aller de O à A', on avance donc de 3 carreaux vers le haut puis de 1 carreau vers la gauche : A'(−1, 3).
Dans le sens indirect, « vers la droite » devient « vers le bas » et « vers le haut » devient « vers la droite ». Pour aller de O à A'', on avance de 3 carreaux vers le bas puis de 1 carreau vers la droite : A''(1, −3).
(Avec le compas et l'équerre : on trace le cercle de centre O passant par A et la perpendiculaire à (OA) en O. Elle coupe le cercle en deux points : A' est celui que l'on atteint en tournant autour de O à partir de A dans le sens contraire des aiguilles d'une montre, A'' est l'autre.)

**b)** Le repère est orthonormé :

    OA² = 3² + 1² = 10,   OA'² = (−1)² + 3² = 10,   OA''² = 1² + (−3)² = 10

donc OA = OA' = OA'' = √10.
AA'² = (−1 − 3)² + (3 − 1)² = 16 + 4 = 20 = OA² + OA'². D'après la réciproque du théorème de Pythagore, le triangle AOA' est rectangle en O.
AA''² = (1 − 3)² + (−3 − 1)² = 4 + 16 = 20 = OA² + OA''² : le triangle AOA'' est rectangle en O.
On retrouve la définition : OA' = OA et l'angle AOA' mesure 90° (de même pour A''). Le sens se lit sur la figure : A est dans la partie du plan où x > 0 et y > 0 ; A' (x < 0, y > 0) est atteint en tournant dans le sens contraire des aiguilles d'une montre, A'' (x > 0, y < 0) en tournant dans le sens des aiguilles d'une montre.

**c)** Le milieu de [A'A''] a pour coordonnées ((−1 + 1)/2, (3 − 3)/2) = (0, 0) : c'est O.
A'' est donc le symétrique de A' par rapport à O : on passe de A' à A'' par le demi-tour de centre O (la symétrie centrale de centre O). C'est normal : de A' à A, puis de A à A'', on tourne deux fois d'un quart de tour dans le sens indirect, soit d'un demi-tour.

**2. a)** De O à B : 6 carreaux vers la droite, 1 vers le haut. De O à B' : 6 carreaux vers le haut, 1 vers la gauche. B'(−1, 6).

**b)** AB = √((6 − 3)² + (1 − 1)²) = 3 et A'B' = √((−1 + 1)² + (6 − 3)²) = 3.
AB = A'B' : le quart de tour conserve les distances (l'image du segment [AB] est le segment [A'B'], qui lui est isométrique).

**c)** L'image de la droite (AB) par R est la droite (A'B'), car elle passe par R(A) = A' et R(B) = B'. L'image d'une droite par un quart de tour est une droite qui lui est perpendiculaire : (AB) ⟂ (A'B').
Vérification : A et B ont la même ordonnée 1, donc (AB) est parallèle à l'axe (OI) ; A' et B' ont la même abscisse −1, donc (A'B') est parallèle à l'axe (OJ). Le repère est orthonormé, donc (OI) ⟂ (OJ), et ainsi (AB) ⟂ (A'B').
K est sur (AB), donc son ordonnée est 1 ; K est sur (A'B'), donc son abscisse est −1 : K(−1, 1).

**3. a)** Le rayon de (C) est AO = √10.
L'image d'un cercle par un quart de tour est un cercle de même rayon, dont le centre est l'image du centre : (C') est le cercle de centre A' = R(A) et de rayon √10.
O appartient à (C) et R(O) = O, donc O appartient à (C'). (On le vérifie : OA' = √10.)

**b)** PA² = (2 − 3)² + (4 − 1)² = 1 + 9 = 10, donc PA = √10 et P ∈ (C).
PA'² = (2 + 1)² + (4 − 3)² = 9 + 1 = 10, donc PA' = √10 et P ∈ (C').

**c)** Les diagonales de OAPA' sont [OP] et [AA'].
Milieu de [OP] : ((0 + 2)/2, (0 + 4)/2) = (1, 2). Milieu de [AA'] : ((3 − 1)/2, (1 + 3)/2) = (1, 2).
Les diagonales ont le même milieu : OAPA' est un parallélogramme. Deux côtés consécutifs sont égaux (OA = OA' = √10) : c'est un losange. L'angle AOA' mesure 90° (question 1. b)) : un losange qui a un angle droit est un carré. OAPA' est un carré.

**4. a)** AO = AP = √10 (questions 3. a) et 3. b)) et OP² = 2² + 4² = 20 = AO² + AP². D'après la réciproque du théorème de Pythagore, le triangle AOP est rectangle en A ; il est donc rectangle isocèle en A. (On le voit aussi dans le carré OAPA'.)

**b)** Le triangle AOP est rectangle isocèle en A : d'après le cours, P est l'image de O par un quart de tour de centre A.
Sens : sur le quadrillage, pour aller de A à O on avance de 3 carreaux vers la gauche et 1 vers le bas ; pour aller de A à P, de 1 carreau vers la gauche et 3 vers le haut. Dans le sens des aiguilles d'une montre, « vers la gauche » devient « vers le haut » et « vers le bas » devient « vers la gauche » : le chemin « 3 à gauche, 1 en bas » devient « 3 en haut, 1 à gauche », qui mène de A à P.
P est l'image de O par le quart de tour indirect de centre A. (Contrôle : le quart de tour direct de centre A envoie O sur le point atteint depuis A par 3 carreaux vers le bas et 1 vers la droite, c'est-à-dire (4, −2), qui n'est pas P.)

---

## Exercice 2 — Un carré dans un carré

ABCD est un carré de côté 6 cm et de centre O. Ses sommets sont nommés dans le sens direct : en parcourant A, B, C, D, on tourne dans le sens contraire des aiguilles d'une montre (par exemple A en bas à gauche, B en bas à droite, C en haut à droite, D en haut à gauche).
On place les points E sur [AB], F sur [BC], G sur [CD] et H sur [DA] tels que

    AE = BF = CG = DH = 2 cm

On note R le quart de tour direct de centre O.

1. a) Justifier que R transforme A en B, B en C, C en D et D en A.
   b) Montrer que R(E) = F. (On pourra chercher l'image du segment [AB].)
   c) Donner, sans justification, R(F), R(G) et R(H).
2. a) Montrer que O est le milieu de [EG] et le milieu de [FH]. (On pourra utiliser la symétrie centrale de centre O.)
   b) En déduire que EFGH est un carré de centre O.
3. a) Calculer EF, puis l'aire de EFGH. Quelle fraction de l'aire de ABCD représente-t-elle ?
   b) Calculer OE.
4. a) Montrer que les droites (AF) et (BG) sont perpendiculaires et que AF = BG. Calculer AF.
   b) Les droites (AF) et (BG) se coupent en P. Montrer que P appartient au cercle de diamètre [AB].
   c) En utilisant les relations métriques dans le triangle ABF, calculer BP, AP et PF.
5. Les droites (BG) et (CH) se coupent en Q, les droites (CH) et (DE) en S, les droites (DE) et (AF) en T.
   a) Montrer que R(P) = Q, puis donner R(Q), R(S) et R(T).
   b) Montrer que PQST est un carré.
   c) Calculer BQ, puis PQ et l'aire de PQST. Quelle fraction de l'aire de ABCD représente-t-elle ?

### Corrigé

**1. a)** Les diagonales du carré ABCD ont la même longueur, se coupent en leur milieu O et sont perpendiculaires. Donc OA = OB = OC = OD et les angles AOB, BOC, COD et DOA mesurent 90°.
Comme A, B, C, D se suivent dans le sens direct, on passe de A à B en tournant d'un quart de tour autour de O dans le sens direct : R(A) = B. De même R(B) = C, R(C) = D et R(D) = A.

**b)** L'image du segment [AB] par R est le segment [R(A)R(B)] = [BC]. Comme E ∈ [AB], son image E₁ = R(E) appartient à [BC].
Le quart de tour conserve les distances : BE₁ = R(A)R(E) = AE = 2.
Le seul point de [BC] situé à 2 cm de B est F, donc R(E) = F.

**c)** De la même façon (l'image de [BC] est [CD], celle de [CD] est [DA], celle de [DA] est [AB]) : R(F) = G, R(G) = H et R(H) = E.

**2. a)** La symétrie centrale de centre O transforme A en C et B en D, donc le segment [AB] en le segment [CD]. Elle conserve les distances : l'image E₂ de E est sur [CD] et CE₂ = AE = 2, donc E₂ = G. G est le symétrique de E par rapport à O : O est le milieu de [EG].
De même, elle transforme [BC] en [DA] et l'image F₂ de F vérifie DF₂ = BF = 2, donc F₂ = H : O est le milieu de [FH].

**b)** F = R(E) et R(O) = O, donc OF = OE et l'angle EOF mesure 90°.
Les diagonales [EG] et [FH] de EFGH ont le même milieu O, la même longueur (EG = 2 OE = 2 OF = FH) et sont perpendiculaires. Un quadrilatère dont les diagonales ont le même milieu, la même longueur et sont perpendiculaires est un carré : EFGH est un carré de centre O.

**3. a)** EB = AB − AE = 4 et BF = 2. Le triangle EBF est rectangle en B :

    EF² = EB² + BF² = 16 + 4 = 20,   EF = √20 = 2√5 cm

Aire de EFGH : EF² = 20 cm².
Contrôle : les quatre triangles des coins (EBF, FCG, GDH, HAE) ont chacun pour côtés de l'angle droit 4 et 2, donc une aire de 4 cm² ; 36 − 4 × 4 = 20.
20/36 = 5/9 : le carré EFGH occupe les 5/9 de l'aire de ABCD.

**b)** Le triangle EOF est rectangle isocèle en O : EF² = OE² + OF² = 2 OE², donc OE² = 10 et OE = √10 cm.

**4. a)** R(A) = B et R(F) = G : R transforme la droite (AF) en la droite (BG). L'image d'une droite par un quart de tour lui est perpendiculaire : (AF) ⟂ (BG).
L'image du segment [AF] est le segment [BG], qui lui est isométrique : AF = BG.
Le triangle ABF est rectangle en B : AF² = AB² + BF² = 36 + 4 = 40, donc AF = √40 = 2√10 cm (≈ 6.32 cm).

**b)** Les droites (AF) et (BG) sont perpendiculaires en P, donc l'angle APB est droit. Le triangle APB est rectangle en P : il est inscrit dans le cercle de diamètre son hypoténuse [AB]. P appartient au cercle de diamètre [AB] (de centre le milieu de [AB] et de rayon 3 cm).

**c)** Dans le triangle ABF rectangle en B, P est sur (AF) et (BP) ⟂ (AF) : [BP] est la hauteur issue de B. Les relations métriques donnent :

    BA × BF = BP × AF,   d'où   BP = 6 × 2 / (2√10) = 6/√10 = 3√10/5 ≈ 1.90 cm
    BA² = AP × AF,       d'où   AP = 36 / (2√10) = 18/√10 = 9√10/5 ≈ 5.69 cm
    BF² = FP × FA,       d'où   PF = 4 / (2√10) = 2/√10 = √10/5 ≈ 0.63 cm

Contrôle : AP + PF = 20/√10 = 2√10 = AF.

**5. a)** R transforme (AF) en (BG) (question 4. a)) et (BG) en (CH), puisque R(B) = C et R(G) = H.
P est sur (AF) et sur (BG), donc R(P) est sur (BG) et sur (CH). Ces deux droites sont perpendiculaires (l'une est l'image de l'autre), elles n'ont qu'un point commun, Q. Donc R(P) = Q.
De même, R transforme (CH) en (DE) (R(C) = D, R(H) = E) et (DE) en (AF) (R(D) = A, R(E) = F). Donc R(Q) = S, R(S) = T et R(T) = P.

**b)** Le quart de tour conserve les distances et R(O) = O : OP = OQ = OS = OT. De plus l'angle POQ mesure 90°.
La symétrie centrale de centre O transforme A en C et F en H, donc (AF) en (CH) ; elle transforme B en D et G en E, donc (BG) en (DE). Le point P, commun à (AF) et (BG), a donc pour image le point commun à (CH) et (DE), c'est-à-dire S : O est le milieu de [PS]. De même O est le milieu de [QT].
Les diagonales [PS] et [QT] ont le même milieu O, la même longueur (2 OP = 2 OQ) et sont perpendiculaires : PQST est un carré de centre O.

**c)** (CH) est l'image de (BG) par R, donc (CH) ⟂ (BG). Dans le triangle BCG rectangle en C (BC = 6, CG = 2, BG = AF = 2√10), Q est le pied de la hauteur issue de C. D'où

    BC² = BQ × BG,   donc   BQ = 36 / (2√10) = 18/√10 = 9√10/5 ≈ 5.69 cm

P et Q sont sur le segment [BG] (P est sur [AF], donc à l'intérieur du carré) et BP < BQ, donc

    PQ = BQ − BP = 18/√10 − 6/√10 = 12/√10 = 6√10/5 ≈ 3.79 cm

Aire de PQST : PQ² = 144/10 = 14.4 cm².
14.4/36 = 2/5 : le petit carré PQST occupe les 2/5 de l'aire de ABCD.
