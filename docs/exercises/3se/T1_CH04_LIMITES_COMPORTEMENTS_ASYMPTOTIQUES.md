# 3ème Sc. exp. — Tome 1, Chapitre 4 : Limites et comportements asymptotiques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17 : limites finies ou infinies, asymptotes, opérations sur les limites finies ou infinies, limites des fonctions usuelles. Notes p. 17–18 : interpréter graphiquement les limites en termes d'asymptotes ; pour une asymptote oblique y = ax + b, montrer que f(x) − (ax + b) a pour limite 0 quand x tend vers l'infini.
- Manuel CNP (p. 56–79) : définitions avec A, B et β ; tableaux des opérations sur les limites (admis) ; en l'infini, un polynôme a la limite de son terme de plus haut degré et une fonction rationnelle celle du quotient de ses termes de plus haut degré ; limite de √f (admis) ; asymptotes horizontales, verticales et obliques ; position d'une courbe par rapport à une asymptote.
- Outils autorisés : chapitres 1 à 4 (pas de dérivées : aucun sens de variation n'est étudié ici).
- Notation : lim(x→+∞) f(x), lim(x→−∞) f(x), lim(x→a⁺) f(x) et lim(x→a⁻) f(x) (limites à droite et à gauche en a).
- Toutes les valeurs sont vérifiées par `check_t1_ch04.py` (calcul exact en fractions ; contrôle numérique pour les limites et les racines carrées).

---

## Exercice 1 — Calcul de limites, asymptotes d'une fonction rationnelle

### Partie A

1. Calculer les limites suivantes.
   a) lim(x→−∞) (−2x³ + 5x² − 7)
   b) lim(x→+∞) (3x² − x + 4) / (1 − 2x²)
   c) lim(x→−∞) (x² + 1) / (x + 3)
   d) lim(x→3⁻) (x + 1) / (x − 3) et lim(x→3⁺) (x + 1) / (x − 3)
2. Interpréter graphiquement les résultats du 1. b) et du 1. d).
3. a) Montrer que pour tout réel x > 0 :

       √(x² + 4x) − x = 4 / (√(1 + 4/x) + 1)

   b) En déduire lim(x→+∞) (√(x² + 4x) − x), puis montrer que la droite d'équation y = x + 2 est une asymptote à la courbe de la fonction x ↦ √(x² + 4x) au voisinage de +∞.

### Partie B

Soit f la fonction définie sur ℝ \ {2} par

    f(x) = (2x² − 3x − 1) / (x − 2)

On note 𝒞 sa courbe représentative dans un repère orthonormé (O, i, j).

1. Déterminer les réels a, b et c tels que pour tout x ≠ 2 : f(x) = ax + b + c / (x − 2).
2. Calculer les limites de f en −∞, en +∞, à gauche en 2 et à droite en 2. Quelle asymptote à 𝒞 obtient-on ?
3. Soit Δ la droite d'équation y = 2x + 1.
   a) Montrer que Δ est une asymptote à 𝒞 au voisinage de +∞ et au voisinage de −∞.
   b) Étudier la position de 𝒞 par rapport à Δ.
   c) Pour x ≠ 2, on note M et P les points de 𝒞 et de Δ d'abscisse x. Calculer MP en fonction de x, puis déterminer les réels x pour lesquels MP < 0.01.
4. Soit I le point d'intersection des deux asymptotes à 𝒞.
   a) Donner les coordonnées de I.
   b) Pour x ≠ 2, soit M(x, f(x)) et N le symétrique de M par rapport à I. Exprimer les coordonnées de N en fonction de x et de f(x).
   c) Montrer que N appartient à 𝒞. Conclure.

### Corrigé — Partie A

**1. a)** En l'infini, un polynôme a la même limite que son terme de plus haut degré : lim(x→−∞) (−2x³ + 5x² − 7) = lim(x→−∞) (−2x³).
Comme lim(x→−∞) x³ = −∞ et −2 < 0, la limite vaut +∞.

**b)** En l'infini, une fonction rationnelle a la même limite que le quotient de ses termes de plus haut degré :

    lim(x→+∞) (3x² − x + 4) / (1 − 2x²) = lim(x→+∞) 3x² / (−2x²) = −3/2

