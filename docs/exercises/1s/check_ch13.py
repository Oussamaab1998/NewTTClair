"""Checks every value used in CH13_EQUATIONS_INEQUATIONS.md (1ère année, équations et inéquations)."""
from fractions import Fraction as F
import random

random.seed(13)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-300, 300), random.randint(1, 17)) for _ in range(400)]
# grid with denominators 2, 3, 4, 6, 11, 12 so that every claimed root or bound lies on it
grid = sorted({F(k, d) for d in (1, 2, 3, 4, 6, 11, 12) for k in range(-12 * d, 12 * d + 1)})

def roots_on_grid(expr):
    return [x for x in grid if expr(x) == 0]

def affine_coeffs(expr):
    """Return (alpha, beta) with expr(x) = alpha x + beta, after checking it on many rationals."""
    beta = expr(F(0))
    alpha = expr(F(1)) - beta
    for x in rats:
        check(expr(x) == alpha * x + beta, "expression affine")
    return alpha, beta

# ---------- Exercice 1, question 1
L = lambda x: 3 * (2 * x - 5) - 4 * (x + 1)
R = lambda x: 7 - (x - 2)
for x in rats:
    check(L(x) == 2 * x - 19 and R(x) == 9 - x, "1a reductions")
al, be = affine_coeffs(lambda x: L(x) - R(x))
check(al == 3 and be == -28, "1a : 3x - 28 = 0")
check(-be / al == F(28, 3) and L(F(28, 3)) == R(F(28, 3)), "1a : x = 28/3")

L = lambda x: (x - 1) / 2 - (2 * x + 1) / 3
R = lambda x: (x - 4) / 6
for x in rats:
    check(6 * L(x) == 3 * (x - 1) - 2 * (2 * x + 1) and 6 * R(x) == x - 4, "1b multiplication par 6")
    check(3 * (x - 1) - 2 * (2 * x + 1) == -x - 5, "1b reduction")
al, be = affine_coeffs(lambda x: 6 * (L(x) - R(x)))
check(al == -2 and be == -1, "1b : -2x - 1 = 0")
check(-be / al == F(-1, 2), "1b : x = -1/2")
x0 = F(-1, 2)
check((x0 - 1) / 2 == F(-3, 4) and (2 * x0 + 1) / 3 == 0 and (x0 - 4) / 6 == F(-3, 4), "1b controle")

L = lambda x: 2 * (3 * x + 1) - x
R = lambda x: 5 * (x + 1)
al, be = affine_coeffs(lambda x: L(x) - R(x))
check(al == 0 and be == -3, "1c : 0x - 3 = 0, aucune solution")
check(roots_on_grid(lambda x: L(x) - R(x)) == [], "1c : S vide")

# ---------- question 2
e2a = lambda x: (3 * x - 1) ** 2 - (x + 5) ** 2
for x in rats:
    check(e2a(x) == (2 * x - 6) * (4 * x + 4), "2a factorisation")
check(roots_on_grid(e2a) == [F(-1), F(3)], "2a : S = {-1 ; 3}")

e2b = lambda x: 4 * x * x - 12 * x + 9 - 49
for x in rats:
    check(4 * x * x - 12 * x + 9 == (2 * x - 3) ** 2, "2b carre")
    check(e2b(x) == (2 * x - 10) * (2 * x + 4), "2b factorisation")
check(roots_on_grid(e2b) == [F(-2), F(5)], "2b : S = {-2 ; 5}")

e2c = lambda x: abs(x - 7) - abs(3 * x + 1)
for x in rats:
    check((x - 7) ** 2 - (3 * x + 1) ** 2 == (-2 * x - 8) * (4 * x - 6), "2c factorisation")
    check((e2c(x) == 0) == ((x - 7) ** 2 == (3 * x + 1) ** 2), "|a| = |b| <=> a^2 = b^2")
check(roots_on_grid(e2c) == [F(-4), F(3, 2)], "2c : S = {-4 ; 3/2}")
check(abs(F(-4) - 7) == 11 and abs(3 * F(-4) + 1) == 11, "2c controle -4")
check(abs(F(3, 2) - 7) == F(11, 2) and abs(F(9, 2) + 1) == F(11, 2), "2c controle 3/2")

