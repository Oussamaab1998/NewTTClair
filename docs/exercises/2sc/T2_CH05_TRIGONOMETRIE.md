# 2ème Sciences — Tome 2, Chapitre 5 : Trigonométrie et mesure des grandeurs

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 26 (activités sur les mesures de grandeurs) : sinus, cosinus, tangente et cotangente d'un angle compris entre 0 et π ; cos²x + sin²x = 1, 1 + tan²x = 1/cos²x, 1 + cot²x = 1/sin²x ; angles supplémentaires, angles complémentaires ; loi des sinus, formule d'Al-Kashi ; calcul de longueurs et d'aires.
- Manuel CNP (tome 2, chapitre 5, p. 72–91) : dans un repère orthonormé (O, vec(OA), vec(OB)), le demi-cercle trigonométrique est le demi-cercle de diamètre [AA'] (A' symétrique de A par rapport à O) qui contient B ; pour α ∈ [0, π], cos α et sin α sont l'abscisse et l'ordonnée du point M de ce demi-cercle tel que l'angle AOM mesure α. tan α = sin α / cos α (α ≠ π/2), cot α = cos α / sin α (α ≠ 0, α ≠ π). Formules : cos(π − x) = −cos x, sin(π − x) = sin x, tan(π − x) = −tan x, cot(π − x) = −cot x ; pour x ∈ [0, π/2], cos(π/2 − x) = sin x, sin(π/2 − x) = cos x, et tan(π/2 − x) = cot x pour x ∈ ]0, π/2[. Dans un triangle (a = BC, b = AC, c = AB) : a/sin A = b/sin B = c/sin C = 2R (loi des sinus, R rayon du cercle circonscrit), aire S = (1/2) bc sin A = abc/(4R), théorème d'El-Kashi a² = b² + c² − 2bc cos A. Le manuel écrit « cot » (le programme écrit « cotg ») ; on suit le manuel.
- Outils autorisés : ce chapitre, les chapitres précédents, le tome 1 (équations du second degré) et la 1ère année (Pythagore, rapports trigonométriques dans un triangle rectangle, distance dans un repère orthonormé, valeurs remarquables pour π/6, π/4, π/3). Pas de cercle trigonométrique complet, pas d'angles orientés, pas de formules d'addition (programme de 3ème). La calculatrice sert seulement aux valeurs approchées, comme dans le manuel.
- Notation : « angle BAC » est l'angle géométrique de sommet A ; les angles sont en radians, avec la mesure en degrés entre parenthèses quand c'est utile.
- Toutes les valeurs sont vérifiées par `check_t2_ch05.py` (calcul exact en fractions et en nombres de la forme p + q√3 ; contrôle numérique pour les valeurs approchées).

---

## Exercice 1 — Cosinus, sinus, tangente et cotangente d'un réel de [0, π]

Le plan est muni d'un repère orthonormé (O, vec(OA), vec(OB)). On note A' le symétrique de A par rapport à O et C le demi-cercle trigonométrique. On rappelle que pour α ∈ [0, π], cos α et sin α sont l'abscisse et l'ordonnée du point M de C tel que l'angle AOM mesure α.

1. a) Soit M le point de C tel que l'angle AOM mesure 3π/4, et M' le symétrique de M par rapport à la droite (OB). Donner la mesure de l'angle AOM', puis les coordonnées de M' et de M. En déduire cos(3π/4), sin(3π/4), tan(3π/4) et cot(3π/4).
   b) Combien y a-t-il de points de C d'ordonnée 1/2 ? d'abscisse −1/2 ? Pour chacun de ces points M, donner la mesure de l'angle AOM.
2. a) Soit a un réel de [0, π] tel que cos a = −5/13. Calculer sin a, tan a et cot a. Justifier que a ∈ ]π/2, π[, puis calculer cos(π − a), sin(π − a) et tan(π − a).
   b) Soit b un réel de [0, π], différent de π/2, tel que tan b = 2. Montrer que b ∈ ]0, π/2[. Calculer cos b, sin b et cot b, puis tan(π/2 − b).
3. Calculer sans calculatrice :
   a) cos(π/7) + cos(2π/7) + cos(5π/7) + cos(6π/7) ;
   b) sin²(π/10) + sin²(2π/5) ;
   c) tan(π/8) × tan(3π/8).
4. Résoudre dans [0, π] les équations suivantes :
   a) 2 cos x + √3 = 0 ;
   b) 4 sin²x − 3 = 0 ;
   c) √3 tan x + 1 = 0 ;
   d) 2 cos²x − cos x − 1 = 0.
