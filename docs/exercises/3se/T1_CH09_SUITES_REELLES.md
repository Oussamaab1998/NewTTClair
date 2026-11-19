# 3ème Sc. exp. — Tome 1, Chapitre 9 : Suites réelles

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17–19 : principe de récurrence ; suite croissante, décroissante, majorée, minorée ; suites arithmétiques et géométriques ; suites uₙ = f(n) (f polynôme ou rationnelle) ; suites récurrentes uₙ₊₁ = f(uₙ) avec f affine ou homographique, étudiées au moyen d'une suite auxiliaire géométrique ; représentation des points Aₙ(n, uₙ) et des termes d'une suite récurrente sur un axe.
- Manuel CNP : principe de récurrence (à partir d'un rang n₀) ; si f est croissante (décroissante) sur [0, +∞[, la suite uₙ = f(n) l'est aussi ; construction des termes uₙ₊₁ = f(uₙ) sur l'axe des abscisses avec la droite y = x. Les limites de suites ne sont vues qu'au chapitre 10 : les corrigés n'en utilisent pas.
- Toutes les valeurs sont vérifiées par `check_t1_ch09.py` (calcul exact en fractions).
- Outils autorisés : ceux du chapitre, les chapitres 1 à 8 (fonctions), les suites arithmétiques et géométriques des années précédentes (terme général, somme de termes consécutifs). Pas de limites de suites, pas de logarithme ; calculatrice autorisée.

---

## Exercice 1 — Variations, bornes, suite récurrente homographique

### Partie A

Soit (uₙ) la suite définie pour tout entier naturel n par

    uₙ = (3n + 1) / (n + 2)

1. a) Calculer u₀, u₁, u₂, u₃, u₄ et u₁₀.
   b) Représenter dans un repère orthonormé les points Aₙ(n, uₙ) pour 0 ≤ n ≤ 4. Sur quelle courbe se trouvent ces points ?
2. a) Montrer que pour tout entier naturel n : uₙ = 3 − 5 / (n + 2).
   b) Calculer uₙ₊₁ − uₙ et en déduire le sens de variation de la suite (uₙ).
   c) Montrer que la suite (uₙ) est bornée.
3. Déterminer le plus petit entier naturel n tel que uₙ > 2.99. Justifier que uₙ > 2.99 pour tout entier supérieur ou égal à cet entier.

### Partie B

Soit g la fonction définie sur [0, +∞[ par g(x) = (4x + 2) / (x + 3), et (vₙ) la suite définie par

    v₀ = 0    et    vₙ₊₁ = (4vₙ + 2) / (vₙ + 3)  pour tout entier naturel n

1. a) Calculer v₁, v₂ et v₃.
   b) Montrer que pour tout réel x ≥ 0 : g(x) = 4 − 10 / (x + 3). En déduire que g est strictement croissante sur [0, +∞[.
   c) Dans un repère orthonormé, on trace la courbe 𝒞 de g et la droite Δ d'équation y = x. Expliquer comment placer v₀, v₁, v₂ et v₃ sur l'axe des abscisses. Quelle conjecture peut-on faire ?
2. Montrer par récurrence que pour tout entier naturel n : 0 ≤ vₙ < 2.
3. a) Montrer que pour tout entier naturel n : vₙ₊₁ − vₙ = (2 − vₙ)(vₙ + 1) / (vₙ + 3).
   b) En déduire le sens de variation de la suite (vₙ). La suite (vₙ) est-elle bornée ?
4. Pour tout entier naturel n, on pose wₙ = (vₙ − 2) / (vₙ + 1).
   a) Montrer que (wₙ) est une suite géométrique dont on précisera la raison et le premier terme.
   b) Exprimer wₙ, puis vₙ, en fonction de n.
   c) Vérifier le résultat pour n = 3.

### Corrigé — Partie A

**1. a)** u₀ = 1/2, u₁ = 4/3, u₂ = 7/4, u₃ = 10/5 = 2, u₄ = 13/6, u₁₀ = 31/12.

**b)** Points (valeurs approchées) : A₀(0, 0.5), A₁(1, 1.33), A₂(2, 1.75), A₃(3, 2), A₄(4, 2.17).
On a uₙ = f(n) avec f(x) = (3x + 1) / (x + 2). Les points Aₙ sont sur la courbe de f, qui est une hyperbole (d'après le 2. a), f(x) = 3 − 5 / (x + 2) : centre Ω(−2, 3), asymptotes x = −2 et y = 3).
Sur le dessin, les points montent et restent sous la droite d'équation y = 3 : on conjecture que (uₙ) est croissante et majorée par 3.

**2. a)** 3 − 5 / (n + 2) = (3(n + 2) − 5) / (n + 2) = (3n + 1) / (n + 2) = uₙ.

