# 3ème Sc. exp. — Tome 2, Chapitre 2 : Angles orientés

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20 : arcs orientés, cercle trigonométrique, angles orientés, angle inscrit et angle au centre associé, déterminant de deux vecteurs. Aptitudes : déterminer une mesure principale, exploiter les propriétés des angles orientés, reconnaître et construire les ensembles de points M tels que (vec(MA), vec(MB)) ≡ α [2π], reconnaître une base orthonormée directe, exploiter le déterminant.
- Manuel CNP : mesure principale dans ]−π, π], relation de Chasles, (−u, v) ≡ π + (u, v), somme des angles orientés d'un triangle ≡ π, triangle isocèle, colinéarité ((u, v) ≡ 0 [π]) et orthogonalité ((u, v) ≡ π/2 [π]), théorème de l'angle inscrit 2(vec(MA), vec(MB)) ≡ (vec(OA), vec(OB)) [2π], ensemble des M tels que (vec(MA), vec(MB)) ≡ θ [2π] (arc de cercle privé de A et B), base orthonormée directe, déterminant. La formule du déterminant est illisible dans le texte extrait du manuel : elle est rappelée dans l'énoncé (dét(u, v) = u'·v, avec ‖u'‖ = ‖u‖ et (u, u') ≡ π/2 [2π]) ; à confirmer sur le manuel papier. L'expression xy' − x'y n'arrive qu'au chapitre 3.
- Notation : vec(AB) est le vecteur AB ; (vec(AB), vec(AC)) est l'angle orienté de ce couple de vecteurs ; u, v, w, n désignent des vecteurs.
- Outils autorisés : chapitres 1 et 2 du tome 2 et acquis antérieurs (angles d'un triangle, cosinus de π/6, π/4, π/3). Pas de cosinus ni de sinus d'un réel, pas de formules trigonométriques (chapitre 3).
- Toutes les valeurs sont vérifiées par `check_t2_ch02.py` (calcul en coordonnées, mesures comparées modulo 2π à 10⁻⁹ près).

---

## Exercice 1 — Mesure principale, relation de Chasles, angle inscrit, déterminant

Le plan est orienté dans le sens direct.

1. Soit u, v et w trois vecteurs non nuls tels que

       (u, v) ≡ 29π/3 [2π]     et     (v, w) ≡ −43π/4 [2π]

   a) Déterminer la mesure principale de (u, v) et celle de (v, w).
   b) En déduire la mesure principale de (u, w).
   c) Déterminer la mesure principale de (w, u), de (−u, w) et de (2v, −5w).

Dans la suite, ABCDEF est un hexagone régulier de centre O, inscrit dans le cercle 𝒞 de centre O et de rayon 1, dont les sommets se suivent dans le sens direct :

    (vec(OA), vec(OB)) ≡ (vec(OB), vec(OC)) ≡ (vec(OC), vec(OD)) ≡ (vec(OD), vec(OE)) ≡ (vec(OE), vec(OF)) ≡ (vec(OF), vec(OA)) ≡ π/3 [2π]

2. a) Déterminer la mesure principale de chacun des angles orientés (vec(OA), vec(OC)), (vec(OA), vec(OE)), (vec(OC), vec(OF)) et (vec(OD), vec(OB)). Que peut-on dire des points C, O et F ?
   b) Montrer que (vec(AB), vec(AO)) ≡ π/3 [2π] et (vec(AO), vec(AF)) ≡ π/3 [2π]. En déduire la mesure principale de (vec(AB), vec(AF)).
3. a) En utilisant le théorème de l'angle inscrit, montrer que 2(vec(CA), vec(CD)) ≡ π [2π]. Que peut-on en déduire pour les droites (CA) et (CD) ?
   b) Justifier que vec(AB) = vec(OC) et vec(DE) = vec(OF). En déduire une mesure de (vec(AB), vec(DE)). Que peut-on dire des droites (AB) et (DE) ?
4. On note Γ l'ensemble des points M du plan tels que (vec(MA), vec(MD)) ≡ π/2 [2π].
   a) Montrer que si M appartient à Γ, alors M appartient à 𝒞.
   b) Montrer que (vec(EA), vec(ED)) ≡ π/2 [2π].
   c) En déduire l'ensemble Γ. Lesquels des sommets B, C, E et F appartiennent à Γ ?
