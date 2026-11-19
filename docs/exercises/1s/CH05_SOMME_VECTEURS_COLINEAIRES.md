# 1ère année — Chapitre 5 : Somme de deux vecteurs - Vecteurs colinéaires

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme officiel (septembre 2005), 1ère année, p. 10–11, « Activités géométriques » : vecteurs, somme de deux vecteurs, opposé d'un vecteur, produit d'un vecteur par un réel ; montrer que trois points sont alignés, qu'un point est le milieu d'un segment, que deux droites sont parallèles, qu'un quadrilatère est un parallélogramme ; déterminer le centre de gravité d'un triangle. P. 14 : temps, grandeurs composées, rapports trigonométriques dans un triangle rectangle.
- Manuel CNP, chapitre 5 (p. 69–80) : relation de Chasles vec(AB) + vec(BC) = vec(AC) ; règle du parallélogramme (pour A, B, C, D non alignés, ABDC est un parallélogramme ⟺ vec(AB) + vec(AC) = vec(AD)) ; vec(AB) + vec(BA) = 0 ; I est le milieu de [AB] ⟺ vec(IA) + vec(IB) = 0 ⟺ vec(AB) = 2 vec(AI) ; produit α vec(AB) défini par l'abscisse dans le repère (A, B) ; vecteurs colinéaires, de même sens (réel positif) ou de sens contraires (réel négatif) ; si vec(CD) = α vec(AB), avec α non nul, les droites (AB) et (CD) sont parallèles et CD = |α| × AB (la valeur absolue est illisible dans l'extraction du manuel). En situation : vec(MA) + vec(MB) = 2 vec(MI), vec(GA) + vec(GB) + vec(GC) = 0, somme de deux forces.
- Outils autorisés : ce chapitre, les chapitres 1 à 4 (angles, théorème de Thalès et droite des milieux, rapports trigonométriques d'un angle aigu, Pythagore, vecteurs et translations) et les acquis du collège (parallélogramme, centre de gravité situé aux deux tiers de chaque médiane à partir du sommet). Pas de coordonnées (chapitre 6).
- Notation : vec(AB) est le vecteur AB et AB la distance ; u, v, w désignent des vecteurs ; 0 est le vecteur nul ; « l'angle WAN » est l'angle géométrique de sommet A, mesuré en degrés.
- Toutes les affirmations des corrigés sont vérifiées par `check_ch05.py` (chaque figure est placée dans un repère à l'intérieur du script ; calcul exact en fractions, valeurs approchées en flottants).

---

## Exercice 1 — Relation de Chasles, règle du parallélogramme, centre de gravité

ABC est un triangle. On note I le milieu de [BC] et J le milieu de [AC].

1. a) Construire le point D tel que vec(AD) = vec(AB) + vec(AC). Quelle est la nature du quadrilatère ABDC ?
   b) Montrer que I est le milieu de [AD]. En déduire que vec(AB) + vec(AC) = 2 vec(AI).
2. Construire le point E tel que vec(BE) = vec(BA) + vec(BC).
   a) Montrer que vec(CE) = vec(BA) et que vec(CD) = vec(AB).
   b) En déduire que vec(CD) + vec(CE) = 0, puis que C est le milieu de [DE].
3. a) Montrer que vec(ED) = 2 vec(AB).
   b) Que peut-on en déduire pour les droites (AB) et (ED) ? Comparer les distances ED et AB. Quelle est la nature du quadrilatère ABDE ?
4. On note G le centre de gravité du triangle ABC.
   a) Exprimer vec(AG) en fonction de vec(AI), puis en fonction de vec(AD).
   b) Montrer que vec(GB) + vec(GC) = 2 vec(GI).
   c) On note G' le symétrique de G par rapport à I. Montrer que G est le milieu de [AG']. En déduire que vec(GA) + vec(GB) + vec(GC) = 0.
5. a) Montrer que J est le milieu de [BE].
   b) En déduire que vec(BG) = (1/3) vec(BE). Que peut-on dire des points B, G et E ?

### Corrigé

**1. a)** Les points A, B, C ne sont pas alignés et vec(AD) = vec(AB) + vec(AC). D'après la règle du parallélogramme, ABDC est un parallélogramme.
Construction : D est le point d'intersection de la parallèle à (AC) passant par B et de la parallèle à (AB) passant par C.

**b)** Les diagonales [AD] et [BC] du parallélogramme ABDC ont le même milieu. Comme I est le milieu de [BC], I est aussi le milieu de [AD].
I milieu de [AD] équivaut à vec(AD) = 2 vec(AI). Donc vec(AB) + vec(AC) = vec(AD) = 2 vec(AI).

**2.** Les points B, A, C ne sont pas alignés et vec(BE) = vec(BA) + vec(BC) : d'après la règle du parallélogramme, BAEC est un parallélogramme. (E est le point d'intersection de la parallèle à (BC) passant par A et de la parallèle à (BA) passant par C.)