5. a) Montrer que pour tout x de ]0, π[ différent de π/2 :

       tan x + cot x = 1 / (sin x cos x)

   b) Montrer que pour tout x de [0, π] : sin⁴x − cos⁴x = 2 sin²x − 1.
   c) Vérifier l'égalité du a) pour le réel b de la question 2. b).

### Corrigé

**1. a)** D'après le cours (angles supplémentaires), le symétrique par rapport à (OB) du point de C associé à α est le point de C associé à π − α. Donc l'angle AOM' mesure π − 3π/4 = π/4, et

    M'(cos(π/4), sin(π/4)) = M'(√2/2, √2/2)

La symétrie d'axe (OB) change l'abscisse en son opposée et conserve l'ordonnée : M(−√2/2, √2/2). Donc

    cos(3π/4) = −√2/2,  sin(3π/4) = √2/2,  tan(3π/4) = sin/cos = −1,  cot(3π/4) = cos/sin = −1

**b)** C a pour centre O et pour rayon OA = 1. Un point M(x, y) est sur C si et seulement si x² + y² = 1 et y ≥ 0.

- Ordonnée 1/2 : x² = 1 − 1/4 = 3/4, donc x = √3/2 ou x = −√3/2. Il y a deux points : (√3/2, 1/2), pour lequel l'angle AOM mesure π/6 (cos(π/6) = √3/2, sin(π/6) = 1/2), et (−√3/2, 1/2), pour lequel il mesure π − π/6 = 5π/6.
- Abscisse −1/2 : y² = 3/4 et y ≥ 0, donc y = √3/2. Il y a un seul point, (−1/2, √3/2), pour lequel l'angle AOM mesure π − π/3 = 2π/3 (cos(2π/3) = −cos(π/3) = −1/2).

**2. a)** cos²a + sin²a = 1, donc sin²a = 1 − 25/169 = 144/169. Comme a ∈ [0, π], sin a ≥ 0, donc sin a = 12/13.

    tan a = sin a / cos a = (12/13) / (−5/13) = −12/5,   cot a = cos a / sin a = −5/12

Pour α ∈ [0, π/2], le point associé est à droite de (OB) ou sur (OB), donc cos α ≥ 0. Ici cos a < 0, donc a ∈ ]π/2, π] ; et a ≠ π car cos π = −1. Ainsi a ∈ ]π/2, π[.
Angles supplémentaires : cos(π − a) = −cos a = 5/13, sin(π − a) = sin a = 12/13, tan(π − a) = −tan a = 12/5.

**b)** tan 0 = tan π = 0, donc b ≠ 0 et b ≠ π ; alors sin b > 0. Comme tan b = sin b / cos b = 2 > 0, on a cos b > 0, donc b ∈ ]0, π/2[.
1 + tan²b = 1/cos²b, donc cos²b = 1/(1 + 4) = 1/5. Comme cos b > 0 :

    cos b = 1/√5 = √5/5,   sin b = tan b × cos b = 2√5/5,   cot b = 1/tan b = 1/2

Contrôle : cos²b + sin²b = 1/5 + 4/5 = 1. Comme b ∈ ]0, π/2[, tan(π/2 − b) = cot b = 1/2.

**3. a)** 6π/7 = π − π/7 et 5π/7 = π − 2π/7, donc cos(6π/7) = −cos(π/7) et cos(5π/7) = −cos(2π/7). La somme vaut 0.

**b)** 2π/5 = π/2 − π/10 avec π/10 ∈ [0, π/2], donc sin(2π/5) = cos(π/10). La somme vaut sin²(π/10) + cos²(π/10) = 1.

**c)** 3π/8 = π/2 − π/8 avec π/8 ∈ ]0, π/2[, donc tan(3π/8) = cot(π/8) = 1/tan(π/8). Le produit vaut 1.

**4. a)** cos x = −√3/2. On a cos(5π/6) = cos(π − π/6) = −cos(π/6) = −√3/2. Il n'y a qu'un point de C d'abscisse −√3/2 (y² = 1/4 et y ≥ 0 donnent y = 1/2), donc une seule solution. S = {5π/6}.

**b)** sin²x = 3/4. Comme sin x ≥ 0 sur [0, π], sin x = √3/2. Il y a deux points de C d'ordonnée √3/2 (x² = 1/4, x = ±1/2) : x = π/3 et x = π − π/3 = 2π/3. S = {π/3 ; 2π/3}.

