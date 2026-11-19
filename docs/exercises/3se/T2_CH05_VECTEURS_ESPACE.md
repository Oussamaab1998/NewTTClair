# 3ème Sc. exp. — Tome 2, Chapitre 5 : Vecteurs de l'espace

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20–21 : vecteurs de l'espace, déterminant de trois vecteurs ; exploiter les opérations sur les vecteurs de l'espace ; reconnaître que trois vecteurs de l'espace forment une base.
- Manuel CNP (p. 88–107) : égalité de vecteurs et parallélogramme, relation de Chasles, vecteurs colinéaires et droite D(A, u), combinaison linéaire, famille liée, plan P(A, u, v), parallélisme d'une droite et d'un plan par une famille liée, bases et repères cartésiens (pas forcément orthonormés), coordonnées, milieu, déterminant de trois vecteurs (développé suivant la première colonne) et théorème admis : (u, v, w) est une base ⟺ det(u, v, w) ≠ 0 ; quatre points A, B, C, D sont coplanaires ⟺ (vec(AB), vec(AC), vec(AD)) est liée. Le produit scalaire et les distances (chapitre 6), les représentations paramétriques et les équations de plans (chapitre 7) ne sont pas utilisés.
- Outils autorisés : ce chapitre et la géométrie plane des années précédentes (milieu, centre de gravité, parallélogramme).
- Notation : vec(AB) désigne le vecteur AB, et u(x, y, z) ou vec(AB)(x, y, z) donne les composantes d'un vecteur ; 0 désigne aussi le vecteur nul ; W est l'ensemble des vecteurs de l'espace. Ce chapitre ne contient aucune longueur (le repère n'est pas forcément orthonormé).
- Toutes les valeurs sont vérifiées par `check_t2_ch05.py` (calcul exact en fractions).

---

## Exercice 1 — Coordonnées, déterminant, base, coplanarité

L'espace est muni d'un repère cartésien (O, i, j, k). On considère les points

    A(1, 0, 2)      B(2, 1, 0)      C(0, 3, 1)

1. a) Déterminer les composantes de vec(AB) et de vec(AC).
   b) Montrer que les points A, B et C ne sont pas alignés.
   c) Déterminer les coordonnées du milieu I de [BC] et du centre de gravité G du triangle ABC. Vérifier que vec(AG) = (2/3)·vec(AI).
2. On considère le vecteur w(1, 0, 1).
   a) Calculer det(vec(AB), vec(AC), w). En déduire que (vec(AB), vec(AC), w) est une base de W.
   b) Déterminer les composantes du vecteur t(2, 4, −1) dans la base (vec(AB), vec(AC), w).
3. a) Soit D(4, −1, −1). Montrer que les points A, B, C et D sont coplanaires, puis écrire vec(AD) comme combinaison linéaire de vec(AB) et vec(AC).
   b) Soit m un réel et E(m, −2, 1). Déterminer m pour que le point E appartienne au plan (ABC).
4. Soit Δ la droite passant par O et de vecteur directeur w'(0, 4, −3).
   a) Montrer que Δ est parallèle au plan (ABC).
   b) La droite Δ est-elle contenue dans le plan (ABC) ? Justifier.

### Corrigé

**1. a)** vec(AB)(2 − 1, 1 − 0, 0 − 2), soit vec(AB)(1, 1, −2) ; vec(AC)(0 − 1, 3 − 0, 1 − 2), soit vec(AC)(−1, 3, −1).

**b)** S'il existait un réel k tel que vec(AC) = k·vec(AB), la première composante donnerait −1 = k × 1, donc k = −1, et la deuxième 3 = k × 1 = −1 : c'est impossible.
vec(AB) est non nul et vec(AC) n'est pas colinéaire à vec(AB) : les points A, B et C ne sont pas alignés.

