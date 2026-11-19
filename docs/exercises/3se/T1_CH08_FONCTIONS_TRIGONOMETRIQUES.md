# 3ème Sc. exp. — Tome 1, Chapitre 8 : Fonctions trigonométriques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 17-18 : étude et représentation graphique des fonctions circulaires x ↦ sin(ax + b), x ↦ cos(ax + b) et x ↦ tan x. Partie géométrie, p. 20 : formules d'addition et de multiplication par 2, équations et inéquations cos(ax + b) = c, cos(ax + b) ≥ c, cos(ax + b) ≤ c, transformation de a cos x + b sin x en r cos(x − φ).
- Manuel CNP, tome 1 : fonction périodique ; sin et cos périodiques de période 2π, sin impaire, cos paire ; (sin)' = cos et (cos)' = −sin ; x ↦ sin(ωx + φ) et x ↦ cos(ωx + φ) sont périodiques de période 2π/|ω|, de dérivées ω cos(ωx + φ) et −ω sin(ωx + φ) ; tan impaire, périodique de période π, (tan)' = 1 + tan², limite +∞ à gauche en π/2 ; translation de vecteur kT i (i vecteur du repère) pour tracer une fonction de période T.
- Formules de trigonométrie utilisées (tome 2, chapitre 3, comme le fait le manuel du tome 1) : cos² x + sin² x = 1, angles associés (cos(x + π) = −cos x), cos(a − b) = cos a cos b + sin a sin b, cos a = cos b ⟺ a = b + 2kπ ou a = −b + 2kπ, inéquations cos u ≥ c et cos u ≤ c sur le cercle trigonométrique.
- Sens de variation (chapitre 6, manuel p. 106) : on utilise la conséquence du théorème admis : si f' ≥ 0 sur I et ne s'annule qu'en des points isolés, f est strictement croissante sur I (sinon f serait constante sur un intervalle [x₁, x₂] avec x₁ < x₂, et f' y serait nulle) ; de même pour f' ≤ 0 et « strictement décroissante ».
- Outils autorisés : chapitres 1 à 8 du tome 1 et chapitre 3 (Trigonométrie) du tome 2. Pas de suites (chapitres 9-10).
- Toutes les valeurs sont vérifiées par `check_t1_ch08.py` (fractions exactes pour les instants et les coefficients ; identités, dérivées, signes et limites contrôlés numériquement sur de nombreux points).

---

## Exercice 1 — Étude de x ↦ cos 2x + √3 sin 2x ; position de la courbe de tan par rapport à une tangente

### Partie A

Soit f la fonction définie sur ℝ par

    f(x) = cos 2x + √3 sin 2x

On note 𝒞 sa courbe représentative dans un repère orthonormé (O, i, j).

1. Montrer que pour tout réel x : f(x) = 2 cos(2x − π/3).
2. a) Montrer que f est périodique de période π.
   b) Montrer que la droite d'équation x = π/6 est un axe de symétrie de 𝒞.
3. a) Montrer que f est dérivable sur ℝ et que f'(x) = −4 sin(2x − π/3).
   b) Étudier le signe de f'(x) pour x ∈ [0, π], puis dresser le tableau de variation de f sur [0, π].
4. a) Résoudre dans ℝ l'équation f(x) = 1, puis donner ses solutions dans [0, π].
   b) Résoudre dans [0, π] l'inéquation f(x) ≥ 1.
5. a) Déterminer une équation de la tangente T à 𝒞 au point d'abscisse 0.
   b) En déduire la limite de (cos 2x + √3 sin 2x − 1) / x quand x tend vers 0.
6. Tracer la restriction de 𝒞 à [0, π], puis expliquer comment obtenir 𝒞 sur [−π, 2π].

### Partie B

