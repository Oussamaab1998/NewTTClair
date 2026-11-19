# 2ème Sciences — Tome 2, Chapitre 9 : Orthogonalité dans l'espace

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel 2005, p. 22 (« Activités géométriques ») : orthogonalité dans l'espace ; montrer que deux droites sont orthogonales, qu'une droite et un plan sont perpendiculaires, que deux plans sont perpendiculaires ; reconnaître et déterminer le plan médiateur d'un segment et l'axe d'un cercle. Mesures de grandeurs, p. 26 : longueurs, aires et volumes d'objets de l'espace.
- Manuel CNP (tome 2, p. 146–166) : deux droites sont orthogonales si leurs parallèles menées par un même point sont perpendiculaires ; une droite est perpendiculaire à un plan si elle est orthogonale à deux droites sécantes de ce plan ; propriété 13 (si deux droites sont orthogonales, toute parallèle à l'une est orthogonale à l'autre) ; propriété 16, admise (une droite perpendiculaire à un plan est orthogonale à toute droite de ce plan) ; propriété 17 (deux droites parallèles : tout plan perpendiculaire à l'une est perpendiculaire à l'autre) ; théorème du plan médiateur (l'ensemble des points équidistants de A et B est le plan perpendiculaire à [AB] en son milieu) ; théorème de l'axe d'un cercle (l'ensemble des points équidistants de tous les points d'un cercle est la droite passant par son centre et perpendiculaire à son plan) ; deux plans sont perpendiculaires si l'un contient une droite orthogonale à l'autre ; si deux plans P et Q sont perpendiculaires, toute droite perpendiculaire à Q menée par un point de P est contenue dans P (synthèse). Le manuel calcule des volumes de pyramides (aire de la base × hauteur / 3) et la hauteur d'un tétraèdre.
- Outils autorisés : ce chapitre, les chapitres 7 et 8 (intersections, parallélisme), la géométrie plane (Pythagore et sa réciproque, droite des milieux, médiane d'un triangle rectangle, hauteur d'un triangle) et les volumes de 1ère année. La distance d'un point à un plan n'est pas définie dans le manuel : elle est définie dans l'énoncé comme la hauteur d'un tétraèdre.
- Notation : (ABC) est le plan passant par A, B et C ; AB est une longueur ; ⟂ se lit « perpendiculaire à ».
- Toutes les affirmations sont vérifiées par `check_t2_ch09.py` : le cube et la pyramide y sont placés dans un repère orthonormé, et chaque orthogonalité, plan médiateur, axe, longueur, aire et volume est recalculé exactement.

---

## Exercice 1 — Orthogonalité dans un cube

ABCDEFGH est un cube d'arête 4 : ABCD et EFGH sont deux faces opposées, et [AE], [BF], [CG], [DH] sont des arêtes. Les six faces sont les carrés ABCD, EFGH, ABFE, BCGF, CDHG et DAEH. On note O le centre de la face ABCD (le point commun de [AC] et [BD]) et I le milieu de l'arête [AE].

1. a) Montrer que la droite (AE) est perpendiculaire au plan (ABC).
   b) En déduire que le triangle EAC est rectangle en A, puis calculer AC et EC.
2. a) Montrer que la droite (BD) est perpendiculaire au plan (ACE).
   b) En déduire que les droites (BD) et (EC) sont orthogonales, et que les droites (IO) et (BD) sont perpendiculaires.
   c) Les droites (BD) et (EG) sont-elles orthogonales ? Sont-elles coplanaires ?
3. a) Montrer que chacun des points A, C, E et G est à égale distance de B et de D.
   b) En déduire le plan médiateur du segment [BD].
4. a) Montrer que les plans (IBD) et (ACE) sont perpendiculaires.
   b) Préciser leur droite d'intersection.
5. a) Calculer IB, ID et IO, puis l'aire du triangle IBD.
   b) Calculer le volume du tétraèdre IABD.
   c) La perpendiculaire au plan (IBD) passant par A perce ce plan en un point K. La longueur h = AK est la distance du point A au plan (IBD), c'est-à-dire la hauteur du tétraèdre IABD issue de A. En utilisant le volume, calculer h.
   d) Montrer que K appartient à la droite (IO). Retrouver la valeur de h dans le triangle IAO.

### Corrigé

**1. a)** La face ABFE est un carré, donc (AE) ⟂ (AB). La face DAEH est un carré, donc (AE) ⟂ (AD).
(AB) et (AD) sont deux droites sécantes (en A) du plan (ABC). La droite (AE) est orthogonale à ces deux droites : elle est perpendiculaire au plan (ABC).

