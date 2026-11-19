# 2ème Sciences — Tome 2, Chapitre 2 : Suites géométriques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 19 (activités numériques) : reconnaître qu'une suite est géométrique ; déterminer sa raison ; déterminer son terme général (premier terme et raison donnés) ; calculer des sommes de termes consécutifs ; représenter les points Aₙ(n, Uₙ) ; modéliser des situations réelles (en 1ère : pourcentages, intérêts simples et composés).
- Manuel CNP (tome 2, p. 21–31) : (Uₙ) est géométrique s'il existe un réel q tel que Uₙ₊₁ = qUₙ pour tout n ; Vₙ = V₀qⁿ, Vₙ = Vₚqⁿ⁻ᵖ, en particulier Vₙ = V₁qⁿ⁻¹ ; la somme de n termes consécutifs d'une suite géométrique de raison q ≠ 1 est S = a × (1 − qⁿ) / (1 − q), où a est le premier terme de la somme (S = na si q = 1) ; 1 + q + ... + qⁿ = (1 − qⁿ⁺¹) / (1 − q) pour q ≠ 1. Le manuel fait chercher « à la calculatrice » à partir de quel rang un terme dépasse un seuil (pas de logarithme en 2ème année).
- Outils autorisés : ceux du chapitre, le chapitre 1 (suites arithmétiques), le tome 1 (polynômes, second degré) et la 1ère année (pourcentages, intérêts composés). Pas de récurrence, pas de limites, pas de logarithme, pas de suite auxiliaire du type Uₙ₊₁ = aUₙ + b (programme de 3ème) ; calculatrice autorisée.
- Notation du manuel : suite (Uₙ), raison q. Les sommes d'argent sont arrondies au millime (0.001 dinar).
- Toutes les valeurs sont vérifiées par `check_t2_ch02.py` (calcul exact en fractions ; arrondis contrôlés sur la valeur exacte).

---

## Exercice 1 — Reconnaître une suite géométrique, terme général, sommes

1. Dans chacun des cas suivants, dire si la suite est géométrique. Si oui, préciser son premier terme et sa raison.
   a) aₙ = 3 × 2ⁿ⁺¹, pour tout n ∈ ℕ.
   b) bₙ = 2ⁿ / 3ⁿ⁻¹, pour tout n ∈ ℕ.
   c) cₙ = n² + 1, pour tout n ∈ ℕ.
   d) d₀ = 4 et 2dₙ₊₁ + dₙ = 0, pour tout n ∈ ℕ.
2. Soit (Uₙ) une suite géométrique telle que U₃ = 54 et U₆ = 1458.
   a) Montrer que la raison q vérifie q³ = 27. Vérifier que q³ − 27 = (q − 3)(q² + 3q + 9) et en déduire q. Calculer U₀.
   b) Exprimer Uₙ en fonction de n.
   c) Les nombres 39366 et 4000 sont-ils des termes de la suite (Uₙ) ?
   d) Calculer les sommes

       S = U₀ + U₁ + ... + U₇        et        S' = U₄ + U₅ + ... + U₉

3. Soit (Vₙ) une suite géométrique telle que V₂ = 20 et V₄ = 5.
   a) Déterminer les valeurs possibles de la raison q.
   b) Pour chacune de ces valeurs, calculer V₀, V₇ et la somme V₀ + V₁ + ... + V₇.
4. a) Calculer la somme T = 3 − 6 + 12 − 24 + ... + 768, dans laquelle chaque terme est égal au précédent multiplié par −2.
   b) Déterminer les réels x tels que x, x + 6 et 4x soient, dans cet ordre, trois termes consécutifs d'une suite géométrique. Préciser à chaque fois la raison.
5. Dans cette question, (Vₙ) est la suite du 3. de raison 1/2.
   a) Dans un repère orthogonal, placer les points Aₙ(n, Vₙ) pour n = 0, 1, 2, 3, 4.
   b) Ces points sont-ils alignés ? La suite (Vₙ) est-elle arithmétique ?
   c) À l'aide de la calculatrice, déterminer le plus petit entier n tel que Vₙ < 0.01.

### Corrigé

**1. a)** Pour tout n ∈ ℕ : aₙ₊₁ = 3 × 2ⁿ⁺² = 2 × (3 × 2ⁿ⁺¹) = 2aₙ.
(aₙ) est géométrique, de premier terme a₀ = 3 × 2 = 6 et de raison 2.

