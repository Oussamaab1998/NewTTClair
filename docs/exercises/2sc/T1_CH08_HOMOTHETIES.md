# 2ème Sciences — Tome 1, Chapitre 8 : Homothéties

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 22 (activités géométriques) : homothétie. Aptitudes : construire l'image d'un point par une homothétie, reconnaître l'image d'une figure, reconnaître qu'une application du plan est une homothétie ; résoudre des problèmes d'alignement, de concours, de construction et de lieux géométriques en utilisant les propriétés d'une homothétie.
- Manuel CNP (tome 1, chapitre 8, p. 129–147) : homothétie de centre I et de rapport k (k réel non nul) : h(I, k)(M) = M' ⟺ vec(IM') = k vec(IM) ; un point, son image et le centre sont alignés ; propriété caractéristique vec(M'N') = k vec(MN), d'où (MN) // (M'N') et M'N' = |k| MN ; l'image d'une droite est une droite qui lui est parallèle, celle d'un cercle de centre O et de rayon R est le cercle de centre h(O) et de rayon |k| R ; le périmètre d'un polygone est multiplié par |k| et son aire par k² ; une homothétie conserve l'alignement, le milieu, le barycentre, les angles, le parallélisme, l'orthogonalité et le contact ; configuration du trapèze, cercles homothétiques et tangentes communes à deux cercles (activité 27), problèmes de lieux et de construction.
- Outils autorisés : ce chapitre, les chapitres 5 à 7 (calcul vectoriel, barycentre, translations) et les acquis de 1ère année (Thalès, Pythagore, tangente perpendiculaire au rayon, angle inscrit dans un demi-cercle, cas d'égalité MA + MB = AB). Pas de rotation (chapitre 9). Les figures sont décrites en mots, sans repère.
- Notation : vec(AB) est le vecteur AB et AB la distance ; h(I, k) est l'homothétie de centre I et de rapport k ; « M₁ est le symétrique de M par rapport à A » signifie que A est le milieu de [MM₁].
- Toutes les affirmations des corrigés sont vérifiées par `check_t1_ch08.py` (chaque figure est placée dans un repère à l'intérieur du script ; calcul exact en fractions et en nombres de la forme a + b√7 ou a + b√3 ; les propriétés générales de l'exercice 1 sont testées sur 150 triangles quelconques).

---

## Exercice 1 — Image d'un triangle, centre d'une homothétie, application définie par un barycentre

Soit ABC un triangle tel que AB = 6, AC = 4 et BC = 5. On note A' le milieu de [BC]. On considère les points E et F définis par

    vec(AE) = −(1/2) vec(AB)     et     vec(AF) = −(1/2) vec(AC)

1. a) Montrer que E et F sont les images respectives de B et de C par une homothétie h dont on précisera le centre et le rapport. Construire E et F.
   b) Montrer que les droites (EF) et (BC) sont parallèles et calculer EF.
   c) Calculer le périmètre du triangle AEF. Exprimer l'aire du triangle AEF en fonction de l'aire 𝒜 du triangle ABC.
2. Soit f l'application du plan qui à tout point M associe le barycentre M' des points pondérés (A, 3) et (M, −2).
   a) Montrer que f est une homothétie dont on précisera le centre et le rapport.
   b) Déterminer f(E) et f(F).
3. Soit g l'homothétie de rapport 1/2 qui transforme B en F. On note Ω son centre.
   a) Montrer que Ω est le symétrique de B par rapport à F. Construire Ω.
   b) Montrer que g(C) = E. En déduire que les droites (BF) et (CE) sont sécantes en Ω.
   c) On note A'' le milieu de [EF]. Montrer que g(A') = A'' et que h(A') = A''. En déduire que Ω appartient à la médiane (AA') du triangle ABC.
   d) Montrer que vec(AΩ) = −2 vec(AA'). Retrouver ainsi le résultat du c) et vérifier que Ω = f(A').
4. On note 𝒞 le cercle circonscrit au triangle ABC, O son centre et R son rayon.
   a) Montrer que l'image 𝒞' de 𝒞 par h est le cercle circonscrit au triangle AEF. Préciser son centre O' et son rayon.
   b) Montrer que les points O, A et O' sont alignés et calculer OO' en fonction de R. En déduire que les cercles 𝒞 et 𝒞' sont tangents en A.

### Corrigé

**1. a)** Par définition de l'homothétie, vec(AE) = −(1/2) vec(AB) signifie que E est l'image de B par l'homothétie h de centre A et de rapport −1/2 ; de même F = h(C).
Construction : E est sur la droite (AB), du côté de A opposé à B, avec AE = AB/2 = 3 ; F est sur la droite (AC), du côté de A opposé à C, avec AF = AC/2 = 2.

