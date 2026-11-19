# 1ère année — Chapitre 10 : Activités numériques II

- reviewed: false (à faire relire par un professeur de mathématiques)
- Programme sept. 2005 (1ère année secondaire), p. 8, activités numériques : opérations dans ℝ, ordre dans ℝ, valeur absolue ; simplifier et calculer une expression numérique avec les propriétés des puissances et de la racine carrée d'un nombre positif ; convertir une fraction en pourcentage ; comparer des réels et les placer sur la droite réelle ; valeur approchée, arrondi, estimation d'une expression numérique ; problèmes de proportionnalité.
- Manuel CNP (partie 2, p. 153–168) : priorités des opérations ; règles de calcul sur les fractions ; puissances d'exposant entier relatif (aᵐ × aⁿ = aᵐ⁺ⁿ, (aᵐ)ⁿ = aᵐⁿ, aᵐ/aⁿ = aᵐ⁻ⁿ, (ab)ⁿ = aⁿbⁿ…) ; racines carrées (√(a²) = |a|, √(ab) = √a × √b, √(a/b) = √a/√b, (√a − √b)(√a + √b) = a − b, écriture d'un inverse sans radical au dénominateur) ; signe d'un produit et d'un quotient ; règles de comparaison (a ≤ b ⟺ a − b ≤ 0 ; multiplication par un réel positif ou négatif ; passage aux inverses pour deux réels de même signe ; pour a > 0 et b > 0, a ≥ b entraîne a² ≥ b² et √a ≥ √b ; si 0 ≤ a ≤ 1 alors a² ≤ a ≤ √a ; si a ≥ 1 alors √a ≤ a ≤ a²) ; valeur absolue = distance à 0 ; intervalles et encadrements ; ordre de grandeur : si a × 10ⁿ est la notation scientifique de b, on arrondit a à l'unité ; agrandissement et réduction (« Mobiliser ses compétences », p. 160–161).
- Les formules du « Retenir » (p. 158) sont des images dans la copie du manuel : elles sont reconstituées à partir du texte restant et de l'activité 6. Le manuel traite l'agrandissement sur des triangles ; pour le rectangle de l'exercice 2, l'effet sur le périmètre et l'aire est démontré directement (question 1).
- Outils autorisés : ce chapitre, le chapitre 9 (valeur approchée à 10ᵖ près, arrondi, notation scientifique) et les acquis du collège, dont les identités (a − b)², (a + b)² et (a − b)(a + b) (le « Reprendre » du chapitre 11 les traite comme connues). Pas d'identités du troisième degré (chapitre 11), pas d'équations ni d'inéquations comme objet d'étude (chapitre 13).
- Notation : √ est la racine carrée ; [a, b] est l'intervalle fermé ; a × 10ⁿ est la notation scientifique ; × désigne le produit de deux nombres.
- Toutes les valeurs sont vérifiées par `check_ch10.py` (calcul exact en fractions et en nombres de la forme p + q√3 ou p + q√2, signes décidés exactement).

---

## Exercice 1 — Puissances, racines carrées, ordre, valeur absolue, encadrements

1. a) Calculer

       A = (2⁵ × 3⁻² × 6³) / (4³ × 3)

   b) Donner la notation scientifique, puis un ordre de grandeur, du nombre

       B = (0.00045 × 2.4 × 10⁷) / (0.6 × 10⁻²)

2. a) Écrire C = √75 − 2√12 + √27 sous la forme m√3, où m est un entier.
   b) Calculer (√3 − 1)(√3 + 1). En déduire une écriture de D = 2/(√3 − 1) sans radical au dénominateur.
   c) Comparer 2√3 et 3√2.
3. On pose a = √3 − 1.
   a) Justifier que 1 < √3 < 2, puis que 0 < a < 1.
   b) Montrer que a² = 4 − 2√3.
   c) Ranger dans l'ordre croissant les réels a, a², √a et 1/a, en justifiant.
   d) En déduire que 4 − 2√3 < √3 − 1. Retrouver ce résultat en comparant 5 et 3√3.
