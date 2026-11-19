# 3ème Sc. exp. — Tome 2, Chapitre 3 : Trigonométrie

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 20 : cosinus, sinus et tangente d'un réel, coordonnées polaires, cosinus et sinus d'un angle orienté, formules d'addition et de multiplication par 2, équations et inéquations cos(ax + b) = c, sin(ax + b) = c, tan x = c (et avec ≤, ≥). Note du programme : on exploite la transformation de a cos x + b sin x en r cos(x − φ).
- Manuel CNP : angles associés (−x, π − x, π + x, π/2 − x), tan x = sin x / cos x, coordonnées polaires (r, θ) avec r > 0 et θ ∈ ]−π, π], u·v = ‖u‖ ‖v‖ cos(u, v), cos(a ± b), sin(a ± b), cos 2a, sin 2a, a cos x + b sin x = r cos(x − φ), sin a = sin b ⟺ a = b + 2kπ ou a = π − b + 2kπ, cos a = cos b ⟺ a = b + 2kπ ou a = −b + 2kπ, tan a = tan b ⟺ a = b + kπ.
- Notation : vec(ΩN) est le vecteur ΩN ; ΩN·ΩN' est un produit scalaire ; k désigne un entier relatif.
- Outils autorisés : chapitres 1 à 3 du tome 2 (produit scalaire, Al-Kashi, angles orientés, trigonométrie). Pas d'étude de fonctions (pas de dérivées), pas de nombres complexes.
- Toutes les valeurs sont vérifiées par `check_t2_ch03.py` (identités testées sur de nombreux angles ; chaque ensemble de solutions est contrôlé sur une grille fine d'une période).

---

## Exercice 1 — Formules d'addition et de duplication, équations et inéquations

Le plan est muni d'un repère orthonormé direct (O, i, j) ; 𝒞 est le cercle trigonométrique de centre O.

1. a) Vérifier que π/12 = π/3 − π/4, puis calculer cos(π/12) et sin(π/12).
   b) En déduire cos(5π/12), sin(5π/12) et cos(11π/12).
   c) Montrer que tan(π/12) = 2 − √3.
2. a) Montrer que pour tout réel x :

       cos 3x = 4cos³x − 3cos x

   b) En déduire que le réel cos(π/9) est une solution de l'équation 8X³ − 6X − 1 = 0.
3. a) Résoudre dans ℝ l'équation cos(2x − π/3) = −√2/2. Placer sur 𝒞 les points images des solutions qui appartiennent à ]−π, π].
   b) Résoudre dans ]−π, π] l'inéquation sin(x + π/4) ≥ 1/2.
   c) Résoudre dans ]−π, π] l'équation tan x = −√3.
4. Pour tout réel x, on pose f(x) = √3 cos x − sin x.
   a) Montrer que pour tout réel x : f(x) = 2cos(x + π/6).
   b) Résoudre dans ℝ l'équation f(x) = √2. Vérifier, à l'aide du 1. a), que π/12 est une solution.
   c) Résoudre dans [0, 2π[ l'inéquation f(x) ≤ −1.

### Corrigé

**1. a)** π/3 − π/4 = 4π/12 − 3π/12 = π/12. Formules d'addition :

    cos(π/12) = cos(π/3)cos(π/4) + sin(π/3)sin(π/4) = (1/2)(√2/2) + (√3/2)(√2/2) = (√6 + √2)/4
    sin(π/12) = sin(π/3)cos(π/4) − cos(π/3)sin(π/4) = (√3/2)(√2/2) − (1/2)(√2/2) = (√6 − √2)/4

**b)** 5π/12 = π/2 − π/12, donc cos(5π/12) = sin(π/12) = (√6 − √2)/4 et sin(5π/12) = cos(π/12) = (√6 + √2)/4.
11π/12 = π − π/12, donc cos(11π/12) = −cos(π/12) = −(√6 + √2)/4.

**c)** tan(π/12) = sin(π/12) / cos(π/12) = (√6 − √2)/(√6 + √2). On multiplie numérateur et dénominateur par √6 − √2 :

    tan(π/12) = (√6 − √2)² / (6 − 2) = (6 − 2√12 + 2)/4 = (8 − 4√3)/4 = 2 − √3

**2. a)** Formule d'addition, puis formules de duplication cos 2x = 2cos²x − 1 et sin 2x = 2 sin x cos x :

    cos 3x = cos(2x + x) = cos 2x cos x − sin 2x sin x
           = (2cos²x − 1)cos x − 2 sin²x cos x
           = 2cos³x − cos x − 2(1 − cos²x)cos x
           = 4cos³x − 3cos x

**b)** Pour x = π/9 : cos(3 × π/9) = cos(π/3) = 1/2. Avec c = cos(π/9) : 4c³ − 3c = 1/2, soit 8c³ − 6c − 1 = 0.
Donc cos(π/9) est une solution de 8X³ − 6X − 1 = 0.

