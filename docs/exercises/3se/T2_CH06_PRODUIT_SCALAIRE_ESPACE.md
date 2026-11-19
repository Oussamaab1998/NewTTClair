# 3ème Sc. exp. — Tome 2, Chapitre 6 : Produit scalaire dans l'espace

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20–21 : produit scalaire dans l'espace ; exploiter ses propriétés ; l'utiliser pour calculer des grandeurs, déterminer des lieux géométriques et étudier des configurations ; problèmes métriques et situations réelles menant à un modèle géométrique.
- Manuel CNP (p. 108–123) : définition u·v = ‖u‖ × ‖v‖ × cos α, propriétés (symétrie, linéarité), projeté orthogonal, vecteurs orthogonaux, droites orthogonales, droite orthogonale à un plan (orthogonale à deux vecteurs non colinéaires du plan), vecteur normal à un plan, plans perpendiculaires, base et repère orthonormés avec u·v = xx' + yy' + zz' et ‖u‖ = √(x² + y² + z²). Le manuel calcule aussi des volumes de pyramides (formule du collège : V = (1/3) × aire de la base × hauteur) et des projetés orthogonaux d'un point sur un plan. La caractérisation « M ∈ P ⟺ vec(AM)·n = 0 », le plan médiateur et les équations cartésiennes de plans sont au chapitre 7 (p. 132) : les corrigés n'utilisent que le sens direct (un vecteur normal est orthogonal à tout vecteur du plan).
- Outils autorisés : ce chapitre, le chapitre 5 (vecteurs de l'espace, déterminant, coplanarité) et les chapitres précédents.
- Notation : vec(AB) désigne le vecteur AB et vec(AB)(2, −1, 2) ses composantes ; AB désigne la longueur du segment [AB] ; le produit scalaire s'écrit vec(AB)·vec(AC) ou u·v ; ‖u‖ est la norme du vecteur u.
- Toutes les valeurs sont vérifiées par `check_t2_ch06.py` (calcul exact en fractions ; les racines carrées sont vérifiées sur les carrés).

---

## Exercice 1 — Produit scalaire et orthogonalité dans un repère orthonormé

L'espace est muni d'un repère orthonormé (O, i, j, k). On considère les points

    A(1, 2, 0)      B(3, 1, 2)      C(3, 4, −1)

1. a) Déterminer les composantes de vec(AB), vec(AC) et vec(BC), puis calculer les longueurs AB, AC et BC.
   b) Calculer vec(AB)·vec(AC). Quelle est la nature du triangle ABC ?
2. Calculer vec(BA)·vec(BC). En déduire une mesure de l'angle géométrique ABC.
3. Soit n le vecteur n(−1, 2, 2).
   a) Montrer que n est un vecteur normal au plan (ABC).
   b) Soit D le point tel que vec(AD) = n. Déterminer les coordonnées de D et la longueur AD. Que représente la droite (AD) pour le plan (ABC) ?
4. Soit I le milieu de [BC].
   a) Montrer que la droite (BC) est orthogonale aux droites (AI) et (DI).
   b) En déduire que la droite (BC) est orthogonale au plan (ADI).
5. a) Calculer le volume V du tétraèdre ABCD.
   b) Soit K le centre de gravité du triangle BCD. Montrer que la droite (AK) est orthogonale au plan (BCD). En déduire que K est le projeté orthogonal de A sur le plan (BCD), puis calculer AK.
   c) En utilisant le volume V, calculer l'aire du triangle BCD. Retrouver ce résultat à l'aide de la longueur DI.

### Corrigé

**1. a)** vec(AB)(2, −1, 2), vec(AC)(2, 2, −1) et vec(BC)(0, 3, −3). Le repère est orthonormé, donc :

    AB = √(2² + (−1)² + 2²) = √9 = 3
    AC = √(2² + 2² + (−1)²) = √9 = 3
    BC = √(0² + 3² + (−3)²) = √18 = 3√2

**b)** vec(AB)·vec(AC) = 2 × 2 + (−1) × 2 + 2 × (−1) = 4 − 2 − 2 = 0.
Les vecteurs vec(AB) et vec(AC) sont orthogonaux et AB = AC : le triangle ABC est rectangle et isocèle en A. (Contrôle : AB² + AC² = 9 + 9 = 18 = BC².)

