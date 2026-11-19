# 2ème Sciences — Tome 1, Chapitre 9 : Rotations

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 22 (activités géométriques) : rotation d'angle dont une mesure appartient à [0, π]. Aptitudes : construire l'image d'un point par une rotation, reconnaître l'image d'une figure, reconnaître qu'une application du plan est une rotation, reconnaître les éléments de symétrie d'une figure plane ; résoudre des problèmes d'alignement, de concours, de construction et de lieux géométriques en utilisant les propriétés d'une rotation.
- Manuel CNP (tome 1, chapitre 9, p. 148–164) : mesure d'un angle en radians (rapport L/r de la longueur L de l'arc intercepté au rayon r ; l'angle plat mesure π rad) ; rotation directe et rotation indirecte de centre O et d'angle α ∈ ]0, π[ (O est invariant et, pour M ≠ O, OM' = OM et l'angle MOM' mesure α ; le sens direct est par convention le sens contraire du mouvement des aiguilles d'une montre) ; l'angle π donne la symétrie centrale, l'angle 0 l'identité ; quart de tour (angle π/2) ; une rotation conserve les distances, les angles, l'alignement, le milieu, le barycentre (admis), le parallélisme, l'orthogonalité et le contact ; image d'un segment, d'une droite, d'un cercle (même rayon, centre image) ; l'image d'une droite par un quart de tour lui est perpendiculaire ; figures globalement invariantes, éléments de symétrie.
- Pas d'angles orientés en 2ème (ils sont au programme de 3ème) : chaque rotation est donnée par son centre, son sens (direct ou indirect) et une mesure en radians de son angle géométrique, prise dans [0, π]. Dans la copie texte du manuel, la différence entre rotation directe et rotation indirecte n'apparaît que sur les figures : la définition est donc rappelée dans chaque énoncé (« On rappelle que … »). Le radian n'est pas cité dans la liste des contenus du programme : c'est le manuel qui l'introduit au début de ce chapitre.
- Outils autorisés : ce chapitre, les chapitres 2 (forme canonique, équations du second degré) et 5 à 8 (calcul vectoriel, barycentre, translations, homothéties), les acquis de 1ère année (Pythagore, Thalès et droite des milieux, angles correspondants, triangles isocèles et équilatéraux, somme des angles d'un triangle, losange, carré). Pas de trigonométrie des réels ni de formule d'Al-Kashi (tome 2). Les figures sont décrites en mots, sans repère.
- Notation : vec(AB) est le vecteur AB et AB la distance ; « angle AOB » est l'angle géométrique, mesuré en radians dans [0, π] ; [Bx) est une demi-droite d'origine B.
- Toutes les affirmations des corrigés sont vérifiées par `check_t1_ch09.py` (chaque figure est placée dans un repère à l'intérieur du script, le sens direct étant celui des axes ; calcul exact en fractions et en nombres de la forme a + b√3 ; chaque image est contrôlée à la fois par le calcul et par la définition du manuel : même distance au centre, même angle, sens donné par le signe d'un déterminant).

---

## Exercice 1 — Radians, images par une rotation, carré inscrit dans un carré

Le plan est orienté : le sens direct est le sens contraire du mouvement des aiguilles d'une montre. On rappelle que, pour un point O et un réel α de ]0, π[, l'image d'un point M distinct de O par la rotation directe (respectivement indirecte) de centre O et d'angle α est le point M' tel que OM' = OM et que l'angle MOM' mesure α, M' étant obtenu en tournant autour de O à partir de M dans le sens direct (respectivement indirect) ; le point O est sa propre image. Le quart de tour direct (respectivement indirect) de centre O est la rotation directe (respectivement indirecte) de centre O et d'angle π/2.

Soit ABCD un carré de côté 4 et de centre O tel que D soit l'image de B par le quart de tour direct de centre A : les sommets A, B, C, D se succèdent dans le sens direct. On note r la rotation directe de centre O et d'angle π/2.

1. a) Convertir en radians les mesures 15° et 135°, puis convertir en degrés les mesures 3π/5 rad et 7π/12 rad.
   b) Calculer OA et donner la mesure en radians de l'angle AOB. En déduire la longueur exacte de l'arc AB du cercle circonscrit au carré qui ne contient pas C, puis une valeur approchée à 10⁻² près.
