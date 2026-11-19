# 1ère année — Chapitre 11 : Activités algébriques

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (1ère année secondaire), p. 9, activités algébriques : identités remarquables ; additionner, soustraire et multiplier des expressions algébriques ; calculer la valeur numérique d'une expression littérale ; développer, factoriser et simplifier des expressions en utilisant les produits remarquables ; résoudre des problèmes d'optimisation en modélisant des situations réelles.
- Manuel CNP (partie 2, p. 169–184) : expressions littérales tirées de situations (pourcentages, volumes) ; valeur numérique exacte, approchée ou arrondie ; distributivité (a + b)(c + d) = ac + ad + bc + bd ; identités remarquables (a + b)², (a − b)², a² − b² = (a − b)(a + b), (a + b)³, (a − b)³, a³ − b³ = (a − b)(a² + ab + b²), a³ + b³ = (a + b)(a² − ab + b²) ; factoriser, c'est transformer une somme ou une différence en produit ; égalité de deux expressions (on ne modifie pas une égalité en ajoutant un même terme à ses deux membres, ni en les multipliant par un même nombre non nul) ; calcul mental ; recherche des valeurs qui annulent une expression (activité 16) ; situations de mesure de grandeurs.
- La règle « un produit est nul si et seulement si l'un de ses facteurs est nul » n'est énoncée qu'au chapitre 13 : le corrigé de l'exercice 1 (question 2) la remplace par un raisonnement direct avec la règle des signes du chapitre 10. Aucune théorie du second degré n'est utilisée.
- Outils autorisés : ce chapitre, les chapitres 9 et 10 (racines carrées, règles de signe et de comparaison, arrondi) et les acquis du collège (aire du carré et du rectangle, volume du pavé droit, 1 L = 1000 cm³). Pas de fonctions (chapitres 12 et 14), pas d'équations ni d'inéquations comme objet d'étude (chapitre 13).
- Notation : E(x) est la valeur de l'expression E pour le réel x ; × désigne le produit de deux nombres ; ]0, 10[ est l'intervalle ouvert.
- Toutes les valeurs et identités sont vérifiées par `check_ch11.py` (calcul exact en fractions, identités comparées coefficient par coefficient et sur de nombreux rationnels).

---

## Exercice 1 — Développer, factoriser, choisir la bonne forme

On considère, pour tout réel x, l'expression

    E(x) = (2x − 3)² − (x + 1)²

1. a) Développer et réduire E(x).
   b) Factoriser E(x).
2. a) En choisissant à chaque fois la forme de E(x) la mieux adaptée, calculer E(0), E(−1), E(4) et E(√2).
   b) Déterminer tous les réels x tels que E(x) = 0.
   c) Déterminer tous les réels x tels que E(x) = 8.
3. Factoriser les expressions suivantes :

       F(x) = 25x² − 10x + 1          G(x) = (x − 1)(2x + 3) − (x − 1)²
       H(x) = 8x³ − 27                K(x) = x³ + 6x² + 12x + 8

4. a) Montrer que pour tout réel x :

       (x + 1)³ − (x − 1)³ = 6x² + 2

   b) En déduire, sans calculatrice, les nombres 21³ − 19³ et 1001³ − 999³.
5. À l'aide d'identités remarquables, calculer sans calculatrice 1002², 998² et 1002 × 998.

### Corrigé

**1. a)** (2x − 3)² = 4x² − 12x + 9 et (x + 1)² = x² + 2x + 1. Donc

    E(x) = 4x² − 12x + 9 − x² − 2x − 1 = 3x² − 14x + 8

**b)** E(x) est de la forme a² − b² = (a − b)(a + b), avec a = 2x − 3 et b = x + 1 :

    E(x) = [(2x − 3) − (x + 1)] × [(2x − 3) + (x + 1)] = (x − 4)(3x − 2)

Contrôle : (x − 4)(3x − 2) = 3x² − 2x − 12x + 8 = 3x² − 14x + 8.

**2. a)**

- E(0) : avec la forme développée, E(0) = 8.
- E(−1) : avec la forme de départ, E(−1) = (−5)² − 0² = 25.
- E(4) : avec la forme factorisée, E(4) = 0 × 10 = 0.
- E(√2) : avec la forme développée, E(√2) = 3 × 2 − 14√2 + 8 = 14 − 14√2.

**b)** On utilise la forme factorisée E(x) = (x − 4)(3x − 2).

