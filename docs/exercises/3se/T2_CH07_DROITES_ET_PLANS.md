# 3ème Sc. exp. — Tome 2, Chapitre 7 : Équations de droites et de plans

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20–21 : équations de droites, de plans ; position relative de droites et plans. Aptitudes : représentations paramétriques et équations cartésiennes d'une droite ou d'un plan, identifier une droite ou un plan, intersection de deux plans, d'une droite et d'un plan, de deux droites.
- Manuel CNP (p. 124–139) : représentation paramétrique d'une droite (paramètre α) et d'un plan (paramètres α et β) ; équation cartésienne d'un plan par dét(vec(AM), u, v) = 0 ; droite intersection de deux plans (triplets (a, b, c) et (a', b', c') non proportionnels) ; en repère orthonormé : vecteur normal (a, b, c), droite perpendiculaire à un plan, projeté orthogonal. Le cours ne donne pas de formule de distance d'un point à un plan : la distance est calculée avec le projeté orthogonal.
- Notation : sans flèches, le vecteur AB est noté vec(AB) et ses composantes sont écrites vec(AB)(1, −1, −1) ; une lettre seule (u, v, w, n, i, j, k) désigne aussi un vecteur. AB écrit seul est une longueur. vec(AB)·vec(AC) ou u·v désigne le produit scalaire.
- Toutes les valeurs sont vérifiées par `check_t2_ch07.py` (calcul exact en fractions).
- Outils autorisés : ceux du chapitre, du chapitre 5 (vecteurs de l'espace, déterminant de trois vecteurs) et du chapitre 6 (produit scalaire dans l'espace). Pas de produit vectoriel.

---

## Exercice 1 — Représentations paramétriques, équation cartésienne, intersections

L'espace est muni d'un repère cartésien (O, i, j, k). On considère les points A(1, 1, 0), B(2, 0, −1) et C(3, 1, 2), et la droite Δ de représentation paramétrique

    x = 1 + α
    y = 2 − α          (α ∈ ℝ)
    z = −1 + 2α

1. a) Montrer que les points A, B et C ne sont pas alignés.
   b) Donner une représentation paramétrique de la droite (AB).
   c) Les points L(4, −2, −3) et N(0, 2, 2) appartiennent-ils à la droite (AB) ?
2. On note P le plan (ABC).
   a) Donner une représentation paramétrique du plan P.
   b) Soit M(x, y, z) un point de l'espace. Calculer dét(vec(AM), vec(AB), vec(AC)), puis en déduire que x + 2y − z − 3 = 0 est une équation cartésienne de P.
   c) Le point D(4, −1, 0) appartient-il à P ? Déterminer une équation cartésienne du plan P' passant par D et parallèle à P.
3. a) Montrer que la droite Δ coupe le plan P en un point K dont on donnera les coordonnées.
   b) Soit Δ' la droite passant par le point F(0, 0, 1) et de vecteur directeur v(1, 0, 1). Montrer que Δ' est strictement parallèle à P.
4. Soit Q le plan d'équation 2x − y + z − 1 = 0.
   a) Montrer que les plans P et Q sont sécants.
   b) Vérifier que A appartient à Q, puis donner une représentation paramétrique de la droite d'intersection de P et Q.
5. a) Justifier que la droite (AB) est contenue dans le plan P.
   b) En utilisant la question 3. a), montrer que les droites (AB) et Δ ne sont pas coplanaires.

### Corrigé

**1. a)** vec(AB)(1, −1, −1) et vec(AC)(2, 0, 2).
S'il existait un réel k tel que vec(AC) = k·vec(AB), on aurait 2 = k et 0 = −k, ce qui est impossible. Les vecteurs vec(AB) et vec(AC) ne sont pas colinéaires : A, B et C ne sont pas alignés.

**b)** La droite (AB) passe par A et a pour vecteur directeur vec(AB)(1, −1, −1) :

    x = 1 + α
    y = 1 − α          (α ∈ ℝ)
    z = −α