**b)** La droite (AC) est contenue dans le plan (ABC), donc (AE) est orthogonale à (AC) (propriété 16) ; comme elles se coupent en A, elles sont perpendiculaires : le triangle EAC est rectangle en A.
AC est une diagonale du carré ABCD de côté 4 : AC = 4√2. Pythagore dans EAC :

    EC² = AE² + AC² = 16 + 32 = 48,   donc   EC = √48 = 4√3

**2. a)** Les diagonales du carré ABCD sont perpendiculaires : (BD) ⟂ (AC).
La droite (AE) est perpendiculaire au plan (ABC) qui contient (BD), donc (AE) et (BD) sont orthogonales.
(AC) et (AE) sont deux droites sécantes (en A) du plan (ACE) : la droite (BD), orthogonale à ces deux droites, est perpendiculaire au plan (ACE).

**b)** La droite (EC) est contenue dans le plan (ACE), donc elle est orthogonale à (BD).
I ∈ (AE) et O ∈ (AC), donc la droite (IO) est contenue dans le plan (ACE) : elle est orthogonale à (BD). Comme (IO) et (BD) se coupent en O, elles sont perpendiculaires.

**c)** Les plans (ABC) et (EFG) des faces opposées ABCD et EFGH sont strictement parallèles : (EF) et (EH) sont parallèles à (AB) et (AD) (propriété 10 du chapitre 8), et E n'est pas dans (ABC).
(AE) et (CG) sont parallèles à (BF) (faces ABFE et BCGF), donc parallèles entre elles (propriété 2 du chapitre 8) : A, C, G, E sont coplanaires. Les droites (AC) et (EG) sont dans ce plan, et aussi dans les plans strictement parallèles (ABC) et (EFG) : elles n'ont aucun point commun, donc (EG) est parallèle à (AC).
Comme (AC) ⟂ (BD), la propriété 13 donne : (EG), parallèle à (AC), est orthogonale à (BD).
Elles ne sont pas coplanaires : (EG) est contenue dans le plan (EFG) et (BD) dans le plan (ABC), strictement parallèles, donc (EG) et (BD) ne sont pas sécantes ; elles ne sont pas parallèles non plus, puisque (EG) est parallèle à (AC), qui coupe (BD). Deux droites ni sécantes ni parallèles ne sont pas coplanaires.

**3. a)**

- AB = AD = 4 et CB = CD = 4 (côtés du carré ABCD) ;
- EB = ED = 4√2 (diagonales des carrés ABFE et DAEH, de côté 4) ;
- GB = GD = 4√2 (diagonales des carrés BCGF et CDHG).

**b)** L'ensemble des points équidistants de B et D est le plan médiateur de [BD]. Il contient donc A, C, E et G. Les points A, C, E ne sont pas alignés, donc ce plan est le plan (ACE) (qui contient aussi G).
Autre justification : d'après 2. a), le plan (ACE) est perpendiculaire à (BD), et il passe par O, milieu de [BD] ; c'est donc le plan perpendiculaire à [BD] en son milieu.

**4. a)** Le plan (IBD) contient la droite (BD), qui est perpendiculaire au plan (ACE) (question 2. a)). Par définition, les plans (IBD) et (ACE) sont perpendiculaires.

**b)** I appartient à (AE), donc au plan (ACE), et au plan (IBD). O appartient à (AC), donc à (ACE), et à (BD), donc à (IBD). Les deux plans sont distincts : B n'appartient pas à (ACE), car (ACE) est le plan médiateur de [BD] (question 3) et BB = 0 ≠ BD. Leur intersection est donc la droite (IO).

**5. a)** Le triangle IAB est rectangle en A ((AE) ⟂ (AB)) avec IA = 2 et AB = 4 :

    IB² = IA² + AB² = 4 + 16 = 20,   donc   IB = 2√5

De même, IAD est rectangle en A : ID = 2√5.
Le triangle IBD est isocèle en I et O est le milieu de [BD] ; d'après 2. b), (IO) ⟂ (BD). Avec OB = BD/2 = 2√2 :

    IO² = IB² − OB² = 20 − 8 = 12,   donc   IO = 2√3

(Contrôle : le triangle IAO est rectangle en A, IO² = IA² + AO² = 4 + 8 = 12.)
Aire du triangle IBD : (1/2) × BD × IO = (1/2) × 4√2 × 2√3 = 4√6 ≈ 9.80.

