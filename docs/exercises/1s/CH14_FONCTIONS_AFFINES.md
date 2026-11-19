# 1ère année — Chapitre 14 : Fonctions affines

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 9, « Activités algébriques » : fonctions affines ; déterminer l'expression d'une fonction affine connaissant les images de deux réels distincts ; modéliser des situations réelles menant à des fonctions affines ; problèmes de point de rencontre de deux mobiles. P. 13, « Activités dans un repère » : représentation graphique d'une fonction affine ; expression à partir de la représentation graphique ; point d'intersection éventuel de deux droites ; résolution graphique d'une inéquation du premier degré à une inconnue.
- Manuel CNP, chapitre 14 (p. 213–226) : f : x ↦ ax + b ; f(0) = b est l'ordonnée à l'origine et a = (f(x) − f(x')) / (x − x') pour tous réels distincts x et x' est le coefficient de f ; si b = 0, f est linéaire ; si a = 0, f est constante. On admet que la représentation graphique de f dans un repère (O, I, J) est la droite d'équation y = ax + b, de coefficient directeur a, qui passe par le point (0, b). Résolution graphique de f(x) ≤ g(x). Chapitre 6 (Retenir p. 90) : les représentations graphiques de deux fonctions affines ayant le même coefficient sont parallèles.
- Outils autorisés : ce chapitre, les fonctions linéaires (chapitre 12), les équations et inéquations du premier degré (chapitre 13), le repère (chapitre 6). Le sens de variation n'est pas utilisé. Pas de systèmes (chapitre 15) : un point d'intersection se trouve en résolvant f(x) = g(x).
- Notation : repère (O, I, J) ; f : x ↦ ax + b ; durées en heures (0.5 h = 30 min) ; point décimal (0.5).
- Toutes les valeurs sont vérifiées par `check_ch14.py` (calcul exact en fractions).

---

## Exercice 1 — Déterminer une fonction affine, la représenter, résoudre graphiquement

Le plan est muni d'un repère (O, I, J).

1. Soit f la fonction affine telle que f(−2) = 7 et f(4) = −2.
   a) Déterminer le coefficient a et l'ordonnée à l'origine b de f.
   b) Calculer f(6) et f(1/3).
   c) Déterminer l'antécédent de 10 par f, puis celui de 0.
   d) Sans calculer f(100) ni f(103), donner la valeur de f(103) − f(100).
2. Soit g la fonction affine dont la représentation graphique Δ passe par les points A(−2, −9) et B(4, 6). Déterminer g(x) pour tout réel x.
3. On note D la représentation graphique de f.
   a) Déterminer les points d'intersection de D avec les axes (OJ) et (OI), puis ceux de Δ.
   b) Tracer D et Δ.
4. a) Déterminer par le calcul le point d'intersection E des droites D et Δ.
   b) Résoudre graphiquement, puis par le calcul, l'inéquation f(x) ≤ g(x).
5. Soit h la fonction affine telle que h(0) = 3 et h(2) = 8. On note Δ' sa représentation graphique.
   a) Déterminer h(x) pour tout réel x.
   b) Montrer que l'équation h(x) = g(x) n'a pas de solution. Que peut-on en déduire pour les droites Δ et Δ' ? Était-ce prévisible ?

### Corrigé

**1. a)** Le coefficient est le quotient de la différence des images par la différence des antécédents :
a = (f(4) − f(−2)) / (4 − (−2)) = (−2 − 7) / 6 = −9/6 = −1.5.
Donc f(x) = −1.5x + b. De f(−2) = 7 on tire −1.5 × (−2) + b = 7, soit 3 + b = 7, donc b = 4.
f(x) = −1.5x + 4. Contrôle : f(4) = −6 + 4 = −2.

**b)** f(6) = −9 + 4 = −5 ; f(1/3) = −0.5 + 4 = 3.5.

**c)** −1.5x + 4 = 10 équivaut à −1.5x = 6, soit x = −4 : l'antécédent de 10 est −4.
−1.5x + 4 = 0 équivaut à 1.5x = 4, soit x = 4 / 1.5 = 8/3 : l'antécédent de 0 est 8/3.

**d)** Pour x ≠ x', f(x) − f(x') = a(x − x'). Donc f(103) − f(100) = −1.5 × (103 − 100) = −4.5.

**2.** g(x) = cx + d avec c = (6 − (−9)) / (4 − (−2)) = 15/6 = 2.5.
g(4) = 6 donne 10 + d = 6, soit d = −4. Donc g(x) = 2.5x − 4. Contrôle : g(−2) = −5 − 4 = −9.

**3. a)**