**c)** I((2 + 0)/2, (1 + 3)/2, (0 + 1)/2), soit I(1, 2, 1/2).
G vérifie vec(GA) + vec(GB) + vec(GC) = 0, donc vec(OG) = (1/3)(vec(OA) + vec(OB) + vec(OC)) : G((1 + 2 + 0)/3, (0 + 1 + 3)/3, (2 + 0 + 1)/3), soit G(1, 4/3, 1).
vec(AI)(0, 2, −3/2) et vec(AG)(0, 4/3, −1). Or (2/3)·vec(AI) a pour composantes (0, 4/3, −1) : vec(AG) = (2/3)·vec(AI). (On retrouve que G est sur la médiane [AI], aux deux tiers à partir de A.)

**2. a)**

    det(vec(AB), vec(AC), w) = |  1   −1   1 |
                               |  1    3   0 |
                               | −2   −1   1 |

                             = 1 × (3 × 1 − (−1) × 0) − 1 × ((−1) × 1 − (−1) × 1) + (−2) × ((−1) × 0 − 3 × 1)
                             = 3 − 0 + 6 = 9

det(vec(AB), vec(AC), w) = 9 ≠ 0, donc (vec(AB), vec(AC), w) est une base de W (théorème admis).

**b)** On cherche les réels α, β, γ tels que t = α·vec(AB) + β·vec(AC) + γ·w :

    α − β + γ = 2
    α + 3β = 4
    −2α − β + γ = −1

En retranchant la troisième équation de la première : 3α = 3, donc α = 1. La deuxième donne 3β = 3, donc β = 1. La première donne γ = 2 − α + β = 2.
t = vec(AB) + vec(AC) + 2w : les composantes de t dans la base (vec(AB), vec(AC), w) sont (1, 1, 2).
Vérification : vec(AB) + vec(AC) + 2w a pour composantes (1 − 1 + 2, 1 + 3 + 0, −2 − 1 + 2) = (2, 4, −1).

**3. a)** vec(AD)(3, −1, −3).

    det(vec(AB), vec(AC), vec(AD)) = |  1   −1    3 |
                                     |  1    3   −1 |
                                     | −2   −1   −3 |

                                   = 1 × (3 × (−3) − (−1) × (−1)) − 1 × ((−1) × (−3) − (−1) × 3) + (−2) × ((−1) × (−1) − 3 × 3)
                                   = −10 − 6 + 16 = 0

La famille (vec(AB), vec(AC), vec(AD)) est liée : les points A, B, C et D sont coplanaires.
On cherche α et β tels que vec(AD) = α·vec(AB) + β·vec(AC) : α − β = 3, α + 3β = −1 et −2α − β = −3. Les deux premières équations donnent 4β = −4, donc β = −1 et α = 2 ; la troisième est vérifiée : −4 + 1 = −3.
vec(AD) = 2·vec(AB) − vec(AC).

**b)** A, B et C ne sont pas alignés, donc ils définissent le plan (ABC), et E ∈ (ABC) ⟺ A, B, C, E sont coplanaires ⟺ det(vec(AB), vec(AC), vec(AE)) = 0.
vec(AE)(m − 1, −2, −1), et

    det(vec(AB), vec(AC), vec(AE)) = |  1   −1   m − 1 |
                                     |  1    3      −2 |
                                     | −2   −1      −1 |

                                   = 1 × (3 × (−1) − (−1) × (−2)) − 1 × ((−1) × (−1) − (−1)(m − 1)) + (−2) × ((−1) × (−2) − 3(m − 1))
                                   = −5 − m + (−10 + 6m)
                                   = 5m − 15

E ∈ (ABC) ⟺ 5m − 15 = 0 ⟺ m = 3. Le point cherché est E(3, −2, 1).

