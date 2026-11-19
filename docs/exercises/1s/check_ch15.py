"""Checks every value used in CH15_SYSTEMES.md (1ère année, systèmes de deux équations)."""
from fractions import Fraction as F
import itertools, random

random.seed(15)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-300, 300), random.randint(1, 15)) for _ in range(300)]
small = sorted({F(k, d) for d in (1, 2, 4) for k in range(-16 * d, 16 * d + 1)})

def solve(e1, e2):
    """Each equation is (a, b, c) for ax + by = c. Exact solve by Cramer (checker only)."""
    (a, b, c), (a2, b2, c2) = e1, e2
    det = a * b2 - a2 * b
    check(det != 0, "systeme a solution unique")
    return (c * b2 - c2 * b) / det, (a * c2 - a2 * c) / det

def sat(e, p):
    return e[0] * p[0] + e[1] * p[1] == e[2]

# ---------- Exercice 1
Sigma1 = ((F(3), F(-1), F(7)), (F(5), F(2), F(8)))
check(solve(*Sigma1) == (2, -1), "Sigma1 : (2, -1)")
check(all(sat(e, (F(2), F(-1))) for e in Sigma1), "Sigma1 controle")
for x in rats:
    check(5 * x + 2 * (3 * x - 7) == 11 * x - 14, "Sigma1 substitution 11x - 14")
check(F(22) / 11 == 2 and 3 * 2 - 7 == -1, "Sigma1 : x = 2, y = -1")
# grid scan: (2, -1) is the only grid point satisfying Sigma1
check([p for p in itertools.product(small, small) if all(sat(e, p) for e in Sigma1)] == [(2, -1)], "Sigma1 unique sur la grille")

Sigma2 = ((F(4), F(3), F(1)), (F(6), F(-5), F(30)))
check(solve(*Sigma2) == (F(5, 2), -3), "Sigma2 : (2.5, -3)")
check(all(sat(e, (F(5, 2), F(-3))) for e in Sigma2), "Sigma2 controle")
comb = tuple(3 * u + (-2) * v for u, v in zip(*Sigma2))
check(comb == (0, 19, -57), "3 x (1) - 2 x (2) : 19y = -57")
comb_y = tuple(5 * u + 3 * v for u, v in zip(*Sigma2))
check(comb_y == (38, 0, 95) and F(95, 38) == F(5, 2), "5 x (1) + 3 x (2) : 38x = 95")
check([p for p in itertools.product(small, small) if all(sat(e, p) for e in Sigma2)] == [(F(5, 2), -3)], "Sigma2 unique sur la grille")

# Sigma3 with fractions
for x in rats[:60]:
    for y in rats[60:120]:
        check(6 * (x / 2 + y / 3) == 3 * x + 2 * y, "Sigma3 : 6 x premiere equation")
        check(6 * ((x + 1) / 3 - (y - 1) / 2) == 2 * x - 3 * y + 5, "Sigma3 : 6 x seconde equation")
Sigma3 = ((F(3), F(2), F(12)), (F(2), F(-3), F(-5)))
check(solve(*Sigma3) == (2, 3), "Sigma3 : (2, 3)")
comb = tuple(3 * u + 2 * v for u, v in zip(*Sigma3))
check(comb == (13, 0, 26), "Sigma3 : 13x = 26")
x0, y0 = F(2), F(3)
check(x0 / 2 + y0 / 3 == 2 and (x0 + 1) / 3 - (y0 - 1) / 2 == 0, "Sigma3 controle dans le systeme initial")

# Sigma4 : no solution
Sigma4 = ((F(2), F(-1), F(3)), (F(-4), F(2), F(1)))
comb = tuple(2 * u + v for u, v in zip(*Sigma4))
check(comb == (0, 0, 7), "Sigma4 : 2 x (1) + (2) donne 0 = 7")
check([p for p in itertools.product(small, small) if all(sat(e, p) for e in Sigma4)] == [], "Sigma4 : aucune solution sur la grille")
for x in rats:
    check(sat(Sigma4[0], (x, 2 * x - 3)) and sat(Sigma4[1], (x, 2 * x + F(1, 2))), "Sigma4 : droites y = 2x - 3 et y = 2x + 0.5")
check(F(-3) != F(1, 2), "Sigma4 : droites distinctes")

# Sigma5 : infinitely many
Sigma5 = ((F(1), F(2), F(4)), (F(3), F(6), F(12)))
check(tuple(3 * u for u in Sigma5[0]) == Sigma5[1], "Sigma5 : seconde = 3 x premiere")
for p in [(F(0), F(2)), (F(2), F(1)), (F(4), F(0))]:
    check(all(sat(e, p) for e in Sigma5), "Sigma5 : trois solutions")
