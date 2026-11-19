# 2ème Sciences — Tome 2, Chapitre 3 : Généralités sur les fonctions

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 21 (activités sur les fonctions) : ensemble de définition, image d'un réel, sens de variation ; lecture graphique de l'ensemble de définition, de la parité, du sens de variation, des extrema, des coordonnées d'un point, de la position relative de deux courbes ; problèmes d'optimisation.
- Manuel CNP (tome 2, chapitre 3, p. 32–47) : courbe représentative (M(x, y) ∈ 𝒞 ⟺ x ∈ E et y = f(x)), maximum et minimum sur un intervalle, fonction croissante / décroissante / constante sur un intervalle (définition avec a ≤ b ⟹ f(a) ≤ f(b), au sens large), fonction paire / impaire et symétrie de la courbe dans un repère orthogonal. Le manuel ne parle pas de majorant ni de minorant : les corrigés n'utilisent que maximum et minimum. « Tableau de variation » désigne simplement le tableau qui résume les variations.
- Outils autorisés : ce chapitre, les chapitres 1–2 du tome 2 (suites), le tome 1 (forme canonique, discriminant, signe d'un trinôme) et la 1ère année (Pythagore, fonctions affines, comparaison de racines carrées). Pas de limites, pas de dérivées : le sens de variation se lit sur le signe de f(a) − f(b).
- Notation : 𝒞_f est la courbe de f ; AB est une longueur.
- Toutes les valeurs sont vérifiées par `check_t2_ch03.py` (calcul exact en fractions).

---

## Exercice 1 — Image, antécédent, parité, sens de variation, extremums

Le plan est muni d'un repère orthonormé (O, i, j). Soit f la fonction définie par

    f(x) = (x² − 1) / (x² + 1)

On note 𝒞 sa courbe représentative.

1. a) Justifier que f est définie sur ℝ.
   b) Calculer f(0), f(2) et f(√3).
   c) Les points A(−2, 3/5), B(1/2, −3/5) et C(3, 9/10) appartiennent-ils à 𝒞 ?
2. Déterminer les antécédents éventuels par f de chacun des réels 0, 1/2, 1 et −1.
3. Montrer que f est paire. Que peut-on en déduire pour 𝒞 ?
4. a) Montrer que pour tout réel x :

       f(x) = 1 − 2 / (x² + 1)

   b) Montrer que pour tous réels a et b :

       f(a) − f(b) = 2(a − b)(a + b) / ((a² + 1)(b² + 1))

   c) En déduire que f est croissante sur [0, +∞[ et décroissante sur ]−∞, 0]. Résumer les variations de f dans un tableau.
5. a) Montrer que −1 est le minimum de f sur ℝ. En quel réel est-il atteint ?
   b) Montrer que f(x) < 1 pour tout réel x. La fonction f admet-elle un maximum sur ℝ ? Justifier. (On pourra raisonner par l'absurde : si f admettait un maximum en un réel a, comparer f(|a| + 1) et f(|a|) à l'aide de 4. b).)
   c) Déterminer le maximum et le minimum de f sur l'intervalle [−2, 3].
6. a) Résoudre dans ℝ l'inéquation f(x) ≤ 3/5.
   b) Interpréter graphiquement le résultat à l'aide de la droite d'équation y = 3/5.

### Corrigé

**1. a)** Pour tout réel x, x² ≥ 0 donc x² + 1 ≥ 1 > 0 : le dénominateur ne s'annule jamais. f est définie sur ℝ.

**b)** f(0) = (0 − 1) / (0 + 1) = −1 ; f(2) = (4 − 1) / (4 + 1) = 3/5 ; f(√3) = (3 − 1) / (3 + 1) = 2/4 = 1/2.

**c)** M(x, y) ∈ 𝒞 ⟺ y = f(x).

- f(−2) = (4 − 1) / (4 + 1) = 3/5 : A appartient à 𝒞.
- f(1/2) = (1/4 − 1) / (1/4 + 1) = (−3/4) / (5/4) = −3/5 : B appartient à 𝒞.
- f(3) = (9 − 1) / (9 + 1) = 8/10 = 4/5 et 4/5 ≠ 9/10 : C n'appartient pas à 𝒞.

**2.** Soit k un réel. Comme x² + 1 > 0 :

    f(x) = k ⟺ x² − 1 = k(x² + 1) ⟺ (1 − k) x² = 1 + k

