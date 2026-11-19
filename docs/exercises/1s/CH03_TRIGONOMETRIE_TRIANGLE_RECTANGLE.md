# 1ère année — Chapitre 3 : Rapports trigonométriques d'un angle aigu. Relations métriques dans un triangle rectangle

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 14, « Activités sur les mesures de grandeurs » : mesurer des longueurs ou des angles en utilisant les rapports trigonométriques dans un triangle rectangle ou le théorème de Pythagore et sa réciproque ; calculer des longueurs et des aires ; modéliser des situations réelles. P. 10, « Activités géométriques » : configurations de base dans le plan. (La liste des contenus géométriques de la p. 10 ne nomme pas les rapports trigonométriques ; ils apparaissent à la p. 14.)
- Manuel CNP, chapitre 3 (p. 37–50) : dans un triangle ABC rectangle en A, cos ABC = AB/BC, sin ABC = AC/BC, tan ABC = AC/AB ; pour tout angle aigu a, tan a = sin a / cos a et (sin a)² + (cos a)² = 1 ; si deux angles sont complémentaires, le sinus de l'un est égal au cosinus de l'autre ; valeurs pour 30°, 45° et 60° ; calculatrice en mode degré (2ndF cos pour retrouver un angle) ; relations métriques, H étant le pied de la hauteur issue de A : AB × AC = AH × BC, AB² + AC² = BC², AH² = HB × HC, AB² = BH × BC et AC² = CH × CB ; construction d'un angle aigu connaissant son sinus, son cosinus ou sa tangente. Le tableau des valeurs remarquables est en partie illisible dans la copie du manuel (les racines carrées sont perdues) : les valeurs utilisées sont rappelées dans les énoncés (« On rappelle que … »).
- Outils autorisés : ce chapitre, les chapitres 1 et 2 (angles, théorème de Thalès) et les acquis du collège (théorème de Pythagore, aires, racines carrées). Pas de vecteurs (chapitre 4), pas de fonctions trigonométriques, pas de formule d'Al-Kashi (elle n'est qu'un exercice du manuel). Calculatrice autorisée (mode degré).
- Notation : « l'angle ABC » est l'angle de sommet B (le manuel le surmonte d'un chapeau) ; cos ABC, sin ABC et tan ABC sont le cosinus, le sinus et la tangente de l'angle aigu ABC ; les angles sont mesurés en degrés ; AB est une longueur ; ≈ introduit une valeur approchée arrondie à 0.01 près.
- Toutes les valeurs sont vérifiées par `check_ch03.py` (figures en coordonnées, calcul exact en fractions et en nombres de la forme a + b√3 ; les valeurs données par la calculatrice sont contrôlées en flottants, et chaque figure est aussi reconstruite à partir des angles donnés).

---

## Exercice 1 — Cosinus, sinus, tangente et relations métriques

ABC est un triangle rectangle en A et H est le pied de la hauteur issue de A (H est sur le segment [BC]). On donne AB = 9 cm et BH = 5.4 cm.

1. a) Écrire cos ABC de deux façons : en utilisant le triangle ABH, puis le triangle ABC.
   b) En déduire que BC = 15 cm, puis calculer AC.
2. a) Calculer HC, puis AH en utilisant la relation AB × AC = AH × BC.
   b) Vérifier que AH² = HB × HC.
3. a) Calculer cos ABC, sin ABC et tan ABC. Vérifier que (sin ABC)² + (cos ABC)² = 1 et que tan ABC = sin ABC / cos ABC.
   b) À l'aide de la calculatrice, donner une valeur approchée à 0.01 près de l'angle ABC. En déduire une valeur approchée de l'angle ACB.
   c) Sans calculatrice, donner sin ACB et cos ACB.
4. Expliquer comment construire, avec une règle graduée et une équerre, un angle aigu dont la tangente est égale à 0.75. Quels angles de la figure ont cette tangente ?
5. Soit D le point du segment [AC] tel que l'angle ABD mesure 30°. On rappelle que cos 30° = √3/2 et tan 30° = √3/3.
   a) Calculer les valeurs exactes de AD et de BD, puis leurs valeurs approchées à 0.01 près.
   b) Calculer la valeur exacte de l'aire du triangle BDC, puis une valeur approchée à 0.01 près.
   c) Donner une valeur approchée à 0.01 près de l'angle DBC.

### Corrigé

**1. a)** Le triangle ABH est rectangle en H et, comme H ∈ [BC], l'angle ABH est l'angle ABC. Dans ABH, le côté adjacent à l'angle B est BH et l'hypoténuse est AB :

    cos ABC = BH/AB

Dans le triangle ABC rectangle en A, l'hypoténuse est BC :

    cos ABC = AB/BC

**b)** On en déduit BH/AB = AB/BC, donc BC = AB²/BH = 81/5.4 = 15 cm. (C'est la relation AB² = BH × BC.)
D'après le théorème de Pythagore dans ABC : AC² = BC² − AB² = 225 − 81 = 144, donc AC = 12 cm.

**2. a)** H est sur [BC] : HC = BC − BH = 15 − 5.4 = 9.6 cm.
AB × AC = AH × BC donne AH = (9 × 12)/15 = 108/15 = 7.2 cm.

