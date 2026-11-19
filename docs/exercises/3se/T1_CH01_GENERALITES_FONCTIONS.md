# 3ème Sc. exp. — Tome 1, Chapitre 1 : Généralités sur les fonctions

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17 : ensemble de définition, variations, parité, restriction, majorant / minorant, fonction √f, opérations, fonctions affines par intervalles. Manuel CNP : partie entière E(x).
- Toutes les valeurs sont vérifiées par `check_t1_ch1_ch2.py` (calcul exact en fractions).
- Outils autorisés : ceux du chapitre (pas de limites, pas de dérivées).

---

## Exercice 1 — Parité, majorant, minorant, sens de variation

Le plan est muni d'un repère orthonormé (O, i, j). Soit f la fonction définie sur ℝ par

    f(x) = 2x / (x² + 1)

On note 𝒞 sa courbe représentative.

1. Montrer que f est impaire. Que peut-on en déduire pour 𝒞 ?
2. a) Montrer que pour tout réel x : 1 − f(x) = (x − 1)² / (x² + 1).
   b) En déduire que f est majorée par 1 sur ℝ, puis que 1 est le maximum de f sur ℝ.
   c) En utilisant la parité de f, montrer que −1 est le minimum de f sur ℝ.
3. a) Montrer que pour tous réels a et b :

       f(a) − f(b) = 2(a − b)(1 − ab) / ((a² + 1)(b² + 1))

   b) En déduire que f est strictement croissante sur [0, 1] et strictement décroissante sur [1, +∞[.
   c) Dresser le tableau de variation de f sur ℝ.
4. Soit h la fonction définie par h(x) = √(f(x)).
   a) Déterminer l'ensemble de définition D_h de h.
   b) Montrer que h est bornée sur D_h.
   c) Donner, en justifiant, le sens de variation de h sur [0, 1].

### Corrigé

**1.** Pour tout réel x, x² + 1 > 0, donc D_f = ℝ, qui est symétrique par rapport à 0.
Pour tout réel x : f(−x) = 2(−x) / ((−x)² + 1) = −2x / (x² + 1) = −f(x).
f est impaire, donc 𝒞 est symétrique par rapport à l'origine O.

**2. a)** 1 − f(x) = (x² + 1 − 2x) / (x² + 1) = (x − 1)² / (x² + 1).

**b)** (x − 1)² ≥ 0 et x² + 1 > 0, donc 1 − f(x) ≥ 0, c'est-à-dire f(x) ≤ 1 pour tout réel x : f est majorée par 1.
De plus f(1) = 2 / 2 = 1. Le majorant 1 est atteint, donc 1 est le maximum de f sur ℝ (atteint en 1 seulement, car 1 − f(x) = 0 ⟺ x = 1).

**c)** Soit x un réel. Comme −x est réel, f(−x) ≤ 1, soit −f(x) ≤ 1, donc f(x) ≥ −1.
f est minorée par −1 et f(−1) = −1 : −1 est le minimum de f sur ℝ.
Conclusion : pour tout réel x, −1 ≤ f(x) ≤ 1 ; f est bornée sur ℝ.

**3. a)** f(a) − f(b) = [2a(b² + 1) − 2b(a² + 1)] / ((a² + 1)(b² + 1)).
Numérateur : 2ab² − 2a²b + 2a − 2b = 2ab(b − a) + 2(a − b) = 2(a − b)(1 − ab).

**b)** Le dénominateur (a² + 1)(b² + 1) est strictement positif.

- Si 0 ≤ a < b ≤ 1 : a − b < 0, et 0 ≤ ab ≤ a < 1 donc 1 − ab > 0. Ainsi f(a) − f(b) < 0, soit f(a) < f(b) : f est strictement croissante sur [0, 1].
- Si 1 ≤ a < b : a − b < 0, et ab > 1 donc 1 − ab < 0. Ainsi f(a) − f(b) > 0, soit f(a) > f(b) : f est strictement décroissante sur [1, +∞[.

**c)** f est impaire : elle a le même sens de variation sur un intervalle et sur son symétrique par rapport à 0. Elle est donc strictement croissante sur [−1, 0] et strictement décroissante sur ]−∞, −1].

    x     | −∞          −1           0           1          +∞
    f(x)  |      ↘      −1     ↗     0     ↗     1     ↘

