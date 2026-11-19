# 3ème Sc. exp. — Tome 1, Chapitre 6 : Fonction dérivée

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17-18 : dérivabilité sur un intervalle, fonction dérivée, dérivées des fonctions usuelles, opérations sur les fonctions dérivées, lien entre le signe de la dérivée et le sens de variation (théorème admis), extrema locaux, problèmes d'optimisation.
- Manuel CNP : (f + g)', (fg)', (1/f)', (g/f)', (fᵏ)' = k f' fᵏ⁻¹, (1/fᵏ)' = −k f' / fᵏ⁺¹, (√f)' = f' / (2√f) pour f > 0 ; dérivée de x ↦ f(αx + β) (admis) ; signe de f' et sens de variation (théorème admis, manuel p. 106 : f' ≥ 0 sur I ⟺ f croissante sur I ; f' = 0 sur I ⟺ f constante sur I). On en déduit : si f' ≥ 0 sur I et ne s'annule qu'en des points isolés, f est strictement croissante sur I (sinon f serait constante sur un intervalle [x₁, x₂] avec x₁ < x₂, et f' y serait nulle) ; de même pour f' ≤ 0 et « strictement décroissante » ; si f admet un extremum local en a, alors f'(a) = 0 ; si f' s'annule en a en changeant de signe, f admet un extremum local en a ; tableau de variation.
- Outils autorisés : chapitres 1 à 6 (continuité et théorème f(x) = k, limites, asymptotes, nombre dérivé, tangente, approximation affine). Pas d'éléments de symétrie de courbe (chapitre 7), pas de fonctions trigonométriques (chapitre 8).
- Toutes les valeurs sont vérifiées par `check_t1_ch06.py` (calcul exact en fractions ; dérivées contrôlées aussi numériquement).

---

## Exercice 1 — Calcul de dérivées, sens de variation, extrema locaux

### Partie A

1. Pour chacune des fonctions suivantes, justifier qu'elle est dérivable sur l'intervalle I indiqué et calculer sa fonction dérivée.

       a) f₁(x) = x⁴ − 2x³ + 5x − 1        I = ℝ
       b) f₂(x) = (3x − 1)⁴                 I = ℝ
       c) f₃(x) = (2x + 1) / (x − 3)        I = ]3, +∞[
       d) f₄(x) = √(x² − 2x + 5)            I = ℝ
       e) f₅(x) = x√x                       I = ]0, +∞[
       f) f₆(x) = 1 / (x² + 1)²             I = ℝ

2. a) En déduire le sens de variation de f₃ sur ]3, +∞[.
   b) Étudier le sens de variation de f₄ sur ℝ. La fonction f₄ admet-elle un minimum sur ℝ ?

### Partie B

Soit a et b deux réels et f la fonction définie sur ℝ par

    f(x) = x³ + ax² + b

On note 𝒞 sa courbe représentative dans un repère orthonormé (O, i, j). On sait que f admet un extremum local en 2 et que 𝒞 passe par le point A(2, −3).

1. a) Calculer f'(x) en fonction de a.
   b) Montrer que a = −3 et b = 1.

   Dans la suite, f(x) = x³ − 3x² + 1.

2. Étudier le signe de f'(x) suivant les valeurs du réel x.
3. a) Calculer les limites de f en −∞ et en +∞.
   b) Dresser le tableau de variation de f.
   c) Préciser les extrema locaux de f. La fonction f admet-elle un maximum sur ℝ ? un minimum ?
4. a) Calculer f(−1), f(1) et f(3).
   b) Montrer que l'équation f(x) = 0 admet exactement trois solutions α, β et γ, et que −1 < α < 0 < β < 1 et 2 < γ < 3.
5. a) Vérifier que pour tout réel x : f(x) + 3 = (x − 2)²(x + 1) et f(x) − 1 = x²(x − 3).
   b) Discuter, suivant les valeurs du réel m, le nombre de solutions de l'équation f(x) = m.

### Corrigé — Partie A

**1. a)** f₁ est une fonction polynôme, donc elle est dérivable sur ℝ, et f₁'(x) = 4x³ − 6x² + 5.

**b)** La fonction u : x ↦ 3x − 1 est dérivable sur ℝ et u'(x) = 3. Donc f₂ = u⁴ est dérivable sur ℝ et
f₂'(x) = 4 u'(x) u(x)³ = 4 × 3 × (3x − 1)³ = 12(3x − 1)³.

**c)** f₃ est le quotient de deux fonctions polynômes, et le dénominateur x − 3 ne s'annule pas sur ]3, +∞[ : f₃ est dérivable sur I et

    f₃'(x) = [2(x − 3) − (2x + 1) × 1] / (x − 3)² = −7 / (x − 3)²

