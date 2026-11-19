# 1ère année — Chapitre 13 : Équations et inéquations du premier degré à une inconnue

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 9, « Activités algébriques » : équations et inéquations linéaires du premier degré à une inconnue réelle ; équations et inéquations se ramenant au premier degré ; signe d'un binôme du premier degré ; modéliser des situations réelles menant à des équations ou des inéquations.
- Manuel CNP, chapitre 13 (p. 197–212) : équations équivalentes (on ajoute un même terme aux deux membres, on multiplie les deux membres par un même réel non nul) ; l'équation ax + b = 0 (a ≠ 0) a pour unique solution −b/a ; ab = 0 équivaut à a = 0 ou b = 0 ; équation x² = a ; |a| = |b| équivaut à a² = b² ; inéquations ; tableau de signe de ax + b et d'un produit de deux binômes ; comparaison de tarifs.
- Outils autorisés : ce chapitre, les identités remarquables (chapitre 11), les intervalles, l'ordre et la valeur absolue (chapitres 9 et 10). Pas de théorie du second degré : les équations de degré 2 sont toutes résolues par factorisation.
- Notation : S est l'ensemble des solutions ; intervalles [a, b], ]a, b[, ]−∞, a[, [a, +∞[ ; prix en dinars (D) ; point décimal (0.5).
- Toutes les valeurs sont vérifiées par `check_ch13.py` (calcul exact en fractions, et balayage d'une grille de rationnels pour les ensembles de solutions).

---

## Exercice 1 — Équations, équations produits, inéquations, tableau de signe

1. Résoudre dans ℝ les équations suivantes.

       a) 3(2x − 5) − 4(x + 1) = 7 − (x − 2)
       b) (x − 1)/2 − (2x + 1)/3 = (x − 4)/6
       c) 2(3x + 1) − x = 5(x + 1)

2. Résoudre dans ℝ les équations suivantes en se ramenant à une équation produit.

       a) (3x − 1)² − (x + 5)² = 0
       b) 4x² − 12x + 9 = 49
       c) |x − 7| = |3x + 1|

3. Résoudre dans ℝ les inéquations suivantes. Donner l'ensemble des solutions sous forme d'intervalle.

       a) 2(x − 3) − 5 ≤ 4x + 1
       b) (1 − 2x)/3 > (x + 2)/4 − 1

4. Soit E(x) = 4x² − 9 − (2x + 3)(x − 5).
   a) Factoriser E(x).
   b) Développer et réduire E(x), puis résoudre dans ℝ l'équation E(x) = 6.
   c) Dresser le tableau de signe de E(x).
   d) Résoudre dans ℝ l'inéquation E(x) < 0.
   e) Déterminer les entiers relatifs n tels que E(n) ≤ 0.

### Corrigé

**1. a)** On développe et on réduit chaque membre :
3(2x − 5) − 4(x + 1) = 6x − 15 − 4x − 4 = 2x − 19 et 7 − (x − 2) = 7 − x + 2 = 9 − x.
L'équation équivaut à 2x − 19 = 9 − x, soit 3x = 28, soit x = 28/3. S = {28/3}.

**b)** On multiplie les deux membres par 6 (non nul) : 3(x − 1) − 2(2x + 1) = x − 4.
Soit 3x − 3 − 4x − 2 = x − 4, soit −x − 5 = x − 4, soit −2x = 1, donc x = −1/2.
Contrôle : (−1/2 − 1)/2 = −3/4 ; (2 × (−1/2) + 1)/3 = 0 ; (−1/2 − 4)/6 = −3/4. S = {−1/2}.

**c)** 6x + 2 − x = 5x + 5 équivaut à 5x + 2 = 5x + 5, puis, en ajoutant −5x aux deux membres, à 2 = 5, ce qui est impossible.
L'équation n'a pas de solution : S = ∅.

