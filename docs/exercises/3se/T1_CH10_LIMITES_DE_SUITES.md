# 3ème Sc. exp. — Tome 1, Chapitre 10 : Limites de suites réelles

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17–19 : définition d'une suite convergente et d'une suite tendant vers l'infini ; théorèmes de comparaison (démontrés à partir de la définition) ; limite d'une suite uₙ = f(n) (f polynôme ou rationnelle) ; limite d'une suite arithmétique ou géométrique ; somme de n termes d'une suite géométrique ; écriture fractionnaire d'un développement décimal illimité périodique ; limite d'une suite récurrente uₙ₊₁ = f(uₙ) (f affine ou homographique) au moyen d'une suite auxiliaire géométrique ; suites homographiques de rationnels qui convergent vers un irrationnel.
- Manuel CNP : définition avec ε et N ; unicité de la limite et opérations sur les limites (admis) ; si f(x) tend vers L quand x tend vers +∞, alors f(n) tend vers L ; (uₙ) converge vers L ⟺ (|uₙ − L|) converge vers 0 ; comparaison : 0 ≤ |uₙ| ≤ vₙ avec vₙ → 0, vₙ ≤ uₙ avec vₙ → +∞, uₙ ≤ vₙ avec vₙ → −∞ ; limite de qⁿ (q > 1 : +∞ ; |q| < 1 : 0 ; q ≤ −1 : pas de limite).
- Toutes les valeurs sont vérifiées par `check_t1_ch10.py` (calcul exact en fractions ; pour l'exercice 2, calcul exact avec des nombres a + b√2, a et b rationnels).
- Outils autorisés : ceux du chapitre et des chapitres 1 à 9 (limites de fonctions, principe de récurrence). Pas de théorème « suite monotone et bornée » (hors programme de 3ème), pas de logarithme ; calculatrice autorisée.

---

## Exercice 1 — Techniques de calcul de limites

1. Déterminer la limite de chacune des suites suivantes.
   a) uₙ = (2n² − 3n + 1) / (n² + 4), n ≥ 0.
   b) vₙ = √(n² + 3n) − n, n ≥ 1. (On pourra multiplier et diviser par l'expression conjuguée.)
2. a) Soit wₙ = (3n + 2 cos n) / (n + 1), n ≥ 0. Montrer que |wₙ − 3| ≤ 5 / (n + 1) pour tout n, puis en déduire la limite de (wₙ).
   b) Soit tₙ = 5 sin n − n², n ≥ 0. Montrer que tₙ ≤ 5 − n² pour tout n, puis en déduire la limite de (tₙ).
3. a) Déterminer la limite de la suite définie par sₙ = (4ⁿ + 3ⁿ) / (2 × 4ⁿ − 1), n ≥ 0.
   b) On considère le nombre a = 2.135135135... (le bloc 135 se répète indéfiniment). Pour tout entier n ≥ 1, on pose

       dₙ = 2 + 135/10³ + 135/10⁶ + ... + 135/10³ⁿ

   (dₙ est le nombre décimal formé de 2 suivi de n blocs 135 après la virgule). Montrer que dₙ = 2 + (5/37)(1 − (1/1000)ⁿ), puis déterminer la limite de (dₙ). En déduire l'écriture fractionnaire de a.
4. Soit (rₙ) la suite définie par rₙ = (−1)ⁿ × n / (n + 1), n ≥ 0.
   a) Montrer que pour tout n ≥ 1 : |rₙ₊₁ − rₙ| = n / (n + 1) + (n + 1) / (n + 2), puis que |rₙ₊₁ − rₙ| ≥ 7/6.
   b) On suppose que (rₙ) converge vers un réel L. En utilisant la définition avec ε = 1/2, obtenir une contradiction.
   c) Montrer que (rₙ) ne tend ni vers +∞, ni vers −∞. Conclure.
5. Soit (xₙ) la suite définie par x₀ = 5 et xₙ₊₁ = −0.5 xₙ + 3 pour tout entier naturel n.
   a) Calculer x₁, x₂ et x₃. La suite (xₙ) est-elle monotone ?
   b) Déterminer le réel α tel que α = −0.5 α + 3. On pose yₙ = xₙ − α. Montrer que (yₙ) est une suite géométrique, puis exprimer yₙ et xₙ en fonction de n.
   c) En déduire la limite de la suite (xₙ).
   d) Déterminer le plus petit entier N tel que, pour tout n ≥ N, |xₙ − 2| < 10⁻³.

### Corrigé

