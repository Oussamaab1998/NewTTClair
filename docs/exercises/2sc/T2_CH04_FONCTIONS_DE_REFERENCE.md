# 2ème Sciences — Tome 2, Chapitre 4 : Fonctions de référence

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 21 (activités sur les fonctions) : fonctions x ↦ ax² + bx + c, x ↦ (ax + b)/(cx + d) et x ↦ √(x + b) (dans le programme, les types de fonctions sont des images ; ils ont été lus dans le manuel) ; ensemble de définition, sens de variation ; sommet et axe d'une parabole à partir de la forme réduite ; centre et asymptotes d'une hyperbole à partir de la forme réduite ; représentation graphique ; courbe déduite d'une autre par symétrie, translation ou homothétie ; position relative de deux courbes ; optimisation.
- Manuel CNP (tome 2, chapitre 4, p. 48–71) : la courbe de x ↦ a(x − α)² + β est une parabole de sommet S(α, β) et d'axe la droite x = α ; celle de x ↦ (ax + b)/(cx + d) (c ≠ 0) est une hyperbole de centre (−d/c, a/c) et d'asymptotes les droites x = −d/c et y = a/c ; celle de x ↦ a/(x + α) a pour centre (−α, 0) ; celle de x ↦ √(x + b) est l'image de celle de x ↦ √x par la translation de vecteur −b i. Ces résultats sont admis dans le manuel (« on admet que la courbe est une parabole / une hyperbole ») ; le manuel justifie la nature de la courbe par un changement de repère (repère (Ω, i, j), équation Y = k/X) ou par une translation, comme les corrigés.
- Répartition : l'exercice 1 traite la parabole et la courbe de x ↦ √(x + 4) ; l'exercice 2 traite l'hyperbole (forme réduite, centre, asymptotes, position par rapport à une droite) dans un problème.
- Outils autorisés : ce chapitre, le chapitre 3 (sens de variation par le signe de f(a) − f(b), parité), le tome 1 (forme canonique, discriminant, signe d'un trinôme, translations et homothéties) et la 1ère année. Pas de limites ni de dérivées : le manuel parle de façon informelle de « f(x) tend vers … », les corrigés ne l'utilisent pas.
- Notation : vec(OS) est un vecteur ; i, j sont les vecteurs du repère ; une translation est donnée par son vecteur, une homothétie par son centre et son rapport.
- Toutes les valeurs sont vérifiées par `check_t2_ch04.py` (calcul exact en fractions).

---

## Exercice 1 — Parabole et courbe de x ↦ √(x + 4)

Le plan est muni d'un repère orthonormé (O, i, j).

### Partie A

Soit f la fonction définie sur ℝ par f(x) = −2x² + 8x − 6, et P sa courbe représentative.

1. a) Écrire f(x) sous la forme a(x − α)² + β. En déduire le sommet S et l'axe de la parabole P.
   b) On note P₀ la parabole d'équation y = x² et P₁ la parabole d'équation y = −2x². Montrer que P₁ est l'image de P₀ par l'homothétie h de centre O et de rapport −1/2.
   c) Montrer que P est l'image de P₁ par la translation de vecteur vec(OS).
2. a) Montrer que f est croissante sur ]−∞, 2] et décroissante sur [2, +∞[. Quel est le maximum de f sur ℝ ?
   b) Déterminer les points d'intersection de P avec les axes du repère, puis tracer P. En déduire le signe de f(x) suivant les valeurs de x.
   c) Soit P' la courbe de la fonction x ↦ −f(x). Montrer que P' est la symétrique de P par rapport à l'axe des abscisses. En déduire le sommet et l'axe de P'.

### Partie B

Soit g la fonction définie par g(x) = √(x + 4), et Γ sa courbe. On note Γ₀ la courbe de la fonction racine carrée x ↦ √x.

1. a) Déterminer l'ensemble de définition de g et montrer que g est croissante sur cet ensemble.
   b) Montrer que Γ est l'image de Γ₀ par la translation de vecteur −4 i. Tracer Γ₀ puis Γ.
2. Soit D la droite d'équation y = x + 2.
   a) Résoudre l'équation √(x + 4) = x + 2.
   b) Résoudre graphiquement, puis par le calcul, l'inéquation √(x + 4) > x + 2.

### Corrigé — Partie A

