"""Checks every value and identity used in exercises T1 ch7 (Etude de fonctions, 3eme Sc. exp.)."""
from fractions import Fraction as F
import math, random

random.seed(7)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-80, 80), random.randint(1, 13)) for _ in range(400)]
grid = [F(k, 16) for k in range(-160, 161)]
def numder(fn, x, h=1e-6):
    return (fn(x + h) - fn(x - h)) / (2 * h)
def close(a, b, tol=1e-6):
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))

# ---------- Ex1 : f(x) = (x^2 + 2x + 5)/(x + 1)
f = lambda x: (x * x + 2 * x + 5) / (x + 1)
fp = lambda x: (x - 1) * (x + 3) / (x + 1) ** 2
# identification: a = 1, a + b = 2, b + c = 5
a = F(1); b = 2 - a; c = 5 - b
check((a, b, c) == (1, 1, 4), "a, b, c = 1, 1, 4")
pts = [x for x in rats + grid if x != -1]
for x in pts:
    check((a * x + b) * (x + 1) + c == x * x + 2 * x + 5, "identification")
    check(f(x) == x + 1 + 4 / (x + 1), "f(x) = x + 1 + 4/(x+1)")
    # quotient rule, exact
    check(((2 * x + 2) * (x + 1) - (x * x + 2 * x + 5)) / (x + 1) ** 2 == fp(x), "f' (quotient)")
    check(1 - F(4) / (x + 1) ** 2 == fp(x), "f' = 1 - 4/(x+1)^2")
    check((fp(x) > 0) == (x < -3 or x > 1), "signe de f'")
    check((f(x) - (x + 1) > 0) == (x > -1), "position C / D")
    check(f(-2 - x) == -f(x), "centre I(-1, 0)")
    check(-2 - x != -1, "-2 - x dans D_f")
    check(fp(x) + 3 == 4 * ((x + 1) ** 2 - 1) / (x + 1) ** 2, "f' + 3")
    check((fp(x) == -3) == (x in (0, -2)), "f'(x) = -3 <=> x in {0, -2}")
for k in range(200):
    x = random.uniform(-10, 10)
    if abs(x + 1) > 0.05:
        check(close(numder(f, x), fp(x), 1e-5), "f' numeric")
check(f(F(-3)) == -4 and f(F(1)) == 4, "extrema locaux -4 et 4")
tab = {F(-5): -5, F(-3): -4, F(-2): -5, F(-3, 2): F(-17, 2), F(-1, 2): F(17, 2), F(0): 5, F(1): 4, F(3): 5}
check(all(f(x) == y for x, y in tab.items()), "tableau de valeurs")
check(4 - 20 < 0, "x^2 + 2x + 5 sans racine")
# monotonicity on the four intervals
for lo, hi, inc in ((-10, -3, True), (-3, -1, False), (-1, 1, False), (1, 10, True)):
    ps = [x for x in grid if lo <= x <= hi and x != -1]
    check(all((f(ps[i]) < f(ps[i + 1])) == inc for i in range(len(ps) - 1)), "monotonie de f")
# limits (numerical)
check(f(F(10 ** 6)) > 10 ** 5 and f(F(-10 ** 6)) < -10 ** 5, "limites en +-inf")
check(f(F(-1) + F(1, 10 ** 6)) > 10 ** 5 and f(F(-1) - F(1, 10 ** 6)) < -10 ** 5, "limites en -1")
check(abs(f(F(10 ** 6)) - (10 ** 6 + 1)) < F(1, 10 ** 5) and abs(f(F(-10 ** 6)) - (-10 ** 6 + 1)) < F(1, 10 ** 5), "asymptote oblique")
# tangents
TA = lambda x: -3 * x + 5
TB = lambda x: -3 * x - 11
check(f(F(0)) == 5 and f(F(-2)) == -5 and fp(F(0)) == -3 and fp(F(-2)) == -3, "points A, B")
check(TA(F(0)) == 5 and TB(F(-2)) == -5, "tangentes passent par A et B")
check(((0 + -2) / F(2), (5 + -5) / F(2)) == (-1, 0), "milieu de [AB] = I")
for x in rats:
    check(-3 * (-2 - x) - 11 == -TA(x), "T_B symetrique de T_A")
# discussion f(x) = m
def nsol_table(m):
    if m < -4 or m > 4: return 2
    if m in (-4, 4): return 1
    return 0
for m in [F(k, 4) for k in range(-40, 41)]:
    D = (2 - m) ** 2 - 4 * (5 - m)
    check(D == m * m - 16 == (m - 4) * (m + 4), "discriminant m^2 - 16")
    check(1 - (2 - m) + 5 - m == 4, "-1 jamais racine")
    n = 2 if D > 0 else (1 if D == 0 else 0)
    check(n == nsol_table(m), "nombre de solutions")
    for x in pts[:40]:
        check((f(x) == m) == (x * x + (2 - m) * x + 5 - m == 0), "equivalence f(x) = m")