**1. a)** uₙ = h(n) avec h(x) = (2x² − 3x + 1) / (x² + 4). En +∞, une fonction rationnelle a la même limite que le quotient de ses termes de plus haut degré : 2x² / x² = 2. Donc h(x) tend vers 2 quand x tend vers +∞, et lim uₙ = 2.
(Autre rédaction : pour n ≥ 1, uₙ = (2 − 3/n + 1/n²) / (1 + 4/n²), et 1/n, 1/n² tendent vers 0.)

**b)** Pour n ≥ 1 :

    vₙ = (n² + 3n − n²) / (√(n² + 3n) + n) = 3n / (n √(1 + 3/n) + n) = 3 / (√(1 + 3/n) + 1)

Pour x > 0, posons h(x) = 3 / (√(1 + 3/x) + 1). On a vₙ = h(n). Quand x tend vers +∞, 1 + 3/x tend vers 1, donc √(1 + 3/x) tend vers 1 (limites de fonctions, chapitre 4), et lim(x→+∞) h(x) = 3 / (1 + 1) = 3/2. Donc lim vₙ = 3/2.

**2. a)** wₙ − 3 = (3n + 2 cos n − 3n − 3) / (n + 1) = (2 cos n − 3) / (n + 1).
Comme −1 ≤ cos n ≤ 1, on a −5 ≤ 2 cos n − 3 ≤ −1, donc |2 cos n − 3| ≤ 5 et 0 ≤ |wₙ − 3| ≤ 5 / (n + 1).
La suite (5 / (n + 1)) tend vers 0, donc, par comparaison, |wₙ − 3| tend vers 0 : lim wₙ = 3.

**b)** sin n ≤ 1, donc 5 sin n ≤ 5 et tₙ ≤ 5 − n².
lim (5 − n²) = −∞. Par comparaison (tₙ ≤ 5 − n² et 5 − n² tend vers −∞), lim tₙ = −∞.

**3. a)** En divisant le numérateur et le dénominateur par 4ⁿ :

    sₙ = (1 + (3/4)ⁿ) / (2 − (1/4)ⁿ)

Comme 0 < 3/4 < 1 et 0 < 1/4 < 1, (3/4)ⁿ et (1/4)ⁿ tendent vers 0. Donc lim sₙ = 1/2.

**b)** dₙ − 2 est la somme de n termes consécutifs de la suite géométrique de premier terme 135/1000 et de raison 1/1000 :

    dₙ − 2 = (135/1000) × (1 − (1/1000)ⁿ) / (1 − 1/1000) = (135/999)(1 − (1/1000)ⁿ) = (5/37)(1 − (1/1000)ⁿ)

(car 135 = 27 × 5 et 999 = 27 × 37). Comme 0 < 1/1000 < 1, (1/1000)ⁿ tend vers 0, donc lim dₙ = 2 + 5/37 = 79/37.
dₙ est la valeur approchée par défaut de a à 10⁻³ⁿ près : 0 ≤ a − dₙ ≤ 10⁻³ⁿ. Par comparaison, (dₙ) converge vers a. Par unicité de la limite, a = 79/37.
(Vérification : 79 = 2 × 37 + 5 et la division de 5 par 37 donne 0.135135...)

**4. a)** Pour n ≥ 1, rₙ et rₙ₊₁ sont non nuls et de signes contraires (à cause de (−1)ⁿ). Donc

    |rₙ₊₁ − rₙ| = |rₙ₊₁| + |rₙ| = (n + 1)/(n + 2) + n/(n + 1)

Pour n ≥ 1 : n/(n + 1) ≥ 1/2 (car 2n ≥ n + 1) et (n + 1)/(n + 2) ≥ 2/3 (car 3n + 3 ≥ 2n + 4). Donc |rₙ₊₁ − rₙ| ≥ 1/2 + 2/3 = 7/6.

**b)** Si (rₙ) converge vers L, il existe un entier N tel que, pour tout n ≥ N, |rₙ − L| < 1/2. Pour n ≥ N et n ≥ 1 :

    |rₙ₊₁ − rₙ| ≤ |rₙ₊₁ − L| + |L − rₙ| < 1/2 + 1/2 = 1

Ceci contredit |rₙ₊₁ − rₙ| ≥ 7/6. Donc (rₙ) ne converge pas.

**c)** Pour tout n, |rₙ| = n/(n + 1) < 1, soit −1 < rₙ < 1.
Si (rₙ) tendait vers +∞, il existerait (avec A = 1) un entier N tel que rₙ > 1 pour n ≥ N : impossible. De même, avec A = −1, (rₙ) ne tend pas vers −∞.
Conclusion : la suite (rₙ) n'a pas de limite. (Ses termes de rang pair s'approchent de 1, ceux de rang impair de −1.)