**b)** uₙ₊₁ − uₙ = [3 − 5 / (n + 3)] − [3 − 5 / (n + 2)] = 5 / (n + 2) − 5 / (n + 3) = 5 / ((n + 2)(n + 3)).
Ce nombre est strictement positif, donc uₙ₊₁ > uₙ pour tout n : la suite (uₙ) est strictement croissante.

**c)** La suite est croissante, donc uₙ ≥ u₀ = 1/2 pour tout n : elle est minorée par 1/2.
Comme 5 / (n + 2) > 0, on a uₙ < 3 pour tout n : elle est majorée par 3.
Ainsi 1/2 ≤ uₙ < 3 pour tout entier naturel n : la suite (uₙ) est bornée.

**3.** Pour tout entier naturel n (avec n + 2 > 0) :

    uₙ > 2.99  ⟺  5 / (n + 2) < 0.01  ⟺  n + 2 > 500  ⟺  n > 498

Le plus petit entier qui convient est n = 499. (On a u₄₉₈ = 3 − 5/500 = 2.99 exactement, qui n'est pas strictement supérieur à 2.99.)
L'équivalence est valable pour tout n, donc uₙ > 2.99 pour tout n ≥ 499 (c'est aussi une conséquence de la croissance de la suite).

### Corrigé — Partie B

**1. a)** v₁ = g(0) = 2/3.
v₂ = g(2/3) = (8/3 + 2) / (2/3 + 3) = (14/3) / (11/3) = 14/11.
v₃ = g(14/11) = (56/11 + 22/11) / (14/11 + 33/11) = 78/47.
(v₁ ≈ 0.67, v₂ ≈ 1.27, v₃ ≈ 1.66.)

**b)** 4 − 10 / (x + 3) = (4x + 12 − 10) / (x + 3) = (4x + 2) / (x + 3) = g(x).
Si 0 ≤ a < b, alors 0 < a + 3 < b + 3, donc 10 / (a + 3) > 10 / (b + 3), puis 4 − 10 / (a + 3) < 4 − 10 / (b + 3), soit g(a) < g(b).
g est strictement croissante sur [0, +∞[.

**c)** On place v₀ = 0 sur l'axe des abscisses. Le point de 𝒞 d'abscisse v₀ a pour ordonnée g(v₀) = v₁ : on lit v₁ sur l'axe des ordonnées.
Pour ramener v₁ sur l'axe des abscisses, on utilise Δ : le point de Δ d'ordonnée v₁ a pour abscisse v₁.
On recommence : trait vertical jusqu'à 𝒞, trait horizontal jusqu'à Δ, trait vertical jusqu'à l'axe des abscisses. On obtient v₂, puis v₃. Le tracé forme un « escalier » entre 𝒞 et Δ.
𝒞 et Δ se coupent au point I(2, 2), car g(2) = 10/5 = 2.
Conjecture : la suite (vₙ) est croissante, ses termes restent inférieurs à 2 et se rapprochent de 2.

**2.** Notons Pₙ la propriété « 0 ≤ vₙ < 2 ».

- P₀ est vraie : v₀ = 0.
- Supposons Pₙ vraie. Alors vₙ ≥ 0, donc vₙ + 3 ≠ 0 et vₙ₊₁ = g(vₙ) existe. Comme g est strictement croissante sur [0, +∞[ et 0 ≤ vₙ < 2 : g(0) ≤ g(vₙ) < g(2), soit 2/3 ≤ vₙ₊₁ < 2. Donc Pₙ₊₁ est vraie.

D'après le principe de récurrence, 0 ≤ vₙ < 2 pour tout entier naturel n.

**3. a)** vₙ₊₁ − vₙ = (4vₙ + 2) / (vₙ + 3) − vₙ = (4vₙ + 2 − vₙ² − 3vₙ) / (vₙ + 3) = (−vₙ² + vₙ + 2) / (vₙ + 3).
Or (2 − vₙ)(vₙ + 1) = 2vₙ + 2 − vₙ² − vₙ = −vₙ² + vₙ + 2. D'où l'égalité.

**b)** D'après le 2., 0 ≤ vₙ < 2, donc 2 − vₙ > 0, vₙ + 1 > 0 et vₙ + 3 > 0. Ainsi vₙ₊₁ − vₙ > 0 : la suite (vₙ) est strictement croissante.
Elle est minorée par v₀ = 0 et majorée par 2 : elle est bornée.

**4. a)** Comme vₙ ≥ 0, vₙ + 1 > 0 et wₙ est bien défini. On calcule :

    vₙ₊₁ − 2 = (4vₙ + 2 − 2vₙ − 6) / (vₙ + 3) = 2(vₙ − 2) / (vₙ + 3)
    vₙ₊₁ + 1 = (4vₙ + 2 + vₙ + 3) / (vₙ + 3) = 5(vₙ + 1) / (vₙ + 3)