**3. a)** −√2/2 = cos(3π/4). Donc

    cos(2x − π/3) = cos(3π/4) ⟺ 2x − π/3 = 3π/4 + 2kπ  ou  2x − π/3 = −3π/4 + 2kπ
                              ⟺ x = 13π/24 + kπ  ou  x = −5π/24 + kπ   (k ∈ ℤ)

Dans ]−π, π] : 13π/24 (k = 0) et 13π/24 − π = −11π/24 (k = −1) ; −5π/24 (k = 0) et −5π/24 + π = 19π/24 (k = 1). Les autres valeurs de k donnent des réels hors de ]−π, π].
S = {−11π/24 ; −5π/24 ; 13π/24 ; 19π/24}.
Sur 𝒞 : quatre points. Les points associés à −11π/24 et 13π/24 sont diamétralement opposés (leurs mesures diffèrent de π), de même que ceux associés à −5π/24 et 19π/24 : les quatre points forment un rectangle inscrit dans 𝒞.

**b)** On pose X = x + π/4. Si x ∈ ]−π, π], alors X ∈ ]−3π/4, 5π/4], intervalle de longueur 2π.
Sur 𝒞, sin X ≥ 1/2 correspond à l'arc des points d'ordonnée au moins 1/2, entre les points associés à π/6 et 5π/6. Dans ]−3π/4, 5π/4], cela donne X ∈ [π/6, 5π/6].
Donc π/6 ≤ x + π/4 ≤ 5π/6 ⟺ −π/12 ≤ x ≤ 7π/12.
S = [−π/12, 7π/12].

**c)** −√3 = tan(−π/3). tan x = tan(−π/3) ⟺ x = −π/3 + kπ (k ∈ ℤ). Ces réels vérifient bien cos x ≠ 0.
Dans ]−π, π] : x = −π/3 (k = 0) et x = 2π/3 (k = 1).
S = {−π/3 ; 2π/3}.

**4. a)** cos(π/6) = √3/2 et sin(π/6) = 1/2, donc

    2cos(x + π/6) = 2(cos x cos(π/6) − sin x sin(π/6)) = √3 cos x − sin x = f(x)

**b)** f(x) = √2 ⟺ cos(x + π/6) = √2/2 = cos(π/4)

    ⟺ x + π/6 = π/4 + 2kπ  ou  x + π/6 = −π/4 + 2kπ
    ⟺ x = π/12 + 2kπ  ou  x = −5π/12 + 2kπ   (k ∈ ℤ)

Vérification avec le 1. a) :

    f(π/12) = √3 (√6 + √2)/4 − (√6 − √2)/4 = (3√2 + √6 − √6 + √2)/4 = 4√2/4 = √2

**c)** f(x) ≤ −1 ⟺ cos(x + π/6) ≤ −1/2. On pose X = x + π/6 : si x ∈ [0, 2π[, alors X ∈ [π/6, 13π/6[.
Sur 𝒞, cos X ≤ −1/2 correspond à l'arc des points d'abscisse au plus −1/2, entre les points associés à 2π/3 et 4π/3. Dans [π/6, 13π/6[, cela donne X ∈ [2π/3, 4π/3].
Donc 2π/3 ≤ x + π/6 ≤ 4π/3 ⟺ π/2 ≤ x ≤ 7π/6.
S = [π/2, 7π/6].

---

## Exercice 2 — Problème : la grande roue

Une grande roue a un rayon de 8 m ; son centre Ω est à 10 m au-dessus du sol. Dans le plan de la roue, on choisit un repère orthonormé direct (Ω, i, j), d'unité le mètre, où i est horizontal et j vertical, dirigé vers le haut.
La roue tourne dans le sens direct, à vitesse constante, et fait un tour complet en 30 minutes. À l'instant t = 0, la nacelle N est au point le plus bas de la roue. On admet qu'à l'instant t (en minutes), une mesure de l'angle orienté (i, vec(ΩN)) est

    θ(t) = πt/15 − π/2

1. a) Donner les coordonnées polaires de N aux instants t = 0, t = 5 et t = 20 (avec une mesure de l'angle dans ]−π, π]).
   b) En déduire les coordonnées cartésiennes de N à ces trois instants.
2. a) Montrer que la hauteur de N au-dessus du sol à l'instant t est

       h(t) = 10 − 8cos(πt/15)

   b) Calculer h(5) et h(20). Comparer avec le 1. b).
3. a) Résoudre dans ℝ l'équation h(t) = 14.
   b) En déduire les instants de [0, 60] où la nacelle est exactement à 14 m du sol.
   c) Au cours du premier tour (t ∈ [0, 30]), déterminer les instants où la nacelle est à au moins 14 m du sol. Pendant combien de temps l'est-elle ?
4. La roue porte 8 nacelles régulièrement réparties. On considère deux nacelles voisines N et N' telles que (vec(ΩN), vec(ΩN')) ≡ π/4 [2π].
   a) En utilisant le produit scalaire ΩN·ΩN', calculer la distance NN'.
   b) Montrer que pour tout réel a : 1 − cos a = 2sin²(a/2). En déduire que NN' = 16 sin(π/8), puis la valeur exacte de sin(π/8).
   c) Donner une valeur approchée de NN' à 0.01 près.