**5. a)** x₁ = −2.5 + 3 = 0.5, x₂ = −0.25 + 3 = 2.75, x₃ = −1.375 + 3 = 1.625.
x₁ < x₀ mais x₂ > x₁ : la suite n'est ni croissante, ni décroissante. Elle n'est pas monotone.

**b)** α = −0.5 α + 3 ⟺ 1.5 α = 3 ⟺ α = 2.
yₙ₊₁ = xₙ₊₁ − 2 = −0.5 xₙ + 1 = −0.5 (xₙ − 2) = −0.5 yₙ.
(yₙ) est une suite géométrique de raison −0.5 et de premier terme y₀ = 5 − 2 = 3. Donc yₙ = 3 × (−0.5)ⁿ et xₙ = 2 + 3 × (−0.5)ⁿ.

**c)** |−0.5| < 1, donc (−0.5)ⁿ tend vers 0 et lim xₙ = 2.

**d)** |xₙ − 2| = 3 × 0.5ⁿ = 3 / 2ⁿ. Donc |xₙ − 2| < 10⁻³ ⟺ 2ⁿ > 3000.
Or 2¹¹ = 2048 < 3000 < 4096 = 2¹², et la suite (2ⁿ) est croissante. Donc 2ⁿ > 3000 ⟺ n ≥ 12.
Le plus petit entier qui convient est N = 12 : pour tout n ≥ 12, |xₙ − 2| < 10⁻³ (c'est la définition de la convergence vers 2, avec ε = 10⁻³).

---

## Exercice 2 — Des fractions qui s'approchent de √2

Soit f la fonction définie sur [0, +∞[ par f(x) = (x + 2) / (x + 1), et (uₙ) la suite définie par

    u₀ = 1    et    uₙ₊₁ = (uₙ + 2) / (uₙ + 1)  pour tout entier naturel n

1. a) Calculer u₁, u₂, u₃ et u₄ sous forme de fractions irréductibles.
   b) Montrer que f(x) = 1 + 1 / (x + 1) pour tout x ≥ 0. En déduire que f est strictement décroissante sur [0, +∞[.
   c) Montrer par récurrence que, pour tout entier naturel n, uₙ est un nombre rationnel et 1 ≤ uₙ ≤ 3/2.
2. Montrer que l'équation f(x) = x admet dans [0, +∞[ une unique solution, que l'on déterminera.
3. Pour tout entier naturel n, on pose vₙ = (uₙ − √2) / (uₙ + √2).
   a) Montrer que vₙ₊₁ = q vₙ, où q = (1 − √2) / (1 + √2).
   b) Montrer que q = 2√2 − 3, puis que −1 < q < 0.
   c) Exprimer vₙ en fonction de n et en déduire la limite de la suite (vₙ).
4. a) Montrer que pour tout entier naturel n : uₙ = √2 (1 + vₙ) / (1 − vₙ).
   b) En déduire la limite de la suite (uₙ). Que remarque-t-on sur la nature des termes uₙ et sur celle de leur limite ?
5. a) Montrer que uₙ < √2 lorsque n est pair et uₙ > √2 lorsque n est impair.
   b) Calculer u₅, u₆, u₇ et u₈. En déduire un encadrement de √2 par deux fractions dont la différence est inférieure à 10⁻⁵.
   c) Montrer que |uₙ − √2| ≤ 3 |q|ⁿ⁺¹ pour tout entier naturel n. En utilisant |q| < 0.172, montrer que |uₙ − √2| < 10⁻⁶ pour tout n ≥ 8.

### Corrigé

**1. a)** u₁ = (1 + 2) / (1 + 1) = 3/2.
u₂ = (3/2 + 2) / (3/2 + 1) = (7/2) / (5/2) = 7/5.
u₃ = (7/5 + 2) / (7/5 + 1) = (17/5) / (12/5) = 17/12.
u₄ = (17/12 + 2) / (17/12 + 1) = (41/12) / (29/12) = 41/29.