**b)** Pour tout n ∈ ℕ : bₙ = 2ⁿ / 3ⁿ⁻¹ = 3 × 2ⁿ / 3ⁿ = 3 × (2/3)ⁿ, donc bₙ₊₁ = 3 × (2/3)ⁿ⁺¹ = (2/3) bₙ.
(bₙ) est géométrique, de premier terme b₀ = 3 et de raison 2/3.

**c)** c₀ = 1, c₁ = 2, c₂ = 5. Si (cₙ) était géométrique de raison q, on aurait c₁ = qc₀, donc q = 2, puis c₂ = 2c₁ = 4. Or c₂ = 5 : (cₙ) n'est pas géométrique.

**d)** Pour tout n ∈ ℕ : 2dₙ₊₁ = −dₙ, soit dₙ₊₁ = (−1/2) dₙ.
(dₙ) est géométrique, de premier terme d₀ = 4 et de raison −1/2. (d₁ = −2, d₂ = 1, d₃ = −0.5.)

**2. a)** On utilise Vₙ = Vₚqⁿ⁻ᵖ : U₆ = U₃q³, donc 1458 = 54q³ et q³ = 1458 / 54 = 27.
(q − 3)(q² + 3q + 9) = q³ + 3q² + 9q − 3q² − 9q − 27 = q³ − 27.
Donc q³ = 27 ⟺ (q − 3)(q² + 3q + 9) = 0. Le trinôme q² + 3q + 9 a pour discriminant 9 − 36 = −27 < 0 : il ne s'annule pas. Donc q = 3.
Puis U₃ = U₀q³, donc U₀ = 54 / 27 = 2.

**b)** Uₙ = U₀qⁿ = 2 × 3ⁿ pour tout n ∈ ℕ.

**c)** Uₙ = 39366 ⟺ 3ⁿ = 19683. En divisant 19683 par 3 de proche en proche : 19683 → 6561 → 2187 → 729 → 243 → 81 → 27 → 9 → 3 → 1, soit 9 divisions. Donc 19683 = 3⁹ et 39366 = U₉.
Uₙ = 4000 ⟺ 3ⁿ = 2000. Or 3ⁿ est un produit de facteurs impairs, donc impair, alors que 2000 est pair. 4000 n'est pas un terme de la suite.

**d)** S est la somme de 8 termes, de premier terme U₀ = 2 :

    S = 2 × (1 − 3⁸) / (1 − 3) = 2 × (1 − 6561) / (−2) = 6560

S' est la somme de 9 − 4 + 1 = 6 termes, de premier terme U₄ = 2 × 81 = 162 :

    S' = 162 × (1 − 3⁶) / (1 − 3) = 162 × 728 / 2 = 162 × 364 = 58968

Contrôle : S' = U₄ + ... + U₉ = (U₀ + ... + U₉) − (U₀ + ... + U₃) = (3¹⁰ − 1) − (3⁴ − 1) = 59049 − 81 = 58968.

**3. a)** V₄ = V₂q², donc 5 = 20q² et q² = 1/4. Ainsi q = 1/2 ou q = −1/2.

**b)** Dans les deux cas q² = 1/4, et V₂ = V₀q² donne V₀ = 20 / (1/4) = 80.

- Si q = 1/2 : V₇ = 80 × (1/2)⁷ = 80 / 128 = 0.625 et

      V₀ + ... + V₇ = 80 × (1 − (1/2)⁸) / (1 − 1/2) = 160 × 255/256 = 159.375

- Si q = −1/2 : V₇ = 80 × (−1/2)⁷ = −0.625 et

      V₀ + ... + V₇ = 80 × (1 − (−1/2)⁸) / (1 + 1/2) = (160/3) × 255/256 = 53.125

**4. a)** Les termes de T sont 3 × (−2)ᵏ. Comme 768 = 3 × 256 = 3 × (−2)⁸, T contient les termes pour k = 0, 1, ..., 8 : c'est la somme de 9 termes consécutifs d'une suite géométrique de raison −2, de premier terme 3.

    T = 3 × (1 − (−2)⁹) / (1 − (−2)) = 3 × (1 + 512) / 3 = 513

**b)** Supposons que x, x + 6, 4x soient trois termes consécutifs d'une suite géométrique de raison q : x + 6 = qx et 4x = q(x + 6).
En multipliant la première égalité par x + 6 : (x + 6)² = qx(x + 6) = x × q(x + 6) = x × 4x = 4x². Donc

    (x + 6)² − (2x)² = 0  ⟺  (x + 6 − 2x)(x + 6 + 2x) = 0  ⟺  (6 − x)(3x + 6) = 0  ⟺  x = 6 ou x = −2

