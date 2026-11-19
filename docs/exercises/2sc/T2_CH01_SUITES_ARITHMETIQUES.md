# 2ème Sciences — Tome 2, Chapitre 1 : Suites arithmétiques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 19 (activités numériques) : reconnaître qu'une suite est arithmétique ; déterminer sa raison ; déterminer son terme général (premier terme et raison donnés) ; calculer des sommes de termes consécutifs ; représenter les points Aₙ(n, Uₙ) ; utiliser cette représentation pour déterminer un terme et la raison ; modéliser des situations réelles.
- Manuel CNP (tome 2, p. 7–20) : (Uₙ) est arithmétique s'il existe un réel r tel que Uₙ₊₁ = Uₙ + r pour tout n ; Uₙ = U₀ + nr, Uₙ = Uₚ + (n − p)r, en particulier Uₙ = U₁ + (n − 1)r ; les points Aₙ(n, Uₙ) sont sur la droite de pente r et d'ordonnée à l'origine U₀ ; la somme de n termes consécutifs est S = n × (a + b) / 2, où a est le premier et b le dernier terme de la somme ; 1 + 2 + ... + n = n(n + 1) / 2. Trois termes consécutifs a, b, c vérifient b = (a + c) / 2 (exercice du manuel, redémontré ici à partir de la définition).
- Outils autorisés : ceux du chapitre, le tome 1 (critères de divisibilité ; équations et inéquations du second degré, discriminant Δ = b² − 4ac) et la 1ère année. Pas de raisonnement par récurrence, pas de limites ; calculatrice autorisée.
- Notation du manuel : suite (Uₙ), terme général Uₙ, raison r.
- Toutes les valeurs sont vérifiées par `check_t2_ch01.py` (calcul exact en fractions).

---

## Exercice 1 — Reconnaître une suite arithmétique, terme général, sommes, représentation graphique

1. Dans chacun des cas suivants, dire si la suite est arithmétique. Si oui, préciser son premier terme et sa raison.
   a) aₙ = (5 − 3n) / 2, pour tout n ∈ ℕ.
   b) b₀ = 4 et bₙ₊₁ = bₙ + n, pour tout n ∈ ℕ.
   c) cₙ = (n + 3)² − n², pour tout n ∈ ℕ.
   d) dₙ = 1 / (n + 1), pour tout n ∈ ℕ.
2. Déterminer le réel x pour que les nombres x − 1, 2x + 1 et 5x − 3 soient, dans cet ordre, trois termes consécutifs d'une suite arithmétique. Donner alors ces trois termes et la raison.
3. Soit (Uₙ) une suite arithmétique telle que U₇ = 26 et U₁₉ = 62.
   a) Déterminer la raison r et le premier terme U₀.
   b) Exprimer Uₙ en fonction de n.
   c) Les nombres 2026 et 2027 sont-ils des termes de la suite (Uₙ) ? Si oui, préciser l'entier n correspondant.
   d) Calculer les sommes

       S = U₀ + U₁ + ... + U₄₀        et        S' = U₁₀ + U₁₁ + ... + U₄₀

4. Le plan est muni d'un repère orthogonal (O, i, j).
   a) Placer les points A₀, A₁, A₂, A₃ et A₄, où Aₙ est le point de coordonnées (n, Uₙ).
   b) Montrer que pour tout entier naturel n, le point Aₙ appartient à la droite D d'équation y = 3x + 5. Que représentent la pente et l'ordonnée à l'origine de D pour la suite (Uₙ) ?
5. Dans un repère, on a représenté les points Bₙ(n, Vₙ) d'une suite arithmétique (Vₙ). On lit sur le graphique que B₀ a pour coordonnées (0, 9) et que B₄ a pour coordonnées (4, 3).
   a) Donner V₀ et V₄, puis la raison de la suite (Vₙ).
   b) Exprimer Vₙ en fonction de n. Donner une équation de la droite Δ qui contient tous les points Bₙ.
   c) Déterminer le plus petit entier naturel n tel que Vₙ < 0.
   d) Calculer V₀ + V₁ + ... + V₁₂. Expliquer ce résultat en regroupant les termes deux par deux.