- k = 0 : x² = 1 ⟺ x = −1 ou x = 1. Les antécédents de 0 sont −1 et 1.
- k = 1/2 : (1/2) x² = 3/2 ⟺ x² = 3 ⟺ x = −√3 ou x = √3. Les antécédents de 1/2 sont −√3 et √3.
- k = 1 : l'égalité devient 0 × x² = 2, ce qui est impossible. Le réel 1 n'a pas d'antécédent.
- k = −1 : 2x² = 0 ⟺ x = 0. Le seul antécédent de −1 est 0.

**3.** D_f = ℝ : pour tout réel x, −x est aussi un réel. De plus

    f(−x) = ((−x)² − 1) / ((−x)² + 1) = (x² − 1) / (x² + 1) = f(x)

f est paire. Le repère étant orthonormé (donc orthogonal), 𝒞 est symétrique par rapport à l'axe des ordonnées.

**4. a)** 1 − 2 / (x² + 1) = (x² + 1 − 2) / (x² + 1) = (x² − 1) / (x² + 1) = f(x).

**b)** D'après a) :

    f(a) − f(b) = 2/(b² + 1) − 2/(a² + 1) = 2[(a² + 1) − (b² + 1)] / ((a² + 1)(b² + 1)) = 2(a² − b²) / ((a² + 1)(b² + 1))

et a² − b² = (a − b)(a + b).

**c)** Le dénominateur (a² + 1)(b² + 1) est strictement positif, donc f(a) − f(b) a le signe de (a − b)(a + b).

- Si 0 ≤ a ≤ b : a − b ≤ 0 et a + b ≥ 0, donc f(a) − f(b) ≤ 0, soit f(a) ≤ f(b). f est croissante sur [0, +∞[.
- Si a ≤ b ≤ 0 : a − b ≤ 0 et a + b ≤ 0, donc f(a) − f(b) ≥ 0, soit f(a) ≥ f(b). f est décroissante sur ]−∞, 0].

    x     | −∞              0              +∞
    f(x)  |        ↘       −1       ↗

**5. a)** Pour tout réel x :

    f(x) − (−1) = (x² − 1 + x² + 1) / (x² + 1) = 2x² / (x² + 1) ≥ 0

donc f(x) ≥ −1 = f(0). Le minimum de f sur ℝ est −1, atteint en 0 seulement (2x² = 0 ⟺ x = 0).

**b)** D'après 4. a), 1 − f(x) = 2 / (x² + 1) > 0, donc f(x) < 1 pour tout réel x.
f n'admet pas de maximum sur ℝ. Supposons que f admette un maximum en un réel a, c'est-à-dire f(x) ≤ f(a) pour tout réel x. Posons b = |a| + 1. D'après 4. b), avec b − |a| = 1 et b + |a| = 2|a| + 1 :

    f(b) − f(|a|) = 2 × 1 × (2|a| + 1) / ((b² + 1)(|a|² + 1)) > 0

Or f(|a|) = f(a) (si a < 0, c'est la parité). Donc f(b) > f(a) : c'est absurde. La valeur 1 n'est jamais atteinte et f n'a pas de maximum.

**c)** Sur [−2, 0], f est décroissante : pour −2 ≤ x ≤ 0, f(0) ≤ f(x) ≤ f(−2), soit −1 ≤ f(x) ≤ 3/5.
Sur [0, 3], f est croissante : pour 0 ≤ x ≤ 3, f(0) ≤ f(x) ≤ f(3), soit −1 ≤ f(x) ≤ 4/5.
Comme 3/5 < 4/5, on a −1 ≤ f(x) ≤ 4/5 pour tout x de [−2, 3], avec f(0) = −1 et f(3) = 4/5.
Sur [−2, 3], le minimum de f est −1 (atteint en 0) et le maximum est 4/5 (atteint en 3).

**6. a)** Comme x² + 1 > 0, on peut multiplier les deux membres par 5(x² + 1) sans changer le sens :

    f(x) ≤ 3/5 ⟺ 5(x² − 1) ≤ 3(x² + 1) ⟺ 2x² ≤ 8 ⟺ x² ≤ 4 ⟺ −2 ≤ x ≤ 2

S = [−2, 2].

