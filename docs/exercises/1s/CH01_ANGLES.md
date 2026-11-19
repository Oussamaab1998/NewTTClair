# 1ère année — Chapitre 1 : Angles

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10, « Activités géométriques » : configurations de base dans le plan ; montrer que deux droites sont parallèles en utilisant la propriété des angles alternes-internes ; reconnaître certains lieux géométriques (médiatrice, bissectrice, cercle) ; construire un polygone régulier connaissant son centre et un sommet. P. 14, « Activités sur les mesures de grandeurs » : angles, temps ; mesurer des angles en utilisant l'angle inscrit et l'angle au centre associé.
- Manuel CNP, chapitre 1 (p. 9–22) : angles et figures de base (somme des angles d'un triangle, triangles isocèle et équilatéral ; l'angle extérieur d'un triangle est vu en activité) ; deux droites parallèles forment avec une sécante des angles alternes-internes égaux, des angles correspondants égaux et des angles intérieurs d'un même côté supplémentaires, avec les trois réciproques ; si un côté d'un triangle est un diamètre de son cercle circonscrit, le triangle est rectangle ; les points P tels que l'angle APB mesure 90° forment le cercle de diamètre [AB] privé de A et de B ; un angle inscrit est égal à la moitié de l'angle au centre qui intercepte le même arc ; deux angles inscrits qui interceptent le même arc sont égaux.
- Outils autorisés : ce chapitre et les acquis du collège (bissectrice, médiatrice, parallélogramme et losange, théorème de Pythagore, aire d'un secteur circulaire, rapporteur). Pas de théorème de Thalès (chapitre 2), pas de rapports trigonométriques (chapitre 3).
- Notation : « l'angle ABC » est l'angle de sommet B formé par les demi-droites [BA) et [BC) (le manuel le surmonte d'un chapeau) ; les angles sont mesurés en degrés ; AB est une longueur ; (AB) // (CD) signifie que les droites (AB) et (CD) sont parallèles ; ⟂ signifie « perpendiculaire ».
- Toutes les affirmations des corrigés sont vérifiées par `check_ch01.py` (chaque figure est construite dans un repère à partir des seules données de l'énoncé, puis les angles, longueurs, positions et parallélismes sont mesurés sur les coordonnées ; le raisonnement de l'exercice 1 est aussi testé sur 300 triangles quelconques).

---

## Exercice 1 — Bissectrice, angles alternes-internes et correspondants, losange

On construit un triangle ABC tel que BC = 7 cm, l'angle ABC mesure 60° et l'angle ACB mesure 40°.

1. Décrire la construction du triangle ABC, puis calculer l'angle BAC.
2. La bissectrice de l'angle ABC coupe le segment [AC] en D.
   a) Calculer les angles ABD et DBC.
   b) Calculer l'angle ADB, puis l'angle BDC. Contrôler le résultat dans le triangle BDC.
3. La parallèle à (BC) passant par D coupe le segment [AB] en E.
   a) Montrer que l'angle EDB mesure 30°. En déduire la nature du triangle EBD.
   b) Calculer les angles AED et ADE.
4. Soit F le point du segment [BC] tel que l'angle CDF mesure 80°.
   a) Montrer que les droites (DF) et (AB) sont parallèles.
   b) Montrer que le quadrilatère BEDF est un losange.
5. a) Calculer les quatre angles du losange BEDF.
   b) Calculer l'angle BDF. En déduire que la demi-droite [DB) est la bissectrice de l'angle EDF, puis montrer que (EF) ⟂ (BD).

### Corrigé

**1.** On trace un segment [BC] de longueur 7 cm. Au rapporteur, on trace la demi-droite [Bx) telle que l'angle CBx mesure 60°, puis, du même côté de la droite (BC), la demi-droite [Cy) telle que l'angle BCy mesure 40°. Comme 60° + 40° < 180°, ces deux demi-droites se coupent : leur point commun est A.
La somme des angles du triangle ABC vaut 180°, donc l'angle BAC mesure 180° − 60° − 40° = 80°.