**a)** Dans le parallélogramme BAEC, les côtés [BA] et [CE] sont opposés : vec(CE) = vec(BA).
Dans le parallélogramme ABDC, les côtés [AB] et [CD] sont opposés : vec(CD) = vec(AB).

**b)** D'après la relation de Chasles :

    vec(CD) + vec(CE) = vec(AB) + vec(BA) = vec(AA) = 0

Or vec(CD) + vec(CE) = 0 équivaut à : C est le milieu de [DE].

**3. a)** Le vecteur vec(EC) est l'opposé de vec(CE) = vec(BA), donc vec(EC) = vec(AB). D'après la relation de Chasles :

    vec(ED) = vec(EC) + vec(CD) = vec(AB) + vec(AB) = 2 vec(AB)

**b)** vec(ED) = 2 vec(AB) : les vecteurs vec(ED) et vec(AB) sont colinéaires et de même sens (2 > 0). Donc les droites (AB) et (ED) sont parallèles, et ED = 2 × AB.
Ces deux droites sont distinctes (sinon D serait sur (AB), et vec(BD) = vec(AC) serait porté par (AB), ce qui est faux). Le quadrilatère ABDE a deux côtés opposés [AB] et [DE] parallèles et de longueurs différentes : c'est un trapèze de bases [AB] et [DE] (ce n'est pas un parallélogramme).

**4. a)** Le centre de gravité G est sur la médiane [AI], aux deux tiers à partir de A : vec(AG) = (2/3) vec(AI).
Comme vec(AI) = (1/2) vec(AD) (question 1. b)), le point G est sur [AD] avec AG = (2/3) × (1/2) × AD = (1/3) × AD, donc vec(AG) = (1/3) vec(AD).

**b)** D'après la relation de Chasles, vec(GB) = vec(GI) + vec(IB) et vec(GC) = vec(GI) + vec(IC). Donc

    vec(GB) + vec(GC) = vec(GI) + vec(GI) + vec(IB) + vec(IC) = 2 vec(GI) + 0 = 2 vec(GI)

car I est le milieu de [BC], donc vec(IB) + vec(IC) = 0.

**c)** I est le milieu de [GG'], donc vec(GG') = 2 vec(GI) = vec(GB) + vec(GC) (question 4. b)).
Sur la médiane [AI] : AG = (2/3) AI et GI = (1/3) AI, donc GG' = 2 GI = (2/3) AI = AG. Les points A et G' sont sur la droite (AI), de part et d'autre de G (G' est au-delà de I). Donc G est le milieu de [AG'], c'est-à-dire vec(GA) + vec(GG') = 0.
Finalement :

    vec(GA) + vec(GB) + vec(GC) = vec(GA) + vec(GG') = 0

**5. a)** BAEC est un parallélogramme : ses diagonales [BE] et [AC] ont le même milieu. Comme J est le milieu de [AC], J est aussi le milieu de [BE].

**b)** G est sur la médiane [BJ], aux deux tiers à partir de B : BG = (2/3) BJ. Comme J est le milieu de [BE], BJ = (1/2) BE, donc G est sur [BE] avec BG = (2/3) × (1/2) × BE = (1/3) BE. Ainsi vec(BG) = (1/3) vec(BE).
Les vecteurs vec(BG) et vec(BE) sont colinéaires : les points B, G et E sont alignés (G est sur le segment [BE], au tiers à partir de B).

---

## Exercice 2 — Problème : traverser une rivière en barque

Une rivière a deux rives rectilignes et parallèles d et d', distantes de 120 m. Une barque part du point A de la rive d. On note H le point de d' tel que la droite (AH) soit perpendiculaire à d (H est « en face » de A).
On admet que :

- en une minute, le moteur seul déplacerait la barque de 60 m perpendiculairement aux rives, de d vers d' ; ce déplacement est représenté par un vecteur u ;
- en une minute, le courant seul déplacerait la barque de 45 m parallèlement aux rives ; ce déplacement est représenté par un vecteur v ;
- le déplacement réel de la barque en une minute est représenté par le vecteur u + v, et il est le même pendant chaque minute.

1. On note P et Q les points tels que vec(AP) = u et vec(AQ) = v, et M1 la position de la barque au bout d'une minute : vec(AM1) = u + v.
   a) Construire M1. Quelle est la nature du quadrilatère APM1Q ?
   b) Calculer la distance AM1.
2. On note M2 la position de la barque au bout de deux minutes : vec(M1M2) = u + v.
   a) Montrer que vec(AM2) = 2 vec(AM1). En déduire que A, M1 et M2 sont alignés et que M1 est le milieu de [AM2].
   b) Vérifier que P est le milieu de [AH]. À l'aide de la relation de Chasles, montrer que vec(HM2) = 2 v. En déduire que M2 est sur la rive d', puis calculer HM2 et AM2.
   c) Calculer une mesure de l'angle HAM2, au dixième de degré près.
