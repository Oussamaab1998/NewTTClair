# 3ème Sc. exp. — Tome 1, Chapitre 7 : Exemples d'étude de fonctions

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17-18 : étude et représentation graphique de fonctions polynômes (degrés 1, 2, 3, bicarrées) et des fonctions du type x ↦ (ax + b)/(cx + d), x ↦ (ax² + bx + c)/(dx + e), x ↦ (ax² + bx + c)/(dx² + ex + f), x ↦ √(ax + b) et x ↦ √(ax² + bx + c) ; centre et axe de symétrie d'une courbe ; asymptotes (pour une asymptote oblique y = ax + b, on montre que f(x) − (ax + b) tend vers 0).
- Manuel CNP : la droite x = a est un axe de symétrie de 𝒞 ⟺ pour tout x de D, 2a − x ∈ D et f(2a − x) = f(x) ; le point (a, b) est un centre de symétrie de 𝒞 ⟺ pour tout x de D, 2a − x ∈ D et f(2a − x) = 2b − f(x) ; plan d'étude (ensemble de définition, continuité et dérivabilité, dérivée et son signe, tableau de variation avec les limites, asymptotes, courbe) ; demi-tangentes verticales ; forme canonique du trinôme pour les asymptotes obliques de x ↦ √(ax² + bx + c).
- Sens de variation (chapitre 6, manuel p. 106) : on utilise la conséquence du théorème admis : si f' ≥ 0 sur I et ne s'annule qu'en des points isolés, f est strictement croissante sur I (sinon f serait constante sur un intervalle [x₁, x₂] avec x₁ < x₂, et f' y serait nulle) ; de même pour f' ≤ 0 et « strictement décroissante ».
- Outils autorisés : chapitres 1 à 7 du tome 1 et les acquis des années antérieures (théorème de Pythagore, tangente à un cercle perpendiculaire au rayon). Pas de fonctions trigonométriques (chapitre 8).
- Toutes les valeurs sont vérifiées par `check_t1_ch07.py` (calcul exact en fractions ; limites, demi-tangentes et dérivées des racines carrées contrôlées numériquement).

---

## Exercice 1 — Étude d'une fonction x ↦ (ax² + bx + c)/(dx + e)

Soit f la fonction définie par

    f(x) = (x² + 2x + 5) / (x + 1)

On note 𝒞 sa courbe représentative dans un repère orthonormé (O, i, j).

1. a) Déterminer l'ensemble de définition D_f de f.
   b) Déterminer les réels a, b et c tels que, pour tout x de D_f :

       f(x) = ax + b + c / (x + 1)

2. a) Calculer les limites de f en −∞, en +∞, à gauche en −1 et à droite en −1.
   b) Montrer que 𝒞 admet une asymptote verticale, et une asymptote oblique D au voisinage de +∞ et de −∞. Donner leurs équations.
   c) Étudier la position relative de 𝒞 et de D.
3. a) Montrer que pour tout x de D_f : f'(x) = (x − 1)(x + 3) / (x + 1)².
   b) Dresser le tableau de variation de f et préciser ses extrema locaux.
4. Montrer que le point I(−1, 0) est un centre de symétrie de 𝒞.
5. a) Déterminer les points de 𝒞 en lesquels la tangente est parallèle à la droite Δ d'équation y = −3x.
   b) Donner une équation de chacune de ces tangentes, puis vérifier qu'elles sont symétriques l'une de l'autre par rapport à I.
6. Tracer les asymptotes, les tangentes du 5. et la courbe 𝒞.
7. a) Discuter graphiquement, suivant les valeurs du réel m, le nombre de solutions de l'équation f(x) = m.
   b) Retrouver ce résultat par le calcul, en montrant que pour x ≠ −1 : f(x) = m ⟺ x² + (2 − m)x + 5 − m = 0.

### Corrigé