### Corrigé

**1. a)** Pour tout n ∈ ℕ :

    aₙ₊₁ − aₙ = (5 − 3(n + 1)) / 2 − (5 − 3n) / 2 = −3/2

La différence est constante : (aₙ) est arithmétique, de premier terme a₀ = 5/2 = 2.5 et de raison r = −1.5.

**b)** b₁ = b₀ + 0 = 4, b₂ = b₁ + 1 = 5, b₃ = b₂ + 2 = 7.
b₁ − b₀ = 0 et b₂ − b₁ = 1 : la différence entre deux termes consécutifs n'est pas constante. (bₙ) n'est pas arithmétique.

**c)** cₙ = n² + 6n + 9 − n² = 6n + 9, donc cₙ₊₁ − cₙ = 6(n + 1) + 9 − (6n + 9) = 6 pour tout n.
(cₙ) est arithmétique, de premier terme c₀ = 9 et de raison 6.

**d)** d₀ = 1, d₁ = 1/2, d₂ = 1/3. d₁ − d₀ = −1/2 et d₂ − d₁ = −1/6 : ces différences ne sont pas égales. (dₙ) n'est pas arithmétique.

**2.** Trois nombres a, b, c sont, dans cet ordre, trois termes consécutifs d'une suite arithmétique de raison r si et seulement si b = a + r et c = b + r, c'est-à-dire si et seulement si b − a = c − b (la raison est alors r = b − a).
Ici : (2x + 1) − (x − 1) = x + 2 et (5x − 3) − (2x + 1) = 3x − 4.

    x + 2 = 3x − 4  ⟺  2x = 6  ⟺  x = 3

Pour x = 3, les trois nombres sont 2, 7 et 12 ; la raison est 5. (Contrôle : 7 = (2 + 12) / 2.)

**3. a)** On utilise Uₙ = Uₚ + (n − p)r avec n = 19 et p = 7 :

    U₁₉ = U₇ + 12r  ⟺  62 = 26 + 12r  ⟺  r = 3

Puis U₇ = U₀ + 7r, donc U₀ = 26 − 21 = 5.

**b)** Uₙ = U₀ + nr = 5 + 3n pour tout n ∈ ℕ.

**c)** Uₙ = 2026 ⟺ 3n = 2021. La somme des chiffres de 2021 est 5, qui n'est pas divisible par 3 : 2021 n'est pas un multiple de 3, et aucun entier n ne convient. 2026 n'est pas un terme de la suite.
Uₙ = 2027 ⟺ 3n = 2022 ⟺ n = 674. Donc 2027 = U₆₇₄ est un terme de la suite.

**d)** De U₀ à U₄₀ il y a 41 termes, et U₄₀ = 5 + 120 = 125 :

    S = 41 × (5 + 125) / 2 = 41 × 65 = 2665

De U₁₀ à U₄₀ il y a 40 − 10 + 1 = 31 termes, et U₁₀ = 5 + 30 = 35 :

    S' = 31 × (35 + 125) / 2 = 31 × 80 = 2480

Contrôle : S − S' = U₀ + ... + U₉ = 10 × (5 + 32) / 2 = 185, et 2665 − 2480 = 185.

**4. a)** U₀ = 5, U₁ = 8, U₂ = 11, U₃ = 14, U₄ = 17. On place A₀(0, 5), A₁(1, 8), A₂(2, 11), A₃(3, 14) et A₄(4, 17) (par exemple 1 cm pour une unité en abscisse et 1 cm pour 2 unités en ordonnée).

**b)** Pour tout n ∈ ℕ, Uₙ = 3n + 5 : les coordonnées (n, Uₙ) de Aₙ vérifient y = 3x + 5. Donc Aₙ ∈ D.
La pente de D est 3, c'est la raison r ; son ordonnée à l'origine est 5, c'est le premier terme U₀. Pour passer de Aₙ à Aₙ₊₁, on avance de 1 en abscisse et on monte de 3 en ordonnée : les points sont régulièrement espacés sur D.

