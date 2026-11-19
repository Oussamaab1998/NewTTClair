# 1ère année — Chapitre 4 : Vecteurs et translations

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10–11, « Activités géométriques » : transformations du plan, dont la translation ; construire l'image d'un point par une translation ; reconnaître l'image d'une figure par une translation ; résoudre des problèmes d'alignement, de construction et de lieux géométriques. P. 14 : longueurs, périmètres.
- Manuel CNP, chapitre 4 (p. 51–68) : définition, vec(AB) = vec(CD) si et seulement si [AD] et [BC] ont le même milieu ; vec(AB) = vec(CD) ⟺ vec(AC) = vec(BD) ; si A, B et C ne sont pas alignés, vec(AB) = vec(CD) ⟺ ABDC est un parallélogramme ; si vec(AB) = vec(CD) alors AB = CD ; pour A, B, C distincts, vec(AB) = vec(BC) ⟺ B est le milieu de [AC]. Le point M' est l'image du point M par la translation de vecteur vec(AB) si vec(MM') = vec(AB) ; l'image de A est B, l'image de B est le symétrique de A par rapport à B. La translation conserve les distances ; l'image d'une droite est une droite qui lui est parallèle ; l'image d'un segment est un segment qui lui est isométrique. Admis : l'image d'un cercle est le cercle de même rayon dont le centre est l'image du centre ; un polygone et son image sont superposables (même périmètre, même aire, angles homologues égaux).
- Outils autorisés : ce chapitre, les chapitres 1 à 3 (angles, théorème de Thalès, Pythagore) et les acquis du collège (parallélogramme, symétrie centrale, inégalité triangulaire : pour tous points A, B, M, MA + MB ≥ AB, avec égalité si et seulement si M appartient au segment [AB]). Pas de somme de vecteurs ni de relation de Chasles (chapitre 5), pas de coordonnées (chapitre 6) : les figures sont décrites en mots.
- Notation : vec(AB) est le vecteur AB et AB la distance ; « F est le symétrique de C par rapport à B » signifie que B est le milieu de [CF]. Unités : le centimètre (exercice 1), le mètre (exercice 2).
- Toutes les affirmations des corrigés sont vérifiées par `check_ch04.py` (chaque figure est placée dans un repère à l'intérieur du script ; calcul exact en fractions).

---

## Exercice 1 — Égalités vectorielles et images par une translation

ABC est un triangle tel que AB = 6, AC = 4 et BC = 5 (l'unité est le centimètre). On note I le milieu de [AB] et t la translation de vecteur vec(AB).

1. a) Quelle est l'image de A par t ? Construire les points D et E, images respectives de C et de B par t.
   b) Montrer que ABDC est un parallélogramme et que B est le milieu de [AE].
2. a) Montrer que vec(AC) = vec(BD) et que vec(BC) = vec(ED).
   b) En déduire la nature du quadrilatère BCDE, puis calculer son périmètre.
3. a) Quelle est l'image du triangle ABC par t ? En déduire, sans calcul, les longueurs BE, ED et BD, puis le périmètre du triangle BED.
   b) Déterminer les images par t des droites (AB), (AC) et (BC).
4. On note F le symétrique de C par rapport à B.
   a) Montrer que ACEF est un parallélogramme.
   b) En déduire que vec(BD) = vec(FE), puis que les segments [BE] et [DF] ont le même milieu.
5. On note I' l'image de I par t.
   a) Montrer que I' est le milieu de [BE]. En déduire que I' est aussi le milieu de [DF].
   b) On note (Γ) le cercle de diamètre [AB]. Déterminer son image (Γ') par t.
   c) Montrer que B appartient à (Γ) et à (Γ'), puis que B est le seul point commun à ces deux cercles.

### Corrigé

**1. a)** L'image de A par t est le point M' tel que vec(AM') = vec(AB) : c'est B.
D est le point tel que vec(CD) = vec(AB). Construction : on trace la parallèle à (AB) passant par C et on y place D tel que CD = AB = 6, du côté qui donne à vec(CD) le même sens que vec(AB).
E est le point tel que vec(BE) = vec(AB) : E est sur la droite (AB), au-delà de B, avec BE = 6. C'est le symétrique de A par rapport à B.

**b)** vec(AB) = vec(CD) et les points A, B, C ne sont pas alignés (ABC est un triangle) : d'après le cours, ABDC est un parallélogramme.
vec(AB) = vec(BE), avec A, B, E distincts : B est le milieu de [AE]. En particulier AE = 12.

**2. a)** On a vec(AB) = vec(CD). D'après la propriété « vec(AB) = vec(CD) ⟺ vec(AC) = vec(BD) », on obtient vec(AC) = vec(BD).
De même, vec(BE) = vec(AB) = vec(CD), donc vec(BE) = vec(CD). La même propriété, appliquée aux points B, E, C, D, donne vec(BC) = vec(ED).

