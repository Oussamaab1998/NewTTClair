# 3ème Sc. exp. — Tome 1, Chapitre 2 : Continuité

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17 : continuité en un réel, opérations sur les fonctions continues, continuité sur un intervalle, image d'un intervalle par une fonction continue, résolution d'équations f(x) = k (théorème admis), dichotomie.
- Manuel CNP : définition avec β et α, continuité à droite / à gauche, continuité de |f| et de √f. Les limites ne sont vues qu'au chapitre 3 : les corrigés n'en utilisent pas.
- Toutes les valeurs sont vérifiées par `check_t1_ch1_ch2.py` (calcul exact en fractions).

---

## Exercice 1 — Continuité en un réel, à droite et à gauche

### Partie A

Soit m un réel et f la fonction définie sur ℝ par

    f(x) = x² + mx − 1     si x < 1
    f(x) = √(x + 3)        si x ≥ 1

1. Montrer que f est continue à droite en 1.
2. Déterminer la valeur de m pour laquelle f est continue en 1.
3. Dans cette question, m = 2. Montrer que f est continue sur ℝ.

### Partie B

Soit g la fonction définie sur ℝ par

    g(x) = (x² − 4) / |x − 2|     si x ≠ 2
    g(2) = 4

1. Montrer que g(x) = x + 2 pour tout x > 2, et g(x) = −x − 2 pour tout x < 2.
2. Montrer que g est continue à droite en 2.
3. a) Montrer que pour tout x de ]1, 2[ : |g(x) − g(2)| > 7.
   b) En déduire que g n'est pas continue à gauche en 2. La fonction g est-elle continue en 2 ?
4. Représenter g dans un repère orthonormé.

### Corrigé — Partie A

**1.** La fonction u : x ↦ x + 3 est affine, donc continue, et elle est positive sur [1, +∞[ (u(x) ≥ 4). Donc la fonction x ↦ √(x + 3) est continue sur [1, +∞[.
Comme f(x) = √(x + 3) pour tout x ≥ 1, f est continue à droite en 1, et f(1) = √4 = 2.

**2.** Soit P la fonction polynôme P(x) = x² + mx − 1. Elle est continue en 1 et f(x) = P(x) pour tout x < 1.

- Si P(1) = f(1), alors f coïncide avec P sur ]−∞, 1] : f est continue à gauche en 1.
- Si P(1) ≠ f(1), alors pour x < 1 proche de 1, |f(x) − f(1)| = |P(x) − f(1)| reste proche de |P(1) − f(1)| ≠ 0. On ne peut pas le rendre aussi petit que l'on veut : f n'est pas continue à gauche en 1.

Or P(1) = 1 + m − 1 = m et f(1) = 2. Donc f est continue à gauche en 1 ⟺ m = 2.
f est continue en 1 ⟺ f est continue à droite et à gauche en 1 ⟺ m = 2 (la continuité à droite est acquise par le 1.).

**3.** Pour m = 2 :

- Sur ]−∞, 1[, f(x) = x² + 2x − 1 : f est un polynôme sur cet intervalle, donc continue.
- Sur ]1, +∞[, f(x) = √(x + 3) avec x + 3 > 0 et x ↦ x + 3 continue : f est continue.
- En 1, f est continue d'après le 2.

Donc f est continue sur ℝ.

### Corrigé — Partie B

**1.** Pour x ≠ 2 : x² − 4 = (x − 2)(x + 2).

- Si x > 2 : |x − 2| = x − 2, donc g(x) = (x − 2)(x + 2) / (x − 2) = x + 2.
- Si x < 2 : |x − 2| = −(x − 2), donc g(x) = −(x + 2) = −x − 2.

**2.** Pour x > 2, g(x) = x + 2, et pour x = 2, 2 + 2 = 4 = g(2). Donc g(x) = x + 2 pour tout x de [2, +∞[.
La restriction de g à [2, +∞[ est affine, donc continue : g est continue à droite en 2.

**3. a)** Pour 1 < x < 2 : g(x) − g(2) = −x − 2 − 4 = −(x + 6), donc |g(x) − g(2)| = x + 6 > 1 + 6 = 7.

**b)** Prenons β = 1. Quel que soit α > 0, le réel x = 2 − (1/2)·min(α, 1) vérifie 0 ≤ 2 − x < α et x ∈ ]1, 2[. Donc |g(x) − g(2)| > 7 > β.
Ainsi on ne peut pas rendre |g(x) − g(2)| plus petit que 1 en prenant x proche de 2 à gauche : g n'est pas continue à gauche en 2.
Une fonction continue en 2 doit être continue à droite et à gauche en 2 : g n'est donc pas continue en 2.

**4.** Pour x ≥ 2 : demi-droite d'équation y = x + 2, partant du point (2, 4) (inclus).
Pour x < 2 : demi-droite d'équation y = −x − 2, qui s'arrête au point (2, −4) (exclu).
La courbe « saute » de −4 à 4 en x = 2 : on ne peut pas la tracer sans lever le crayon.

---

## Exercice 2 — Image d'un intervalle, équation f(x) = k, dichotomie

Soit f la fonction définie sur ℝ par

    f(x) = x³ + x − 1

1. Justifier que f est continue sur ℝ.
2. Montrer que f est strictement croissante sur ℝ.
3. a) Calculer f(0) et f(1).
   b) Montrer que l'équation f(x) = 0 admet une unique solution α dans ℝ et que 0 < α < 1.
4. a) On applique la méthode de dichotomie à partir de l'intervalle [0, 1]. Recopier et compléter le tableau (4 étapes) :

       intervalle | milieu c | f(c) | signe de f(c) | nouvel encadrement de α

   b) En déduire un encadrement de α d'amplitude 0.0625, puis une valeur approchée de α à 0.1 près par défaut.
