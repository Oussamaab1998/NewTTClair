# 3ème Sc. exp. — Tome 1, Chapitre 5 : Nombre dérivé

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17 : dérivabilité en un point, approximation affine, tangente ou demi-tangente en un point, dérivabilité des fonctions usuelles. Notes p. 18 : le nombre dérivé en a est la limite du taux d'accroissement en a (exemple de la vitesse instantanée) ; on exploite le nombre dérivé pour déterminer la limite d'une fonction en un réel.
- Manuel CNP (p. 80–99) : f'(a) = lim(x→a) (f(x) − f(a)) / (x − a) = lim(h→0) (f(a + h) − f(a)) / h ; tangente y = f'(a)(x − a) + f(a) ; dérivable en a ⟹ continue en a ; approximation affine f(a + h) ≈ f(a) + f'(a)h ; nombres dérivés des fonctions usuelles et règles de calcul en un réel a (somme, produit, puissance, quotient ; √u admis) ; nombres dérivés à droite et à gauche f'_d(a) et f'_g(a), demi-tangentes, demi-tangente verticale ; dérivabilité sur un intervalle.
- Outils autorisés : chapitres 1 à 5. Le lien entre le signe de la dérivée et le sens de variation est vu au chapitre 6 : il n'est pas utilisé ici.
- Notation : lim(h→0) g(h), lim(h→0⁺) et lim(h→0⁻) (limites à droite et à gauche).
- Toutes les valeurs sont vérifiées par `check_t1_ch05.py` (calcul exact en fractions ; contrôle numérique pour les racines carrées).

---

## Exercice 1 — Nombre dérivé, tangente, approximation affine, demi-tangentes

Le plan est muni d'un repère orthonormé (O, i, j).

1. Soit f la fonction définie sur ℝ \ {−1} par

       f(x) = (2x − 1) / (x + 1)

   et 𝒞_f sa courbe représentative.
   a) Montrer, en revenant à la définition, que f est dérivable en 0 et que f'(0) = 3.
   b) Donner une équation de la tangente T à 𝒞_f au point d'abscisse 0.
   c) Vérifier que pour tout réel h ≠ −1 : f(h) = −1 + 3h − 3h² / (1 + h). En déduire l'approximation affine de f(h) pour h voisin de 0, puis une valeur approchée de f(0.01) ; montrer que l'erreur commise est inférieure à 0.0003.
   d) Calculer f'(a) pour tout réel a ≠ −1. Déterminer les points de 𝒞_f en lesquels la tangente est parallèle à la droite d'équation y = 3x + 2, et donner une équation de chacune de ces tangentes.
2. Soit g la fonction définie sur [−3, +∞[ par g(x) = √(x + 3).
   a) Montrer que g est dérivable en 1 et calculer g'(1).
   b) En déduire, sans calculatrice, des valeurs approchées de √4.02 et de √3.96.
   c) Étudier la dérivabilité de g à droite en −3. Interpréter graphiquement.
3. En utilisant un nombre dérivé, calculer les limites suivantes.
   a) lim(x→2) (√(x + 7) − 3) / (x − 2)
   b) lim(x→0) ((2x + 1)⁴ − 1) / x
4. Soit k la fonction définie sur ℝ par k(x) = (x − 1)|x + 2|.
   a) Montrer que k est continue en −2.
   b) Calculer le nombre dérivé à droite et le nombre dérivé à gauche de k en −2.
   c) La fonction k est-elle dérivable en −2 ? Donner des équations des demi-tangentes à la courbe de k au point d'abscisse −2.

### Corrigé

**1. a)** f(0) = −1. Pour h ≠ 0 et h ≠ −1 :

    (f(h) − f(0)) / h = ((2h − 1) / (h + 1) + 1) / h = (2h − 1 + h + 1) / (h(h + 1)) = 3h / (h(h + 1)) = 3 / (h + 1)

La fonction h ↦ 3 / (h + 1) est continue en 0, donc lim(h→0) (f(h) − f(0)) / h = 3 / 1 = 3.
f est dérivable en 0 et f'(0) = 3.

**b)** T : y = f'(0)(x − 0) + f(0), soit y = 3x − 1.