**1. a)** −2(x − 2)² + 2 = −2(x² − 4x + 4) + 2 = −2x² + 8x − 8 + 2 = −2x² + 8x − 6. Donc

    f(x) = −2(x − 2)² + 2

D'après le cours, P est la parabole de sommet S(2, 2) et d'axe de symétrie la droite d'équation x = 2.

**b)** Soit M(x, y) un point du plan et M'(x', y') = h(M). On a vec(OM') = −(1/2) vec(OM), donc x' = −x/2 et y' = −y/2, c'est-à-dire x = −2x' et y = −2y'. Alors

    M ∈ P₀ ⟺ y = x² ⟺ −2y' = (−2x')² = 4x'² ⟺ y' = −2x'² ⟺ M' ∈ P₁

Tout point N du plan est l'image par h d'un seul point M (celui tel que vec(OM) = −2 vec(ON)). L'équivalence montre donc que h(P₀) = P₁.

**c)** vec(OS) = 2 i + 2 j. La translation de vecteur vec(OS) associe au point M(x, y) le point M'(x', y') avec x' = x + 2 et y' = y + 2. Alors

    M ∈ P₁ ⟺ y = −2x² ⟺ y' − 2 = −2(x' − 2)² ⟺ y' = f(x') ⟺ M' ∈ P

Donc P est l'image de P₁ par cette translation (le sommet O de P₁ a pour image S).

**2. a)** On utilise la forme canonique.

- Si a ≤ b ≤ 2 : a − 2 ≤ b − 2 ≤ 0, donc (a − 2)² ≥ (b − 2)² (deux nombres négatifs ou nuls rangés dans l'ordre ont des carrés rangés dans l'ordre contraire). En multipliant par −2 : −2(a − 2)² ≤ −2(b − 2)², puis f(a) ≤ f(b). f est croissante sur ]−∞, 2].
- Si 2 ≤ a ≤ b : 0 ≤ a − 2 ≤ b − 2, donc (a − 2)² ≤ (b − 2)², puis f(a) ≥ f(b). f est décroissante sur [2, +∞[.

    x     | −∞              2              +∞
    f(x)  |        ↗        2        ↘

Pour tout réel x, f(x) − 2 = −2(x − 2)² ≤ 0 : le maximum de f sur ℝ est 2, atteint en 2 seulement.

**b)** Axe des ordonnées : f(0) = −6, point (0, −6).
Axe des abscisses : f(x) = 0 ⟺ x² − 4x + 3 = 0. Le discriminant vaut 16 − 12 = 4, d'où deux racines : x = (4 − 2)/2 = 1 et x = (4 + 2)/2 = 3. Points (1, 0) et (3, 0).
Tracé : P est une parabole tournée vers le bas (a = −2 < 0), de sommet S(2, 2) et d'axe x = 2. Elle passe par (1, 0) et (3, 0), par (0, −6) et par son symétrique (4, −6) par rapport à l'axe (f(4) = −32 + 32 − 6 = −6).
Signe : P est au-dessus de l'axe des abscisses entre 1 et 3. Donc f(x) ≥ 0 ⟺ x ∈ [1, 3] (f(x) = 0 pour x = 1 ou x = 3), et f(x) < 0 pour x ∈ ]−∞, 1[ ∪ ]3, +∞[.

**c)** Pour tout réel x : M(x, y) ∈ P' ⟺ y = −f(x) ⟺ −y = f(x) ⟺ le point (x, −y) appartient à P. Or (x, −y) est le symétrique de M par rapport à l'axe des abscisses. Donc P' est la symétrique de P par rapport à l'axe des abscisses.
−f(x) = 2(x − 2)² − 2 : P' est la parabole de sommet S'(2, −2) (le symétrique de S) et d'axe la droite d'équation x = 2 ; elle est tournée vers le haut.

### Corrigé — Partie B