**c)** De même : lim(x→−∞) (x² + 1) / (x + 3) = lim(x→−∞) x² / x = lim(x→−∞) x = −∞.

**d)** lim(x→3) (x + 1) = 4 > 0.

- Quand x tend vers 3 à gauche, x − 3 tend vers 0 en restant strictement négatif : lim(x→3⁻) (x + 1) / (x − 3) = −∞.
- Quand x tend vers 3 à droite, x − 3 tend vers 0 en restant strictement positif : lim(x→3⁺) (x + 1) / (x − 3) = +∞.

**2.** D'après le 1. b), la droite d'équation y = −3/2 est une asymptote horizontale à la courbe de x ↦ (3x² − x + 4) / (1 − 2x²) au voisinage de +∞.
D'après le 1. d), la droite d'équation x = 3 est une asymptote verticale (à gauche et à droite en 3) à la courbe de x ↦ (x + 1) / (x − 3).

**3. a)** Soit x > 0. Alors x² + 4x > 0 et √(x² + 4x) + x > 0. Avec la quantité conjuguée :

    √(x² + 4x) − x = (x² + 4x − x²) / (√(x² + 4x) + x) = 4x / (√(x² + 4x) + x)

Comme x > 0 : √(x² + 4x) = √(x² (1 + 4/x)) = √(x²) × √(1 + 4/x) = x √(1 + 4/x). En divisant le numérateur et le dénominateur par x :

    √(x² + 4x) − x = 4x / (x √(1 + 4/x) + x) = 4 / (√(1 + 4/x) + 1)

**b)** lim(x→+∞) 4/x = 0, donc lim(x→+∞) (1 + 4/x) = 1. Comme 1 + 4/x > 0 pour x > 0, lim(x→+∞) √(1 + 4/x) = √1 = 1.
Donc lim(x→+∞) (√(x² + 4x) − x) = 4 / (1 + 1) = 2.
Ensuite √(x² + 4x) − (x + 2) = (√(x² + 4x) − x) − 2, qui tend vers 2 − 2 = 0 quand x tend vers +∞ : la droite y = x + 2 est une asymptote (oblique) à la courbe de x ↦ √(x² + 4x) au voisinage de +∞.

### Corrigé — Partie B

**1.** Pour x ≠ 2 :

    ax + b + c / (x − 2) = (ax² + (b − 2a)x − 2b + c) / (x − 2)

Par identification avec 2x² − 3x − 1 : a = 2, b − 2a = −3 donc b = 1, −2b + c = −1 donc c = 1.
Contrôle : (2x + 1)(x − 2) + 1 = 2x² − 3x − 2 + 1 = 2x² − 3x − 1. Donc

    f(x) = 2x + 1 + 1 / (x − 2)

**2.**

- En +∞ : f est rationnelle, lim(x→+∞) f(x) = lim(x→+∞) 2x² / x = lim(x→+∞) 2x = +∞.
- En −∞ : de même, lim(x→−∞) f(x) = lim(x→−∞) 2x = −∞.
- En 2 : lim(x→2) (2x + 1) = 5, lim(x→2⁻) 1 / (x − 2) = −∞ et lim(x→2⁺) 1 / (x − 2) = +∞. Par somme : lim(x→2⁻) f(x) = −∞ et lim(x→2⁺) f(x) = +∞.

La droite d'équation x = 2 est une asymptote verticale à 𝒞.

**3. a)** Pour x ≠ 2 : f(x) − (2x + 1) = 1 / (x − 2). Or lim(x→+∞) 1 / (x − 2) = 0 et lim(x→−∞) 1 / (x − 2) = 0.
Donc Δ : y = 2x + 1 est une asymptote oblique à 𝒞 au voisinage de +∞ et au voisinage de −∞.

**b)** La position est donnée par le signe de f(x) − (2x + 1) = 1 / (x − 2) :

- si x > 2 : 1 / (x − 2) > 0, 𝒞 est au-dessus de Δ ;
- si x < 2 : 1 / (x − 2) < 0, 𝒞 est au-dessous de Δ.

𝒞 et Δ n'ont aucun point commun.

**c)** M(x, f(x)) et P(x, 2x + 1) ont la même abscisse, donc MP = |f(x) − (2x + 1)| = 1 / |x − 2|.
MP < 0.01 ⟺ 1 / |x − 2| < 0.01 ⟺ |x − 2| > 100 ⟺ x < −98 ou x > 102.