**c)** Il faut x ≠ π/2. tan x = −1/√3 = −√3/3. Comme tan x ≠ 0, x ≠ 0 et x ≠ π, donc sin x > 0, puis cos x < 0 car tan x < 0.
1 + tan²x = 1 + 1/3 = 4/3 = 1/cos²x, donc cos²x = 3/4 et cos x = −√3/2. D'après a), x = 5π/6. Contrôle : tan(5π/6) = −tan(π/6) = −√3/3. S = {5π/6}.

**d)** On pose X = cos x. L'équation 2X² − X − 1 = 0 a pour racine évidente X = 1 (2 − 1 − 1 = 0) ; le produit des racines vaut −1/2, donc l'autre racine est −1/2. Ainsi

    2 cos²x − cos x − 1 = (cos x − 1)(2 cos x + 1)

cos x = 1 ⟺ x = 0 ; cos x = −1/2 ⟺ x = 2π/3 (question 1. b)). S = {0 ; 2π/3}.

**5. a)** Pour x ∈ ]0, π[, x ≠ π/2, on a sin x ≠ 0 et cos x ≠ 0 :

    tan x + cot x = sin x / cos x + cos x / sin x = (sin²x + cos²x) / (sin x cos x) = 1 / (sin x cos x)

**b)** sin⁴x − cos⁴x = (sin²x − cos²x)(sin²x + cos²x) = sin²x − cos²x = sin²x − (1 − sin²x) = 2 sin²x − 1.

**c)** tan b + cot b = 2 + 1/2 = 5/2. D'autre part sin b cos b = (2√5/5)(√5/5) = 10/25 = 2/5, et 1/(2/5) = 5/2. Les deux membres sont égaux.

---

## Exercice 2 — Problème : partager un terrain triangulaire

Un terrain a la forme d'un triangle ABC tel que AB = 50 m, AC = 30 m et l'angle BAC mesure 2π/3 (soit 120°). On pose a = BC, b = AC et c = AB. Les valeurs approchées s'obtiennent à la calculatrice.

1. Calculer la longueur BC.
2. a) Calculer cos(angle ABC) et cos(angle ACB).
   b) En déduire sin(angle ABC) et sin(angle ACB).
   c) Donner une valeur approchée à 0.1° près de chacun des angles ABC et ACB. Contrôler avec la somme des angles du triangle.
3. a) Vérifier la loi des sinus : BC / sin(angle BAC) = AC / sin(angle ABC) = AB / sin(angle ACB).
   b) En déduire le rayon R du cercle circonscrit au triangle ABC.
   c) Calculer l'aire S du terrain, puis la distance AH du point A à la droite (BC) (H est le pied de la hauteur issue de A).
   d) Vérifier que S = abc / (4R).
4. On partage le terrain en deux parcelles par une clôture droite [AD], où D est le point de [BC] tel que la demi-droite [AD) partage l'angle BAC en deux angles de mesure π/3.
   a) Exprimer l'aire de chacun des triangles ABD et ADC en fonction de AD. En déduire que AD = 18.75 m.
   b) Calculer BD à l'aide du triangle ABD, puis DC. Vérifier que BD / DC = AB / AC.
   c) Calculer l'aire de chacune des deux parcelles.
5. a) Calculer cos(angle ADB). L'angle ADB est-il aigu ou obtus ?
   b) En déduire sin(angle ADB).
   c) Combien y a-t-il de réels de [0, π] dont le sinus est égal à sin(angle ADB) ? Donner une valeur approchée à 0.1° près de l'angle ADB, puis retrouver ce résultat à l'aide des angles du triangle ABD.

### Corrigé

**1.** cos(2π/3) = cos(π − π/3) = −cos(π/3) = −1/2. Théorème d'El-Kashi :

    a² = b² + c² − 2bc cos(angle BAC) = 900 + 2500 − 2 × 30 × 50 × (−1/2) = 3400 + 1500 = 4900

BC = √4900 = 70 m.

**2. a)** El-Kashi pour l'angle en B : b² = a² + c² − 2ac cos(angle ABC), donc

    cos(angle ABC) = (a² + c² − b²) / (2ac) = (4900 + 2500 − 900) / (2 × 70 × 50) = 6500 / 7000 = 13/14

De même : cos(angle ACB) = (a² + b² − c²) / (2ab) = (4900 + 900 − 2500) / (2 × 70 × 30) = 3300 / 4200 = 11/14.