**1. a)** g(x) existe ⟺ x + 4 ≥ 0 ⟺ x ≥ −4. L'ensemble de définition est [−4, +∞[.
Si −4 ≤ a ≤ b, alors 0 ≤ a + 4 ≤ b + 4, donc √(a + 4) ≤ √(b + 4) (la fonction racine carrée est croissante sur [0, +∞[). g est croissante sur [−4, +∞[.

**b)** La translation de vecteur −4 i associe au point M(x, y) le point M'(x', y') avec x' = x − 4 et y' = y. Alors

    M ∈ Γ₀ ⟺ x ≥ 0 et y = √x ⟺ x' + 4 ≥ 0 et y' = √(x' + 4) ⟺ M' ∈ Γ

Donc Γ est l'image de Γ₀ par cette translation.
Tracé : Γ₀ part de O(0, 0) et passe par (1, 1), (4, 2) et (9, 3). On décale chaque point de 4 unités vers la gauche : Γ part du point (−4, 0) et passe par (−3, 1), (0, 2) et (5, 3).

**2. a)** Une racine carrée est positive ou nulle. Si x + 2 < 0, l'équation n'a pas de solution. Si x ≥ −2 (alors x + 4 ≥ 2 > 0), les deux membres sont positifs ou nuls, donc

    √(x + 4) = x + 2 ⟺ x + 4 = (x + 2)² ⟺ x² + 3x = 0 ⟺ x(x + 3) = 0 ⟺ x = 0 ou x = −3

La valeur −3 ne vérifie pas x ≥ −2 : elle est rejetée (en effet √(−3 + 4) = 1 alors que −3 + 2 = −1). L'ensemble des solutions est {0}. La droite D coupe Γ en un seul point, (0, 2).

**b)** Graphiquement : D passe par (−4, −2), (−2, 0) et (0, 2). Γ est au-dessus de D pour les abscisses de −4 (inclus) à 0 (exclu), et au-dessous ensuite. Par le calcul :

- Si −4 ≤ x < −2 : x + 2 < 0 ≤ √(x + 4), l'inéquation est vraie.
- Si x ≥ −2 : les deux membres sont positifs ou nuls, donc √(x + 4) > x + 2 ⟺ x + 4 > (x + 2)² ⟺ x² + 3x < 0 ⟺ −3 < x < 0. Avec x ≥ −2, on obtient [−2, 0[.

L'ensemble des solutions est [−4, −2[ ∪ [−2, 0[ = [−4, 0[.

---

## Exercice 2 — Problème : l'image donnée par une lentille

Une lentille convergente a une distance focale de 10 cm. On place un petit objet à la distance x (en cm) de la lentille, avec x > 10. On admet le modèle suivant, issu de la physique : l'image nette de l'objet se forme sur un écran placé de l'autre côté de la lentille, à la distance y (en cm) donnée par

    y = 10x / (x − 10)

et le rapport γ = (hauteur de l'image) / (hauteur de l'objet) est égal à y / x.

On note φ la fonction définie sur ℝ \ {10} par φ(x) = 10x/(x − 10), et H sa courbe dans un repère orthogonal (O, i, j).

1. a) Montrer que pour tout réel x ≠ 10 : φ(x) = 10 + 100/(x − 10).
   b) En déduire que H est une hyperbole dont on précisera le centre Ω et les asymptotes.
   c) Étudier le sens de variation de φ sur ]10, +∞[. Comment varie la distance de l'image quand on éloigne l'objet de la lentille ?
2. a) Montrer que pour tout x > 10, on a y > 10. Tracer la partie de H formée des points d'abscisse x > 10.
   b) Étudier, pour x > 10, la position de H par rapport à la droite Δ d'équation y = x. Où faut-il placer l'objet pour que l'image soit à la même distance de la lentille que l'objet ?
3. a) Montrer que γ = 10/(x − 10). Préciser le centre et les asymptotes de la courbe de la fonction x ↦ 10/(x − 10).
   b) Où faut-il placer l'objet pour obtenir une image deux fois plus grande que l'objet ? À quelle distance de la lentille faut-il alors placer l'écran ?
4. On note d(x) = x + y la distance entre l'objet et l'écran.
   a) Montrer que d(x) = x²/(x − 10), puis que d(x) − 40 = (x − 20)²/(x − 10).
   b) En déduire la plus petite distance possible entre l'objet et l'écran, et la position de l'objet correspondante.
   c) L'objet et l'écran sont fixés à 45 cm l'un de l'autre. À quelle distance de l'objet peut-on placer la lentille pour obtenir une image nette sur l'écran ? Même question si l'objet et l'écran sont à 35 cm l'un de l'autre.

### Corrigé

**1. a)** Pour x ≠ 10 : 10 + 100/(x − 10) = (10(x − 10) + 100)/(x − 10) = (10x − 100 + 100)/(x − 10) = 10x/(x − 10) = φ(x).

**b)** Soit Ω(10, 10). Si M a pour coordonnées (x, y) dans (O, i, j) et (X, Y) dans (Ω, i, j), alors x = X + 10 et y = Y + 10, et

    M ∈ H ⟺ x ≠ 10 et y = 10 + 100/(x − 10) ⟺ X ≠ 0 et Y = 100/X

