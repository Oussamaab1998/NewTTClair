# 2ème Sciences — Tome 1, Chapitre 4 : Arithmétique

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2005, p. 19 (activités numériques) : critères de divisibilité ; déterminer le reste de la division euclidienne d'un entier par 2, 3, 4, 5, 8, 9, 11, 25 et décider de sa divisibilité ; dénombrement (principe additif et arbres de choix) ; dénombrer les éléments d'un ensemble fini ; modéliser des situations faisant appel à la divisibilité et au dénombrement.
- Manuel CNP (tome 1, p. 55–66) : division euclidienne a = bq + r avec 0 ≤ r < b (existence et unicité admises) ; si n divise x et y, alors n divise px, x + y et x − y (x ≥ y) ; critères par 2 et 5 (chiffre des unités), par 4 et 25 (nombre formé par les deux derniers chiffres), par 8 (trois derniers chiffres, pour un entier ≥ 100), par 3 et 9 (somme des chiffres), par 11 (d = S₁ − S₂, où S₁ est la somme des chiffres de rang impair et S₂ celle des chiffres de rang pair, comptés de droite à gauche ; si d < 0, on remplace d par d + 11p, p étant le plus petit entier naturel tel que d + 11p ≥ 0). Chaque critère donne aussi le reste.
- Dénombrement : le manuel n'a pas de section dédiée ; seul l'exercice p. 62 (« Développer ses compétences ») utilise un arbre de choix selon les restes. Le principe additif et les arbres de choix sont des acquis de 1ère (programme p. 8) repris au programme de 2ème (p. 19) ; l'exercice 2 rappelle le principe additif.
- Outils autorisés : ce chapitre et les acquis de 1ère (décomposition en facteurs premiers, PGCD, PPCM, nombres premiers entre eux, cardinal d'un ensemble fini).
- Notation : un entier écrit avec des lettres, comme 6a3b, est le nombre dont les chiffres sont, de gauche à droite, 6, a, 3 et b ; card(E) est le nombre d'éléments d'un ensemble fini E.
- Toutes les valeurs sont vérifiées par `check_t1_ch04.py` (calcul exact, et énumération complète avec itertools pour les dénombrements).

---

## Exercice 1 — Critères de divisibilité, restes, diviseurs communs

1. a) Sans effectuer de division, dire si l'entier 7425 est divisible par 2, 3, 4, 5, 8, 9, 11 et 25.
   b) En utilisant les critères de divisibilité, déterminer le reste de la division euclidienne de

       N = 3868091

   par 2, 5, 4, 25, 8, 3, 9 et 11.
2. a) Déterminer les valeurs possibles du chiffre c pour que l'entier 4c17 ait pour reste 3 dans la division euclidienne par 9.
   b) Déterminer les chiffres a et b pour que l'entier 6a3b soit divisible à la fois par 4 et par 11.
3. Soit n un entier naturel. On pose

       x = n + 3     et     y = 2n + 1

   a) Montrer que tout diviseur commun de x et y divise 5. En déduire que PGCD(x, y) = 1 ou PGCD(x, y) = 5.
   b) Montrer que PGCD(x, y) = 5 si et seulement si le chiffre des unités de n est 2 ou 7.
   c) En déduire, sans décomposer en facteurs premiers, PGCD(2015, 4025) et PGCD(2029, 4053).
4. a) Soit n un entier naturel. En distinguant le cas où n est pair et le cas où n est impair, montrer que le reste de la division euclidienne de n² par 4 est 0 ou 1.
   b) Soient a et b deux entiers naturels. À l'aide d'un arbre de choix selon les restes de a² et de b² dans la division par 4, déterminer les restes possibles de la division euclidienne de a² + b² par 4.
   c) En déduire, sans calculer de carrés, que l'entier 74251 n'est pas la somme des carrés de deux entiers naturels.

### Corrigé

**1. a)** Pour 7425 :

