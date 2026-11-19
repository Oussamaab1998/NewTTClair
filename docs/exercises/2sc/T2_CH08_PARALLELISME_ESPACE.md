# 2ème Sciences — Tome 2, Chapitre 8 : Parallélisme dans l'espace

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel 2005, p. 22 (« Activités géométriques ») : parallélisme dans l'espace ; montrer que deux droites, une droite et un plan, deux plans sont parallèles ; déterminer la section plane d'un solide usuel (cube, pavé, tétraèdre, pyramide, prisme). Mesures de grandeurs, p. 26 : longueurs et aires d'objets de l'espace.
- Manuel CNP (tome 2, p. 127–145) : deux droites sont parallèles si elles sont dans un même plan et parallèles dans ce plan ; une droite est parallèle à un plan si elle est parallèle à une droite de ce plan ; deux plans sont parallèles s'ils sont confondus ou sans point commun. Propriétés numérotées du manuel : deux droites parallèles à une même troisième sont parallèles (2) ; si deux droites sont parallèles, tout plan parallèle à l'une est parallèle à l'autre (4) ; théorème du toit (6) ; si deux plans sont parallèles, toute droite de l'un est parallèle à l'autre (7) ; si deux droites sécantes d'un plan sont parallèles à deux droites sécantes d'un autre plan, les deux plans sont parallèles (10) ; si deux plans sont parallèles, tout plan qui coupe l'un coupe l'autre et les droites d'intersection sont parallèles (12) ; deux plans parallèles à un même troisième sont parallèles (synthèse) ; sections planes du cube, du prisme et de la pyramide.
- Outils autorisés : ce chapitre, le chapitre 7 (axiomes, intersections de plans), la géométrie plane (Thalès et sa réciproque, droite des milieux, parallélogramme, trapèze, Pythagore). L'orthogonalité dans l'espace (chapitre 9) n'est pas utilisée.
- Notation : (ABC) est le plan passant par A, B et C ; vec(AB) est le vecteur AB, utilisé seulement à l'intérieur d'un plan (question 3. c) de l'exercice 1, dans le plan (ABC)) ; AB est une longueur.
- Toutes les affirmations sont vérifiées par `check_t2_ch08.py` : le cube (et aussi des parallélépipèdes quelconques, car les propriétés utilisées sont affines) et la pyramide y sont placés dans un repère, et chaque parallélisme, intersection, section, longueur et aire est recalculé exactement.

---

## Exercice 1 — Droites et plans parallèles dans un cube

ABCDEFGH est un cube : ABCD et EFGH sont deux faces opposées, et [AE], [BF], [CG], [DH] sont des arêtes. Les six faces sont donc les carrés ABCD, EFGH, ABFE, BCGF, CDHG et DAEH. On note I, J et K les milieux respectifs des arêtes [AB], [AD] et [AE].

1. a) Montrer que la droite (IJ) est parallèle à (BD) et que la droite (IK) est parallèle à (BE).
   b) En déduire que les plans (IJK) et (BDE) sont parallèles.
2. a) Montrer que BFHD est un parallélogramme. En déduire que (BD) est parallèle à (FH).
   b) Montrer de même que BCHE est un parallélogramme et que (BE) est parallèle à (CH).
   c) En déduire que les plans (BDE) et (CFH) sont parallèles, puis que les plans (IJK) et (CFH) sont parallèles.
3. a) Montrer que la droite (JK) est parallèle au plan (CFH).
   b) Justifier que le plan (ABC) coupe le plan (CFH) suivant la droite δ passant par C et parallèle à (BD).
   c) La droite δ coupe la droite (AB) en un point X. Montrer que B est le milieu de [AX]. En déduire le point où la droite (AB) perce le plan (CFH).
4. On note U le centre de la face ADHE et V le centre de la face BCGF.
   a) Justifier que les points A, B, G, H sont coplanaires, ainsi que les points C, D, E, F.
   b) Montrer que U et V appartiennent aux deux plans (ABG) et (CDE).
   c) En déduire l'intersection des plans (ABG) et (CDE), et montrer qu'elle est parallèle à (AB).

### Corrigé

**1. a)** Dans le triangle ABD, I et J sont les milieux de [AB] et [AD] : d'après la droite des milieux, (IJ) est parallèle à (BD).
Dans le triangle ABE, I et K sont les milieux de [AB] et [AE] : (IK) est parallèle à (BE).

