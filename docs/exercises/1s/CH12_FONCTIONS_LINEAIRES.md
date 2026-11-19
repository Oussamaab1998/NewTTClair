# 1ère année — Chapitre 12 : Fonctions linéaires

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 9, « Activités algébriques » : fonctions linéaires ; déterminer l'expression d'une fonction linéaire connaissant l'image d'un réel ; modéliser des situations réelles menant à des fonctions linéaires. P. 13, « Activités dans un repère » : représentation graphique d'une fonction linéaire ; déterminer son expression à partir de sa représentation graphique. P. 8 : pourcentages, proportionnalité.
- Manuel CNP, chapitre 12 (p. 185–196) : f : x ↦ ax, a est le coefficient de f, f(x) est l'image de x, x est un antécédent de f(x) ; f(0) = 0, f(1) = a et f(x + x') = f(x) + f(x') pour tous réels x et x'. On admet que la représentation graphique de f dans un repère (O, I, J) est la droite d'équation y = ax, qui passe par O et par le point A(1, a). Hausses et baisses en pourcentage traduites par des fonctions linéaires.
- Outils autorisés : ce chapitre, les chapitres 9 à 11 (calcul dans ℝ, pourcentages, calcul algébrique) et les coordonnées d'un point dans un repère (chapitre 6). Pas de fonctions affines (chapitre 14). Un antécédent s'obtient en divisant par le coefficient (non nul), comme dans le manuel.
- Notation : repère (O, I, J) ; f : x ↦ ax ; prix en dinars (D) ; point décimal (0.5).
- Toutes les valeurs sont vérifiées par `check_ch12.py` (calcul exact en fractions).

---

## Exercice 1 — Coefficient, image, antécédent, représentation graphique

Le plan est muni d'un repère (O, I, J).

1. Soit f la fonction linéaire telle que f(−4) = 6.
   a) Déterminer le coefficient de f.
   b) Calculer f(2), f(−1/3) et f(0.8).
   c) Déterminer l'antécédent de 9 par f, puis celui de −2.25.
2. Sans utiliser le coefficient de f, déduire des résultats du 1. b) la valeur de f(2.8).
3. Soit g la fonction linéaire dont la représentation graphique Δ passe par le point B(5, 2).
   a) Déterminer g(x) pour tout réel x.
   b) Les points C(−7.5, −3) et E(12, 5) appartiennent-ils à Δ ?
4. On note D la représentation graphique de f.
   a) Tracer D et Δ dans le repère (O, I, J).
   b) Montrer que O est le seul point commun aux droites D et Δ.
5. a) Les points O, M(−6, 9) et N(4, −6) sont-ils alignés ? Justifier.
   b) Soit h la fonction linéaire dont la représentation graphique passe par le point P(2, 5). Montrer que cette représentation graphique est la droite (OP). Les points O, P et Q(3, 7) sont-ils alignés ?

### Corrigé

**1. a)** f est linéaire : il existe un réel a tel que f(x) = ax pour tout réel x.
f(−4) = 6 s'écrit −4a = 6, donc a = 6 / (−4) = −1.5. Le coefficient de f est −1.5 et f(x) = −1.5x.

**b)** f(2) = −1.5 × 2 = −3 ; f(−1/3) = −1.5 × (−1/3) = 0.5 ; f(0.8) = −1.5 × 0.8 = −1.2.

**c)** L'antécédent de 9 est le réel x tel que −1.5x = 9, soit x = 9 / (−1.5) = −6. Contrôle : f(−6) = 9.
L'antécédent de −2.25 est le réel x tel que −1.5x = −2.25, soit x = 1.5. Contrôle : f(1.5) = −2.25.

**2.** Pour tous réels x et x', f(x + x') = f(x) + f(x'). Comme 2.8 = 2 + 0.8 :
f(2.8) = f(2) + f(0.8) = −3 + (−1.2) = −4.2. (Contrôle : −1.5 × 2.8 = −4.2.)

**3. a)** g est linéaire : g(x) = cx pour un réel c. B appartient à Δ, donc g(5) = 2, soit 5c = 2 et c = 0.4.
Pour tout réel x : g(x) = 0.4x.

**b)** Un point de coordonnées (x, y) appartient à Δ si et seulement si y = 0.4x.

- g(−7.5) = 0.4 × (−7.5) = −3 : C appartient à Δ.
- g(12) = 0.4 × 12 = 4.8 et 4.8 ≠ 5 : E n'appartient pas à Δ.

**4. a)** D est la droite d'équation y = −1.5x. Elle passe par O et par A(1, −1.5) ; pour plus de précision on utilise aussi les points (2, −3) et (−4, 6) trouvés au 1. Le coefficient est négatif : quand x augmente de 1, l'ordonnée diminue de 1.5.
Δ est la droite d'équation y = 0.4x. Elle passe par O, par le point (1, 0.4), par B(5, 2) et par C(−7.5, −3) ; on la trace avec O et B.

**b)** Un point M(x, y) est commun à D et Δ si et seulement si y = −1.5x et y = 0.4x. Alors −1.5x = 0.4x, soit −1.9x = 0, donc x = 0 (car −1.9 ≠ 0), puis y = 0.
Le seul point commun est O(0, 0).