5. On rappelle que, pour deux vecteurs non nuls u et v, dét(u, v) = u'·v, où u' est le vecteur tel que ‖u'‖ = ‖u‖ et (u, u') ≡ π/2 [2π].
   On note n le vecteur tel que ‖n‖ = 1 et (vec(OA), n) ≡ π/2 [2π].
   a) Justifier que (vec(OA), n) est une base orthonormée directe.
   b) Déterminer la mesure principale de (n, vec(OB)) et celle de (n, vec(OC)).
   c) En déduire dét(vec(OA), vec(OB)) et dét(vec(OA), vec(OC)).
   d) Sans calcul, donner dét(vec(OA), vec(OD)) et dét(vec(OB), vec(OE)).

### Corrigé

**1. a)** 29π/3 = −π/3 + 10π = −π/3 + 5 × 2π et −π/3 ∈ ]−π, π] : la mesure principale de (u, v) est −π/3.
−43π/4 = −3π/4 − 10π = −3π/4 − 5 × 2π et −3π/4 ∈ ]−π, π] : la mesure principale de (v, w) est −3π/4.

**b)** Relation de Chasles : (u, w) ≡ (u, v) + (v, w) ≡ −π/3 − 3π/4 = −13π/12 [2π].
Or −13π/12 + 2π = 11π/12 ∈ ]−π, π] : la mesure principale de (u, w) est 11π/12.

**c)**

- (w, u) ≡ −(u, w) ≡ −11π/12 [2π] : mesure principale −11π/12.
- (−u, w) ≡ π + (u, w) ≡ π + 11π/12 = 23π/12 [2π], et 23π/12 − 2π = −π/12 : mesure principale −π/12.
- 2 > 0 et −5 < 0, donc (2v, −5w) ≡ π + (v, w) ≡ π − 3π/4 = π/4 [2π] : mesure principale π/4.

**2. a)** On applique la relation de Chasles avec les angles π/3 de l'énoncé :

- (vec(OA), vec(OC)) ≡ (vec(OA), vec(OB)) + (vec(OB), vec(OC)) ≡ 2π/3 [2π] : mesure principale 2π/3.
- (vec(OA), vec(OE)) ≡ −(vec(OE), vec(OF)) − (vec(OF), vec(OA)) ≡ −2π/3 [2π] : mesure principale −2π/3.
- (vec(OC), vec(OF)) ≡ (vec(OC), vec(OD)) + (vec(OD), vec(OE)) + (vec(OE), vec(OF)) ≡ π [2π] : mesure principale π.
- (vec(OD), vec(OB)) ≡ −(vec(OB), vec(OC)) − (vec(OC), vec(OD)) ≡ −2π/3 [2π] : mesure principale −2π/3.

(vec(OC), vec(OF)) ≡ π : les vecteurs vec(OC) et vec(OF) sont colinéaires et de sens contraires. Les points C, O et F sont alignés, et comme OC = OF = 1, O est le milieu de [CF] : C et F sont diamétralement opposés sur 𝒞.

**b)** Rappel : si PQR est un triangle équilatéral, il est isocèle en chacun de ses sommets, donc (vec(PQ), vec(PR)) ≡ (vec(QR), vec(QP)) ≡ (vec(RP), vec(RQ)) [2π].

- OAB est équilatéral (OA = OB = 1 et angle AOB = π/3) et (vec(OA), vec(OB)) ≡ π/3, donc (vec(AB), vec(AO)) ≡ π/3 [2π].
- OFA est équilatéral et (vec(OF), vec(OA)) ≡ π/3, donc (vec(AO), vec(AF)) ≡ π/3 [2π].

Chasles : (vec(AB), vec(AF)) ≡ (vec(AB), vec(AO)) + (vec(AO), vec(AF)) ≡ 2π/3 [2π] : mesure principale 2π/3 (on retrouve l'angle 2π/3 d'un hexagone régulier).

**3. a)** A, C et D sont trois points distincts de 𝒞, de centre O. Théorème de l'angle inscrit :

    2(vec(CA), vec(CD)) ≡ (vec(OA), vec(OD)) [2π]

Or (vec(OA), vec(OD)) ≡ 3 × π/3 = π [2π]. Donc 2(vec(CA), vec(CD)) ≡ π [2π], c'est-à-dire (vec(CA), vec(CD)) ≡ π/2 [π] : les droites (CA) et (CD) sont perpendiculaires. (On retrouve que [AD] est un diamètre de 𝒞.)