- D coupe (OJ) au point d'abscisse 0 : f(0) = 4, d'où le point (0, 4). D coupe (OI) au point d'ordonnée 0 : f(x) = 0 pour x = 8/3, d'où le point (8/3, 0).
- Δ coupe (OJ) au point (0, −4) car g(0) = −4. Δ coupe (OI) au point (1.6, 0) car 2.5x − 4 = 0 équivaut à x = 4/2.5 = 1.6.

**b)** D passe par (0, 4) et par (2, 1) (car f(2) = 1) ; elle passe aussi par (−2, 7) et (4, −2). Son coefficient directeur est −1.5 : quand x augmente de 2, l'ordonnée diminue de 3.
Δ passe par (0, −4) et par (2, 1) (car g(2) = 1) ; elle passe aussi par A(−2, −9) et B(4, 6). Son coefficient directeur est 2.5 : quand x augmente de 2, l'ordonnée augmente de 5.

**4. a)** Un point E(x, y) appartient à D et à Δ si et seulement si y = f(x) et y = g(x). On résout f(x) = g(x) :
−1.5x + 4 = 2.5x − 4 équivaut à 8 = 4x, soit x = 2. Alors y = f(2) = 1.
L'équation a une seule solution : les droites D et Δ se coupent en un seul point, E(2, 1).

**b)** Graphiquement : f(x) ≤ g(x) signifie que le point de D d'abscisse x est en dessous du point de Δ de même abscisse, ou confondu avec lui. Sur la figure, D est au-dessus de Δ à gauche de E et en dessous de Δ à droite de E. Donc S = [2, +∞[.
Par le calcul : −1.5x + 4 ≤ 2.5x − 4 équivaut à 8 ≤ 4x, soit x ≥ 2. S = [2, +∞[.

**5. a)** L'ordonnée à l'origine est h(0) = 3 et le coefficient est (h(2) − h(0)) / (2 − 0) = (8 − 3) / 2 = 2.5.
h(x) = 2.5x + 3.

**b)** h(x) = g(x) équivaut à 2.5x + 3 = 2.5x − 4, puis, en ajoutant −2.5x aux deux membres, à 3 = −4, ce qui est impossible.
Aucun réel x ne vérifie h(x) = g(x) : les droites Δ et Δ' n'ont aucun point commun. Elles sont parallèles et distinctes (Δ' passe par (0, 3) et Δ par (0, −4)).
C'était prévisible : g et h ont le même coefficient 2.5, et les représentations graphiques de deux fonctions affines ayant le même coefficient sont parallèles.

---

## Exercice 2 — Rencontre de deux véhicules

Une route rectiligne relie deux villes A et B distantes de 120 km.

- À 8 h, un camion part de A en direction de B et roule à la vitesse constante de 60 km/h.
- À 8 h 30 min, une voiture part de B en direction de A et roule à vitesse constante. À 9 h 30 min, elle se trouve à 30 km de A.

On note t le temps, en heures, écoulé depuis 8 h (par exemple, 8 h 30 min correspond à t = 0.5). On note d1(t) la distance, en km, entre A et le camion, et d2(t) la distance, en km, entre A et la voiture.

1. a) Montrer que d1(t) = 60t, pour t compris entre 0 et l'arrivée du camion en B. À quelle heure le camion arrive-t-il en B ?
   b) La vitesse de la voiture étant constante, on admet que d2 est une fonction affine de t, de la forme d2(t) = at + b, depuis le départ de la voiture jusqu'à son arrivée en A. Justifier que d2(0.5) = 120 et d2(1.5) = 30, puis déterminer a et b.
   c) En déduire la vitesse de la voiture et l'heure de son arrivée en A.
2. Calculer d1(1) et d2(1). Quelle est la distance qui sépare les deux véhicules à 9 h ?
3. Dans un repère orthogonal, on prend 6 cm pour 1 heure sur l'axe des abscisses et 1 cm pour 10 km sur l'axe des ordonnées. Représenter graphiquement d1 et d2 sur leurs intervalles de temps.
4. Déterminer par le calcul l'heure de la rencontre des deux véhicules et sa distance à A. Retrouver ce résultat sur le graphique.
5. Entre 8 h 30 min et l'arrivée de la voiture en A, les deux véhicules roulent sur la même route. La distance qui les sépare est la différence entre la plus grande et la plus petite des deux distances d1(t) et d2(t).
   a) Montrer que cette distance est égale à 165 − 150t avant la rencontre, et à 150t − 165 après la rencontre.
   b) Pendant combien de temps cette distance est-elle inférieure ou égale à 30 km ? Préciser le début et la fin de cette période.