- Chiffre des unités 5 : 7425 est divisible par 5 ; il n'est pas divisible par 2 (5 est impair).
- Nombre formé par les deux derniers chiffres : 25. Or 25 = 4 × 6 + 1, donc 7425 n'est pas divisible par 4 ; 25 est divisible par 25, donc 7425 est divisible par 25.
- Trois derniers chiffres : 425 = 8 × 53 + 1, donc 7425 n'est pas divisible par 8.
- Somme des chiffres : 7 + 4 + 2 + 5 = 18, divisible par 3 et par 9 : 7425 est divisible par 3 et par 9.
- Critère de 11 : de droite à gauche, les chiffres de rang impair sont 5 et 4, ceux de rang pair sont 2 et 7. S₁ = 5 + 4 = 9, S₂ = 2 + 7 = 9, d = 0, divisible par 11 : 7425 est divisible par 11.

Conclusion : 7425 est divisible par 3, 5, 9, 11 et 25, mais pas par 2, 4 ni 8. (Contrôle : 7425 = 27 × 275 = 3³ × 5² × 11.)

**b)**

- Par 2 et par 5 : le chiffre des unités est 1, donc les restes sont 1 et 1.
- Par 4 et par 25 : les deux derniers chiffres forment 91 ; 91 = 4 × 22 + 3 et 91 = 25 × 3 + 16. Les restes sont 3 et 16.
- Par 8 : les trois derniers chiffres forment 091 = 91 = 8 × 11 + 3. Le reste est 3.
- Par 3 et par 9 : la somme des chiffres est 3 + 8 + 6 + 8 + 0 + 9 + 1 = 35 ; 35 = 3 × 11 + 2 et 35 = 9 × 3 + 8. Les restes sont 2 et 8.
- Par 11 : de droite à gauche, les chiffres de rang impair sont 1, 0, 6, 3 et ceux de rang pair sont 9, 8, 8. S₁ = 10, S₂ = 25, d = 10 − 25 = −15 < 0. Le plus petit entier naturel p tel que −15 + 11p ≥ 0 est p = 2 (pour p = 1 on obtient −4). Le reste est −15 + 22 = 7.

Récapitulatif :

    diviseur | 2   5   4   25   8   3   9   11
    reste    | 1   1   3   16   3   2   8   7

Contrôle : N = 11 × 351644 + 7.

**2. a)** Le reste de 4c17 par 9 est celui de la somme de ses chiffres, 4 + c + 1 + 7 = 12 + c, par 9.
Comme 0 ≤ c ≤ 9, on a 12 ≤ 12 + c ≤ 21. Les entiers de cet intervalle qui ont pour reste 3 dans la division par 9 sont 12 = 9 × 1 + 3 et 21 = 9 × 2 + 3.
Donc 12 + c = 12 ou 12 + c = 21, c'est-à-dire c = 0 ou c = 9. Les entiers cherchés sont 4017 et 4917.
Contrôle : 4017 = 9 × 446 + 3 et 4917 = 9 × 546 + 3.

**b)** Divisibilité par 4 : le nombre formé par les deux derniers chiffres, 30 + b, doit être divisible par 4. Entre 30 et 39, les multiples de 4 sont 32 et 36. Donc b = 2 ou b = 6.

Divisibilité par 11 : de droite à gauche, les chiffres de rang impair sont b et a, ceux de rang pair sont 3 et 6. S₁ = a + b, S₂ = 9 et d = a + b − 9.

- Si a + b ≥ 9 : 0 ≤ d ≤ 9 (car a + b ≤ 18). d est divisible par 11 seulement si d = 0, c'est-à-dire a + b = 9.
- Si a + b < 9 : d < 0 et −9 ≤ d ≤ −1, donc p = 1 et d + 11 = a + b + 2 est compris entre 2 et 10 : il n'est jamais divisible par 11.

Donc 6a3b est divisible par 11 si et seulement si a + b = 9.

- b = 2 donne a = 7 : l'entier 6732.
- b = 6 donne a = 3 : l'entier 6336.

Contrôle : 6732 = 4 × 1683 = 11 × 612 et 6336 = 4 × 1584 = 11 × 576.