**b)** Le côté d'un hexagone régulier est égal au rayon : OA = AB = BC = CO = 1. Le quadrilatère OABC a quatre côtés égaux, c'est un losange, donc vec(AB) = vec(OC). De même ODEF est un losange (OD = DE = EF = FO = 1), donc vec(DE) = vec(OF).
Donc (vec(AB), vec(DE)) ≡ (vec(OC), vec(OF)) ≡ π [2π] (question 2. a)). Les vecteurs vec(AB) et vec(DE) sont colinéaires de sens contraires : les droites (AB) et (DE) sont parallèles.

**4. a)** Si M ∈ Γ, alors M est distinct de A et de D, et (vec(MA), vec(MD)) ≡ π/2 [π] : les vecteurs vec(MA) et vec(MD) sont orthogonaux. M est donc sur le cercle de diamètre [AD]. Or O est le milieu de [AD] ((vec(OA), vec(OD)) ≡ π et OA = OD = 1) et OA = 1 : ce cercle est 𝒞.

**b)** Chasles : (vec(EA), vec(ED)) ≡ (vec(EA), vec(EO)) + (vec(EO), vec(ED)).

- ODE est équilatéral et (vec(OD), vec(OE)) ≡ π/3, donc (vec(EO), vec(ED)) ≡ π/3 [2π].
- OEA est isocèle en O et (vec(OE), vec(OA)) ≡ (vec(OE), vec(OF)) + (vec(OF), vec(OA)) ≡ 2π/3 [2π]. Somme des angles du triangle : (vec(OE), vec(OA)) + (vec(AO), vec(AE)) + (vec(EA), vec(EO)) ≡ π [2π], et (vec(AO), vec(AE)) ≡ (vec(EA), vec(EO)) car le triangle est isocèle en O. Donc 2(vec(EA), vec(EO)) ≡ π − 2π/3 = π/3 [2π], soit (vec(EA), vec(EO)) ≡ π/6 [π] : sa mesure principale est π/6 ou −5π/6. Or l'angle géométrique AEO vaut (π − 2π/3)/2 = π/6, qui est la valeur absolue de la mesure principale. Donc (vec(EA), vec(EO)) ≡ π/6 [2π].

Finalement (vec(EA), vec(ED)) ≡ π/6 + π/3 = π/2 [2π].

**c)** D'après le cours, l'ensemble des points M tels que (vec(MA), vec(MD)) ≡ π/2 [2π] est l'un des deux demi-cercles de diamètre [AD], privé de A et D. D'après le 4. b), il contient E.
Γ est donc le demi-cercle de 𝒞 d'extrémités A et D qui contient E, privé de A et D. C'est aussi celui qui contient F (les points M de 𝒞 tels que la mesure principale de (vec(OA), vec(OM)) appartient à ]−π, 0[ : E correspond à −2π/3 et F à −π/3).
Sommets : E et F appartiennent à Γ ; B et C n'y appartiennent pas (ils sont sur l'autre demi-cercle, où (vec(MA), vec(MD)) ≡ −π/2 [2π] ; par exemple (vec(CA), vec(CD)) ≡ −π/2).

**5. a)** ‖n‖ = 1 = OA = ‖vec(OA)‖ et (vec(OA), n) ≡ π/2 [2π] : par définition, (vec(OA), n) est une base orthonormée directe.

**b)** Chasles :

- (n, vec(OB)) ≡ (n, vec(OA)) + (vec(OA), vec(OB)) ≡ −π/2 + π/3 = −π/6 [2π] : mesure principale −π/6.
- (n, vec(OC)) ≡ (n, vec(OA)) + (vec(OA), vec(OC)) ≡ −π/2 + 2π/3 = π/6 [2π] : mesure principale π/6.

**c)** n est le vecteur u' associé à u = vec(OA) (même norme, et (vec(OA), n) ≡ π/2). L'angle géométrique entre n et vec(OB) vaut π/6 (valeur absolue de la mesure principale), donc

    dét(vec(OA), vec(OB)) = n·vec(OB) = ‖n‖ × OB × cos(π/6) = 1 × 1 × √3/2 = √3/2

De même, dét(vec(OA), vec(OC)) = n·vec(OC) = 1 × 1 × cos(π/6) = √3/2.

**d)** D est diamétralement opposé à A, donc vec(OD) = −vec(OA) : les vecteurs sont colinéaires et dét(vec(OA), vec(OD)) = 0.
De même (vec(OB), vec(OE)) ≡ π, donc vec(OE) = −vec(OB) et dét(vec(OB), vec(OE)) = 0.

---

## Exercice 2 — Carré et triangles équilatéraux : alignement et arc de cercle

