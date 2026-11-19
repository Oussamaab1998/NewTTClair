# 2ème Sciences — Tome 2, Chapitre 6 : Géométrie analytique

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel 2005, p. 24–25 (« Activités dans un repère ») : condition de colinéarité de deux vecteurs, base, équation cartésienne et équation réduite d'une droite, vecteur directeur, coefficient directeur, condition de parallélisme de deux droites, point d'intersection de deux droites sécantes ; dans un repère orthonormé : norme d'un vecteur, distance de deux points, condition d'orthogonalité de deux vecteurs et de deux droites, vecteur normal, distance d'un point à une droite, équation d'un cercle (centre et rayon, cercle passant par trois points, ensemble des points M(x, y) tels que x² + y² + ax + by + c = 0).
- Manuel CNP (tome 2, p. 92–117) : équation cartésienne ax + by + c = 0 avec (a, b) ≠ (0, 0) ; vecteur directeur u(−b, a) ; D et D' parallèles ⟺ ab' − a'b = 0 ; équation réduite y = mx + p, coefficient directeur m, vecteur directeur (1, m) ; parallèles ⟺ m = m'. En repère orthonormé : vecteur normal n(a, b), droite passant par un point et de vecteur normal donné, D ⟂ D' ⟺ aa' + bb' = 0 ⟺ mm' = −1, d(A, D) = |a xA + b yA + c| / √(a² + b²), cercle (x − a)² + (y − b)² = R², position d'une droite et d'un cercle selon d(I, D) et R, intérieur et extérieur d'un cercle. Du tome 1 (chapitre 5) : dét(u, v) = xy' − x'y, u et v colinéaires ⟺ dét(u, v) = 0, base, ‖u‖ = √(x² + y²), u et v orthogonaux ⟺ xx' + yy' = 0 dans une base orthonormée.
- Outils autorisés : ce chapitre, le tome 1 (calcul vectoriel, second degré) et la 1ère année (Pythagore, médiatrice, tangente à un cercle perpendiculaire au rayon). Pas de produit scalaire (programme de 3ème) : l'orthogonalité se teste avec xx' + yy' = 0.
- Notation : vec(AB) est le vecteur AB et vec(AB)(4, 2) ses composantes ; AB est une distance ; dét(u, v) est le déterminant des vecteurs u et v (dans le manuel il s'écrit comme un tableau à deux colonnes) ; ‖u‖ est la norme de u.
- Toutes les valeurs sont vérifiées par `check_t2_ch06.py` (calcul exact en fractions).

---

## Exercice 1 — Colinéarité, équations de droites, parallélisme et orthogonalité

Le plan est muni d'un repère orthonormé (O, i, j). On considère les points

    A(−2, 1),   B(2, 3),   C(4, −1)

1. a) Calculer les composantes des vecteurs vec(AB) et vec(AC), puis dét(vec(AB), vec(AC)).
   b) En déduire que (vec(AB), vec(AC)) est une base et que les points A, B et C ne sont pas alignés.
   c) Déterminer le point E de l'axe des abscisses tel que les points A, B et E soient alignés.
2. a) Déterminer une équation cartésienne de la droite (AB).
   b) Donner l'équation réduite de (AB), son coefficient directeur et un vecteur directeur.
   c) Déterminer une équation cartésienne de la droite Δ passant par C et parallèle à (AB).
3. a) Déterminer l'équation réduite de la droite (BC). Montrer que les droites (AB) et (BC) sont perpendiculaires.
   b) Calculer les distances BA et BC. Quelle est la nature du triangle ABC ?
   c) Déterminer les coordonnées du point D tel que ABCD soit un carré. Vérifier que D appartient à Δ.
4. a) Calculer la distance du point C à la droite (AB). Comparer avec BC et expliquer.
   b) En déduire l'aire du carré ABCD.
5. Soit Ω le milieu du segment [AC].
   a) Calculer les coordonnées de Ω. Déterminer une équation cartésienne de la droite Δ' passant par Ω et de vecteur normal vec(AC).
   b) Montrer que les droites Δ' et (AB) sont sécantes et déterminer les coordonnées de leur point d'intersection.
   c) Vérifier que D appartient à Δ'. Que représente la droite Δ' pour le segment [AC] ? pour le carré ABCD ?

### Corrigé

**1. a)** vec(AB)(2 − (−2), 3 − 1), soit vec(AB)(4, 2), et vec(AC)(4 − (−2), −1 − 1), soit vec(AC)(6, −2).

    dét(vec(AB), vec(AC)) = 4 × (−2) − 6 × 2 = −8 − 12 = −20