**b)** AH² = 7.2² = 51.84 et HB × HC = 5.4 × 9.6 = 51.84 : on a bien AH² = HB × HC.
(Contrôle dans le triangle ABH rectangle en H : AB² − BH² = 81 − 29.16 = 51.84.)

**3. a)**

    cos ABC = AB/BC = 9/15 = 0.6     sin ABC = AC/BC = 12/15 = 0.8     tan ABC = AC/AB = 12/9 = 4/3

(sin ABC)² + (cos ABC)² = 0.64 + 0.36 = 1, et sin ABC / cos ABC = 0.8/0.6 = 8/6 = 4/3 = tan ABC.

**b)** En mode degré, on tape 2ndF cos 0.6 et la calculatrice affiche 53.1301… : l'angle ABC mesure environ 53.13°.
Le triangle ABC est rectangle en A, donc les angles ABC et ACB sont complémentaires : l'angle ACB mesure environ 90° − 53.13° = 36.87°.

**c)** Les angles ABC et ACB sont complémentaires, donc le sinus de l'un est égal au cosinus de l'autre :

    sin ACB = cos ABC = 0.6     cos ACB = sin ABC = 0.8

(On le vérifie directement : sin ACB = AB/BC = 9/15 et cos ACB = AC/BC = 12/15.)

**4.** On écrit 0.75 = 3/4. On trace un segment [IJ] de longueur 4 cm ; avec l'équerre, on trace la perpendiculaire à (IJ) en J, et on y place le point K tel que JK = 3 cm.
Le triangle IJK est rectangle en J, donc tan JIK = JK/IJ = 3/4 = 0.75 : l'angle JIK convient.
Dans la figure de l'exercice, tan ACB = AB/AC = 9/12 = 0.75 : l'angle ACB (environ 36.87°) a cette tangente.
Dans le triangle ABH rectangle en H, tan BAH = BH/AH = 5.4/7.2 = 0.75 : l'angle BAH (égal à l'angle ACB, car tous deux sont complémentaires de l'angle ABC) a aussi cette tangente.
Ce sont les deux seuls angles de la figure dont la tangente vaut 0.75.

**5. a)** D est sur [AC], donc le triangle ABD est rectangle en A.

- tan ABD = AD/AB, donc AD = 9 × tan 30° = 9 × √3/3 = 3√3 ≈ 5.20 cm.
- cos ABD = AB/BD, donc BD = 9 / (√3/2) = 18/√3 = 6√3 ≈ 10.39 cm.

Contrôle (Pythagore) : AB² + AD² = 81 + 27 = 108 = (6√3)². On a bien 3√3 < 12, donc D est sur le segment [AC].

**b)** DC = AC − AD = 12 − 3√3. La droite (BA) est perpendiculaire à (AC), qui porte [DC] : BA est la hauteur du triangle BDC relative au côté [DC]. Donc

    aire(BDC) = (1/2) × DC × AB = (1/2) × (12 − 3√3) × 9 = 54 − (27/2)√3 ≈ 30.62 cm²

Contrôle : aire(ABC) − aire(ABD) = 54 − (1/2) × 9 × 3√3 = 54 − 13.5√3.

**c)** D est sur [AC], donc la demi-droite [BD) est à l'intérieur de l'angle ABC :

    angle DBC = angle ABC − angle ABD ≈ 53.13° − 30° = 23.13°

---

## Exercice 2 — La maison : le toit et l'échelle

### Partie A — Le toit

La coupe verticale du toit d'une maison est un triangle ABC : la poutre horizontale [BC] mesure 8 m, et les deux pans du toit [AB] et [AC] font avec la poutre des angles ABC = 30° et ACB = 60°. Un poteau vertical [AH] soutient le faîte A ; son pied H est sur la poutre [BC].
On rappelle que sin 30° = 1/2, cos 30° = √3/2, sin 60° = √3/2 et cos 60° = 1/2.

1. a) Montrer que le triangle ABC est rectangle en A.
   b) Calculer les longueurs exactes AB et AC des deux pans du toit. Donner une valeur approchée de AB à 0.01 près.
2. a) Calculer la hauteur AH du poteau de deux façons : avec sin ACB, puis avec la relation AB × AC = AH × BC. En donner une valeur approchée à 0.01 près.
   b) Calculer BH et CH à l'aide des relations AB² = BH × BC et AC² = CH × CB. Vérifier que AH² = HB × HC.
3. a) Calculer les angles BAH et HAC.
   b) Calculer cos BAH dans le triangle ABH et sin HAC dans le triangle AHC. Retrouver ainsi cos 60° et sin 30°.