**4. a)** Les asymptotes x = 2 et y = 2x + 1 se coupent au point d'abscisse 2 et d'ordonnée 2 × 2 + 1 = 5 : I(2, 5).

**b)** I est le milieu de [MN], donc x_N = 2 × 2 − x = 4 − x et y_N = 2 × 5 − f(x) = 10 − f(x) : N(4 − x, 10 − f(x)).

**c)** Comme x ≠ 2, on a 4 − x ≠ 2, donc 4 − x appartient à ℝ \ {2}, et

    f(4 − x) = 2(4 − x) + 1 + 1 / (4 − x − 2) = 9 − 2x − 1 / (x − 2)

Donc f(4 − x) + f(x) = 9 − 2x + 2x + 1 = 10, soit f(4 − x) = 10 − f(x) : le point N(4 − x, 10 − f(x)) est le point de 𝒞 d'abscisse 4 − x, donc N appartient à 𝒞.
Conclusion : le symétrique par rapport à I de tout point de 𝒞 est un point de 𝒞, donc I(2, 5) est un centre de symétrie de 𝒞.

---

## Exercice 2 — Problème : distance d'une voiture à une antenne

Le plan est muni d'un repère orthonormé (O, i, j) ; l'unité est le kilomètre. Une route rectiligne est représentée par l'axe des abscisses. Une antenne est placée au point A(−1, 2). Une voiture roule sur la route ; quand elle est au point M(x, 0), on note d(x) la distance AM. On note 𝒞 la courbe représentative de d dans un autre repère orthonormé.

1. a) Montrer que pour tout réel x : d(x) = √(x² + 2x + 5).
   b) Justifier que d est définie et continue sur ℝ.
2. a) Montrer que pour tout réel x : d(−2 − x) = d(x). En considérant le symétrique d'un point Q(x, d(x)) de 𝒞 par rapport à la droite d'équation x = −1, en déduire que cette droite est un axe de symétrie de 𝒞. Interpréter pour la voiture.
   b) Montrer que d(x) ≥ 2 pour tout réel x. Pour quelle position de la voiture la distance à l'antenne est-elle minimale ?
3. Calculer lim(x→+∞) d(x) et lim(x→−∞) d(x).
4. a) Montrer que pour tout réel x : d(x) > |x + 1|. En déduire que d(x) + x + 1 > 0 et d(x) − x − 1 > 0.
   b) Montrer que pour tout réel x : d(x) − (x + 1) = 4 / (d(x) + x + 1).
   c) En déduire que la droite Δ d'équation y = x + 1 est une asymptote à 𝒞 au voisinage de +∞, et préciser la position de 𝒞 par rapport à Δ.
   d) Montrer de même que la droite Δ' d'équation y = −x − 1 est une asymptote à 𝒞 au voisinage de −∞. Vérifier que Δ et Δ' sont symétriques par rapport à la droite d'équation x = −1.
5. On note H le point (−1, 0) et on suppose x ≥ −1, de sorte que HM = x + 1.
   a) Montrer que d(x) − HM < 0.1 ⟺ x > 18.95. Interpréter.
   b) La voiture est au point d'abscisse 25. Sans calculer de racine carrée, donner un encadrement de d(25) d'amplitude 0.1.

### Corrigé

**1. a)** AM = √((x − (−1))² + (0 − 2)²) = √((x + 1)² + 4) = √(x² + 2x + 5).

**b)** Pour tout réel x : x² + 2x + 5 = (x + 1)² + 4 ≥ 4 > 0, donc d est définie sur ℝ.
La fonction x ↦ x² + 2x + 5 est un polynôme, continue et strictement positive sur ℝ, donc sa racine carrée d est continue sur ℝ.

**2. a)** Pour tout réel x, −2 − x est réel et

    d(−2 − x) = √((−2 − x + 1)² + 4) = √((−x − 1)² + 4) = √((x + 1)² + 4) = d(x)