Le plan est orienté dans le sens direct. ABCD est un carré de côté a tel que (vec(AB), vec(AD)) ≡ π/2 [2π].

- E est le point tel que ABE est un triangle équilatéral et (vec(AB), vec(AE)) ≡ π/3 [2π] (E est à l'intérieur du carré).
- F est le point tel que BCF est un triangle équilatéral et (vec(BC), vec(BF)) ≡ −π/3 [2π] (F est à l'extérieur du carré).

1. a) Montrer que (vec(BA), vec(BC)) ≡ −π/2 [2π].
   b) Déterminer la mesure principale de (vec(AD), vec(AE)) et celle de (vec(BE), vec(BF)).
   c) Quelle est la nature des triangles ADE et BEF ? Donner les mesures de leurs angles géométriques.
2. a) Montrer que (vec(ED), vec(EA)) ≡ 5π/12 [2π].
   b) Montrer que (vec(EB), vec(EF)) ≡ π/4 [2π].
   c) En déduire que les points D, E et F sont alignés. Le point E est-il situé entre D et F ?
3. a) Montrer que les points A, E, C et F appartiennent à un même cercle Γ dont on précisera le centre et le rayon.
   b) Déterminer la mesure principale de (vec(EB), vec(EC)), puis celle de (vec(EA), vec(EC)).
   c) Retrouver, à l'aide du théorème de l'angle inscrit dans Γ, que 2(vec(EA), vec(EC)) ≡ −π/2 [2π].
4. On note Λ l'ensemble des points M du plan tels que (vec(MA), vec(MC)) ≡ 3π/4 [2π].
   a) Déterminer et décrire l'ensemble Λ.
   b) Le point F appartient-il à Λ ? Déterminer la mesure principale de (vec(FA), vec(FC)).

### Corrigé

**1. a)** ABCD est un carré, donc vec(BC) = vec(AD). Chasles :

    (vec(BA), vec(BC)) ≡ (vec(BA), vec(AB)) + (vec(AB), vec(AD)) ≡ π + π/2 = 3π/2 ≡ −π/2 [2π]

**b)**

- (vec(AD), vec(AE)) ≡ (vec(AD), vec(AB)) + (vec(AB), vec(AE)) ≡ −π/2 + π/3 = −π/6 [2π] : mesure principale −π/6.
- ABE est équilatéral, isocèle en chacun de ses sommets, et (vec(AB), vec(AE)) ≡ π/3, donc (vec(BE), vec(BA)) ≡ (vec(EA), vec(EB)) ≡ π/3 [2π]. Chasles :

      (vec(BE), vec(BF)) ≡ (vec(BE), vec(BA)) + (vec(BA), vec(BC)) + (vec(BC), vec(BF)) ≡ π/3 − π/2 − π/3 = −π/2 [2π]

  Mesure principale −π/2.

**c)** AD = AB (carré) et AE = AB (triangle équilatéral) : ADE est isocèle en A. Son angle géométrique en A vaut π/6 (valeur absolue de −π/6), donc ses angles à la base valent (π − π/6)/2 = 5π/12 : angle ADE = angle AED = 5π/12.
BE = BA = BC = BF : BEF est isocèle en B, et son angle en B vaut π/2. BEF est rectangle isocèle en B : angle BEF = angle BFE = π/4.

**2. a)** Triangle ADE, isocèle en A : (vec(DE), vec(DA)) ≡ (vec(EA), vec(ED)), et la somme des angles donne

    (vec(AD), vec(AE)) + (vec(DE), vec(DA)) + (vec(EA), vec(ED)) ≡ π [2π]

Donc 2(vec(EA), vec(ED)) ≡ π + π/6 = 7π/6 [2π], soit (vec(EA), vec(ED)) ≡ 7π/12 [π] : sa mesure principale est 7π/12 ou −5π/12.
La valeur absolue de la mesure principale est l'angle géométrique AED = 5π/12. Donc (vec(EA), vec(ED)) ≡ −5π/12 [2π] et (vec(ED), vec(EA)) ≡ 5π/12 [2π].

**b)** Triangle BEF, isocèle en B : (vec(EF), vec(EB)) ≡ (vec(FB), vec(FE)), et

    (vec(BE), vec(BF)) + (vec(EF), vec(EB)) + (vec(FB), vec(FE)) ≡ π [2π]

