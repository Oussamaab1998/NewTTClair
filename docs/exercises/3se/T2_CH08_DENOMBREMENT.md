# 3ème Sc. exp. — Tome 2, Chapitre 8 : Dénombrement

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 22 : dénombrement, cardinal d'un ensemble fini, combinaison, permutation, arrangement, formule du binôme. Aptitudes : dénombrer les éléments d'un ensemble fini, développer des expressions avec la formule du binôme ; construire des arbres de choix.
- Manuel CNP (p. 140–156) : card(A ∪ B) = card(A) + card(B) − card(A ∩ B), complémentaire, produit cartésien, card(Eᵖ) = (card E)ᵖ, permutations (n!), arrangements, combinaisons, C(n, p) = C(n, n − p), triangle de Pascal C(n, p) = C(n − 1, p − 1) + C(n − 1, p), binôme de Newton, nombre de parties d'un ensemble (2ⁿ).
- Notation : A(n, p) = n! / (n − p)! est le nombre d'arrangements noté Aₙᵖ dans le manuel, C(n, p) = n! / (p!(n − p)!) est le nombre de combinaisons noté Cₙᵖ.
- Toutes les valeurs sont vérifiées par `check_t2_ch08.py` (par la formule et par énumération complète avec itertools).
- Outils autorisés : ceux du chapitre (pas encore de probabilités).

---

## Exercice 1 — Cardinal, arrangements, combinaisons, formule du binôme

1. Soit E = {1, 2, 3, …, 60}. On note M₄ l'ensemble des éléments de E multiples de 4 et M₆ l'ensemble des éléments de E multiples de 6.
   a) Déterminer card(M₄), card(M₆) et card(M₄ ∩ M₆).
   b) En déduire card(M₄ ∪ M₆).
   c) Combien d'éléments de E ne sont ni multiples de 4, ni multiples de 6 ?
2. a) Calculer 6!, A(7, 3) et C(7, 3). Vérifier que A(7, 3) = 3!·C(7, 3).
   b) Simplifier, pour tout entier naturel n, le quotient (n + 2)! / n!.
   c) Déterminer l'entier naturel n ≥ 2 tel que C(n, 2) = 45.
3. a) Calculer C(9, 3) et C(9, 4). En déduire C(10, 4) à l'aide de la formule de Pascal :

       C(n, p) = C(n − 1, p − 1) + C(n − 1, p)     (1 ≤ p ≤ n − 1)

   b) Sans calcul, donner C(10, 6).
4. a) Développer (x + 2)⁴.
   b) Déterminer le coefficient de x³ dans le développement de (2x − 1)⁶.
   c) Montrer que, pour tout entier naturel non nul n :

       C(n, 0) + 2·C(n, 1) + 2²·C(n, 2) + … + 2ⁿ·C(n, n) = 3ⁿ

   d) En déduire la valeur de S = C(5, 0) + 2·C(5, 1) + 4·C(5, 2) + 8·C(5, 3) + 16·C(5, 4) + 32·C(5, 5), puis vérifier en calculant chaque terme.
5. Soit F un ensemble à 6 éléments.
   a) À l'aide de la formule du binôme, déterminer le nombre de parties de F.
   b) Combien de parties de F ont exactement 2 éléments ? Combien en ont au moins 2 ?

### Corrigé

**1. a)** Les multiples de 4 dans E sont 4k avec 1 ≤ k ≤ 15 : card(M₄) = 15.
Les multiples de 6 dans E sont 6k avec 1 ≤ k ≤ 10 : card(M₆) = 10.
Un entier est multiple de 4 et de 6 si et seulement s'il est multiple de 12 (le plus petit multiple commun de 4 et 6). Les multiples de 12 dans E sont 12, 24, 36, 48, 60 : card(M₄ ∩ M₆) = 5.

**b)** card(M₄ ∪ M₆) = card(M₄) + card(M₆) − card(M₄ ∩ M₆) = 15 + 10 − 5 = 20.

**c)** Ce sont les éléments du complémentaire de M₄ ∪ M₆ dans E : 60 − 20 = 40.