**5. a)** f(−6) = −1.5 × (−6) = 9 et f(4) = −1.5 × 4 = −6 : les points M et N appartiennent à D. La droite D passe aussi par O. Les trois points sont sur la droite D : O, M et N sont alignés.

**b)** h(x) = kx avec h(2) = 5, donc 2k = 5 et k = 2.5 : h(x) = 2.5x.
La représentation graphique de h est une droite (admis) ; elle passe par O car h(0) = 0, et par P car h(2) = 5. C'est donc la droite (OP).
Q appartient à (OP) si et seulement si son ordonnée est h(3) = 2.5 × 3 = 7.5. Or l'ordonnée de Q est 7 ≠ 7.5 : Q n'appartient pas à (OP). Les points O, P et Q ne sont pas alignés.

---

## Exercice 2 — Hausse puis remise : enchaîner des pourcentages

Un magasin d'électroménager augmente tous ses prix de 8 % en janvier. En juillet, il accorde une remise de 25 % sur les prix de janvier.
Pour un article, on note x son prix (en dinars) avant la hausse, f(x) son prix en janvier et h(x) son prix en juillet.

1. a) Montrer que f(x) = 1.08x. Quelle est la nature de la fonction f ?
   b) Un réfrigérateur coûtait 850 D avant la hausse. Calculer son prix en janvier.
   c) En janvier, un four coûte 432 D. Quel était son prix avant la hausse ?
   d) En janvier, un client achète ce réfrigérateur et ce four. Montrer que le montant de sa facture est f(1250), puis calculer ce montant de deux manières.
2. a) Montrer que h(x) = 0.81x.
   b) Un vendeur affirme : « Avec +8 % puis −25 %, le prix de juillet est inférieur de 17 % au prix d'avant la hausse. » A-t-il raison ? Quel pourcentage de baisse faut-il annoncer ?
3. Le plan est muni d'un repère (O, I, J) dans lequel 1 cm représente 100 D sur chacun des deux axes.
   a) Représenter les fonctions f et h pour les prix x compris entre 0 et 1000.
   b) Lire sur le graphique, puis calculer, le prix avant la hausse d'un article payé 648 D en juillet.
4. Pour un article de prix x avant la hausse, on note e(x) = f(x) − h(x) l'économie réalisée en l'achetant en juillet plutôt qu'en janvier.
   a) Montrer que e est une fonction linéaire et donner son coefficient.
   b) Pour quel prix x (avant la hausse) l'économie est-elle de 81 D ?

### Corrigé

**1. a)** Une hausse de 8 % ajoute au prix x les 8 centièmes de x :
f(x) = x + (8/100)x = x + 0.08x = 1.08x.
f est la fonction linéaire de coefficient 1.08.

**b)** f(850) = 1.08 × 850 = 918. Le réfrigérateur coûte 918 D en janvier.

**c)** On cherche l'antécédent de 432 par f : 1.08x = 432, soit x = 432 / 1.08 = 400. Le four coûtait 400 D.

**d)** La facture est f(850) + f(400). Comme f est linéaire, f(850) + f(400) = f(850 + 400) = f(1250).

- Première manière : 918 + 432 = 1350.
- Deuxième manière : f(1250) = 1.08 × 1250 = 1350.

La facture est de 1350 D.

**2. a)** Une remise de 25 % sur un prix y donne y − 0.25y = 0.75y. Ici y est le prix de janvier f(x) = 1.08x, donc :
h(x) = 0.75 × 1.08x = 0.81x.

**b)** h(x) = 0.81x = x − 0.19x : le prix de juillet est inférieur de 19 % au prix d'avant la hausse, et non de 17 %.
Le vendeur a tort : la remise de 25 % porte sur le prix de janvier, qui est déjà augmenté, et non sur le prix x. On ne peut pas additionner les deux pourcentages.
Exemple : un article à 100 D coûte 108 D en janvier et 0.75 × 108 = 81 D en juillet, soit 19 D de moins que 100 D.

**3. a)** Pour 0 ≤ x ≤ 1000, la représentation de f est le segment qui joint O au point (1000, 1080), c'est-à-dire au point situé à 10 cm sur l'axe des abscisses et 10.8 cm sur l'axe des ordonnées ; il passe par (500, 540).
La représentation de h est le segment qui joint O au point (1000, 810) ; il passe par (500, 405).
Pour x > 0, 0.81x < 1.08x : le segment de h est situé sous celui de f.

**b)** Graphiquement : la droite horizontale d'ordonnée 648 (à 6.48 cm) coupe le segment de h au point d'abscisse 800 (à 8 cm).
Par le calcul : 0.81x = 648, soit x = 648 / 0.81 = 800. L'article coûtait 800 D avant la hausse.

**4. a)** e(x) = 1.08x − 0.81x = 0.27x. e est la fonction linéaire de coefficient 0.27.

**b)** 0.27x = 81, soit x = 81 / 0.27 = 300. Contrôle : f(300) = 324 et h(300) = 243, et 324 − 243 = 81.
L'économie est de 81 D pour un article qui coûtait 300 D avant la hausse.