Soit g la fonction définie sur [0, π/2[ par

    g(x) = tan x − x

1. Montrer que g est dérivable sur [0, π/2[ et que g'(x) = tan² x.
2. a) Dresser le tableau de variation de g (on précisera la limite de g à gauche en π/2).
   b) En déduire que pour tout x de [0, π/2[ : tan x ≥ x.
3. a) Donner une équation de la tangente à la courbe de la fonction tan au point O.
   b) Préciser la position de la courbe de tan par rapport à cette tangente sur ]−π/2, π/2[.

### Corrigé — Partie A

**1.** D'après la formule cos(a − b) = cos a cos b + sin a sin b :

    2 cos(2x − π/3) = 2[cos 2x cos(π/3) + sin 2x sin(π/3)] = 2[(1/2) cos 2x + (√3/2) sin 2x] = cos 2x + √3 sin 2x = f(x)

(C'est l'écriture a cos u + b sin u = r cos(u − φ) avec a = 1, b = √3, r = √(1 + 3) = 2, cos φ = 1/2, sin φ = √3/2, donc φ = π/3.)

**2. a)** Pour tout réel x, x + π est réel et f(x + π) = 2 cos(2x + 2π − π/3) = 2 cos(2x − π/3) = f(x), car cos est périodique de période 2π. Donc f est périodique de période π (c'est 2π/ω avec ω = 2).

**b)** Pour tout réel x, 2 × (π/6) − x = π/3 − x est réel et

    f(π/3 − x) = 2 cos(2π/3 − 2x − π/3) = 2 cos(π/3 − 2x) = 2 cos(2x − π/3) = f(x)

car cos est paire. La droite d'équation x = π/6 est donc un axe de symétrie de 𝒞.

**3. a)** La fonction x ↦ cos(2x − π/3) est dérivable sur ℝ, de dérivée x ↦ −2 sin(2x − π/3). Donc f est dérivable sur ℝ et f'(x) = 2 × (−2 sin(2x − π/3)) = −4 sin(2x − π/3).

**b)** Pour x ∈ [0, π], on pose u = 2x − π/3 : alors u ∈ [−π/3, 5π/3], et f'(x) a le signe contraire de sin u.

- sin u > 0 ⟺ u ∈ ]0, π[ ⟺ x ∈ ]π/6, 2π/3[ : f'(x) < 0 ;
- sin u = 0 ⟺ u = 0 ou u = π ⟺ x = π/6 ou x = 2π/3 : f'(x) = 0 ;
- sin u < 0 ⟺ u ∈ [−π/3, 0[ ou u ∈ ]π, 5π/3] ⟺ x ∈ [0, π/6[ ou x ∈ ]2π/3, π] : f'(x) > 0.

Valeurs : f(0) = 2 cos(−π/3) = 1 ; f(π/6) = 2 cos 0 = 2 ; f(2π/3) = 2 cos π = −2 ; f(π) = 2 cos(5π/3) = 2 × (1/2) = 1.

    x      | 0           π/6          2π/3          π
    f'(x)  |      +      0      −      0      +
    f(x)   | 1    ↗      2      ↘     −2      ↗     1

Comme −1 ≤ cos(2x − π/3) ≤ 1, on a −2 ≤ f(x) ≤ 2 pour tout réel x : 2 est le maximum de f sur ℝ et −2 son minimum.

**4. a)** f(x) = 1 ⟺ cos(2x − π/3) = 1/2 = cos(π/3)
⟺ 2x − π/3 = π/3 + 2kπ ou 2x − π/3 = −π/3 + 2kπ (k ∈ ℤ)
⟺ x = π/3 + kπ ou x = kπ (k ∈ ℤ).
Dans [0, π], les solutions sont 0, π/3 et π.

**b)** Pour x ∈ [0, π], u = 2x − π/3 ∈ [−π/3, 5π/3]. Sur le cercle trigonométrique, cos u ≥ 1/2 ⟺ u ∈ [−π/3 + 2kπ, π/3 + 2kπ] (k ∈ ℤ). Les réels de [−π/3, 5π/3] qui conviennent sont ceux de [−π/3, π/3] et le réel 5π/3. Donc

    f(x) ≥ 1 ⟺ x ∈ [0, π/3] ou x = π          S = [0, π/3] ∪ {π}

C'est cohérent avec le tableau : f monte de 1 à 2 sur [0, π/6], redescend de 2 à −2 sur [π/6, 2π/3] en repassant par 1 en π/3, puis remonte de −2 à 1 sur [2π/3, π] et n'atteint 1 qu'en π.

**5. a)** f(0) = 1 et f'(0) = −4 sin(−π/3) = 4 × (√3/2) = 2√3. Donc T : y = 2√3 x + 1.

**b)** f est dérivable en 0, donc (f(x) − f(0)) / (x − 0) tend vers f'(0) quand x tend vers 0. Or (f(x) − f(0)) / x = (cos 2x + √3 sin 2x − 1) / x. La limite cherchée est 2√3.

**6.** Points utiles sur [0, π] :

    x      | 0     π/6    π/3    5π/12    2π/3    11π/12    π
    f(x)   | 1     2      1      0        −2      0         1