**b)** dét(vec(AB), vec(AC)) ≠ 0, donc les vecteurs vec(AB) et vec(AC) ne sont pas colinéaires : (vec(AB), vec(AC)) est une base de l'ensemble des vecteurs du plan.
A, B et C sont alignés si et seulement si vec(AB) et vec(AC) sont colinéaires. Ce n'est pas le cas : A, B et C ne sont pas alignés.

**c)** Un point de l'axe des abscisses s'écrit E(x, 0), et vec(AE)(x + 2, −1).

    A, B, E alignés ⟺ dét(vec(AB), vec(AE)) = 0 ⟺ 4 × (−1) − (x + 2) × 2 = 0 ⟺ −2x − 8 = 0 ⟺ x = −4

Le point cherché est E(−4, 0).

**2. a)** Soit M(x, y) un point du plan ; vec(AM)(x + 2, y − 1).

    M ∈ (AB) ⟺ dét(vec(AM), vec(AB)) = 0 ⟺ (x + 2) × 2 − 4 × (y − 1) = 0 ⟺ 2x − 4y + 8 = 0 ⟺ x − 2y + 4 = 0

Une équation cartésienne de (AB) est x − 2y + 4 = 0. Contrôle : pour B, 2 − 6 + 4 = 0 ; pour E, −4 − 0 + 4 = 0.

**b)** x − 2y + 4 = 0 ⟺ 2y = x + 4 ⟺ y = (1/2)x + 2.
L'équation réduite de (AB) est y = (1/2)x + 2 : son coefficient directeur est 1/2 (et son ordonnée à l'origine est 2).
Un vecteur directeur est u(−b, a) = u(2, 1) (ou (1, 1/2), ou vec(AB)(4, 2), qui lui sont colinéaires).

**c)** Δ est parallèle à (AB), donc u(2, 1) est aussi un vecteur directeur de Δ. Pour M(x, y), vec(CM)(x − 4, y + 1) :

    M ∈ Δ ⟺ dét(vec(CM), u) = 0 ⟺ (x − 4) × 1 − 2 × (y + 1) = 0 ⟺ x − 2y − 6 = 0

Δ : x − 2y − 6 = 0. (Contrôle : C(4, −1) donne 4 + 2 − 6 = 0, et 1 × (−2) − 1 × (−2) = 0 confirme le parallélisme.)

**3. a)** xB ≠ xC, donc (BC) a une équation réduite y = m'x + p' avec

    m' = (yC − yB) / (xC − xB) = (−1 − 3) / (4 − 2) = −2

B appartient à (BC) : 3 = −2 × 2 + p', donc p' = 7. Ainsi (BC) : y = −2x + 7 (contrôle avec C : −8 + 7 = −1).
Le produit des coefficients directeurs vaut (1/2) × (−2) = −1 : le repère étant orthonormé, les droites (AB) et (BC) sont perpendiculaires.
(Autre méthode : (AB) a pour vecteur normal (1, −2) et (BC), d'équation 2x + y − 7 = 0, a pour vecteur normal (2, 1) ; 1 × 2 + (−2) × 1 = 0.)

**b)** vec(BA)(−4, −2) et vec(BC)(2, −4), donc

    BA = √(16 + 4) = √20 = 2√5,   BC = √(4 + 16) = √20 = 2√5

Le triangle ABC est rectangle en B (question 3. a)) et BA = BC : il est rectangle et isocèle en B.

**c)** ABCD est un parallélogramme ⟺ vec(AD) = vec(BC). Avec D(x, y) : x + 2 = 2 et y − 1 = −4, donc D(0, −3).
Le parallélogramme ABCD a un angle droit en B et deux côtés consécutifs de même longueur (BA = BC) : c'est un carré.
D appartient à Δ : 0 − 2 × (−3) − 6 = 0. C'est normal : dans le carré, (DC) est parallèle à (AB) et passe par C, c'est donc la droite Δ.

**4. a)** Avec (AB) : x − 2y + 4 = 0, a = 1, b = −2, c = 4 :

    d(C, (AB)) = |4 − 2 × (−1) + 4| / √(1 + 4) = 10/√5 = 2√5

On trouve d(C, (AB)) = BC. C'est normal : (BC) est perpendiculaire à (AB) en B, donc B est le projeté orthogonal de C sur (AB), et la distance de C à (AB) est CB.

**b)** Aire du carré : BA² = (2√5)² = 20.

**5. a)** Ω((−2 + 4)/2, (1 − 1)/2), soit Ω(1, 0).
vec(AC)(6, −2) est un vecteur normal à Δ', donc Δ' a une équation de la forme 6x − 2y + c = 0. Ω ∈ Δ' : 6 − 0 + c = 0, donc c = −6.
Δ' : 6x − 2y − 6 = 0, soit 3x − y − 3 = 0.