**1. a)** f(x) existe ⟺ x + 1 ≠ 0 ⟺ x ≠ −1. Donc D_f = ℝ \ {−1} = ]−∞, −1[ ∪ ]−1, +∞[.

**b)** Pour x ≠ −1 :

    ax + b + c/(x + 1) = [(ax + b)(x + 1) + c] / (x + 1) = [ax² + (a + b)x + b + c] / (x + 1)

Par identification avec x² + 2x + 5 : a = 1, a + b = 2 et b + c = 5, d'où a = 1, b = 1, c = 4.

    f(x) = x + 1 + 4 / (x + 1)

**2. a)** En l'infini, f a la même limite que le quotient de ses termes de plus haut degré, x²/x = x :
la limite de f en −∞ est −∞, la limite de f en +∞ est +∞.
En −1 : x + 1 tend vers 0, et 4/(x + 1) tend vers +∞ quand x tend vers −1 à droite (x + 1 > 0), vers −∞ quand x tend vers −1 à gauche (x + 1 < 0). Donc :
la limite de f à droite en −1 est +∞, la limite de f à gauche en −1 est −∞.

**b)** Les limites en −1 étant infinies, la droite d'équation x = −1 est une asymptote verticale à 𝒞.
Pour x ≠ −1 : f(x) − (x + 1) = 4/(x + 1), qui tend vers 0 quand x tend vers +∞ ou vers −∞. Donc la droite D : y = x + 1 est une asymptote oblique à 𝒞 au voisinage de +∞ et de −∞.

**c)** f(x) − (x + 1) = 4/(x + 1) a le signe de x + 1 :

- sur ]−1, +∞[, f(x) − (x + 1) > 0 : 𝒞 est au-dessus de D ;
- sur ]−∞, −1[, f(x) − (x + 1) < 0 : 𝒞 est au-dessous de D.

𝒞 et D n'ont aucun point commun.

**3. a)** f est une fonction rationnelle, dérivable sur chacun des intervalles ]−∞, −1[ et ]−1, +∞[. À partir de f(x) = x + 1 + 4/(x + 1) :

    f'(x) = 1 − 4/(x + 1)² = [(x + 1)² − 4] / (x + 1)² = (x + 1 − 2)(x + 1 + 2) / (x + 1)² = (x − 1)(x + 3) / (x + 1)²

**b)** (x + 1)² > 0 sur D_f, donc f'(x) a le signe du trinôme (x − 1)(x + 3), de racines −3 et 1 :
f'(x) > 0 sur ]−∞, −3[ et sur ]1, +∞[ ; f'(x) < 0 sur ]−3, −1[ et sur ]−1, 1[.
f(−3) = −3 + 1 + 4/(−2) = −4 et f(1) = 1 + 1 + 4/2 = 4.

    x      | −∞          −3          −1           1          +∞
    f'(x)  |       +     0     −     ||     −     0     +
    f(x)   | −∞    ↗    −4     ↘  −∞ || +∞  ↘     4     ↗    +∞

f' s'annule en changeant de signe en −3 et en 1 : f admet un maximum local −4 en −3 et un minimum local 4 en 1. (Le maximum local est plus petit que le minimum local : ils sont sur deux branches différentes.)

**4.** Soit x ∈ D_f. Alors 2(−1) − x = −2 − x est différent de −1 (sinon x = −1), donc −2 − x ∈ D_f, et

    f(−2 − x) = (−2 − x) + 1 + 4/(−2 − x + 1) = −(x + 1) − 4/(x + 1) = −f(x) = 2 × 0 − f(x)

Donc I(−1, 0) est un centre de symétrie de 𝒞. (I est le point d'intersection des deux asymptotes.)

**5. a)** La tangente au point d'abscisse x₀ est parallèle à Δ ⟺ f'(x₀) = −3 :

    1 − 4/(x₀ + 1)² = −3 ⟺ (x₀ + 1)² = 1 ⟺ x₀ + 1 = 1 ou x₀ + 1 = −1 ⟺ x₀ = 0 ou x₀ = −2

f(0) = 5 et f(−2) = −2 + 1 + 4/(−1) = −5 : ce sont les points A(0, 5) et B(−2, −5).

**b)** Tangente en A : y = −3(x − 0) + 5, soit T_A : y = −3x + 5.
Tangente en B : y = −3(x + 2) − 5, soit T_B : y = −3x − 11.
Le milieu de [AB] est ((0 − 2)/2, (5 − 5)/2) = (−1, 0) = I, donc B est le symétrique de A par rapport à I. Le symétrique par rapport à I du point (x, −3x + 5) de T_A est (−2 − x, 3x − 5), et −3(−2 − x) − 11 = 3x − 5 : ce point est sur T_B. Les deux tangentes sont symétriques par rapport à I.