**b)** On prend pour base le triangle ABD, d'aire (1/2) × 4 × 4 = 8. La droite (IA) = (AE) est perpendiculaire au plan (ABD), donc la hauteur correspondante est IA = 2.

    V = (1/3) × 8 × 2 = 16/3

**c)** En prenant pour base le triangle IBD, la hauteur est h = AK : V = (1/3) × 4√6 × h. Donc

    h = 3V / (4√6) = 16 / (4√6) = 4/√6 = 2√6/3 ≈ 1.63

**d)** Les plans (IBD) et (ACE) sont perpendiculaires (question 4) et A appartient au plan (ACE). D'après la propriété des plans perpendiculaires, la droite perpendiculaire au plan (IBD) passant par A est contenue dans le plan (ACE). Donc K appartient à (ACE) et à (IBD), c'est-à-dire à la droite (IO).
La droite (AK) est perpendiculaire au plan (IBD), donc à la droite (IO) : K est le pied de la hauteur issue de A dans le triangle IAO, rectangle en A. En écrivant l'aire de IAO de deux façons, AK × IO = IA × AO :

    h = AK = (IA × AO) / IO = (2 × 2√2) / (2√3) = 2√2/√3 = 2√6/3

On retrouve le résultat du c).

---

## Exercice 2 — Un présentoir en forme de pyramide

Un présentoir en verre a la forme d'une pyramide SABCD de sommet S. Sa base ABCD est un carré de centre O et de côté 3 dm. L'arête [SA] est perpendiculaire au plan (ABC) de la base, et SA = 4 dm.

1. a) Montrer que la droite (BC) est perpendiculaire au plan (SAB). En déduire la nature du triangle SBC.
   b) Montrer de même que le triangle SDC est rectangle en D.
   c) Calculer SB, SD et SC.
2. a) Montrer que les plans (SAB) et (SBC) sont perpendiculaires.
   b) Montrer que la droite (BD) est perpendiculaire au plan (SAC). En déduire que les droites (BD) et (SC) sont orthogonales.
   c) Montrer que le plan (SAC) est le plan médiateur du segment [BD].
3. Calculer le volume de la pyramide SABCD, puis l'aire totale de ses cinq faces (quantité de verre nécessaire).
4. On note H le pied de la hauteur issue de A dans le triangle SAB.
   a) Montrer que la droite (AH) est perpendiculaire au plan (SBC).
   b) Calculer AH.
   c) Calculer de deux façons le volume du tétraèdre SABC (en prenant pour base ABC, puis SBC), et vérifier que l'on trouve la même valeur.
5. On veut placer une petite lampe en un point situé à égale distance des cinq sommets S, A, B, C et D. On note 𝒞 le cercle circonscrit au carré ABCD et K le milieu de l'arête [SC].
   a) Montrer que la droite (OK) est l'axe du cercle 𝒞.
   b) En déduire que K est à égale distance de A, B, C et D, puis que KS = KA. Conclure et calculer la distance commune (valeur exacte, puis valeur approchée à 0.01 près).

### Corrigé

**1. a)** (SA) est perpendiculaire au plan (ABC), donc orthogonale à toute droite de ce plan (propriété 16), en particulier à (BC).
ABCD est un carré, donc (BC) ⟂ (AB).
(AB) et (SA) sont deux droites sécantes (en A) du plan (SAB), et (BC) est orthogonale à chacune : (BC) est perpendiculaire au plan (SAB).
La droite (SB) est contenue dans (SAB), donc (BC) est orthogonale à (SB) ; comme elles se coupent en B, le triangle SBC est rectangle en B.

**b)** De même, (CD) ⟂ (AD) (carré) et (CD) est orthogonale à (SA) (propriété 16). (AD) et (SA) sont sécantes en A dans le plan (SAD), donc (CD) est perpendiculaire au plan (SAD). Elle est donc orthogonale à (SD), qu'elle coupe en D : le triangle SDC est rectangle en D.

**c)** (SA) est orthogonale à (AB), (AD) et (AC) (droites du plan de base) : les triangles SAB, SAD et SAC sont rectangles en A.

    SB² = SA² + AB² = 16 + 9 = 25,   SB = 5
    SD² = SA² + AD² = 16 + 9 = 25,   SD = 5
    SC² = SA² + AC² = 16 + 18 = 34,  SC = √34   (AC = 3√2, diagonale du carré)