**2. a)** [BD) est la bissectrice de l'angle ABC, donc les angles ABD et DBC sont égaux et mesurent chacun 60° / 2 = 30°.

**b)** D appartient à [AC], donc l'angle BAD est l'angle BAC (80°). Dans le triangle ABD :

    angle ADB = 180° − 80° − 30° = 70°

Les points A, D et C sont alignés et D est entre A et C : les angles ADB et BDC sont supplémentaires, donc l'angle BDC mesure 180° − 70° = 110°.
Contrôle dans le triangle BDC : 30° + 40° + 110° = 180°. (On retrouve aussi que l'angle extérieur ADB du triangle BDC est la somme des deux autres angles : 30° + 40° = 70°.)

**3. a)** Les droites (ED) et (BC) sont parallèles et la droite (BD) les coupe. Les points E et C sont de part et d'autre de (BD) : les angles EDB et DBC sont alternes-internes, donc égaux. L'angle EDB mesure 30°.
Dans le triangle EBD, l'angle EBD est l'angle ABD (car E ∈ [AB]), qui mesure 30°. Le triangle EBD a deux angles égaux (30° en B et en D) : il est isocèle en E, donc EB = ED.

**b)** Les droites parallèles (ED) et (BC) sont coupées par la sécante (AB) : les angles AED et ABC sont correspondants, donc l'angle AED mesure 60°.
Avec la sécante (AC) : les angles ADE et ACB sont correspondants, donc l'angle ADE mesure 40°.
Contrôle dans le triangle AED : 80° + 60° + 40° = 180°.

**4. a)** Les droites (DF) et (AB) sont coupées par la sécante (AC). Les angles CDF (en D) et CAB (en A) sont correspondants : leurs côtés [DC) et [AC) sont de même sens sur la sécante, et les points F et B sont du même côté de (AC). Ces deux angles mesurent 80°, ils sont égaux. D'après la réciproque, les droites (DF) et (AB) sont parallèles.

**b)** La droite (BE) est la droite (AB), parallèle à (DF) ; la droite (ED) est parallèle à (BC), qui est la droite (BF). Le quadrilatère BEDF a ses côtés opposés parallèles : c'est un parallélogramme.
De plus EB = ED (question 3. a)) : ce parallélogramme a deux côtés consécutifs égaux, c'est un losange.

**5. a)**

- L'angle EBF est l'angle ABC : 60°.
- Les points A, E et B sont alignés, E entre A et B : l'angle BED mesure 180° − 60° = 120° (supplémentaire de l'angle AED).
- (BE) // (DF), sécante (BF) : les angles EBF et DFB sont intérieurs d'un même côté, donc supplémentaires. L'angle DFB mesure 180° − 60° = 120°.
- (ED) // (BF), sécante (DF) : les angles EDF et DFB sont intérieurs d'un même côté. L'angle EDF mesure 180° − 120° = 60°.

Contrôle : 60° + 120° + 60° + 120° = 360°. Dans le triangle DFC, l'angle DFC mesure 180° − 80° − 40° = 60°, et l'on retrouve 180° − 60° = 120° pour l'angle DFB.

**b)** (DF) // (AB), sécante (BD) : A et F sont de part et d'autre de (BD), donc les angles BDF et DBA sont alternes-internes. L'angle BDF mesure 30°.
Les angles EDB et BDF mesurent tous deux 30°, et 30° + 30° = 60° est l'angle EDF : [DB) est la bissectrice de l'angle EDF.
Enfin EB = ED et FB = FD (côtés du losange) : E et F sont équidistants de B et de D, donc ils sont sur la médiatrice de [BD]. La droite (EF) est cette médiatrice : (EF) ⟂ (BD).

---

## Exercice 2 — Le cadran d'une horloge

