# 2ème Sciences — Tome 1, Chapitre 7 : Translations

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 22 (activités géométriques) : translation. Aptitudes : construire l'image d'un point par une translation, reconnaître l'image d'une figure, reconnaître qu'une application du plan est une translation ; résoudre des problèmes d'alignement, de construction et de lieux géométriques en utilisant les propriétés d'une translation.
- Manuel CNP (tome 1, chapitre 7, p. 109–128) : application du plan dans lui-même, image et antécédent ; translation de vecteur u : t(M) = M' ⟺ vec(MM') = u ; propriété caractéristique (une application est une translation si et seulement si vec(M'N') = vec(MN) pour tous points M et N) ; une translation conserve les distances, l'alignement, le milieu, le barycentre, le parallélisme, l'orthogonalité, le contact et les angles ; l'image d'une droite est une droite qui lui est parallèle, celle d'un cercle est un cercle de même rayon ; la succession de deux symétries centrales est étudiée en activité, point par point (sans notation de composée) ; problèmes de lieux et de construction.
- Outils autorisés : ce chapitre, le calcul vectoriel et le barycentre (chapitres 5 et 6), les acquis de 1ère année (symétries, théorème de Thalès et droite des milieux, Pythagore, angle inscrit dans un demi-cercle, losange). Pas d'homothétie ni de rotation (chapitres 8 et 9). Les figures sont décrites en mots, sans repère.
- Notation : vec(AB) est le vecteur AB et AB la distance ; t(M) est l'image du point M par la translation t ; « M₁ est le symétrique de M par rapport à A » signifie que A est le milieu de [MM₁].
- Toutes les affirmations des corrigés sont vérifiées par `check_t1_ch07.py` (chaque figure est placée dans un repère à l'intérieur du script ; calcul exact en fractions et en nombres de la forme a + b√3).

---

## Exercice 1 — Images de points et de droites, reconnaître une translation

Soit ABCD un parallélogramme de centre O. On note I le milieu de [BC], J le milieu de [AD] et K le milieu de [AB]. On note t la translation de vecteur vec(AO).

1. a) Déterminer t(A) et t(O).
   b) Construire les points B' = t(B) et D' = t(D). Montrer que BB'D'D est un parallélogramme.
   c) Montrer que C est le milieu du segment [B'D'].
2. a) Montrer que t(K) = I.
   b) Montrer que O est le milieu de [IJ]. En déduire que l'image de la droite (AB) par t est la droite (IJ).
   c) Déterminer le point de la droite (AB) dont l'image par t appartient à la droite (BC).
3. Pour tout point M du plan, on note M₁ le symétrique de M par rapport à A, puis M' le symétrique de M₁ par rapport à O. On note g l'application du plan qui à tout point M associe le point M'.
   a) Montrer que vec(MM') = 2 vec(AO). En déduire que g est une translation dont on précisera le vecteur.
   b) Montrer que, pour tout point M du plan, g(M) = t(t(M)).
   c) Déterminer g(A) et g(O).
4. Soit f l'application du plan qui à tout point M associe le point M₂ tel que

       vec(MM₂) = vec(MB) + vec(MD) − 2 vec(MA)

   Montrer que f est une translation et que f = g.

### Corrigé

**1. a)** O est le milieu de [AC], donc vec(AO) = vec(OC).
t(A) est le point M' tel que vec(AM') = vec(AO) : t(A) = O.
t(O) est le point M' tel que vec(OM') = vec(AO) = vec(OC) : t(O) = C.

**b)** B' est le point tel que vec(BB') = vec(AO) = vec(OC). Construction : B' est le quatrième sommet du parallélogramme OBB'C (on trace la parallèle à (OC) passant par B et la parallèle à (OB) passant par C ; elles se coupent en B'). De même, vec(DD') = vec(OC) : D' est le quatrième sommet du parallélogramme ODD'C.
On a vec(BB') = vec(AO) = vec(DD'), donc BB'D'D est un parallélogramme. Il n'est pas aplati : le vecteur vec(AO) dirige la droite (AC), qui n'est pas parallèle à la diagonale (BD).

**c)** O est le milieu de [BD] et une translation conserve le milieu : t(O) = C est le milieu de [t(B)t(D)] = [B'D'].
Contrôle : OBB'C et ODD'C sont des parallélogrammes, donc vec(CB') = vec(OB) et vec(CD') = vec(OD) = −vec(OB). Ainsi vec(CB') = −vec(CD').