**3. a)** Soit d un diviseur commun de x et y. Alors d divise 2x = 2n + 6 et d divise y = 2n + 1. Comme 2x ≥ y, d divise la différence 2x − y = 5.
Les diviseurs de 5 sont 1 et 5. Le plus grand diviseur commun de x et y est donc 1 ou 5 : PGCD(x, y) = 1 ou PGCD(x, y) = 5.

**b)** D'après le a), PGCD(x, y) = 5 si et seulement si 5 divise x et y.

- Si 5 divise x, alors 5 divise 2x ; or y = 2x − 5, donc 5 divise y (différence de deux multiples de 5). Ainsi : PGCD(x, y) = 5 ⟺ 5 divise x = n + 3.
- Notons u le chiffre des unités de n : n = 10q + u avec q entier naturel, donc n + 3 = 10q + (u + 3). Comme 10q est divisible par 5, n + 3 est divisible par 5 si et seulement si u + 3 l'est. Or 3 ≤ u + 3 ≤ 12, et les multiples de 5 de cet intervalle sont 5 et 10. Donc u + 3 = 5 ou u + 3 = 10, c'est-à-dire u = 2 ou u = 7.

Conclusion : PGCD(x, y) = 5 ⟺ le chiffre des unités de n est 2 ou 7.

**c)**

- 2015 = 2012 + 3 et 4025 = 2 × 2012 + 1 : c'est le cas n = 2012, dont le chiffre des unités est 2. Donc PGCD(2015, 4025) = 5.
- 2029 = 2026 + 3 et 4053 = 2 × 2026 + 1 : c'est le cas n = 2026, dont le chiffre des unités est 6. Donc PGCD(2029, 4053) = 1 : ces deux entiers sont premiers entre eux.

**4. a)**

- Si n est pair : n = 2k (k entier naturel), n² = 4k², le reste est 0.
- Si n est impair : n = 2k + 1, n² = 4k² + 4k + 1 = 4(k² + k) + 1, le reste est 1.

**b)** On écrit a² = 4q + r et b² = 4q' + r', avec r et r' dans {0, 1} d'après le a). Alors a² + b² = 4(q + q') + (r + r').
Arbre de choix (premier niveau : r, second niveau : r') :

- r = 0, r' = 0 : r + r' = 0, le reste de a² + b² est 0.
- r = 0, r' = 1 : r + r' = 1, le reste est 1.
- r = 1, r' = 0 : r + r' = 1, le reste est 1.
- r = 1, r' = 1 : r + r' = 2, le reste est 2.

Dans chaque branche r + r' < 4, c'est donc bien le reste. Les restes possibles de a² + b² par 4 sont 0, 1 et 2 : le reste n'est jamais 3.

**c)** Le nombre formé par les deux derniers chiffres de 74251 est 51 = 4 × 12 + 3 : le reste de 74251 dans la division par 4 est 3.
D'après le b), une somme de deux carrés d'entiers naturels n'a jamais 3 pour reste dans la division par 4. Donc 74251 n'est pas la somme des carrés de deux entiers naturels.

---

## Exercice 2 — Codes à trois chiffres : arbres de choix, principe additif et divisibilité

La cantine d'un lycée attribue à chaque élève un code : c'est un nombre de trois chiffres deux à deux distincts, choisis parmi 1, 2, 3, 4 et 5 (par exemple 352 ou 241, mais pas 335 ni 207). On note E l'ensemble de tous ces codes.

On rappelle le principe additif : si A et B sont deux parties disjointes d'un ensemble fini, alors card(A ∪ B) = card(A) + card(B).

1. a) À l'aide d'un arbre de choix (chiffre des centaines, puis chiffre des dizaines, puis chiffre des unités), montrer que card(E) = 60.
   b) Combien de codes de E sont supérieurs à 400 ?
2. On note A₂ l'ensemble des codes de E divisibles par 2 et A₅ l'ensemble des codes de E divisibles par 5.
   a) Calculer card(A₂) et card(A₅).
   b) Expliquer pourquoi A₂ et A₅ sont disjoints. En déduire le nombre de codes divisibles par 2 ou par 5, puis le nombre de codes qui ne sont divisibles ni par 2 ni par 5.
