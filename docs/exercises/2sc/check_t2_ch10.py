"""Checks every value and claim used in exercises T2 ch10 (Statistiques), 2eme Sciences.

Definitions used:
- manuel CNP 2eme (tome 2, p. 173): Q1 = plus petite valeur x_i telle qu'au moins 25 % de l'effectif
  prennent des valeurs <= Q1 ; Q3 idem avec 75 %.
- mediane (1ere annee, rappelee dans l'enonce): valeur de rang (N+1)/2 si N impair, demi-somme des
  valeurs de rangs N/2 et N/2 + 1 si N pair.
  The data are chosen so that the other usual rules (rank E(pN) + 1, "at least 50 %") agree;
  this is checked below.
- moyenne m = (1/N) sum n_i x_i ; V = (1/N) sum n_i x_i^2 - m^2 ; sigma = sqrt(V) ; centres des
  classes pour une serie continue ; mediane et quartiles d'une serie continue par interpolation
  lineaire (repartition reguliere dans chaque classe).
"""
from fractions import Fraction as F
import math, os

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def expand(values, counts):
    out = []
    for v, c in zip(values, counts):
        out += [F(v)] * c
    return out

def mean(vals, cnts):
    return F(sum(F(v) * c for v, c in zip(vals, cnts)), sum(cnts))

def var(vals, cnts):
    return F(sum(F(v) ** 2 * c for v, c in zip(vals, cnts)), sum(cnts)) - mean(vals, cnts) ** 2

def var_def(vals, cnts):
    m = mean(vals, cnts)
    return F(sum(c * (F(v) - m) ** 2 for v, c in zip(vals, cnts)), sum(cnts))

def quartile_manuel(vals, cnts, p):
    """plus petite valeur x_i telle qu'au moins p de l'effectif est <= x_i"""
    N = sum(cnts); cum = 0
    for v, c in zip(vals, cnts):
        cum += c
        if cum >= p * N:
            return F(v)