**2. a)** Dans le triangle ABC, K est le milieu de [AB] et I celui de [BC]. D'après la droite des milieux, vec(KI) = (1/2) vec(AC) = vec(AO). Donc t(K) = I.

**b)** La symétrie centrale de centre O échange A et C, et échange D et B. Elle transforme donc le milieu J de [AD] en le milieu de [CB], c'est-à-dire I : O est le milieu de [IJ].
L'image de la droite (AB) par t est la droite passant par t(A) = O et par t(K) = I (K ≠ A). Comme J appartient à la droite (OI), cette image est la droite (IJ). (On vérifie qu'elle est bien parallèle à (AB) : vec(JI) = vec(AB), car ABIJ est un parallélogramme.)

**c)** Soit P un point de (AB) tel que t(P) ∈ (BC). Alors t(P) appartient à t((AB)) = (IJ) et à (BC).
Les droites (AB) et (BC) sont sécantes et (IJ) est parallèle à (AB), donc (IJ) et (BC) sont sécantes ; leur point commun est I. Ainsi t(P) = I, et comme t(K) = I et qu'un point a un seul antécédent, P = K.
Le point cherché est K, le milieu de [AB].

**3. a)** A est le milieu de [MM₁] et O celui de [M₁M'], donc vec(MM₁) = 2 vec(AM₁) et vec(M₁M') = 2 vec(M₁O). Par la relation de Chasles :

    vec(MM') = vec(MM₁) + vec(M₁M') = 2 (vec(AM₁) + vec(M₁O)) = 2 vec(AO)

Ce vecteur ne dépend pas de M : g est la translation de vecteur 2 vec(AO) = vec(AC).

**b)** Soit N₁ = t(M) et N₂ = t(N₁). Alors vec(MN₂) = vec(MN₁) + vec(N₁N₂) = vec(AO) + vec(AO) = 2 vec(AO) = vec(MM'). Donc N₂ = M', c'est-à-dire t(t(M)) = g(M).

**c)** g(A) est le point A' tel que vec(AA') = vec(AC) : g(A) = C.
g(O) est le point O' tel que vec(OO') = vec(AC) = 2 vec(OC) : C est le milieu de [OO'], donc g(O) est le symétrique de O par rapport à C. (Contrôle avec le 3. b) : g(O) = t(t(O)) = t(C).)

**4.** Par la relation de Chasles :

    vec(MB) + vec(MD) − 2 vec(MA) = (vec(MB) − vec(MA)) + (vec(MD) − vec(MA)) = vec(AB) + vec(AD) = vec(AC)

(car ABCD est un parallélogramme). Donc vec(MM₂) = vec(AC) pour tout point M : f est la translation de vecteur vec(AC), c'est-à-dire f = g.

---

## Exercice 2 — Lieu géométrique et construction à l'aide d'une translation

Soit [AB] un segment de longueur 6 et O son milieu. On note 𝒞 le cercle de diamètre [AB] et t la translation de vecteur vec(AO). Pour tout point M de 𝒞 distinct de A et de B, on note N = t(M).

1. a) Déterminer t(A) et t(O). Construire le point B₁ = t(B) et préciser sa position sur la droite (AB).
   b) Montrer que AONM est un parallélogramme.
2. Déterminer et construire l'ensemble Γ des points N lorsque M décrit le cercle 𝒞 privé de A et de B.
3. a) Montrer que OBNM est un losange.
   b) En déduire que les droites (ON) et (MB) sont perpendiculaires.
   c) Retrouver ce résultat en utilisant l'angle AMB et la question 1. b).
4. On cherche les positions de M sur 𝒞 (M distinct de A et de B) pour lesquelles le point N appartient lui aussi au cercle 𝒞. On note Γ' le cercle de centre B et de rayon 3.
   a) Montrer que N appartient à 𝒞 si et seulement si N est l'un des deux points d'intersection P et Q des cercles 𝒞 et Γ'. Construire P et Q.
   b) Montrer que le triangle OBP est équilatéral.
   c) On note M₁ l'antécédent de P par t. Construire M₁, puis montrer que le triangle OM₁P est équilatéral et que AOPM₁ est un losange. Combien y a-t-il de positions de M qui conviennent ?
   d) Calculer l'aire du losange AOPM₁. En donner une valeur approchée à 10⁻² près.

### Corrigé

