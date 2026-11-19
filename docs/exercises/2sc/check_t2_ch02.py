"""Checks every value and claim used in exercises T2 ch2 (Suites geometriques), 2eme Sciences.

Sequences are built by iterating their definition (U_{n+1} = q U_n, or the given recurrence /
the year-by-year banking rule) and compared with the closed forms, sums and roundings written in
the corrige. Sums are also added term by term; thresholds are found by scanning n.
"""
from fractions import Fraction as F
import math, os, random

random.seed(3)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def is_geom(terms):
    """non-zero terms with a constant ratio"""
    if any(t == 0 for t in terms):
        return False
    q = terms[1] / terms[0]
    return all(terms[i + 1] == q * terms[i] for i in range(len(terms) - 1))

def geo_sum(first, q, count):
    return first * (1 - q ** count) / (1 - q)

def r3(x):
    """round a Fraction to 0.001 (half up), as a Fraction"""
    return F(math.floor(x * 1000 + F(1, 2)), 1000)

# ================= Exercice 1 =================
# 1. a) a_n = 3 * 2^(n+1)
a = [F(3 * 2 ** (n + 1)) for n in range(60)]
check(is_geom(a) and a[0] == 6 and a[1] / a[0] == 2, "a_n geometrique, a0 = 6, q = 2")
# 1. b) b_n = 2^n / 3^(n-1) = 3 (2/3)^n
b = [F(2 ** n) / F(3) ** (n - 1) for n in range(60)]
check(all(b[n] == 3 * F(2, 3) ** n for n in range(60)), "b_n = 3 (2/3)^n")
check(is_geom(b) and b[0] == 3 and b[1] / b[0] == F(2, 3), "b_n geometrique, b0 = 3, q = 2/3")
# 1. c) c_n = n^2 + 1
c = [F(n * n + 1) for n in range(10)]
check(c[:3] == [1, 2, 5] and c[1] / c[0] == 2 and 2 * c[1] == 4 != c[2] and not is_geom(c[:3]), "c_n pas geometrique")
# 1. d) d0 = 4, 2 d_{n+1} + d_n = 0
d = [F(4)]
for n in range(30):
    d.append(-d[-1] / 2)
check(all(2 * d[n + 1] + d[n] == 0 for n in range(30)), "relation 2d_{n+1} + d_n = 0")
check(is_geom(d) and d[1] / d[0] == F(-1, 2) and d[1:4] == [-2, 1, F(-1, 2)], "d_n geometrique, q = -1/2, d1..d3")

# 2. U3 = 54, U6 = 1458
check(F(1458, 54) == 27, "q^3 = 27")
for q in [F(random.randint(-90, 90), random.randint(1, 9)) for _ in range(300)]:
    check((q - 3) * (q * q + 3 * q + 9) == q ** 3 - 27, "factorisation q^3 - 27")
check(3 * 3 - 4 * 1 * 9 == -27, "discriminant de q^2 + 3q + 9 = -27 < 0")
real_roots = [x / 100 for x in range(-1000, 1001) if abs((x / 100) ** 3 - 27) < 1e-9]
check(real_roots == [3.0], "seule racine reelle de q^3 = 27 sur la grille : 3")
q = F(3); U0 = F(54) / q ** 3
check(U0 == 2, "U0 = 2")
U = [U0]
for n in range(40):
    U.append(q * U[-1])
