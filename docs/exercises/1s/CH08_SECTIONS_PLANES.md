# 1ère année — Chapitre 8 : Sections planes d'un solide

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10, « Activités géométriques » : section plane des solides usuels (prisme droit, pyramide, cylindre droit, cône de révolution, sphère) ; reconnaître et représenter la section d'un prisme droit et d'un parallélépipède rectangle par un plan parallèle à une face ou à une arête, d'une pyramide ou d'un cône de révolution par un plan parallèle à la base, et d'une sphère. P. 14, « Mesures de grandeurs » : aires et volumes ; effet de la multiplication d'une dimension sur une aire ou un volume.
- Manuel CNP, chapitre 8 (p. 117–132) : volumes (prisme droit V = B × h ; pyramide et cône V = (1/3) × B × h ; boule (4/3) × π × R³), développement d'un cône (secteur de rayon une génératrice l, d'angle a = 360 × R / l en degrés). Un plan qui coupe deux plans parallèles les coupe suivant deux droites parallèles ; une droite perpendiculaire à un plan est orthogonale à toute droite de ce plan. Sections : un parallélépipède droit coupé par un plan parallèle à une face donne un rectangle isométrique à cette face, par un plan contenant une arête un rectangle ; une pyramide coupée par un plan parallèle à sa base donne un polygone de même nature que la base ; un cône de révolution coupé par un plan parallèle à sa base donne un cercle ; une sphère coupée par un plan donne un cercle (de centre le pied de la perpendiculaire menée du centre, de rayon √(R² − d²)), un grand cercle si le plan passe par le centre. La section par un plan parallèle à une arête (citée par le programme, absente du « Retenir ») est justifiée directement dans le corrigé.
- Outils autorisés : ce chapitre, le théorème de Thalès et la droite des milieux (chapitre 2), les vecteurs (chapitres 4 et 5), Pythagore, les volumes et aires du collège. Pas de coordonnées dans l'espace (le script de vérification en utilise, l'élève non).
- Notation : (ABC) est le plan passant par A, B, C ; (AB) une droite, [AB] un segment, AB une longueur, vec(AB) un vecteur ; unité le centimètre ; valeurs exactes en fonction de π, puis valeurs approchées.
- Toutes les valeurs sont vérifiées par `check_ch08.py` : chaque solide y est placé dans un repère de l'espace, chaque section est calculée en coupant toutes les arêtes par le plan (fractions exactes), puis testée (sommets, longueurs, angles droits, aire) ; les volumes des morceaux sont recalculés autrement (découpage en triangles ou en tétraèdres).

---

## Exercice 1 — Sections d'un pavé droit et d'une pyramide

ABCDEFGH est un parallélépipède rectangle (pavé droit) :

- sa base ABCD est un rectangle tel que AB = 12 cm et AD = 9 cm ;
- les arêtes [AE], [BF], [CG] et [DH] sont perpendiculaires au plan (ABC) et mesurent 8 cm ; les points E, F, G, H sont du même côté de ce plan (on imagine ABCD posé sur une table, E au-dessus de A, F au-dessus de B, G au-dessus de C, H au-dessus de D).

1. a) Calculer le volume du pavé.
   b) Calculer AC, puis AG.
2. Soit I le point de [AB] tel que AI = 4 cm. On coupe le pavé par le plan 𝒫₁ passant par I et parallèle à la face ADHE. Ce plan coupe [DC], [HG] et [EF] en J, K et L.
   a) Préciser la position de J, K et L. Quelle est la nature de la section IJKL ? Donner ses dimensions et son aire.
   b) Calculer le volume de chacun des deux solides obtenus.
3. On coupe le pavé par le plan (ACG).
   a) Montrer que ce plan contient l'arête [AE]. Quelle est la nature de la section ? Donner ses dimensions et son aire.
   b) Quelle est la nature des deux solides obtenus ? Calculer leurs volumes.
4. Soit M le point de [AB] tel que BM = 3 cm et N le point de [BC] tel que BN = 4 cm. On coupe le pavé par le plan 𝒬 qui passe par M et N et qui est parallèle à l'arête [BF]. Ce plan coupe [EF] en M' et [FG] en N'.
   a) Montrer que MNN'M' est un rectangle. Calculer ses dimensions et son aire.
   b) Calculer le volume du solide qui contient le sommet B.