**4. a)**

    det(vec(AB), vec(AC), w') = |  1   −1    0 |
                                |  1    3    4 |
                                | −2   −1   −3 |

                              = 1 × (3 × (−3) − (−1) × 4) − 1 × ((−1) × (−3) − (−1) × 0) + (−2) × ((−1) × 4 − 3 × 0)
                              = −5 − 3 + 8 = 0

La famille (w', vec(AB), vec(AC)) est liée (on a d'ailleurs w' = vec(AB) + vec(AC)). D'après la propriété du cours, la droite Δ = D(O, w') est parallèle au plan (ABC) = P(A, vec(AB), vec(AC)).

**b)** Si Δ était contenue dans (ABC), le point O appartiendrait à (ABC). Or vec(AO)(−1, 0, −2) et

    det(vec(AB), vec(AC), vec(AO)) = |  1   −1   −1 |
                                     |  1    3    0 |
                                     | −2   −1   −2 |

                                   = 1 × (3 × (−2) − (−1) × 0) − 1 × ((−1) × (−2) − (−1) × (−1)) + (−2) × ((−1) × 0 − 3 × (−1))
                                   = −6 − 1 − 6 = −13 ≠ 0

Donc O n'appartient pas au plan (ABC) : Δ n'est pas contenue dans (ABC). Elle est strictement parallèle à ce plan (elle n'a aucun point commun avec lui).

---

## Exercice 2 — Un parallélogramme dans un tétraèdre

Soit ABCD un tétraèdre et t un réel tel que 0 < t < 1. On définit les points M, N, P et Q par

    vec(AM) = t·vec(AC)      vec(BN) = t·vec(BC)      vec(BP) = t·vec(BD)      vec(AQ) = t·vec(AD)

(Ainsi M ∈ [AC], N ∈ [BC], P ∈ [BD] et Q ∈ [AD].)

### Partie A (sans repère)

1. a) Montrer que vec(MN) = (1 − t)·vec(AB) et que vec(QP) = (1 − t)·vec(AB).
   b) Montrer que vec(MQ) = t·vec(CD) et que vec(NP) = t·vec(CD).
2. En déduire que MNPQ est un parallélogramme.
3. Montrer que les droites (AB) et (CD) sont parallèles au plan (MNQ).

### Partie B (avec un repère)

4. a) Justifier que (A, vec(AB), vec(AC), vec(AD)) est un repère cartésien de l'espace. On munit désormais l'espace de ce repère.
   b) Donner les coordonnées de A, B, C et D, puis celles de M, N, P et Q en fonction de t.
5. Soit I le milieu de [AB], J le milieu de [CD] et K le centre du parallélogramme MNPQ.
   a) Calculer les coordonnées de I, J et K.
   b) Montrer que vec(IK) = t·vec(IJ). Que décrit le point K lorsque t décrit l'intervalle ]0, 1[ ?
6. Soit G le centre de gravité du triangle BCD.
   a) Calculer les coordonnées de G.
   b) Montrer que det(vec(MN), vec(MQ), vec(MG)) = t(1 − t)(t − 2/3).
   c) En déduire la valeur de t pour laquelle le plan (MNQ) passe par G. Vérifier que, pour cette valeur, G est le milieu de [NP].

### Corrigé — Partie A

**1. a)** Par la relation de Chasles, et comme vec(BC) = vec(BA) + vec(AC) = −vec(AB) + vec(AC) :

    vec(MN) = vec(MA) + vec(AB) + vec(BN)
            = −t·vec(AC) + vec(AB) + t·(−vec(AB) + vec(AC))
            = (1 − t)·vec(AB)

De même, avec vec(BD) = −vec(AB) + vec(AD) :

    vec(QP) = vec(QA) + vec(AB) + vec(BP)
            = −t·vec(AD) + vec(AB) + t·(−vec(AB) + vec(AD))
            = (1 − t)·vec(AB)

**b)**

    vec(MQ) = vec(MA) + vec(AQ) = −t·vec(AC) + t·vec(AD) = t·(vec(CA) + vec(AD)) = t·vec(CD)
    vec(NP) = vec(NB) + vec(BP) = −t·vec(BC) + t·vec(BD) = t·(vec(CB) + vec(BD)) = t·vec(CD)

**2.** ABCD est un tétraèdre, donc A, B, C, D ne sont pas coplanaires et les vecteurs vec(AB) et vec(CD) ne sont pas colinéaires (sinon les droites (AB) et (CD) seraient parallèles et les quatre points seraient dans un même plan).
Comme 1 − t ≠ 0 et t ≠ 0, les vecteurs vec(MN) = (1 − t)·vec(AB) et vec(NP) = t·vec(CD) ne sont pas colinéaires : M, N et P ne sont pas alignés.
De plus vec(MN) = vec(QP) d'après le 1. a). Donc MNPQ est un parallélogramme.