3. a) Écrire toutes les parties à trois éléments de l'ensemble {1, 2, 3, 4, 5}, avec la somme de leurs éléments.
   b) En déduire le nombre de codes de E divisibles par 3, puis le nombre de codes de E divisibles par 9.
4. a) Écrire la liste des nombres de deux chiffres distincts, choisis parmi 1, 2, 3, 4 et 5, qui sont divisibles par 4. En déduire le nombre de codes de E divisibles par 4.
   b) Combien de codes de E sont divisibles par 25 ?
5. a) Écrire la liste des codes de E divisibles à la fois par 3 et par 4.
   b) En déduire le nombre de codes de E divisibles par 3 ou par 4. (On pourra séparer les codes divisibles par 3 et les codes divisibles par 4 mais pas par 3.)
6. Soit n un code de E, de chiffres x (centaines), y (dizaines) et z (unités).
   a) Montrer que n est divisible par 11 si et seulement si y = x + z.
   b) En déduire la liste des codes de E divisibles par 11.

### Corrigé

**1. a)** L'arbre de choix a trois niveaux :

- chiffre des centaines : 5 branches (1, 2, 3, 4 ou 5) ;
- de chaque branche partent 4 branches pour le chiffre des dizaines (les 4 chiffres non encore utilisés) ;
- de chacune de ces branches partent 3 branches pour le chiffre des unités.

Chaque code correspond à un chemin de l'arbre et un seul. Le nombre de chemins est 5 × 4 × 3 = 60, donc card(E) = 60.

**b)** Un code qui commence par 1, 2 ou 3 est inférieur à 400. Un code qui commence par 4 ou 5 est supérieur à 400 (le plus petit est 412).
Codes commençant par 4 : il reste 4 choix pour les dizaines puis 3 pour les unités, soit 4 × 3 = 12 codes. De même, 12 codes commencent par 5.
Ces deux ensembles sont disjoints ; par le principe additif, 12 + 12 = 24 codes sont supérieurs à 400.

**2. a)** Un code est divisible par 2 si et seulement si son chiffre des unités est pair, donc égal à 2 ou à 4. On construit l'arbre en commençant par les unités : 2 choix pour les unités, puis 4 pour les centaines, puis 3 pour les dizaines. card(A₂) = 2 × 4 × 3 = 24.
Un code est divisible par 5 si et seulement si son chiffre des unités est 0 ou 5, donc 5 ici (le chiffre 0 n'est pas utilisé). card(A₅) = 1 × 4 × 3 = 12.

**b)** Un code de A₂ ∩ A₅ aurait un chiffre des unités à la fois pair et égal à 0 ou 5, donc égal à 0 : c'est impossible. A₂ et A₅ sont disjoints.
Par le principe additif : card(A₂ ∪ A₅) = 24 + 12 = 36 codes sont divisibles par 2 ou par 5.
E est la réunion disjointe de A₂ ∪ A₅ et de l'ensemble des codes divisibles ni par 2 ni par 5. Ces derniers sont donc 60 − 36 = 24. (Contrôle : ce sont les codes terminés par 1 ou 3, soit 2 × 4 × 3 = 24.)

**3. a)** Les dix parties à trois éléments et leurs sommes :

    {1, 2, 3} : 6     {1, 2, 4} : 7     {1, 2, 5} : 8     {1, 3, 4} : 8     {1, 3, 5} : 9
    {1, 4, 5} : 10    {2, 3, 4} : 9     {2, 3, 5} : 10    {2, 4, 5} : 11    {3, 4, 5} : 12