**c)** Pour L : 1 + α = 4 donne α = 3, puis y = 1 − 3 = −2 et z = −3. Les trois coordonnées conviennent : L ∈ (AB).
Pour N : 1 + α = 0 donne α = −1, puis y = 2 (convient) mais z = 1 ≠ 2. Donc N ∉ (AB).

**2. a)** P passe par A et a pour vecteurs directeurs vec(AB) et vec(AC) (non colinéaires). M(x, y, z) ∈ P ⟺ il existe deux réels α et β tels que vec(AM) = α·vec(AB) + β·vec(AC) :

    x = 1 + α + 2β
    y = 1 − α                (α ∈ ℝ, β ∈ ℝ)
    z = −α + 2β

**b)** vec(AM)(x − 1, y − 1, z). En développant suivant la première colonne :

    dét(vec(AM), vec(AB), vec(AC))

        = | x − 1    1    2 |
          | y − 1   −1    0 |
          | z       −1    2 |

        = (x − 1)·((−1)·2 − 0·(−1)) − (y − 1)·(1·2 − 2·(−1)) + z·(1·0 − 2·(−1))
        = −2(x − 1) − 4(y − 1) + 2z
        = −2(x + 2y − z − 3)

M ∈ P ⟺ les vecteurs vec(AM), vec(AB), vec(AC) sont linéairement dépendants ⟺ dét(vec(AM), vec(AB), vec(AC)) = 0 ⟺ x + 2y − z − 3 = 0.
Contrôle : A : 1 + 2 − 0 − 3 = 0 ; B : 2 + 0 + 1 − 3 = 0 ; C : 3 + 2 − 2 − 3 = 0.

**c)** 4 + 2(−1) − 0 − 3 = −1 ≠ 0, donc D ∉ P.
P' passe par D et a les mêmes vecteurs directeurs vec(AB) et vec(AC) que P. Le calcul du b), avec vec(DM)(x − 4, y + 1, z) à la place de vec(AM), donne :
M ∈ P' ⟺ dét(vec(DM), vec(AB), vec(AC)) = 0 ⟺ −2[(x − 4) + 2(y + 1) − z] = 0 ⟺ x + 2y − z − 2 = 0.
Une équation de P' est x + 2y − z − 2 = 0 (même triplet (1, 2, −1) que P).

**3. a)** Le point de Δ de paramètre α appartient à P si et seulement si :
(1 + α) + 2(2 − α) − (−1 + 2α) − 3 = 0 ⟺ 3 − 3α = 0 ⟺ α = 1.
Cette équation a une seule solution : Δ et P ont un seul point commun, Δ coupe P au point K(2, 1, 1).
Contrôle : 2 + 2 − 1 − 3 = 0.

**b)** Une représentation paramétrique de Δ' est x = α, y = 0, z = 1 + α (α ∈ ℝ).
Le point de paramètre α appartient à P ⟺ α + 0 − (1 + α) − 3 = 0 ⟺ −4 = 0, ce qui est impossible.
Δ' et P n'ont aucun point commun : Δ' est strictement parallèle à P.

**4. a)** P : x + 2y − z − 3 = 0 et Q : 2x − y + z − 1 = 0. Les triplets (1, 2, −1) et (2, −1, 1) ne sont pas proportionnels (2 = 2·1 mais −1 ≠ 2·2). Donc P et Q sont sécants suivant une droite.

**b)** 2·1 − 1 + 0 − 1 = 0 : A ∈ Q (et A ∈ P).
M(x, y, z) ∈ P ∩ Q ⟺ x + 2y − z = 3 et 2x − y + z = 1.
En additionnant les deux équations : 3x + y = 4, donc y = 4 − 3x ; puis z = x + 2y − 3 = 5 − 5x.
En posant x = 1 + α : y = 1 − 3α et z = −5α. La droite P ∩ Q a pour représentation paramétrique

    x = 1 + α
    y = 1 − 3α         (α ∈ ℝ)
    z = −5α

(Elle passe par A, pour α = 0, et a pour vecteur directeur w(1, −3, −5).)

**5. a)** A ∈ P et B ∈ P (contrôle du 2. b)), donc la droite (AB) est contenue dans P.