**3.** M, N et Q ne sont pas alignés (vec(MN) et vec(MQ) ne sont pas colinéaires, pour la même raison qu'au 2.), donc (MNQ) est le plan P(M, vec(MN), vec(MQ)).

- vec(AB) = (1/(1 − t))·vec(MN) : la famille (vec(AB), vec(MN), vec(MQ)) est liée, donc (AB) est parallèle au plan (MNQ).
- vec(CD) = (1/t)·vec(MQ) : la famille (vec(CD), vec(MN), vec(MQ)) est liée, donc (CD) est parallèle au plan (MNQ).

Le plan (MNQ) est donc parallèle à deux arêtes opposées du tétraèdre.

### Corrigé — Partie B

**4. a)** A, B, C et D ne sont pas coplanaires, donc (vec(AB), vec(AC), vec(AD)) est une base de W, et (A, vec(AB), vec(AC), vec(AD)) est un repère cartésien de l'espace.

**b)** A(0, 0, 0), B(1, 0, 0), C(0, 1, 0) et D(0, 0, 1).

- vec(AM) = t·vec(AC), donc M(0, t, 0).
- vec(AN) = vec(AB) + vec(BN) = vec(AB) + t·(vec(AC) − vec(AB)) = (1 − t)·vec(AB) + t·vec(AC), donc N(1 − t, t, 0).
- vec(AP) = vec(AB) + vec(BP) = vec(AB) + t·(vec(AD) − vec(AB)) = (1 − t)·vec(AB) + t·vec(AD), donc P(1 − t, 0, t).
- vec(AQ) = t·vec(AD), donc Q(0, 0, t).

Contrôle : vec(MN)(1 − t, 0, 0) a les mêmes composantes que (1 − t)·vec(AB), comme au 1. a).

**5. a)** I(1/2, 0, 0) et J(0, 1/2, 1/2).
K est le milieu de la diagonale [MP] : K((1 − t)/2, t/2, t/2). (Le milieu de [NQ] donne bien le même point.)

**b)** vec(IK)((1 − t)/2 − 1/2, t/2, t/2), soit vec(IK)(−t/2, t/2, t/2), et vec(IJ)(−1/2, 1/2, 1/2). Donc vec(IK) = t·vec(IJ).
Les points I, J et K sont alignés, et K est le point d'abscisse t de la droite (IJ) munie du repère (I, J). Lorsque t décrit ]0, 1[, K décrit le segment [IJ] privé de ses extrémités I et J.

**6. a)** G vérifie vec(AG) = (1/3)(vec(AB) + vec(AC) + vec(AD)), donc G(1/3, 1/3, 1/3).

**b)** vec(MN)(1 − t, 0, 0), vec(MQ)(0, −t, t) et vec(MG)(1/3, 1/3 − t, 1/3).

    det(vec(MN), vec(MQ), vec(MG)) = | 1 − t    0       1/3 |
                                     |     0   −t   1/3 − t |
                                     |     0    t       1/3 |

                                   = (1 − t) × ((−t) × (1/3) − t × (1/3 − t)) − 0 + 0
                                   = (1 − t) × (t² − 2t/3)
                                   = t(1 − t)(t − 2/3)

**c)** M, N et Q ne sont pas alignés, donc G ∈ (MNQ) ⟺ la famille (vec(MN), vec(MQ), vec(MG)) est liée ⟺ det(vec(MN), vec(MQ), vec(MG)) = 0.
Comme 0 < t < 1, on a t ≠ 0 et 1 − t ≠ 0, donc G ∈ (MNQ) ⟺ t = 2/3.
Pour t = 2/3 : N(1/3, 2/3, 0) et P(1/3, 0, 2/3). Le milieu de [NP] a pour coordonnées (1/3, 1/3, 1/3) : c'est G.
(Explication : N et P sont dans le plan (BCD), et pour t = 2/3, vec(BG) = (1/3)(vec(BC) + vec(BD)) = (1/2)((2/3)·vec(BC) + (2/3)·vec(BD)) = (1/2)(vec(BN) + vec(BP)).)