5. Déterminer le signe de f(x) suivant les valeurs du réel x.
6. a) Déterminer f([0, 1]) et f([−1, 2]).
   b) En déduire que l'équation x³ + x = 5 admet une unique solution β dans ℝ et que 1 < β < 2.

### Corrigé

**1.** f est une fonction polynôme, donc elle est continue sur ℝ.

**2.** Soit a < b deux réels. On a a³ < b³, car b³ − a³ = (b − a)(a² + ab + b²) = (b − a)[(a + b/2)² + 3b²/4], où b − a > 0 et le crochet est strictement positif (il ne s'annule que si a = b = 0). On a aussi a − 1 < b − 1. En additionnant : a³ + a − 1 < b³ + b − 1, soit f(a) < f(b).
f est strictement croissante sur ℝ (somme de deux fonctions strictement croissantes).

**3. a)** f(0) = −1 et f(1) = 1 + 1 − 1 = 1.

**b)** Existence : f est continue sur [0, 1] et 0 est compris entre f(0) = −1 et f(1) = 1. D'après le théorème admis, l'équation f(x) = 0 possède au moins une solution α dans [0, 1]. Comme f(0) ≠ 0 et f(1) ≠ 0, on a 0 < α < 1.
Unicité : f est strictement croissante sur ℝ. Si x < α alors f(x) < f(α) = 0, et si x > α alors f(x) > 0. Donc α est la seule solution dans ℝ.

**4. a)**

    intervalle        | milieu c | f(c)              | signe | nouvel encadrement
    [0, 1]            | 0.5      | −0.375            |  −    | 0.5 < α < 1
    [0.5, 1]          | 0.75     |  0.171875         |  +    | 0.5 < α < 0.75
    [0.5, 0.75]       | 0.625    | −0.130859375      |  −    | 0.625 < α < 0.75
    [0.625, 0.75]     | 0.6875   |  0.012451171875   |  +    | 0.625 < α < 0.6875

Règle : si f(c) < 0, alors f(c) < f(α) et donc c < α (f est croissante) : on garde la moitié droite. Si f(c) > 0, on garde la moitié gauche.

**b)** 0.625 < α < 0.6875 : c'est un encadrement d'amplitude 0.6875 − 0.625 = 0.0625.
On en déduit 0.6 < α < 0.7 : une valeur approchée de α à 0.1 près par défaut est 0.6.
(Pour information, α ≈ 0.6823.)

**5.** f est strictement croissante et f(α) = 0, donc :

- f(x) < 0 pour x < α ;
- f(α) = 0 ;
- f(x) > 0 pour x > α.

**6. a)** f est continue sur [0, 1], donc f([0, 1]) est un intervalle. Pour 0 ≤ x ≤ 1, f(0) ≤ f(x) ≤ f(1) car f est croissante. Cet intervalle contient f(0) = −1 et f(1) = 1 et il est contenu dans [−1, 1], donc f([0, 1]) = [−1, 1].
De même, f(−1) = −1 − 1 − 1 = −3 et f(2) = 8 + 2 − 1 = 9, donc f([−1, 2]) = [−3, 9].

**b)** x³ + x = 5 ⟺ x³ + x − 1 = 4 ⟺ f(x) = 4.
f est continue sur [1, 2] et 4 est compris entre f(1) = 1 et f(2) = 9 : l'équation possède au moins une solution β dans [1, 2]. Comme f(1) ≠ 4 et f(2) ≠ 4, on a 1 < β < 2.
f est strictement croissante sur ℝ, donc cette solution est unique. (Pour information, β ≈ 1.516.)