5. On considère la pyramide GABCD, de sommet G et de base le rectangle ABCD.
   a) Justifier que sa hauteur est GC. Calculer son volume et le comparer à celui du pavé.
   b) Soit C₁ le milieu de [GC]. Le plan 𝒫₂ passant par C₁ et parallèle au plan (ABC) coupe [GA], [GB] et [GD] en A₁, B₁ et D₁. Montrer que A₁ est le milieu de [GA]. (De même, B₁ et D₁ sont les milieux de [GB] et [GD].)
   c) Quelle est la nature de la section A₁B₁C₁D₁ de la pyramide ? Donner ses dimensions et son aire. Quelle fraction de l'aire de ABCD représente-t-elle ? Quelle est la section du pavé par ce même plan 𝒫₂ ?
   d) Calculer le volume de la pyramide GA₁B₁C₁D₁ et celui du solide restant (le tronc de pyramide).

### Corrigé

**1. a)** V = AB × AD × AE = 12 × 9 × 8 = 864 cm³.

**b)** Le triangle ABC est rectangle en B : AC² = AB² + BC² = 144 + 81 = 225, donc AC = 15 cm.
La droite (CG) est perpendiculaire au plan (ABC), donc orthogonale à la droite (AC) de ce plan : le triangle ACG est rectangle en C.
AG² = AC² + CG² = 225 + 64 = 289, donc AG = 17 cm.

**2. a)** Le plan (ABC) coupe les deux plans parallèles (ADHE) et 𝒫₁ suivant deux droites parallèles : (IJ) ∥ (AD). Dans le rectangle ABCD, AIJD est donc un rectangle : J est le point de [DC] tel que DJ = AI = 4 cm.
De même, dans la face ABFE, (IL) ∥ (AE) : L est le point de [EF] tel que EL = 4 cm ; dans la face DCGH, (JK) ∥ (DH) : K est le point de [HG] tel que HK = 4 cm.
D'après le cours, la section d'un pavé droit par un plan parallèle à une face est un rectangle isométrique à cette face : IJKL est un rectangle avec IJ = AD = 9 cm et JK = DH = 8 cm. Son aire est 9 × 8 = 72 cm².

**b)** On obtient deux pavés droits :

- AIJDELKH, de dimensions 4, 9 et 8 : volume 4 × 9 × 8 = 288 cm³ ;
- IBCJLFGK, de dimensions 8, 9 et 8 : volume 8 × 9 × 8 = 576 cm³.

Contrôle : 288 + 576 = 864.

**3. a)** Les droites (AE) et (CG) sont perpendiculaires au même plan (ABC), donc parallèles. La parallèle à (CG) passant par A est contenue dans le plan (ACG) : c'est (AE). Le plan (ACG) contient donc les arêtes [CG] et [AE].
Il coupe la base suivant la diagonale [AC] et la face EFGH suivant la diagonale [EG] : la section est le quadrilatère ACGE.
(AE) ∥ (CG) et AE = CG = 8, donc ACGE est un parallélogramme ; il a un angle droit en C (question 1. b)) : c'est un rectangle, comme l'annonce le cours (plan contenant une arête).
Dimensions : AC = 15 cm et CG = 8 cm ; aire : 15 × 8 = 120 cm². (Ses diagonales mesurent AG = CE = 17 cm.)

**b)** La base ABCD est partagée par [AC] en deux triangles ABC et ACD, rectangles en B et en D, d'aire (12 × 9)/2 = 54 cm² chacun. Les deux solides ABCEFG et ACDEGH sont des prismes droits à base triangulaire, de hauteur 8 cm.
Volume de chacun : 54 × 8 = 432 cm³ (la moitié du pavé).

**4. a)** 𝒬 est parallèle à (BF), donc il contient une droite Δ parallèle à (BF). Dans le plan 𝒬, la parallèle à Δ passant par M est parallèle à (BF) (deux droites parallèles à une même troisième sont parallèles). Par M il ne passe qu'une parallèle à (BF) : c'est elle, et elle est contenue dans 𝒬. De même, la parallèle à (BF) passant par N est contenue dans 𝒬.
La parallèle à (BF) passant par M est dans la face ABFE et coupe [EF] en M' ; MBFM' est un rectangle, donc FM' = BM = 3 cm et MM' = BF = 8 cm. De même N' est le point de [FG] tel que FN' = BN = 4 cm et NN' = 8 cm.
(MM') et (NN') sont parallèles à (BF) et MM' = NN' : MNN'M' est un parallélogramme. (MM') est parallèle à (BF), donc perpendiculaire au plan (ABC), donc orthogonale à la droite (MN) de ce plan : MNN'M' a un angle droit en M, c'est un rectangle.
Le triangle MBN est rectangle en B : MN² = BM² + BN² = 9 + 16 = 25, donc MN = 5 cm.
Dimensions : 5 cm et 8 cm ; aire : 5 × 8 = 40 cm².

**b)** Le solide qui contient B est le prisme droit MBNM'FN', de base le triangle MBN rectangle en B (aire (3 × 4)/2 = 6 cm²) et de hauteur BF = 8 cm.
Volume : 6 × 8 = 48 cm³. (L'autre solide a pour volume 864 − 48 = 816 cm³.)

**5. a)** La droite (GC) est perpendiculaire au plan (ABC) de la base et C appartient à ce plan : [GC] est la hauteur de la pyramide, GC = 8 cm.
Volume : (1/3) × (12 × 9) × 8 = (1/3) × 108 × 8 = 288 cm³. C'est le tiers du volume du pavé (864 / 3 = 288).