**b)** (IJ) et (IK) sont deux droites sécantes (en I) du plan (IJK) ; (BD) et (BE) sont deux droites sécantes (en B) du plan (BDE). Les deux premières sont parallèles respectivement aux deux autres : d'après la propriété 10, les plans (IJK) et (BDE) sont parallèles. Ils sont même strictement parallèles, car I n'appartient pas au plan (BDE) : sinon la droite (BI) = (AB) serait dans (BDE), et ce plan contiendrait les quatre points A, B, D, E, qui ne sont pas coplanaires (E n'est pas dans le plan de la face ABCD).

**2. a)** (BF) et (DH) sont parallèles à (AE) (faces carrées ABFE et ADHE), donc parallèles entre elles (propriété 2) : les points B, F, H, D sont coplanaires.
Dans ce plan, les côtés [BF] et [DH] sont parallèles et de même longueur (ce sont des arêtes du cube).
Les côtés [BD] et [FH] ne se coupent pas : ils sont contenus dans les plans (ABC) et (EFG), qui sont strictement parallèles ((EF) et (EH) sont parallèles à (AB) et (AD), propriété 10, et E n'est pas dans (ABC)).
Le quadrilatère BFHD n'est donc pas croisé et il a deux côtés opposés parallèles et de même longueur : c'est un parallélogramme.
Ses côtés opposés [BD] et [FH] sont donc parallèles : (BD) est parallèle à (FH).

**b)** (BC) est parallèle à (AD) (face ABCD) et (AD) est parallèle à (EH) (face ADHE), donc (BC) est parallèle à (EH) (propriété 2) : les points B, C, H, E sont coplanaires.
Dans ce plan, les côtés [BC] et [EH] sont parallèles et de même longueur (arêtes du cube).
Les côtés [BE] et [CH] ne se coupent pas : ils sont contenus dans les plans (ABF) et (DCG), qui sont strictement parallèles ((DC) et (DH) sont parallèles à (AB) et (AE), propriété 10, et D n'est pas dans (ABF)).
Le quadrilatère BCHE n'est donc pas croisé et il a deux côtés opposés parallèles et de même longueur : c'est un parallélogramme. Ses côtés opposés [BE] et [CH] sont parallèles : (BE) est parallèle à (CH).

**c)** (BD) et (BE) sont sécantes en B dans le plan (BDE) ; (FH) et (CH) sont sécantes en H dans le plan (CFH). D'après 2. a) et 2. b), (BD) est parallèle à (FH) et (BE) est parallèle à (CH) : la propriété 10 donne (BDE) parallèle à (CFH).
Les plans (IJK) et (CFH) sont parallèles au même plan (BDE), donc ils sont parallèles entre eux.

**3. a)** La droite (JK) est contenue dans le plan (IJK), qui est parallèle au plan (CFH). D'après la propriété 7, toute droite de l'un est parallèle à l'autre : (JK) est parallèle à (CFH).

**b)** Le plan (ABC) coupe le plan (BDE) suivant la droite (BD) (les deux plans contiennent B et D et sont distincts). Comme (BDE) et (CFH) sont parallèles, la propriété 12 dit que (ABC) coupe aussi (CFH), suivant une droite parallèle à (BD).
Le point C appartient aux plans (ABC) et (CFH) : cette droite d'intersection est la droite δ passant par C et parallèle à (BD).

**c)** Dans le plan (ABC), δ n'est pas parallèle à (AB) (elle est parallèle à (BD)), donc elle coupe (AB) en un point X.
Dans le quadrilatère BDCX : (CX) = δ est parallèle à (BD), et (BX) = (AB) est parallèle à (DC). C'est un parallélogramme, donc vec(BX) = vec(DC). Or vec(DC) = vec(AB) (ABCD est un carré). Donc vec(BX) = vec(AB) : B est le milieu de [AX].
X appartient à δ, donc au plan (CFH), et à la droite (AB). La droite (AB) n'est pas contenue dans (CFH) (sinon (CFH) contiendrait A, B et C, il serait le plan (ABC), qui ne contient pas F) : elle perce donc le plan (CFH) en un seul point, X, le symétrique de A par rapport à B.

**4. a)** (AB) est parallèle à (DC) (face ABCD) et (DC) est parallèle à (HG) (face CDHG) : deux droites parallèles à une même troisième sont parallèles, donc (AB) est parallèle à (HG). Deux droites parallèles sont dans un même plan : A, B, G, H sont coplanaires.
De même, (DC) est parallèle à (AB), qui est parallèle à (EF) (face ABFE) : (DC) est parallèle à (EF), et C, D, E, F sont coplanaires.