2. a) Déterminer r(A), r(B), r(C) et r(D). En déduire l'image du carré ABCD par r.
   b) Déterminer l'image par r de la droite (AC).
   c) Préciser le sens et l'angle de la rotation de centre O qui transforme A en C, puis de la rotation de centre O qui transforme A en D.
3. Soit x un réel de l'intervalle ]0, 4[. On place les points M sur [AB], N sur [BC], P sur [CD] et Q sur [DA] tels que AM = BN = CP = DQ = x.
   a) Montrer que r(M) = N, r(N) = P, r(P) = Q et r(Q) = M.
   b) En déduire que MNPQ est un carré de centre O.
   c) Montrer que l'aire du carré MNPQ est S(x) = 2x² − 8x + 16.
   d) Pour quelle valeur de x l'aire de MNPQ est-elle minimale ? Quelle est cette aire minimale ? Pour quelles valeurs de x a-t-on S(x) = 10 ?
4. Soit E l'image de B par la rotation directe de centre A et d'angle π/3.
   a) Montrer que le triangle ABE est équilatéral et que E est sur la médiatrice de [AB]. Montrer que E est à l'intérieur du carré ABCD.
   b) Calculer en radians les angles DAE, ADE et EDC, puis l'angle DEC.
   c) Montrer que E est l'image de D par une rotation de centre A dont on précisera le sens et l'angle.

### Corrigé

**1. a)** L'angle plat mesure 180° et π rad : une mesure de d degrés vaut dπ/180 radians.

- 15° = 15π/180 rad = π/12 rad ; 135° = 135π/180 rad = 3π/4 rad.
- 3π/5 rad = (3/5) × 180° = 108° ; 7π/12 rad = (7/12) × 180° = 105°.

**b)** Les diagonales du carré ont la même longueur, le même milieu O et sont perpendiculaires. D'après Pythagore, AC² = 4² + 4² = 32, donc AC = 4√2 et OA = AC/2 = 2√2.
(AC) ⟂ (BD), donc l'angle AOB est droit : il mesure π/2 rad.
Le cercle circonscrit au carré a pour centre O et pour rayon OA = 2√2. L'arc AB qui ne contient pas C est intercepté par l'angle AOB ; sa longueur L vérifie L / OA = π/2, donc

    L = 2√2 × π/2 = π√2 ≈ 4.44

**2. a)** OA = OB = OC = OD = 2√2 et les angles AOB, BOC, COD et DOA sont droits. Les sommets se succèdent dans le sens direct : on passe de A à B en tournant autour de O dans le sens direct. Donc r(A) = B, et de même r(B) = C, r(C) = D et r(D) = A.
L'image du carré ABCD est le carré BCDA, c'est-à-dire le carré lui-même : le carré ABCD est globalement invariant par r.

**b)** r(A) = B et r(C) = D, donc l'image de la droite (AC) est la droite (BD). On retrouve que l'image d'une droite par un quart de tour lui est perpendiculaire : (BD) ⟂ (AC).

**c)** OA = OC et l'angle AOC est plat (O est le milieu de [AC]) : A est transformé en C par la rotation de centre O et d'angle π (directe ou indirecte, c'est la même), c'est-à-dire par la symétrie centrale de centre O.
OA = OD et l'angle AOD mesure π/2. Comme r(D) = A, on passe de D à A en tournant dans le sens direct, donc de A à D en tournant dans le sens indirect : A est transformé en D par le quart de tour indirect de centre O (rotation indirecte de centre O et d'angle π/2).

**3. a)** r(A) = B et r(B) = C, donc r transforme le segment [AB] en le segment [BC]. Ainsi r(M) appartient à [BC] et, comme une rotation conserve les distances, B r(M) = r(A) r(M) = AM = x. Le seul point de [BC] situé à la distance x de B est N : r(M) = N.
De même, r transforme [BC] en [CD] (r(B) = C et r(C) = D) et C r(N) = BN = x, donc r(N) = P ; puis r(P) = Q et r(Q) = M.