**6.** On trace les asymptotes x = −1 et D : y = x + 1 (elles se coupent en I), puis T_A et T_B. Quelques points :

    x      | −5    −3    −2    −3/2   −1/2    0     1     3
    f(x)   | −5    −4    −5   −17/2   17/2   5     4     5

La branche de droite (x > −1) est au-dessus de D : elle descend de +∞ (le long de la droite x = −1) jusqu'au point (1, 4) où la tangente est horizontale, puis remonte en se rapprochant de D. La branche de gauche est la symétrique de celle de droite par rapport à I : elle monte jusqu'au point (−3, −4) (tangente horizontale), puis redescend vers −∞ le long de x = −1. 𝒞 ne coupe pas l'axe des abscisses (x² + 2x + 5 a un discriminant 4 − 20 < 0) et coupe l'axe des ordonnées en A(0, 5).

**7. a)** Le nombre de solutions est le nombre de points communs à 𝒞 et à la droite y = m. D'après le tableau :

- m < −4 : deux solutions (l'une dans ]−∞, −3[, l'autre dans ]−3, −1[) ;
- m = −4 : une solution, x = −3 ;
- −4 < m < 4 : aucune solution ;
- m = 4 : une solution, x = 1 ;
- m > 4 : deux solutions (l'une dans ]−1, 1[, l'autre dans ]1, +∞[).

**b)** Pour x ≠ −1 : f(x) = m ⟺ x² + 2x + 5 = m(x + 1) ⟺ x² + (2 − m)x + 5 − m = 0 (E).
−1 n'est jamais solution de (E) : 1 − (2 − m) + 5 − m = 4 ≠ 0. Donc le nombre de solutions de f(x) = m est le nombre de racines de (E). Son discriminant est

    (2 − m)² − 4(5 − m) = m² − 4m + 4 − 20 + 4m = m² − 16 = (m − 4)(m + 4)

Il est strictement positif si m < −4 ou m > 4 (deux solutions), nul si m = −4 ou m = 4 (une racine double x = (m − 2)/2, soit −3 ou 1), strictement négatif si −4 < m < 4 (aucune solution). On retrouve le résultat du a).

---

## Exercice 2 — Longueur d'une tangente à un cercle : étude de x ↦ √(x² + 2x − 8)

Le plan est muni d'un repère orthonormé (O, i, j). On considère le cercle Γ de centre Ω(−1, 0) et de rayon 3, et pour tout réel x le point M(x, 0) de l'axe des abscisses.
Lorsque M est extérieur à Γ, on note T un point de Γ tel que la droite (MT) soit tangente à Γ en T. Lorsque M est sur Γ, on pose T = M. On s'intéresse à la longueur MT.

1. a) Montrer que M est sur Γ ou extérieur à Γ si et seulement si x ∈ ]−∞, −4] ∪ [2, +∞[.
   b) Montrer que, dans ce cas, MT = √(x² + 2x − 8).

On note f la fonction définie par f(x) = √(x² + 2x − 8) et 𝒞 sa courbe représentative.

2. a) Déterminer l'ensemble de définition D_f de f.
   b) Montrer que la droite Δ d'équation x = −1 est un axe de symétrie de 𝒞. Donner une interprétation géométrique de ce résultat.