Donc wₙ₊₁ = 2(vₙ − 2) / (5(vₙ + 1)) = (2/5) wₙ.
(wₙ) est une suite géométrique de raison 2/5 et de premier terme w₀ = (0 − 2) / (0 + 1) = −2.

**b)** wₙ = −2 × (2/5)ⁿ = −2 × 0.4ⁿ.
De wₙ(vₙ + 1) = vₙ − 2, on tire vₙ(1 − wₙ) = 2 + wₙ. Comme wₙ < 0, 1 − wₙ ≠ 0, donc

    vₙ = (2 + wₙ) / (1 − wₙ) = (2 − 2 × 0.4ⁿ) / (1 + 2 × 0.4ⁿ)

**c)** Pour n = 3 : 0.4³ = 0.064, donc v₃ = (2 − 0.128) / (1 + 0.128) = 1.872 / 1.128 = 78/47. On retrouve la valeur du 1. a).

---

## Exercice 2 — Deux plans d'épargne

Amine et Salma commencent à épargner le même jour.

- Amine place 2000 D sur un compte rémunéré. À la fin de chaque année, la banque ajoute au capital 5 % d'intérêts, puis Amine verse 300 D sur le compte.
- Salma met 3000 D dans une tirelire (sans intérêts) et y ajoute 400 D à la fin de chaque année.

Pour tout entier naturel n, on note Aₙ le capital d'Amine et Sₙ celui de Salma au bout de n années (après le versement de l'année). Ainsi A₀ = 2000 et S₀ = 3000.

1. a) Calculer A₁, A₂, S₁ et S₂.
   b) Quelle est la nature de la suite (Sₙ) ? Exprimer Sₙ en fonction de n.
2. a) Justifier que pour tout entier naturel n : Aₙ₊₁ = 1.05 Aₙ + 300.
   b) On pose Bₙ = Aₙ + 6000. Montrer que (Bₙ) est une suite géométrique dont on précisera la raison et le premier terme.
   c) En déduire que pour tout entier naturel n : Aₙ = 8000 × 1.05ⁿ − 6000.
   d) Montrer que Aₙ₊₁ − Aₙ = 400 × 1.05ⁿ et en déduire le sens de variation de la suite (Aₙ).
3. a) Montrer par récurrence que pour tout entier n ≥ 1 :

       Aₙ = 2000 × 1.05ⁿ + 300 × (1 + 1.05 + 1.05² + ... + 1.05ⁿ⁻¹)

   b) Retrouver alors l'expression de Aₙ obtenue au 2. c).
   c) Calculer le capital d'Amine au bout de 10 ans (au millime près) et le montant total des intérêts gagnés pendant ces 10 ans.
4. Pour tout entier naturel n, on pose dₙ = Aₙ − Sₙ.
   a) Montrer que dₙ₊₁ − dₙ = 400(1.05ⁿ − 1). En déduire que la suite (dₙ) est croissante.
   b) Calculer d₈, d₉ et d₁₀ (au millime près).
   c) À partir de combien d'années le capital d'Amine dépasse-t-il celui de Salma ? Justifier qu'ensuite il reste toujours supérieur.
5. a) Montrer par récurrence que pour tout entier naturel n : 1.05ⁿ ≥ 1 + 0.05n.
   b) En déduire que Aₙ ≥ 2000 + 400n pour tout entier naturel n.
   c) La suite (Aₙ) est-elle majorée ? Justifier.

### Corrigé

**1. a)** A₁ = 2000 × 1.05 + 300 = 2100 + 300 = 2400 D et A₂ = 2400 × 1.05 + 300 = 2520 + 300 = 2820 D.
S₁ = 3000 + 400 = 3400 D et S₂ = 3800 D.

**b)** Pour tout n, Sₙ₊₁ = Sₙ + 400 : (Sₙ) est une suite arithmétique de raison 400 et de premier terme S₀ = 3000. Donc Sₙ = 3000 + 400n.

**2. a)** Pendant l'année n + 1, le capital Aₙ augmente de 5 % : il devient Aₙ + 0.05 Aₙ = 1.05 Aₙ. Amine verse ensuite 300 D, d'où Aₙ₊₁ = 1.05 Aₙ + 300.