**d)** Soit u(x) = x² − 2x + 5 = (x − 1)² + 4. La fonction u est dérivable sur ℝ et u(x) ≥ 4 > 0. Donc f₄ = √u est dérivable sur ℝ et

    f₄'(x) = u'(x) / (2√(u(x))) = (2x − 2) / (2√(x² − 2x + 5)) = (x − 1) / √(x² − 2x + 5)

**e)** Les fonctions x ↦ x et x ↦ √x sont dérivables sur ]0, +∞[, donc leur produit f₅ aussi, et

    f₅'(x) = 1 × √x + x × 1/(2√x) = √x + (1/2)√x = (3/2)√x       (car x / √x = √x)

**f)** Soit u(x) = x² + 1 : u est dérivable sur ℝ et ne s'annule pas. Donc f₆ = 1/u² est dérivable sur ℝ et

    f₆'(x) = −2 u'(x) / u(x)³ = −4x / (x² + 1)³

**2. a)** Pour tout x > 3, (x − 3)² > 0, donc f₃'(x) = −7 / (x − 3)² < 0 : f₃ est strictement décroissante sur ]3, +∞[.

**b)** Le dénominateur √(x² − 2x + 5) est strictement positif, donc f₄'(x) a le signe de x − 1 :

- f₄'(x) < 0 sur ]−∞, 1[ : f₄ est strictement décroissante sur ]−∞, 1] ;
- f₄'(1) = 0 ;
- f₄'(x) > 0 sur ]1, +∞[ : f₄ est strictement croissante sur [1, +∞[.

f₄ admet donc un minimum sur ℝ, atteint en 1 : f₄(1) = √(1 − 2 + 5) = √4 = 2.
(On le retrouve directement : x² − 2x + 5 = (x − 1)² + 4 ≥ 4, donc f₄(x) ≥ 2.)

### Corrigé — Partie B

**1. a)** f est une fonction polynôme, donc dérivable sur ℝ : f'(x) = 3x² + 2ax.

**b)** f est dérivable sur ℝ et admet un extremum local en 2, donc f'(2) = 0 : 12 + 4a = 0, soit a = −3.
Le point A(2, −3) appartient à 𝒞, donc f(2) = −3 : 8 + 4a + b = −3, soit 8 − 12 + b = −3, d'où b = 1.
Réciproquement, pour a = −3 et b = 1 : f(2) = 8 − 12 + 1 = −3, et f'(x) = 3x² − 6x = 3x(x − 2) s'annule en 2 en changeant de signe (voir 2.) : f admet bien un extremum local en 2.

**2.** f'(x) = 3x(x − 2) est un trinôme de racines 0 et 2, de coefficient dominant 3 > 0 :

- f'(x) > 0 sur ]−∞, 0[ et sur ]2, +∞[ ;
- f'(x) < 0 sur ]0, 2[ ;
- f'(0) = f'(2) = 0.

**3. a)** La limite d'une fonction polynôme en l'infini est celle de son terme de plus haut degré, ici x³ :
la limite de f en −∞ est −∞ et la limite de f en +∞ est +∞.

**b)** f(0) = 1 et f(2) = 8 − 12 + 1 = −3.

    x      | −∞          0           2          +∞
    f'(x)  |       +     0     −     0     +
    f(x)   | −∞    ↗     1     ↘    −3     ↗    +∞

**c)** f' s'annule en 0 en passant du signe + au signe − : f admet en 0 un maximum local égal à 1.
f' s'annule en 2 en passant du signe − au signe + : f admet en 2 un minimum local égal à −3.
Ces extrema ne sont pas des extrema sur ℝ : par exemple f(4) = 64 − 48 + 1 = 17 > 1 et f(−2) = −8 − 12 + 1 = −19 < −3. Comme f tend vers +∞ en +∞ et vers −∞ en −∞, f n'admet ni maximum ni minimum sur ℝ.

**4. a)** f(−1) = −1 − 3 + 1 = −3 ; f(1) = 1 − 3 + 1 = −1 ; f(3) = 27 − 27 + 1 = 1.

**b)** f est continue sur ℝ (fonction polynôme). On utilise le tableau de variation.