**b)** Un code est divisible par 3 si et seulement si la somme de ses chiffres est divisible par 3. Ses trois chiffres forment donc l'une des parties {1, 2, 3}, {1, 3, 5}, {2, 3, 4} ou {3, 4, 5} (sommes 6, 9, 9 et 12).
Avec les trois chiffres d'une partie donnée, un arbre de choix donne 3 × 2 × 1 = 6 codes. Les codes obtenus à partir de parties différentes sont différents ; par le principe additif, il y a 6 + 6 + 6 + 6 = 24 codes divisibles par 3.
Divisibilité par 9 : la somme des chiffres doit être 9 ou 18 ; seules les parties {1, 3, 5} et {2, 3, 4} conviennent (somme 9). Il y a 6 + 6 = 12 codes divisibles par 9.

**4. a)** Les multiples de 4 compris entre 12 et 54 sont 12, 16, 20, 24, 28, 32, 36, 40, 44, 48 et 52. On élimine ceux qui contiennent un chiffre autre que 1, 2, 3, 4, 5 (16, 20, 28, 36, 40, 48) et 44 (chiffres égaux). Il reste :

    12     24     32     52

Un code est divisible par 4 si et seulement si le nombre formé par ses deux derniers chiffres l'est, c'est-à-dire s'il se termine par 12, 24, 32 ou 52. Pour chacune de ces 4 fins, il reste 3 choix pour le chiffre des centaines. Il y a 4 × 3 = 12 codes divisibles par 4.

**b)** Un code est divisible par 25 si et seulement si ses deux derniers chiffres forment 00, 25, 50 ou 75. Seule la fin 25 est possible ici, et le chiffre des centaines vaut alors 1, 3 ou 4. Il y a 3 codes divisibles par 25 : 125, 325 et 425.

**5. a)** On part des 4 fins possibles pour la divisibilité par 4, puis on choisit le chiffre des centaines x pour que la somme des chiffres soit divisible par 3 :

- fin 12 : x ∈ {3, 4, 5} et 3 + x divisible par 3 donne x = 3 : 312.
- fin 24 : x ∈ {1, 3, 5} et 6 + x divisible par 3 donne x = 3 : 324.
- fin 32 : x ∈ {1, 4, 5} et 5 + x divisible par 3 donne x = 1 ou x = 4 : 132 et 432.
- fin 52 : x ∈ {1, 3, 4} et 7 + x vaut 8, 10 ou 11 : aucun code.

Les codes divisibles par 3 et par 4 sont 132, 312, 324 et 432 (4 codes).

**b)** L'ensemble des codes divisibles par 3 ou par 4 est la réunion disjointe de l'ensemble des codes divisibles par 3 (24 codes) et de l'ensemble des codes divisibles par 4 mais pas par 3 (12 − 4 = 8 codes).
Par le principe additif, il y a 24 + 8 = 32 codes divisibles par 3 ou par 4.

**6. a)** De droite à gauche, z est de rang 1, y de rang 2 et x de rang 3. Donc S₁ = x + z, S₂ = y et d = x + z − y.
Les trois chiffres sont distincts et compris entre 1 et 5, donc d ≥ 1 + 2 − 5 = −2 et d ≤ 5 + 4 − 1 = 8.

- Si d ≥ 0 : 0 ≤ d ≤ 8, et d est divisible par 11 seulement si d = 0.
- Si d < 0 : d = −1 ou d = −2, donc p = 1 et d + 11 vaut 10 ou 9 : il n'est pas divisible par 11.

Donc n est divisible par 11 si et seulement si d = 0, c'est-à-dire y = x + z.

**b)** Il faut x + z ≤ 5 avec x ≠ z. Le chiffre y = x + z est alors automatiquement différent de x et de z (il est plus grand que chacun d'eux). Les parties {x, z} possibles sont :

- {1, 2}, avec y = 3 : 132 et 231 ;
- {1, 3}, avec y = 4 : 143 et 341 ;
- {1, 4}, avec y = 5 : 154 et 451 ;
- {2, 3}, avec y = 5 : 253 et 352.

Il y a 4 × 2 = 8 codes divisibles par 11. Contrôle : 132 = 11 × 12, 231 = 11 × 21, 143 = 11 × 13, 341 = 11 × 31, 154 = 11 × 14, 451 = 11 × 41, 253 = 11 × 23, 352 = 11 × 32.