**b)** Supposons que (AB) et Δ aient un point commun M. Alors M ∈ (AB), donc M ∈ P, et M ∈ Δ : M est un point commun à Δ et P, donc M = K d'après le 3. a).
Or K(2, 1, 1) n'est pas sur (AB) : 1 + α = 2 donne α = 1 et le point de (AB) de paramètre 1 est (2, 0, −1) = B ≠ K. Contradiction : (AB) et Δ n'ont aucun point commun.
De plus, vec(AB)(1, −1, −1) et u(1, −1, 2), vecteur directeur de Δ, ne sont pas colinéaires (les deux premières composantes imposent k = 1, mais −1 ≠ 2). Les droites ne sont pas parallèles.
Deux droites ni sécantes ni parallèles ne sont pas coplanaires.

Autre méthode : E(1, 2, −1) ∈ Δ (α = 0) et vec(AE)(0, 1, −1).

    dét(vec(AB), u, vec(AE))

        = |  1    1    0 |
          | −1   −1    1 |
          | −1    2   −1 |

        = 1·((−1)(−1) − 1·2) + 1·(1·(−1) − 0·2) − 1·(1·1 − 0·(−1))
        = −1 − 1 − 1 = −3 ≠ 0

Les vecteurs vec(AB), u et vec(AE) ne sont pas linéairement dépendants : les droites (AB) et Δ ne sont pas coplanaires.

---

## Exercice 2 — Dans un cube : plan, droite perpendiculaire, projeté orthogonal

ABCDEFGH est un cube d'arête 2 : ABCD et EFGH sont deux faces carrées opposées, et [AE], [BF], [CG], [DH] sont des arêtes. On note I le milieu de [AB] et J le milieu de [BC].
On munit l'espace du repère (A, i, j, k), où i, j et k sont les vecteurs définis par vec(AB) = 2i, vec(AD) = 2j et vec(AE) = 2k.

1. a) Justifier que le repère (A, i, j, k) est orthonormé.
   b) Donner les coordonnées des points B, C, D, E, F, G, I et J.
2. a) Montrer que les points I, J et F ne sont pas alignés.
   b) Montrer que le vecteur n(2, −2, −1) est normal au plan (IJF).
   c) En déduire qu'une équation cartésienne du plan (IJF) est 2x − 2y − z − 2 = 0.
3. a) Montrer que la droite (AC) est strictement parallèle au plan (IJF).
   b) Donner une équation cartésienne du plan (EFG). Déterminer une représentation paramétrique de la droite Δ intersection des plans (IJF) et (EFG). Vérifier que Δ passe par F et qu'elle est parallèle à la droite (EG).
4. Soit δ la droite passant par B et perpendiculaire au plan (IJF).
   a) Donner une représentation paramétrique de δ.
   b) La droite δ coupe le plan (IJF) en un point K (K est le projeté orthogonal de B sur (IJF)). Calculer les coordonnées de K.
   c) Calculer la distance BK.
5. a) Calculer les produits scalaires vec(IK)·vec(JF) et vec(JK)·vec(IF).
   b) En déduire que K est l'orthocentre du triangle IJF.

### Corrigé

**1. a)** Les arêtes [AB], [AD] et [AE] du cube sont deux à deux perpendiculaires et AB = AD = AE = 2.
Donc i = (1/2)·vec(AB), j = (1/2)·vec(AD) et k = (1/2)·vec(AE) sont deux à deux orthogonaux et de norme 1 : (i, j, k) est une base orthonormée et (A, i, j, k) est un repère orthonormé.

**b)** A(0, 0, 0), B(2, 0, 0), D(0, 2, 0), E(0, 0, 2).
vec(AC) = vec(AB) + vec(AD) (face ABCD), vec(AF) = vec(AB) + vec(AE) (face ABFE), vec(AG) = vec(AB) + vec(AD) + vec(AE), d'où C(2, 2, 0), F(2, 0, 2), G(2, 2, 2).
I milieu de [AB] : I(1, 0, 0). J milieu de [BC] : J((2 + 2)/2, (0 + 2)/2, 0) = (2, 1, 0).