**2. a)** On utilise a² − b² = (a − b)(a + b) avec a = 3x − 1 et b = x + 5 :
(3x − 1)² − (x + 5)² = (3x − 1 − x − 5)(3x − 1 + x + 5) = (2x − 6)(4x + 4).
(2x − 6)(4x + 4) = 0 équivaut à 2x − 6 = 0 ou 4x + 4 = 0, soit x = 3 ou x = −1. S = {−1 ; 3}.

**b)** 4x² − 12x + 9 = (2x − 3)². L'équation s'écrit (2x − 3)² = 49, soit (2x − 3)² − 7² = 0, soit (2x − 3 − 7)(2x − 3 + 7) = 0, soit (2x − 10)(2x + 4) = 0.
Donc x = 5 ou x = −2. S = {−2 ; 5}.

**c)** |a| = |b| équivaut à a² = b², soit a² − b² = 0, soit (a − b)(a + b) = 0. Avec a = x − 7 et b = 3x + 1 :
(x − 7 − 3x − 1)(x − 7 + 3x + 1) = 0, soit (−2x − 8)(4x − 6) = 0, donc x = −4 ou x = 3/2.
Contrôle : |−4 − 7| = 11 et |3 × (−4) + 1| = |−11| = 11 ; |1.5 − 7| = 5.5 et |4.5 + 1| = 5.5. S = {−4 ; 3/2}.

**3. a)** 2(x − 3) − 5 ≤ 4x + 1 équivaut à 2x − 11 ≤ 4x + 1, soit −2x ≤ 12.
On divise par −2, qui est négatif : le sens de l'inégalité change, x ≥ −6. S = [−6, +∞[.

**b)** On multiplie les deux membres par 12, qui est positif : 4(1 − 2x) > 3(x + 2) − 12.
Soit 4 − 8x > 3x − 6, soit 10 > 11x, soit x < 10/11. S = ]−∞, 10/11[.

**4. a)** 4x² − 9 = (2x − 3)(2x + 3), donc :
E(x) = (2x + 3)(2x − 3) − (2x + 3)(x − 5) = (2x + 3)[(2x − 3) − (x − 5)] = (2x + 3)(x + 2).

**b)** E(x) = (2x + 3)(x + 2) = 2x² + 4x + 3x + 6 = 2x² + 7x + 6.
E(x) = 6 équivaut à 2x² + 7x = 0, soit x(2x + 7) = 0, soit x = 0 ou x = −7/2. S = {−7/2 ; 0}.

**c)** 2x + 3 = 0 pour x = −3/2, et x + 2 = 0 pour x = −2 ; on a −2 < −3/2.
2x + 3 est négatif pour x < −3/2 et positif pour x > −3/2 ; x + 2 est négatif pour x < −2 et positif pour x > −2. Le signe du produit s'obtient par la règle des signes :

    x          | −∞          −2           −3/2          +∞
    2x + 3     |       −            −       0      +
    x + 2      |       −      0     +              +
    E(x)       |       +      0     −       0      +

**d)** D'après le tableau, E(x) < 0 équivaut à −2 < x < −3/2. S = ]−2, −3/2[.

**e)** E(n) ≤ 0 équivaut à −2 ≤ n ≤ −3/2, c'est-à-dire −2 ≤ n ≤ −1.5. Le seul entier relatif de cet intervalle est −2.
Contrôle : E(−2) = (−1) × 0 = 0 et E(−1) = 1 × 1 = 1 > 0. Réponse : n = −2.

---

## Exercice 2 — Choisir le tarif le plus avantageux

Une piscine municipale propose trois tarifs pour une année :

- Tarif A : 4 D par entrée.
- Tarif B : une carte annuelle de 30 D, puis 2.5 D par entrée.
- Tarif C : un abonnement de 120 D, avec un nombre d'entrées illimité.

On note x le nombre d'entrées dans l'année (x est un entier naturel) et A(x), B(x), C(x) les prix payés, en dinars, avec chacun des tarifs.