**b)** r transforme [MN] en [NP], [NP] en [PQ] et [PQ] en [QM] : MN = NP = PQ = QM, donc MNPQ est un losange. L'image par le quart de tour r de la droite (MN) est la droite (NP), qui lui est perpendiculaire : l'angle MNP est droit. Un losange qui a un angle droit est un carré.
La symétrie de centre O transforme A en C et B en D, donc le segment [AB] en le segment [CD], et M en le point de [CD] situé à la distance AM = x de C, c'est-à-dire P. Donc O est le milieu de [MP] ; de même O est le milieu de [NQ]. O est le centre du carré MNPQ.

**c)** Le triangle MBN est rectangle en B, avec MB = 4 − x et BN = x. D'après Pythagore :

    MN² = (4 − x)² + x² = 16 − 8x + x² + x² = 2x² − 8x + 16

L'aire du carré MNPQ est MN², donc S(x) = 2x² − 8x + 16.

**d)** Forme canonique :

    S(x) = 2(x² − 4x) + 16 = 2[(x − 2)² − 4] + 16 = 2(x − 2)² + 8

Pour tout x, 2(x − 2)² ≥ 0, donc S(x) ≥ 8, avec égalité si et seulement si x = 2 (qui appartient à ]0, 4[). L'aire est minimale pour x = 2 (M, N, P, Q sont alors les milieux des côtés) et l'aire minimale vaut 8, la moitié de l'aire 16 du carré ABCD.

    S(x) = 10 ⟺ 2(x − 2)² = 2 ⟺ (x − 2)² = 1 ⟺ x − 2 = 1 ou x − 2 = −1 ⟺ x = 3 ou x = 1

Les deux valeurs 1 et 3 appartiennent à ]0, 4[ : S(x) = 10 pour x = 1 et pour x = 3.

**4. a)** Par définition, AE = AB et l'angle BAE mesure π/3. Le triangle ABE est isocèle en A ; ses angles à la base mesurent (π − π/3)/2 = π/3 : il est équilatéral, AB = AE = BE = 4. Comme EA = EB, E est sur la médiatrice de [AB].
La demi-droite [AD) s'obtient en tournant [AB) de π/2 dans le sens direct, et [AE) en la tournant de π/3 < π/2 dans le même sens : [AE) est à l'intérieur de l'angle droit BAD, donc E est du même côté de (AB) que D.
La médiatrice de [AB] est perpendiculaire à (AB) et passe par les milieux de [AB] et de [DC]. La distance de E à (AB) est la hauteur du triangle équilatéral ABE : √(4² − 2²) = √12 = 2√3 ≈ 3.46 < 4. Le point E est donc sur cette médiatrice, strictement entre (AB) et (DC) : il est à l'intérieur du carré.

**b)**

- [AE) est à l'intérieur de l'angle BAD : angle DAE = π/2 − π/3 = π/6.
- AD = 4 = AE : le triangle ADE est isocèle en A, donc angle ADE = angle AED = (π − π/6)/2 = 5π/12.
- E est à l'intérieur du carré, donc [DE) est à l'intérieur de l'angle droit ADC : angle EDC = π/2 − 5π/12 = π/12.
- La médiatrice de [AB] est aussi celle de [DC], donc ED = EC : le triangle DEC est isocèle en E, ses angles en D et en C mesurent π/12, et angle DEC = π − 2 × π/12 = 5π/6.

**c)** AD = AE et l'angle DAE mesure π/6 : E est l'image de D par une rotation de centre A et d'angle π/6. Pour aller de [AB) à [AD) on tourne de π/2 dans le sens direct, et pour aller de [AB) à [AE) de π/3 seulement dans le même sens : pour aller de [AD) à [AE) on revient en arrière de π/6, c'est-à-dire qu'on tourne dans le sens indirect.
E est l'image de D par la rotation indirecte de centre A et d'angle π/6.

---

## Exercice 2 — Deux triangles équilatéraux : longueurs égales, triangle des milieux, lieu géométrique

