# 2ème Sciences — Tome 2, Chapitre 7 : Droites et plans de l'espace

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel 2005, p. 22 (« Activités géométriques ») et p. 26 (mesures de grandeurs) : le programme cite le parallélisme et l'orthogonalité dans l'espace, les sections planes, le plan médiateur et l'axe d'un cercle ; ce chapitre en pose les bases (plans, positions relatives, intersections) et revient sur les longueurs, aires et volumes des solides usuels.
- Manuel CNP (tome 2, p. 118–126 ; ce chapitre ne contient que des activités, sans synthèse ni exercices) : quatre axiomes admis (par trois points non alignés passe un plan et un seul ; un plan qui contient deux points distincts contient la droite qui les joint ; deux plans distincts qui ont un point commun sont sécants suivant une droite passant par ce point ; les résultats de la géométrie plane s'appliquent dans chaque plan de l'espace), détermination d'un plan (trois points non alignés, une droite et un point extérieur, deux droites sécantes), points et droites coplanaires, positions relatives de deux droites (coplanaires ou non), d'une droite et d'un plan, de deux plans, intersection de deux plans, point où une droite perce un plan (méthode du plan auxiliaire), diagonales, aires et volumes.
- Outils autorisés : ce chapitre, la géométrie plane (Thalès, droite des milieux, centre de gravité aux deux tiers de chaque médiane, Pythagore), le calcul vectoriel du tome 1 dans un plan de l'espace (axiome 4). Le parallélisme dans l'espace (chapitre 8) et l'orthogonalité dans l'espace (chapitre 9) ne sont pas utilisés : deux droites parallèles ici sont toujours dans un même plan connu.
- Notation : (ABC) est le plan passant par A, B et C ; vec(AB) est le vecteur AB ; AB est une longueur.
- Toutes les affirmations sont vérifiées par `check_t2_ch07.py` : chaque solide y est placé dans un repère (des tétraèdres au hasard pour l'exercice 1), et chaque intersection, alignement, milieu, centre de gravité et longueur est recalculé exactement.

---

## Exercice 1 — Positions relatives et intersections dans un tétraèdre

ABCD est un tétraèdre : les quatre points A, B, C et D ne sont pas dans un même plan. On note I le milieu de l'arête [AB], K le milieu de l'arête [AD] et J le point de l'arête [AC] tel que AJ = (2/3) AC.

1. a) Justifier que K n'appartient pas au plan (ABC). En déduire que les points I, J et K ne sont pas alignés.
   b) Les droites (IK) et (BD) sont-elles coplanaires ? Sont-elles sécantes ?
   c) Montrer que les droites (IJ) et (CD) ne sont pas coplanaires.
2. a) Montrer que les droites (IJ) et (BC) sont sécantes. On note L leur point d'intersection.
   b) Soit L' le point tel que C soit le milieu du segment [BL']. Montrer que J est le centre de gravité du triangle ABL'. En déduire que L' = L.
3. Montrer de même que les droites (JK) et (CD) sont sécantes en un point M tel que C est le milieu de [DM].
4. a) Déterminer l'intersection des plans (IJK) et (BCD).
   b) Montrer que BDLM est un parallélogramme. En déduire que les droites (LM) et (BD) sont parallèles et que LM = BD.
5. Dans le plan (ACD), on utilise la base (vec(AC), vec(AD)).
   a) Donner les composantes de vec(CK) et de vec(DJ). Montrer que les droites (CK) et (DJ) sont sécantes ; on note P leur point d'intersection.
   b) Donner les composantes de vec(DP'), où P' est le milieu de [CK]. En déduire que P est le milieu de [CK].
   c) Justifier que C n'appartient pas au plan (BDJ). En déduire le point où la droite (CK) perce le plan (BDJ).

### Corrigé

**1. a)** K est un point de la droite (AD), distinct de A. Si K appartenait au plan (ABC), ce plan contiendrait les deux points distincts A et K, donc toute la droite (AK) = (AD) (axiome 2), et en particulier D. Les quatre points A, B, C, D seraient dans un même plan : c'est faux. Donc K ∉ (ABC).
I ∈ [AB] et J ∈ [AC] sont dans le plan (ABC). Si I, J, K étaient alignés, K serait sur la droite (IJ), qui est contenue dans (ABC) : impossible. Donc I, J et K ne sont pas alignés ; ils déterminent le plan (IJK).

