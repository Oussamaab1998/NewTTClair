# 3ème Sc. exp. — Tome 2, Chapitre 10 : Probabilités

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme 2006, p. 22 : probabilité uniforme ; définition d'une loi de probabilité sur un ensemble fini, probabilité de la réunion et de l'intersection de deux événements, cas de l'équiprobabilité, épreuves successives indépendantes, épreuves successives dépendantes. Note du programme : utiliser un arbre de choix pour déterminer la probabilité d'un événement.
- Manuel CNP (p. 186–203) : p(Ā) = 1 − p(A) (Ā est l'événement contraire de A), p(A ∪ B) = p(A) + p(B) − p(A ∩ B), p(A) = card(A) / card(E) en cas d'équiprobabilité. Épreuves successives : la probabilité que A1, A2, …, An se réalisent successivement est p1 × p2 × … × pn, lue sur un arbre de choix ; pour des épreuves dépendantes, p2 est « la probabilité de A2 si A1 se réalise ». Le manuel n'utilise pas de notation de probabilité conditionnelle (pas de p(A/B)) : les corrigés n'en utilisent pas.
- Toutes les valeurs sont vérifiées par `check_t2_ch10.py` (fractions exactes ; chaque probabilité est aussi recalculée par énumération complète de l'univers avec itertools).
- Outils autorisés : ceux du chapitre et du chapitre 8 (dénombrement, avec la notation C(n, p) pour Cₙᵖ). Pas de variable aléatoire, pas d'espérance.

---

## Exercice 1 — Loi de probabilité, réunion, intersection, événement contraire

### Partie A

Un dé cubique, dont les faces sont numérotées de 1 à 6, est truqué : les faces 1, 2, 3, 4 et 5 ont la même probabilité q d'apparaître, et la probabilité d'apparition de la face 6 est le triple de celle de la face 1. On lance ce dé une fois.

1. Montrer que q = 1/8, puis donner la loi de probabilité sous forme de tableau.
2. On considère les événements A : « obtenir un nombre pair » et B : « obtenir un multiple de 3 ».
   a) Calculer p(A), p(B) et p(A ∩ B).
   b) En déduire p(A ∪ B) et p(Ā).
3. Calculer la probabilité de l'événement C : « obtenir un nombre qui n'est ni pair, ni multiple de 3 ».
4. Avec ce dé, a-t-on plus de chances d'obtenir un nombre pair qu'avec un dé équilibré ?

### Partie B

Dans un groupe de 40 élèves, 22 pratiquent le football, 15 pratiquent la natation et 8 pratiquent les deux sports. On choisit un élève au hasard dans le groupe (tous les élèves ont la même chance d'être choisis). On note F l'événement « l'élève pratique le football » et N l'événement « l'élève pratique la natation ».

1. Calculer p(F), p(N) et p(F ∩ N).
2. Calculer p(F ∪ N), puis la probabilité que l'élève ne pratique aucun des deux sports.
3. Calculer la probabilité que l'élève pratique un seul des deux sports.
4. On choisit maintenant au hasard et simultanément deux élèves du groupe.
   a) Calculer la probabilité de l'événement D : « les deux élèves pratiquent le football ».
   b) Calculer la probabilité de l'événement H : « au moins un des deux élèves pratique la natation ».

### Corrigé — Partie A

**1.** L'univers est E = {1, 2, 3, 4, 5, 6}. La somme des probabilités des événements élémentaires vaut 1 :
q + q + q + q + q + 3q = 1, soit 8q = 1, donc q = 1/8 et p(6) = 3/8.

    face        |  1      2      3      4      5      6
    probabilité |  1/8    1/8    1/8    1/8    1/8    3/8

**2. a)** A = {2, 4, 6} : p(A) = 1/8 + 1/8 + 3/8 = 5/8.
B = {3, 6} : p(B) = 1/8 + 3/8 = 4/8 = 1/2.
A ∩ B = {6} : p(A ∩ B) = 3/8.