H est donc une hyperbole de centre Ω(10, 10) ; ses asymptotes sont les droites d'équations x = 10 et y = 10. (C'est le cas c = 1, d = −10, a = 10 du cours : centre (−d/c, a/c) = (10, 10).)

**c)** Pour a et b différents de 10 :

    φ(a) − φ(b) = 100/(a − 10) − 100/(b − 10) = 100(b − a) / ((a − 10)(b − 10))

Si 10 < a < b : b − a > 0, a − 10 > 0 et b − 10 > 0, donc φ(a) − φ(b) > 0, soit φ(a) > φ(b). φ est décroissante sur ]10, +∞[.
Plus on éloigne l'objet de la lentille, plus l'image se rapproche de la lentille.

**2. a)** Pour x > 10 : y − 10 = 100/(x − 10) > 0, donc y > 10. L'image est toujours à plus de 10 cm de la lentille.
On trace en pointillés les asymptotes x = 10 et y = 10 (centre Ω(10, 10)).

    x     | 12   15   20   30   60
    φ(x)  | 60   30   20   15   12

La partie de H cherchée est la branche située à droite de la droite x = 10 et au-dessus de la droite y = 10. Elle descend (question 1. c)) en passant par ces cinq points ; elle se rapproche de la droite x = 10 quand x se rapproche de 10, et de la droite y = 10 quand x devient grand.

**b)** φ(x) − x = (10x − x(x − 10))/(x − 10) = (20x − x²)/(x − 10) = x(20 − x)/(x − 10).
Pour x > 10 : x > 0 et x − 10 > 0, donc φ(x) − x a le signe de 20 − x.

- Pour 10 < x < 20 : H est au-dessus de Δ, l'image est plus loin de la lentille que l'objet.
- Pour x = 20 : H et Δ se coupent au point (20, 20).
- Pour x > 20 : H est au-dessous de Δ, l'image est plus près de la lentille que l'objet.

L'image est à la même distance que l'objet seulement pour x = 20 : il faut placer l'objet à 20 cm de la lentille (deux fois la distance focale), et l'image est alors à 20 cm de l'autre côté.

**3. a)** γ = y/x = (10x/(x − 10)) / x = 10/(x − 10) (x ≠ 0).
La fonction x ↦ 10/(x − 10) est du type x ↦ a/(x + α) avec a = 10 et α = −10 : sa courbe est une hyperbole de centre (10, 0), d'asymptotes les droites d'équations x = 10 et y = 0.

**b)** γ = 2 ⟺ 10/(x − 10) = 2 ⟺ x − 10 = 5 ⟺ x = 15. Alors y = φ(15) = 150/5 = 30.
On place l'objet à 15 cm de la lentille et l'écran à 30 cm de l'autre côté. (Contrôle : y/x = 30/15 = 2.)

**4. a)** d(x) = x + 10x/(x − 10) = (x(x − 10) + 10x)/(x − 10) = x²/(x − 10).
d(x) − 40 = (x² − 40(x − 10))/(x − 10) = (x² − 40x + 400)/(x − 10) = (x − 20)²/(x − 10).

**b)** Pour x > 10 : (x − 20)² ≥ 0 et x − 10 > 0, donc d(x) − 40 ≥ 0, soit d(x) ≥ 40, avec égalité seulement pour x = 20.
La distance objet-écran est au moins 40 cm. Elle vaut 40 cm lorsque l'objet est à 20 cm de la lentille (et l'écran à 20 cm de l'autre côté).

**c)** Pour x > 10 : d(x) = 45 ⟺ x² = 45(x − 10) ⟺ x² − 45x + 450 = 0.
Le discriminant vaut 45² − 4 × 450 = 2025 − 1800 = 225 = 15². Racines : x = (45 − 15)/2 = 15 et x = (45 + 15)/2 = 30, toutes deux supérieures à 10.
On peut placer la lentille à 15 cm de l'objet (l'image est alors à 30 cm de la lentille) ou à 30 cm de l'objet (l'image est alors à 15 cm). Contrôle : 15 + 30 = 45.
Si l'objet et l'écran sont à 35 cm l'un de l'autre : 35 < 40, la plus petite distance possible (question 4. b)). On ne peut pas obtenir d'image nette.