**b)** I ∈ (AB) et K ∈ (AD), donc les droites (IK) et (BD) sont contenues dans le plan (ABD) : elles sont coplanaires.
Dans le triangle ABD, I et K sont les milieux de [AB] et [AD] : d'après le théorème de la droite des milieux, (IK) est parallèle à (BD) (et IK = BD/2). Ces deux droites sont distinctes, donc elles ne sont pas sécantes : (IK) ∩ (BD) = ∅.

**c)** Raisonnons par l'absurde : supposons que (IJ) et (CD) soient contenues dans un même plan Q.
Q contient les points distincts J et C de la droite (AC), donc il contient la droite (AC), en particulier A. Q contient alors A, C et D, qui ne sont pas alignés : Q est le plan (ACD). Mais Q contient aussi I, donc la droite (AI) = (AB), et en particulier B. Ainsi B ∈ (ACD) : c'est faux, car ABCD est un tétraèdre.
Les droites (IJ) et (CD) ne sont pas coplanaires.

**2. a)** I ∈ (AB) et J ∈ (AC) : les droites (IJ) et (BC) sont dans le plan (ABC), donc coplanaires.
Si elles étaient parallèles, le théorème de Thalès dans le triangle ABC donnerait AI/AB = AJ/AC, c'est-à-dire 1/2 = 2/3 : c'est faux. Deux droites coplanaires non parallèles sont sécantes : (IJ) et (BC) se coupent en un point L.

**b)** Dans le triangle ABL', le point C est le milieu de [BL'], donc (AC) est la médiane issue de A. Le centre de gravité de ABL' est le point de [AC] situé aux deux tiers de cette médiane en partant de A : c'est le point J, puisque AJ = (2/3) AC.
I est le milieu de [AB], donc (L'I) est la médiane issue de L' ; elle passe par le centre de gravité J. Ainsi L', J et I sont alignés : L' ∈ (IJ).
De plus L' ∈ (BC), car C est le milieu de [BL']. Les droites (IJ) et (BC) sont sécantes : elles n'ont qu'un point commun, L. Donc L' = L, et C est le milieu de [BL].

**3.** (JK) et (CD) sont contenues dans le plan (ACD). Si elles étaient parallèles, Thalès dans le triangle ACD donnerait AJ/AC = AK/AD, soit 2/3 = 1/2 : c'est faux. Elles sont donc sécantes en un point M.
Soit M' le point tel que C soit le milieu de [DM']. Dans le triangle ADM', (AC) est la médiane issue de A et J, situé aux deux tiers de [AC] à partir de A, est le centre de gravité. K est le milieu de [AD], donc la médiane (M'K) passe par J : M' ∈ (JK). Comme M' ∈ (CD), on obtient M' = M. Donc C est le milieu de [DM].

**4. a)** L ∈ (IJ) et M ∈ (JK), donc L et M appartiennent au plan (IJK). L ∈ (BC) et M ∈ (CD), donc L et M appartiennent au plan (BCD).
Les plans (IJK) et (BCD) sont distincts (I n'appartient pas à (BCD), sinon (BI) = (AB) serait dans (BCD) et A aussi). Ils ont le point commun L, donc ils sont sécants suivant une droite (axiome 3), qui contient L et M. Enfin L ≠ M (L est sur (BC) et M sur (CD), et ces droites n'ont en commun que C, qui n'est ni L ni M).
L'intersection des plans (IJK) et (BCD) est la droite (LM).

**b)** Dans le plan (BCD), le quadrilatère BDLM a pour diagonales [BL] et [DM], qui ont le même milieu C : c'est un parallélogramme.
Ses côtés opposés [BD] et [ML] sont parallèles et de même longueur : (LM) est parallèle à (BD) et LM = BD.
Construction : on place L sur la demi-droite [BC) au-delà de C avec CL = BC, puis M sur la demi-droite [DC) au-delà de C avec CM = DC ; la droite (LM) est la trace du plan (IJK) dans le plan (BCD).