**b)** vec(BC) = vec(ED) et les points B, C, E ne sont pas alignés (E est sur (AB), C n'y est pas) : BCDE est un parallélogramme.
Ses côtés opposés ont la même longueur : BC = ED = 5 et CD = BE = 6. Son périmètre est 2 × (5 + 6) = 22 cm.

**3. a)** Les images de A, B et C par t sont B, E et D : l'image du triangle ABC est le triangle BED.
La translation conserve les distances : BE = AB = 6, ED = BC = 5 et BD = AC = 4.
Le périmètre du triangle BED est 6 + 5 + 4 = 15 cm, le même que celui du triangle ABC.

**b)** L'image d'une droite est une droite qui lui est parallèle ; il suffit de connaître les images de deux de ses points.

- (AB) : les images de A et B sont B et E, qui sont sur (AB). L'image de (AB) est la droite (AB) elle-même.
- (AC) : les images de A et C sont B et D. L'image de (AC) est la droite (BD), parallèle à (AC).
- (BC) : les images de B et C sont E et D. L'image de (BC) est la droite (ED), parallèle à (BC).

**4. a)** B est le milieu de [AE] (question 1. b)) et le milieu de [CF] (définition de F). Les diagonales [AE] et [CF] du quadrilatère ACEF ont donc le même milieu. Comme C n'est pas sur la droite (AE) = (AB), ACEF est un parallélogramme (non aplati).

**b)** ACEF est un parallélogramme, donc vec(AC) = vec(FE). Avec vec(AC) = vec(BD) (question 2. a)), on obtient vec(BD) = vec(FE).
Par définition, vec(BD) = vec(FE) signifie que les segments [BE] et [DF] ont le même milieu.

**5. a)** t transforme A en B et B en E : l'image du segment [AB] est le segment [BE]. Comme I appartient à [AB], son image I' appartient à [BE].
La translation conserve les distances : BI' = AI = 3 (images de A et de I) et I'E = IB = 3 (images de I et de B). I' est le point de [BE] situé à égale distance de B et de E : c'est le milieu de [BE].
D'après la question 4. b), [BE] et [DF] ont le même milieu : I' est aussi le milieu de [DF].

**b)** (Γ) est le cercle de centre I et de rayon AB/2 = 3. Son image (Γ') est le cercle de même rayon 3, de centre l'image de I, c'est-à-dire I'.
Comme I' est le milieu de [BE] et BE = 6, (Γ') est le cercle de diamètre [BE].

**c)** IB = 3, donc B ∈ (Γ) ; I'B = 3, donc B ∈ (Γ').
De plus vec(II') = vec(AB) (définition de I'), donc II' = AB = 6.
Soit M un point commun aux deux cercles : MI = 3 et MI' = 3, donc MI + MI' = 6 = II'. D'après l'inégalité triangulaire, M appartient au segment [II'], et IM = 3 = II'/2 : M est le milieu de [II'].
Or B vérifie IB + BI' = 3 + 3 = 6 = II', donc B appartient à [II'] et en est le milieu. Ainsi M = B : B est le seul point commun à (Γ) et (Γ'). (On dit que les deux cercles sont tangents en B.)

---

## Exercice 2 — Problème : où construire le pont ?

Deux villages A et B sont séparés par une rivière. Les rives sont deux droites parallèles d1 et d2, distantes de 20 m. Le village A est du côté de d1, à 45 m de d1 ; le village B est de l'autre côté de la rivière, à 15 m de d2. On note H et K les pieds des perpendiculaires à d1 issues de A et de B ; on mesure HK = 80 m.

On veut construire un pont [MN] perpendiculaire aux rives, avec M sur d1 et N sur d2, de façon que le trajet formé des segments [AM], [MN] et [NB] soit le plus court possible. On note L = AM + MN + NB la longueur de ce trajet.

1. On considère deux positions possibles du pont, [MN] et [M1N1], avec M ≠ M1. Montrer que MNN1M1 est un parallélogramme. En déduire que le vecteur vec(MN) ne dépend pas de la position du pont.
   On note u ce vecteur et t la translation de vecteur u.
2. On note A' l'image de A par t.
   a) Préciser la position de A' : sur quelle droite se trouve-t-il ? À quelle distance de d1 et de d2 ?
   b) Montrer que, pour toute position du pont, AM = A'N, puis que L = A'N + NB + 20.
3. a) Montrer que, pour toute position du pont, L ≥ A'B + 20. Dans quel cas a-t-on l'égalité ?
   b) Expliquer pourquoi le segment [A'B] coupe la droite d2 en un point N0. En déduire la construction du pont [M0N0] qui donne le trajet le plus court.
4. On note P le pied de la perpendiculaire à (AH) issue de B, et Q le point d'intersection des droites (AH) et d2.
   a) Calculer A'P et PB, puis A'B. En déduire la longueur minimale du trajet.
   b) En utilisant le théorème de Thalès dans le triangle A'PB, calculer QN0. En déduire la distance HM0.
   c) Calculer AM0 et N0B, et vérifier le résultat du 4. a).