**2.** vec(BA)(−2, 1, −2) et vec(BC)(0, 3, −3), donc vec(BA)·vec(BC) = 0 + 3 + 6 = 9.
Par définition, vec(BA)·vec(BC) = BA × BC × cos(ABC), donc

    cos(ABC) = 9 / (3 × 3√2) = 1/√2 = √2/2

L'angle géométrique ABC mesure π/4 (soit 45°), ce qui est normal dans un triangle rectangle isocèle en A.

**3. a)** n·vec(AB) = (−1) × 2 + 2 × (−1) + 2 × 2 = −2 − 2 + 4 = 0 et n·vec(AC) = (−1) × 2 + 2 × 2 + 2 × (−1) = −2 + 4 − 2 = 0.
Les vecteurs vec(AB) et vec(AC) ne sont pas colinéaires (ils sont orthogonaux et non nuls) et dirigent le plan (ABC). Le vecteur non nul n est orthogonal à ces deux vecteurs : n est normal au plan (ABC).

**b)** vec(AD) = n donne D(1 − 1, 2 + 2, 0 + 2), soit D(0, 4, 2), et AD = ‖n‖ = √(1 + 4 + 4) = 3.
La droite (AD) passe par A et a pour vecteur directeur n, normal au plan (ABC) : (AD) est la droite perpendiculaire au plan (ABC) en A.
Ainsi les vecteurs vec(AB), vec(AC) et vec(AD) sont deux à deux orthogonaux, et AB = AC = AD = 3 : les quatre points forment un « coin de cube » de sommet A.

**4. a)** I((3 + 3)/2, (1 + 4)/2, (2 − 1)/2), soit I(3, 5/2, 1/2). Donc vec(AI)(2, 1/2, 1/2) et vec(DI)(3, −3/2, −3/2).

- vec(AI)·vec(BC) = 2 × 0 + (1/2) × 3 + (1/2) × (−3) = 0 : (BC) est orthogonale à (AI).
- vec(DI)·vec(BC) = 3 × 0 + (−3/2) × 3 + (−3/2) × (−3) = 0 : (BC) est orthogonale à (DI).

**b)** Les vecteurs vec(AI) et vec(DI) ne sont pas colinéaires (si vec(DI) = k·vec(AI), la première composante donne k = 3/2, mais alors la deuxième donnerait −3/2 = 3/4, ce qui est faux). Ils dirigent donc le plan (ADI).
Le vecteur vec(BC) est orthogonal à deux vecteurs non colinéaires du plan (ADI) : la droite (BC) est orthogonale au plan (ADI).

**5. a)** (AD) est perpendiculaire au plan (ABC) en A, donc AD est la hauteur du tétraèdre issue de D. La base ABC est rectangle en A : aire(ABC) = (AB × AC)/2 = 9/2.

    V = (1/3) × aire(ABC) × AD = (1/3) × (9/2) × 3 = 9/2

**b)** K((3 + 3 + 0)/3, (1 + 4 + 4)/3, (2 − 1 + 2)/3), soit K(2, 3, 1), et vec(AK)(1, 1, 1). D'autre part vec(DB)(3, −3, 0) et vec(DC)(3, 0, −3).

- vec(AK)·vec(DB) = 3 − 3 + 0 = 0 ;
- vec(AK)·vec(DC) = 3 + 0 − 3 = 0.

vec(DB) et vec(DC) ne sont pas colinéaires et dirigent le plan (BCD) : la droite (AK) est orthogonale au plan (BCD). Comme K appartient au plan (BCD) (c'est le centre de gravité du triangle BCD), K est le projeté orthogonal de A sur ce plan.
AK = √(1 + 1 + 1) = √3.

**c)** En prenant BCD comme base, la hauteur issue de A est AK, donc V = (1/3) × aire(BCD) × AK, et

    aire(BCD) = 3V / AK = (27/2) / √3 = 27 / (2√3) = 9√3 / 2

Avec DI : DI = √(9 + 9/4 + 9/4) = √(27/2) = 3√6/2. D'après le 4. a), (DI) est perpendiculaire à (BC), donc [DI] est la hauteur du triangle BCD issue de D :

    aire(BCD) = (1/2) × BC × DI = (1/2) × 3√2 × 3√6/2 = 9√12 / 4 = 9√3 / 2

(On remarque que DB = DC = BC = 3√2 : le triangle BCD est équilatéral.)

---

## Exercice 2 — Une tente en forme de pyramide

L'espace est muni d'un repère orthonormé (O, i, j, k), l'unité étant le mètre ; le sol est le plan passant par O et dirigé par i et j. Une tente a la forme d'une pyramide SABCD dont les sommets sont

    A(3, −3, 0)    B(3, 3, 0)    C(−3, 3, 0)    D(−3, −3, 0)    S(0, 0, 4)

