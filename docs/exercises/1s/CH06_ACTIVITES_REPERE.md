# 1ère année — Chapitre 6 : Activités dans un repère

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 13, « Activités dans un repère » : repère cartésien d'une droite (abscisse d'un point, abscisse du milieu d'un segment, mesure algébrique, distance de deux points) ; repère cartésien d'un plan (coordonnées d'un point, coordonnées du milieu d'un segment, composantes d'un vecteur, distance de deux points dans un repère orthonormé) ; déterminer les coordonnées d'un point à partir d'une relation vectorielle ; reconnaître que deux vecteurs donnés par leurs composantes sont colinéaires. La représentation graphique des fonctions linéaires et affines figure aussi à la p. 13 ; elle n'est pas utilisée ici (chapitres 12 et 14).
- Manuel CNP, chapitre 6 (p. 81–100) : sur une droite munie d'un repère (O, vec(OI)), l'abscisse de M est le réel x tel que vec(OM) = x vec(OI) ; vec(AB) = (x_B − x_A) vec(OI) (le réel x_B − x_A est la mesure algébrique de vec(AB)) ; le milieu de [AB] a pour abscisse (x_A + x_B)/2 ; vec(AB) = k vec(CD) ⟺ x_B − x_A = k(x_D − x_C) ; si OI = 1, AB = |x_B − x_A|. Dans le plan muni d'un repère (O, vec(OI), vec(OJ)) : vec(OM) = x vec(OI) + y vec(OJ) ; vec(AB) a pour composantes (x_B − x_A, y_B − y_A) ; deux vecteurs sont égaux si et seulement s'ils ont les mêmes composantes ; milieu ((x_A + x_B)/2, (y_A + y_B)/2) ; vec(AB) = k vec(CD) ⟺ x_B − x_A = k(x_D − x_C) et y_B − y_A = k(y_D − y_C) ; trois points A, B, C sont alignés lorsque vec(AB) = k vec(AC) ; dans un repère orthonormé, AB = √((x_B − x_A)² + (y_B − y_A)²). En situation : choisir un repère pour résoudre un problème (alignement, droite des milieux).
- Outils autorisés : ce chapitre, les chapitres 1 à 5 (angles, Thalès, Pythagore et sa réciproque, vecteurs, translations, somme de vecteurs, vecteurs colinéaires) et les acquis du collège (parallélogramme, losange, carré, médiatrice, aire d'un triangle et d'un losange, triangle rectangle inscrit dans le cercle de diamètre son hypoténuse, calcul littéral simple, racines carrées). Pas d'équation de droite.
- Notation : vec(AB) est le vecteur AB et AB la distance ; vec(AB)(1, −2) signifie que vec(AB) a pour composantes (1, −2) ; x_A est l'abscisse du point A ; repère (O, vec(OI)) d'une droite et (O, vec(OI), vec(OJ)) du plan, comme dans le manuel ; point décimal (0.5).
- Toutes les affirmations des corrigés sont vérifiées par `check_ch06.py` (calcul exact en fractions ; énumération sur une grille de rationnels pour les questions « déterminer les points tels que … »).

---

## Exercice 1 — Abscisses, coordonnées, composantes, distances

### Partie A

La droite Δ est munie d'un repère cartésien (O, vec(OI)) tel que OI = 1. On considère les points A, B et C de Δ définis par :

    x_A = −3,     vec(AB) = 4 vec(OI),     vec(BC) = −(3/2) vec(AB)

1. a) Calculer les abscisses x_B et x_C, puis placer les points A, B et C.
   b) Calculer les distances AB, AC et BC. Le point A appartient-il au segment [BC] ?
2. On note K le milieu du segment [BC].
   a) Calculer l'abscisse de K. Exprimer vec(KA) et vec(KB) en fonction de vec(OI), puis déterminer le réel k tel que vec(KA) = k vec(KB).
   b) Déterminer les points M de Δ tels que KM = 3. Que remarque-t-on ?

### Partie B

Le plan est muni d'un repère orthonormé (O, vec(OI), vec(OJ)). On considère les points

    P(−1, −2),   Q(3, −1),   R(4, 3)

3. Calculer les composantes des vecteurs vec(PQ) et vec(QR). Ces vecteurs sont-ils colinéaires ? Les points P, Q et R sont-ils alignés ?
4. a) Déterminer les coordonnées du point S tel que PQRS soit un parallélogramme.
   b) Calculer les coordonnées du centre Ω de ce parallélogramme.
5. a) Calculer les distances PQ, QR, PR et QS.
   b) En déduire que PQRS est un losange, et que ce n'est pas un carré.
   c) Calculer l'aire du losange PQRS.
6. Soit x un réel et T le point de coordonnées (x, 8).
   a) Déterminer x pour que les points P, R et T soient alignés.
   b) Pour cette valeur de x, montrer que R est le milieu de [PT].

### Corrigé — Partie A