Le cadran d'une horloge est un cercle (C) de centre O et de rayon 10 cm. Les douze graduations des heures sont des points de (C) notés H₁, H₂, …, H₁₂ (H₁₂ est en haut, H₃ à droite, H₆ en bas, H₉ à gauche). Elles sont régulièrement réparties : les douze angles au centre H₁₂OH₁, H₁OH₂, …, H₁₁OH₁₂ sont égaux.

1. a) Montrer que l'angle H₁₂OH₁ mesure 30°.
   b) À 4 h pile, l'aiguille des heures est dirigée vers H₄ et celle des minutes vers H₁₂. Quel angle forment les deux aiguilles ?
   c) Quelle est la nature du triangle OH₁₂H₂ ? En déduire la distance H₁₂H₂.
2. a) Calculer l'angle inscrit H₁₂H₈H₄.
   b) Sans nouveau calcul, donner l'angle H₁₂H₁₀H₄. Justifier.
   c) Montrer que le triangle H₁₂H₄H₈ est équilatéral.
3. a) Montrer que le triangle H₁₂H₄H₆ est rectangle en H₄.
   b) Calculer H₄H₆, puis la valeur exacte de H₁₂H₄. En donner une valeur approchée à 0.01 près. Que représente cette longueur pour le triangle de la question 2. c) ?
   c) Quel est l'ensemble des points P du plan tels que l'angle H₁₂PH₆ mesure 90° ?
4. a) Calculer les angles H₁₁H₁H₇ et H₅H₇H₁.
   b) En déduire que les droites (H₁H₁₁) et (H₅H₇) sont parallèles.
5. L'aiguille des minutes mesure 9 cm.
   a) Quel angle l'aiguille des minutes balaie-t-elle entre 4 h et 4 h 20 ? Calculer l'aire de la surface qu'elle balaie (valeur exacte, puis valeur approchée à 0.01 près).
   b) L'aiguille des heures tourne de 30° par heure. Quel angle forment les deux aiguilles à 4 h 20 ?

### Corrigé

**1. a)** Les douze angles au centre H₁₂OH₁, H₁OH₂, …, H₁₁OH₁₂ sont égaux et, mis bout à bout, ils font un tour complet, soit 360°. Chacun mesure 360° / 12 = 30°.

**b)** De H₁₂ à H₄ il y a quatre intervalles (H₁₂H₁, H₁H₂, H₂H₃, H₃H₄), donc l'angle H₁₂OH₄ mesure 4 × 30° = 120°. À 4 h, les aiguilles forment un angle de 120°.

**c)** L'angle H₁₂OH₂ mesure 2 × 30° = 60° et OH₁₂ = OH₂ = 10 cm (rayons). Le triangle OH₁₂H₂ est isocèle en O, ses angles à la base sont égaux et mesurent chacun (180° − 60°) / 2 = 60°. Ses trois angles mesurent 60° : il est équilatéral.
Donc H₁₂H₂ = OH₁₂ = 10 cm.

**2. a)** L'angle H₁₂H₈H₄ a son sommet H₈ sur (C) : c'est un angle inscrit. Il intercepte l'arc d'extrémités H₁₂ et H₄ qui ne contient pas H₈, c'est-à-dire l'arc qui passe par H₁, H₂, H₃. L'angle au centre associé est l'angle H₁₂OH₄, qui mesure 120°.
Un angle inscrit est égal à la moitié de l'angle au centre qui intercepte le même arc : l'angle H₁₂H₈H₄ mesure 120° / 2 = 60°.

**b)** H₁₀ n'est pas non plus sur l'arc H₁₂H₁H₂H₃H₄ : l'angle inscrit H₁₂H₁₀H₄ intercepte le même arc que l'angle H₁₂H₈H₄. Deux angles inscrits qui interceptent le même arc sont égaux : l'angle H₁₂H₁₀H₄ mesure 60°.