- Sur ]−∞, 0] : f est strictement croissante. f est continue sur [−1, 0] et 0 est compris entre f(−1) = −3 et f(0) = 1 : l'équation f(x) = 0 a une solution α dans [−1, 0], et en fait dans ]−1, 0[ (ni −1 ni 0 n'est solution). C'est la seule dans ]−∞, 0] car f y est strictement croissante.
- Sur [0, 2] : f est strictement décroissante. f est continue sur [0, 1] et 0 est compris entre f(1) = −1 et f(0) = 1 : il existe une solution β dans ]0, 1[ (ni 0 ni 1 n'est solution), et c'est la seule dans [0, 2] car f y est strictement décroissante.
- Sur [2, +∞[ : f est strictement croissante. f est continue sur [2, 3] et 0 est compris entre f(2) = −3 et f(3) = 1 : il existe une solution γ dans ]2, 3[ (ni 2 ni 3 n'est solution), et c'est la seule dans [2, +∞[ car f y est strictement croissante.

L'équation f(x) = 0 admet donc exactement trois solutions. (Pour information : α ≈ −0.532, β ≈ 0.653, γ ≈ 2.879.)

**5. a)** (x − 2)²(x + 1) = (x² − 4x + 4)(x + 1) = x³ + x² − 4x² − 4x + 4x + 4 = x³ − 3x² + 4 = f(x) + 3.
x²(x − 3) = x³ − 3x² = f(x) − 1.

**b)** f est continue et strictement monotone sur chacun des intervalles ]−∞, 0], [0, 2] et [2, +∞[. D'après le tableau, les images de ces intervalles sont ]−∞, 1], [−3, 1] et [−3, +∞[.

- Si m < −3 : m n'est atteint que sur ]−∞, 0] : une seule solution (elle est inférieure à −1, car f(−1) = −3).
- Si m = −3 : f(x) = −3 ⟺ (x − 2)²(x + 1) = 0 ⟺ x = 2 ou x = −1 : deux solutions.
- Si −3 < m < 1 : une solution dans chacun des intervalles ]−∞, 0[, ]0, 2[ et ]2, +∞[ : trois solutions.
- Si m = 1 : f(x) = 1 ⟺ x²(x − 3) = 0 ⟺ x = 0 ou x = 3 : deux solutions.
- Si m > 1 : m n'est atteint que sur [2, +∞[ : une seule solution (elle est supérieure à 3, car f(3) = 1).

Graphiquement : c'est le nombre de points d'intersection de 𝒞 avec la droite d'équation y = m.

---

## Exercice 2 — Problème d'optimisation : une porte sous une arche

Le plan est muni d'un repère orthonormé (O, i, j) (unité : 1 m). L'entrée d'un hangar a la forme d'une arche : c'est la partie de la parabole 𝒫 d'équation y = 12 − x² située au-dessus de l'axe des abscisses, qui représente le sol.
On veut placer dans cette entrée une porte rectangulaire KHMN : pour un réel x de ]0, 2√3[, on considère les points M(x, 12 − x²) et N(−x, 12 − x²) de 𝒫, et les points H(x, 0) et K(−x, 0) du sol.

1. a) Vérifier que 𝒫 coupe l'axe des abscisses aux points d'abscisses −2√3 et 2√3.
   b) Montrer que l'aire de la porte est S(x) = 24x − 2x³ et que son périmètre est p(x) = −2x² + 4x + 24.
2. a) Étudier les variations de la fonction S sur ]0, 2√3[.
   b) En déduire les dimensions de la porte d'aire maximale, et cette aire maximale.
   c) Vérifier que pour tout x de ]0, 2√3[ : 32 − S(x) = 2(x − 2)²(x + 4). Retrouver ainsi le résultat du b).
3. Étudier les variations de la fonction p sur ]0, 2√3[. Quelles sont les dimensions de la porte de périmètre maximal ? Est-ce la même porte qu'au 2. b) ?
4. On souhaite une porte d'aire 22 m².
   a) Montrer que S(x) = 22 ⟺ (x − 1)(x² + x − 11) = 0.
   b) En déduire les valeurs possibles de x et les dimensions des portes correspondantes.
   c) Expliquer à l'aide du tableau de variation de S pourquoi on trouve exactement deux portes.
5. Sans calculatrice, donner une valeur approchée de S(2.05) en utilisant l'approximation affine de S au voisinage de 2. Comparer avec la valeur exacte S(2.05) = 31.96975 et commenter.

### Corrigé

**1. a)** 12 − x² = 0 ⟺ x² = 12 ⟺ x = −2√3 ou x = 2√3 (car √12 = 2√3).
Pour 0 < x < 2√3, on a x² < 12, donc 12 − x² > 0 : le point M est bien au-dessus du sol.

**b)** La largeur de la porte est KH = x − (−x) = 2x et sa hauteur est HM = 12 − x². Donc

    S(x) = 2x(12 − x²) = 24x − 2x³
    p(x) = 2(2x + 12 − x²) = −2x² + 4x + 24