**5. a)** K ∈ (AD) et J ∈ (AC), donc (CK) et (DJ) sont contenues dans le plan (ACD). Avec vec(AK) = (1/2) vec(AD) et vec(AJ) = (2/3) vec(AC), on obtient dans la base (vec(AC), vec(AD)) :

    vec(CK) = vec(AK) − vec(AC) = −vec(AC) + (1/2) vec(AD),   composantes (−1, 1/2)
    vec(DJ) = vec(AJ) − vec(AD) = (2/3) vec(AC) − vec(AD),    composantes (2/3, −1)

dét(vec(CK), vec(DJ)) = (−1) × (−1) − (2/3) × (1/2) = 1 − 1/3 = 2/3 ≠ 0. Les vecteurs ne sont pas colinéaires, donc les droites coplanaires (CK) et (DJ) ne sont pas parallèles : elles sont sécantes en un point P.

**b)** Soit P' le milieu de [CK] :

    vec(AP') = (1/2)(vec(AC) + vec(AK)) = (1/2) vec(AC) + (1/4) vec(AD)
    vec(DP') = vec(AP') − vec(AD) = (1/2) vec(AC) − (3/4) vec(AD),   composantes (1/2, −3/4)

Avec vec(DJ)(2/3, −1) trouvé au a) : dét(vec(DP'), vec(DJ)) = (1/2) × (−1) − (2/3) × (−3/4) = −1/2 + 1/2 = 0. D, P' et J sont alignés, donc P' ∈ (DJ). Comme P' ∈ (CK), P' est le point commun de (CK) et (DJ) : P' = P. Donc P est le milieu de [CK] (et vec(DP) = (3/4) vec(DJ)).

**c)** Si C appartenait au plan (BDJ), ce plan contiendrait J et C, donc la droite (JC) = (AC) et le point A. Il contiendrait alors A, B, C et D : c'est faux. Donc C ∉ (BDJ) et la droite (CK) n'est pas contenue dans (BDJ).
Méthode du plan auxiliaire : (CK) est contenue dans le plan (ACD). Les plans (ACD) et (BDJ) sont distincts et ont en commun D et J, donc leur intersection est la droite (DJ). Le point où (CK) perce (BDJ) est donc le point commun de (CK) et (DJ), c'est-à-dire P, le milieu de [CK].

---

## Exercice 2 — Une lampe en verre et ses cloisons

Un artisan fabrique une lampe en verre en forme de pyramide SABCD de sommet S. La base ABCD est un carré de centre O (O est le point commun des diagonales [AC] et [BD]) et les huit arêtes mesurent 4 cm :

    AB = BC = CD = DA = SA = SB = SC = SD = 4

Le sommet S n'appartient pas au plan (ABC) de la base.

1. a) Quelle est la nature des quatre faces latérales ? Calculer l'aire totale de la pyramide (base comprise). Donner une valeur approchée à 0.01 près.
   b) Calculer AC. Montrer que le triangle SAC est rectangle et isocèle en S, puis calculer SO.
2. a) Les droites (SA) et (BC) sont-elles coplanaires ? Justifier.
   b) Déterminer l'intersection des plans (SAC) et (SBD).
3. À l'intérieur de la lampe, une plaque de verre occupe le triangle SBD. Un fil tendu relie le sommet A au milieu M de l'arête [SC].
   a) Montrer que les droites (AM) et (SO) sont sécantes en un point G, et que G est le centre de gravité du triangle SAC.
   b) En déduire que la droite (AM) perce le plan (SBD) en G : le fil traverse la plaque. Calculer SG et AG.
4. a) Montrer que G est aussi le centre de gravité du triangle SBD.
   b) En déduire que la droite (DG) coupe l'arête [SB] en son milieu N.
   c) Déterminer le point d'intersection de la droite (SB) et du plan (ADM).
5. L'artisan colle un ruban sur le contour du quadrilatère ADMN. Calculer la longueur de ce ruban, puis en donner une valeur approchée à 0.01 près.

### Corrigé

**1. a)** Chaque face latérale, par exemple SAB, a ses trois côtés de longueur 4 : les quatre faces latérales sont des triangles équilatéraux de côté 4.
La hauteur d'un triangle équilatéral de côté 4 mesure 4√3/2 = 2√3, donc l'aire d'une face latérale est (1/2) × 4 × 2√3 = 4√3.
Aire totale : 4² + 4 × 4√3 = 16 + 16√3 ≈ 43.71 cm².