Réciproquement :

- pour x = 6 : les nombres sont 6, 12, 24, avec 12 = 2 × 6 et 24 = 2 × 12 ; la raison est 2 ;
- pour x = −2 : les nombres sont −2, 4, −8, avec 4 = (−2) × (−2) et −8 = (−2) × 4 ; la raison est −2.

Les réels cherchés sont 6 et −2.

**5. a)** V₀ = 80, V₁ = 40, V₂ = 20, V₃ = 10, V₄ = 5. On place A₀(0, 80), A₁(1, 40), A₂(2, 20), A₃(3, 10) et A₄(4, 5) (par exemple 2 cm pour une unité en abscisse et 1 cm pour 10 unités en ordonnée). D'un point au suivant, l'ordonnée est divisée par 2.

**b)** Le coefficient directeur de (A₀A₁) est (40 − 80) / (1 − 0) = −40, celui de (A₁A₂) est (20 − 40) / (2 − 1) = −20. Ils sont différents : A₀, A₁ et A₂ ne sont pas alignés.
Si (Vₙ) était arithmétique, tous les points Aₙ seraient sur une même droite (cours du chapitre 1). Donc (Vₙ) n'est pas arithmétique (on le voit aussi avec V₁ − V₀ = −40 ≠ V₂ − V₁ = −20).

**c)** Vₙ = 80 × (1/2)ⁿ = 80 / 2ⁿ, donc Vₙ < 0.01 ⟺ 2ⁿ > 80 / 0.01 = 8000.
À la calculatrice : 2¹² = 4096 et 2¹³ = 8192. Comme 2ⁿ⁺¹ = 2 × 2ⁿ > 2ⁿ, les puissances de 2 augmentent avec n : 2ⁿ ≤ 4096 pour n ≤ 12 et 2ⁿ ≥ 8192 pour n ≥ 13.
Le plus petit entier cherché est n = 13 (V₁₂ = 80 / 4096 ≈ 0.0195 et V₁₃ = 80 / 8192 ≈ 0.0098).

---

## Exercice 2 — Placer son argent : intérêts simples, intérêts composés, épargne régulière

### Partie A

Le 1er janvier 2026, Sami dispose de 5000 dinars à placer. Deux formules lui sont proposées.

- Formule A (intérêts simples) : à la fin de chaque année, on ajoute au capital des intérêts égaux à 6 % du capital de départ, 5000 dinars.
- Formule B (intérêts composés) : à la fin de chaque année, on ajoute au capital des intérêts égaux à 5 % du capital disponible au début de cette année.

On note aₙ et bₙ les capitaux (en dinars) obtenus au bout de n années avec la formule A et avec la formule B. Ainsi a₀ = b₀ = 5000.

1. a) Calculer a₁, a₂, b₁ et b₂.
   b) Montrer que (aₙ) est une suite arithmétique et que (bₙ) est une suite géométrique. Exprimer aₙ et bₙ en fonction de n.
2. a) À l'aide de la calculatrice, dresser le tableau des valeurs de aₙ et de bₙ pour n allant de 1 à 10 (bₙ arrondi au millime).
   b) Sami veut laisser son argent placé 5 ans. Quelle formule doit-il choisir ? Même question pour 10 ans.
   c) Quelle est la plus petite durée, en années entières, pour laquelle la formule B donne un capital plus grand que la formule A ?

### Partie B

Leila préfère épargner régulièrement. Le 1er janvier de chaque année, de 2026 à 2035, elle verse 600 dinars sur un compte rémunéré selon la formule B (intérêts composés à 5 % par an, ajoutés à la fin de chaque année). Elle ne retire rien.

3. a) Montrer que les 600 dinars versés le 1er janvier 2026 sont devenus 600 × 1.05⁹ dinars le 1er janvier 2035.
   b) Plus généralement, pour k = 0, 1, ..., 9, que sont devenus le 1er janvier 2035 les 600 dinars versés le 1er janvier de l'année 2026 + k ?
4. a) En déduire que le capital C de Leila le 1er janvier 2035, juste après son dernier versement, est

       C = 600 × (1 + 1.05 + 1.05² + ... + 1.05⁹)

   b) Calculer C au millime près. Quel est le montant total des intérêts acquis ?