4. La maison a une profondeur de 10 m : le pan [AB] du toit est un rectangle de longueur 10 m et de largeur AB. On veut le couvrir de panneaux solaires. Calculer l'aire de ce pan (valeur exacte, puis valeur approchée à 0.01 près).

### Partie B — L'échelle

On appuie une échelle de 6 m contre un mur vertical, son pied étant posé sur le sol horizontal. On note α l'angle que fait l'échelle avec le sol. Pour la sécurité, on recommande 65° ≤ α ≤ 75°.

5. a) Le pied de l'échelle est à 2 m du mur. Calculer cos α, puis donner une valeur approchée de α à 0.01 près. La recommandation est-elle respectée ? À quelle hauteur se trouve le sommet de l'échelle (valeur exacte, puis approchée à 0.01 près) ?
   b) Mêmes questions lorsque le pied de l'échelle est à 3 m du mur.
   c) On place l'échelle de sorte que α = 75°. À quelle distance du mur se trouve son pied ? À quelle hauteur arrive son sommet ? (Valeurs approchées à 0.01 près.)
   d) Le bas d'une fenêtre est à 5.5 m du sol. Parmi les trois positions a), b) et c), lesquelles permettent d'atteindre la fenêtre en respectant la recommandation ?

### Corrigé — Partie A

**1. a)** La somme des angles du triangle ABC vaut 180°, donc l'angle BAC mesure 180° − 30° − 60° = 90° : ABC est rectangle en A.

**b)** Dans le triangle ABC rectangle en A, l'hypoténuse est [BC] :

- cos ABC = AB/BC, donc AB = 8 × cos 30° = 8 × √3/2 = 4√3 ≈ 6.93 m ;
- cos ACB = AC/BC, donc AC = 8 × cos 60° = 8 × 1/2 = 4 m.

Contrôle (Pythagore) : AB² + AC² = 48 + 16 = 64 = BC².

**2. a)** Le triangle AHC est rectangle en H et l'angle ACH est l'angle ACB : sin ACB = AH/AC, donc AH = 4 × sin 60° = 4 × √3/2 = 2√3.
Avec la relation métrique : AH = (AB × AC)/BC = (4√3 × 4)/8 = 2√3. On trouve AH = 2√3 ≈ 3.46 m.

**b)** AB² = BH × BC donne BH = 48/8 = 6 m, et AC² = CH × CB donne CH = 16/8 = 2 m. (Contrôle : BH + HC = 8 = BC.)
AH² = (2√3)² = 12 et HB × HC = 6 × 2 = 12 : on a bien AH² = HB × HC.

**3. a)** Le triangle ABH est rectangle en H, donc les angles BAH et ABH sont complémentaires : l'angle BAH mesure 90° − 30° = 60°.
H est entre B et C, donc [AH) est à l'intérieur de l'angle BAC : l'angle HAC mesure 90° − 60° = 30°.

**b)** Le triangle ABH est rectangle en H ; pour l'angle BAH, le côté adjacent est AH et l'hypoténuse est AB :

    cos BAH = AH/AB = 2√3 / (4√3) = 1/2

Comme l'angle BAH mesure 60°, on retrouve cos 60° = 1/2.
Le triangle AHC est rectangle en H ; pour l'angle HAC, le côté opposé est HC et l'hypoténuse est AC :

    sin HAC = HC/AC = 2/4 = 1/2

Comme l'angle HAC mesure 30°, on retrouve sin 30° = 1/2.

**4.** Aire du pan [AB] : AB × 10 = 4√3 × 10 = 40√3 ≈ 69.28 m².

### Corrigé — Partie B

On note W le pied du mur, P le pied de l'échelle et S son sommet. Le triangle PWS est rectangle en W, son hypoténuse est PS = 6 m et l'angle SPW est α. Donc cos α = PW/PS, sin α = WS/PS, et WS² = PS² − PW² (Pythagore).

**5. a)** PW = 2 m : cos α = 2/6 = 1/3. À la calculatrice (2ndF cos), α ≈ 70.53°. On a 65° ≤ 70.53° ≤ 75° : la recommandation est respectée.
WS² = 36 − 4 = 32, donc WS = √32 = 4√2 ≈ 5.66 m.

**b)** PW = 3 m : cos α = 3/6 = 1/2 = cos 60°, donc α = 60°. Comme 60° < 65°, la recommandation n'est pas respectée (l'échelle est trop inclinée).
WS² = 36 − 9 = 27, donc WS = √27 = 3√3 ≈ 5.20 m. (On retrouve WS = 6 × sin 60° = 6 × √3/2.)

**c)** α = 75° : PW = 6 × cos 75° ≈ 1.55 m et WS = 6 × sin 75° ≈ 5.80 m.

**d)**

- Position a) : 5.66 m ≥ 5.5 m et la recommandation est respectée : elle convient.
- Position b) : 5.20 m < 5.5 m, la fenêtre n'est pas atteinte (et la recommandation n'est pas respectée) : elle ne convient pas.
- Position c) : 5.80 m ≥ 5.5 m et α = 75° respecte la recommandation : elle convient.