**b)** p(A ∪ B) = p(A) + p(B) − p(A ∩ B) = 5/8 + 4/8 − 3/8 = 6/8 = 3/4.
(Contrôle : A ∪ B = {2, 3, 4, 6} et 1/8 + 1/8 + 1/8 + 3/8 = 6/8.)
p(Ā) = 1 − p(A) = 1 − 5/8 = 3/8 (Ā = {1, 3, 5}).

**3.** C est l'événement contraire de A ∪ B, donc p(C) = 1 − 3/4 = 1/4.
(Contrôle : C = {1, 5} et 1/8 + 1/8 = 2/8 = 1/4.)

**4.** Avec un dé équilibré, la probabilité d'obtenir un nombre pair est 3/6 = 1/2 = 4/8. Avec ce dé elle vaut 5/8 > 4/8 : oui, ce dé favorise les nombres pairs.

### Corrigé — Partie B

**1.** Il y a équiprobabilité sur les 40 élèves :
p(F) = 22/40 = 11/20, p(N) = 15/40 = 3/8 et p(F ∩ N) = 8/40 = 1/5.

**2.** p(F ∪ N) = 22/40 + 15/40 − 8/40 = 29/40.
« Ne pratiquer aucun des deux sports » est l'événement contraire de F ∪ N : sa probabilité est 1 − 29/40 = 11/40.

**3.** 22 − 8 = 14 élèves pratiquent seulement le football et 15 − 8 = 7 seulement la natation, soit 14 + 7 = 21 élèves.
La probabilité cherchée est 21/40. (C'est aussi p(F ∪ N) − p(F ∩ N) = 29/40 − 8/40.)

**4.** Un tirage est une partie à 2 éléments de l'ensemble des 40 élèves : il y en a C(40, 2) = (40 × 39) / 2 = 780, toutes équiprobables.

**a)** card(D) = C(22, 2) = (22 × 21) / 2 = 231, donc p(D) = 231/780 = 77/260.

**b)** L'événement contraire de H est « aucun des deux élèves ne pratique la natation » : on choisit les 2 élèves parmi les 40 − 15 = 25 qui ne pratiquent pas la natation, soit C(25, 2) = (25 × 24) / 2 = 300 tirages.
Sa probabilité est 300/780 = 5/13, donc p(H) = 1 − 5/13 = 8/13.

---

## Exercice 2 — Une urne, trois façons de tirer

Une urne contient 3 boules rouges et 2 boules blanches, indiscernables au toucher. Un joueur tire deux boules de l'urne ; il gagne la partie si les deux boules tirées sont de la même couleur. On compare trois façons de tirer les deux boules. On note R une boule rouge et B une boule blanche.

1. Tirage successif avec remise : le joueur tire une boule, note sa couleur, la remet dans l'urne, puis tire une deuxième boule.
   a) Construire un arbre de choix et donner la probabilité de chacune des issues RR, RB, BR et BB.
   b) Calculer la probabilité de l'événement G₁ : « le joueur gagne ».
   c) Calculer la probabilité d'obtenir au moins une boule blanche.
2. Tirage successif sans remise : le joueur tire une boule, puis une deuxième sans remettre la première.
   a) Les deux tirages sont-ils indépendants ? Construire un arbre de choix et donner la probabilité de chacune des issues RR, RB, BR et BB.
   b) Calculer la probabilité de l'événement G₂ : « le joueur gagne ».
   c) Calculer la probabilité que la deuxième boule tirée soit blanche. Comparer avec la probabilité que la première boule tirée soit blanche.
3. Tirage simultané : le joueur tire les deux boules en même temps.
   a) Combien y a-t-il de tirages possibles ?
   b) Calculer la probabilité de l'événement G₃ : « le joueur gagne ». Comparer avec p(G₂).
4. Quelle façon de tirer est la plus favorable au joueur ?
5. Le joueur joue trois parties. À chaque partie, il tire simultanément deux boules, puis les remet dans l'urne ; les parties sont donc indépendantes. Calculer la probabilité que le joueur :
   a) gagne les trois parties ;
   b) gagne au moins une partie ;
   c) gagne exactement une partie.