On note I le milieu de [AB].

1. a) Montrer que ABCD est un carré de centre O.
   b) Montrer que la droite (SO) est perpendiculaire au plan (ABC) du sol.
   c) Calculer les longueurs SA, SB, SC et SD.
2. a) Montrer que la droite (SI) est perpendiculaire à (AB). Calculer SI, puis l'aire de la face SAB. En déduire l'aire de toile nécessaire pour les quatre faces latérales.
   b) Calculer vec(SA)·vec(SB). En déduire cos(ASB), puis une valeur approchée au dixième de degré de l'angle ASB au sommet de la face.
3. Soit n le vecteur n(4, 0, 3).
   a) Montrer que n est un vecteur normal au plan (SAB).
   b) Soit H le projeté orthogonal de O sur le plan (SAB). Justifier qu'il existe un réel λ tel que vec(OH) = λn, puis déterminer λ et les coordonnées de H. En déduire la distance OH du centre du sol à la face SAB.
4. a) Calculer le volume V de la tente.
   b) Calculer le volume du tétraèdre SABD. En déduire la distance du point D au plan (SAB), c'est-à-dire la longueur DH', où H' est le projeté orthogonal de D sur le plan (SAB).
5. a) Montrer que pour tout point M de l'espace : MA² − MB² = 2 vec(IM)·vec(AB). En déduire que MA = MB ⟺ vec(IM)·vec(AB) = 0.
   b) Vérifier que vec(IS)·vec(AB) = 0 et vec(IO)·vec(AB) = 0.
   c) En déduire que tout point M du plan (SOI) est à égale distance de A et de B.

### Corrigé

**1. a)** vec(AB)(0, 6, 0) et vec(DC)(0, 6, 0) : vec(AB) = vec(DC). De plus vec(AC)(−6, 6, 0) n'est pas colinéaire à vec(AB) (si vec(AC) = k·vec(AB), la première composante donnerait −6 = k × 0 = 0), donc A, B, C ne sont pas alignés. ABCD est un parallélogramme.
vec(AD)(−6, 0, 0), donc vec(AB)·vec(AD) = 0 : ABCD a un angle droit en A. De plus AB = AD = 6 : ABCD est un carré de côté 6.
Le milieu de [AC] a pour coordonnées ((3 − 3)/2, (−3 + 3)/2, 0) = (0, 0, 0) : le centre du carré est O, qui appartient donc au plan (ABC).

**b)** vec(OS)(0, 0, 4). vec(OS)·vec(AB) = 0 et vec(OS)·vec(AD) = 0, et vec(AB), vec(AD) sont deux vecteurs non colinéaires du plan (ABC). Donc (SO) est orthogonale au plan (ABC) ; comme elle le coupe en O, elle lui est perpendiculaire en O. La hauteur de la tente est SO = 4 m.

**c)** vec(SA)(3, −3, −4), vec(SB)(3, 3, −4), vec(SC)(−3, 3, −4) et vec(SD)(−3, −3, −4) ont tous pour norme √(9 + 9 + 16) = √34.
SA = SB = SC = SD = √34 ≈ 5.83 m : les quatre arêtes latérales ont la même longueur (pyramide régulière).

**2. a)** I((3 + 3)/2, (−3 + 3)/2, 0), soit I(3, 0, 0), et vec(SI)(3, 0, −4). vec(SI)·vec(AB) = 0 : (SI) est perpendiculaire à (AB).
SI = √(9 + 0 + 16) = 5. Le segment [SI] est la hauteur du triangle SAB issue de S, donc

    aire(SAB) = (1/2) × AB × SI = (1/2) × 6 × 5 = 15 m²

Les quatre faces latérales sont des triangles isocèles de côtés 6, √34 et √34 : elles ont la même aire. Il faut 4 × 15 = 60 m² de toile.

**b)** vec(SA)·vec(SB) = 3 × 3 + (−3) × 3 + (−4) × (−4) = 9 − 9 + 16 = 16.
vec(SA)·vec(SB) = SA × SB × cos(ASB), donc cos(ASB) = 16 / (√34 × √34) = 16/34 = 8/17.
L'angle ASB mesure environ 61.9°.

