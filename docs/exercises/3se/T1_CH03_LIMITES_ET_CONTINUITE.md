# 3ème Sc. exp. — Tome 1, Chapitre 3 : Limites et continuité

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17 : limite finie en un réel a, prolongement par continuité, opérations sur les limites finies, signe de la limite d'une fonction de signe constant. Notes p. 17 : utiliser les résultats sur les fonctions continues pour déterminer une limite finie, utiliser une transformation d'écriture adéquate.
- Manuel CNP (p. 40–55) : définition avec β et α, unicité de la limite (admise), « si g est continue en a et g(x) = f(x) pour x ≠ a, alors f a pour limite g(a) en a », limite à droite et à gauche, limite de √f quand f est positive. Les limites infinies et les limites en l'infini ne sont vues qu'au chapitre 4 : les corrigés n'en utilisent pas.
- Outils autorisés : chapitres 1 à 3 (pas de limites infinies, pas de limites en l'infini, pas de dérivées).
- Notation : lim(x→a) f(x) est la limite de f(x) quand x tend vers a ; lim(x→a⁺) f(x) et lim(x→a⁻) f(x) sont les limites à droite et à gauche en a.
- Toutes les valeurs sont vérifiées par `check_t1_ch03.py` (calcul exact en fractions ; contrôle numérique pour les racines carrées).

---

## Exercice 1 — Calcul de limites, limite à droite et à gauche, prolongement par continuité

### Partie A

1. Calculer les limites suivantes, en justifiant.
   a) lim(x→2) (x³ − 8) / (x² − 4)
   b) lim(x→1) (√(x + 3) − 2) / (x − 1)
   c) lim(x→3) √((x² − 9) / (x − 3))
   d) lim(x→−1) (x² + 3x + 2) / (|x| − 1)
2. Soit h la fonction définie sur ℝ \ {0} par

       h(x) = (2x² + |x|) / x

   a) Écrire h(x) sans valeur absolue pour x > 0, puis pour x < 0.
   b) Calculer lim(x→0⁺) h(x) et lim(x→0⁻) h(x).
   c) La fonction h admet-elle une limite en 0 ? Est-elle prolongeable par continuité en 0 ?

### Partie B

Soit f la fonction définie par

    f(x) = (x² − 3x + 2) / (√x − 1)

1. Déterminer l'ensemble de définition D_f de f.
2. Montrer que pour tout x de D_f : f(x) = (x − 2)(√x + 1).
3. En déduire lim(x→1) f(x).
4. Montrer que f est prolongeable par continuité en 1 et définir son prolongement F.
5. Montrer que F est continue sur [0, +∞[.

### Corrigé — Partie A

**1. a)** Pour x ≠ 2 et x ≠ −2 : x³ − 8 = (x − 2)(x² + 2x + 4) et x² − 4 = (x − 2)(x + 2), donc

    (x³ − 8) / (x² − 4) = (x² + 2x + 4) / (x + 2)

La fonction rationnelle g : x ↦ (x² + 2x + 4) / (x + 2) est définie en 2, donc continue en 2, et elle coïncide avec la fonction étudiée pour tout x ≠ 2 de ]0, 3[. La limite vaut donc g(2) = 12 / 4 = 3.

**b)** Pour x ≥ −3 et x ≠ 1, on multiplie par la quantité conjuguée √(x + 3) + 2, qui est strictement positive :

    (√(x + 3) − 2) / (x − 1) = (x + 3 − 4) / ((x − 1)(√(x + 3) + 2)) = 1 / (√(x + 3) + 2)

La fonction x ↦ 1 / (√(x + 3) + 2) est continue sur [−3, +∞[, donc en 1. La limite vaut 1 / (√4 + 2) = 1/4.

**c)** Posons u(x) = (x² − 9) / (x − 3). Pour x ≠ 3 : u(x) = (x − 3)(x + 3) / (x − 3) = x + 3.
Sur ]0, 6[ privé de 3, u(x) = x + 3 > 0 et, comme x ↦ x + 3 est continue en 3, lim(x→3) u(x) = 6.
u est positive au voisinage de 3 et admet la limite 6 en 3, donc lim(x→3) √(u(x)) = √6.

**d)** Pour x ∈ ]−2, 0[ : |x| = −x, donc |x| − 1 = −(x + 1). De plus x² + 3x + 2 = (x + 1)(x + 2).
Donc pour x ∈ ]−2, 0[ et x ≠ −1 :

    (x² + 3x + 2) / (|x| − 1) = (x + 1)(x + 2) / (−(x + 1)) = −(x + 2)

La fonction x ↦ −(x + 2) est continue en −1 : la limite vaut −(−1 + 2) = −1.

**2. a)**