**1. a)** vec(AB) = (x_B − x_A) vec(OI) = 4 vec(OI), donc x_B − x_A = 4 et x_B = −3 + 4 = 1.
vec(BC) = −(3/2) vec(AB) = −(3/2) × 4 vec(OI) = −6 vec(OI), donc x_C − x_B = −6 et x_C = 1 − 6 = −5.
Sur Δ, on place dans l'ordre C(−5), A(−3), O(0), B(1).

**b)** Comme OI = 1 : AB = |1 − (−3)| = 4, AC = |−5 − (−3)| = 2 et BC = |−5 − 1| = 6.
On a AC + AB = 2 + 4 = 6 = BC, donc A appartient au segment [BC] (son abscisse −3 est bien comprise entre −5 et 1).

**2. a)** x_K = (x_B + x_C) / 2 = (1 − 5) / 2 = −2.
vec(KA) = (x_A − x_K) vec(OI) = (−3 + 2) vec(OI) = −vec(OI) et vec(KB) = (x_B − x_K) vec(OI) = (1 + 2) vec(OI) = 3 vec(OI).
Donc vec(KA) = −(1/3) vec(KB) : k = −1/3. (Les vecteurs vec(KA) et vec(KB) sont de sens contraires : K est entre A et B.)

**b)** Soit M un point de Δ d'abscisse x. KM = |x − (−2)| = |x + 2|.
KM = 3 ⟺ x + 2 = 3 ou x + 2 = −3 ⟺ x = 1 ou x = −5.
Les points cherchés sont les points d'abscisses 1 et −5, c'est-à-dire B et C. C'était prévisible : K est le milieu de [BC] et BC = 6, donc KB = KC = 3.

### Corrigé — Partie B

**3.** vec(PQ)(3 − (−1), −1 − (−2)), soit vec(PQ)(4, 1), et vec(QR)(4 − 3, 3 − (−1)), soit vec(QR)(1, 4).
S'il existait un réel k tel que vec(PQ) = k vec(QR), on aurait 4 = k × 1 et 1 = k × 4, donc k = 4 et k = 1/4 : c'est impossible. Les vecteurs vec(PQ) et vec(QR) ne sont pas colinéaires, donc les points P, Q et R ne sont pas alignés.

**4. a)** P, Q, R ne sont pas alignés. PQRS est un parallélogramme si et seulement si vec(PS) = vec(QR). Avec S(x, y) : vec(PS)(x + 1, y + 2) et vec(QR)(1, 4), donc x + 1 = 1 et y + 2 = 4. Ainsi S(0, 2).

**b)** Ω est le milieu de la diagonale [PR] : Ω((−1 + 4)/2, (−2 + 3)/2), soit Ω(3/2, 1/2), c'est-à-dire Ω(1.5, 0.5).
Contrôle : le milieu de [QS] est ((3 + 0)/2, (−1 + 2)/2) = (1.5, 0.5).

**5. a)** Le repère est orthonormé :

    PQ = √(4² + 1²) = √17,    QR = √(1² + 4²) = √17
    PR = √(5² + 5²) = √50 = 5√2,    QS = √((0 − 3)² + (2 + 1)²) = √18 = 3√2

**b)** PQRS est un parallélogramme qui a deux côtés consécutifs de même longueur (PQ = QR = √17) : c'est un losange.
Ses diagonales n'ont pas la même longueur (5√2 ≠ 3√2), donc ce n'est pas un rectangle, et ce n'est pas un carré.

**c)** L'aire d'un losange est le demi-produit de ses diagonales :

    aire = (PR × QS) / 2 = (5√2 × 3√2) / 2 = 30 / 2 = 15

**6. a)** vec(PR)(5, 5) et vec(PT)(x + 1, 10). P, R et T sont alignés si et seulement s'il existe un réel k tel que vec(PT) = k vec(PR), c'est-à-dire x + 1 = 5k et 10 = 5k. La deuxième égalité donne k = 2, puis x + 1 = 10, soit x = 9. T(9, 8).

**b)** Pour x = 9 : vec(PT) = 2 vec(PR), ce qui équivaut à : R est le milieu de [PT].
Contrôle par les coordonnées : ((−1 + 9)/2, (−2 + 8)/2) = (4, 3), ce sont bien les coordonnées de R.

---

## Exercice 2 — Problème : choisir un repère pour démontrer

ABCD est un carré de côté 4 cm. On note E le milieu du côté [BC] et F le point du côté [CD] tel que CF = 1 cm.
On munit le plan du repère orthonormé (A, vec(AU), vec(AV)), où U est le point de [AB] et V le point de [AD] tels que AU = AV = 1 cm.

1. Donner les coordonnées des points A, B, C, D, E et F.
2. a) Calculer les distances AE, EF et AF.
   b) Montrer que le triangle AEF est rectangle en E.
   c) Calculer l'aire du triangle AEF de deux façons : à l'aide de AE et EF, puis en retranchant de l'aire du carré les aires de trois triangles rectangles.
3. Soit G le point de la droite (DC) tel que vec(DG) = 2 vec(DC).
   a) Calculer les coordonnées de G.
   b) Montrer que les points A, E et G sont alignés et que E est le milieu de [AG].