5. Un habitant propose de construire le pont juste en face du village A (c'est-à-dire M = H). Calculer la longueur du trajet correspondant, à 0.1 m près, et la comparer à la longueur minimale.

### Corrigé

**1.** Les droites (MN) et (M1N1) sont toutes deux perpendiculaires à d1 : elles sont parallèles. Les droites (MM1) = d1 et (NN1) = d2 sont parallèles. Le quadrilatère MNN1M1 a ses côtés opposés parallèles deux à deux : c'est un parallélogramme.
Comme M, N et M1 ne sont pas alignés, le cours donne vec(MN) = vec(M1N1). Le vecteur vec(MN) est donc le même pour toutes les positions du pont : sa direction est perpendiculaire aux rives, son sens va de d1 vers d2 et sa longueur est la largeur de la rivière, 20 m.

**2. a)** vec(AA') = u, donc (AA') est perpendiculaire à d1 : A' est sur la droite (AH). De plus AA' = 20 et A' est du côté de d2 par rapport à A, c'est-à-dire en direction de H. Comme AH = 45 > 20, A' appartient au segment [AH] et A'H = 45 − 20 = 25.
A' est à 25 m de d1 (du côté du village A) et à 25 + 20 = 45 m de d2.

**b)** t transforme A en A' et M en N (car vec(MN) = u). La translation conserve les distances : A'N = AM.
Donc L = AM + MN + NB = A'N + 20 + NB.

**3. a)** D'après l'inégalité triangulaire, A'N + NB ≥ A'B, avec égalité si et seulement si N appartient au segment [A'B]. Donc L ≥ A'B + 20, avec égalité si et seulement si N ∈ [A'B].

**b)** A' est du même côté de d2 que d1, alors que B est de l'autre côté de d2 : le segment [A'B] traverse la droite d2 en un point N0.
Construction du pont le plus court :

- on place A' sur [AH] tel que HA' = 25 m (A' est l'image de A par t) ;
- on trace le segment [A'B], qui coupe d2 en N0 ;
- on trace la perpendiculaire à d1 passant par N0 : elle coupe d1 en M0 (N0 est l'image de M0 par t).

Pour ce pont, L = A'B + 20. Pour toute autre position, N est un point de d2 distinct de N0, donc N n'est pas sur [A'B] et le trajet est plus long.

**4. a)** Les droites (PB) et d1 sont perpendiculaires à (AH), donc parallèles ; le quadrilatère HPBK a trois angles droits : c'est un rectangle. Donc PB = HK = 80 et HP = KB = 15 + 20 = 35.
A' est entre A et H, et P est de l'autre côté de H : A'P = A'H + HP = 25 + 35 = 60.
Le triangle A'PB est rectangle en P. D'après le théorème de Pythagore :

    A'B² = A'P² + PB² = 3600 + 6400 = 10000,   donc A'B = 100

La longueur minimale du trajet est 100 + 20 = 120 m.

**b)** Dans le triangle A'PB : Q appartient à [A'P] (A'Q = A'H + HQ = 25 + 20 = 45), N0 appartient à [A'B], et (QN0) = d2 est parallèle à (PB). D'après le théorème de Thalès :

    A'Q / A'P = QN0 / PB,   soit   45 / 60 = QN0 / 80,   donc QN0 = 60

Le quadrilatère HM0N0Q est un rectangle (côtés (HM0) ⟂ (HQ) et (M0N0) ⟂ d1), donc HM0 = QN0 = 60 m. Le pont se trouve sur d1 à 60 m de H, en direction de K (donc à 20 m de K).

**c)** Le triangle AHM0 est rectangle en H : AM0² = 45² + 60² = 2025 + 3600 = 5625, donc AM0 = 75.
Soit K' le point d'intersection de (BK) et de d2. On a QK' = HK = 80, donc N0K' = 80 − 60 = 20, et K'B = 15. Le triangle N0K'B est rectangle en K' : N0B² = 20² + 15² = 625, donc N0B = 25.
On retrouve L = 75 + 20 + 25 = 120 m.

**5.** Si M = H, alors N = Q. On a AH = 45 et HQ = 20. Le triangle QK'B est rectangle en K' :

    QB² = 80² + 15² = 6400 + 225 = 6625,   donc QB = √6625 = 5√265 ≈ 81.4

Le trajet mesure 45 + 20 + 5√265 ≈ 146.4 m, soit environ 26.4 m de plus que le trajet minimal de 120 m.