4. Écrire sans le symbole de la valeur absolue le réel F = |√3 − 2| + |1 − √3|.
5. On donne l'encadrement 1.732 < √3 < 1.733.
   a) En déduire un encadrement de a, puis un encadrement de a² = 4 − 2√3.
   b) Vérifier que 1/a = (√3 + 1)/2, puis donner un encadrement de 1/a. En déduire une valeur approchée de 1/a à 10⁻³ près, puis l'arrondi de 1/a au centième.
6. Soit x un réel tel que −1 ≤ 2x − 3 ≤ 1/2.
   a) Montrer que x appartient à l'intervalle [1, 7/4]. Représenter cet intervalle sur une droite graduée.
   b) Donner un encadrement de 5 − 2x.
   c) Écrire |x − 2| sans le symbole de la valeur absolue, puis en donner un encadrement.

### Corrigé

**1. a)** 6³ = 2³ × 3³ et 4³ = (2²)³ = 2⁶. Donc

    A = (2⁵ × 2³ × 3⁻² × 3³) / (2⁶ × 3) = (2⁸ × 3) / (2⁶ × 3) = 2² = 4

**b)** Numérateur : 0.00045 × 2.4 × 10⁷ = 4.5 × 10⁻⁴ × 2.4 × 10⁷ = 10.8 × 10³ = 1.08 × 10⁴.
Dénominateur : 0.6 × 10⁻² = 6 × 10⁻³.

    B = (1.08 / 6) × 10⁴ / 10⁻³ = 0.18 × 10⁷ = 1.8 × 10⁶

La notation scientifique de B est 1.8 × 10⁶. L'arrondi de 1.8 à l'unité est 2 : un ordre de grandeur de B est 2 × 10⁶.

**2. a)** √75 = √(25 × 3) = 5√3, √12 = √(4 × 3) = 2√3 et √27 = √(9 × 3) = 3√3. Donc

    C = 5√3 − 2 × 2√3 + 3√3 = (5 − 4 + 3)√3 = 4√3

**b)** (√3 − 1)(√3 + 1) = (√3)² − 1² = 3 − 1 = 2.
On multiplie le numérateur et le dénominateur de D par √3 + 1 :

    D = 2(√3 + 1) / ((√3 − 1)(√3 + 1)) = 2(√3 + 1) / 2 = √3 + 1

**c)** 2√3 = √4 × √3 = √12 et 3√2 = √9 × √2 = √18. Comme 0 < 12 < 18, on a √12 < √18. Donc 2√3 < 3√2.

**3. a)** 1 < 3 < 4 et ces nombres sont positifs, donc √1 < √3 < √4, soit 1 < √3 < 2.
En retranchant 1 : 0 < √3 − 1 < 1, soit 0 < a < 1.

**b)** a² = (√3 − 1)² = (√3)² − 2√3 + 1 = 3 − 2√3 + 1 = 4 − 2√3.

**c)**

- a − a² = a(1 − a) : c'est le produit de deux réels strictement positifs (a > 0 et 1 − a > 0), donc a − a² > 0, soit a² < a.
- a = (√a)² et 0 < √a < 1 (car 0 < a < 1 donne √a < √1 = 1). En appliquant le point précédent au réel √a : (√a)² < √a, soit a < √a.
- 0 < a < 1 : a et 1 sont strictement positifs, donc en passant aux inverses 1/a > 1/1 = 1.

Comme √a < 1 < 1/a, on obtient :

    a² < a < √a < 1/a

**d)** D'après le c), a² < a, c'est-à-dire 4 − 2√3 < √3 − 1.
Autre méthode : (√3 − 1) − (4 − 2√3) = 3√3 − 5. Or 3√3 = √27, 5 = √25 et 25 < 27, donc 5 < 3√3. Ainsi (√3 − 1) − (4 − 2√3) > 0, et on retrouve 4 − 2√3 < √3 − 1.

**4.**

- √3 < 2, donc √3 − 2 < 0 et |√3 − 2| = −(√3 − 2) = 2 − √3.
- √3 > 1, donc 1 − √3 < 0 et |1 − √3| = −(1 − √3) = √3 − 1.

