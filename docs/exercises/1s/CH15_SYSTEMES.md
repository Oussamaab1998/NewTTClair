# 1ère année — Chapitre 15 : Systèmes de deux équations à deux inconnues

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 9, « Activités algébriques » : systèmes linéaires de deux équations à deux inconnues réelles ; les résoudre ; modéliser des situations réelles ; problèmes d'optimisation. P. 13, « Activités dans un repère » : déterminer graphiquement le point d'intersection éventuel de deux droites.
- Manuel CNP, chapitre 15 (p. 227–240) : équation du premier degré à deux inconnues ax + by + c = 0 (a et b non tous les deux nuls), dont les solutions sont des couples (x, y) ; système de deux équations ; résoudre un système, c'est trouver, s'ils existent, tous les couples qui vérifient les deux égalités à la fois ; méthode par substitution ; méthode par élimination (multiplier les équations par des nombres bien choisis puis les additionner) ; utilisation d'un graphique (intersection de deux droites, système sans solution) ; problèmes de prix et de mélanges.
- Outils autorisés : ce chapitre, les équations du premier degré (chapitre 13), les fonctions affines et la droite d'équation y = ax + b (chapitre 14), le repère et le résultat du chapitre 6 « deux fonctions affines de même coefficient ont des représentations graphiques parallèles ». Pas de déterminant (programme de 2ème année).
- Notation : repère (O, I, J) (le manuel écrit aussi (O, OI, OJ) dans ce chapitre) ; les systèmes sont nommés (Σ1), (Σ2)… et S désigne l'ensemble des solutions, formé de couples (x, y) ; prix en dinars (D) ; point décimal (0.5).
- Toutes les valeurs sont vérifiées par `check_ch15.py` (calcul exact en fractions, énumération des couples d'entiers).

---

## Exercice 1 — Substitution, élimination, interprétation graphique

1. Résoudre par substitution le système

       (Σ1)    3x − y = 7
               5x + 2y = 8

2. Résoudre par élimination le système

       (Σ2)    4x + 3y = 1
               6x − 5y = 30

3. On considère le système

       (Σ3)    x/2 + y/3 = 2
               (x + 1)/3 − (y − 1)/2 = 0

   a) Montrer que (Σ3) équivaut au système : 3x + 2y = 12 et 2x − 3y = −5.
   b) Résoudre (Σ3).
4. a) Montrer que le système (Σ4) : 2x − y = 3 et −4x + 2y = 1 n'a pas de solution. Interpréter graphiquement ce résultat.
   b) Montrer que le système (Σ5) : x + 2y = 4 et 3x + 6y = 12 a une infinité de solutions (on pourra comparer la seconde équation au triple de la première). Donner trois solutions et décrire l'ensemble des solutions à l'aide d'une droite.
5. Le plan est muni d'un repère (O, I, J). On considère les droites D1 d'équation y = −x + 4 et D2 d'équation y = 0.5x + 1.
   a) Tracer D1 et D2, et lire les coordonnées de leur point d'intersection K.
   b) Écrire un système dont le couple des coordonnées de K est la solution. Le résoudre pour vérifier la lecture graphique.

### Corrigé

**1.** La première équation donne y = 3x − 7. On remplace y dans la seconde :
5x + 2(3x − 7) = 8, soit 11x − 14 = 8, soit 11x = 22, donc x = 2. Puis y = 3 × 2 − 7 = −1.
Contrôle : 3 × 2 − (−1) = 7 et 5 × 2 + 2 × (−1) = 8. S = {(2, −1)}.

**2.** On multiplie la première équation par 3 et la seconde par −2 :

    12x + 9y = 3
    −12x + 10y = −60

En additionnant : 19y = −57, donc y = −3. Puis 4x + 3 × (−3) = 1, soit 4x = 10, donc x = 2.5.
Contrôle : 6 × 2.5 − 5 × (−3) = 15 + 15 = 30. S = {(2.5, −3)}.
(On peut aussi éliminer y : 5 × (première) + 3 × (seconde) donne 38x = 95, soit x = 2.5.)

**3. a)** On multiplie chaque équation par 6 (non nul), ce qui donne des équations équivalentes :