5. On note θ une mesure de (i, vec(ΩN)).
   a) Montrer que N et N' sont à la même hauteur si et seulement si sin(θ + π/4) = sin θ.
   b) Résoudre cette équation d'inconnue θ. En déduire les instants t de [0, 30] où le segment [NN'] est horizontal.

### Corrigé

**1. a)** ΩN = 8 à chaque instant.

- t = 0 : θ(0) = −π/2. Coordonnées polaires (8, −π/2).
- t = 5 : θ(5) = π/3 − π/2 = −π/6. Coordonnées polaires (8, −π/6).
- t = 20 : θ(20) = 4π/3 − π/2 = 5π/6, qui appartient à ]−π, π]. Coordonnées polaires (8, 5π/6).

**b)** Si N a pour coordonnées polaires (r, θ), ses coordonnées cartésiennes sont (r cos θ, r sin θ).

- t = 0 : (8cos(−π/2), 8sin(−π/2)) = (0, −8) : c'est bien le point le plus bas.
- t = 5 : (8 × √3/2, 8 × (−1/2)) = (4√3, −4).
- t = 20 : (8 × (−√3/2), 8 × 1/2) = (−4√3, 4).

**2. a)** L'ordonnée de N dans le repère (Ω, i, j) est 8 sin θ(t), et Ω est à 10 m du sol, donc la hauteur de N est 10 + 8 sin(πt/15 − π/2).
Angles associés : sin(a − π/2) = −sin(π/2 − a) = −cos a. Donc h(t) = 10 − 8cos(πt/15).

**b)** h(5) = 10 − 8cos(π/3) = 10 − 4 = 6 m et h(20) = 10 − 8cos(4π/3) = 10 + 4 = 14 m.
On retrouve 10 + (−4) = 6 et 10 + 4 = 14 avec les ordonnées du 1. b).

**3. a)** h(t) = 14 ⟺ cos(πt/15) = −1/2 = cos(2π/3)

    ⟺ πt/15 = 2π/3 + 2kπ  ou  πt/15 = −2π/3 + 2kπ
    ⟺ t = 10 + 30k  ou  t = −10 + 30k   (k ∈ ℤ)

**b)** Dans [0, 60] : t = 10, t = 20, t = 40 et t = 50 (en minutes).

**c)** Pour t ∈ [0, 30], X = πt/15 décrit [0, 2π]. h(t) ≥ 14 ⟺ cos X ≤ −1/2 ⟺ X ∈ [2π/3, 4π/3] (arc des points de 𝒞 d'abscisse au plus −1/2) ⟺ t ∈ [10, 20].
La nacelle est à au moins 14 m du sol entre t = 10 et t = 20 : pendant 10 minutes, soit un tiers du tour.

**4. a)** ΩN = ΩN' = 8 et l'angle géométrique entre vec(ΩN) et vec(ΩN') vaut π/4, donc ΩN·ΩN' = 8 × 8 × cos(π/4) = 32√2.
vec(NN') = vec(ΩN') − vec(ΩN), donc

    NN'² = ΩN'² − 2 ΩN·ΩN' + ΩN² = 64 − 64√2 + 64 = 128 − 64√2 = 64(2 − √2)

NN' = 8√(2 − √2).

**b)** cos a = cos(2 × a/2) = 1 − 2sin²(a/2), donc 1 − cos a = 2sin²(a/2).
NN'² = 128(1 − cos(π/4)) = 128 × 2sin²(π/8) = 256 sin²(π/8). Comme 0 < π/8 < π, sin(π/8) > 0, donc NN' = 16 sin(π/8).
Avec le a) : 16 sin(π/8) = 8√(2 − √2), donc sin(π/8) = √(2 − √2)/2.

**c)** NN' = 8√(2 − √2) ≈ 6.12 m.

**5. a)** Chasles : (i, vec(ΩN')) ≡ (i, vec(ΩN)) + (vec(ΩN), vec(ΩN')) ≡ θ + π/4 [2π]. Les hauteurs de N et N' sont 10 + 8 sin θ et 10 + 8 sin(θ + π/4). Elles sont égales si et seulement si sin(θ + π/4) = sin θ.

**b)** sin(θ + π/4) = sin θ ⟺ θ + π/4 = θ + 2kπ  ou  θ + π/4 = π − θ + 2kπ.
La première égalité donne π/4 = 2kπ, impossible. La seconde donne 2θ = 3π/4 + 2kπ, soit θ = 3π/8 + kπ (k ∈ ℤ).
Avec θ = πt/15 − π/2 : πt/15 = 3π/8 + π/2 + kπ = 7π/8 + kπ, donc t = 105/8 + 15k = 13.125 + 15k.
Dans [0, 30] : t = 13.125 min (13 min 7.5 s) et t = 28.125 min (28 min 7.5 s).
À ces instants, [NN'] est horizontal : en haut de la roue à t = 13.125 (θ = 3π/8, hauteur ≈ 17.39 m) et en bas à t = 28.125 (θ = 11π/8, hauteur ≈ 2.61 m).