**b)** h(B) = E et h(C) = F, donc d'après la propriété caractéristique :

    vec(EF) = −(1/2) vec(BC)

Les vecteurs vec(EF) et vec(BC) sont colinéaires : (EF) // (BC). De plus EF = |−1/2| × BC = 5/2 = 2.5.

**c)** AE + AF + EF = 3 + 2 + 2.5 = 7.5. C'est bien la moitié du périmètre de ABC (6 + 4 + 5 = 15), car h multiplie les longueurs par |−1/2| = 1/2.
L'aire est multipliée par (−1/2)² = 1/4 : l'aire du triangle AEF est 𝒜/4.

**2. a)** 3 + (−2) = 1 ≠ 0, donc le barycentre M' existe pour tout point M, et

    vec(AM') = (−2) / (3 + (−2)) × vec(AM) = −2 vec(AM)

(pour M = A on obtient M' = A). f est donc l'homothétie de centre A et de rapport −2.

**b)** vec(AE) = −(1/2) vec(AB) donne vec(AB) = −2 vec(AE) : f(E) = B. De même vec(AC) = −2 vec(AF) : f(F) = C.

**3. a)** g(B) = F signifie vec(ΩF) = (1/2) vec(ΩB), soit vec(ΩB) = 2 vec(ΩF). Avec vec(ΩB) = vec(ΩF) + vec(FB), on obtient vec(FB) = vec(ΩF) : F est le milieu de [ΩB], c'est-à-dire que Ω est le symétrique de B par rapport à F. (Autrement dit, Ω est le barycentre de (B, −1) et (F, 2).)
Construction : sur la demi-droite [BF), au-delà de F, on reporte FΩ = BF.

**b)** Soit C₁ = g(C). Comme g(B) = F, la propriété caractéristique donne vec(FC₁) = (1/2) vec(BC). D'autre part

    vec(FE) = vec(FA) + vec(AE) = (1/2) vec(AC) − (1/2) vec(AB) = (1/2) vec(BC)

Donc vec(FC₁) = vec(FE), C₁ = E : g(C) = E.
Un point, son image et le centre sont alignés : Ω appartient à (BF) (car g(B) = F) et à (CE) (car g(C) = E). Ces deux droites sont distinctes : sinon B, C et E seraient alignés, E serait sur (BC) et sur (AB), donc E = B, ce qui est faux. Les droites (BF) et (CE) sont donc sécantes en Ω.

**c)** Une homothétie conserve le milieu. A' est le milieu de [BC], donc g(A') est le milieu de [g(B)g(C)] = [FE] : g(A') = A''. De même h(A') est le milieu de [h(B)h(C)] = [EF] : h(A') = A''.
g(A') = A'' donne Ω, A', A'' alignés ; h(A') = A'' donne A, A', A'' alignés. Or A' ≠ A'' (le seul point invariant par h est A, et A' ≠ A). Les points Ω et A sont donc tous deux sur la droite (A'A''), qui est la droite (AA') : Ω appartient à la médiane (AA').

**d)** D'après le a), vec(BΩ) = 2 vec(BF). Donc

    vec(AΩ) = vec(AB) + 2 vec(BF) = vec(AB) + 2 vec(AF) − 2 vec(AB) = 2 vec(AF) − vec(AB) = −vec(AC) − vec(AB)

Comme A' est le milieu de [BC], vec(AB) + vec(AC) = 2 vec(AA'). Ainsi vec(AΩ) = −2 vec(AA') : les vecteurs vec(AΩ) et vec(AA') sont colinéaires, ce qui redonne Ω ∈ (AA'). Enfin, d'après le 2. a), le point M' = f(A') vérifie vec(AM') = −2 vec(AA') : Ω = f(A').

**4. a)** L'image de 𝒞 par h est le cercle 𝒞' de centre O' = h(O) et de rayon |−1/2| × R = R/2. Il passe par h(A) = A, h(B) = E et h(C) = F. Les points A, E et F ne sont pas alignés, et il existe un seul cercle passant par trois points non alignés : 𝒞' est le cercle circonscrit au triangle AEF.
Son centre O' vérifie vec(AO') = −(1/2) vec(AO) et son rayon est R/2.