Le plan est orienté : le sens direct est le sens contraire du mouvement des aiguilles d'une montre. On rappelle que, pour un point O et un réel α de ]0, π[, l'image d'un point M distinct de O par la rotation directe (respectivement indirecte) de centre O et d'angle α est le point M' tel que OM' = OM et que l'angle MOM' mesure α, M' étant obtenu en tournant autour de O à partir de M dans le sens direct (respectivement indirect) ; le point O est sa propre image.

Soit A, B et C trois points alignés dans cet ordre, avec AB = 4 et BC = 2. On note D l'image de A par la rotation indirecte de centre B et d'angle π/3, et E l'image de C par la rotation directe de centre B et d'angle π/3. On note r la rotation directe de centre B et d'angle π/3.

1. a) Montrer que les triangles ABD et BCE sont équilatéraux. Faire une figure, en plaçant A à gauche de B et C à droite de B sur une droite horizontale ; vérifier que D et E sont du même côté de la droite (AC).
   b) Montrer que r(D) = A. En déduire que DC = AE.
2. On note H le milieu de [BC]. Montrer que la droite (EH) est perpendiculaire à (AC), puis calculer EH et AE.
3. On note I le milieu de [AE] et J le milieu de [DC].
   a) Montrer que r(J) = I. En déduire que le triangle BIJ est équilatéral.
   b) On note I₀ le projeté orthogonal de I sur la droite (AC). Montrer que I₀ est le milieu de [AH], puis calculer BI.
   c) Calculer le périmètre et l'aire du triangle BIJ.
4. Dans cette question, les points A et B sont fixes (donc D aussi) et C est un point variable de la demi-droite [Bx) d'origine B opposée à la demi-droite [BA), avec C ≠ B. Les points E, I et J sont définis comme ci-dessus. On note K le milieu de [AB] et L le milieu de [BD].
   a) Justifier que le triangle BIJ est équilatéral pour toute position de C.
   b) Montrer que E décrit une demi-droite [By) d'origine B, privée de B, que l'on construira. Montrer que la droite (By) est parallèle à (AD).
   c) Montrer que vec(KI) = (1/2) vec(BE). En déduire que I décrit la demi-droite [KL) privée de K.
   d) Pour quelle position de C le point I appartient-il à la droite (BD) ? Quelle est alors la nature du quadrilatère ABED ?

### Corrigé

**1. a)** BD = BA = 4 et l'angle ABD mesure π/3 : le triangle ABD est isocèle en B, ses angles à la base mesurent (π − π/3)/2 = π/3, il est équilatéral. De même BE = BC = 2 et l'angle CBE mesure π/3 : le triangle BCE est équilatéral.
Figure : [BC) est dirigée vers la droite ; en la tournant de π/3 dans le sens direct (sens contraire des aiguilles d'une montre), on obtient une demi-droite dirigée vers le haut et la droite : E est au-dessus de (AC). [BA) est dirigée vers la gauche ; en la tournant de π/3 dans le sens indirect, on obtient une demi-droite dirigée vers le haut et la gauche : D est aussi au-dessus de (AC). Ainsi D est le sommet du triangle équilatéral construit sur [AB] au-dessus de (AC), et E celui du triangle équilatéral construit sur [BC], du même côté.

**b)** On passe de A à D en tournant autour de B de π/3 dans le sens indirect, avec BD = BA. On passe donc de D à A en tournant de π/3 dans le sens direct : A = r(D).
r(D) = A et r(C) = E, donc r transforme le segment [DC] en le segment [AE]. Une rotation conserve les distances : DC = AE.

**2.** Dans le triangle équilatéral BCE, la médiane (EH) est aussi une hauteur : (EH) ⟂ (BC), c'est-à-dire (EH) ⟂ (AC).
Dans le triangle BHE rectangle en H : EH² = BE² − BH² = 4 − 1 = 3, donc EH = √3.
B est entre A et H, donc AH = AB + BH = 4 + 1 = 5. Dans le triangle AHE rectangle en H :

    AE² = AH² + EH² = 25 + 3 = 28,   AE = √28 = 2√7

D'après le 1. b), on a aussi DC = 2√7.