- 6 × (x/2 + y/3) = 3x + 2y, donc la première équation équivaut à 3x + 2y = 12 ;
- 6 × ((x + 1)/3 − (y − 1)/2) = 2(x + 1) − 3(y − 1) = 2x − 3y + 5, donc la seconde équivaut à 2x − 3y + 5 = 0, soit 2x − 3y = −5.

**b)** On multiplie 3x + 2y = 12 par 3 et 2x − 3y = −5 par 2 : 9x + 6y = 36 et 4x − 6y = −10. En additionnant : 13x = 26, donc x = 2. Puis 3 × 2 + 2y = 12, soit y = 3.
Contrôle dans (Σ3) : 2/2 + 3/3 = 2 et (2 + 1)/3 − (3 − 1)/2 = 1 − 1 = 0. S = {(2, 3)}.

**4. a)** On multiplie la première équation par 2 : 4x − 2y = 6. En l'additionnant à la seconde : 0 = 7, ce qui est impossible. Le système n'a pas de solution : S = ∅.
Interprétation : 2x − y = 3 équivaut à y = 2x − 3, et −4x + 2y = 1 équivaut à y = 2x + 0.5. Ce sont deux droites de même coefficient directeur 2 : elles sont parallèles, et distinctes (elles coupent (OJ) en (0, −3) et en (0, 0.5)). Elles n'ont aucun point commun.

**b)** La seconde équation est la première multipliée par 3 : en divisant ses deux membres par 3, elle équivaut à x + 2y = 4. Le système équivaut donc à la seule équation x + 2y = 4, soit y = −0.5x + 2.
Les solutions sont tous les couples (x, −0.5x + 2) où x est un réel ; par exemple (0, 2), (2, 1) et (4, 0).
L'ensemble des solutions est représenté par la droite d'équation y = −0.5x + 2 : les deux équations représentent la même droite.

**5. a)** D1 passe par (0, 4) et (4, 0) ; son coefficient directeur est −1.
D2 passe par (0, 1), (2, 2) et (−2, 0) ; son coefficient directeur est 0.5.
Les deux droites se coupent au point K(2, 2) (lecture graphique).

**b)** Les coordonnées (x, y) de K vérifient les deux équations :

    y = −x + 4
    y = 0.5x + 1

Par substitution : −x + 4 = 0.5x + 1, soit 3 = 1.5x, donc x = 2, puis y = −2 + 4 = 2. S = {(2, 2)} : K(2, 2), ce qui confirme la lecture.

---

## Exercice 2 — Prix et mélanges

### Partie A — Huile d'olive

Une coopérative vend de l'huile d'olive en bouteilles de 1 litre et en bidons de 5 litres. Toutes les bouteilles ont le même prix et tous les bidons ont le même prix. Un premier client paie 146 D pour 3 bouteilles et 2 bidons ; un second client paie 115 D pour 5 bouteilles et 1 bidon.

1. On note x le prix d'une bouteille et y le prix d'un bidon, en dinars. Écrire un système traduisant la situation, puis le résoudre.
2. Calculer le prix d'un litre d'huile acheté en bidon. Quel conditionnement est le plus avantageux ?
3. Un restaurant veut acheter exactement 23 litres d'huile, en bouteilles et en bidons. On note b le nombre de bouteilles et n le nombre de bidons achetés.
   a) Montrer que b + 5n = 23, puis donner tous les couples d'entiers naturels (b, n) possibles.
   b) Exprimer le prix payé en fonction de n seulement. En déduire l'achat le moins cher et son prix.

### Partie B — Mélange de boissons

Un fabricant dispose de deux boissons : la boisson P contient 30 % de jus d'orange et la boisson Q en contient 60 % (pourcentages en volume). Il veut obtenir 9 litres d'une boisson contenant 40 % de jus d'orange, en mélangeant x litres de P et y litres de Q.

4. a) Montrer que x et y vérifient le système : x + y = 9 et 0.3x + 0.6y = 3.6.
   b) Résoudre ce système et conclure.