**4. a)** h(x) existe ⟺ f(x) ≥ 0 ⟺ 2x / (x² + 1) ≥ 0 ⟺ x ≥ 0 (car x² + 1 > 0).
D_h = [0, +∞[.

**b)** Pour x ≥ 0 : 0 ≤ f(x) ≤ 1, donc 0 ≤ √(f(x)) ≤ 1. h est minorée par 0 et majorée par 1 : h est bornée sur D_h.
(On a même h(0) = 0 et h(1) = 1 : ce sont le minimum et le maximum de h.)

**c)** Si 0 ≤ a < b ≤ 1 : f est strictement croissante sur [0, 1], donc 0 ≤ f(a) < f(b). La fonction racine carrée est strictement croissante sur [0, +∞[, donc √(f(a)) < √(f(b)).
h est strictement croissante sur [0, 1].

---

## Exercice 2 — Fonctions affines par intervalles, partie entière

### Partie A

Soit f la fonction définie sur ℝ par

    f(x) = |x − 1| + |x + 2|

On note 𝒞_f sa courbe représentative dans un repère orthonormé (O, i, j).

1. Écrire f(x) sans valeur absolue sur chacun des intervalles ]−∞, −2], [−2, 1] et [1, +∞[.
2. En déduire que f est une fonction affine par intervalles et tracer 𝒞_f.
3. Soit Δ la droite d'équation x = −1/2. Pour tout réel x, on note M le point de 𝒞_f d'abscisse x et M' le symétrique de M par rapport à Δ.
   a) Donner les coordonnées de M'.
   b) Montrer que M' appartient à 𝒞_f. Que peut-on en conclure pour 𝒞_f ?
4. a) Déterminer le minimum de f sur ℝ et l'ensemble des réels en lesquels il est atteint.
   b) Sur une droite graduée, on considère les points A(1), B(−2) et M(x). Vérifier que f(x) = MA + MB, puis interpréter le résultat du 4. a).
5. Résoudre dans ℝ l'équation f(x) = 5, puis l'inéquation f(x) ≤ 5. Vérifier graphiquement.

### Partie B