### Corrigé

**1. a)** Le camion part de A à t = 0 et parcourt 60 km en une heure : au bout de t heures, il a parcouru 60t km, donc d1(t) = 60t (d1 est linéaire).
Il arrive en B lorsque 60t = 120, soit t = 2, c'est-à-dire à 10 h. La formule vaut pour 0 ≤ t ≤ 2.

**b)** À 8 h 30 min (t = 0.5), la voiture est en B, à 120 km de A : d2(0.5) = 120. À 9 h 30 min (t = 1.5), elle est à 30 km de A : d2(1.5) = 30.
a = (d2(1.5) − d2(0.5)) / (1.5 − 0.5) = (30 − 120) / 1 = −90.
d2(0.5) = 120 donne −90 × 0.5 + b = 120, soit b = 120 + 45 = 165. Donc d2(t) = −90t + 165.

**c)** Entre 8 h 30 min et 9 h 30 min, c'est-à-dire en une heure, la voiture parcourt 120 − 30 = 90 km : sa vitesse est 90 km/h.
Elle arrive en A lorsque d2(t) = 0 : −90t + 165 = 0 équivaut à t = 165/90 = 11/6. Or 11/6 h = 1 h 50 min : elle arrive en A à 9 h 50 min. La formule vaut pour 0.5 ≤ t ≤ 11/6.

**2.** d1(1) = 60 et d2(1) = −90 + 165 = 75. À 9 h, le camion est à 60 km de A et la voiture à 75 km de A, sur la même route : ils sont séparés de 75 − 60 = 15 km (ils ne se sont pas encore croisés).

**3.**

- d1 est représentée par le segment qui joint l'origine (0, 0) au point (2, 120), soit 12 cm en abscisse et 12 cm en ordonnée ; il passe par (1, 60).
- d2 est représentée par le segment qui joint le point (0.5, 120) (3 cm ; 12 cm) au point (11/6, 0) (11 cm ; 0 cm) ; il passe par (1, 75) et (1.5, 30). Son coefficient directeur −90 est négatif : la voiture se rapproche de A.

**4.** Les véhicules se rencontrent lorsqu'ils sont à la même distance de A : d1(t) = d2(t), avec 0.5 ≤ t ≤ 11/6.
60t = −90t + 165 équivaut à 150t = 165, soit t = 1.1. On a bien 0.5 ≤ 1.1 ≤ 11/6.
1.1 h = 1 h 6 min : la rencontre a lieu à 9 h 6 min, à d1(1.1) = 66 km de A (et donc à 54 km de B). Contrôle : d2(1.1) = −99 + 165 = 66.
Sur le graphique, c'est le point d'intersection des deux segments, de coordonnées (1.1, 66).

**5. a)** Pour t ≤ 1.1, la voiture n'a pas encore croisé le camion, elle est plus loin de A : d2(t) − d1(t) = −90t + 165 − 60t = 165 − 150t, qui est bien positif ou nul car 150t ≤ 165.
Pour t ≥ 1.1, c'est le camion qui est plus loin de A : d1(t) − d2(t) = 60t + 90t − 165 = 150t − 165, positif ou nul.

**b)**

- Avant la rencontre (0.5 ≤ t ≤ 1.1) : 165 − 150t ≤ 30 équivaut à 135 ≤ 150t, soit t ≥ 0.9. On obtient 0.9 ≤ t ≤ 1.1.
- Après la rencontre (1.1 ≤ t ≤ 11/6) : 150t − 165 ≤ 30 équivaut à 150t ≤ 195, soit t ≤ 1.3. On obtient 1.1 ≤ t ≤ 1.3 (et 1.3 ≤ 11/6).

La distance est inférieure ou égale à 30 km pour 0.9 ≤ t ≤ 1.3, c'est-à-dire de 8 h 54 min à 9 h 18 min, pendant 0.4 h = 24 min.
Contrôle : à t = 0.9, d1 = 54 et d2 = 84 ; à t = 1.3, d1 = 78 et d2 = 48 ; l'écart vaut 30 km dans les deux cas.
Sur le graphique : ce sont les instants où l'écart vertical entre les deux segments est au plus 3 cm.