- Si x > 0 : |x| = x, donc h(x) = (2x² + x) / x = 2x + 1.
- Si x < 0 : |x| = −x, donc h(x) = (2x² − x) / x = 2x − 1.

**b)** La fonction x ↦ 2x + 1 est continue à droite en 0 et coïncide avec h sur ]0, +∞[ : lim(x→0⁺) h(x) = 2(0) + 1 = 1.
De même, x ↦ 2x − 1 est continue à gauche en 0 et coïncide avec h sur ]−∞, 0[ : lim(x→0⁻) h(x) = −1.

**c)** h admet une limite L en 0 si et seulement si ses limites à droite et à gauche en 0 existent et sont égales à L. Ici 1 ≠ −1 : h n'admet pas de limite en 0.
Une fonction prolongeable par continuité en 0 doit admettre une limite finie en 0 : h n'est donc pas prolongeable par continuité en 0.
(Graphiquement : deux demi-droites ouvertes, l'une qui « arrive » au point (0, −1), l'autre qui « part » du point (0, 1).)

### Corrigé — Partie B

**1.** f(x) existe ⟺ x ≥ 0 et √x − 1 ≠ 0 ⟺ x ≥ 0 et x ≠ 1.
D_f = [0, 1[ ∪ ]1, +∞[.

**2.** 1 est une racine de x² − 3x + 2, donc x² − 3x + 2 = (x − 1)(x − 2).
Pour x ≥ 0 : x − 1 = (√x)² − 1 = (√x − 1)(√x + 1).
Donc pour x ∈ D_f : f(x) = (√x − 1)(√x + 1)(x − 2) / (√x − 1) = (x − 2)(√x + 1).

**3.** La fonction φ : x ↦ (x − 2)(√x + 1) est continue sur [0, +∞[ (produit de fonctions continues), donc en 1. Elle coïncide avec f sur ]0, 2[ privé de 1.
Donc lim(x→1) f(x) = φ(1) = (1 − 2)(1 + 1) = −2.

**4.** f est définie sur l'intervalle ouvert ]0, 2[ sauf en 1, et elle admet en 1 la limite finie −2. Donc f est prolongeable par continuité en 1. Son prolongement F est défini sur [0, +∞[ par

    F(x) = f(x)    si x ∈ D_f
    F(1) = −2

Autrement dit, d'après le 2., F(x) = (x − 2)(√x + 1) pour tout x ≥ 0.

**5.** Sur [0, +∞[, F = φ. La fonction x ↦ √x est continue sur [0, +∞[ et x ↦ x − 2 est affine, donc continue. Leur combinaison φ (somme et produit) est continue sur [0, +∞[ : F est continue sur [0, +∞[ (en particulier continue à droite en 0, avec F(0) = −2).

---

## Exercice 2 — Problème : choisir des paramètres pour obtenir une fonction continue

Soit a et b deux réels et f la fonction définie sur ℝ \ {1} par

    f(x) = (x² + ax + b) / (x − 1)

1. On suppose que f admet une limite finie L en 1.
   a) Vérifier que pour tout x ≠ 1 : x² + ax + b = (x − 1) f(x). En déduire que 1 + a + b = 0.
   b) Montrer alors que pour tout x ≠ 1 : f(x) = x + 1 + a, et exprimer L en fonction de a.
2. Déterminer a et b pour que lim(x→1) f(x) = 3.
3. Dans la suite, a = 1 et b = −2. Soit m un réel et g la fonction définie sur ℝ par

       g(x) = (x² + x − 2) / (x − 1)          si x < 1
       g(1) = 3
       g(x) = m (√(2x + 7) − 3) / (x − 1)     si x > 1

   a) Montrer que g est continue à gauche en 1.
   b) Montrer que pour tout x > 1 : (√(2x + 7) − 3) / (x − 1) = 2 / (√(2x + 7) + 3). En déduire lim(x→1⁺) (√(2x + 7) − 3) / (x − 1).
   c) Déterminer m pour que g soit continue en 1.
4. Dans la suite, m = 9.
   a) Montrer que g est continue sur ℝ.
   b) Montrer que pour tout x > 1 : 0 < g(x) < 3.
   c) En déduire que 3 est le maximum de g sur ℝ.
5. Résoudre dans ℝ l'équation g(x) = 2.

### Corrigé

**1. a)** Pour x ≠ 1, f(x) = (x² + ax + b) / (x − 1), donc (x − 1) f(x) = x² + ax + b.
On a lim(x→1) (x − 1) = 0 et lim(x→1) f(x) = L, donc, par produit, lim(x→1) (x − 1) f(x) = 0 × L = 0.
D'autre part, la fonction polynôme P : x ↦ x² + ax + b est continue en 1, donc lim(x→1) P(x) = P(1) = 1 + a + b.
Les deux fonctions sont égales pour x ≠ 1 ; par unicité de la limite : 1 + a + b = 0.

**b)** On a b = −1 − a, donc

    x² + ax + b = (x² − 1) + a(x − 1) = (x − 1)(x + 1 + a)

Pour x ≠ 1 : f(x) = x + 1 + a. La fonction x ↦ x + 1 + a est continue en 1, donc L = 1 + 1 + a = a + 2.

**2.** Si lim(x→1) f(x) = 3, le 1. donne b = −1 − a et a + 2 = 3, donc a = 1 et b = −2.
Réciproquement, pour a = 1 et b = −2 : x² + x − 2 = (x − 1)(x + 2), donc f(x) = x + 2 pour x ≠ 1, et lim(x→1) f(x) = 3.
Conclusion : a = 1 et b = −2.

**3. a)** Pour x < 1, g(x) = x + 2 (d'après le 2.), et g(1) = 3 = 1 + 2. Donc g(x) = x + 2 pour tout x de ]−∞, 1].
La restriction de g à ]−∞, 1] est affine, donc continue : g est continue à gauche en 1.