On note E la fonction partie entière. Soit g la fonction définie sur [−1, 2[ par

    g(x) = x − E(x)

1. Exprimer g(x) sur chacun des intervalles [−1, 0[, [0, 1[ et [1, 2[.
2. Représenter g dans un repère orthonormé.
3. a) Montrer que pour tout x de [−1, 2[ : 0 ≤ g(x) < 1.
   b) g admet-elle un minimum sur [−1, 2[ ? un maximum ? Justifier.

### Corrigé — Partie A

**1.**

- Si x ≤ −2 : x − 1 < 0 et x + 2 ≤ 0, donc f(x) = −(x − 1) − (x + 2) = −2x − 1.
- Si −2 ≤ x ≤ 1 : x − 1 ≤ 0 et x + 2 ≥ 0, donc f(x) = −(x − 1) + (x + 2) = 3.
- Si x ≥ 1 : x − 1 ≥ 0 et x + 2 > 0, donc f(x) = (x − 1) + (x + 2) = 2x + 1.

Contrôle aux bornes : −2(−2) − 1 = 3 et 2(1) + 1 = 3.

**2.** La restriction de f à chacun des intervalles ]−∞, −2], [−2, 1] et [1, +∞[ est affine : f est affine par intervalles.
𝒞_f est formée d'une demi-droite, d'un segment horizontal et d'une demi-droite. Points utiles :

    x     | −4   −3   −2    1    2    3
    f(x)  |  7    5    3    3    5    7

**3. a)** M a pour coordonnées (x, f(x)). Le symétrique par rapport à la droite verticale Δ garde l'ordonnée, et Δ est la médiatrice de [MM'] : l'abscisse x' de M' vérifie (x + x') / 2 = −1/2, soit x' = −1 − x. Donc M'(−1 − x, f(x)).

**b)** Le réel −1 − x appartient à ℝ = D_f, et
f(−1 − x) = |−1 − x − 1| + |−1 − x + 2| = |−x − 2| + |1 − x| = |x + 2| + |x − 1| = f(x).
Donc M'(−1 − x, f(−1 − x)) est bien un point de 𝒞_f.
Le symétrique par rapport à Δ de tout point de 𝒞_f est sur 𝒞_f : la droite Δ d'équation x = −1/2 est un axe de symétrie de 𝒞_f.

**4. a)**

- Si x ≤ −2 : −2x ≥ 4, donc f(x) = −2x − 1 ≥ 3, avec égalité seulement pour x = −2.
- Si −2 ≤ x ≤ 1 : f(x) = 3.
- Si x ≥ 1 : 2x ≥ 2, donc f(x) = 2x + 1 ≥ 3, avec égalité seulement pour x = 1.

Donc f(x) ≥ 3 pour tout réel x, et f(x) = 3 ⟺ x ∈ [−2, 1].
Le minimum de f sur ℝ est 3, atteint en tout réel de [−2, 1].

**b)** MA = |x − 1| et MB = |x − (−2)| = |x + 2|, donc f(x) = MA + MB. De plus AB = |1 − (−2)| = 3.
Le résultat du 4. a) dit : MA + MB ≥ AB pour tout point M de la droite, avec égalité si et seulement si M appartient au segment [AB].

**5.** Équation f(x) = 5 :

- Sur ]−∞, −2] : −2x − 1 = 5 ⟺ x = −3, qui appartient bien à ]−∞, −2].
- Sur [−2, 1] : 3 = 5 est impossible.
- Sur [1, +∞[ : 2x + 1 = 5 ⟺ x = 2, qui appartient bien à [1, +∞[.

S = {−3 ; 2}. (Les deux solutions sont symétriques par rapport à −1/2, comme prévu par le 3.)

Inéquation f(x) ≤ 5 :

- Sur ]−∞, −2] : −2x − 1 ≤ 5 ⟺ x ≥ −3, d'où [−3, −2].
- Sur [−2, 1] : 3 ≤ 5 est toujours vrai, d'où [−2, 1].
- Sur [1, +∞[ : 2x + 1 ≤ 5 ⟺ x ≤ 2, d'où [1, 2].

S = [−3, 2]. Graphiquement : ce sont les abscisses des points de 𝒞_f situés sur ou sous la droite d'équation y = 5.

### Corrigé — Partie B

**1.**

- Si −1 ≤ x < 0 : E(x) = −1, donc g(x) = x + 1.
- Si 0 ≤ x < 1 : E(x) = 0, donc g(x) = x.
- Si 1 ≤ x < 2 : E(x) = 1, donc g(x) = x − 1.

**2.** La courbe est formée de trois segments parallèles à la droite y = x : chacun part du point (n, 0) (inclus) et s'arrête au point (n + 1, 1) (exclu), pour n = −1, 0, 1.

**3. a)** Par définition de la partie entière : E(x) ≤ x < E(x) + 1. En retranchant E(x) : 0 ≤ x − E(x) < 1.

**b)** g(−1) = g(0) = g(1) = 0 et g(x) ≥ 0 pour tout x : le minimum de g est 0.
g n'a pas de maximum. Supposons que g(x₀) soit un maximum, avec x₀ ∈ [n, n + 1[ (n ∈ {−1, 0, 1}). Le réel x₁ = (x₀ + n + 1) / 2 vérifie x₀ < x₁ < n + 1, donc E(x₁) = n et g(x₁) = x₁ − n > x₀ − n = g(x₀). C'est absurde.
Donc g est majorée par 1 mais n'admet pas de maximum : la valeur 1 n'est jamais atteinte.