5. Dans un repère (O, I, J), représenter les deux droites associées aux équations de ce système et retrouver graphiquement la solution.
6. a) Le fabricant veut maintenant 9 litres d'une boisson contenant 70 % de jus d'orange. Écrire le système correspondant et le résoudre. Ce mélange est-il possible ?
   b) Montrer que, pour tous réels positifs ou nuls x et y tels que x + y = 9, la quantité de jus 0.3x + 0.6y est comprise entre 2.7 et 5.4 litres. Interpréter.

### Corrigé — Partie A

**1.** Le premier client donne 3x + 2y = 146, le second donne 5x + y = 115.
La seconde équation donne y = 115 − 5x. On remplace dans la première : 3x + 2(115 − 5x) = 146, soit 3x + 230 − 10x = 146, soit −7x = −84, donc x = 12. Puis y = 115 − 5 × 12 = 55.
Contrôle : 3 × 12 + 2 × 55 = 36 + 110 = 146. Une bouteille coûte 12 D et un bidon 55 D.

**2.** En bidon, un litre coûte 55 / 5 = 11 D, contre 12 D en bouteille. Le bidon est plus avantageux.

**3. a)** b bouteilles contiennent b litres et n bidons contiennent 5n litres, donc b + 5n = 23.
Comme b = 23 − 5n doit être un entier naturel, 5n ≤ 23, soit n ≤ 4.6 : n prend les valeurs 0, 1, 2, 3, 4.
Les couples possibles sont (23, 0), (18, 1), (13, 2), (8, 3) et (3, 4).

**b)** Le prix payé est p = 12b + 55n = 12(23 − 5n) + 55n = 276 − 5n.
Chaque bidon pris à la place de 5 bouteilles fait économiser 60 − 55 = 5 D. Le prix est le plus petit quand n est le plus grand, soit n = 4 :

    n         | 0     1     2     3     4
    b         | 23    18    13    8     3
    prix (D)  | 276   271   266   261   256

L'achat le moins cher est de 3 bouteilles et 4 bidons, pour 256 D.

### Corrigé — Partie B

**4. a)** Le volume total est 9 litres : x + y = 9.
La quantité de jus est 0.3x litre dans P et 0.6y litre dans Q ; elle doit représenter 40 % de 9 litres, soit 0.4 × 9 = 3.6 litres : 0.3x + 0.6y = 3.6.

**b)** La première équation donne y = 9 − x. On remplace : 0.3x + 0.6(9 − x) = 3.6, soit 0.3x + 5.4 − 0.6x = 3.6, soit −0.3x = −1.8, donc x = 6. Puis y = 9 − 6 = 3.
Contrôle : 0.3 × 6 + 0.6 × 3 = 1.8 + 1.8 = 3.6. Il faut mélanger 6 litres de P et 3 litres de Q.

**5.** x + y = 9 équivaut à y = −x + 9 : droite passant par (0, 9) et (9, 0).
0.3x + 0.6y = 3.6 équivaut à 0.6y = −0.3x + 3.6, soit y = −0.5x + 6 : droite passant par (0, 6) et (12, 0).
Les deux droites se coupent au point (6, 3) : on retrouve x = 6 et y = 3. Seule la partie des droites où x ≥ 0 et y ≥ 0 a un sens pour le problème.

**6. a)** 70 % de 9 litres font 0.7 × 9 = 6.3 litres. Le système est : x + y = 9 et 0.3x + 0.6y = 6.3.
y = 9 − x donne 0.3x + 5.4 − 0.6x = 6.3, soit −0.3x = 0.9, donc x = −3, puis y = 12.
Le système a une solution (−3, 12), mais un volume ne peut pas être négatif : ce mélange est impossible.

**b)** Si x ≥ 0, y ≥ 0 et x + y = 9 :

- 0.3x + 0.6y = 0.3(x + y) + 0.3y = 2.7 + 0.3y ≥ 2.7 ;
- 0.3x + 0.6y = 0.6(x + y) − 0.3x = 5.4 − 0.3x ≤ 5.4.

La quantité de jus est comprise entre 2.7 litres, soit 30 % de 9 litres (atteint avec la boisson P seule, y = 0), et 5.4 litres, soit 60 % de 9 litres (atteint avec la boisson Q seule, x = 0). Un mélange de P et de Q contient toujours entre 30 % et 60 % de jus : 40 % est possible, 70 % ne l'est pas.