check((F(4) - 2) / 2 == 1 and (F(-4) - 2) / 2 == -3, "racines doubles 1 et -3")
# Ex1 Q7a : where the two solutions lie
q = lambda x, m: x * x + (2 - m) * x + 5 - m
for m in [F(-401, 100), F(-9, 2), F(-5), F(-6), F(-10), F(-25), F(-100),
          F(401, 100), F(9, 2), F(5), F(6), F(10), F(25), F(100)]:
    D = float(m * m - 16)
    r1 = (float(m - 2) - math.sqrt(D)) / 2
    r2 = (float(m - 2) + math.sqrt(D)) / 2
    check(abs(float(q(F(r1), m))) < 1e-6 * max(1, float(m * m)) and abs(float(q(F(r2), m))) < 1e-6 * max(1, float(m * m)), "racines de (E)")
    check(math.isclose(f(r1), float(m), rel_tol=1e-9) and math.isclose(f(r2), float(m), rel_tol=1e-9), "f(r) = m")
    if m < -4:
        check(r1 < -3 < r2 < -1, "m < -4 : une solution dans ]-inf,-3[, une dans ]-3,-1[")
        check(q(F(-3), m) == 8 + 2 * m < 0 and q(F(-1), m) == 4 and (m - 2) / 2 < -1, "localisation exacte, m < -4")
    else:
        check(-1 < r1 < 1 < r2, "m > 4 : une solution dans ]-1,1[, une dans ]1,+inf[")
        check(q(F(1), m) == 8 - 2 * m < 0 and q(F(-1), m) == 4 and (m - 2) / 2 > -1, "localisation exacte, m > 4")

# ---------- Ex2 : f(x) = sqrt(x^2 + 2x - 8), circle centre (-1, 0) radius 3
u = lambda x: x * x + 2 * x - 8
for x in rats + grid:
    check((abs(x + 1) >= 3) == (x <= -4 or x >= 2), "M exterieur ou sur Gamma")
    check((x + 1) ** 2 - 9 == u(x) == (x - 2) * (x + 4), "MT^2 = (x+1)^2 - 9 = (x-2)(x+4)")
    check((u(x) >= 0) == (x <= -4 or x >= 2), "D_f")
    check(u(-2 - x) == u(x), "axe x = -1")
    check((x + (-2 - x)) / 2 == -1, "M et M' symetriques par rapport a Omega")
g = lambda x: math.sqrt(u(x))
# right derivative at 2 and left at -4
for e in (1e-2, 1e-4, 1e-6, 1e-8):
    x = 2 + e
    q = (g(x) - g(2)) / (x - 2)
    check(close(q, math.sqrt(x + 4) / math.sqrt(x - 2), 1e-6), "taux en 2")
    y = -4 - e
    q2 = (g(y) - g(-4)) / (y + 4)
    check(close(q2, -math.sqrt(2 - y) / math.sqrt(-4 - y), 1e-6), "taux en -4")
check((g(2 + 1e-10) - 0) / 1e-10 > 1e4 and (g(-4 - 1e-10) - 0) / (-1e-10) < -1e4, "demi-tangentes verticales")
check(math.isclose(math.sqrt(6), math.sqrt(2 + 4)), "sqrt(x+4) -> sqrt6")
# derivative and sign
for k in range(300):
    x = random.uniform(2.05, 40)
    check(close(numder(g, x), (x + 1) / g(x), 1e-5) and (x + 1) / g(x) > 0, "f' > 0 sur ]2,+inf[")
    y = random.uniform(-40, -4.05)
    check(close(numder(g, y), (y + 1) / g(y), 1e-5) and (y + 1) / g(y) < 0, "f' < 0 sur ]-inf,-4[")
    check(close(g(x) - (x + 1), -9 / (g(x) + x + 1), 1e-9) and g(x) < x + 1, "conjugue et position sur [2,+inf[")
    check(close(g(y) - (-y - 1), -9 / (g(y) - y - 1), 1e-9) and g(y) < -y - 1, "asymptote D' et position")
    check(math.isclose(g(x), g(-2 - x)), "symetrie numerique")
check(abs(g(1e6) - (1e6 + 1)) < 1e-4 and abs(g(-1e6) - (1e6 - 1)) < 1e-4, "asymptotes en +-inf")
check(g(1e6) > 1e5 and g(-1e6) > 1e5, "limites +inf")
right = [float(x) for x in grid if x >= 2]
left = [float(x) for x in grid if x <= -4]
check(all(g(right[i]) < g(right[i + 1]) for i in range(len(right) - 1)), "f croissante sur [2,+inf[")
check(all(g(left[i]) > g(left[i + 1]) for i in range(len(left) - 1)), "f decroissante sur ]-inf,-4]")
check(g(2) == 0 and g(-4) == 0, "f(2) = f(-4) = 0")
# image of D by the reflection x -> -2 - x
for x in rats:
    X = -2 - x
    check(x + 1 == -X - 1, "D' : y = -x - 1")
check(-1 + 1 == 0 and -(-1) - 1 == 0, "D et D' passent par Omega")
# table of points
check([u(F(v)) for v in (-7, -6, -5, -4, 2, 3, 4, 5)] == [27, 16, 7, 0, 0, 7, 16, 27], "points du trace")
check(round(math.sqrt(7), 2) == 2.65 and round(3 * math.sqrt(3), 2) == 5.20, "sqrt7, 3sqrt3")
# MT = 4
check(sorted(x for x in grid if u(x) == 16) == [F(-6), F(4)], "MT = 4 <=> x in {-6, 4}")
for x in rats:
    check(u(x) - 16 == x * x + 2 * x - 24 == (x - 4) * (x + 6), "x^2 + 2x - 24 = (x-4)(x+6)")
check(abs(4 + 1) == 5 and abs(-6 + 1) == 5 and 3 ** 2 + 4 ** 2 == 5 ** 2, "Omega M = 5, triangle 3-4-5")

print(f"all {ok} checks passed")