3. a) Étudier la dérivabilité de f à droite en 2. Interpréter graphiquement le résultat.
   b) En déduire le comportement de 𝒞 au point d'abscisse −4.
4. a) Calculer f'(x) pour x ∈ ]2, +∞[ et pour x ∈ ]−∞, −4[.
   b) Calculer les limites de f en +∞ et en −∞, puis dresser le tableau de variation de f.
5. a) Vérifier que pour tout réel x : x² + 2x − 8 = (x + 1)² − 9.
   b) Montrer que pour tout x ≥ 2 : f(x) − (x + 1) = −9 / (f(x) + x + 1).
   c) En déduire que la droite D d'équation y = x + 1 est une asymptote à 𝒞 au voisinage de +∞, et préciser la position de 𝒞 par rapport à D sur [2, +∞[.
   d) En déduire une asymptote D' à 𝒞 au voisinage de −∞. Que peut-on dire de MT et de ΩM quand M est très loin de Ω ?
6. Tracer Γ, D, D' et 𝒞 dans le même repère.
7. Déterminer les points M de l'axe des abscisses tels que MT = 4. Calculer alors ΩM.

### Corrigé

**1. a)** Ω et M sont sur l'axe des abscisses, donc ΩM = |x − (−1)| = |x + 1|.
M est sur Γ ou extérieur à Γ ⟺ ΩM ≥ 3 ⟺ |x + 1| ≥ 3 ⟺ x + 1 ≥ 3 ou x + 1 ≤ −3 ⟺ x ≥ 2 ou x ≤ −4.

**b)** Si M est extérieur à Γ : la tangente (MT) est perpendiculaire au rayon [ΩT], donc le triangle ΩTM est rectangle en T. D'après le théorème de Pythagore, ΩM² = ΩT² + MT², donc

    MT² = (x + 1)² − 9 = x² + 2x − 8    et    MT = √(x² + 2x − 8)

Si M est sur Γ : MT = 0 et (x + 1)² = 9, donc la formule reste vraie.

**2. a)** f(x) existe ⟺ x² + 2x − 8 ≥ 0. Or x² + 2x − 8 = (x − 2)(x + 4) : trinôme de racines −4 et 2, de coefficient dominant 1 > 0, positif à l'extérieur des racines.
D_f = ]−∞, −4] ∪ [2, +∞[ (on retrouve le 1. a)).

**b)** Soit x ∈ D_f. On a 2(−1) − x = −2 − x et

    (−2 − x)² + 2(−2 − x) − 8 = x² + 4x + 4 − 4 − 2x − 8 = x² + 2x − 8 ≥ 0

donc −2 − x ∈ D_f et f(−2 − x) = f(x) : Δ est un axe de symétrie de 𝒞.
Interprétation : les points M(x, 0) et M'(−2 − x, 0) sont symétriques par rapport à Ω ; ils sont à la même distance de Ω, donc les tangentes menées de M et de M' à Γ ont la même longueur.

**3. a)** Pour x > 2 :

    (f(x) − f(2)) / (x − 2) = √((x − 2)(x + 4)) / (x − 2) = √(x − 2) √(x + 4) / (√(x − 2))² = √(x + 4) / √(x − 2)

Quand x tend vers 2 à droite, √(x + 4) tend vers √6 et √(x − 2) tend vers 0 en restant positif : le rapport tend vers +∞.
f n'est pas dérivable à droite en 2. La courbe 𝒞 admet au point A(2, 0) une demi-tangente verticale (dirigée vers le haut, puisque f ≥ 0).

**b)** Le symétrique de A(2, 0) par rapport à Δ est B(−4, 0). Par symétrie, f n'est pas dérivable à gauche en −4 et 𝒞 admet au point B une demi-tangente verticale dirigée vers le haut.
(Directement : pour x < −4, (f(x) − f(−4)) / (x + 4) = −√(2 − x) / √(−4 − x), qui tend vers −∞ quand x tend vers −4 à gauche.)