**b)** U est le centre du carré ADHE, c'est-à-dire le point commun de ses diagonales [AH] et [DE].

- U ∈ (AH), et A, H sont dans le plan (ABG) = (ABGH) : U ∈ (ABG).
- U ∈ (DE), et D, E sont dans le plan (CDE) = (CDEF) : U ∈ (CDE).

De même, V est le point commun des diagonales [BG] et [CF] du carré BCGF : V ∈ (BG) ⊂ (ABG) et V ∈ (CF) ⊂ (CDE).

**c)** Les plans (ABG) et (CDE) sont distincts : si C était dans le plan (ABGH), ce plan contiendrait A, B et C, il serait le plan (ABC) de la face ABCD, qui ne contient pas H. Les deux plans ont les points communs U et V, et U ≠ V : U est dans le plan (ADE) et V dans le plan (BCF), plans de faces opposées strictement parallèles ((BC) et (BF) sont parallèles à (AD) et (AE), propriété 10, et B n'est pas dans (ADE)). Leur intersection est donc la droite (UV).
Le plan (ABG) contient (AB), le plan (CDE) contient (CD), et (AB) est parallèle à (CD). D'après le théorème du toit, la droite d'intersection (UV) est parallèle à (AB) et à (CD).
Pour la tracer : on joint le centre U de la face ADHE au centre V de la face opposée BCGF ; (UV) est parallèle aux arêtes [AB], [DC], [HG] et [EF].

---

## Exercice 2 — Une pyramide sciée parallèlement à une face

Un artisan dispose d'une pyramide en bois SABCD de sommet S. Sa base ABCD est un carré de côté 6 cm et ses quatre arêtes latérales [SA], [SB], [SC] et [SD] mesurent aussi 6 cm.

1. a) Quelle est la nature des faces latérales ? Calculer l'aire de la face SAB.
   b) Montrer que les plans (SAB) et (SCD) sont sécants suivant la droite Δ passant par S et parallèle à (AB).
2. Soit x un réel tel que 0 < x < 6 et M le point de l'arête [BC] tel que BM = x. L'artisan scie la pyramide suivant le plan P passant par M et parallèle au plan (SAB).
   a) Montrer que P coupe le plan (ABC) suivant la droite passant par M et parallèle à (AB). Cette droite coupe [AD] en N. Calculer AN et MN.
   b) Montrer que P coupe la face SBC suivant un segment [MR] parallèle à (SB), où R est un point de [SC], et la face SAD suivant un segment [NQ] parallèle à (SA), où Q est un point de [SD]. Calculer MR, NQ, SR et SQ en fonction de x.
   c) Montrer que (QR) est parallèle à (CD) et calculer QR en fonction de x.
3. La section de la pyramide par le plan P est le quadrilatère MNQR.
   a) Montrer que MNQR est un trapèze isocèle.
   b) Calculer son périmètre p(x) en fonction de x.
4. a) Montrer que l'aire de la section est

       𝒜(x) = (√3/4)(36 − x²)

   b) Pour quelle valeur de x l'aire de la section est-elle égale à la moitié de l'aire de la face SAB ? Donner la valeur exacte, puis une valeur approchée à 0.01 près.
   c) Calculer p(x) et 𝒜(x) lorsque M est le milieu de [BC].

### Corrigé

**1. a)** Chaque face latérale a trois côtés de longueur 6 (par exemple SA = SB = AB = 6) : ce sont des triangles équilatéraux de côté 6.
La hauteur d'un triangle équilatéral de côté 6 mesure 6√3/2 = 3√3, donc l'aire de SAB est (1/2) × 6 × 3√3 = 9√3 ≈ 15.59 cm².

**b)** Les plans (SAB) et (SCD) sont distincts (C n'est pas dans (SAB)) et ont le point commun S : ils sont sécants suivant une droite Δ passant par S.
Le plan (SAB) contient (AB), le plan (SCD) contient (CD), et (AB) est parallèle à (CD) (côtés opposés du carré). D'après le théorème du toit, Δ est parallèle à (AB) (et à (CD)).

**2. a)** Le plan (ABC) coupe le plan (SAB) suivant la droite (AB). Les plans P et (SAB) sont parallèles, donc (propriété 12) le plan (ABC) coupe aussi P, suivant une droite parallèle à (AB). Cette droite passe par M, qui appartient à P et à (ABC).
Dans le carré ABCD, la parallèle à (AB) passant par M ∈ [BC] coupe [AD] en N, et ABMN est un rectangle : AN = BM = x et MN = AB = 6.