4. a) Calculer FG. Quelle est la nature du triangle AFG ?
   b) En déduire que la droite (EF) est la médiatrice du segment [AG]. Retrouver ainsi le résultat du 2. b).
5. On note M le milieu de [AF].
   a) Calculer les coordonnées de M, puis les distances MA, ME et MF.
   b) Que représente le point M pour le triangle AEF ? Le point B appartient-il au cercle circonscrit au triangle AEF ?
6. On reprend la même construction avec un carré ABCD de côté a (a est un réel strictement positif) : E est le milieu de [BC] et F le point de [CD] tel que CF = a/4. On utilise le même repère (A, vec(AU), vec(AV)).
   a) Donner les coordonnées de E et de F en fonction de a.
   b) Montrer que le triangle AEF est encore rectangle en E.

### Corrigé

**1.** Les axes du repère sont (AB) et (AD), qui sont perpendiculaires, et l'unité est le centimètre :

    A(0, 0),   B(4, 0),   C(4, 4),   D(0, 4)

E est le milieu de [BC] : E((4 + 4)/2, (0 + 4)/2), soit E(4, 2).
F est sur [CD], qui est porté par la parallèle à l'axe des abscisses passant par D (ordonnée 4), avec CF = 1 et DF = 3 : F(3, 4).

**2. a)** Le repère est orthonormé :

    AE = √(4² + 2²) = √20 = 2√5,   EF = √((3 − 4)² + (4 − 2)²) = √5,   AF = √(3² + 4²) = √25 = 5

**b)** AE² + EF² = 20 + 5 = 25 = AF². D'après la réciproque du théorème de Pythagore, le triangle AEF est rectangle en E.

**c)** Première façon : aire(AEF) = (AE × EF) / 2 = (2√5 × √5) / 2 = 10 / 2 = 5 cm².
Deuxième façon : le carré a pour aire 16. On retire les triangles rectangles ABE (aire 4 × 2 / 2 = 4), ECF (aire 2 × 1 / 2 = 1) et FDA (aire 3 × 4 / 2 = 6) :

    aire(AEF) = 16 − 4 − 1 − 6 = 5 cm²

**3. a)** vec(DC)(4, 0), donc vec(DG)(8, 0). Avec G(x, y) : x − 0 = 8 et y − 4 = 0. Donc G(8, 4). (G est le symétrique de D par rapport à C.)

**b)** vec(AE)(4, 2) et vec(AG)(8, 4), donc vec(AG) = 2 vec(AE). Les vecteurs vec(AG) et vec(AE) sont colinéaires : A, E et G sont alignés. De plus vec(AG) = 2 vec(AE) équivaut à : E est le milieu de [AG].
Contrôle : ((0 + 8)/2, (0 + 4)/2) = (4, 2) = E.

**4. a)** FG = √((8 − 3)² + (4 − 4)²) = 5 et FA = 5 (question 2. a)). Donc FA = FG : le triangle AFG est isocèle en F.

**b)** F est équidistant de A et de G, donc F est sur la médiatrice de [AG]. E est le milieu de [AG], donc E est aussi sur cette médiatrice. Comme E ≠ F, la médiatrice de [AG] est la droite (EF).
La médiatrice de [AG] est perpendiculaire à (AG) = (AE) : la droite (EF) est perpendiculaire à (AE), donc le triangle AEF est rectangle en E. On retrouve le 2. b).

**5. a)** M((0 + 3)/2, (0 + 4)/2), soit M(1.5, 2).

    MA = √(1.5² + 2²) = √6.25 = 2.5
    ME = √((4 − 1.5)² + (2 − 2)²) = 2.5
    MF = √((3 − 1.5)² + (4 − 2)²) = √6.25 = 2.5

**b)** MA = ME = MF : M est le centre du cercle circonscrit au triangle AEF, de rayon 2.5 cm. C'est le cercle de diamètre [AF] : le triangle AEF est rectangle en E et son hypoténuse est [AF].
MB = √((4 − 1.5)² + 2²) = √10.25 = √41 / 2 ≈ 3.2 ≠ 2.5 : le point B n'appartient pas à ce cercle.

**6. a)** A(0, 0), B(a, 0), C(a, a), D(0, a). E est le milieu de [BC] : E(a, a/2). F est sur [CD] avec CF = a/4, donc DF = 3a/4 : F(3a/4, a).

**b)**

    AE² = a² + (a/2)² = a² + a²/4 = 5a²/4
    EF² = (3a/4 − a)² + (a − a/2)² = a²/16 + a²/4 = 5a²/16
    AF² = (3a/4)² + a² = 9a²/16 + 16a²/16 = 25a²/16

AE² + EF² = 20a²/16 + 5a²/16 = 25a²/16 = AF². D'après la réciproque du théorème de Pythagore, le triangle AEF est rectangle en E, quel que soit le côté a du carré. Le choix d'un repère a permis de démontrer la propriété pour tous les carrés à la fois.
