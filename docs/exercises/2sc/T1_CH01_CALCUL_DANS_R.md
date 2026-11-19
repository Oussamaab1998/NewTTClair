# 2ème Sciences — Tome 1, Chapitre 1 : Calcul dans ℝ

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (2ème Sciences et Technologie de l'informatique), p. 19, activités numériques : calcul dans ℝ. Aptitudes : calculer et simplifier une expression numérique, donner une valeur approchée, un arrondi, une estimation d'une expression numérique ; résoudre des problèmes en rapport avec l'environnement (proportionnalité).
- Manuel CNP (tome 1, p. 7–16) : ensembles de nombres, proportionnalité et pourcentages, identités remarquables, comparaison de a, a², √a et 1/a, encadrements et inégalités, radicaux (pas de radical au dénominateur, simplification de √(p − q√r)), formule de Héron (activité 34), valeur absolue et distance sur une droite graduée, valeurs approchées et arrondis, écriture scientifique et ordre de grandeur. Définitions du manuel utilisées : a est une valeur approchée de b à 10ⁿ près si |b − a| ≤ 10ⁿ, par défaut si a < b, par excès si a > b ; si a × 10ⁿ est l'écriture scientifique d'un nombre, son ordre de grandeur est b × 10ⁿ, où b est l'arrondi de a à l'unité. La formule de Héron est une image dans la copie du manuel : elle est rappelée dans l'énoncé.
- Outils autorisés : ce chapitre et les acquis de 1ère année (identités remarquables, racine carrée, valeur absolue, équations du premier degré, théorème de Pythagore, aires). Pas de second degré (chapitre 2).
- Notation : sur une droite graduée, M(x) est le point d'abscisse x ; AB est une longueur.
- Toutes les valeurs sont vérifiées par `check_t1_ch01.py` (calcul exact en fractions et en nombres de la forme p + q√5 ou p + q√6).

---

## Exercice 1 — Radicaux, valeur absolue, comparaison, encadrements

1. a) Développer (√5 − 1)².
   b) En déduire une écriture simplifiée du réel A = √(6 − 2√5).
2. Écrire le réel B = 4 / (√5 − 1) sans radical au dénominateur, puis vérifier que B − A = 2.
3. a) Justifier que 2 < √5 < 3.
   b) Écrire sans le symbole de la valeur absolue le réel C = |2 − √5| − |3 − √5|.
4. Une droite Δ est munie d'un repère (O, I). On considère les points K, E et F de Δ d'abscisses respectives √5, A et B.
   a) Calculer les distances EF, KE et KF. Que représente le point K pour le segment [EF] ?
   b) Déterminer l'ensemble des points M(x) de Δ tels que |x − √5| = 1, puis l'ensemble des points M(x) de Δ tels que |x − √5| ≤ 1.
5. On pose t = √5 − 2.
   a) Montrer que 0 < t < 1 et que 1/t = √5 + 2.
   b) Ranger dans l'ordre croissant les réels t, t², √t et 1/t, en justifiant.
6. On donne l'encadrement 2.236 < √5 < 2.237.
   a) En déduire un encadrement de t et un encadrement de 1/t.
   b) En utilisant l'encadrement de t obtenu en a), en déduire un encadrement de t².
   c) Donner une valeur approchée de t² à 10⁻² près par défaut, puis l'arrondi de t² à 10⁻².

### Corrigé

**1. a)** (√5 − 1)² = (√5)² − 2√5 + 1 = 6 − 2√5.

**b)** D'après a), 6 − 2√5 = (√5 − 1)². Comme 5 > 1, √5 > 1 et le réel √5 − 1 est positif. Pour tout réel positif u, √(u²) = u, donc A = √((√5 − 1)²) = √5 − 1.

**2.** On multiplie le numérateur et le dénominateur par le conjugué √5 + 1 :

    B = 4(√5 + 1) / ((√5 − 1)(√5 + 1)) = 4(√5 + 1) / (5 − 1) = √5 + 1

Donc B − A = (√5 + 1) − (√5 − 1) = 2.

**3. a)** 4 < 5 < 9 et la racine carrée conserve l'ordre sur [0, +∞[, donc √4 < √5 < √9, soit 2 < √5 < 3.

**b)** Comme √5 > 2, on a 2 − √5 < 0, donc |2 − √5| = √5 − 2.
Comme √5 < 3, on a 3 − √5 > 0, donc |3 − √5| = 3 − √5.
C = (√5 − 2) − (3 − √5) = 2√5 − 5.