F = 2 − √3 + √3 − 1 = 1.

**5. a)** En retranchant 1 : 0.732 < a < 0.733.
En multipliant par −2 (réel négatif, l'ordre change) : −3.466 < −2√3 < −3.464. En ajoutant 4 :

    0.534 < a² < 0.536

**b)** a × (√3 + 1)/2 = (√3 − 1)(√3 + 1)/2 = 2/2 = 1, donc 1/a = (√3 + 1)/2 (c'est aussi D/2).
De 1.732 < √3 < 1.733 on tire 2.732 < √3 + 1 < 2.733, puis en divisant par 2 :

    1.366 < 1/a < 1.3665

On a 1.366 − 0.001 = 1.365 ≤ 1/a ≤ 1.367 = 1.366 + 0.001 : 1.366 est une valeur approchée de 1/a à 10⁻³ près.
D'après l'encadrement, l'écriture décimale de 1/a commence par 1.366… : on garde 1.36 et le chiffre suivant est 6, donc l'arrondi de 1/a au centième est 1.37.

**6. a)** On ajoute 3 aux trois membres : 2 ≤ 2x ≤ 7/2. On multiplie par 1/2, réel positif : 1 ≤ x ≤ 7/4. Donc x ∈ [1, 7/4].
Sur la droite graduée, c'est le segment qui joint le point d'abscisse 1 au point d'abscisse 7/4 = 1.75, les deux extrémités comprises (crochets tournés vers le segment).

**b)** On multiplie 1 ≤ x ≤ 7/4 par −2 (l'ordre change) : −7/2 ≤ −2x ≤ −2. On ajoute 5 :

    3/2 ≤ 5 − 2x ≤ 3

**c)** x ≤ 7/4 < 2, donc x − 2 < 0 et |x − 2| = −(x − 2) = 2 − x.
De 1 ≤ x ≤ 7/4 on tire −7/4 ≤ −x ≤ −1, puis en ajoutant 2 :

    1/4 ≤ |x − 2| ≤ 1

---

## Exercice 2 — Agrandir et réduire une photo

Une photo rectangulaire mesure 10 cm de large et 15 cm de long. Agrandir (si k > 1) ou réduire (si 0 < k < 1) la photo dans le rapport k, c'est multiplier sa largeur et sa longueur par k.

1. Montrer qu'après un agrandissement ou une réduction de rapport k, le périmètre de la photo est multiplié par k et son aire est multipliée par k².
2. On agrandit la photo dans le rapport k = 1.6.
   a) Calculer les dimensions, le périmètre et l'aire de la photo agrandie.
   b) De quel pourcentage l'aire a-t-elle augmenté ?
3. On agrandit la photo pour obtenir un poster dont l'aire est le double de celle de la photo.
   a) Montrer que le rapport d'agrandissement est k = √2. Donner les dimensions exactes et le périmètre exact du poster.
   b) On donne 1.414 < √2 < 1.415. Donner un encadrement de la largeur, de la longueur et du périmètre du poster. En déduire une valeur approchée du périmètre à 10⁻¹ près.
4. Un cadre a une ouverture rectangulaire de 14.2 cm sur 21.22 cm. On veut savoir si le poster peut y être placé (largeur contre largeur, longueur contre longueur).
   a) L'encadrement du 3. b) permet-il de conclure pour la largeur ? pour la longueur ?
   b) Calculer (15√2)² et 21.22². Conclure.
5. On réduit maintenant la photo pour obtenir une vignette de 4 cm de long.
   a) Quel est le rapport de réduction ? Calculer la largeur et l'aire exactes de la vignette, puis leurs arrondis au centième.
   b) Quelle fraction de l'aire de la photo l'aire de la vignette représente-t-elle ? Donner l'arrondi au centième du pourcentage correspondant.