**c)** Pour h ≠ −1 :

    −1 + 3h − 3h² / (1 + h) = ((−1 + 3h)(1 + h) − 3h²) / (1 + h) = (−1 + 2h + 3h² − 3h²) / (1 + h) = (2h − 1) / (1 + h) = f(h)

L'approximation affine de f au voisinage de 0 est f(h) ≈ f(0) + f'(0)h = −1 + 3h. Pour h = 0.01 : f(0.01) ≈ −1 + 0.03 = −0.97.
L'erreur commise est |f(0.01) − (−0.97)| = 3 × (0.01)² / (1 + 0.01) = 0.0003 / 1.01 < 0.0003.
(Valeur exacte : f(0.01) = −0.98 / 1.01 = −98/101 ≈ −0.970297.)

**d)** f = u / v avec u(x) = 2x − 1 et v(x) = x + 1. u et v sont dérivables en tout réel a, u'(a) = 2, v'(a) = 1, et v(a) ≠ 0 pour a ≠ −1. Donc f est dérivable en a et

    f'(a) = (u'(a) v(a) − u(a) v'(a)) / v(a)² = (2(a + 1) − (2a − 1)) / (a + 1)² = 3 / (a + 1)²

(Pour a = 0 on retrouve f'(0) = 3.)
La tangente au point d'abscisse a est parallèle à la droite y = 3x + 2 ⟺ f'(a) = 3 ⟺ (a + 1)² = 1 ⟺ a + 1 = 1 ou a + 1 = −1 ⟺ a = 0 ou a = −2.

- En a = 0 : point A(0, −1), tangente T : y = 3x − 1.
- En a = −2 : f(−2) = (−5) / (−1) = 5, point B(−2, 5), tangente y = 3(x + 2) + 5, soit y = 3x + 11.

**2. a)** g(1) = √4 = 2. Pour h ≠ 0 et h ≥ −4, avec la quantité conjuguée :

    (g(1 + h) − g(1)) / h = (√(4 + h) − 2) / h = (4 + h − 4) / (h(√(4 + h) + 2)) = 1 / (√(4 + h) + 2)

La fonction h ↦ 1 / (√(4 + h) + 2) est continue en 0, donc la limite quand h tend vers 0 vaut 1 / (2 + 2) = 1/4.
g est dérivable en 1 et g'(1) = 1/4. (On retrouve ce résultat avec la règle de √u : u(x) = x + 3 est dérivable et u(1) = 4 > 0, donc g'(1) = u'(1) / (2√(u(1))) = 1 / (2 × 2) = 1/4.)

**b)** Approximation affine : g(1 + h) ≈ g(1) + g'(1)h = 2 + h/4 pour h voisin de 0.

- √4.02 = g(1.02), h = 0.02 : √4.02 ≈ 2 + 0.005 = 2.005.
- √3.96 = g(0.96), h = −0.04 : √3.96 ≈ 2 − 0.01 = 1.99.

(La calculatrice donne √4.02 ≈ 2.004994 et √3.96 ≈ 1.989975.)

**c)** g(−3) = 0. Pour h > 0 :

    (g(−3 + h) − g(−3)) / h = √h / h = 1 / √h

Quand h tend vers 0 à droite, √h tend vers 0 en restant strictement positif, donc lim(h→0⁺) 1 / √h = +∞.
La limite n'est pas finie : g n'est pas dérivable à droite en −3. La courbe de g admet au point (−3, 0) une demi-tangente verticale, dirigée vers le haut (les points de la courbe ont une ordonnée positive).

**3. a)** Soit u(x) = √(x + 7). On a u(2) = 3, donc

    (√(x + 7) − 3) / (x − 2) = (u(x) − u(2)) / (x − 2)

La fonction x ↦ x + 7 est dérivable en 2 et vaut 9 > 0 en 2, donc u est dérivable en 2 et u'(2) = 1 / (2√9) = 1/6.
Par définition du nombre dérivé, la limite cherchée est u'(2) = 1/6.

**b)** Soit v(x) = (2x + 1)⁴. On a v(0) = 1, donc ((2x + 1)⁴ − 1) / x = (v(x) − v(0)) / (x − 0), qui tend vers v'(0).
v = w⁴ avec w(x) = 2x + 1, dérivable en 0, w(0) = 1 et w'(0) = 2. Donc v'(0) = 4 w'(0) w(0)³ = 4 × 2 × 1 = 8.
La limite cherchée vaut 8.