**4. a)** Sur ]2, +∞[ et sur ]−∞, −4[, u(x) = x² + 2x − 8 est dérivable et strictement positive, donc f = √u est dérivable et

    f'(x) = (2x + 2) / (2√(x² + 2x − 8)) = (x + 1) / √(x² + 2x − 8)

Sur ]2, +∞[, x + 1 > 3 > 0, donc f'(x) > 0. Sur ]−∞, −4[, x + 1 < −3 < 0, donc f'(x) < 0.

**b)** x² + 2x − 8 tend vers +∞ quand x tend vers +∞ ou vers −∞, donc f(x) tend vers +∞ en +∞ et en −∞.

    x      | −∞           −4   |   2            +∞
    f'(x)  |        −          |          +
    f(x)   | +∞     ↘      0   |   0     ↗      +∞

f n'est pas définie sur ]−4, 2[, et f' n'existe pas en −4 ni en 2. Le minimum de f est 0, atteint en −4 et en 2 (M est alors sur Γ).

**5. a)** (x + 1)² − 9 = x² + 2x + 1 − 9 = x² + 2x − 8.

**b)** Pour x ≥ 2 : x + 1 ≥ 3 et f(x) ≥ 0, donc f(x) + x + 1 > 0. En multipliant par l'expression conjuguée :

    f(x) − (x + 1) = [f(x)² − (x + 1)²] / (f(x) + x + 1) = [(x + 1)² − 9 − (x + 1)²] / (f(x) + x + 1) = −9 / (f(x) + x + 1)

**c)** f(x) + x + 1 tend vers +∞ quand x tend vers +∞, donc f(x) − (x + 1) tend vers 0 : D : y = x + 1 est une asymptote oblique à 𝒞 au voisinage de +∞.
Comme −9 / (f(x) + x + 1) < 0, on a f(x) < x + 1 sur [2, +∞[ : 𝒞 est au-dessous de D.

**d)** Le symétrique par rapport à Δ du point (x, x + 1) de D est (−2 − x, x + 1). En posant X = −2 − x, son ordonnée est x + 1 = −X − 1. Donc l'image de D est la droite D' : y = −x − 1, et par symétrie D' est une asymptote à 𝒞 au voisinage de −∞ (𝒞 est au-dessous de D' sur ]−∞, −4]).
(Directement : pour x ≤ −4, f(x) − (−x − 1) = −9 / (f(x) − x − 1), qui tend vers 0 en −∞.)
D et D' passent par Ω(−1, 0). Comme ΩM = |x + 1|, on a montré que MT − ΩM tend vers 0 : quand M est très loin de Ω, la longueur de la tangente MT est presque égale à la distance ΩM.

**6.** Γ coupe l'axe des abscisses en B(−4, 0) et A(2, 0). D et D' se coupent en Ω, avec les pentes 1 et −1. Quelques points de 𝒞 :

    x      | −7      −6     −5     −4     2     3      4     5
    f(x)   | 3√3     4      √7     0      0     √7     4     3√3

(√7 ≈ 2.65 et 3√3 ≈ 5.20.) La branche de droite part de A avec une demi-tangente verticale, monte en restant au-dessous de D et s'en rapproche ; la branche de gauche est sa symétrique par rapport à Δ, elle part de B et se rapproche de D'.

**7.** MT = 4 ⟺ x ∈ D_f et x² + 2x − 8 = 16 ⟺ x² + 2x − 24 = 0 ⟺ (x − 4)(x + 6) = 0 ⟺ x = 4 ou x = −6.
Ces deux réels sont dans D_f (4 ≥ 2 et −6 ≤ −4). Les points cherchés sont M₁(4, 0) et M₂(−6, 0), symétriques par rapport à Δ.
ΩM₁ = |4 + 1| = 5 et ΩM₂ = |−6 + 1| = 5 : le triangle ΩTM a pour côtés 3, 4 et 5 (et 3² + 4² = 5²).