**b)** Δ' : 3x − y − 3 = 0 et (AB) : x − 2y + 4 = 0. On calcule ab' − a'b = 3 × (−2) − 1 × (−1) = −5 ≠ 0 : les droites ne sont pas parallèles, elles sont sécantes.
De la première équation, y = 3x − 3. En remplaçant : x − 2(3x − 3) + 4 = 0, soit −5x + 10 = 0, donc x = 2 et y = 3.
Le point d'intersection est (2, 3), c'est-à-dire le point B.

**c)** Pour D(0, −3) : 3 × 0 − (−3) − 3 = 0, donc D ∈ Δ'.
Δ' passe par le milieu Ω de [AC] et elle est perpendiculaire à (AC) (son vecteur normal est vec(AC)) : c'est la médiatrice du segment [AC].
Comme B et D appartiennent à Δ', Δ' est la droite (BD) : c'est l'autre diagonale du carré. On retrouve que les diagonales d'un carré sont perpendiculaires et se coupent en leur milieu Ω.

---

## Exercice 2 — Une antenne, trois villages et deux routes

Une région est représentée dans un repère orthonormé (O, i, j) ; l'unité est le kilomètre. Trois villages sont situés aux points

    A(−1, 5),   B(6, 4),   C(5, −3)

On veut installer une antenne en un point Ω situé à la même distance des trois villages.

1. On cherche des réels a, b et c tels que A, B et C appartiennent à l'ensemble Γ des points M(x, y) vérifiant x² + y² + ax + by + c = 0.
   a) Écrire le système vérifié par a, b et c, puis le résoudre.
   b) Montrer que Γ est un cercle dont on précisera le centre Ω et le rayon R. Vérifier que ΩA = ΩB = ΩC.
2. L'antenne, placée en Ω, couvre le disque de centre Ω et de rayon 5, c'est-à-dire l'ensemble des points M tels que ΩM ≤ 5. Les villages E(−3, −1) et F(1, −3) sont-ils couverts ?
3. Une route rectiligne est représentée par la droite D d'équation x + 2y − 14 = 0.
   a) Calculer la distance d(Ω, D). La route traverse-t-elle la zone couverte ?
   b) Déterminer les coordonnées des points d'intersection de D et de Γ. Quelle est la longueur du tronçon de route situé dans la zone couverte ? Donner la valeur exacte, puis une valeur approchée à 0.01 près.
   c) Déterminer les coordonnées du point H de la route le plus proche de l'antenne, c'est-à-dire le projeté orthogonal de Ω sur D. Vérifier que H est le milieu du tronçon couvert.
4. Une deuxième route, représentée par une droite T, passe par le village A et ne touche le cercle Γ qu'au point A : T est la tangente à Γ en A. Déterminer une équation cartésienne de T, puis vérifier que d(Ω, T) = R.
5. Pour économiser l'énergie, on veut réduire la zone couverte. Pour tout réel k, on note Γ_k l'ensemble des points M(x, y) du plan tels que

       x² + y² − 4x − 2y + k = 0

   a) Déterminer l'ensemble Γ_k selon les valeurs de k.
   b) Déterminer k pour que Γ_k soit le cercle de centre Ω tangent à la route D. Avec cette nouvelle portée, le village F est-il encore couvert ?

### Corrigé

**1. a)** On écrit que les coordonnées de chaque village vérifient l'équation :

    A(−1, 5) :  1 + 25 − a + 5b + c = 0    soit   −a + 5b + c = −26
    B(6, 4)  :  36 + 16 + 6a + 4b + c = 0  soit   6a + 4b + c = −52
    C(5, −3) :  25 + 9 + 5a − 3b + c = 0   soit   5a − 3b + c = −34

On élimine c en soustrayant : (2e) − (1re) donne 7a − b = −26 ; (2e) − (3e) donne a + 7b = −18.
De 7a − b = −26 on tire b = 7a + 26 ; alors a + 7(7a + 26) = −18, soit 50a = −200, donc a = −4 et b = −28 + 26 = −2.
Enfin c = −26 + a − 5b = −26 − 4 + 10 = −20. Le système a une seule solution : a = −4, b = −2, c = −20.

**b)** Γ est l'ensemble des points M(x, y) tels que x² + y² − 4x − 2y − 20 = 0. Avec les formes canoniques x² − 4x = (x − 2)² − 4 et y² − 2y = (y − 1)² − 1 :

    M(x, y) ∈ Γ ⟺ (x − 2)² + (y − 1)² = 25