**3. a)** n·vec(AB) = 0 + 0 + 0 = 0 et n·vec(SI) = 12 + 0 − 12 = 0. Les vecteurs vec(AB) et vec(SI) sont non colinéaires et sont deux vecteurs du plan (SAB) (I est sur [AB]). Le vecteur non nul n leur est orthogonal : n est normal au plan (SAB).

**b)** La droite (OH) est perpendiculaire au plan (SAB). Le vecteur vec(OH) est donc nul ou normal à (SAB) ; deux vecteurs normaux à un même plan sont colinéaires, donc il existe un réel λ tel que vec(OH) = λn, soit H(4λ, 0, 3λ).
H et I appartiennent au plan (SAB), donc vec(IH) est un vecteur de ce plan ; n étant normal à (SAB), vec(IH)·n = 0. Avec vec(IH)(4λ − 3, 0, 3λ) :

    vec(IH)·n = 4(4λ − 3) + 0 + 3 × 3λ = 25λ − 12

Donc 25λ − 12 = 0. La seule valeur possible est λ = 12/25 ; comme le projeté orthogonal H existe, c'est la valeur cherchée.
H(48/25, 0, 36/25), soit H(1.92, 0, 1.44), et OH = |λ| × ‖n‖ = (12/25) × 5 = 12/5 = 2.4 m.
Contrôle : vec(SH)(48/25, 0, −64/25) = (16/25)·vec(SI) avec 0 ≤ 16/25 ≤ 1, donc H est sur le segment [SI], dans la face SAB. Dans le triangle SOI rectangle en O, la hauteur issue de O vérifie OH × SI = OS × OI, soit OH = (4 × 3)/5 = 12/5.

**4. a)** V = (1/3) × aire(ABCD) × SO = (1/3) × 36 × 4 = 48 m³.

**b)** Le tétraèdre SABD a pour base le triangle ABD (la moitié du carré, d'aire 18) et pour hauteur SO = 4 : son volume est V' = (1/3) × 18 × 4 = 24.
En prenant SAB comme base, la hauteur issue de D est DH' = d, la distance du point D au plan (SAB) : V' = (1/3) × aire(SAB) × d = 5d.
Donc 5d = 24 et d = 24/5 = 4.8 m.
Contrôle par la méthode du 3. b) : comme au 3. b), il existe un réel λ tel que vec(DH') = λn. H' et I appartiennent au plan (SAB), donc vec(IH') est un vecteur de ce plan et vec(IH')·n = 0. Comme vec(IH') = vec(ID) + λn, avec vec(ID)(−6, −3, 0) et vec(ID)·n = −24, on obtient −24 + 25λ = 0, donc λ = 24/25 et d = DH' = (24/25) × 5 = 24/5.

**5. a)** Pour tout point M, MA² − MB² = vec(MA)·vec(MA) − vec(MB)·vec(MB) = (vec(MA) − vec(MB))·(vec(MA) + vec(MB)).
Or vec(MA) − vec(MB) = vec(MA) + vec(BM) = vec(BA), et vec(MA) + vec(MB) = 2 vec(MI) car I est le milieu de [AB]. Donc

    MA² − MB² = vec(BA)·(2 vec(MI)) = 2 vec(MI)·vec(BA) = 2 vec(IM)·vec(AB)

Deux longueurs sont égales si et seulement si leurs carrés sont égaux, donc MA = MB ⟺ MA² − MB² = 0 ⟺ vec(IM)·vec(AB) = 0.

**b)** vec(IS)(−3, 0, 4) et vec(AB)(0, 6, 0) : vec(IS)·vec(AB) = 0 + 0 + 0 = 0.
vec(IO)(−3, 0, 0) : vec(IO)·vec(AB) = 0 + 0 + 0 = 0.

**c)** vec(IS) et vec(IO) ne sont pas colinéaires, donc S, O et I ne sont pas alignés, et le plan (SOI) est le plan P(I, vec(IS), vec(IO)).
Soit M un point du plan (SOI) : il existe deux réels a et b tels que vec(IM) = a·vec(IS) + b·vec(IO). Alors

    vec(IM)·vec(AB) = a·(vec(IS)·vec(AB)) + b·(vec(IO)·vec(AB)) = a × 0 + b × 0 = 0

et, d'après le a), MA = MB. Tout point du plan (SOI) est à égale distance de A et de B (par exemple S, O, ou le milieu (−3, 0, 0) de [CD]).
Remarque : on verra au chapitre 7 que, réciproquement, tout point équidistant de A et de B appartient à ce plan : (SOI) est le plan médiateur du segment [AB].