def median_1ere(data):
    N = len(data)
    if N % 2 == 1:
        return data[(N + 1) // 2 - 1]
    return (data[N // 2 - 1] + data[N // 2]) / 2

def all_rules(vals, cnts):
    """(Q1, Me, Q3) after checking that the usual rules agree"""
    data = expand(vals, cnts)
    check(data == sorted(data), "valeurs rangees")
    N = len(data)
    x = lambda k: data[k - 1]
    q1 = {quartile_manuel(vals, cnts, F(1, 4)), x(N // 4 + 1), x(math.ceil(F(N, 4)))}
    q3 = {quartile_manuel(vals, cnts, F(3, 4)), x(3 * N // 4 + 1), x(math.ceil(F(3 * N, 4)))}
    me = {median_1ere(data), quartile_manuel(vals, cnts, F(1, 2)), x(N // 2 + 1)}
    check(len(q1) == 1 and len(me) == 1 and len(q3) == 1, "les regles usuelles coincident")
    return q1.pop(), me.pop(), q3.pop()

def pct2(fr):
    """percentage rounded to 0.01 (half up), as Fraction"""
    return F(math.floor(fr * 10000 + F(1, 2)), 100)

# ================= Exercice 1 =================
X = [0, 1, 2, 3, 4, 5, 6, 7]
n = [3, 6, 9, 11, 7, 5, 3, 1]
N = sum(n)
check(N == 45, "N = 45")
check(max(n) == 11 and X[n.index(11)] == 3 and n.count(11) == 1, "mode 3")
check(max(X) - min(X) == 7, "etendue 7")
cum = [sum(n[:i + 1]) for i in range(len(n))]
check(cum == [3, 9, 18, 29, 36, 41, 44, 45], "effectifs cumules")
check([pct2(F(c, N)) for c in cum] == [F(s) for s in ["6.67", "20", "40", "64.44", "80", "91.11", "97.78", "100"]],
      "frequences cumulees en %")
data = expand(X, n)
check(data[23 - 1] == 3 and all(data[k - 1] == 3 for k in range(19, 30)) and data[18 - 1] == 2 and data[30 - 1] == 4,
      "rangs 19 a 29 : valeur 3 ; rang 23")
Q1, Me, Q3 = all_rules(X, n)
check((Q1, Me, Q3) == (2, 3, 4) and Q3 - Q1 == 2, "Q1 = 2, Me = 3, Q3 = 4, EI = 2")
check(F(45, 4) == F(1125, 100) and F(135, 4) == F(3375, 100), "11.25 et 33.75")
check(45 // 4 + 1 == 12 and 3 * 45 // 4 + 1 == 34, "rangs 12 et 34")
check(sum(1 for v in data if v <= 3) == 29 and sum(1 for v in data if v >= 3) == 27 == 45 - 18, "controle mediane")
check(pct2(F(29, 45)) == F("64.44") and F(27, 45) == F(60, 100), "64.44 % et 60 %")
check(sum(1 for v in data if Q1 <= v <= Q3) == 27, "27 eleves entre 2 et 4")
check(Q1 - min(X) == 2 and max(X) - Q3 == 3, "moustache droite plus longue")
check(sum(c * v for v, c in zip(X, n)) == 135 and [c * v for v, c in zip(X, n)] == [0, 6, 18, 33, 28, 25, 18, 7],
      "somme n_i x_i = 135")
m = mean(X, n)
check(m == 3, "moyenne 3")
check([c * v * v for v, c in zip(X, n)] == [0, 6, 36, 99, 112, 125, 108, 49] and sum(c * v * v for v, c in zip(X, n)) == 535,
      "somme n_i x_i^2 = 535")
V = var(X, n)
check(V == F(26, 9) == var_def(X, n) and F(535, 45) == F(107, 9), "V = 26/9 (deux formules)")
check(round(float(V), 3) == 2.889, "V ~ 2.889")
s = math.sqrt(V)
check(round(s, 2) == 1.70, "sigma ~ 1.70")
check(round(3 - s, 2) == 1.30 and round(3 + s, 2) == 4.70, "bornes 1.30 et 4.70")
inside = sum(1 for v in data if 3 - s <= float(v) <= 3 + s)
check(inside == 27 and F(inside, N) == F(60, 100), "60 % dans [m - s, m + s]")
check(sorted({v for v in data if 3 - s <= float(v) <= 3 + s}) == [2, 3, 4], "valeurs 2, 3, 4")

# 4. five more zeros
n2 = [8] + n[1:]
N2 = sum(n2)
check(N2 == 50, "N = 50")
cum2 = [sum(n2[:i + 1]) for i in range(len(n2))]
check(cum2 == [8, 14, 23, 34, 41, 46, 49, 50], "nouveaux effectifs cumules")
m2 = mean(X, n2)
check(m2 == F(27, 10) and (m - m2) / m == F(1, 10), "nouvelle moyenne 2.7 (baisse de 10 %)")
data2 = expand(X, n2)
check(data2[25 - 1] == data2[26 - 1] == 3 and all(data2[k - 1] == 3 for k in range(24, 35)), "rangs 24 a 34 : 3")
Q1b, Meb, Q3b = all_rules(X, n2)
check((Q1b, Meb, Q3b) == (1, 3, 4), "Q1 = 1, Me = 3, Q3 = 4")
check(F(cum2[0], 50) == F(16, 100) and F(cum2[1], 50) == F(28, 100), "16 % et 28 %")
check(F(cum2[3], 50) == F(68, 100) and F(cum2[4], 50) == F(82, 100), "68 % et 82 %")
check(50 // 4 + 1 == 13 and 3 * 50 // 4 + 1 == 38, "rangs 13 et 38")
check(Meb == Me and m2 != m and Q1b < Q1 and Q3b == Q3, "seuls la moyenne et Q1 changent")

# ================= Exercice 2 Partie A : serie continue =================
bounds = [0, 10, 20, 30, 40, 50]
cnt = [4, 20, 32, 16, 8]
NN = sum(cnt)
check(NN == 80, "N = 80")
check(max(cnt) == 32 and cnt.index(32) == 2, "classe modale [20, 30[")
check(F(cnt[3] + cnt[4], NN) == F(30, 100), "30 % au moins 30 min")
centres = [F(bounds[i] + bounds[i + 1], 2) for i in range(5)]
check(centres == [5, 15, 25, 35, 45], "centres")
check([c * x for c, x in zip(cnt, centres)] == [20, 300, 800, 560, 360], "produits n_i x_i")
check(sum(c * x for c, x in zip(cnt, centres)) == 2040, "somme 2040")
mt = mean(centres, cnt)
check(mt == F(51, 2), "moyenne 25.5")
check([c * x * x for c, x in zip(cnt, centres)] == [100, 4500, 20000, 19600, 16200], "produits n_i x_i^2")
check(sum(c * x * x for c, x in zip(cnt, centres)) == 60400 and F(60400, 80) == 755, "somme 60400, /80 = 755")
Vt = var(centres, cnt)
check(Vt == F(10475, 100) == var_def(centres, cnt) and mt ** 2 == F(65025, 100), "V = 104.75")
check(round(math.sqrt(Vt), 2) == 10.23, "sigma ~ 10.23")
cumt = [sum(cnt[:i + 1]) for i in range(5)]
check(cumt == [4, 24, 56, 72, 80], "effectifs cumules")
check([F(c, NN) * 100 for c in cumt] == [5, 30, 70, 90, 100], "frequences cumulees")
poly = [(F(0), F(0))] + [(F(bounds[i + 1]), F(cumt[i], NN)) for i in range(5)]
check(poly == [(0, 0), (10, F(5, 100)), (20, F(30, 100)), (30, F(70, 100)), (40, F(90, 100)), (50, 1)], "points du polygone")

def interp(target_count):
    """classe ou l'effectif cumule atteint target, puis interpolation lineaire"""
    before = 0
    for i, c in enumerate(cnt):
        if before + c >= target_count:
            return bounds[i] + F(bounds[i + 1] - bounds[i]) * (target_count - before) / c, i
        before += c

def read_polygon(y):
    """abscisse du point du polygone des frequences cumulees d'ordonnee y"""
    for (x0, y0), (x1, y1) in zip(poly, poly[1:]):
        if y0 < y <= y1:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)

mm, im = interp(F(NN, 2)); q1, i1 = interp(F(NN, 4)); q3, i3 = interp(F(3 * NN, 4))
check((mm, im) == (25, 2) and (q1, i1) == (18, 1) and (q3, i3) == (F(65, 2), 3), "m = 25, Q1 = 18, Q3 = 32.5 et leurs classes")
check(20 + 10 * F(40 - 24, 56 - 24) == 25, "relation d'interpolation pour m")
check(read_polygon(F(1, 2)) == mm and read_polygon(F(1, 4)) == q1 and read_polygon(F(3, 4)) == q3, "lecture sur le polygone")
check(q3 - q1 == F(29, 2), "ecart interquartile 14.5")
# fraction of students between Q1 and Q3 under the uniform hypothesis
def count_below(t):
    tot = F(0)
    for i, c in enumerate(cnt):
        lo, hi = bounds[i], bounds[i + 1]
        if t >= hi:
            tot += c
        elif t > lo:
            tot += c * F(t - lo, hi - lo)
    return tot
check(count_below(q3) - count_below(q1) == 40, "environ la moitie entre Q1 et Q3")
check(abs(mt - mm) == F(1, 2), "moyenne proche de la mediane")
check(count_below(15) == 14 and F(14, 80) == F(175, 1000), "14 eleves < 15 min (17.5 %)")

# ================= Exercice 2 Partie B : serie chronologique =================
years = list(range(2018, 2026))
prod = [400, 520, 360, 464, 300, 248, 540, 612]
coef = [F(p, 400) for p in prod]
check(coef == [1, F(13, 10), F(9, 10), F(116, 100), F(75, 100), F(62, 100), F(135, 100), F(153, 100)], "coefficients")
idx = [c * 100 for c in coef]
check(idx == [100, 130, 90, 116, 75, 62, 135, 153], "indices exacts")
check(1 - coef[5] == F(38, 100) and coef[7] - 1 == F(53, 100), "-38 % en 2023, +53 % en 2025")
diffs = [prod[i + 1] - prod[i] for i in range(7)]
check([d > 0 for d in diffs] == [True, False, True, False, False, True, True], "sens des variations annuelles")
check(min(prod) == 248 and years[prod.index(248)] == 2023 and max(prod) == 612 and years[prod.index(612)] == 2025,
      "minimum 2023, maximum 2025")
check(sum(prod) == 3444 and F(sum(prod), 8) == F(861, 2), "moyenne 430.5")
check(max(prod) - min(prod) == 364, "etendue 364")
check([y for y, p in zip(years, prod) if p > F(861, 2)] == [2019, 2021, 2024, 2025], "annees au-dessus de la moyenne")
g = F(612, 540)
check(g == F(153, 135) and round(float(g), 4) == 1.1333, "coefficient 2024 -> 2025")
check(round(float((g - 1) * 100), 1) == 13.3 and idx[7] - idx[6] == 18, "+13.3 % (et non 18 %)")
check(F(18, 100) * 400 == 612 - 540, "18 points d'indice = 18 % de la production de 2018")

# ================= text hygiene of the exercise file =================
md = os.path.join(os.path.dirname(os.path.abspath(__file__)), "T2_CH10_STATISTIQUES.md")
txt = open(md, encoding="utf-8").read()
bad = [ch for ch in txt if ch in "    ​‎‏‪‫‬‭‮⁦⁧⁨⁩"]
check(not bad, "pas d'espace insecable ni de caractere bidi")

print(f"all {ok} checks passed")