Soit Q(x, d(x)) un point de 𝒞. Son symétrique par rapport à la droite d'équation x = −1 est Q'(−2 − x, d(x)) (même ordonnée, et −1 est le milieu des abscisses x et −2 − x). Comme −2 − x ∈ ℝ et d(−2 − x) = d(x), Q' appartient à 𝒞 : la droite d'équation x = −1 est un axe de symétrie de 𝒞.
Pour la voiture : deux positions symétriques par rapport au point H(−1, 0) sont à la même distance de l'antenne (H est le pied de la perpendiculaire à la route passant par A).

**b)** (x + 1)² ≥ 0, donc x² + 2x + 5 ≥ 4, et, la fonction racine carrée étant croissante, d(x) ≥ √4 = 2.
De plus d(x) = 2 ⟺ (x + 1)² = 0 ⟺ x = −1. La distance minimale est 2 km, atteinte seulement quand la voiture est en H(−1, 0).

**3.** lim(x→+∞) (x² + 2x + 5) = lim(x→+∞) x² = +∞, donc lim(x→+∞) d(x) = +∞.
De même, lim(x→−∞) (x² + 2x + 5) = lim(x→−∞) x² = +∞, donc lim(x→−∞) d(x) = +∞.

**4. a)** d(x)² = (x + 1)² + 4 > (x + 1)² = |x + 1|². Comme d(x) ≥ 0 et |x + 1| ≥ 0, on obtient d(x) > |x + 1|.
Or |x + 1| ≥ −(x + 1) et |x + 1| ≥ x + 1. Donc d(x) > −(x + 1), soit d(x) + x + 1 > 0, et d(x) > x + 1, soit d(x) − x − 1 > 0.

**b)** Le dénominateur d(x) + x + 1 n'est pas nul (a), donc

    d(x) − (x + 1) = (d(x)² − (x + 1)²) / (d(x) + x + 1) = ((x + 1)² + 4 − (x + 1)²) / (d(x) + x + 1) = 4 / (d(x) + x + 1)

**c)** lim(x→+∞) d(x) = +∞ et lim(x→+∞) (x + 1) = +∞, donc lim(x→+∞) (d(x) + x + 1) = +∞ et lim(x→+∞) 4 / (d(x) + x + 1) = 0.
Donc lim(x→+∞) (d(x) − (x + 1)) = 0 : Δ : y = x + 1 est une asymptote oblique à 𝒞 au voisinage de +∞.
Position : d(x) − (x + 1) > 0 pour tout réel x (a), donc 𝒞 est au-dessus de Δ.

**d)** Le dénominateur d(x) − x − 1 n'est pas nul (a), donc

    d(x) − (−x − 1) = d(x) + (x + 1) = (d(x)² − (x + 1)²) / (d(x) − (x + 1)) = 4 / (d(x) − x − 1)

lim(x→−∞) d(x) = +∞ et lim(x→−∞) (−x − 1) = +∞, donc lim(x→−∞) (d(x) − x − 1) = +∞ et lim(x→−∞) (d(x) − (−x − 1)) = 0 : Δ' : y = −x − 1 est une asymptote oblique à 𝒞 au voisinage de −∞ (et 𝒞 est au-dessus de Δ').
Symétrie : le symétrique du point (x, x + 1) de Δ par rapport à la droite x = −1 est le point (−2 − x, x + 1), et −(−2 − x) − 1 = x + 1 : ce point est sur Δ'. Donc Δ' est la symétrique de Δ par rapport à la droite x = −1 (ce qui est cohérent avec le 2. a)).

**5. a)** Pour x ≥ −1 : HM = |x − (−1)| = x + 1. Alors

    d(x) − HM < 0.1 ⟺ d(x) < x + 1.1

Les deux membres sont positifs (x + 1.1 > 0), donc cela équivaut à :

    x² + 2x + 5 < (x + 1.1)² ⟺ x² + 2x + 5 < x² + 2.2x + 1.21 ⟺ 3.79 < 0.2x ⟺ x > 18.95

Interprétation : dès que la voiture a dépassé le point d'abscisse 18.95, sa distance à l'antenne dépasse la distance HM de moins de 100 m. Loin de H, AM et HM sont presque égales : c'est ce que traduit l'asymptote Δ.

**b)** 25 > 18.95, donc d'après le a) et le 4. a) : 0 < d(25) − (25 + 1) < 0.1, soit 26 < d(25) < 26.1.
(Pour information, d(25) = √680 ≈ 26.077.)