**b)** Le plan (GAC) coupe les deux plans parallèles 𝒫₂ et (ABC) suivant deux droites parallèles : (C₁A₁) ∥ (CA).
Dans le triangle GAC, C₁ est le milieu de [GC] et la droite (C₁A₁) est parallèle à (CA) : d'après le théorème de Thalès (droite des milieux), A₁ est le milieu de [GA].
Le même raisonnement dans les triangles GBC et GDC montre que B₁ et D₁ sont les milieux de [GB] et [GD].

**c)** D'après le théorème de la droite des milieux dans les triangles GAB, GBC, GCD et GDA :

    A₁B₁ = AB/2 = 6,   B₁C₁ = BC/2 = 4.5,   C₁D₁ = CD/2 = 6,   D₁A₁ = DA/2 = 4.5

et chaque côté est parallèle au côté correspondant de la base : (A₁B₁) ∥ (AB), (B₁C₁) ∥ (BC), (C₁D₁) ∥ (CD), (D₁A₁) ∥ (DA).
Comme (AB) ∥ (DC), on a (A₁B₁) ∥ (AB) ∥ (DC) ∥ (D₁C₁), et A₁B₁ = D₁C₁ = 6. Plus précisément, vec(A₁B₁) = (1/2) vec(AB) et vec(D₁C₁) = (1/2) vec(DC) (droite des milieux), et vec(AB) = vec(DC) : donc vec(A₁B₁) = vec(D₁C₁), et A₁B₁C₁D₁ est un parallélogramme (non croisé). Ses côtés [C₁B₁] et [C₁D₁] sont parallèles aux côtés [CB] et [CD], qui sont perpendiculaires : il a un angle droit en C₁. A₁B₁C₁D₁ est un rectangle de 6 cm sur 4.5 cm (de même nature que la base, comme dit le cours).
Aire : 6 × 4.5 = 27 cm², soit 27/108 = 1/4 de l'aire de ABCD.
Le plan 𝒫₂ est parallèle à la face ABCD : il coupe le pavé suivant un rectangle isométrique à ABCD (12 cm sur 9 cm, aire 108 cm²), quatre fois plus grand que la section de la pyramide.

**d)** La hauteur de la petite pyramide GA₁B₁C₁D₁ est GC₁ = 4 cm ((GC) est perpendiculaire à (ABC), donc aussi au plan parallèle 𝒫₂).
Volume : (1/3) × 27 × 4 = 36 cm³, soit 288/8 : le huitième de la grande pyramide.
Volume du tronc de pyramide : 288 − 36 = 252 cm³.
Remarque : les longueurs sont divisées par 2, les aires par 2² = 4 et les volumes par 2³ = 8.

---

## Exercice 2 — Un cornet de glace

Un cornet de glace a la forme d'un cône de révolution (on néglige l'épaisseur du biscuit). On le tient la pointe en bas, l'axe vertical :

- son sommet S est en bas ;
- son ouverture, en haut, est le cercle (𝒞) de centre O et de rayon 3.5 cm, situé dans un plan horizontal ; A est un point de (𝒞) ;
- sa hauteur est SO = 12 cm.

Les valeurs approchées sont données à 0.1 près.

1. a) Calculer la longueur SA d'une génératrice.
   b) Calculer le volume du cornet (valeur exacte en fonction de π, puis valeur approchée).
   c) Le cornet est fabriqué avec un secteur circulaire de papier (son développement). Donner le rayon de ce secteur et la mesure de son angle en degrés. Calculer l'aire du papier utilisé.
2. On remplit le cornet de glace fondue jusqu'à la moitié de sa hauteur. La surface du liquide est la section du cône par le plan horizontal 𝒫 situé à 6 cm de S ; ce plan coupe (SO) en O' et [SA] en A'.
   a) Quelle est la nature de cette section ? Calculer son rayon O'A'.
   b) Calculer le volume du liquide. Le cornet est-il à moitié plein ? Quelle fraction de son volume contient-il ?