**5. a)** V₀ = 9 et V₄ = 3. Comme V₄ = V₀ + 4r : r = (3 − 9) / 4 = −1.5.

**b)** Vₙ = 9 − 1.5n pour tout n ∈ ℕ. Les points Bₙ(n, 9 − 1.5n) vérifient tous y = −1.5x + 9.

    Δ : y = −1.5x + 9

(Pente −1.5 = r, ordonnée à l'origine 9 = V₀.)

**c)** Vₙ < 0 ⟺ 9 − 1.5n < 0 ⟺ n > 6. Le plus petit entier qui convient est n = 7 : V₇ = −1.5 (alors que V₆ = 0).

**d)** De V₀ à V₁₂ il y a 13 termes, et V₁₂ = 9 − 18 = −9 :

    V₀ + V₁ + ... + V₁₂ = 13 × (9 + (−9)) / 2 = 0

Regroupement : pour k = 0, 1, ..., 5, Vₖ + V₁₂₋ₖ = (9 − 1.5k) + (9 − 1.5(12 − k)) = 18 − 18 = 0, et le terme du milieu est V₆ = 0. Donc

    (V₀ + V₁₂) + (V₁ + V₁₁) + ... + (V₅ + V₇) + V₆ = 0 + 0 + ... + 0 + 0 = 0

(Les termes 9 ; 7.5 ; 6 ; 4.5 ; 3 ; 1.5 compensent exactement −1.5 ; −3 ; −4.5 ; −6 ; −7.5 ; −9.)

---

## Exercice 2 — Deux offres d'emploi

Un jeune technicien hésite entre deux offres d'emploi. Les salaires sont mensuels et exprimés en dinars.

- Offre A : 800 dinars le premier mois, puis une augmentation de 12 dinars chaque mois.
- Offre B : 950 dinars le premier mois, puis une augmentation de 6 dinars chaque mois.

Pour tout entier n ≥ 1, on note aₙ et bₙ les salaires du n-ième mois avec l'offre A et avec l'offre B. Ainsi a₁ = 800 et b₁ = 950.

1. a) Calculer a₂, a₃, b₂ et b₃.
   b) Justifier que (aₙ)ₙ≥₁ et (bₙ)ₙ≥₁ sont des suites arithmétiques. Exprimer aₙ et bₙ en fonction de n.
2. a) Calculer a₂₆ et b₂₆.
   b) À partir de quel mois le salaire de l'offre A est-il strictement supérieur à celui de l'offre B ?
3. Pour tout entier n ≥ 1, on note Aₙ = a₁ + a₂ + ... + aₙ et Bₙ = b₁ + b₂ + ... + bₙ les sommes totales perçues pendant les n premiers mois.
   a) Montrer que Aₙ = 6n² + 794n et Bₙ = 3n² + 947n.
   b) Calculer A₂₄ et B₂₄. Quelle offre rapporte le plus pendant les deux premières années ?
   c) Montrer que Aₙ − Bₙ = 3n(n − 51). En déduire à partir de combien de mois de travail le total perçu avec l'offre A dépasse celui de l'offre B.
4. Le technicien compte garder cet emploi 5 ans, soit 60 mois.
   a) Quelle offre est la plus avantageuse sur 60 mois ? De combien de dinars ?
   b) Avec l'offre A, calculer la somme perçue pendant la troisième année (du 25ème au 36ème mois).
5. Avec l'offre A, à partir de combien de mois le total perçu atteint-il 50000 dinars ?

### Corrigé

**1. a)** a₂ = 812, a₃ = 824 ; b₂ = 956, b₃ = 962.

**b)** Chaque mois, le salaire de l'offre A augmente de 12 dinars : aₙ₊₁ = aₙ + 12 pour tout n ≥ 1. (aₙ) est arithmétique de raison 12 et de premier terme a₁ = 800. De même, bₙ₊₁ = bₙ + 6 : (bₙ) est arithmétique de raison 6 et de premier terme b₁ = 950.
Avec Uₙ = U₁ + (n − 1)r :

    aₙ = 800 + 12(n − 1) = 788 + 12n
    bₙ = 950 + 6(n − 1) = 944 + 6n