check(U[3] == 54 and U[6] == 1458, "U3, U6 retrouves")
check(all(U[n] == 2 * 3 ** n for n in range(41)), "U_n = 2 * 3^n")
chain = [19683]
while chain[-1] % 3 == 0:
    chain.append(chain[-1] // 3)
check(chain == [19683, 6561, 2187, 729, 243, 81, 27, 9, 3, 1] and len(chain) - 1 == 9, "19683 = 3^9 (9 divisions)")
check(U.index(39366) == 9, "39366 = U9")
check(4000 not in U and all(3 ** n % 2 == 1 for n in range(41)) and 2000 % 2 == 0, "4000 pas un terme (3^n impair)")
S = sum(U[0:8]); S2 = sum(U[4:10])
check(S == 6560 == geo_sum(F(2), q, 8) and 3 ** 8 == 6561, "S = 6560")
check(U[4] == 162 and len(U[4:10]) == 6 and S2 == 58968 == geo_sum(F(162), q, 6), "S' = 58968")
check(F(162 * 728, 2) == 58968 and 162 * 364 == 58968 and 3 ** 6 - 1 == 728, "details S'")
check((3 ** 10 - 1) - (3 ** 4 - 1) == 58968 and 3 ** 10 == 59049, "controle S'")

# 3. V2 = 20, V4 = 5
check(F(5, 20) == F(1, 4), "q^2 = 1/4")
qs = [F(k, 8) for k in range(-80, 81) if F(k, 8) ** 2 == F(1, 4)]
check(qs == [F(-1, 2), F(1, 2)], "q = -1/2 ou 1/2")
sums = {}
for qq in qs:
    V0 = F(20) / qq ** 2
    V = [V0]
    for n in range(20):
        V.append(qq * V[-1])
    check(V0 == 80 and V[2] == 20 and V[4] == 5, "V0 = 80, V2 = 20, V4 = 5")
    check(V[7] == 80 * qq ** 7, "V7")
    sums[qq] = (V[7], sum(V[0:8]))
    check(sum(V[0:8]) == geo_sum(V0, qq, 8), "somme par la formule")
check(sums[F(1, 2)] == (F(5, 8), F(159375, 1000)), "q = 1/2 : V7 = 0.625, somme 159.375")
check(sums[F(-1, 2)] == (F(-5, 8), F(53125, 1000)), "q = -1/2 : V7 = -0.625, somme 53.125")
check(160 * F(255, 256) == F(159375, 1000) and F(160, 3) * F(255, 256) == F(53125, 1000), "details sommes")

# 4. a) T = 3 - 6 + 12 - ... + 768
terms = [3]
while terms[-1] != 768:
    terms.append(-2 * terms[-1])
    check(abs(terms[-1]) <= 768, "on atteint bien 768")
check(len(terms) == 9 and terms[:4] == [3, -6, 12, -24] and 768 == 3 * (-2) ** 8, "9 termes")
check(sum(terms) == 513 == geo_sum(F(3), F(-2), 9), "T = 513")
# 4. b) x, x + 6, 4x consecutive geometric terms
cands = [F(k, 4) for k in range(-400, 401)]
geo = [x for x in cands if x != 0 and x + 6 != 0 and (x + 6) / x == 4 * x / (x + 6)]
check(geo == [-2, 6], "x = -2 ou x = 6 (scan)")
check([x for x in cands if (x + 6) ** 2 == 4 * x * x] == [-2, 6], "(x+6)^2 = 4x^2 <=> x in {-2, 6}")
for x in [F(random.randint(-90, 90), random.randint(1, 9)) for _ in range(200)]:
    check((x + 6) ** 2 - 4 * x * x == (6 - x) * (3 * x + 6), "factorisation")
check((6, 12, 24) == (6, 6 + 6, 4 * 6) and 12 == 2 * 6 and 24 == 2 * 12, "x = 6 : raison 2")
check((-2, 4, -8) == (-2, -2 + 6, 4 * -2) and 4 == -2 * -2 and -8 == -2 * 4, "x = -2 : raison -2")

# 5. V with q = 1/2
V = [F(80) / 2 ** n for n in range(40)]
check(V[:5] == [80, 40, 20, 10, 5], "V0..V4")
s01 = (V[1] - V[0]) / 1; s12 = (V[2] - V[1]) / 1
check(s01 == -40 and s12 == -20 and s01 != s12, "A0, A1, A2 non alignes")
check(all((V[n] < F(1, 100)) == (2 ** n > 8000) for n in range(40)), "V_n < 0.01 <=> 2^n > 8000")
check(next(n for n in range(40) if V[n] < F(1, 100)) == 13, "plus petit n : 13")
check(2 ** 12 == 4096 and 2 ** 13 == 8192, "2^12, 2^13")
check(round(float(V[12]), 4) == 0.0195 and round(float(V[13]), 4) == 0.0098, "V12, V13 arrondis")

# ================= Exercice 2 =================
# Partie A : year-by-year simulation
aA = [F(5000)]; bB = [F(5000)]
for n in range(300):
    aA.append(aA[-1] + F(6, 100) * 5000)
    bB.append(bB[-1] + F(5, 100) * bB[-1])
check((aA[1], aA[2], bB[1], bB[2]) == (5300, 5600, 5250, F(55125, 10)), "a1, a2, b1, b2")
check(all(aA[n] == 5000 + 300 * n for n in range(301)), "a_n = 5000 + 300n")
check(all(bB[n] == 5000 * F(105, 100) ** n for n in range(301)), "b_n = 5000 * 1.05^n")
table_a = [5300, 5600, 5900, 6200, 6500, 6800, 7100, 7400, 7700, 8000]
table_b = ["5250", "5512.5", "5788.125", "6077.531", "6381.408", "6700.478", "7035.502", "7387.277", "7756.641", "8144.473"]
check([aA[n] for n in range(1, 11)] == table_a, "tableau a_n")
check([r3(bB[n]) for n in range(1, 11)] == [F(s) for s in table_b], "tableau b_n arrondi au millime")
# no rounding tie in the table (the millime rounding is unambiguous)
check(all((bB[n] * 1000) % 1 != F(1, 2) for n in range(1, 11)), "pas de cas d'egalite d'arrondi")
check(aA[5] > bB[5] and r3(aA[5] - bB[5]) == F("118.592"), "5 ans : A, 118.592 de plus")
check(aA[10] < bB[10] and r3(bB[10] - aA[10]) == F("144.473"), "10 ans : B, 144.473 de plus")
check(next(n for n in range(1, 301) if bB[n] > aA[n]) == 9, "plus petite duree 9 ans")
check(all(aA[n] > bB[n] for n in range(1, 9)) and aA[8] == 7400 and bB[9] > aA[9], "a_n > b_n pour n <= 8")
check(all(bB[n] > 6000 for n in range(4, 301)) and bB[3] < 6000, "b_n > 6000 <=> n >= 4")
check(all((bB[n + 1] - aA[n + 1]) > (bB[n] - aA[n]) for n in range(4, 300)), "ecart croissant pour n >= 4")
check(all(bB[n] > aA[n] for n in range(9, 301)), "B reste meilleure apres 9 ans")

# Partie B : simulate the account year by year
cap = F(0)
deposits = []
for year in range(2026, 2036):
    cap += 600                      # versement du 1er janvier
    deposits.append(year)
    if year < 2035:
        cap *= F(105, 100)          # interets ajoutes a la fin de l'annee
check(len(deposits) == 10, "10 versements")
C_formula = 600 * sum(F(105, 100) ** k for k in range(10))
check(cap == C_formula, "C = 600 (1 + 1.05 + ... + 1.05^9)")
check(all(2035 - (2026 + k) == 9 - k for k in range(10)), "duree 9 - k")
# value of each deposit separately
for k in range(10):
    v = F(600)
    for year in range(2026 + k, 2035):
        v *= F(105, 100)
    check(v == 600 * F(105, 100) ** (9 - k), "valeur du versement k")
check(C_formula == 600 * geo_sum(F(1), F(105, 100), 10) == 12000 * (F(105, 100) ** 10 - 1), "C = 12000 (1.05^10 - 1)")
check(r3(cap) == F("7546.736") and r3(cap - 6000) == F("1546.736"), "C ~ 7546.736, interets ~ 1546.736")
# 5. annual amount for 10000
coef = 20 * (F(105, 100) ** 10 - 1)
check(coef == geo_sum(F(1), F(105, 100), 10), "coefficient = somme geometrique")
check(round(float(coef), 6) == 12.577893, "coefficient ~ 12.577893")
xmin = 10000 / coef
check(r3(xmin) == F("795.046"), "x >= 795.046")
check(795 * coef < 10000 <= 796 * coef, "795 ne suffit pas, 796 suffit")
check(r3(795 * coef) == F("9999.425") and r3(796 * coef) == F("10012.002"), "capitaux avec 795 et 796")

# ================= text hygiene of the exercise file =================
md = os.path.join(os.path.dirname(os.path.abspath(__file__)), "T2_CH02_SUITES_GEOMETRIQUES.md")
txt = open(md, encoding="utf-8").read()
bad = [ch for ch in txt if ch in "    ​‎‏‪‫‬‭‮⁦⁧⁨⁩"]
check(not bad, "pas d'espace insecable ni de caractere bidi")

print(f"all {ok} checks passed")