**2. a)** 6! = 1·2·3·4·5·6 = 720.
A(7, 3) = 7·6·5 = 210.
C(7, 3) = 7! / (3!·4!) = (7·6·5) / (3·2·1) = 35.
3!·C(7, 3) = 6·35 = 210 = A(7, 3). (Former un arrangement de 3 éléments, c'est choisir une partie à 3 éléments, puis ranger ses 3 éléments dans un ordre : 3! façons.)

**b)** (n + 2)! = (n + 2)(n + 1)·n!, donc (n + 2)! / n! = (n + 1)(n + 2).

**c)** C(n, 2) = n! / (2!(n − 2)!) = n(n − 1) / 2.
C(n, 2) = 45 ⟺ n(n − 1) = 90 ⟺ n² − n − 90 = 0 ⟺ (n − 10)(n + 9) = 0.
Comme n est un entier naturel, n = 10.

**3. a)** C(9, 3) = (9·8·7) / (3·2·1) = 84 et C(9, 4) = (9·8·7·6) / (4·3·2·1) = 126.
Formule de Pascal avec n = 10 et p = 4 : C(10, 4) = C(9, 3) + C(9, 4) = 84 + 126 = 210.

**b)** C(10, 6) = C(10, 10 − 6) = C(10, 4) = 210. (Choisir les 6 éléments que l'on garde revient à choisir les 4 que l'on laisse.)

**4. a)** Formule du binôme avec a = x, b = 2, n = 4 (coefficients 1, 4, 6, 4, 1 de la ligne 4 du triangle de Pascal) :

    (x + 2)⁴ = x⁴ + 4·x³·2 + 6·x²·2² + 4·x·2³ + 2⁴
             = x⁴ + 8x³ + 24x² + 32x + 16

**b)** On écrit (2x − 1)⁶ = (a + b)⁶ avec a = 2x et b = −1. Le terme contenant x³ est celui qui contient a³, c'est-à-dire C(6, 3)·a³·b³ :
C(6, 3)·(2x)³·(−1)³ = 20·8x³·(−1) = −160x³.
Le coefficient de x³ est −160.

**c)** Formule du binôme avec a = 1 et b = 2 :
(1 + 2)ⁿ = C(n, 0)·1ⁿ + C(n, 1)·1ⁿ⁻¹·2 + C(n, 2)·1ⁿ⁻²·2² + … + C(n, n)·2ⁿ.
Comme 1ᵏ = 1 pour tout entier k, on obtient C(n, 0) + 2·C(n, 1) + 2²·C(n, 2) + … + 2ⁿ·C(n, n) = 3ⁿ.

**d)** Avec n = 5 : S = 3⁵ = 243.
Vérification : C(5, 0), …, C(5, 5) valent 1, 5, 10, 10, 5, 1, donc S = 1 + 10 + 40 + 80 + 80 + 32 = 243.

**5. a)** Le nombre de parties de F est la somme des nombres de parties à 0, 1, …, 6 éléments :
C(6, 0) + C(6, 1) + … + C(6, 6) = (1 + 1)⁶ = 2⁶ = 64 (formule du binôme avec a = b = 1).

**b)** Parties à 2 éléments : C(6, 2) = (6·5) / 2 = 15.
Parties à au moins 2 éléments : on retire la partie vide et les 6 parties à un élément, soit 64 − 1 − 6 = 57.

---

## Exercice 2 — Un club : bureau, comité, vote, photo

Un club de lecture compte 10 membres : 6 filles, dont Rim, et 4 garçons, dont Omar.

1. Le club élit un bureau formé d'un président, d'un secrétaire et d'un trésorier (trois membres différents).
   a) Combien de bureaux différents peut-on former ?
   b) Combien de bureaux ont une fille comme présidente et un garçon comme secrétaire ?
   c) Combien de bureaux comportent au moins un garçon ?
2. Pour organiser une sortie, on choisit un comité de 4 membres (sans fonctions).
   a) Combien de comités peut-on former ?
   b) Combien de comités comportent exactement 2 filles ?
   c) Combien de comités comportent au moins un garçon ?
   d) Rim et Omar refusent de faire partie du même comité. Combien de comités respectent cette condition ?