5. Quelle somme, arrondie au dinar supérieur, Leila aurait-elle dû verser chaque année (aux mêmes dates) pour disposer d'au moins 10000 dinars le 1er janvier 2035 ?

### Corrigé — Partie A

**1. a)** Les intérêts de la formule A sont 6 % de 5000, soit 300 dinars par an : a₁ = 5300 et a₂ = 5600.
Formule B : b₁ = 5000 + 0.05 × 5000 = 5250 et b₂ = 5250 + 0.05 × 5250 = 5512.5.

**b)** Pour tout n ∈ ℕ : aₙ₊₁ = aₙ + 300. (aₙ) est arithmétique de raison 300 et de premier terme 5000 : aₙ = 5000 + 300n.
Pour tout n ∈ ℕ : bₙ₊₁ = bₙ + 0.05bₙ = 1.05bₙ. (bₙ) est géométrique de raison 1.05 et de premier terme 5000 : bₙ = 5000 × 1.05ⁿ.

**2. a)**

    n    |   1      2         3          4          5          6          7          8          9          10
    aₙ   | 5300   5600      5900       6200       6500       6800       7100       7400       7700       8000
    bₙ   | 5250   5512.5    5788.125   6077.531   6381.408   6700.478   7035.502   7387.277   7756.641   8144.473

**b)** Sur 5 ans : a₅ = 6500 > b₅ ≈ 6381.408. Sami doit choisir la formule A (environ 118.592 dinars de plus).
Sur 10 ans : a₁₀ = 8000 < b₁₀ ≈ 8144.473. Il doit choisir la formule B (environ 144.473 dinars de plus).

**c)** D'après le tableau, aₙ > bₙ pour n ≤ 8 (a₈ = 7400 > b₈ ≈ 7387.277) et b₉ ≈ 7756.641 > a₉ = 7700. La plus petite durée cherchée est 9 ans.
Remarque : ensuite la formule B reste meilleure. En effet, chaque année le capital A augmente de 300 dinars et le capital B de 0.05bₙ dinars ; dès que bₙ > 6000 (comme bₙ₊₁ = 1.05 bₙ > bₙ, les capitaux B augmentent, donc bₙ ≥ b₄ ≈ 6077.531 > 6000 pour n ≥ 4), 0.05bₙ > 300 : l'écart bₙ − aₙ, positif pour n = 9, augmente chaque année.

### Corrigé — Partie B

**3. a)** Un capital placé selon la formule B est multiplié par 1.05 chaque année. Du 1er janvier 2026 au 1er janvier 2035, il s'écoule 9 années : les 600 dinars versés en 2026 sont devenus 600 × 1.05⁹ dinars.

**b)** Les 600 dinars versés le 1er janvier de l'année 2026 + k restent placés 2035 − (2026 + k) = 9 − k années. Ils sont devenus 600 × 1.05⁹⁻ᵏ dinars le 1er janvier 2035. (Pour k = 9, c'est le versement du jour : 600 × 1.05⁰ = 600.)

**4. a)** Le capital C est la somme des valeurs des 10 versements le 1er janvier 2035 :

    C = 600 × 1.05⁹ + 600 × 1.05⁸ + ... + 600 × 1.05 + 600 = 600 × (1 + 1.05 + 1.05² + ... + 1.05⁹)

**b)** 1 + 1.05 + ... + 1.05⁹ est la somme de 10 termes consécutifs d'une suite géométrique de raison 1.05 et de premier terme 1 :

    C = 600 × (1 − 1.05¹⁰) / (1 − 1.05) = 12000 × (1.05¹⁰ − 1) ≈ 7546.736 dinars

Leila a versé 10 × 600 = 6000 dinars ; les intérêts acquis s'élèvent à environ 7546.736 − 6000 = 1546.736 dinars.

**5.** Si Leila verse x dinars chaque année, le même calcul donne un capital

    x × (1 − 1.05¹⁰) / (1 − 1.05) = 20x × (1.05¹⁰ − 1) ≈ 12.577893 x

On veut 12.577893 x ≥ 10000, soit x ≥ 10000 / 12.577893 ≈ 795.046.
Arrondie au dinar supérieur, la somme à verser est 796 dinars. (Avec 795 dinars par an, on n'obtiendrait qu'environ 9999.425 dinars ; avec 796 dinars, environ 10012.002 dinars.)