- Si x = 4, le facteur x − 4 est nul, donc E(4) = 0. Si x = 2/3, alors 3x − 2 = 2 − 2 = 0, donc E(2/3) = 0.
- Si x ≠ 4 et x ≠ 2/3 : x − 4 ≠ 0, et 3x − 2 ≠ 0 (car 3x − 2 = 0 donnerait 3x = 2, soit x = 2/3). Le produit de deux réels non nuls est strictement positif s'ils sont de même signe et strictement négatif sinon : il n'est pas nul. Donc E(x) ≠ 0.

Les réels x tels que E(x) = 0 sont 4 et 2/3.

**c)** On ne modifie pas une égalité en retranchant 8 à ses deux membres :

    E(x) = 8  ⟺  3x² − 14x + 8 − 8 = 0  ⟺  3x² − 14x = 0  ⟺  x(3x − 14) = 0

Comme au b), le produit x(3x − 14) est nul si x = 0 ou si 3x − 14 = 0, c'est-à-dire x = 14/3, et il n'est pas nul dans les autres cas.
Les réels x tels que E(x) = 8 sont 0 et 14/3. (Contrôle : E(14/3) = 3 × 196/9 − 14 × 14/3 + 8 = 196/3 − 196/3 + 8 = 8.)

**3.**

- F(x) = (5x)² − 2 × 5x × 1 + 1² = (5x − 1)².
- G(x) = (x − 1)[(2x + 3) − (x − 1)] = (x − 1)(x + 4) (facteur commun x − 1).
- H(x) = (2x)³ − 3³ = (2x − 3)[(2x)² + 2x × 3 + 3²] = (2x − 3)(4x² + 6x + 9).
- K(x) = x³ + 3 × x² × 2 + 3 × x × 2² + 2³ = (x + 2)³.

**4. a)** (x + 1)³ = x³ + 3x² + 3x + 1 et (x − 1)³ = x³ − 3x² + 3x − 1. Donc

    (x + 1)³ − (x − 1)³ = x³ + 3x² + 3x + 1 − x³ + 3x² − 3x + 1 = 6x² + 2

**b)** Pour x = 20 : 21³ − 19³ = 6 × 400 + 2 = 2402.
Pour x = 1000 : 1001³ − 999³ = 6 × 1 000 000 + 2 = 6 000 002.

**5.**

- 1002² = (1000 + 2)² = 1 000 000 + 4000 + 4 = 1 004 004.
- 998² = (1000 − 2)² = 1 000 000 − 4000 + 4 = 996 004.
- 1002 × 998 = (1000 + 2)(1000 − 2) = 1 000 000 − 4 = 999 996.

---

## Exercice 2 — La boîte sans couvercle (problème d'optimisation)

Dans une feuille de carton carrée de 20 cm de côté, on découpe aux quatre coins quatre carrés identiques de côté x cm. On relève ensuite les quatre bords pour obtenir une boîte sans couvercle, en forme de pavé droit, dont le fond est un carré.

1. a) Expliquer pourquoi 0 < x < 10. Exprimer en fonction de x le côté du fond et la hauteur de la boîte.
   b) On note S(x) l'aire du carton qui forme la boîte (le fond et les quatre faces latérales). En pensant aux quatre coins retirés, montrer que S(x) = 400 − 4x².
   c) Retrouver S(x) en additionnant l'aire du fond et celles des quatre faces latérales, puis en factorisant : montrer que S(x) = (20 − 2x)(20 + 2x).
   d) Écrire S(x) comme le produit de trois facteurs, dont l'un est un nombre, puis calculer S(2.5) avec cette forme.
2. On note V(x) le volume de la boîte, en cm³.
   a) Montrer que V(x) = x(20 − 2x)², puis que V(x) = 4x(10 − x)².
   b) Développer et réduire V(x).
3. Recopier et compléter le tableau suivant, puis indiquer, parmi ces valeurs entières de x, celle qui donne la boîte de plus grand volume.

       x (cm)      |  1    2    3    4    5    6    7    8    9
       V(x) (cm³)  |

4. a) Calculer la valeur exacte de V(10/3), puis son arrondi au centième.
   b) Montrer que pour tout réel x :

          16000 − 27 V(x) = 4(3x − 10)²(40 − 3x)

   c) En déduire que, pour tout x de ]0, 10[, V(x) ≤ 16000/27. Pour quelle valeur de x le volume de la boîte est-il le plus grand ? Donner les dimensions de cette boîte.
5. Peut-on fabriquer de cette façon une boîte de 0.5 litre ? une boîte de 0.6 litre ? (On rappelle que 1 L = 1000 cm³.)

### Corrigé

**1. a)** x est une longueur, donc x > 0. Le long de chaque côté de 20 cm, on retire deux carrés de côté x : il faut 2x < 20, soit x < 10, pour qu'il reste un fond.
Le fond est un carré de côté 20 − 2x (en cm) et la hauteur de la boîte est x (en cm).

