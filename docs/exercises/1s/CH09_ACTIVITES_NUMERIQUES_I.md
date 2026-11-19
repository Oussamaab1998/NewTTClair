# 1ère année — Chapitre 9 : Activités numériques I

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (1ère année secondaire), p. 8, activités numériques : décomposition en facteurs premiers, PGCD, PPCM ; nombres premiers, nombres premiers entre eux ; cardinal d'un ensemble fini (principe additif, arbre de choix) ; forme irréductible d'une fraction ; convertir une fraction en pourcentage ou en nombre décimal ; distinguer un rationnel d'un décimal ; valeur approchée, arrondi.
- Manuel CNP (partie 2, p. 133–152) : division euclidienne a = bq + r avec 0 ≤ r < b, « b divise a » si le reste est nul ; un nombre premier est un entier naturel différent de 1 qui a exactement deux diviseurs, 1 et lui-même ; décomposition en facteurs premiers et liste des diviseurs d'un entier ; PGCD et PPCM par la décomposition ; algorithme d'Euclide (admis : le PGCD est le dernier reste non nul) ; PPCM(a, b) × PGCD(a, b) = a × b ; entiers premiers entre eux (PGCD égal à 1) et fraction irréductible ; nombre décimal (de la forme a × 10ⁿ, a et n entiers relatifs) et rationnel non décimal étudié en posant la division (activité 19) ; a est une valeur approchée de b à 10ᵖ près si a − 10ᵖ ≤ b ≤ a + 10ᵖ ; règle de l'arrondi ; dénombrements par arbre de choix ; pourcentages.
- Le manuel n'énonce ni l'unicité de la décomposition, ni le critère « carré / cube » sur les exposants, ni le principe additif : l'exercice 1 et l'exercice 2 les rappellent dans l'énoncé (« On admet », « On rappelle »).
- Outils autorisés : ce chapitre et les acquis du collège (critères de divisibilité par 2, 3, 5 et 9, calcul sur les fractions, pourcentages). Pas de calcul sur les radicaux ni de règles de comparaison (chapitre 10), pas d'équations (chapitre 13).
- Notation : PGCD(a, b) et PPCM(a, b) comme dans le manuel ; × désigne le produit de deux nombres.
- Toutes les valeurs sont vérifiées par `check_ch09.py` (calcul exact en entiers et en fractions, énumération complète pour les dénombrements).

---

## Exercice 1 — Décomposition en facteurs premiers, PGCD, PPCM, fractions

On admet que la décomposition d'un entier en produit de facteurs premiers est unique (à l'ordre des facteurs près), et qu'un entier n ≥ 2 est :

- le carré d'un entier si et seulement si tous les exposants de sa décomposition sont pairs ;
- le cube d'un entier si et seulement si tous ces exposants sont des multiples de 3.

1. Décomposer 756 et 1176 en produits de facteurs premiers.
2. a) En déduire PGCD(756, 1176) et PPCM(756, 1176).
   b) Vérifier que PGCD(756, 1176) × PPCM(756, 1176) = 756 × 1176.
   c) Retrouver PGCD(756, 1176) à l'aide de l'algorithme d'Euclide.
3. a) Rendre irréductible la fraction 756/1176.
   b) Calculer 5/756 + 1/1176 en prenant PPCM(756, 1176) comme dénominateur commun. Montrer que la fraction obtenue est irréductible.
4. a) Poser la division de 9 par 14 jusqu'au septième chiffre après la virgule. Que remarque-t-on sur les restes ? En déduire que 9/14 n'est pas un nombre décimal.
   b) Quel est le 100ème chiffre après la virgule dans l'écriture décimale de 9/14 ?
   c) Montrer que 0.64 et 0.65 sont deux valeurs approchées de 9/14 à 10⁻² près. Donner l'arrondi de 9/14 au millième.
5. a) Déterminer le plus petit entier naturel non nul k tel que 756 × k soit le carré d'un entier. Préciser cet entier.
   b) Déterminer le plus petit entier naturel non nul k' tel que 1176 × k' soit le cube d'un entier. Préciser cet entier.

### Corrigé

**1.** On divise successivement par les nombres premiers 2, 3, 7 :

    756 | 2          1176 | 2
    378 | 2           588 | 2
    189 | 3           294 | 2
     63 | 3           147 | 3
     21 | 3            49 | 7
      7 | 7             7 | 7
      1                 1

Donc 756 = 2² × 3³ × 7 et 1176 = 2³ × 3 × 7².