**b)** Les sinus sont positifs (angles de [0, π]) :

- sin²(angle ABC) = 1 − 169/196 = 27/196, donc sin(angle ABC) = √27 / 14 = 3√3/14 ;
- sin²(angle ACB) = 1 − 121/196 = 75/196, donc sin(angle ACB) = √75 / 14 = 5√3/14.

**c)** À la calculatrice : angle ABC ≈ 21.8° et angle ACB ≈ 38.2° (cosinus 13/14 et 11/14). Contrôle : 120 + 21.8 + 38.2 = 180.

**3. a)** sin(2π/3) = sin(π − π/3) = sin(π/3) = √3/2.

    BC / sin(angle BAC) = 70 / (√3/2) = 140/√3
    AC / sin(angle ABC) = 30 × 14 / (3√3) = 140/√3
    AB / sin(angle ACB) = 50 × 14 / (5√3) = 140/√3

Les trois rapports sont égaux à 140/√3 = 140√3/3.

**b)** Loi des sinus : BC / sin(angle BAC) = 2R, donc R = 70/√3 = 70√3/3 ≈ 40.41 m.

**c)** S = (1/2) × AB × AC × sin(angle BAC) = (1/2) × 50 × 30 × √3/2 = 375√3 m², soit environ 649.5 m².
D'autre part S = (1/2) × BC × AH, donc AH = 2S / BC = 750√3 / 70 = 75√3/7 ≈ 18.56 m.

**d)** abc / (4R) = (70 × 30 × 50) / (4 × 70√3/3) = 105000 × 3 / (280√3) = 1125/√3 = 375√3 = S.

**4. a)** Les angles BAD et DAC mesurent π/3, et sin(π/3) = √3/2 :

    aire(ABD) = (1/2) × AB × AD × sin(π/3) = (25√3/2) × AD
    aire(ADC) = (1/2) × AC × AD × sin(π/3) = (15√3/2) × AD

Les deux triangles partagent le terrain, donc (25√3/2 + 15√3/2) × AD = S, soit 20√3 × AD = 375√3, d'où AD = 375/20 = 18.75 m.

**b)** El-Kashi dans le triangle ABD :

    BD² = AB² + AD² − 2 × AB × AD × cos(π/3) = 2500 + 351.5625 − 2 × 50 × 18.75 × 0.5 = 1914.0625

BD = 43.75 m. Comme D ∈ [BC], DC = BC − BD = 70 − 43.75 = 26.25 m.
BD / DC = 43.75 / 26.25 = 5/3 et AB / AC = 50/30 = 5/3 : les deux rapports sont égaux.
(Contrôle dans le triangle ADC : DC² = 900 + 351.5625 − 2 × 30 × 18.75 × 0.5 = 689.0625 = 26.25².)

**c)** aire(ABD) = (25√3/2) × 18.75 = 234.375√3 ≈ 405.9 m² ; aire(ADC) = (15√3/2) × 18.75 = 140.625√3 ≈ 243.6 m².
Contrôle : 234.375 + 140.625 = 375, on retrouve S = 375√3.

**5. a)** El-Kashi dans le triangle ABD, pour l'angle en D : AB² = AD² + BD² − 2 × AD × BD × cos(angle ADB), donc

    cos(angle ADB) = (AD² + BD² − AB²) / (2 × AD × BD) = (351.5625 + 1914.0625 − 2500) / (2 × 18.75 × 43.75) = −234.375 / 1640.625 = −1/7

Le cosinus est négatif : l'angle ADB est obtus.

**b)** sin²(angle ADB) = 1 − 1/49 = 48/49 et le sinus est positif, donc sin(angle ADB) = √48 / 7 = 4√3/7.

**c)** 0 < 4√3/7 < 1 : il y a deux points du demi-cercle trigonométrique d'ordonnée 4√3/7, donc deux réels de [0, π] ayant ce sinus. L'un est aigu, environ 81.8° (c'est celui que donne la calculatrice à partir du sinus) ; l'autre est son supplémentaire, environ 180 − 81.8 = 98.2°.
L'angle ADB est obtus, donc angle ADB ≈ 98.2°.
Contrôle : dans le triangle ABD, l'angle BAD mesure 60° et l'angle ABD est l'angle ABC ≈ 21.8° (D est sur [BC]). Donc angle ADB ≈ 180 − 60 − 21.8 = 98.2°.