**2. a)** S est une fonction polynôme, donc dérivable, et

    S'(x) = 24 − 6x² = 6(4 − x²) = 6(2 − x)(2 + x)

Sur ]0, 2√3[, 2 + x > 0, donc S'(x) a le signe de 2 − x (et 2 < 2√3 car √3 > 1) :
S'(x) > 0 sur ]0, 2[, S'(2) = 0, S'(x) < 0 sur ]2, 2√3[.
S est continue en 0 et en 2√3, donc S(x) tend vers S(0) = 0 quand x tend vers 0, et vers S(2√3) = 2 × 2√3 × (12 − 12) = 0 quand x tend vers 2√3. De plus S(2) = 48 − 16 = 32.

    x      | 0            2            2√3
    S'(x)  |       +      0      −
    S(x)   | 0     ↗      32     ↘      0

**b)** Le maximum de S sur ]0, 2√3[ est 32, atteint pour x = 2. La porte a alors pour largeur 2x = 4 m et pour hauteur 12 − 4 = 8 m. Son aire est 32 m².

**c)** 2(x − 2)²(x + 4) = 2(x² − 4x + 4)(x + 4) = 2(x³ − 12x + 16) = 2x³ − 24x + 32 = 32 − S(x).
Pour x > 0 : (x − 2)² ≥ 0 et x + 4 > 0, donc 32 − S(x) ≥ 0, c'est-à-dire S(x) ≤ 32, avec égalité si et seulement si x = 2. On retrouve le maximum 32 atteint en 2.

**3.** p'(x) = −4x + 4 = 4(1 − x) : p'(x) > 0 sur ]0, 1[, p'(1) = 0, p'(x) < 0 sur ]1, 2√3[.
p(1) = −2 + 4 + 24 = 26 ; aux bornes, p(x) tend vers p(0) = 24 et vers p(2√3) = −24 + 8√3 + 24 = 8√3 (≈ 13.86).

    x      | 0            1            2√3
    p'(x)  |       +      0      −
    p(x)   | 24    ↗      26     ↘     8√3

La porte de périmètre maximal correspond à x = 1 : largeur 2 m, hauteur 11 m, périmètre 26 m.
Ce n'est pas la porte d'aire maximale : celle-ci (x = 2) a pour périmètre p(2) = −8 + 8 + 24 = 24 m.

**4. a)** S(x) = 22 ⟺ 24x − 2x³ = 22 ⟺ 2x³ − 24x + 22 = 0 ⟺ x³ − 12x + 11 = 0.
Or (x − 1)(x² + x − 11) = x³ + x² − 11x − x² − x + 11 = x³ − 12x + 11. D'où l'équivalence.

**b)** x − 1 = 0 donne x = 1, qui appartient à ]0, 2√3[.
x² + x − 11 = 0 : discriminant 1 + 44 = 45 = (3√5)², racines (−1 − 3√5)/2 < 0 (rejetée) et x₁ = (3√5 − 1)/2.
On a x₁ > 0 car 3√5 > 1. Et x₁ < 2√3 ⟺ 3√5 < 4√3 + 1 ⟺ 45 < 49 + 8√3 (les deux membres sont positifs, on peut élever au carré), ce qui est vrai. Donc x₁ ∈ ]0, 2√3[ (x₁ ≈ 2.854).

- Pour x = 1 : porte de 2 m sur 11 m (c'est la porte de périmètre maximal du 3.).
- Pour x = x₁ : largeur 2x₁ = 3√5 − 1 ≈ 5.708 m ; x₁² = (46 − 6√5)/4 = (23 − 3√5)/2, donc la hauteur est 12 − x₁² = (1 + 3√5)/2 ≈ 3.854 m.
  Contrôle : (3√5 − 1)(3√5 + 1)/2 = (45 − 1)/2 = 22.

**c)** S est continue et strictement croissante sur ]0, 2], à valeurs dans ]0, 32] ; elle est continue et strictement décroissante sur [2, 2√3[, à valeurs dans ]0, 32]. Comme 0 < 22 < 32, l'équation S(x) = 22 a exactement une solution dans ]0, 2[ (c'est 1) et exactement une solution dans ]2, 2√3[ (c'est x₁).

**5.** S est dérivable en 2, donc pour h voisin de 0 : S(2 + h) ≈ S(2) + S'(2) h = 32 + 0 × h = 32.
Avec h = 0.05 : S(2.05) ≈ 32. La valeur exacte est 31.96975 : l'erreur est d'environ 0.03.
Commentaire : au voisinage du maximum la tangente est horizontale, donc l'aire varie très peu. Élargir la porte de 2 × 0.05 = 0.1 m ne fait perdre qu'environ 0.03 m².