**2. a)** Le PGCD est le produit des facteurs premiers communs, chacun avec son plus petit exposant :
PGCD(756, 1176) = 2² × 3 × 7 = 84.
Le PPCM est le produit de tous les facteurs premiers qui apparaissent, chacun avec son plus grand exposant :
PPCM(756, 1176) = 2³ × 3³ × 7² = 8 × 27 × 49 = 10584.

**b)** 84 × 10584 = 889056 et 756 × 1176 = 889056 : l'égalité est vérifiée.

**c)**

    1176 = 1 × 756 + 420
     756 = 1 × 420 + 336
     420 = 1 × 336 + 84
     336 = 4 × 84 + 0

Le dernier reste non nul est 84, donc PGCD(756, 1176) = 84.

**3. a)** 756 = 84 × 9 et 1176 = 84 × 14, donc 756/1176 = 9/14.
9 = 3² et 14 = 2 × 7 n'ont aucun facteur premier commun : PGCD(9, 14) = 1 et 9/14 est irréductible.

**b)** 10584 = 756 × 14 = 1176 × 9. Donc

    5/756 + 1/1176 = (5 × 14)/10584 + (1 × 9)/10584 = 70/10584 + 9/10584 = 79/10584

10584 = 2³ × 3³ × 7². Si 79 et 10584 avaient un diviseur commun d > 1, un facteur premier de d diviserait 10584, donc serait 2, 3 ou 7, et il diviserait aussi 79. Or 79 = 2 × 39 + 1 = 3 × 26 + 1 = 7 × 11 + 2 : 79 n'est divisible ni par 2, ni par 3, ni par 7.
Donc PGCD(79, 10584) = 1 et 79/10584 est irréductible.

**4. a)** À chaque étape, on multiplie le reste par 10 et on le divise par 14 :

    90  = 14 × 6 + 6       1er chiffre : 6
    60  = 14 × 4 + 4       2e chiffre  : 4
    40  = 14 × 2 + 12      3e chiffre  : 2
    120 = 14 × 8 + 8       4e chiffre  : 8
    80  = 14 × 5 + 10      5e chiffre  : 5
    100 = 14 × 7 + 2       6e chiffre  : 7
    20  = 14 × 1 + 6       7e chiffre  : 1

Après le 7e chiffre, on retrouve le reste 6, obtenu après le 1er chiffre. Chaque étape ne dépend que du reste précédent ; comme le reste 6 réapparaît, les restes 6, 4, 12, 8, 10, 2 reviennent indéfiniment dans le même ordre, et aucun n'est nul. Les calculs des étapes 2 à 7 vont donc se répéter indéfiniment, et la division ne s'arrête jamais :

    9/14 = 0.6428571428571…     (le bloc 428571 se répète)

Un nombre décimal n'a qu'un nombre fini de chiffres après la virgule : 9/14 n'est donc pas un nombre décimal. C'est un rationnel non décimal.
(Autre justification : si 9/14 = N/10ⁿ avec N et n entiers naturels, alors 9 × 10ⁿ = 14 × N serait divisible par 7 ; or 9 × 10ⁿ = 2ⁿ × 3² × 5ⁿ n'a pas le facteur premier 7, ce qui contredit l'unicité de la décomposition.)

**b)** Le 1er chiffre après la virgule est 6. À partir du 2e chiffre, le bloc 428571 de 6 chiffres se répète : les chiffres de rang 2 à 7 forment le 1er bloc, ceux de rang 8 à 13 le 2e bloc, etc.
Le chiffre de rang 100 est le 99e chiffre après le 6 initial. Or 99 = 6 × 16 + 3 : après 16 blocs complets (rangs 2 à 97), le chiffre de rang 100 est le 3e chiffre du bloc 428571.
Le 100ème chiffre après la virgule est 8.

**c)** D'après le a), 0.642 < 9/14 < 0.643.

- 0.64 − 0.01 = 0.63 et 0.64 + 0.01 = 0.65 ; on a 0.63 ≤ 9/14 ≤ 0.65 : 0.64 est une valeur approchée de 9/14 à 10⁻² près.
- 0.65 − 0.01 = 0.64 et 0.65 + 0.01 = 0.66 ; on a 0.64 ≤ 9/14 ≤ 0.66 : 0.65 est aussi une valeur approchée de 9/14 à 10⁻² près.

Une valeur approchée à 10⁻² près n'est donc pas unique.
Arrondi au millième : on garde 0.642 ; le chiffre suivant (4e chiffre) est 8, qui n'est pas 0, 1, 2, 3 ou 4, donc on ajoute 1 au chiffre des millièmes. L'arrondi de 9/14 au millième est 0.643.

**5. a)** 756 × k = 2² × 3³ × 7 × k. Pour que ce soit un carré, tous les exposants doivent être pairs.