**4. a)** EF = |B − A| = 2 ; KE = |A − √5| = |−1| = 1 ; KF = |B − √5| = |1| = 1.
L'abscisse du milieu de [EF] est (A + B) / 2 = ((√5 − 1) + (√5 + 1)) / 2 = √5 : K est le milieu du segment [EF].

**b)** |x − √5| est la distance KM.

- |x − √5| = 1 ⟺ x − √5 = 1 ou x − √5 = −1 ⟺ x = √5 + 1 ou x = √5 − 1. Les points cherchés sont E et F.
- |x − √5| ≤ 1 ⟺ −1 ≤ x − √5 ≤ 1 ⟺ √5 − 1 ≤ x ≤ √5 + 1. L'ensemble cherché est le segment [EF] : ce sont les points M(x) avec x ∈ [√5 − 1, √5 + 1].

**5. a)** D'après 3. a), 2 < √5 < 3. En retranchant 2 : 0 < √5 − 2 < 1, soit 0 < t < 1.
(√5 − 2)(√5 + 2) = 5 − 4 = 1, donc 1/t = √5 + 2.

**b)**

- 0 < t < 1 : en multipliant par t > 0, on obtient t² < t.
- 0 < t < 1, donc 0 < √t < √1 = 1. En multipliant √t < 1 par √t > 0 : (√t)² < √t, soit t < √t.
- √t < 1 et 1/t = √5 + 2 > 1, donc √t < 1/t.

Conclusion : t² < t < √t < 1/t.

**6. a)** En retranchant 2 aux trois membres de 2.236 < √5 < 2.237 : 0.236 < t < 0.237.
En ajoutant 2 : 4.236 < √5 + 2 < 4.237, soit 4.236 < 1/t < 4.237.

**b)** Pour des réels positifs u et v, u < v entraîne u² < v². Donc 0.236² < t² < 0.237², soit

    0.055696 < t² < 0.056169

Remarque : à partir de t² = 9 − 4√5, on obtient seulement 0.052 < t² < 0.056 ; cet encadrement contient 0.055 et ne permet pas de trouver l'arrondi demandé en c).

**c)** On en déduit 0.05 < t² < 0.06, donc 0 < t² − 0.05 < 0.01 : 0.05 est une valeur approchée de t² à 10⁻² près par défaut.
De plus 0.055 < t² < 0.06 : t² est plus proche de 0.06 que de 0.05. L'arrondi de t² à 10⁻² est 0.06.
(Pour information, t² = 9 − 4√5 ≈ 0.0557.)

---

## Exercice 2 — Un terrain triangulaire

Un agriculteur possède un terrain plat en forme de triangle ABC, avec AB = 50 m, BC = 60 m et AC = 70 m. On note H le pied de la hauteur issue de A ; on admet que H appartient au segment [BC]. On pose BH = x (en mètres).

1. a) En utilisant le théorème de Pythagore dans les triangles ABH et ACH, montrer que 2500 − x² = 4900 − (60 − x)².
   b) En déduire x, puis montrer que AH = 20√6.
   c) Calculer l'aire 𝒜 du terrain, en m², sous la forme k√6 avec k entier.
2. On rappelle la formule de Héron : l'aire d'un triangle dont les côtés mesurent a, b et c est

       𝒜 = √(p(p − a)(p − b)(p − c)),   où p = (a + b + c) / 2 est le demi-périmètre.

   Retrouver l'aire du terrain avec cette formule.
3. Sans calculatrice, comparer AH et 49, puis AH et 48.9. En déduire une valeur approchée de AH à 0.1 près par défaut.
4. a) On donne 2.449 < √6 < 2.450. En déduire un encadrement de 𝒜. Cet encadrement permet-il de donner l'arrondi de 𝒜 à l'unité ?
   b) On donne maintenant 2.4494 < √6 < 2.4495. Donner l'arrondi de 𝒜 à l'unité.
5. Dans la suite, on prend 𝒜 ≈ 1470 m². Le terrain est estimé à 45 dinars le mètre carré.
   a) Calculer la valeur du terrain.
   b) Le prix du mètre carré augmente de 20 %, puis baisse de 20 %. Calculer le nouveau prix du mètre carré et le pourcentage global de variation.
   c) Après la hausse de 20 %, de quel pourcentage le prix doit-il baisser pour revenir à 45 dinars ? Donner l'arrondi de ce pourcentage à 0.01 près.