3. On vide le cornet et on pose dessus une boule de glace, de centre I et de rayon 3.7 cm. On admet que I est sur l'axe (SO), au-dessus de O, et que le cercle (𝒞) de l'ouverture est tracé sur la sphère qui limite la boule : la boule repose sur le bord du cornet.
   a) Justifier que le triangle IOA est rectangle en O. Calculer IO.
   b) À quelle hauteur au-dessus de la pointe S se trouve le point le plus haut de la boule ? Sur quelle profondeur la boule entre-t-elle dans le cornet (distance du point le plus bas de la boule au plan de l'ouverture) ?
   c) Quelle est la section de la boule par le plan horizontal passant par I ? De combien la boule dépasse-t-elle le bord du cornet, tout autour ?
4. Pendant la dégustation, la glace fond. On suppose que son volume ne change pas en fondant.
   a) Calculer le volume de la boule (valeur exacte, puis valeur approchée).
   b) Si toute la glace fond dans le cornet, le cornet débordera-t-il ? Si oui, quel volume de glace fondue débordera ?

### Corrigé

**1. a)** L'axe (SO) est perpendiculaire au plan de l'ouverture, donc le triangle SOA est rectangle en O :

    SA² = SO² + OA² = 144 + 12.25 = 156.25,   SA = 12.5 cm

**b)** V = (1/3) × π × OA² × SO = (1/3) × π × 12.25 × 12 = 49π cm³ ≈ 153.9 cm³.

**c)** Le développement de la surface du cône est un secteur circulaire de rayon la génératrice, l = 12.5 cm. Son angle mesure

    a = 360 × R / l = 360 × 3.5 / 12.5 = 100.8°

Contrôle : la longueur de l'arc est (100.8/360) × 2π × 12.5 = 7π cm, c'est bien le périmètre 2π × 3.5 de l'ouverture.
L'aire d'un secteur est proportionnelle à son angle : aire = (100.8/360) × π × 12.5² = 0.28 × 156.25 × π = 43.75π cm² ≈ 137.4 cm².

**2. a)** La section d'un cône de révolution par un plan parallèle à sa base est un cercle ; son centre O' est sur l'axe, avec SO' = 6 cm.
Le plan (SOA) coupe les deux plans parallèles 𝒫 et celui de l'ouverture suivant deux droites parallèles : (O'A') ∥ (OA). D'après le théorème de Thalès dans le triangle SOA :

    O'A' / OA = SO' / SO = 6/12,   donc   O'A' = 3.5 / 2 = 1.75 cm

La surface du liquide est le disque de centre O' et de rayon 1.75 cm.

**b)** Le liquide remplit le petit cône de sommet S, de hauteur 6 cm et de rayon 1.75 cm :

    V' = (1/3) × π × 1.75² × 6 = (1/3) × π × 3.0625 × 6 = 6.125π = 49π/8 cm³ ≈ 19.2 cm³

V'/V = (49/8)/49 = 1/8. Le cornet n'est pas à moitié plein : il ne contient que le huitième de son volume (les longueurs sont divisées par 2, le volume par 2³ = 8).

**3. a)** I et O sont sur l'axe (SO), perpendiculaire au plan de l'ouverture, donc (IO) est orthogonale à la droite (OA) de ce plan : le triangle IOA est rectangle en O.
A est sur la sphère, donc IA = 3.7 cm ; OA = 3.5 cm.

    IO² = IA² − OA² = 13.69 − 12.25 = 1.44,   IO = 1.2 cm

(C'est le résultat du cours lu à l'envers : le plan de l'ouverture est à la distance 1.2 du centre I, et la section de la sphère est le cercle de rayon √(3.7² − 1.2²) = 3.5.)

**b)** Le point le plus haut de la boule est sur l'axe, 3.7 cm au-dessus de I : sa hauteur au-dessus de S est 12 + 1.2 + 3.7 = 16.9 cm.
Le point le plus bas est sur l'axe, 3.7 cm au-dessous de I : il est à 3.7 − 1.2 = 2.5 cm sous le plan de l'ouverture (à 9.5 cm au-dessus de S). La boule entre de 2.5 cm dans le cornet.

**c)** Le plan horizontal passant par I contient le centre de la sphère : la section de la boule est le disque de centre I et de rayon 3.7 cm, limité par un grand cercle de la sphère.
Ce disque est plus grand que l'ouverture (rayon 3.5 cm) : la boule dépasse le bord du cornet de 3.7 − 3.5 = 0.2 cm tout autour.

**4. a)** V_boule = (4/3) × π × 3.7³ = (4/3) × 50.653 × π = 202.612π/3 cm³ (valeur exacte) ≈ 67.54π cm³ ≈ 212.2 cm³.

**b)** 212.2 > 153.9 : le volume de la glace est plus grand que celui du cornet, le cornet débordera.
Volume qui déborde : V_boule − V ≈ 212.17 − 153.94 ≈ 58.2 cm³.