Tangentes horizontales aux points (π/6, 2) et (2π/3, −2) ; tangente de pente 2√3 en (0, 1) et en (π, 1) (f'(π) = −4 sin(5π/3) = 2√3). Les zéros viennent de cos(2x − π/3) = 0 ⟺ x = 5π/12 + kπ/2.
f est périodique de période π : on obtient 𝒞 sur [−π, 0] et sur [π, 2π] en appliquant à l'arc tracé sur [0, π] les translations de vecteurs −π i et π i.

### Corrigé — Partie B

**1.** La fonction tan est dérivable sur ]−π/2, π/2[, qui contient [0, π/2[, et x ↦ x est dérivable sur ℝ. Donc g est dérivable sur [0, π/2[ et g'(x) = (1 + tan² x) − 1 = tan² x.

**2. a)** g'(x) = tan² x ≥ 0, et g'(x) = 0 seulement pour x = 0 (sur [0, π/2[, tan x = 0 ⟺ x = 0). Donc g est strictement croissante sur [0, π/2[. g(0) = tan 0 − 0 = 0.
Quand x tend vers π/2 à gauche, tan x tend vers +∞ et x tend vers π/2, donc g(x) tend vers +∞.

    x      | 0                    π/2
    g'(x)  | 0          +
    g(x)   | 0          ↗         +∞

**b)** g est croissante sur [0, π/2[ et g(0) = 0, donc pour tout x de [0, π/2[ : g(x) ≥ 0, c'est-à-dire tan x ≥ x (avec égalité seulement pour x = 0).

**3. a)** tan 0 = 0 et (tan)'(0) = 1 + tan² 0 = 1. La tangente en O a pour équation y = x.

**b)** Sur ]0, π/2[ : tan x − x > 0 (2. b), égalité seulement en 0), donc la courbe de tan est strictement au-dessus de la droite y = x.
Sur ]−π/2, 0[ : −x ∈ ]0, π/2[ et, comme tan est impaire, tan x − x = −(tan(−x) − (−x)) = −g(−x) < 0, donc elle est strictement au-dessous.
Le seul point commun est O : la courbe traverse sa tangente en O.

---

## Exercice 2 — Problème : la grande roue

Une grande roue a pour centre un point Ω situé à 20 m au-dessus du sol et pour rayon 18 m. Elle tourne à vitesse constante et fait un tour complet en 20 minutes. À l'instant t = 0, une cabine K se trouve au point le plus bas de la roue.
On admet que la hauteur au-dessus du sol (en m) de la cabine K à l'instant t (en minutes) est

    h(t) = 20 − 18 cos(πt/10)

1. a) Calculer h(0), h(5) et h(10). Interpréter ces résultats.
   b) Montrer que h est périodique de période 20. Interpréter.
2. a) Montrer que h est dérivable sur ℝ et que h'(t) = (9π/5) sin(πt/10).
   b) Dresser le tableau de variation de h sur [0, 20]. Quelles sont la hauteur minimale et la hauteur maximale de la cabine ?
3. a) Résoudre dans [0, 20] l'équation h(t) = 29.
   b) Pendant un tour, combien de temps la cabine reste-t-elle à 29 m ou plus du sol ? Donner le résultat en minutes et secondes.
4. La vitesse verticale de la cabine à l'instant t est v(t) = h'(t) (en m/min).
   a) Étudier les variations de v sur [0, 20].
   b) À quel instant de [0, 20] la cabine monte-t-elle le plus vite ? À quel instant descend-elle le plus vite ? À quelle hauteur est-elle alors ?
   c) Montrer que pour tout réel t : |v(t)| ≤ 9π/5. Donner une valeur approchée de 9π/5 à 0.01 près.
5. Une deuxième cabine K' est diamétralement opposée à K sur la roue. Elle a donc, à l'instant t, la hauteur qu'aura K à l'instant t + 10 (une demi-période plus tard) : h₂(t) = h(t + 10).
   a) Montrer que h₂(t) = 20 + 18 cos(πt/10), puis que h(t) + h₂(t) = 40. Interpréter.
   b) Déterminer les instants de [0, 20] où les deux cabines sont à la même hauteur.

### Corrigé

**1. a)** h(0) = 20 − 18 cos 0 = 2 ; h(5) = 20 − 18 cos(π/2) = 20 ; h(10) = 20 − 18 cos π = 38.
Au départ, la cabine est à 2 m du sol (point le plus bas : 20 − 18). Après 5 minutes (un quart de tour), elle est à la hauteur du centre Ω. Après 10 minutes (un demi-tour), elle est au point le plus haut : 20 + 18 = 38 m.