6. L'agriculteur sème du blé sur tout le terrain, à raison de 350 grains par mètre carré. Un grain de blé pèse environ 4 × 10⁻² g. On rappelle que si a × 10ⁿ est l'écriture scientifique d'un nombre (1 ≤ a < 10, n entier), son ordre de grandeur est b × 10ⁿ, où b est l'arrondi de a à l'unité.
   a) Calculer le nombre de grains semés. Donner son écriture scientifique et son ordre de grandeur.
   b) Calculer la masse de ces grains, en grammes. Donner son écriture scientifique et son ordre de grandeur, puis exprimer cette masse en kilogrammes.

### Corrigé

**1. a)** Le triangle ABH est rectangle en H : AB² = AH² + BH², donc AH² = 2500 − x².
Comme H ∈ [BC], HC = BC − BH = 60 − x. Le triangle ACH est rectangle en H : AH² = AC² − HC² = 4900 − (60 − x)².
En égalant les deux expressions de AH² : 2500 − x² = 4900 − (60 − x)².

**b)** 4900 − (60 − x)² = 4900 − 3600 + 120x − x² = 1300 + 120x − x².
L'équation devient 2500 − x² = 1300 + 120x − x², soit 120x = 1200, donc x = 10.
AH² = 2500 − 10² = 2400 = 400 × 6. Comme AH > 0 : AH = √400 × √6 = 20√6 m.
(Contrôle : HC = 50 et AH² + HC² = 2400 + 2500 = 4900 = AC².)

**c)** 𝒜 = BC × AH / 2 = 60 × 20√6 / 2 = 600√6 m².

**2.** p = (50 + 60 + 70) / 2 = 90, puis p − 60 = 30, p − 70 = 20 et p − 50 = 40.

    p(p − a)(p − b)(p − c) = 90 × 30 × 20 × 40 = 2160000 = 600² × 6

Donc 𝒜 = √(600² × 6) = 600√6 m² : on retrouve le résultat du 1. c).

**3.** AH² = 2400 et 49² = 2401. Les deux nombres AH et 49 sont positifs et AH² < 49², donc AH < 49.
48.9² = 2391.21 < 2400 = AH², donc 48.9 < AH.
Ainsi 48.9 < AH < 49, donc 0 < AH − 48.9 < 0.1 : 48.9 est une valeur approchée de AH à 0.1 près par défaut.

**4. a)** En multipliant par 600 > 0 : 600 × 2.449 < 𝒜 < 600 × 2.450, soit 1469.4 < 𝒜 < 1470.
L'arrondi à l'unité est 1469 si 𝒜 < 1469.5, et 1470 si 𝒜 ≥ 1469.5. L'encadrement contient 1469.5 : il ne permet pas de conclure. (Il montre seulement que 1469 est une valeur approchée de 𝒜 à l'unité par défaut.)

**b)** 600 × 2.4494 < 𝒜 < 600 × 2.4495, soit 1469.64 < 𝒜 < 1469.7.
Donc 1469.5 < 𝒜 < 1470 : l'arrondi de 𝒜 à l'unité est 1470 m². (Pour information, 𝒜 ≈ 1469.69 m².)

**5. a)** 1470 × 45 = 66150 dinars.

**b)** Une hausse de 20 % revient à multiplier par 1.2, une baisse de 20 % à multiplier par 0.8.
Après la hausse : 45 × 1.2 = 54 dinars ; après la baisse : 54 × 0.8 = 43.2 dinars.
Le coefficient global est 1.2 × 0.8 = 0.96 = 1 − 0.04 : c'est une baisse globale de 4 %. Le prix ne revient pas à 45 dinars.

**c)** On cherche le coefficient k tel que 54 × k = 45 : k = 45 / 54 = 5/6.
La baisse est 1 − 5/6 = 1/6 ≈ 0.16667, c'est-à-dire environ 16.67 %.

**6. a)** 350 × 1470 = 514500 grains, soit 5.145 × 10⁵. L'arrondi de 5.145 à l'unité est 5 : l'ordre de grandeur est 5 × 10⁵ grains.

**b)** 514500 × 4 × 10⁻² = 20580 g, soit 2.058 × 10⁴ g. L'arrondi de 2.058 à l'unité est 2 : l'ordre de grandeur est 2 × 10⁴ g.
20580 g = 20.58 kg, soit environ 21 kg de blé.