**4. a)** Les fonctions x ↦ x − 1 et x ↦ |x + 2| sont continues sur ℝ, donc leur produit k est continu sur ℝ, en particulier en −2. De plus k(−2) = (−3) × 0 = 0.

**b)** Pour h ≠ 0 : k(−2 + h) = (h − 3)|h|, donc

    (k(−2 + h) − k(−2)) / h = (h − 3)|h| / h

- Si h > 0 : |h| / h = 1, le rapport vaut h − 3, qui tend vers −3 quand h tend vers 0 à droite. Donc k est dérivable à droite en −2 et k'_d(−2) = −3.
- Si h < 0 : |h| / h = −1, le rapport vaut 3 − h, qui tend vers 3 quand h tend vers 0 à gauche. Donc k est dérivable à gauche en −2 et k'_g(−2) = 3.

**c)** k'_d(−2) ≠ k'_g(−2), donc k n'est pas dérivable en −2. La courbe admet au point (−2, 0) deux demi-tangentes (point anguleux) :

- à droite : y = −3(x + 2), soit y = −3x − 6, pour x ≥ −2 ;
- à gauche : y = 3(x + 2), soit y = 3x + 6, pour x ≤ −2.

---

## Exercice 2 — Problème : le profil d'un toboggan

Le plan est muni d'un repère orthonormé (O, i, j) ; l'unité est le mètre. Le profil d'un toboggan est la courbe 𝒞 de la fonction f définie sur [0, 4] par

    f(x) = mx + 4          si 0 ≤ x ≤ 2
    f(x) = k(x − 4)²       si 2 < x ≤ 4

où m et k sont deux réels, avec k > 0. L'enfant part du point D(0, 4) et arrive au sol au point B(4, 0).

1. Montrer que f est continue en 2 si et seulement si m = 2k − 2.
2. On suppose dans cette question que m = 2k − 2.
   a) Calculer le nombre dérivé à gauche de f en 2.
   b) Montrer que f est dérivable à droite en 2 et que f'_d(2) = −4k.
   c) Pour éviter un choc au passage de la partie droite à la partie courbe, on veut que f soit dérivable en 2. Déterminer alors k et m.
3. Dans la suite, k = 1/3 et m = −4/3.
   a) Calculer f(2) et donner une équation de la tangente à 𝒞 au point E d'abscisse 2. Que remarque-t-on ?
   b) Montrer que f est dérivable à gauche en 4 et calculer f'_g(4). Interpréter pour l'enfant.
   c) Montrer que f est dérivable sur [0, 4].
4. a) Calculer f'(a) pour tout réel a de ]2, 4[.
   b) Déterminer le point F de 𝒞 en lequel la tangente est parallèle à la droite d'équation y = −x. Donner une équation de cette tangente.
5. a) Montrer que pour tout réel h de ]−1, 1] : f(3 + h) = 1/3 − (2/3)h + (1/3)h².
   b) En déduire l'approximation affine de f(3 + h) pour h voisin de 0, puis une valeur approchée de la hauteur du toboggan à l'abscisse 3.03. Quelle est l'erreur commise ?

### Corrigé

**1.** Sur [0, 2], f(x) = mx + 4 : f(2) = 2m + 4, et f est continue à gauche en 2 (restriction affine).
Sur ]2, 4], f coïncide avec la fonction polynôme x ↦ k(x − 4)², qui est continue en 2. Donc lim(x→2⁺) f(x) = k(2 − 4)² = 4k.
f est continue en 2 ⟺ lim(x→2⁺) f(x) = f(2) ⟺ 4k = 2m + 4 ⟺ m = 2k − 2.

**2. a)** Pour −2 ≤ h < 0 :

    (f(2 + h) − f(2)) / h = (m(2 + h) + 4 − 2m − 4) / h = mh / h = m

Donc f est dérivable à gauche en 2 et f'_g(2) = m.