- L'exposant de 3 dans 756 × k est 3 plus l'exposant de 3 dans k : il est pair seulement si k contient au moins un facteur 3.
- L'exposant de 7 dans 756 × k est 1 plus l'exposant de 7 dans k : il est pair seulement si k contient au moins un facteur 7.

Donc k est un multiple de 3 × 7 = 21, et k ≥ 21.
Pour k = 21 : 756 × 21 = 2² × 3⁴ × 7², tous les exposants sont pairs, et 756 × 21 = (2 × 3² × 7)² = 126² = 15876.
Le plus petit k est 21, et 756 × 21 = 126².

**b)** 1176 × k' = 2³ × 3 × 7² × k'. Pour que ce soit un cube, tous les exposants doivent être des multiples de 3.

- L'exposant de 2 vaut déjà 3 si k' n'a pas de facteur 2.
- L'exposant de 3 est 1 plus l'exposant de 3 dans k' : il faut au moins deux facteurs 3 dans k'.
- L'exposant de 7 est 2 plus l'exposant de 7 dans k' : il faut au moins un facteur 7 dans k'.

Donc k' est un multiple de 3² × 7 = 63, et k' ≥ 63.
Pour k' = 63 : 1176 × 63 = 2³ × 3³ × 7³ = (2 × 3 × 7)³ = 42³ = 74088.
Le plus petit k' est 63, et 1176 × 63 = 42³.

---

## Exercice 2 — La fête du lycée : PGCD, PPCM, dénombrement, pourcentages

Le club de mathématiques d'un lycée prépare la fête de fin d'année.

On admet que la décomposition d'un entier en produit de facteurs premiers est unique.

On rappelle le principe additif : si A et B sont deux ensembles finis qui n'ont aucun élément commun, le nombre d'éléments de A ∪ B est égal au nombre d'éléments de A plus le nombre d'éléments de B.

### Partie A — Les bouquets

Un fleuriste offre au club 252 roses et 180 tulipes. On veut composer des bouquets tous identiques (même nombre de roses et même nombre de tulipes dans chaque bouquet) en utilisant toutes les fleurs.

1. Peut-on composer 24 bouquets ? 18 bouquets ? Justifier.
2. a) Décomposer 252 et 180 en produits de facteurs premiers.
   b) Quel est le plus grand nombre de bouquets que l'on peut composer ? Donner alors la composition d'un bouquet.
3. a) Écrire la liste de tous les nombres de bouquets possibles (le cas d'un seul bouquet compris).
   b) Retrouver le nombre de possibilités à l'aide d'un arbre de choix.

### Partie B — La tombola

Le club vend 500 tickets de tombola numérotés de 1 à 500. Un ticket dont le numéro est un multiple de 12 gagne un stylo ; un ticket dont le numéro est un multiple de 18 gagne un livre. Un même ticket peut gagner les deux lots.

1. Effectuer la division euclidienne de 500 par 12, puis celle de 500 par 18. En déduire le nombre de tickets qui gagnent un stylo et le nombre de tickets qui gagnent un livre.
2. a) Soit k un entier naturel non nul. Montrer que 18 × k est un multiple de 12 si et seulement si k est pair.
   b) En déduire que les tickets qui gagnent les deux lots sont ceux dont le numéro est un multiple de 36. Vérifier que 36 = PPCM(12, 18).
   c) Combien de tickets gagnent les deux lots ?
3. Combien de tickets gagnent exactement un lot ? au moins un lot ? aucun lot ? Quel pourcentage des tickets est gagnant ?
4. Le premier jour, le club vend les 2/5 des tickets ; le deuxième jour, il vend les 3/4 des tickets restants.
   a) Quelle fraction des 500 tickets reste invendue ? Combien de tickets cela représente-t-il ? Exprimer cette fraction en pourcentage.
   b) Un ticket est vendu 0.800 dinar. Calculer la recette de la tombola.

### Corrigé — Partie A

**1.** Si l'on compose n bouquets de r roses et t tulipes chacun, alors n × r = 252 et n × t = 180 : le nombre n de bouquets doit diviser 252 et 180.

- 252 = 24 × 10 + 12 : le reste n'est pas nul, 24 ne divise pas 252. On ne peut pas composer 24 bouquets.
- 252 = 18 × 14 et 180 = 18 × 10 : on peut composer 18 bouquets de 14 roses et 10 tulipes.

**2. a)** 252 = 2² × 3² × 7 et 180 = 2² × 3² × 5.

**b)** Le nombre de bouquets est un diviseur commun de 252 et 180. Le plus grand est PGCD(252, 180) = 2² × 3² = 36.
252 = 36 × 7 et 180 = 36 × 5 : on peut composer au maximum 36 bouquets, chacun de 7 roses et 5 tulipes.