3. Le pilote veut maintenant arriver exactement en H. Il oriente le moteur autrement : en une minute, le moteur seul déplace toujours la barque de 60 m, mais dans une direction qu'il choisit, représentée par un vecteur w ; le courant ne change pas. On note W le point tel que vec(AW) = w, et N l'image de W par la translation de vecteur v.
   a) Montrer que vec(AN) = w + v.
   b) La barque va en ligne droite vers H lorsque N est sur la demi-droite [AH). On suppose qu'il en est ainsi. Montrer que le triangle ANW est rectangle en N, puis calculer AN (valeur exacte, puis valeur approchée à 0.1 près).
   c) Calculer une mesure de l'angle WAN au dixième de degré près. De quel côté de la droite (AH) faut-il orienter le moteur ?
   d) On admet que la barque avance régulièrement sur [AH], de AN mètres par minute. Combien de temps dure cette traversée ? Donner la valeur exacte en minutes, puis une valeur approchée à la seconde près.
4. Comparer les deux traversées : durée, longueur parcourue et point d'arrivée.

### Corrigé

**1. a)** Les points A, P, Q ne sont pas alignés et vec(AM1) = vec(AP) + vec(AQ) : d'après la règle du parallélogramme, APM1Q est un parallélogramme. Son angle en A est droit (u est perpendiculaire aux rives, v leur est parallèle) : APM1Q est un rectangle.
Construction : M1 est le point d'intersection de la parallèle à d passant par P et de la perpendiculaire à d passant par Q.

**b)** Le triangle APM1 est rectangle en P, avec AP = 60 et PM1 = AQ = 45. D'après le théorème de Pythagore :

    AM1² = 60² + 45² = 3600 + 2025 = 5625,   donc AM1 = 75 m

**2. a)** D'après la relation de Chasles, vec(AM2) = vec(AM1) + vec(M1M2) = vec(AM1) + vec(AM1) = 2 vec(AM1).
Les vecteurs vec(AM2) et vec(AM1) sont colinéaires : A, M1, M2 sont alignés. De plus vec(AM2) = 2 vec(AM1) équivaut à : M1 est le milieu de [AM2].

**b)** P est sur la perpendiculaire à d passant par A, c'est-à-dire sur (AH), du côté de d', avec AP = 60 = 120 / 2 = AH / 2 : P est le milieu de [AH].
D'après la relation de Chasles, vec(HM2) = vec(HP) + vec(PM1) + vec(M1M2). Or vec(HP) = vec(PA) (P est le milieu de [AH]) et vec(M1M2) = vec(AM1) (les deux sont égaux à u + v), donc vec(HP) + vec(M1M2) = vec(PA) + vec(AM1) = vec(PM1). Ainsi vec(HM2) = vec(PM1) + vec(PM1) = 2 vec(PM1).
Or vec(PM1) = vec(AQ) = v (rectangle APM1Q). Donc vec(HM2) = 2 v.
Le vecteur v est parallèle aux rives : la droite (HM2) est la parallèle à d passant par H, c'est-à-dire la rive d'. Donc M2 est sur d' : au bout de deux minutes, la barque accoste.
HM2 = 2 × 45 = 90 m et AM2 = 2 × AM1 = 150 m.

**c)** Le triangle AHM2 est rectangle en H : tan(angle HAM2) = HM2 / AH = 90 / 120 = 0.75, d'où angle HAM2 ≈ 36.9°.

**3. a)** N est l'image de W par la translation de vecteur v, donc vec(WN) = v. D'après la relation de Chasles :

    vec(AN) = vec(AW) + vec(WN) = w + v

**b)** La droite (WN) est parallèle aux rives (car vec(WN) = v), et la droite (AN) = (AH) est perpendiculaire aux rives. Donc (WN) est perpendiculaire à (AN) : le triangle ANW est rectangle en N.
On a AW = 60 (longueur de w) et WN = 45 (longueur de v). D'après le théorème de Pythagore :

    AN² = AW² − WN² = 3600 − 2025 = 1575,   donc AN = √1575 = 15√7 ≈ 39.7 m

**c)** Dans le triangle ANW rectangle en N : sin(angle WAN) = WN / AW = 45 / 60 = 0.75, d'où angle WAN ≈ 48.6°.
Comme vec(NW) est l'opposé de v, le point W est du côté de (AH) opposé à celui vers lequel pousse le courant : il faut orienter le moteur vers l'amont, en faisant un angle d'environ 48.6° avec (AH).

**d)** La barque doit parcourir AH = 120 m à raison de 15√7 m par minute. La durée est :

    120 / (15√7) = 8 / √7 = 8√7 / 7 ≈ 3.02 min

soit environ 3 min 1 s.

**4.**

- Première traversée (moteur perpendiculaire aux rives) : 2 minutes, 150 m parcourus, arrivée en M2, à 90 m de H vers l'aval.
- Deuxième traversée (moteur orienté vers l'amont) : environ 3 min 1 s, 120 m parcourus, arrivée exactement en H.

La deuxième traversée est plus courte en distance mais plus longue en temps : une partie de l'effort du moteur sert à compenser le courant.