**b)** La droite d'équation y = 3/5 coupe 𝒞 aux points A(−2, 3/5) et A'(2, 3/5) (A' est le symétrique de A par rapport à l'axe des ordonnées). Les points de 𝒞 situés sur ou sous cette droite sont exactement ceux dont l'abscisse appartient à [−2, 2].

---

## Exercice 2 — Problème : un carré dans un carré

ABCD est un carré de côté 6 cm. Pour un réel x de [0, 6], on place :

- M sur [AB] tel que AM = x ;
- N sur [BC] tel que BN = x ;
- P sur [CD] tel que CP = x ;
- Q sur [DA] tel que DQ = x.

On admet que MNPQ est un carré (pour x = 0 et x = 6, c'est le carré ABCD lui-même). On note S(x) l'aire du carré MNPQ et T(x) la somme des aires des quatre triangles AMQ, BNM, CPN et DQP, en cm².

1. a) Exprimer AQ en fonction de x, puis montrer que S(x) = 2x² − 12x + 36.
   b) Montrer que T(x) = 12x − 2x². Vérifier que S(x) + T(x) = 36 et expliquer ce résultat.
2. a) Montrer que pour tous réels a et b :

       S(a) − S(b) = 2(a − b)(a + b − 6)

   b) En déduire le sens de variation de S sur [0, 3] et sur [3, 6]. Résumer les variations de S dans un tableau.
3. a) Montrer que pour tout réel x, S(x) − 18 = 2(x − 3)². En déduire le minimum de S sur [0, 6]. Quelle est alors la position des points M, N, P et Q ? Comparer l'aire de MNPQ à celle de ABCD.
   b) Montrer que S(x) ≤ 36 pour tout x de [0, 6]. Quel est le maximum de S sur [0, 6] et pour quelles valeurs de x est-il atteint ?
4. Le plan est muni d'un repère orthogonal. On note 𝒞_S et 𝒞_T les courbes représentatives de S et de T sur [0, 6].
   a) Recopier et compléter le tableau de valeurs suivant :

       x     | 0 | 1 | 2 | 3 | 4 | 5 | 6
       S(x)  |   |   |   |   |   |   |
       T(x)  |   |   |   |   |   |   |

   b) Étudier le signe de S(x) − T(x) sur [0, 6]. En déduire la position relative de 𝒞_S et 𝒞_T.
   c) Traduire ce résultat par une phrase portant sur les aires.
5. a) Pour quelles valeurs de x l'aire de MNPQ est-elle égale à 20 cm² ?
   b) Pour quelles valeurs de x l'aire de MNPQ est-elle au plus égale à 20 cm² ? Interpréter graphiquement.
6. On note p(x) le périmètre du carré MNPQ.
   a) Exprimer p(x) à l'aide de S(x).
   b) Montrer que p est décroissante sur [0, 3] et croissante sur [3, 6]. En déduire le plus petit périmètre possible.

### Corrigé

**1. a)** Q appartient à [DA], donc AQ = AD − DQ = 6 − x.
Le triangle AMQ est rectangle en A (angle du carré). D'après le théorème de Pythagore :

    MQ² = AM² + AQ² = x² + (6 − x)² = x² + 36 − 12x + x² = 2x² − 12x + 36

L'aire du carré MNPQ de côté MQ est S(x) = MQ² = 2x² − 12x + 36.

**b)** De même BM = 6 − x, CN = 6 − x et DP = 6 − x. Chacun des quatre triangles est rectangle (en A, B, C, D) et a deux côtés de l'angle droit de longueurs x et 6 − x : son aire est x(6 − x)/2. Donc

    T(x) = 4 × x(6 − x)/2 = 2x(6 − x) = 12x − 2x²

S(x) + T(x) = 2x² − 12x + 36 + 12x − 2x² = 36 : le carré ABCD (d'aire 6² = 36) est exactement partagé en le carré MNPQ et les quatre triangles.

**2. a)** S(a) − S(b) = 2(a² − b²) − 12(a − b) = 2(a − b)(a + b) − 12(a − b) = 2(a − b)(a + b − 6).

**b)**

- Si 0 ≤ a ≤ b ≤ 3 : a − b ≤ 0 et a + b ≤ 6, soit a + b − 6 ≤ 0. Donc S(a) − S(b) ≥ 0, soit S(a) ≥ S(b) : S est décroissante sur [0, 3].
- Si 3 ≤ a ≤ b ≤ 6 : a − b ≤ 0 et a + b ≥ 6, soit a + b − 6 ≥ 0. Donc S(a) − S(b) ≤ 0, soit S(a) ≤ S(b) : S est croissante sur [3, 6].