for x in rats:
    check(all(sat(e, (x, -x / 2 + 2)) for e in Sigma5), "Sigma5 : (x, -0.5x + 2) solution")
for p in itertools.product(small, small):
    check(all(sat(e, p) for e in Sigma5) == (p[1] == -p[0] / 2 + 2), "Sigma5 : solutions = droite y = -0.5x + 2")

# question 5 : D1 and D2
D1 = lambda x: -x + 4
D2 = lambda x: F(1, 2) * x + 1
check(D1(F(0)) == 4 and D1(F(4)) == 0, "D1 : (0, 4), (4, 0)")
check(D2(F(0)) == 1 and D2(F(2)) == 2 and D2(F(-2)) == 0, "D2 : (0, 1), (2, 2), (-2, 0)")
check([x for x in small if D1(x) == D2(x)] == [2] and D1(F(2)) == 2, "K(2, 2)")
check(F(3) / F(3, 2) == 2, "3 = 1.5x <=> x = 2")

# ---------- Exercice 2, partie A
A = ((F(3), F(2), F(146)), (F(5), F(1), F(115)))
check(solve(*A) == (12, 55), "bouteille 12 D, bidon 55 D")
for x in rats:
    check(3 * x + 2 * (115 - 5 * x) == -7 * x + 230, "substitution -7x + 230")
check(F(-84) / -7 == 12 and 115 - 5 * 12 == 55 and 3 * 12 + 2 * 55 == 146, "controles partie A")
check(F(55, 5) == 11 and F(11) < 12, "11 D le litre en bidon < 12 D")
pairs = [(b, n) for b, n in itertools.product(range(0, 40), range(0, 10)) if b + 5 * n == 23]
check(sorted(pairs, key=lambda t: t[1]) == [(23, 0), (18, 1), (13, 2), (8, 3), (3, 4)], "couples (b, n)")
prices = [12 * b + 55 * n for b, n in sorted(pairs, key=lambda t: t[1])]
check(prices == [276, 271, 266, 261, 256], "prix 276, 271, 266, 261, 256")
check(all(12 * b + 55 * n == 276 - 5 * n for b, n in pairs), "prix = 276 - 5n")
check(min(pairs, key=lambda t: 12 * t[0] + 55 * t[1]) == (3, 4), "achat le moins cher : 3 bouteilles, 4 bidons")
check(5 * 12 - 55 == 5, "economie de 5 D par bidon")

# ---------- Exercice 2, partie B
B = ((F(1), F(1), F(9)), (F(3, 10), F(6, 10), F(36, 10)))
check(F(4, 10) * 9 == F(36, 10), "40 % de 9 L = 3.6 L")
check(solve(*B) == (6, 3), "6 L de P, 3 L de Q")
check(F(3, 10) * 6 + F(6, 10) * 3 == F(36, 10) and F(3, 10) * 6 == F(18, 10), "controle 1.8 + 1.8")
for x in rats:
    check(F(3, 10) * x + F(6, 10) * (9 - x) == F(54, 10) - F(3, 10) * x, "substitution 5.4 - 0.3x")
    check((F(36, 10) - F(3, 10) * x) / F(6, 10) == -x / 2 + 6, "0.3x + 0.6y = 3.6 <=> y = -0.5x + 6")
check(sat(B[0], (F(0), F(9))) and sat(B[0], (F(9), F(0))), "droite x + y = 9 : (0, 9), (9, 0)")
check(sat(B[1], (F(0), F(6))) and sat(B[1], (F(12), F(0))) and sat(B[1], (F(6), F(3))), "droite 2 : (0, 6), (12, 0), (6, 3)")
B70 = ((F(1), F(1), F(9)), (F(3, 10), F(6, 10), F(7, 10) * 9))
check(F(7, 10) * 9 == F(63, 10), "70 % de 9 L = 6.3 L")
sol = solve(*B70)
check(sol == (-3, 12) and sol[0] < 0, "solution (-3, 12) : volume negatif, impossible")
for k in range(0, 901):
    x = F(k, 100)
    y = 9 - x
    juice = F(3, 10) * x + F(6, 10) * y
    check(juice == F(27, 10) + F(3, 10) * y == F(54, 10) - F(3, 10) * x, "identites de l'encadrement")
    check(F(27, 10) <= juice <= F(54, 10), "2.7 <= jus <= 5.4")
check(F(27, 10) / 9 == F(3, 10) and F(54, 10) / 9 == F(6, 10), "30 % et 60 %")
check(F(3, 10) * 9 == F(27, 10) and F(6, 10) * 9 == F(54, 10), "bornes atteintes en y = 0 et x = 0")
check(not (F(3, 10) <= F(7, 10) <= F(6, 10)) and F(3, 10) <= F(4, 10) <= F(6, 10), "40 % possible, 70 % non")

print(f"all {ok} checks passed")