**3. a)** Un diviseur de 252 = 2² × 3² × 7 s'écrit 2ᵃ × 3ᵇ × 7ᶜ avec a ∈ {0, 1, 2}, b ∈ {0, 1, 2} et c ∈ {0, 1}.
Si c = 1, ce diviseur est un multiple de 7 ; il ne peut pas diviser 180, car 180 = 7 × 25 + 5 n'est pas divisible par 7. Donc c = 0.
Inversement, tout nombre 2ᵃ × 3ᵇ avec a ≤ 2 et b ≤ 2 divise 252 = 2² × 3² × 7 et 180 = 2² × 3² × 5.
Les diviseurs communs de 252 et 180 sont donc les nombres 2ᵃ × 3ᵇ, avec a et b dans {0, 1, 2} :

    a \ b  |  0    1    2
    0      |  1    3    9
    1      |  2    6   18
    2      |  4   12   36

Les nombres de bouquets possibles sont 1, 2, 3, 4, 6, 9, 12, 18 et 36.

**b)** Arbre de choix : au premier niveau, on choisit l'exposant a de 2 (3 branches : 0, 1 ou 2) ; de chaque branche partent 3 branches pour l'exposant b de 3. L'arbre a 3 × 3 = 9 chemins, et deux chemins différents donnent deux nombres différents (unicité de la décomposition). Il y a 9 nombres de bouquets possibles.

### Corrigé — Partie B

**1.** 500 = 12 × 41 + 8, avec 0 ≤ 8 < 12. Les multiples de 12 compris entre 1 et 500 sont 12 × 1, 12 × 2, …, 12 × 41 = 492 (car 12 × 42 = 504 > 500) : 41 tickets gagnent un stylo.
500 = 18 × 27 + 14, avec 0 ≤ 14 < 18. Les multiples de 18 compris entre 1 et 500 sont 18 × 1, …, 18 × 27 = 486 : 27 tickets gagnent un livre.

**2. a)**

- Si k est pair, k = 2j avec j entier naturel, et 18 × k = 36 × j = 12 × (3j) : c'est un multiple de 12.
- Si k est impair, supposons que 18 × k = 12 × m avec m entier. En divisant par 6 : 3 × k = 2 × m, donc 3 × k serait pair. Or le produit de deux nombres impairs est impair : (2p + 1)(2q + 1) = 2(2pq + p + q) + 1. Comme 3 et k sont impairs, 3 × k est impair : c'est absurde. Donc 18 × k n'est pas un multiple de 12.

Conclusion : 18 × k est un multiple de 12 si et seulement si k est pair.

**b)** Un ticket de numéro n gagne les deux lots si et seulement si n est un multiple de 18 et de 12, c'est-à-dire n = 18 × k avec k pair (d'après le a)), soit n = 18 × 2j = 36 × j : n est un multiple de 36. Réciproquement, 36 × j = 18 × 2j = 12 × 3j est un multiple de 18 et de 12.
12 = 2² × 3 et 18 = 2 × 3², donc PPCM(12, 18) = 2² × 3² = 36.

**c)** 500 = 36 × 13 + 32 : les multiples de 36 entre 1 et 500 sont 36, 72, …, 36 × 13 = 468. 13 tickets gagnent les deux lots.

**3.** On répartit les 500 tickets en quatre groupes sans élément commun :

- les deux lots : 13 tickets ;
- un stylo seulement : 41 − 13 = 28 tickets ;
- un livre seulement : 27 − 13 = 14 tickets ;
- aucun lot : les autres.

Exactement un lot : 28 + 14 = 42 tickets (principe additif).
Au moins un lot : 13 + 42 = 55 tickets.
Aucun lot : 500 − 55 = 445 tickets.
Pourcentage de tickets gagnants : 55/500 = 11/100, soit 11 %.

**4. a)** Le premier jour : (2/5) × 500 = 200 tickets vendus ; il en reste 300. Le deuxième jour : (3/4) × 300 = 225 tickets vendus. Il reste 300 − 225 = 75 tickets invendus.
En fractions du total : le deuxième jour, on vend les 3/4 des 3/5 restants, soit (3/4) × (3/5) = 9/20. La fraction invendue est

    1 − 2/5 − 9/20 = 20/20 − 8/20 − 9/20 = 3/20

Contrôle : (3/20) × 500 = 75 tickets. Et 3/20 = 15/100 = 15 %.

**b)** On a vendu 500 − 75 = 425 tickets. La recette est 425 × 0.800 = 340 dinars.
