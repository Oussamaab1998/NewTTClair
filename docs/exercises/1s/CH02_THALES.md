# 1ère année — Chapitre 2 : Théorème de Thalès et sa réciproque

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10, « Activités géométriques » : théorème de Thalès et réciproque ; montrer que deux droites sont parallèles en utilisant la réciproque du théorème de Thalès ; construire un segment dont la longueur est la 4ème proportionnelle à trois longueurs données ; partager un segment en segments isométriques ; modéliser des situations réelles. P. 14, « Activités sur les mesures de grandeurs » : mesurer des longueurs en utilisant le théorème de Thalès et sa réciproque ou le théorème de Pythagore et sa réciproque.
- Manuel CNP, chapitre 2 (p. 23–36) : droite des milieux ; théorème de Thalès : si (AB) et (AC) sont sécantes en A, M ∈ (AB), N ∈ (AC) et (MN) // (BC), alors AM/AB = AN/AC = MN/BC (ce qui couvre aussi la configuration où A est entre B et M) ; réciproque énoncée dans trois positions (M ∈ [AB] et N ∈ [AC] ; B ∈ [AM] et C ∈ [AN] ; A ∈ [BM] et A ∈ [CN]) : si AM/AB = AN/AC, alors (BC) // (MN) ; agrandissement et réduction (le périmètre est multiplié par l'échelle k et l'aire par k², vu en activité) ; partage d'un segment dans une proportion donnée.
- Outils autorisés : ce chapitre, le chapitre 1 (angles, droites parallèles) et les acquis du collège (théorème de Pythagore et sa réciproque, aire d'un triangle, rectangle, deux droites perpendiculaires à une même droite sont parallèles). Pas de rapports trigonométriques (chapitre 3), pas de vecteurs (chapitre 4).
- Notation : AB est une longueur ; (AB) // (CD) signifie que les droites (AB) et (CD) sont parallèles ; [Bx) est une demi-droite d'origine B ; ⟂ signifie « perpendiculaire ».
- Toutes les valeurs sont vérifiées par `check_ch02.py` (chaque figure est placée dans un repère à l'intérieur du script, les points définis par une parallèle sont obtenus par intersection de droites ; calcul exact en fractions ; la construction de l'exercice 1 est testée avec 60 demi-droites [Bx) différentes et la formule de l'exercice 2 sur 300 choix de poteaux).

---

## Exercice 1 — Thalès, réciproque, réduction, partage d'un segment

ABC est un triangle tel que AB = 6 cm, AC = 8 cm et BC = 10 cm.

1. Montrer que le triangle ABC est rectangle en A, puis calculer son aire.
2. Soit M le point du segment [AB] tel que AM = 4.5 cm. La parallèle à (BC) passant par M coupe [AC] en N.
   a) Calculer AN et MN.
   b) Le triangle AMN est une réduction du triangle ABC. Préciser l'échelle k de cette réduction. Calculer le périmètre et l'aire du triangle AMN, puis les comparer avec le périmètre et l'aire du triangle ABC.
3. Soit P le point de [AC] tel que AP = 2 cm et Q le point de [AB] tel que AQ = 1.5 cm.
   a) Montrer que (PQ) // (BC). En déduire que (PQ) // (MN).
   b) Calculer PQ.
   c) Soit R le point de [AC] tel que AR = 3 cm. Les droites (QR) et (BC) sont-elles parallèles ? Justifier.
4. Soit E le point de la droite (AB) tel que A ∈ [BE] et AE = 3 cm, et F le point de la droite (AC) tel que A ∈ [CF] et AF = 4 cm.
   a) Montrer que (EF) // (BC).
   b) Calculer EF.
5. On dispose seulement d'une règle non graduée, d'une équerre et d'un compas. Expliquer comment construire le point G du segment [BC] tel que BG = (2/5) BC, et justifier la construction. Calculer BG.

### Corrigé

**1.** AB² + AC² = 36 + 64 = 100 et BC² = 100. Donc BC² = AB² + AC² : d'après la réciproque du théorème de Pythagore, le triangle ABC est rectangle en A.
Aire de ABC : (1/2) × AB × AC = (1/2) × 6 × 8 = 24 cm².

**2. a)** Les droites (AB) et (AC) sont sécantes en A, M ∈ (AB), N ∈ (AC) et (MN) // (BC). D'après le théorème de Thalès :

    AM/AB = AN/AC = MN/BC,   avec   AM/AB = 4.5/6 = 3/4

Donc AN = (3/4) × 8 = 6 cm et MN = (3/4) × 10 = 7.5 cm.

**b)** Les côtés du triangle AMN sont les côtés du triangle ABC multipliés par 3/4 : l'échelle de la réduction est k = 3/4.