**1. a)** O est le milieu de [AB], donc vec(AO) = vec(OB).
t(A) = O (car vec(AO) = vec(AO)) et t(O) = B (car vec(OB) = vec(AO)).
B₁ vérifie vec(BB₁) = vec(AO) = vec(OB) : B est le milieu de [OB₁]. Le point B₁ est sur la demi-droite [AB), au-delà de B, avec BB₁ = 3 (donc AB₁ = 9) : on le construit en reportant au compas la longueur OB à partir de B, du côté opposé à O.

**b)** N = t(M) signifie vec(MN) = vec(AO). Comme M n'est pas sur la droite (AB) (M est distinct de A et de B), le quadrilatère AONM est un parallélogramme non aplati. En particulier vec(AM) = vec(ON).

**2.** Le cercle 𝒞 a pour centre O et pour rayon 3. Une translation transforme un cercle en un cercle de même rayon, dont le centre est l'image du centre : t(𝒞) est le cercle de centre t(O) = B et de rayon 3 (c'est le cercle Γ' du 4.).
Si M décrit 𝒞 privé de A et de B, N = t(M) décrit ce cercle privé de t(A) = O et de t(B) = B₁. Réciproquement, tout point N de ce cercle autre que O et B₁ a un antécédent par t, qui est sur 𝒞 et différent de A et de B.
Γ est le cercle de centre B et de rayon 3 (il passe par O et par B₁), privé des deux points O et B₁.

**3. a)** vec(MN) = vec(AO) = vec(OB), donc OBNM est un parallélogramme (non aplati, car M ∉ (AB)). De plus OM = 3 (M ∈ 𝒞) et OB = 3 : ce parallélogramme a deux côtés consécutifs égaux, c'est un losange (ses quatre côtés mesurent 3).

**b)** Les diagonales d'un losange sont perpendiculaires. Les diagonales de OBNM sont [ON] et [BM] : (ON) ⟂ (MB).

**c)** M est un point du cercle de diamètre [AB], distinct de A et de B : l'angle AMB est droit, donc (AM) ⟂ (MB). D'après le 1. b), vec(ON) = vec(AM), donc (ON) est parallèle à (AM). Par conséquent (ON) ⟂ (MB).

**4. a)** D'après le 2., N est toujours sur Γ', donc N ∈ 𝒞 ⟺ N ∈ 𝒞 ∩ Γ'. Un point commun à 𝒞 et Γ' est à la distance 3 de O et de B, donc équidistant de O et de B : il est sur la médiatrice de [OB]. Cette médiatrice passe par le milieu de [OB], à la distance 3/2 < 3 de O : elle coupe 𝒞 en deux points P et Q, qui sont aussi à la distance 3 de B. Les points communs à 𝒞 et Γ' sont donc exactement P et Q.
Construction : on trace la médiatrice de [OB] ; elle coupe 𝒞 en P et Q (P et Q sont symétriques par rapport à (AB)). Ni P ni Q n'est égal à O ou à B₁ (ils sont à la distance 3 de O), donc P et Q sont bien des points de Γ : ce sont les deux positions possibles de N.

**b)** OP = 3 (P ∈ 𝒞), BP = 3 (P ∈ Γ') et OB = 3 : le triangle OBP est équilatéral.

**c)** M₁ vérifie vec(M₁P) = vec(AO). La translation de vecteur −vec(AO) transforme O en A et B en O, donc elle transforme la médiatrice de [OB] en la médiatrice de [AO] : M₁ est sur la médiatrice de [AO] et sur 𝒞 (car P ∈ Γ' = t(𝒞)). Construction : M₁ est le point d'intersection de 𝒞 et de la médiatrice de [AO] situé du même côté de (AB) que P.
OM₁ = 3 (M₁ ∈ 𝒞), OP = 3 et M₁P = AO = 3 : le triangle OM₁P est équilatéral.
AOPM₁ est un parallélogramme (vec(AO) = vec(M₁P), d'après le 1. b) avec M = M₁) dont les côtés consécutifs AO et OP mesurent 3 : c'est un losange.
De la même façon, l'antécédent M₂ de Q est le symétrique de M₁ par rapport à (AB). Il y a donc deux positions de M qui conviennent : M₁ et M₂.

**d)** La diagonale [OM₁] du losange mesure 3 : le losange AOPM₁ est formé des deux triangles équilatéraux AOM₁ et OPM₁, de côté 3. La hauteur d'un triangle équilatéral de côté 3 vaut √(3² − (3/2)²) = √(27/4) = 3√3/2. L'aire du losange est base × hauteur :

    AO × 3√3/2 = 3 × 3√3/2 = 9√3/2 ≈ 7.79