Contrôle avec le triangle SBC rectangle en B : SB² + BC² = 25 + 9 = 34 = SC².

**2. a)** Le plan (SBC) contient la droite (BC), qui est perpendiculaire au plan (SAB) (question 1. a)). Par définition, les plans (SAB) et (SBC) sont perpendiculaires.

**b)** Les diagonales du carré sont perpendiculaires : (BD) ⟂ (AC). De plus (BD) est une droite du plan (ABC), donc elle est orthogonale à (SA) (propriété 16).
(AC) et (SA) sont sécantes en A dans le plan (SAC) : (BD) est perpendiculaire au plan (SAC).
La droite (SC) est contenue dans (SAC), donc (BD) et (SC) sont orthogonales.

**c)** Le plan (SAC) est perpendiculaire à (BD) et passe par O ∈ (AC), qui est le milieu de [BD] : c'est le plan perpendiculaire à [BD] en son milieu, c'est-à-dire le plan médiateur de [BD].
Contrôle : SB = SD = 5, AB = AD = 3 et CB = CD = 3 ; les trois points non alignés S, A, C sont équidistants de B et D.

**3.** La hauteur de la pyramide issue de S est SA = 4 (car (SA) ⟂ (ABC)) et l'aire de la base est 3² = 9 :

    V = (1/3) × 9 × 4 = 12 dm³

Aires des faces (toutes les faces latérales sont des triangles rectangles) :

- SAB, rectangle en A : (1/2) × SA × AB = (1/2) × 4 × 3 = 6 ;
- SAD, rectangle en A : 6 ;
- SBC, rectangle en B : (1/2) × SB × BC = (1/2) × 5 × 3 = 7.5 ;
- SDC, rectangle en D : 7.5 ;
- la base ABCD : 9.

Aire totale : 6 + 6 + 7.5 + 7.5 + 9 = 36 dm².

**4. a)** (AH) est contenue dans le plan (SAB), et (BC) est perpendiculaire à ce plan : (AH) est orthogonale à (BC).
Par définition de H, (AH) ⟂ (SB).
(SB) et (BC) sont sécantes en B dans le plan (SBC) : (AH) est perpendiculaire au plan (SBC).

**b)** On écrit l'aire du triangle SAB, rectangle en A, de deux façons : (1/2) × SA × AB = (1/2) × SB × AH. Donc

    AH = (SA × AB) / SB = (4 × 3) / 5 = 12/5 = 2.4 dm

(Le pied H est sur le segment [SB], avec SH = SA²/SB = 3.2 et HB = AB²/SB = 1.8.)

**c)**

- Base ABC, d'aire 9/2 = 4.5, et hauteur SA = 4 : V(SABC) = (1/3) × 4.5 × 4 = 6.
- Base SBC, d'aire 7.5, et hauteur AH = 2.4 (car (AH) ⟂ (SBC)) : V(SABC) = (1/3) × 7.5 × 2.4 = 6.

On trouve bien la même valeur, 6 dm³ (la moitié du volume de la pyramide).

**5. a)** O est le centre du carré, donc OA = OB = OC = OD = AC/2 = 3√2/2 : 𝒞 est le cercle de centre O et de rayon 3√2/2, contenu dans le plan (ABC).
Dans le triangle SAC, O est le milieu de [AC] et K le milieu de [SC] : par la droite des milieux, (OK) est parallèle à (SA) et OK = SA/2 = 2.
(SA) est perpendiculaire au plan (ABC) ; d'après la propriété 17, la droite (OK), parallèle à (SA), est aussi perpendiculaire à (ABC).
(OK) passe par le centre O de 𝒞 et elle est perpendiculaire au plan de 𝒞 : c'est l'axe du cercle 𝒞.

**b)** Tout point de l'axe d'un cercle est équidistant de tous les points de ce cercle. A, B, C et D sont sur 𝒞, donc KA = KB = KC = KD.
K est le milieu de [SC], donc KS = KC. On a aussi KS = KA : le triangle SAC est rectangle en A, et dans un triangle rectangle le milieu de l'hypoténuse est à égale distance des trois sommets.
Donc K est à égale distance des cinq sommets ; c'est l'endroit où placer la lampe. La distance commune est

    KS = SC/2 = √34/2 ≈ 2.92 dm

Contrôle : le triangle KOA est rectangle en O ((OK) ⟂ (ABC)), donc KA² = OK² + OA² = 4 + 9/2 = 17/2 = 34/4.