**3. a)** Une rotation conserve le milieu. J est le milieu de [DC], r(D) = A et r(C) = E, donc r(J) est le milieu de [AE] : r(J) = I.
J n'est pas le point B (J est au-dessus de (AC), à mi-hauteur de D). Par définition de r, BI = BJ et l'angle JBI mesure π/3 : le triangle BIJ est isocèle en B avec un angle au sommet de π/3, il est équilatéral.

**b)** Les droites (II₀) et (EH) sont toutes deux perpendiculaires à (AC), donc parallèles. Dans le triangle AHE, la parallèle à (EH) passant par le milieu I de [AE] coupe [AH] en son milieu (droite des milieux) : I₀ est le milieu de [AH], et II₀ = EH/2 = √3/2.
AI₀ = AH/2 = 5/2, donc I₀ est sur [AB] et BI₀ = AB − AI₀ = 4 − 5/2 = 3/2. Dans le triangle BI₀I rectangle en I₀ :

    BI² = BI₀² + II₀² = 9/4 + 3/4 = 3,   BI = √3

**c)** BIJ est équilatéral de côté √3 : son périmètre vaut 3√3 ≈ 5.20.
Sa hauteur vaut √(3 − 3/4) = √(9/4) = 3/2, donc son aire vaut (1/2) × √3 × 3/2 = 3√3/4 ≈ 1.30.

**4. a)** La démonstration du 3. a) n'utilise pas BC = 2 : pour toute position de C, r(D) = A et r(C) = E, donc r(J) = I (et J ≠ B, car J est à mi-hauteur de D au-dessus de (AC)). Le triangle BIJ est donc toujours équilatéral.

**b)** Soit C un point de [Bx) autre que B. Le point E = r(C) vérifie BE = BC et s'obtient en tournant [Bx) de π/3 autour de B dans le sens direct : E est sur la demi-droite [By) d'origine B qui fait avec [Bx) un angle de π/3, du côté de D, et BE = BC. Réciproquement, tout point N de [By) autre que B est l'image par r du point C de [Bx) tel que BC = BN.
E décrit donc la demi-droite [By) privée de B. Construction : [By) est la demi-droite [BE) de la figure du 1.
L'angle DAB mesure π/3 (triangle ABD équilatéral) et l'angle xBy mesure π/3 ; [AB) et [Bx) ont la même direction et le même sens, et D et [By) sont du même côté de (AC) : ce sont des angles correspondants égaux, donc (By) // (AD). De plus vec(BE) et vec(AD) ont le même sens.

**c)** Dans le triangle ABE, K est le milieu de [AB] et I le milieu de [AE] : d'après la droite des milieux, vec(KI) = (1/2) vec(BE). (On peut aussi dire que l'homothétie de centre A et de rapport 1/2 transforme B en K et E en I.)
Lorsque E décrit [By) privée de B, le vecteur (1/2) vec(BE) décrit tous les vecteurs non nuls de même direction et de même sens que [By) : I décrit la demi-droite d'origine K, de même direction et de même sens que [By), privée de K.
Dans le triangle ABD, L est le milieu de [BD], donc vec(KL) = (1/2) vec(AD), qui a d'après le b) la même direction et le même sens que [By). Le lieu de I est donc la demi-droite [KL) privée du point K.
Contrôle avec les questions 1 à 3 : BE = 2, donc KI = 1 = KL/2 (KL = AD/2 = 2) ; dans cette position, I est le milieu de [KL].

**d)** Le point K n'est pas sur la droite (BD) (sinon A serait sur (BD)), donc la demi-droite [KL) ne rencontre la droite (BD) qu'en L. Ainsi I ∈ (BD) ⟺ I = L ⟺ vec(KI) = vec(KL) ⟺ (1/2) vec(BE) = (1/2) vec(AD) ⟺ vec(BE) = vec(AD).
Les vecteurs vec(BE) et vec(AD) ont le même sens ; ils sont égaux si et seulement si BE = AD = 4, c'est-à-dire BC = 4 : C est le point de [Bx) tel que BC = 4 (le symétrique de A par rapport à B).
Dans ce cas vec(BE) = vec(AD), donc ABED est un parallélogramme ; ses côtés consécutifs AB et AD mesurent 4 : ABED est un losange (formé des triangles équilatéraux ABD et BED).