Le repère est orthonormé : Γ est le cercle de centre Ω(2, 1) et de rayon R = 5.
Contrôle : vec(ΩA)(−3, 4), vec(ΩB)(4, 3), vec(ΩC)(3, −4), donc ΩA² = ΩB² = ΩC² = 9 + 16 = 25 et ΩA = ΩB = ΩC = 5. L'antenne doit être placée en Ω(2, 1).

**2.** On compare ΩM² à R² = 25.

- E(−3, −1) : ΩE² = (−5)² + (−2)² = 29 > 25. E est à l'extérieur de Γ : le village E n'est pas couvert (ΩE = √29 ≈ 5.39 km).
- F(1, −3) : ΩF² = (−1)² + (−4)² = 17 < 25. F est à l'intérieur de Γ : le village F est couvert (ΩF = √17 ≈ 4.12 km).

**3. a)** d(Ω, D) = |2 + 2 × 1 − 14| / √(1² + 2²) = 10/√5 = 2√5 ≈ 4.47.
d(Ω, D) < R = 5, donc la droite D et le cercle Γ sont sécants : la route traverse la zone couverte.

**b)** M(x, y) ∈ D ⟺ x = 14 − 2y. On remplace dans (x − 2)² + (y − 1)² = 25 :

    (12 − 2y)² + (y − 1)² = 25 ⟺ 144 − 48y + 4y² + y² − 2y + 1 − 25 = 0 ⟺ 5y² − 50y + 120 = 0 ⟺ y² − 10y + 24 = 0

Discriminant : 100 − 96 = 4, donc y = (10 − 2)/2 = 4 ou y = (10 + 2)/2 = 6.

- y = 4 donne x = 14 − 8 = 6 : c'est le village B(6, 4).
- y = 6 donne x = 14 − 12 = 2 : c'est le point G(2, 6).

Le tronçon couvert est le segment [BG] : BG = √((2 − 6)² + (6 − 4)²) = √20 = 2√5 ≈ 4.47 km.

**c)** Un vecteur normal à D est n(1, 2) ; c'est un vecteur directeur de la perpendiculaire à D passant par Ω. Pour M(x, y), vec(ΩM)(x − 2, y − 1) :

    M sur cette perpendiculaire ⟺ dét(vec(ΩM), n) = 0 ⟺ 2(x − 2) − (y − 1) = 0 ⟺ 2x − y − 3 = 0

H est l'intersection de cette droite et de D : y = 2x − 3, puis x + 2(2x − 3) − 14 = 0, soit 5x = 20. Donc x = 4, y = 5 : H(4, 5).
Contrôle : ΩH = √(2² + 4²) = √20 = 2√5 = d(Ω, D).
Le milieu de [BG] a pour coordonnées ((6 + 2)/2, (4 + 6)/2) = (4, 5) : c'est H. (Dans le triangle isocèle ΩBG, la hauteur issue de Ω est aussi la médiane.)

**4.** La tangente en A est la droite passant par A et perpendiculaire au rayon (ΩA) : vec(ΩA)(−3, 4) est un vecteur normal à T.
T a une équation de la forme −3x + 4y + c = 0 ; A ∈ T donne 3 + 20 + c = 0, donc c = −23.
T : −3x + 4y − 23 = 0, soit 3x − 4y + 23 = 0.

    d(Ω, T) = |3 × 2 − 4 × 1 + 23| / √(9 + 16) = 25/5 = 5 = R

On retrouve que T est tangente à Γ.

**5. a)** x² + y² − 4x − 2y + k = 0 ⟺ (x − 2)² + (y − 1)² = 5 − k.

- Si k < 5 : 5 − k > 0 et Γ_k est le cercle de centre Ω(2, 1) et de rayon √(5 − k).
- Si k = 5 : (x − 2)² + (y − 1)² = 0 ⟺ x = 2 et y = 1, donc Γ_5 = {Ω}.
- Si k > 5 : une somme de carrés ne peut pas être strictement négative, donc Γ_k = ∅.

**b)** Γ_k est un cercle de centre Ω tangent à D si et seulement si k < 5 et son rayon est égal à d(Ω, D) = 2√5 :

    √(5 − k) = 2√5 ⟺ 5 − k = 20 ⟺ k = −15

La nouvelle zone est le disque de centre Ω et de rayon 2√5 ≈ 4.47 km ; il touche la route au seul point H(4, 5) (contrôle : 16 + 25 − 16 − 10 − 15 = 0).
ΩF² = 17 < 20, donc ΩF < 2√5 : le village F est encore couvert.