**b)** vec(AO') = −(1/2) vec(AO) : les points O, A et O' sont alignés et les vecteurs vec(AO) et vec(AO') sont de sens contraires, donc A est entre O et O'. Avec AO = R et AO' = R/2 :

    OO' = OA + AO' = R + R/2 = 3R/2

Si N est un point commun à 𝒞 et 𝒞', alors ON + NO' = R + R/2 = OO', donc N appartient au segment [OO'] avec ON = R : N = A. Le point A est le seul point commun aux deux cercles, et la perpendiculaire à (OO') en A, perpendiculaire en A aux rayons [OA] et [O'A], est tangente aux deux cercles : 𝒞 et 𝒞' sont tangents en A.
Autre méthode : la tangente T à 𝒞 en A a pour image par h une droite parallèle à T passant par h(A) = A, c'est-à-dire T elle-même ; comme h conserve le contact, T est tangente à 𝒞' en A. Les deux cercles ont la même tangente en A.

---

## Exercice 2 — Deux cercles tangents : centres d'homothétie, alignement, tangentes communes

Soit 𝒞 le cercle de centre O et de rayon 3 et 𝒞' le cercle de centre O' et de rayon 1, avec OO' = 4.

1. a) Montrer que 𝒞 et 𝒞' ont un seul point commun T, situé sur le segment [OO'], que l'on précisera. On note Δ_T la droite perpendiculaire à (OO') en T : justifier que Δ_T est tangente à 𝒞 et à 𝒞' en T.
   b) On note h₁ l'homothétie de centre T et de rapport −1/3. Montrer que h₁(O) = O', puis que h₁(𝒞) = 𝒞'.
2. Soit Δ une droite passant par T, distincte de (OO') et de Δ_T. Elle recoupe 𝒞 en M et 𝒞' en M'.
   a) Montrer que h₁(M) = M'.
   b) En déduire que les droites (OM) et (O'M') sont parallèles et que TM' = TM/3.
   c) Montrer que la tangente à 𝒞 en M et la tangente à 𝒞' en M' sont parallèles.
3. On note Ω le point tel que vec(ΩO') = (1/3) vec(ΩO) et h₂ l'homothétie de centre Ω et de rapport 1/3.
   a) Montrer que Ω est le barycentre des points pondérés (O, −1) et (O', 3). Calculer OΩ et O'Ω, puis construire Ω.
   b) Montrer que h₂(𝒞) = 𝒞'.
   c) On reprend les points M et M' du 2. et on note M'' le point de 𝒞' diamétralement opposé à M'. Montrer que h₂(M) = M''. En déduire que les points Ω, M et M'' sont alignés.
4. a) Construire les deux points P₁ et P₂ de 𝒞 tels que les droites (ΩP₁) et (ΩP₂) soient tangentes à 𝒞. On note P l'un de ces deux points. Calculer ΩP.
   b) On note P' = h₂(P). Montrer que P' appartient à 𝒞' et que la droite (ΩP) est tangente à 𝒞' en P'.
   c) Calculer ΩP' et PP'.
5. Les droites Δ_T et (ΩP) se coupent en un point K.
   a) Montrer que KP = KT et KT = KP'. En déduire que K est le milieu de [PP'].
   b) Calculer KT. En donner une valeur approchée à 10⁻² près.

### Corrigé

**1. a)** Soit T le point du segment [OO'] tel que OT = 3 ; alors O'T = 4 − 3 = 1. Donc T ∈ 𝒞 et T ∈ 𝒞'.
Si un point N est sur les deux cercles, alors ON + NO' = 3 + 1 = 4 = OO'. L'égalité ON + NO' = OO' signifie que N est sur le segment [OO'] ; comme ON = 3, N = T. Le seul point commun est T.
Δ_T est perpendiculaire en T au rayon [OT] de 𝒞 : elle est tangente à 𝒞 en T. Elle est aussi perpendiculaire en T au rayon [O'T] de 𝒞' : elle est tangente à 𝒞' en T.

**b)** T est entre O et O', donc vec(TO) et vec(TO') sont de sens contraires ; TO = 3 et TO' = 1. Ainsi vec(TO') = −(1/3) vec(TO) : h₁(O) = O'.
L'image de 𝒞 par h₁ est le cercle de centre h₁(O) = O' et de rayon |−1/3| × 3 = 1 : h₁(𝒞) = 𝒞'.

**2. a)** M est sur 𝒞 et M ≠ T. Le point h₁(M) est sur h₁(𝒞) = 𝒞', et sur la droite (TM) = Δ (un point, son image et le centre sont alignés). De plus h₁(M) ≠ T, car h₁(T) = T et M ≠ T. Or Δ coupe 𝒞' en exactement deux points, T et M'. Donc h₁(M) = M'.