**b)** Pour 0 < h ≤ 2 : f(2 + h) = k(h − 2)², et f(2) = 2m + 4 = 4k (car m = 2k − 2). Donc

    (f(2 + h) − f(2)) / h = k((h − 2)² − 4) / h = k(h² − 4h) / h = k(h − 4)

qui tend vers −4k quand h tend vers 0 à droite. f est dérivable à droite en 2 et f'_d(2) = −4k.

**c)** f est dérivable en 2 ⟺ f'_g(2) = f'_d(2) ⟺ m = −4k.
Avec m = 2k − 2 : 2k − 2 = −4k ⟺ 6k = 2 ⟺ k = 1/3, puis m = −4/3. On a bien k > 0.
(La condition du 1. est nécessaire : une fonction dérivable en 2 est continue en 2.)

**3. a)** f(2) = 2 × (−4/3) + 4 = 4/3 (et aussi (1/3)(2 − 4)² = 4/3). f'(2) = m = −4/3.
Tangente en E(2, 4/3) : y = −(4/3)(x − 2) + 4/3, soit y = −(4/3)x + 4.
C'est exactement la droite qui porte la partie droite du toboggan : la partie droite est tangente à la partie courbe en E, le raccord se fait sans cassure.

**b)** f(4) = 0. Pour −2 ≤ h < 0 :

    (f(4 + h) − f(4)) / h = (1/3)h² / h = h/3

qui tend vers 0 quand h tend vers 0 à gauche. f est dérivable à gauche en 4 et f'_g(4) = 0.
La courbe admet en B(4, 0) une demi-tangente horizontale (y = 0, x ≤ 4) : l'enfant arrive au sol en glissant parallèlement au sol, sans choc.

**c)**

- Sur ]0, 2[, f est affine, donc dérivable.
- Sur ]2, 4[, f(x) = (1/3)(x − 4)², fonction de la forme x ↦ (x − α)² + β multipliée par une constante : f est dérivable.
- En 0 : pour 0 < h ≤ 2, (f(h) − f(0)) / h = m = −4/3, donc f est dérivable à droite en 0.
- En 2 : f est dérivable (2. c)). En 4 : f est dérivable à gauche (3. b)).

Donc f est dérivable sur ]0, 4[, à droite en 0 et à gauche en 4 : f est dérivable sur [0, 4].

**4. a)** Pour a ∈ ]2, 4[, f(x) = (1/3)(x − 4)² au voisinage de a, donc f'(a) = (1/3) × 2(a − 4) = (2/3)(a − 4).

**b)** La tangente est parallèle à la droite y = −x ⟺ son coefficient directeur vaut −1.

- Pour tout a de ]0, 2], f'(a) = m = −4/3 ≠ −1 (f est affine sur [0, 2], et dérivable en 2 d'après le 2. c)) ; en 0, le nombre dérivé à droite f'_d(0) vaut aussi −4/3 ≠ −1 ; en 4, le nombre dérivé à gauche f'_g(4) vaut 0 ≠ −1.
- Sur ]2, 4[ : (2/3)(a − 4) = −1 ⟺ a − 4 = −3/2 ⟺ a = 2.5, qui appartient bien à ]2, 4[.

f(2.5) = (1/3)(2.5 − 4)² = 2.25 / 3 = 0.75. Le point cherché est F(2.5, 0.75).
Tangente en F : y = −(x − 2.5) + 0.75, soit y = −x + 3.25.

**5. a)** Pour −1 < h ≤ 1, 3 + h appartient à ]2, 4], donc

    f(3 + h) = (1/3)(3 + h − 4)² = (1/3)(h − 1)² = (1/3)(h² − 2h + 1) = 1/3 − (2/3)h + (1/3)h²

**b)** f(3) = 1/3 et f'(3) = (2/3)(3 − 4) = −2/3. L'approximation affine est f(3 + h) ≈ 1/3 − (2/3)h pour h voisin de 0 (le terme (1/3)h² est négligeable).
Pour h = 0.03 : f(3.03) ≈ 1/3 − 0.02 ≈ 0.3133 m.
D'après le a), l'erreur commise est exactement (1/3)(0.03)² = 0.0009 / 3 = 0.0003 m, soit 0.3 mm (la valeur exacte est f(3.03) = 0.9409 / 3 ≈ 0.3136 m).