**b)** Bₙ₊₁ = Aₙ₊₁ + 6000 = 1.05 Aₙ + 6300 = 1.05 (Aₙ + 6000) = 1.05 Bₙ.
(Bₙ) est une suite géométrique de raison 1.05 et de premier terme B₀ = 2000 + 6000 = 8000.
(Remarque : −6000 est le réel α tel que α = 1.05 α + 300.)

**c)** Bₙ = 8000 × 1.05ⁿ, donc Aₙ = Bₙ − 6000 = 8000 × 1.05ⁿ − 6000.

**d)** Aₙ₊₁ − Aₙ = 8000 × 1.05ⁿ⁺¹ − 8000 × 1.05ⁿ = 8000 × 1.05ⁿ × (1.05 − 1) = 400 × 1.05ⁿ.
Ce nombre est strictement positif : la suite (Aₙ) est strictement croissante.

**3. a)** Pour n = 1 : 2000 × 1.05 + 300 × 1 = 2400 = A₁. La formule est vraie.
Supposons-la vraie pour un entier n ≥ 1. Alors

    Aₙ₊₁ = 1.05 Aₙ + 300
         = 2000 × 1.05ⁿ⁺¹ + 300 × (1.05 + 1.05² + ... + 1.05ⁿ) + 300
         = 2000 × 1.05ⁿ⁺¹ + 300 × (1 + 1.05 + ... + 1.05ⁿ)

La formule est vraie au rang n + 1. D'après le principe de récurrence, elle est vraie pour tout n ≥ 1.

**b)** 1 + 1.05 + ... + 1.05ⁿ⁻¹ est la somme de n termes consécutifs d'une suite géométrique de premier terme 1 et de raison 1.05 :

    1 + 1.05 + ... + 1.05ⁿ⁻¹ = (1.05ⁿ − 1) / (1.05 − 1) = 20 (1.05ⁿ − 1)

Donc Aₙ = 2000 × 1.05ⁿ + 6000 (1.05ⁿ − 1) = 8000 × 1.05ⁿ − 6000.

**c)** A₁₀ = 8000 × 1.05¹⁰ − 6000 ≈ 7031.157 D.
Amine a versé en tout 2000 + 10 × 300 = 5000 D. Les intérêts gagnés valent environ 7031.157 − 5000 = 2031.157 D.

**4. a)** dₙ₊₁ − dₙ = (Aₙ₊₁ − Aₙ) − (Sₙ₊₁ − Sₙ) = 400 × 1.05ⁿ − 400 = 400 (1.05ⁿ − 1).
Comme 1.05 > 1, on a 1.05ⁿ ≥ 1 (produit de n facteurs supérieurs à 1, et 1.05⁰ = 1). Donc dₙ₊₁ − dₙ ≥ 0 : la suite (dₙ) est croissante.

**b)** dₙ = 8000 × 1.05ⁿ − 9000 − 400n. Valeurs arrondies au millime :

    n    | Aₙ (D)     | Sₙ (D) | dₙ (D)
    8    | 5819.644   | 6200   | −380.356
    9    | 6410.626   | 6600   | −189.374
    10   | 7031.157   | 7000   |   31.157

**c)** La suite (dₙ) est croissante.

- Pour n ≤ 9 : dₙ ≤ d₉ < 0, donc Aₙ < Sₙ.
- Pour n ≥ 10 : dₙ ≥ d₁₀ > 0, donc Aₙ > Sₙ.

Le capital d'Amine dépasse celui de Salma à partir de 10 années, et il reste ensuite toujours supérieur.

**5. a)** Notons Pₙ la propriété « 1.05ⁿ ≥ 1 + 0.05n ».

- P₀ est vraie : 1.05⁰ = 1 ≥ 1.
- Supposons Pₙ vraie. En multipliant par 1.05 > 0 : 1.05ⁿ⁺¹ ≥ 1.05 (1 + 0.05n) = 1 + 0.05n + 0.05 + 0.0025n ≥ 1 + 0.05(n + 1). Donc Pₙ₊₁ est vraie.

D'après le principe de récurrence, 1.05ⁿ ≥ 1 + 0.05n pour tout entier naturel n.

**b)** Aₙ = 8000 × 1.05ⁿ − 6000 ≥ 8000 (1 + 0.05n) − 6000 = 2000 + 400n.

**c)** Non. Soit M un réel quelconque. Il existe un entier naturel n tel que n > M / 400. Pour cet entier, Aₙ ≥ 2000 + 400n > 400n > M.
Aucun réel M ne majore tous les termes : la suite (Aₙ) n'est pas majorée. (Par exemple, pour M = 10⁶, tout entier n ≥ 2501 convient.)