**b)** h₁(O) = O' et h₁(M) = M', donc vec(O'M') = −(1/3) vec(OM) : les droites (OM) et (O'M') sont parallèles. De même vec(TM') = −(1/3) vec(TM), donc TM' = TM/3.

**c)** La tangente à 𝒞 en M est perpendiculaire à (OM) ; la tangente à 𝒞' en M' est perpendiculaire à (O'M'). Comme (OM) // (O'M'), ces deux tangentes sont parallèles. (On peut aussi dire : h₁ transforme la tangente à 𝒞 en M en une droite qui lui est parallèle et qui, par conservation du contact, est tangente à 𝒞' en M'.)

**3. a)** vec(ΩO') = (1/3) vec(ΩO) ⟺ 3 vec(ΩO') − vec(ΩO) = 0 ⟺ (−1) vec(ΩO) + 3 vec(ΩO') = 0. Comme −1 + 3 = 2 ≠ 0, Ω est le barycentre de (O, −1) et (O', 3). Alors

    vec(OΩ) = 3 / (−1 + 3) × vec(OO') = (3/2) vec(OO')

Donc OΩ = 6 et O'Ω = 6 − 4 = 2 : Ω est sur la demi-droite [OO'), au-delà de O'. Construction : on reporte O'Ω = 2 à partir de O', du côté opposé à O.

**b)** Par définition de Ω, h₂(O) = O'. L'image de 𝒞 par h₂ est le cercle de centre O' et de rayon (1/3) × 3 = 1 : h₂(𝒞) = 𝒞'.

**c)** Soit N = h₂(M). Comme h₂(O) = O', la propriété caractéristique donne vec(O'N) = (1/3) vec(OM). D'après le 2. b), vec(O'M') = −(1/3) vec(OM). Donc vec(O'N) = −vec(O'M') : O' est le milieu de [M'N], c'est-à-dire N = M''.
h₂(M) = M'' : le centre Ω, le point M et son image M'' sont alignés.

**4. a)** La droite (ΩP) est tangente à 𝒞 en P si et seulement si (ΩP) ⟂ (OP), c'est-à-dire si et seulement si l'angle OPΩ est droit, donc si et seulement si P est sur le cercle de diamètre [OΩ].
Le milieu de [OΩ] est T (car OT = 3 = OΩ/2) : le cercle de diamètre [OΩ] est le cercle de centre T et de rayon 3. Ce cercle et 𝒞 ont le même rayon 3 : un point commun est équidistant de O et de T, donc sur la médiatrice de [OT]. Cette médiatrice passe par le milieu de [OT], à la distance 3/2 < 3 de O : elle coupe 𝒞 en deux points P₁ et P₂, symétriques par rapport à (OO'), qui sont aussi à la distance 3 de T. Les points cherchés sont donc P₁ et P₂.
Construction : on trace la médiatrice de [OT] (ou le cercle de centre T et de rayon 3) ; elle coupe 𝒞 en P₁ et P₂.
Le triangle OPΩ est rectangle en P : ΩP² = OΩ² − OP² = 36 − 9 = 27, donc ΩP = √27 = 3√3.

**b)** P' = h₂(P) est sur h₂(𝒞) = 𝒞'.
La droite (ΩP) passe par le centre Ω : son image par h₂ est une droite parallèle à (ΩP) passant par h₂(Ω) = Ω, c'est-à-dire (ΩP) elle-même. h₂ conserve le contact : (ΩP), tangente à 𝒞 en P, a pour image une droite tangente à h₂(𝒞) = 𝒞' en h₂(P) = P'. Donc (ΩP) est tangente à 𝒞' en P'.

**c)** vec(ΩP') = (1/3) vec(ΩP), donc ΩP' = 3√3/3 = √3 et P' appartient au segment [ΩP]. Ainsi PP' = ΩP − ΩP' = 3√3 − √3 = 2√3.
Contrôle : le triangle ΩP'O' est rectangle en P', donc ΩP'² = ΩO'² − O'P'² = 4 − 1 = 3.

**5. a)** Les droites Δ_T et (ΩP) sont bien sécantes : sinon (ΩP) serait perpendiculaire à (OO') en Ω, et le triangle OPΩ aurait deux angles droits (en P et en Ω).
(KT) est tangente à 𝒞 en T et (KP) est tangente à 𝒞 en P. Les triangles KTO et KPO sont rectangles en T et en P, donc

    KT² = KO² − OT² = KO² − 9     et     KP² = KO² − OP² = KO² − 9

D'où KT = KP. De même (KT) et (KP') sont tangentes à 𝒞' en T et en P' : KT² = KO'² − 1 = KP'², d'où KT = KP'.
Ainsi KP = KP' ; comme K est sur la droite (PP') et que P ≠ P', K est le milieu de [PP'].

**b)** KT = KP = PP'/2 = √3 ≈ 1.73.