**b)** Pour tout réel t : h(t + 20) = 20 − 18 cos(πt/10 + 2π) = 20 − 18 cos(πt/10) = h(t). Donc h est périodique de période 20 (c'est 2π/ω avec ω = π/10) : toutes les 20 minutes, c'est-à-dire à chaque tour, la cabine repasse par les mêmes hauteurs.

**2. a)** La fonction t ↦ cos(πt/10) est dérivable sur ℝ, de dérivée t ↦ −(π/10) sin(πt/10). Donc h est dérivable sur ℝ et

    h'(t) = −18 × (−(π/10) sin(πt/10)) = (18π/10) sin(πt/10) = (9π/5) sin(πt/10)

**b)** Pour t ∈ [0, 20], u = πt/10 ∈ [0, 2π] :

- sin u > 0 ⟺ u ∈ ]0, π[ ⟺ t ∈ ]0, 10[ : h'(t) > 0 ;
- sin u < 0 ⟺ u ∈ ]π, 2π[ ⟺ t ∈ ]10, 20[ : h'(t) < 0 ;
- h'(0) = h'(10) = h'(20) = 0.

    t      | 0            10            20
    h'(t)  | 0     +      0      −      0
    h(t)   | 2     ↗      38     ↘      2

La hauteur minimale est 2 m (en t = 0 et t = 20), la hauteur maximale est 38 m (en t = 10).

**3. a)** h(t) = 29 ⟺ −18 cos(πt/10) = 9 ⟺ cos(πt/10) = −1/2 = cos(2π/3).
Avec u = πt/10 ∈ [0, 2π] : cos u = −1/2 ⟺ u = 2π/3 ou u = 4π/3 ⟺ t = 20/3 ou t = 40/3.

**b)** h(t) ≥ 29 ⟺ cos u ≤ −1/2. Pour u ∈ [0, 2π], sur le cercle trigonométrique : cos u ≤ −1/2 ⟺ u ∈ [2π/3, 4π/3] ⟺ t ∈ [20/3, 40/3].
La durée est 40/3 − 20/3 = 20/3 min, soit 6 min 40 s (le tiers d'un tour).
C'est cohérent avec le tableau : h croît de 2 à 38 sur [0, 10] et passe par 29 en 20/3 ≈ 6.67 ; elle décroît de 38 à 2 sur [10, 20] et repasse par 29 en 40/3 ≈ 13.33.

**4. a)** v(t) = (9π/5) sin(πt/10) est dérivable sur ℝ et

    v'(t) = (9π/5) × (π/10) cos(πt/10) = (9π²/50) cos(πt/10)

Pour u = πt/10 ∈ [0, 2π] : cos u > 0 sur [0, π/2[ et sur ]3π/2, 2π], cos u < 0 sur ]π/2, 3π/2[. Donc v'(t) > 0 sur [0, 5[ et sur ]15, 20], v'(t) < 0 sur ]5, 15[.
v(0) = 0, v(5) = (9π/5) sin(π/2) = 9π/5, v(15) = (9π/5) sin(3π/2) = −9π/5, v(20) = 0.

    t      | 0            5             15            20
    v'(t)  |       +      0      −      0      +
    v(t)   | 0     ↗     9π/5    ↘    −9π/5    ↗      0

**b)** La cabine monte le plus vite à t = 5 min (v = 9π/5 m/min) et descend le plus vite à t = 15 min (v = −9π/5 m/min).
h(5) = 20 et h(15) = 20 − 18 cos(3π/2) = 20 : dans les deux cas, la cabine est à la hauteur du centre Ω.

**c)** |v(t)| = (9π/5) |sin(πt/10)| ≤ 9π/5, car |sin(πt/10)| ≤ 1. On a 9π/5 ≈ 5.65 : la vitesse verticale ne dépasse jamais environ 5.65 m/min.

**5. a)** h₂(t) = h(t + 10) = 20 − 18 cos(πt/10 + π) = 20 + 18 cos(πt/10), car cos(α + π) = −cos α.
Donc h(t) + h₂(t) = 40, soit (h(t) + h₂(t)) / 2 = 20 : la moyenne des hauteurs des deux cabines est la hauteur de Ω. C'est normal, Ω est le milieu du diamètre [KK'].

**b)** h(t) = h₂(t) ⟺ −18 cos(πt/10) = 18 cos(πt/10) ⟺ cos(πt/10) = 0 ⟺ πt/10 = π/2 + kπ (k ∈ ℤ) ⟺ t = 5 + 10k.
Dans [0, 20] : t = 5 min et t = 15 min. Les deux cabines sont alors à 20 m : le diamètre [KK'] est horizontal.