- Périmètre de AMN : 4.5 + 6 + 7.5 = 18 cm. Périmètre de ABC : 6 + 8 + 10 = 24 cm, et (3/4) × 24 = 18 : le périmètre est multiplié par k.
- Le triangle AMN est rectangle en A (l'angle MAN est l'angle BAC). Aire de AMN : (1/2) × 4.5 × 6 = 13.5 cm². Or k² × 24 = (9/16) × 24 = 13.5 : l'aire est multipliée par k² = 9/16.

**3. a)** Q ∈ [AB] et P ∈ [AC], distincts de A, et

    AQ/AB = 1.5/6 = 1/4   et   AP/AC = 2/8 = 1/4

Les deux rapports sont égaux : d'après la réciproque du théorème de Thalès, (QP) // (BC).
Les droites (PQ) et (MN) sont toutes deux parallèles à (BC), donc elles sont parallèles entre elles.

**b)** D'après le théorème de Thalès (car (QP) // (BC)) : PQ/BC = AQ/AB = 1/4, donc PQ = 10/4 = 2.5 cm.
Contrôle : le triangle APQ est rectangle en A et 1.5² + 2² = 2.25 + 4 = 6.25 = 2.5².

**c)** AQ/AB = 1/4 = 2/8 et AR/AC = 3/8.
Si les droites (QR) et (BC) étaient parallèles, le théorème de Thalès donnerait AQ/AB = AR/AC, c'est-à-dire 2/8 = 3/8, ce qui est faux. Donc (QR) et (BC) ne sont pas parallèles.

**4. a)** E ∈ (AB), F ∈ (AC), A ∈ [BE] et A ∈ [CF] (troisième position de la réciproque), et

    AE/AB = 3/6 = 1/2   et   AF/AC = 4/8 = 1/2

Les rapports sont égaux : d'après la réciproque du théorème de Thalès, (EF) // (BC).

**b)** D'après le théorème de Thalès : EF/BC = AE/AB = 1/2, donc EF = 10/2 = 5 cm.

**5.** Construction :

- On trace une demi-droite [Bx) d'origine B, qui n'est pas portée par la droite (BC).
- Avec le compas, sans changer l'écartement, on place sur [Bx) les points U₁, U₂, U₃, U₄, U₅ tels que BU₁ = U₁U₂ = U₂U₃ = U₃U₄ = U₄U₅. Ainsi BU₂ = 2 BU₁ et BU₅ = 5 BU₁.
- On trace la droite (U₅C), puis, avec la règle et l'équerre, la parallèle à (U₅C) passant par U₂. Elle coupe [BC] en G.

Justification : dans le triangle BU₅C, U₂ ∈ [BU₅], G ∈ [BC] et (U₂G) // (U₅C). D'après le théorème de Thalès :

    BG/BC = BU₂/BU₅ = 2/5

Donc BG = (2/5) × 10 = 4 cm. (Le résultat ne dépend pas de la demi-droite [Bx) choisie.)

---

## Exercice 2 — Deux poteaux et deux câbles

Sur un terrain plat, deux poteaux verticaux [AB] et [DC] sont plantés aux points A et D du sol, distants de 9 m. Leurs hauteurs sont AB = 6 m et DC = 3 m (B et C sont les sommets des poteaux). On tend un câble du sommet B au pied D, et un autre du sommet C au pied A. Les deux câbles se croisent en un point O. On note H le point du sol tel que (OH) ⟂ (AD).
On modélise la situation dans un plan vertical : (AD) est la droite du sol, (AB) ⟂ (AD), (DC) ⟂ (AD), et B et C sont du même côté de (AD).

1. a) Justifier que (AB) // (DC).
   b) Calculer les longueurs BD et AC des câbles (valeurs exactes, puis valeurs approchées à 0.01 près).
2. a) Montrer que OD/OB = OC/OA = 1/2.
   b) En déduire que OD = BD/3, puis calculer OD, OB, OC et OA (valeurs exactes et approchées à 0.01 près).
3. a) Justifier que (OH) // (AB).
   b) En utilisant le triangle DAB, calculer DH et OH. En déduire AH.
   c) Retrouver OH en utilisant le triangle ADC.
4. Dans cette question, les poteaux ont des hauteurs quelconques AB = a et DC = b, et la distance entre leurs pieds est AD = d (a, b et d sont des réels strictement positifs).
   a) Montrer que OH/a = DH/d et que OH/b = AH/d.
   b) En déduire que OH/a + OH/b = 1, puis que OH = ab/(a + b). La hauteur du point de croisement dépend-elle de la distance entre les poteaux ?
   c) Vérifier la formule avec les données du début. Que vaut OH si les deux poteaux ont la même hauteur a ?
5. Le premier poteau mesure toujours 6 m. Quelle doit être la hauteur du second poteau pour que les câbles se croisent à 2.4 m du sol ?
6. On revient aux données du début (AB = 6 m, DC = 3 m, AD = 9 m). Un anneau P est fixé sur le câble [BD] de sorte que BP = BD/3. Le point Q du poteau [AB] est tel que AQ = 4 m.
   a) Montrer que (PQ) // (AD).
   b) En déduire la hauteur de l'anneau P au-dessus du sol, ainsi que la distance PQ.