6. La photo a été imprimée à partir d'un fichier de 2400 × 3600 pixels (2400 dans la largeur, 3600 dans la longueur). Chaque pixel occupe 3 octets.
   a) Calculer le nombre d'octets du fichier. Donner sa notation scientifique et son ordre de grandeur.
   b) Sur la photo de 10 cm sur 15 cm, chaque pixel est un petit carré. Calculer la valeur exacte de son côté c (en cm), puis donner l'arrondi de c au cent-millième et l'écrire en notation scientifique.

### Corrigé

**1.** La photo agrandie ou réduite mesure 10k sur 15k (en cm).
Périmètre : 2(10k + 15k) = 50k = k × 50, et le périmètre initial est 2(10 + 15) = 50 : il est multiplié par k.
Aire : 10k × 15k = 150k² = k² × 150, et l'aire initiale est 10 × 15 = 150 : elle est multipliée par k².

**2. a)** Dimensions : 10 × 1.6 = 16 cm et 15 × 1.6 = 24 cm.
Périmètre : 2(16 + 24) = 80 cm (= 1.6 × 50). Aire : 16 × 24 = 384 cm² (= 1.6² × 150 = 2.56 × 150).

**b)** (384 − 150)/150 = 234/150 = 1.56 : l'aire a augmenté de 156 %.

**3. a)** L'aire du poster est 150k² et elle doit valoir 2 × 150 = 300. Donc k² = 2. Comme k > 0, k = √(k²) = √2.
Dimensions : 10√2 cm et 15√2 cm. Périmètre : 50√2 cm. (Contrôle de l'aire : 10√2 × 15√2 = 150 × 2 = 300.)

**b)** En multipliant 1.414 < √2 < 1.415 par 10, 15 et 50 (réels positifs) :

    14.14 < 10√2 < 14.15
    21.21 < 15√2 < 21.225
    70.7  < 50√2 < 70.75

On a 70.6 ≤ 50√2 ≤ 70.8 : 70.7 est une valeur approchée du périmètre à 10⁻¹ près (en cm).

**4. a)** Largeur : 10√2 < 14.15 < 14.2, donc la largeur du poster est inférieure à celle de l'ouverture.
Longueur : on sait seulement que 21.21 < 15√2 < 21.225. Or 21.22 est lui aussi compris entre 21.21 et 21.225 : l'encadrement ne permet pas de savoir si 15√2 est plus petit ou plus grand que 21.22.

**b)** (15√2)² = 225 × 2 = 450 et 21.22² = 450.2884.
15√2 et 21.22 sont positifs et 450 < 450.2884, donc √450 < √450.2884, c'est-à-dire 15√2 < 21.22.
Le poster entre dans le cadre (pour la longueur, il reste moins d'un dixième de millimètre : 15√2 ≈ 21.2132).

**5. a)** La longueur passe de 15 cm à 4 cm : le rapport de réduction est k = 4/15.
Largeur : 10 × 4/15 = 8/3 cm, soit environ 2.67 cm.
Aire : 4 × 8/3 = 32/3 cm², soit environ 10.67 cm² (contrôle : 150 × (4/15)² = 150 × 16/225 = 32/3).

**b)** D'après le 1., l'aire est multipliée par k² = 16/225 : l'aire de la vignette représente les 16/225 de l'aire de la photo.
16/225 = 0.07111…, soit environ 7.11 %.

**6. a)** Nombre de pixels : 2400 × 3600 = 8 640 000. Nombre d'octets : 8 640 000 × 3 = 25 920 000.
Notation scientifique : 2.592 × 10⁷ octets. L'arrondi de 2.592 à l'unité est 3 : un ordre de grandeur est 3 × 10⁷ octets.

**b)** Dans la longueur, 3600 pixels occupent 15 cm : c = 15/3600 = 1/240 cm. (Dans la largeur : 10/2400 = 1/240 cm aussi, ce qui confirme que les pixels sont des carrés.)
1/240 = 0.0041666… Au cent-millième, on garde 0.00416 ; le chiffre suivant est 6, donc on ajoute 1 : l'arrondi de c au cent-millième est 0.00417 cm, soit 4.17 × 10⁻³ cm en notation scientifique.