Avec S(0) = 36, S(3) = 18 − 36 + 36 = 18 et S(6) = 72 − 72 + 36 = 36 :

    x     | 0               3               6
    S(x)  | 36      ↘       18      ↗       36

**3. a)** 2(x − 3)² + 18 = 2(x² − 6x + 9) + 18 = 2x² − 12x + 36 = S(x).
Donc S(x) − 18 = 2(x − 3)² ≥ 0, soit S(x) ≥ 18 = S(3), avec égalité seulement pour x = 3.
Le minimum de S sur [0, 6] est 18 cm², atteint pour x = 3. Alors AM = BN = CP = DQ = 3 : M, N, P et Q sont les milieux des côtés [AB], [BC], [CD] et [DA]. L'aire de MNPQ est 18 = 36/2 : c'est la moitié de l'aire de ABCD.

**b)** S(x) − 36 = 2x² − 12x = 2x(x − 6). Pour 0 ≤ x ≤ 6 : x ≥ 0 et x − 6 ≤ 0, donc S(x) − 36 ≤ 0, soit S(x) ≤ 36.
S(x) = 36 ⟺ x = 0 ou x = 6. Le maximum de S sur [0, 6] est 36 cm², atteint pour x = 0 et pour x = 6 (MNPQ est alors le carré ABCD).

**4. a)**

    x     |  0 |  1 |  2 |  3 |  4 |  5 |  6
    S(x)  | 36 | 26 | 20 | 18 | 20 | 26 | 36
    T(x)  |  0 | 10 | 16 | 18 | 16 | 10 |  0

**b)** S(x) − T(x) = 2x² − 12x + 36 − 12x + 2x² = 4x² − 24x + 36 = 4(x² − 6x + 9) = 4(x − 3)².
Donc S(x) − T(x) ≥ 0 pour tout x de [0, 6], et S(x) − T(x) = 0 ⟺ x = 3.
𝒞_S est au-dessus de 𝒞_T sur [0, 6] ; les deux courbes ont un seul point commun, le point de coordonnées (3, 18).

**c)** Quelle que soit la position de M, l'aire du carré MNPQ est au moins égale à la somme des aires des quatre triangles. Les deux aires ne sont égales (18 cm² chacune) que lorsque M, N, P et Q sont les milieux des côtés.

**5. a)** S(x) = 20 ⟺ 2x² − 12x + 16 = 0 ⟺ x² − 6x + 8 = 0.
Discriminant : Δ = 36 − 32 = 4, donc deux racines : x = (6 − 2)/2 = 2 et x = (6 + 2)/2 = 4. Les deux appartiennent à [0, 6].
L'aire de MNPQ vaut 20 cm² pour x = 2 et pour x = 4.

**b)** S(x) − 20 = 2(x − 2)(x − 4). Ce trinôme (coefficient 2 > 0) est négatif ou nul entre ses racines : S(x) ≤ 20 ⟺ 2 ≤ x ≤ 4.
L'aire de MNPQ est au plus 20 cm² pour x ∈ [2, 4]. Graphiquement : ce sont les abscisses des points de 𝒞_S situés sur ou sous la droite d'équation y = 20, qui coupe 𝒞_S aux points (2, 20) et (4, 20).

**6. a)** Le côté du carré MNPQ est MQ = √(S(x)), donc p(x) = 4√(S(x)).

**b)** On rappelle que si 0 ≤ u ≤ v alors √u ≤ √v (car v − u = (√v − √u)(√v + √u)).

- Si 0 ≤ a ≤ b ≤ 3 : S est décroissante sur [0, 3], donc S(b) ≤ S(a), avec S(b) ≥ 18 > 0. Donc √(S(b)) ≤ √(S(a)) et p(b) ≤ p(a) : p est décroissante sur [0, 3].
- Si 3 ≤ a ≤ b ≤ 6 : S est croissante sur [3, 6], donc 0 < S(a) ≤ S(b), d'où p(a) ≤ p(b) : p est croissante sur [3, 6].

Le plus petit périmètre est p(3) = 4√18 = 4 × 3√2 = 12√2 cm ≈ 16.97 cm (pour x = 0 ou x = 6, le périmètre vaut 24 cm).