**2. a)** vec(IJ)(1, 1, 0) et vec(IF)(1, 0, 2). Si vec(IF) = k·vec(IJ), la première composante donne k = 1, puis la troisième donne 2 = 0 : impossible. vec(IJ) et vec(IF) ne sont pas colinéaires, donc I, J et F ne sont pas alignés.

**b)** n·vec(IJ) = 2·1 + (−2)·1 + (−1)·0 = 0 et n·vec(IF) = 2·1 + (−2)·0 + (−1)·2 = 0.
Le vecteur non nul n est orthogonal à deux vecteurs directeurs non colinéaires du plan (IJF) : n est normal à (IJF).

**c)** Le plan de vecteur normal n(2, −2, −1) a une équation de la forme 2x − 2y − z + d = 0.
I ∈ (IJF) : 2 − 0 − 0 + d = 0, donc d = −2. Une équation de (IJF) est 2x − 2y − z − 2 = 0.
Contrôle : J : 4 − 2 − 0 − 2 = 0 ; F : 4 − 0 − 2 − 2 = 0.

**3. a)** vec(AC)(2, 2, 0) = 2·vec(IJ) : la droite (AC) est parallèle à la droite (IJ), qui est contenue dans (IJF). Donc (AC) est parallèle au plan (IJF). (On peut aussi vérifier que n·vec(AC) = 4 − 4 + 0 = 0.)
De plus A n'appartient pas à (IJF) : 0 − 0 − 0 − 2 = −2 ≠ 0. Donc (AC) est strictement parallèle à (IJF).

**b)** E, F et G ont la même cote 2 et ne sont pas alignés : le plan (EFG) a pour équation z = 2.
M(x, y, z) ∈ Δ ⟺ z = 2 et 2x − 2y − 2 − 2 = 0 ⟺ z = 2 et x = y + 2. En posant y = α :

    x = 2 + α
    y = α              (α ∈ ℝ)
    z = 2

Pour α = 0 on obtient (2, 0, 2) = F : Δ passe par F.
Δ a pour vecteur directeur w(1, 1, 0) et vec(EG)(2, 2, 0) = 2·w : Δ est parallèle à (EG).

**4. a)** δ passe par B(2, 0, 0) et a pour vecteur directeur le vecteur normal n(2, −2, −1) :

    x = 2 + 2α
    y = −2α            (α ∈ ℝ)
    z = −α

**b)** Le point de δ de paramètre α appartient à (IJF) ⟺ 2(2 + 2α) − 2(−2α) − (−α) − 2 = 0 ⟺ 9α + 2 = 0 ⟺ α = −2/9.
K(2 − 4/9, 4/9, 2/9), soit K(14/9, 4/9, 2/9).
Contrôle : 2·(14/9) − 2·(4/9) − 2/9 − 2 = (28 − 8 − 2 − 18)/9 = 0.

**c)** vec(BK)(−4/9, 4/9, 2/9), donc BK² = 16/81 + 16/81 + 4/81 = 36/81 = 4/9 et BK = 2/3.
(BK est la distance du point B au plan (IJF).)

**5. a)** vec(IK)(14/9 − 1, 4/9, 2/9) = (5/9, 4/9, 2/9) et vec(JF)(0, −1, 2) :
vec(IK)·vec(JF) = 0 − 4/9 + 4/9 = 0.
vec(JK)(14/9 − 2, 4/9 − 1, 2/9) = (−4/9, −5/9, 2/9) et vec(IF)(1, 0, 2) :
vec(JK)·vec(IF) = −4/9 + 0 + 4/9 = 0.

**b)** K appartient au plan (IJF) et K est distinct de I et de J.
vec(IK)·vec(JF) = 0 : la droite (IK) est perpendiculaire à (JF) et passe par I, c'est la hauteur issue de I du triangle IJF.
vec(JK)·vec(IF) = 0 : la droite (JK) est la hauteur issue de J.
K est le point commun de deux hauteurs du triangle IJF : c'est son orthocentre.
(Contrôle : vec(FK)(−4/9, 4/9, −16/9) et vec(FK)·vec(IJ) = −4/9 + 4/9 + 0 = 0, la troisième hauteur passe aussi par K.)