# ---------- question 3
for x in grid + rats:
    check((2 * (x - 3) - 5 <= 4 * x + 1) == (x >= -6), "3a : S = [-6, +inf[")
    check(((1 - 2 * x) / 3 > (x + 2) / 4 - 1) == (x < F(10, 11)), "3b : S = ]-inf, 10/11[")
    check(12 * ((1 - 2 * x) / 3) == 4 * (1 - 2 * x) and 12 * ((x + 2) / 4 - 1) == 3 * (x + 2) - 12, "3b x12")
    check(4 * (1 - 2 * x) - (3 * x - 6) == 10 - 11 * x, "3b reduction")

# ---------- question 4
E = lambda x: 4 * x * x - 9 - (2 * x + 3) * (x - 5)
for x in rats:
    check(4 * x * x - 9 == (2 * x - 3) * (2 * x + 3), "4a 4x^2 - 9")
    check(E(x) == (2 * x + 3) * (x + 2), "4a factorisation")
    check(E(x) == 2 * x * x + 7 * x + 6, "4b developpement")
check(roots_on_grid(lambda x: E(x) - 6) == [F(-7, 2), F(0)], "4b : E(x) = 6 <=> x in {-7/2 ; 0}")
check(roots_on_grid(E) == [F(-2), F(-3, 2)], "4c : zeros -2 et -3/2")
check(F(-2) < F(-3, 2), "-2 < -3/2")
for x in grid + rats:
    check((2 * x + 3 > 0) == (x > F(-3, 2)) and (x + 2 > 0) == (x > -2), "4c signes des facteurs")
    check((E(x) > 0) == (x < -2 or x > F(-3, 2)), "4c : E > 0 hors de [-2, -3/2]")
    check((E(x) < 0) == (F(-2) < x < F(-3, 2)), "4d : S = ]-2, -3/2[")
check([n for n in range(-100, 101) if E(F(n)) <= 0] == [-2], "4e : n = -2")
check(E(F(-2)) == 0 and E(F(-1)) == 1, "4e controle")

# ---------- Exercice 2 : tarifs
A = lambda x: 4 * F(x)
B = lambda x: 30 + F(5, 2) * x
C = lambda x: F(120)
check(A(15) == 60 and B(15) == F(135, 2) and C(15) == 120, "1b : 60, 67.5, 120")
check(min((A(15), "A"), (B(15), "B"), (C(15), "C"))[1] == "A", "1b : A le moins cher")
xs = range(0, 400)
for x in xs:
    check((A(x) < B(x)) == (x < 20), "2a : A < B <=> x < 20")
    check((A(x) == B(x)) == (x == 20), "2a : A = B <=> x = 20")
    check((B(x) < C(x)) == (x < 36), "2b : B < C <=> x < 36")
    check((B(x) == C(x)) == (x == 36), "2b : B = C <=> x = 36")
    check((A(x) < C(x)) == (x < 30), "2b : A < C <=> x < 30")
check(A(20) == B(20) == 80 and B(36) == C(36) == 120 and A(36) == 144, "valeurs aux egalites")
# solution sets in N (x natural number; xs covers 0..399, far beyond every bound)
check([x for x in xs if A(x) < B(x)] == list(range(0, 20)), "2a : S = {0, 1, ..., 19}")
check([x for x in xs if B(x) < C(x)] == list(range(0, 36)), "2b : S = {0, 1, ..., 35}")
check([x for x in xs if A(x) < C(x)] == list(range(0, 30)), "2b : S = {0, 1, ..., 29}")

def cheapest(x):
    prices = {"A": A(x), "B": B(x), "C": C(x)}
    m = min(prices.values())
    return "".join(k for k in "ABC" if prices[k] == m)

def claimed(x):
    if x <= 19: return "A"
    if x == 20: return "AB"
    if x <= 35: return "B"
    if x == 36: return "BC"
    return "C"

for x in xs:
    check(cheapest(x) == claimed(x), "3 : tableau du tarif le moins cher")
# budget 100 D
check(max(x for x in xs if A(x) <= 100) == 25, "4 : 25 entrees avec A")
check(max(x for x in xs if B(x) <= 100) == 28, "4 : 28 entrees avec B")
check(C(0) > 100, "4 : C impossible")
# average price with B
for x in range(1, 1000):
    check((B(x) / x <= 3) == (x >= 60), "5 : B(x)/x <= 3 <=> x >= 60")
check(B(60) == 180 and B(60) / 60 == 3, "5 : controle 180/60 = 3")

print(f"all {ok} checks passed")