**b)** Pour x > 1 : 2x + 7 > 0 et √(2x + 7) + 3 > 0. Avec la quantité conjuguée :

    (√(2x + 7) − 3) / (x − 1) = (2x + 7 − 9) / ((x − 1)(√(2x + 7) + 3)) = 2(x − 1) / ((x − 1)(√(2x + 7) + 3)) = 2 / (√(2x + 7) + 3)

La fonction x ↦ 2 / (√(2x + 7) + 3) est continue sur [−3.5, +∞[, donc continue à droite en 1, et elle coïncide avec l'expression étudiée sur ]1, +∞[. Donc

    lim(x→1⁺) (√(2x + 7) − 3) / (x − 1) = 2 / (√9 + 3) = 2/6 = 1/3

**c)** D'après le b), lim(x→1⁺) g(x) = m × 1/3 = m/3.
g est continue en 1 ⟺ g est continue à gauche et à droite en 1. La continuité à gauche est acquise (a). g est continue à droite en 1 ⟺ lim(x→1⁺) g(x) = g(1) ⟺ m/3 = 3 ⟺ m = 9.

**4. a)** Pour m = 9 et x > 1 : g(x) = 18 / (√(2x + 7) + 3).

- Sur ]−∞, 1[, g(x) = x + 2 : g est continue (fonction affine).
- Sur ]1, +∞[, x ↦ 2x + 7 est affine et strictement positive, donc x ↦ √(2x + 7) est continue ; le dénominateur √(2x + 7) + 3 est continu et ne s'annule pas : g est continue (quotient).
- En 1, g est continue d'après le 3. c).

Donc g est continue sur ℝ.

**b)** Soit x > 1. Alors 2x + 7 > 9, donc √(2x + 7) > 3 (la fonction racine carrée est strictement croissante), d'où √(2x + 7) + 3 > 6 > 0.
Donc 0 < 18 / (√(2x + 7) + 3) < 18/6 = 3, c'est-à-dire 0 < g(x) < 3.

**c)** Pour x < 1 : g(x) = x + 2 < 3. Pour x > 1 : g(x) < 3 d'après le b). Et g(1) = 3.
Donc g(x) ≤ 3 pour tout réel x et la valeur 3 est atteinte (en 1 seulement) : 3 est le maximum de g sur ℝ.

**5.**

- Sur ]−∞, 1[ : x + 2 = 2 ⟺ x = 0, qui appartient bien à ]−∞, 1[.
- En 1 : g(1) = 3 ≠ 2.
- Sur ]1, +∞[ : 18 / (√(2x + 7) + 3) = 2 ⟺ √(2x + 7) + 3 = 9 ⟺ √(2x + 7) = 6 ⟺ 2x + 7 = 36 ⟺ x = 14.5, qui appartient bien à ]1, +∞[.

S = {0 ; 14.5}.