**c)** De la même façon, l'angle inscrit H₄H₁₂H₈ intercepte l'arc qui passe par H₅, H₆, H₇ ; l'angle au centre associé H₄OH₈ mesure 4 × 30° = 120°, donc l'angle H₄H₁₂H₈ mesure 60°.
Le troisième angle du triangle, H₁₂H₄H₈, mesure 180° − 60° − 60° = 60°. Les trois angles du triangle H₁₂H₄H₈ mesurent 60° : il est équilatéral.

**3. a)** De H₁₂ à H₆ il y a six intervalles : l'angle H₁₂OH₆ mesure 6 × 30° = 180°. Les points H₁₂, O et H₆ sont alignés et O est le milieu de [H₁₂H₆] : ce segment est un diamètre de (C), de longueur 20 cm.
Le triangle H₁₂H₄H₆ est inscrit dans le cercle (C) et son côté [H₁₂H₆] est un diamètre de ce cercle : il est rectangle en H₄.

**b)** L'angle H₄OH₆ mesure 2 × 30° = 60° et OH₄ = OH₆ = 10 cm : comme au 1. c), le triangle OH₄H₆ est équilatéral, donc H₄H₆ = 10 cm.
D'après le théorème de Pythagore dans le triangle H₁₂H₄H₆ rectangle en H₄ :

    H₁₂H₄² = H₁₂H₆² − H₄H₆² = 400 − 100 = 300,   donc   H₁₂H₄ = √300 = 10√3 ≈ 17.32 cm

C'est la longueur du côté du triangle équilatéral H₁₂H₄H₈.

**c)** Les points P tels que l'angle H₁₂PH₆ mesure 90° sont les points du cercle de diamètre [H₁₂H₆], privé de H₁₂ et de H₆. Ce cercle est (C) lui-même (centre O, milieu de [H₁₂H₆], rayon 10 cm).
L'ensemble cherché est le cercle (C) privé des points H₁₂ et H₆.

**4. a)**

- L'angle inscrit H₁₁H₁H₇ intercepte l'arc qui passe par H₁₀, H₉, H₈ ; l'angle au centre associé H₇OH₁₁ mesure 4 × 30° = 120°. L'angle H₁₁H₁H₇ mesure 60°.
- L'angle inscrit H₅H₇H₁ intercepte l'arc qui passe par H₄, H₃, H₂ ; l'angle au centre associé H₁OH₅ mesure 120°. L'angle H₅H₇H₁ mesure 60°.

**b)** De H₁ à H₇ il y a six intervalles : [H₁H₇] est un diamètre. Les graduations H₈, …, H₁₂ sont d'un côté de la droite (H₁H₇) et H₂, …, H₅ de l'autre côté ; en particulier H₁₁ et H₅ sont de part et d'autre de (H₁H₇).
Les droites (H₁H₁₁) et (H₇H₅) sont coupées par la sécante (H₁H₇), et les angles H₁₁H₁H₇ et H₅H₇H₁ sont alternes-internes. Ils sont égaux (60°) : d'après la réciproque, (H₁H₁₁) // (H₅H₇).

**5. a)** L'aiguille des minutes fait un tour (360°) en 60 minutes, soit 6° par minute. En 20 minutes, elle balaie 20 × 6° = 120° (elle passe de H₁₂ à H₄).
La surface balayée est un secteur circulaire de rayon 9 cm et d'angle 120° :

    aire = π × 9² × 120 / 360 = 81π / 3 = 27π ≈ 84.82 cm²

**b)** À 4 h, l'aiguille des heures est dirigée vers H₄, à 120° de [OH₁₂). En 20 minutes, c'est-à-dire un tiers d'heure, elle tourne de 30° / 3 = 10° : à 4 h 20, elle est à 130° de [OH₁₂).
À 4 h 20, l'aiguille des minutes est dirigée vers H₄, à 120° de [OH₁₂). Les deux aiguilles forment donc un angle de 130° − 120° = 10°.