### Corrigé

**1. a)** À chaque tirage l'urne contient les 5 boules : on obtient R avec la probabilité 3/5 et B avec la probabilité 2/5, et le résultat du premier tirage n'influe pas sur le second (épreuves indépendantes).
Arbre de choix :

- Premier tirage : R (3/5) ou B (2/5).
- Après R comme après B, deuxième tirage : R (3/5) ou B (2/5).

La probabilité d'une issue est le produit des probabilités lues sur sa branche :

    issue        |  RR              RB              BR              BB
    probabilité  |  3/5 × 3/5       3/5 × 2/5       2/5 × 3/5       2/5 × 2/5
                 |  = 9/25          = 6/25          = 6/25          = 4/25

Contrôle : 9/25 + 6/25 + 6/25 + 4/25 = 1.

**b)** G₁ = {RR, BB}, donc p(G₁) = 9/25 + 4/25 = 13/25.

**c)** L'événement contraire est « aucune boule blanche », c'est-à-dire {RR}. La probabilité cherchée est 1 − 9/25 = 16/25.

**2. a)** Non : la composition de l'urne au deuxième tirage dépend de la boule tirée au premier (épreuves dépendantes).
Arbre de choix :

- Premier tirage : R (3/5) ou B (2/5).
- Si la première boule est rouge, il reste 2 R et 2 B : deuxième tirage R (2/4) ou B (2/4).
- Si la première boule est blanche, il reste 3 R et 1 B : deuxième tirage R (3/4) ou B (1/4).

    issue        |  RR              RB              BR              BB
    probabilité  |  3/5 × 2/4       3/5 × 2/4       2/5 × 3/4       2/5 × 1/4
                 |  = 3/10          = 3/10          = 3/10          = 1/10

Contrôle : 3/10 + 3/10 + 3/10 + 1/10 = 1.

**b)** G₂ = {RR, BB}, donc p(G₂) = 3/10 + 1/10 = 4/10 = 2/5.

**c)** « La deuxième boule est blanche » = {RB, BB} : sa probabilité est 3/10 + 1/10 = 2/5.
La probabilité que la première boule soit blanche est aussi 2/5 : les deux probabilités sont égales (sans connaître la couleur de la première boule, la deuxième a autant de chances d'être blanche que la première).

**3. a)** Un tirage est une partie à 2 éléments de l'ensemble des 5 boules : C(5, 2) = 10 tirages, équiprobables.

**b)** Les tirages gagnants sont ceux de 2 boules rouges parmi 3 (C(3, 2) = 3 tirages) ou de 2 boules blanches parmi 2 (C(2, 2) = 1 tirage), soit 4 tirages.
p(G₃) = 4/10 = 2/5 = p(G₂). (Tirer simultanément revient à tirer successivement sans remise sans tenir compte de l'ordre.)

**4.** p(G₁) = 13/25 = 0.52 et p(G₂) = p(G₃) = 2/5 = 0.4. Le tirage avec remise est le plus favorable au joueur : c'est le seul où il a plus d'une chance sur deux de gagner.

**5.** À chaque partie, le joueur gagne avec la probabilité 2/5 (question 3) et perd avec la probabilité 1 − 2/5 = 3/5.
Arbre de choix à trois niveaux : à chaque partie, G (gagnée, 2/5) ou P (perdue, 3/5). Les parties étant indépendantes, la probabilité d'une branche est le produit des probabilités de ses trois étapes.

**a)** Branche GGG : (2/5) × (2/5) × (2/5) = 8/125.

**b)** L'événement contraire est « perdre les trois parties » (branche PPP), de probabilité (3/5) × (3/5) × (3/5) = 27/125.
La probabilité de gagner au moins une partie est 1 − 27/125 = 98/125.

**c)** Trois branches conviennent : GPP, PGP et PPG. Chacune a pour probabilité (2/5) × (3/5) × (3/5) = 18/125.
La probabilité de gagner exactement une partie est 3 × 18/125 = 54/125.