### Corrigé

**1. a)** Les droites (AB) et (DC) sont toutes deux perpendiculaires à la droite (AD) : elles sont parallèles.

**b)** Le triangle BAD est rectangle en A. D'après le théorème de Pythagore :

    BD² = AB² + AD² = 36 + 81 = 117,   donc   BD = √117 = 3√13 ≈ 10.82 m

Le triangle ADC est rectangle en D :

    AC² = AD² + DC² = 81 + 9 = 90,   donc   AC = √90 = 3√10 ≈ 9.49 m

**2. a)** Les droites (BD) et (AC) sont sécantes en O ; D ∈ (OB), C ∈ (OA) et (DC) // (AB). D'après le théorème de Thalès (O est entre B et D, et entre A et C) :

    OD/OB = OC/OA = DC/AB = 3/6 = 1/2

**b)** O est sur le segment [BD], donc BD = OB + OD = 2 OD + OD = 3 OD. Ainsi OD = BD/3 = √13 ≈ 3.61 m et OB = 2 OD = 2√13 ≈ 7.21 m.
De même AC = OA + OC = 3 OC, donc OC = AC/3 = √10 ≈ 3.16 m et OA = 2√10 ≈ 6.32 m.

**3. a)** Les droites (OH) et (AB) sont toutes deux perpendiculaires à (AD) : elles sont parallèles.

**b)** Dans le triangle DAB : H ∈ [DA], O ∈ [DB] et (HO) // (AB). D'après le théorème de Thalès :

    DH/DA = DO/DB = HO/AB = 1/3

Donc DH = 9/3 = 3 m et OH = 6/3 = 2 m.
De même, dans le triangle ADC (où (OH) // (DC), car ces deux droites sont perpendiculaires à (AD)), AH = AD × AO/AC = 9 × 2/3 = 6 m (AO/AC = 2/3 d'après le 2. b)). Ainsi DH = 3 < 9 et AH = 6 < 9 : le point H de la droite (AD) est entre A et D, et l'on vérifie que DH + AH = 3 + 6 = 9 = AD.

**c)** (OH) et (DC) sont perpendiculaires à (AD), donc (OH) // (DC). Dans le triangle ADC : H ∈ [AD], O ∈ [AC], et

    AH/AD = AO/AC = OH/DC,   avec   AO/AC = 2/3

Donc OH = (2/3) × 3 = 2 m : on retrouve le résultat du b).

**4. a)** Comme au 3. b), le théorème de Thalès dans le triangle DAB (avec (HO) // (AB)) donne HO/AB = DH/DA, soit OH/a = DH/d.
Comme au 3. c), dans le triangle ADC (avec (HO) // (DC)) : HO/DC = AH/AD, soit OH/b = AH/d.

**b)** Par le théorème de Thalès, DH = d × DO/DB < d et AH = d × AO/AC < d, car O est sur les deux câbles (O ∈ [DB] et O ∈ [AC]). Le point H de la droite (AD) est donc entre A et D, et DH + AH = d. En additionnant les deux égalités du a) :

    OH/a + OH/b = DH/d + AH/d = (DH + AH)/d = d/d = 1

En réduisant au même dénominateur : OH × (b + a)/(ab) = 1, donc OH = ab/(a + b).
Cette formule ne contient pas d : la hauteur du point de croisement ne dépend pas de la distance entre les poteaux.

**c)** Avec a = 6 et b = 3 : OH = 18/9 = 2 m, comme au 3.
Si a = b : OH = a²/(2a) = a/2. (ABCD est alors un rectangle et O est son centre.)

**5.** On cherche b tel que OH = 2.4 avec a = 6 :

    2.4/6 + 2.4/b = 1   ⟺   0.4 + 2.4/b = 1   ⟺   2.4/b = 0.6   ⟺   b = 2.4/0.6 = 4

Le second poteau doit mesurer 4 m. Contrôle : 6 × 4 / (6 + 4) = 24/10 = 2.4.

**6. a)** Dans le triangle BAD : Q ∈ [BA], P ∈ [BD], avec BQ = 6 − 4 = 2 m, et

    BQ/BA = 2/6 = 1/3   et   BP/BD = 1/3

Les rapports sont égaux : d'après la réciproque du théorème de Thalès, (QP) // (AD).

**b)** Soit K le point du sol tel que (PK) ⟂ (AD). Le quadrilatère AQPK a trois angles droits (en A, en K, et en Q car (QP) // (AD) et (AB) ⟂ (AD)) : c'est un rectangle. Donc PK = AQ = 4 m : l'anneau est à 4 m du sol.
Par le théorème de Thalès, PQ/DA = BQ/BA = 1/3, donc PQ = 9/3 = 3 m : l'anneau est à 3 m du premier poteau (il est entre B et O sur le câble, car BP = BD/3 < BO = 2BD/3).