**b)** Le plan (SBC) coupe (SAB) suivant (SB) ; d'après la propriété 12, il coupe P suivant une droite parallèle à (SB), qui passe par M. Dans le triangle SBC, cette parallèle à (SB) passant par M ∈ [BC] coupe [SC] en un point R.
Thalès dans le triangle CBS, avec (MR) parallèle à (BS) :

    CM/CB = CR/CS = MR/BS,   avec CM = 6 − x,   donc   CR = MR = 6 (6 − x)/6 = 6 − x

D'où MR = 6 − x et SR = SC − CR = x.
De même, le plan (SAD) coupe (SAB) suivant (SA), donc il coupe P suivant la parallèle à (SA) passant par N, qui coupe [SD] en Q. Thalès dans le triangle DAS, avec DN = 6 − x :

    DN/DA = DQ/DS = NQ/AS,   donc   DQ = NQ = 6 − x   et   SQ = x

**c)** Q et R appartiennent à P et au plan (SCD), qui sont distincts : leur intersection est la droite (QR). Le plan (SCD) coupe les plans parallèles P et (SAB) ; d'après la propriété 12, les droites d'intersection (QR) et Δ sont parallèles. Comme Δ est parallèle à (CD), (QR) est parallèle à (CD).
Thalès dans le triangle SDC, avec (QR) parallèle à (DC) : QR/DC = SQ/SD = x/6, donc QR = x.
(On peut aussi utiliser la réciproque de Thalès : SQ/SD = SR/SC = x/6.)

**3. a)** Les arêtes [AB], [SA] et [SB] sont dans le plan (SAB), strictement parallèle à P, et (CD) est parallèle à (AB) sans couper P (C n'est pas sur la droite (MN)) : ces quatre arêtes ne rencontrent pas P. Le plan P coupe donc exactement les arêtes [BC], [AD], [SD] et [SC], en M, N, Q et R. Les quatre côtés de la section sont [MN] (dans la base), [NQ] (dans la face SAD), [QR] (dans la face SCD) et [RM] (dans la face SBC).

- (MN) est parallèle à (AB), et (QR) est parallèle à (CD), elle-même parallèle à (AB) : (MN) et (QR) sont parallèles.
- MN = 6 et QR = x < 6 : les côtés [MN] et [QR] n'ont pas la même longueur, donc MNQR n'est pas un parallélogramme. C'est un trapèze de bases [MN] et [QR].
- Ses deux autres côtés vérifient NQ = MR = 6 − x : MNQR est un trapèze isocèle.

**b)** p(x) = MN + NQ + QR + RM = 6 + (6 − x) + x + (6 − x) = 18 − x.

**4. a)** Dans le plan P, on note Q' et R' les projetés orthogonaux de Q et R sur la droite (MN). Le trapèze étant isocèle, NQ' = MR' = (MN − QR)/2 = (6 − x)/2.
Pythagore dans le triangle NQ'Q, rectangle en Q' :

    QQ'² = NQ² − NQ'² = (6 − x)² − (6 − x)²/4 = (3/4)(6 − x)²,   donc   QQ' = (√3/2)(6 − x)

Aire du trapèze : 𝒜(x) = ((MN + QR)/2) × QQ' = ((6 + x)/2) × (√3/2)(6 − x) = (√3/4)(36 − x²).
(Remarque : c'est l'aire d'un triangle équilatéral de côté 6 diminuée de celle d'un triangle équilatéral de côté x.)

**b)** La moitié de l'aire de SAB est 9√3/2. Pour 0 < x < 6 :

    (√3/4)(36 − x²) = 9√3/2 ⟺ 36 − x² = 18 ⟺ x² = 18 ⟺ x = 3√2   (car x > 0)

x = 3√2 ≈ 4.24 cm, qui appartient bien à ]0, 6[.

**c)** M est le milieu de [BC] pour x = 3 : p(3) = 18 − 3 = 15 cm et 𝒜(3) = (√3/4)(36 − 9) = 27√3/4 ≈ 11.69 cm².
Dans ce cas, N, Q et R sont les milieux de [AD], [SD] et [SC].