**b)** AC est une diagonale du carré de côté 4 : AC = 4√2, donc AC² = 32.
Dans le triangle SAC : SA² + SC² = 16 + 16 = 32 = AC². D'après la réciproque du théorème de Pythagore (dans le plan (SAC)), SAC est rectangle en S ; comme SA = SC, il est rectangle et isocèle en S.
O est le milieu de l'hypoténuse [AC] ; dans un triangle rectangle, la médiane issue du sommet de l'angle droit mesure la moitié de l'hypoténuse : SO = AC/2 = 2√2 ≈ 2.83 cm.

**2. a)** Supposons que (SA) et (BC) soient contenues dans un même plan Q. Q contient A, B et C, qui ne sont pas alignés, donc Q est le plan (ABC). Mais Q contient aussi S : c'est impossible, S n'est pas dans le plan de la base.
Les droites (SA) et (BC) ne sont pas coplanaires.

**b)** S est un point commun aux deux plans. O appartient à (AC), donc au plan (SAC), et à (BD), donc au plan (SBD) : O est un deuxième point commun, distinct de S.
Les deux plans sont distincts : si A appartenait à (SBD), ce plan contiendrait A, B et D, il serait égal à (ABC) et contiendrait S, ce qui est faux.
D'après l'axiome 3, les plans (SAC) et (SBD) sont sécants suivant une droite ; elle contient S et O : c'est la droite (SO).

**3. a)** M ∈ [SC] et O ∈ [AC] : les droites (AM) et (SO) sont dans le plan (SAC).
Dans le triangle SAC, M est le milieu de [SC] et O est le milieu de [AC] : (AM) et (SO) sont deux médianes. Elles se coupent au centre de gravité G du triangle SAC.

**b)** G ∈ (SO) et (SO) est contenue dans le plan (SBD), donc G ∈ (SBD). De plus A ∉ (SBD) (question 2. b)), donc la droite (AM) n'est pas contenue dans (SBD) : elle perce ce plan en un seul point, qui est G.
G est sur le segment [AM] et sur le segment [SO], qui est contenu dans le triangle SBD : le fil traverse bien la plaque.
Le centre de gravité est situé aux deux tiers de chaque médiane à partir du sommet :

- SG = (2/3) SO = (2/3) × 2√2 = 4√2/3 ≈ 1.89 cm ;
- le triangle ASM est rectangle en S (l'angle ASC est droit et M ∈ [SC]), donc AM² = SA² + SM² = 16 + 4 = 20 et AM = 2√5. D'où AG = (2/3) AM = 4√5/3 ≈ 2.98 cm.

**4. a)** Dans le triangle SBD, O est le milieu de [BD], donc (SO) est la médiane issue de S. Le point G de [SO] vérifie SG = (2/3) SO : c'est le centre de gravité du triangle SBD.

**b)** Les trois médianes du triangle SBD passent par G. La médiane issue de D est donc la droite (DG) ; elle coupe le côté opposé [SB] en son milieu N.

**c)** Le plan (ADM) contient A et M, donc la droite (AM) et le point G ; il contient D et G, donc la droite (DG) et le point N. Ainsi N appartient au plan (ADM) et à la droite (SB).
La droite (SB) n'est pas contenue dans (ADM) : sinon ce plan contiendrait A, B et D, il serait égal à (ABC) et contiendrait S. La droite (SB) perce donc le plan (ADM) en un seul point : le milieu N de [SB].

**5.** On calcule les quatre côtés :

- AD = 4 ;
- DM : dans le triangle équilatéral SCD, la médiane [DM] est aussi une hauteur, donc DM = 2√3 ;
- MN : dans le triangle SBC, M et N sont les milieux de [SC] et [SB], donc MN = BC/2 = 2 ;
- NA : dans le triangle équilatéral SAB, [AN] est une hauteur, donc NA = 2√3.

Longueur du ruban : 4 + 2√3 + 2 + 2√3 = 6 + 4√3 ≈ 12.93 cm.