**b)** La feuille a une aire de 20² = 400 cm² et on retire quatre carrés d'aire x² chacun : S(x) = 400 − 4x².

**c)** Le fond a pour aire (20 − 2x)². Chaque face latérale est un rectangle de dimensions 20 − 2x et x, d'aire x(20 − 2x). Donc

    S(x) = (20 − 2x)² + 4x(20 − 2x) = (20 − 2x)[(20 − 2x) + 4x] = (20 − 2x)(20 + 2x)

On retrouve le résultat du b) : (20 − 2x)(20 + 2x) = 20² − (2x)² = 400 − 4x².

**d)** 20 − 2x = 2(10 − x) et 20 + 2x = 2(10 + x), donc S(x) = 4(10 − x)(10 + x).
S(2.5) = 4 × 7.5 × 12.5 = 30 × 12.5 = 375 cm². (Contrôle : 400 − 4 × 6.25 = 375.)

**2. a)** Volume du pavé droit = aire du fond × hauteur : V(x) = (20 − 2x)² × x = x(20 − 2x)².
Comme 20 − 2x = 2(10 − x), (20 − 2x)² = 4(10 − x)², donc V(x) = 4x(10 − x)².

**b)** (20 − 2x)² = 400 − 80x + 4x², donc V(x) = x(400 − 80x + 4x²) = 4x³ − 80x² + 400x.

**3.** Avec la forme V(x) = 4x(10 − x)² (par exemple V(3) = 12 × 49 = 588) :

    x (cm)      |   1     2     3     4     5     6     7     8     9
    V(x) (cm³)  |  324   512   588   576   500   384   252   128    36

Parmi ces valeurs entières, x = 3 cm donne le plus grand volume : 588 cm³.

**4. a)** V(10/3) = 4 × (10/3) × (10 − 10/3)² = (40/3) × (20/3)² = (40/3) × (400/9) = 16000/27.
16000/27 = 592.592…, donc l'arrondi au centième est 592.59 cm³.

**b)** (3x − 10)² = 9x² − 60x + 100, puis

    (9x² − 60x + 100)(40 − 3x) = 360x² − 27x³ − 2400x + 180x² + 4000 − 300x
                               = −27x³ + 540x² − 2700x + 4000

En multipliant par 4 : 4(3x − 10)²(40 − 3x) = −108x³ + 2160x² − 10800x + 16000.
D'autre part 27 V(x) = 27(4x³ − 80x² + 400x) = 108x³ − 2160x² + 10800x, donc 16000 − 27 V(x) = −108x³ + 2160x² − 10800x + 16000. Les deux expressions sont égales pour tout réel x.

**c)** Soit x ∈ ]0, 10[.

- (3x − 10)² ≥ 0, comme tout carré ;
- x < 10 donne 3x < 30, donc 40 − 3x > 10 > 0 ;
- 4 > 0.

Le produit 4(3x − 10)²(40 − 3x) est donc positif ou nul : 16000 − 27 V(x) ≥ 0, soit 27 V(x) ≤ 16000. En multipliant par 1/27, réel positif : V(x) ≤ 16000/27.
Égalité : si x = 10/3, alors 3x − 10 = 0, le produit est nul et V(10/3) = 16000/27 (comme au a)). Si x ≠ 10/3, alors 3x − 10 ≠ 0 et (3x − 10)² = (3x − 10) × (3x − 10) est le produit de deux réels non nuls de même signe, donc strictement positif ; 4 et 40 − 3x sont aussi strictement positifs. Le produit 4(3x − 10)²(40 − 3x) est alors strictement positif, donc V(x) < 16000/27.
Le volume est le plus grand pour x = 10/3 cm (environ 3.33 cm) ; il vaut alors 16000/27 cm³, environ 592.59 cm³. La boîte a un fond carré de côté 20 − 20/3 = 40/3 cm (environ 13.33 cm) et une hauteur de 10/3 cm.

**5.** 0.5 L = 500 cm³. D'après le tableau, V(5) = 500 : avec x = 5 cm, on obtient une boîte de 0.5 L (fond de 10 cm de côté, hauteur 5 cm).
0.6 L = 600 cm³. Or le volume ne dépasse jamais 16000/27 ≈ 592.59 cm³ < 600 cm³ : on ne peut pas fabriquer une boîte de 0.6 L de cette façon.