**b)** 1 + 1 / (x + 1) = (x + 1 + 1) / (x + 1) = (x + 2) / (x + 1) = f(x).
Si 0 ≤ a < b, alors 0 < a + 1 < b + 1, donc 1 / (a + 1) > 1 / (b + 1) et f(a) > f(b) : f est strictement décroissante sur [0, +∞[.

**c)** Notons Pₙ la propriété « uₙ est rationnel et 1 ≤ uₙ ≤ 3/2 ».

- P₀ est vraie : u₀ = 1.
- Supposons Pₙ vraie. Alors uₙ + 1 ≥ 2, donc uₙ₊₁ existe ; c'est le quotient de deux rationnels, le dénominateur étant non nul : uₙ₊₁ est rationnel. Comme f est décroissante sur [0, +∞[ et 1 ≤ uₙ ≤ 3/2 : f(3/2) ≤ f(uₙ) ≤ f(1), soit 7/5 ≤ uₙ₊₁ ≤ 3/2. Donc Pₙ₊₁ est vraie.

D'après le principe de récurrence, Pₙ est vraie pour tout entier naturel n.

**2.** Pour x ≥ 0 : f(x) = x ⟺ x + 2 = x(x + 1) ⟺ x² = 2 ⟺ x = √2 (car x ≥ 0).
L'unique solution est √2. On remarque que 1 < √2 < 3/2 (car 1 < 2 < 9/4).

**3. a)** uₙ + √2 > 0, donc vₙ est bien défini. En développant, on vérifie que :

    uₙ₊₁ − √2 = (uₙ + 2 − √2 uₙ − √2) / (uₙ + 1) = (1 − √2)(uₙ − √2) / (uₙ + 1)
    uₙ₊₁ + √2 = (uₙ + 2 + √2 uₙ + √2) / (uₙ + 1) = (1 + √2)(uₙ + √2) / (uₙ + 1)

En faisant le quotient : vₙ₊₁ = [(1 − √2) / (1 + √2)] × (uₙ − √2) / (uₙ + √2) = q vₙ.

**b)** q = (1 − √2)² / ((1 + √2)(1 − √2)) = (1 − 2√2 + 2) / (1 − 2) = 2√2 − 3.

- q < 0 ⟺ 2√2 < 3 ⟺ 8 < 9 (on compare les carrés de deux nombres positifs) : vrai.
- q > −1 ⟺ 2√2 > 2 ⟺ √2 > 1 : vrai.

Donc −1 < q < 0 (q ≈ −0.1716).

**c)** (vₙ) est une suite géométrique de raison q et de premier terme v₀ = (1 − √2) / (1 + √2) = q. Donc vₙ = q × qⁿ = qⁿ⁺¹.
Comme |q| < 1, qⁿ tend vers 0, donc lim vₙ = lim (q × qⁿ) = 0.

**4. a)** De vₙ(uₙ + √2) = uₙ − √2, on tire uₙ(1 − vₙ) = √2 (1 + vₙ). Or |vₙ| = |q|ⁿ⁺¹ < 1, donc 1 − vₙ ≠ 0 et uₙ = √2 (1 + vₙ) / (1 − vₙ).

**b)** 1 + vₙ tend vers 1 et 1 − vₙ tend vers 1 ≠ 0. Par opérations sur les limites, lim uₙ = √2 × 1 / 1 = √2.
Tous les termes uₙ sont des nombres rationnels (1. c)), alors que leur limite √2 est irrationnelle : une suite de rationnels peut converger vers un irrationnel. Chaque fraction uₙ est une valeur approchée de √2.

**5. a)** uₙ − √2 = vₙ(uₙ + √2) avec uₙ + √2 > 0 : uₙ − √2 a le signe de vₙ = qⁿ⁺¹.
Comme q < 0, qⁿ⁺¹ < 0 lorsque n + 1 est impair (n pair) et qⁿ⁺¹ > 0 lorsque n + 1 est pair (n impair). D'où le résultat.

**b)** u₅ = 99/70, u₆ = 239/169, u₇ = 577/408, u₈ = 1393/985.
D'après le a), u₈ < √2 < u₇, soit

    1393/985 < √2 < 577/408

Différence : 577/408 − 1393/985 = (577 × 985 − 1393 × 408) / (408 × 985) = (568345 − 568344) / 401880 = 1/401880 ≈ 2.49 × 10⁻⁶ < 10⁻⁵.
(Valeurs décimales : 1393/985 ≈ 1.4142132, √2 ≈ 1.4142136, 577/408 ≈ 1.4142157.)

**c)** |uₙ − √2| = |vₙ| (uₙ + √2) ≤ |q|ⁿ⁺¹ (3/2 + √2) ≤ 3 |q|ⁿ⁺¹, car uₙ ≤ 3/2 et √2 < 3/2.
On a |q| = 3 − 2√2 < 0.172, car 1.414² = 1.999396 < 2 donne √2 > 1.414 et 2√2 > 2.828.
Pour n ≥ 8 : |q|ⁿ⁺¹ ≤ |q|⁹ (car 0 < |q| < 1), donc

    |uₙ − √2| ≤ 3 |q|⁹ < 3 × 0.172⁹ ≈ 3.95 × 10⁻⁷ < 10⁻⁶

Ainsi, pour tout n ≥ 8, |uₙ − √2| < 10⁻⁶ : la fraction u₈ = 1393/985 est une valeur approchée de √2 à 10⁻⁶ près. C'est la définition de la convergence vers √2, avec ε = 10⁻⁶ et N = 8.