**2. a)** a₂₆ = 788 + 312 = 1100 et b₂₆ = 944 + 156 = 1100 : le 26ème mois, les deux salaires sont égaux.

**b)** aₙ > bₙ ⟺ 788 + 12n > 944 + 6n ⟺ 6n > 156 ⟺ n > 26.
Le salaire de l'offre A est strictement supérieur à partir du 27ème mois (a₂₇ = 1112 et b₂₇ = 1106).

**3. a)** Aₙ est la somme de n termes consécutifs de (aₙ), de premier terme a₁ = 800 et de dernier terme aₙ = 788 + 12n :

    Aₙ = n × (800 + 788 + 12n) / 2 = n × (1588 + 12n) / 2 = 6n² + 794n

De même :

    Bₙ = n × (950 + 944 + 6n) / 2 = n × (1894 + 6n) / 2 = 3n² + 947n

**b)** A₂₄ = 6 × 576 + 794 × 24 = 3456 + 19056 = 22512 dinars.
B₂₄ = 3 × 576 + 947 × 24 = 1728 + 22728 = 24456 dinars.
Pendant les deux premières années, l'offre B rapporte plus (1944 dinars de plus).

**c)** Aₙ − Bₙ = 6n² + 794n − 3n² − 947n = 3n² − 153n = 3n(n − 51).
Pour n ≥ 1, 3n > 0, donc Aₙ − Bₙ a le signe de n − 51 :

- si n < 51 : Aₙ < Bₙ ;
- si n = 51 : Aₙ = Bₙ (A₅₁ = B₅₁ = 56100 dinars) ;
- si n > 51 : Aₙ > Bₙ.

Le total perçu avec l'offre A dépasse celui de l'offre B à partir du 52ème mois.
(Le salaire mensuel de A dépasse celui de B dès le 27ème mois, mais il faut encore 25 mois pour rattraper le retard accumulé pendant les 26 premiers mois.)

**4. a)** A₆₀ − B₆₀ = 3 × 60 × (60 − 51) = 1620. L'offre A est la plus avantageuse sur 60 mois, de 1620 dinars.
(A₆₀ = 21600 + 47640 = 69240 et B₆₀ = 10800 + 56820 = 67620.)

**b)** Du 25ème au 36ème mois il y a 12 termes, avec a₂₅ = 788 + 300 = 1088 et a₃₆ = 788 + 432 = 1220 :

    a₂₅ + a₂₆ + ... + a₃₆ = 12 × (1088 + 1220) / 2 = 6 × 2308 = 13848 dinars

Contrôle : A₃₆ − A₂₄ = (7776 + 28584) − 22512 = 36360 − 22512 = 13848.

**5.** On cherche les entiers n ≥ 1 tels que Aₙ ≥ 50000 :

    6n² + 794n ≥ 50000  ⟺  6n² + 794n − 50000 ≥ 0  ⟺  3n² + 397n − 25000 ≥ 0

Pour le trinôme 3x² + 397x − 25000 : Δ = 397² + 4 × 3 × 25000 = 157609 + 300000 = 457609, et √Δ ≈ 676.47.
Ses racines sont x₁ = (−397 − √Δ) / 6 ≈ −178.91 et x₂ = (−397 + √Δ) / 6 ≈ 46.58.
Le coefficient de x² est positif : le trinôme est positif ou nul à l'extérieur des racines. Pour n ≥ 1 (donc n > x₁), on a Aₙ ≥ 50000 ⟺ n ≥ x₂ ≈ 46.58 ⟺ n ≥ 47.
Contrôle : A₄₆ = 12696 + 36524 = 49220 < 50000 et A₄₇ = 13254 + 37318 = 50572 ≥ 50000.
Le total perçu atteint 50000 dinars à partir du 47ème mois.