1. a) Exprimer A(x), B(x) et C(x) en fonction de x.
   b) Calculer A(15), B(15) et C(15). Quel est le tarif le moins cher pour 15 entrées ?
2. a) Résoudre l'inéquation A(x) < B(x). Pour quelle valeur de x les tarifs A et B donnent-ils le même prix ?
   b) Résoudre l'inéquation B(x) < C(x), puis l'inéquation A(x) < C(x).
3. En déduire, suivant le nombre d'entrées x, le tarif le moins cher. Résumer la réponse dans un tableau.
4. Sami dispose de 100 D pour l'année. Quel est le nombre maximal d'entrées qu'il peut payer avec chacun des tarifs ? Quel tarif doit-il choisir ?
5. Avec le tarif B, une entrée revient en moyenne à B(x)/x dinars (pour x ≥ 1). À partir de combien d'entrées ce prix moyen est-il inférieur ou égal à 3 D ?

### Corrigé

**1. a)** A(x) = 4x ; B(x) = 30 + 2.5x ; C(x) = 120.

**b)** A(15) = 60 ; B(15) = 30 + 37.5 = 67.5 ; C(15) = 120. Pour 15 entrées, le tarif A est le moins cher.

**2. a)** A(x) < B(x) équivaut à 4x < 30 + 2.5x, soit 1.5x < 30, soit x < 20. x étant un entier naturel : S = {0, 1, …, 19}.
A(x) = B(x) équivaut à 1.5x = 30, soit x = 20 : pour 20 entrées, A(20) = B(20) = 80 D.

**b)** B(x) < C(x) équivaut à 30 + 2.5x < 120, soit 2.5x < 90, soit x < 36. x étant un entier naturel : S = {0, 1, …, 35}. Pour x = 36, B(36) = C(36) = 120 D.
A(x) < C(x) équivaut à 4x < 120, soit x < 30. x étant un entier naturel : S = {0, 1, …, 29}.

**3.** x est un entier naturel.

- Si 0 ≤ x ≤ 19 : x < 20 donc A(x) < B(x), et x < 30 donc A(x) < C(x). Le tarif A est le moins cher.
- Si x = 20 : A(20) = B(20) = 80 < 120. Les tarifs A et B sont les moins chers.
- Si 21 ≤ x ≤ 35 : x > 20 donc B(x) < A(x), et x < 36 donc B(x) < C(x). Le tarif B est le moins cher.
- Si x = 36 : B(36) = C(36) = 120 < A(36) = 144. Les tarifs B et C sont les moins chers.
- Si x ≥ 37 : x > 36 donc C(x) < B(x), et x > 30 donc C(x) < A(x). Le tarif C est le moins cher.

En résumé :

    nombre d'entrées x    | 0 à 19 | 20     | 21 à 35 | 36     | 37 ou plus
    tarif le moins cher   | A      | A ou B | B       | B ou C | C

**4.** Tarif A : 4x ≤ 100 équivaut à x ≤ 25 : au plus 25 entrées.
Tarif B : 30 + 2.5x ≤ 100 équivaut à 2.5x ≤ 70, soit x ≤ 28 : au plus 28 entrées.
Tarif C : 120 > 100, Sami ne peut pas payer l'abonnement.
Sami doit choisir le tarif B, qui lui permet 28 entrées.

**5.** Pour x ≥ 1 : B(x)/x ≤ 3 équivaut à 30 + 2.5x ≤ 3x (on multiplie les deux membres par x, qui est positif), soit 30 ≤ 0.5x, soit x ≥ 60.
Le prix moyen d'une entrée avec le tarif B est inférieur ou égal à 3 D à partir de 60 entrées (B(60) = 180 et 180/60 = 3).
Remarque : à partir de 37 entrées, le tarif C est de toute façon moins cher que le tarif B (question 3).