Donc 2(vec(EF), vec(EB)) ≡ π + π/2 = 3π/2 [2π], soit (vec(EF), vec(EB)) ≡ 3π/4 [π] : mesure principale 3π/4 ou −π/4. L'angle géométrique BEF vaut π/4, donc (vec(EF), vec(EB)) ≡ −π/4 [2π] et (vec(EB), vec(EF)) ≡ π/4 [2π].

**c)** Chasles, avec (vec(EA), vec(EB)) ≡ π/3 (question 1. b)) :

    (vec(ED), vec(EF)) ≡ (vec(ED), vec(EA)) + (vec(EA), vec(EB)) + (vec(EB), vec(EF)) ≡ 5π/12 + 4π/12 + 3π/12 = π [2π]

Les vecteurs vec(ED) et vec(EF) sont colinéaires et de sens contraires : D, E et F sont alignés, et E est situé entre D et F (E ∈ [DF]).

**3. a)** BA = BC = a (côtés du carré), BE = BA = a (ABE équilatéral) et BF = BC = a (BCF équilatéral).
Les points A, E, C et F sont à la distance a de B : ils appartiennent au cercle Γ de centre B et de rayon a.

**b)** (vec(BE), vec(BC)) ≡ (vec(BE), vec(BA)) + (vec(BA), vec(BC)) ≡ π/3 − π/2 = −π/6 [2π].
Le triangle BEC est isocèle en B (BE = BC = a), d'angle géométrique π/6 en B, donc angle BEC = 5π/12. Comme au 2. a) :

    (vec(BE), vec(BC)) + (vec(EC), vec(EB)) + (vec(CB), vec(CE)) ≡ π   et   (vec(EC), vec(EB)) ≡ (vec(CB), vec(CE))

donc 2(vec(EC), vec(EB)) ≡ π + π/6 = 7π/6 [2π] et, l'angle géométrique valant 5π/12, (vec(EC), vec(EB)) ≡ −5π/12 [2π]. Ainsi la mesure principale de (vec(EB), vec(EC)) est 5π/12.
Chasles : (vec(EA), vec(EC)) ≡ (vec(EA), vec(EB)) + (vec(EB), vec(EC)) ≡ π/3 + 5π/12 = 9π/12 = 3π/4 [2π]. Mesure principale 3π/4.

**c)** A, E et C sont trois points distincts de Γ, de centre B. Théorème de l'angle inscrit : 2(vec(EA), vec(EC)) ≡ (vec(BA), vec(BC)) ≡ −π/2 [2π] (question 1. a)).
Avec le b) : 2 × 3π/4 = 3π/2 ≡ −π/2 [2π]. Les deux résultats concordent.

**4. a)** D'après le cours, l'ensemble des points M tels que (vec(MA), vec(MC)) ≡ 3π/4 [2π] est un arc d'un cercle passant par A et C, privé de A et C. D'après le 3. b), E appartient à Λ. Ce cercle passe donc par A, C et E (trois points non alignés) : c'est Γ, et l'arc est celui qui contient E.
Λ est l'arc de Γ d'extrémités A et C qui contient E, privé de A et C : c'est le quart de cercle de centre B et de rayon a situé à l'intérieur du carré ABCD, privé de ses extrémités A et C.

**b)** F appartient à Γ mais il est à l'extérieur du carré : F est sur l'autre arc de Γ d'extrémités A et C. D'après le cours, si M et N sont sur les deux arcs différents, (vec(MA), vec(MC)) ≡ (vec(NA), vec(NC)) + π [2π]. Donc

    (vec(FA), vec(FC)) ≡ 3π/4 + π = 7π/4 ≡ −π/4 [2π]

F n'appartient pas à Λ, et la mesure principale de (vec(FA), vec(FC)) est −π/4.
Vérification directe par Chasles : (vec(FB), vec(FC)) ≡ −π/3 (BCF équilatéral avec (vec(BC), vec(BF)) ≡ −π/3). Le triangle ABF est isocèle en B avec (vec(BA), vec(BF)) ≡ (vec(BA), vec(BC)) + (vec(BC), vec(BF)) ≡ −π/2 − π/3 = −5π/6, donc (vec(BF), vec(BA)) ≡ 5π/6. La somme des angles donne 2(vec(FA), vec(FB)) ≡ π − 5π/6 = π/6 [2π] et, l'angle géométrique AFB valant (π − 5π/6)/2 = π/12, (vec(FA), vec(FB)) ≡ π/12. Donc (vec(FA), vec(FC)) ≡ π/12 − π/3 = −π/4 [2π].