3. Chacun des 10 membres vote pour un seul des trois livres L1, L2, L3 proposés. On appelle résultat du vote la liste des 10 votes, dans l'ordre des membres (vote du membre n°1, …, vote du membre n°10).
   a) Combien y a-t-il de résultats possibles ?
   b) Combien de résultats où le livre L3 n'obtient aucune voix ?
   c) Combien de résultats où L1 obtient exactement 4 voix et L2 les 6 autres ?
   d) Combien de résultats où L1 obtient exactement 4 voix ?
4. Pour la photo du club, les 10 membres s'assoient sur 10 chaises alignées, numérotées de 1 à 10.
   a) Combien y a-t-il de dispositions possibles ?
   b) Combien de dispositions où les 6 filles sont assises côte à côte ?
   c) Combien de dispositions où les chaises 1 et 10 (les deux extrémités) sont occupées par des garçons ?

### Corrigé

**1. a)** Un bureau est un triplet (président, secrétaire, trésorier) de membres distincts : c'est un arrangement de 3 éléments parmi 10.
Nombre de bureaux : A(10, 3) = 10·9·8 = 720.

**b)** Arbre de choix : 6 choix pour la présidente (une fille), puis 4 choix pour le secrétaire (un garçon), puis 8 choix pour le trésorier parmi les membres restants.
Nombre de bureaux : 6·4·8 = 192.

**c)** On passe par le contraire : « le bureau ne comporte que des filles ». Il y a A(6, 3) = 6·5·4 = 120 tels bureaux.
Bureaux avec au moins un garçon : 720 − 120 = 600.

**2. a)** Un comité est une partie à 4 éléments de l'ensemble des 10 membres : C(10, 4) = (10·9·8·7) / (4·3·2·1) = 210.

**b)** On choisit 2 filles parmi 6 et 2 garçons parmi 4 : C(6, 2)·C(4, 2) = 15·6 = 90.

**c)** Comités sans garçon : C(6, 4) = 15. Comités avec au moins un garçon : 210 − 15 = 195.

**d)** Comités contenant à la fois Rim et Omar : on complète avec 2 membres parmi les 8 autres, soit C(8, 2) = 28.
Comités qui respectent la condition : 210 − 28 = 182.
Contrôle par cas : sans Rim ni Omar C(8, 4) = 70 ; avec Rim sans Omar C(8, 3) = 56 ; avec Omar sans Rim C(8, 3) = 56 ; et 70 + 56 + 56 = 182.

**3. a)** Un résultat est un 10-uplet d'éléments de {L1, L2, L3} : il y en a 3¹⁰ = 59049.

**b)** Chaque membre vote L1 ou L2 : 2¹⁰ = 1024 résultats.

**c)** Il suffit de choisir les 4 membres qui votent L1 (les 6 autres votent L2) : C(10, 4) = 210 résultats.

**d)** On choisit les 4 membres qui votent L1 (C(10, 4) = 210 façons), puis chacun des 6 autres vote L2 ou L3 (2⁶ = 64 façons).
Nombre de résultats : 210·64 = 13440.

**4. a)** Une disposition est une permutation des 10 membres sur les 10 chaises : 10! = 3628800.

**b)** Les 6 filles occupent 6 chaises consécutives : le bloc commence à la chaise 1, 2, 3, 4 ou 5, soit 5 positions.
Pour chaque position : 6! = 720 façons de placer les filles dans le bloc et 4! = 24 façons de placer les garçons sur les 4 autres chaises.
Nombre de dispositions : 5·720·24 = 86400 (c'est aussi 5!·6! : on range le « bloc des filles » et les 4 garçons, puis les filles dans le bloc).

**c)** 4 choix pour la chaise 1 (un garçon), puis 3 choix pour la chaise 10 (un autre garçon), puis 8! = 40320 façons de placer les 8 autres membres sur les chaises 2 à 9.
Nombre de dispositions : 4·3·40320 = 483840.
