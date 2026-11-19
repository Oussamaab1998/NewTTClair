"""Checks every value and identity used in exercises T1 ch6 (Fonction derivee, 3eme Sc. exp.)."""
from fractions import Fraction as F
import math, random

random.seed(6)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(300)]
grid = [F(k, 16) for k in range(-96, 97)]

# exact polynomial helpers (coefficient lists, lowest degree first)
def peval(p, x):
    return sum(c * x ** i for i, c in enumerate(p))
def pder(p):
    return [i * c for i, c in enumerate(p)][1:]
def pmul(p, q):
    r = [F(0)] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] += a * b
    return r
def ppow(p, k):
    r = [F(1)]
    for _ in range(k):
        r = pmul(r, p)
    return r
def numder(fn, x, h=1e-6):
    return (fn(x + h) - fn(x - h)) / (2 * h)
def close(a, b, tol=1e-6):
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))

# ---------- Ex1 A : derivatives
p1 = [F(-1), F(5), F(0), F(-2), F(1)]                      # x^4 - 2x^3 + 5x - 1
d1 = lambda x: 4 * x ** 3 - 6 * x ** 2 + 5
p2 = ppow([F(-1), F(3)], 4)                                 # (3x - 1)^4
d2 = lambda x: 12 * (3 * x - 1) ** 3
for x in rats:
    check(peval(pder(p1), x) == d1(x), "f1'")
    check(peval(pder(p2), x) == d2(x), "f2' = 12(3x-1)^3")
    if x != 3:
        # quotient rule: (u'v - uv')/v^2 with u = 2x+1, v = x-3
        check((2 * (x - 3) - (2 * x + 1) * 1) / (x - 3) ** 2 == F(-7) / (x - 3) ** 2, "f3' = -7/(x-3)^2")
    check(x * x - 2 * x + 5 == (x - 1) ** 2 + 4, "x^2-2x+5 = (x-1)^2+4")
    # (1/u^2)' = -2u'/u^3 with u = x^2+1
    check(-2 * (2 * x) / (x * x + 1) ** 3 == -4 * x / (x * x + 1) ** 3, "f6'")
f3 = lambda x: (2 * x + 1) / (x - 3)
f4 = lambda x: math.sqrt(x * x - 2 * x + 5)
f5 = lambda x: x * math.sqrt(x)
f6 = lambda x: 1 / (x * x + 1) ** 2
for k in range(200):
    x = random.uniform(-8, 8)
    check(close(numder(lambda t: t ** 4 - 2 * t ** 3 + 5 * t - 1, x), d1(x), 1e-5), "f1' numeric")
    check(close(numder(lambda t: (3 * t - 1) ** 4, x), d2(x), 1e-5), "f2' numeric")
    check(close(numder(f4, x), (x - 1) / f4(x)), "f4' numeric")
    check(close(numder(f6, x), -4 * x / (x * x + 1) ** 3), "f6' numeric")
    y = random.uniform(3.1, 20)
    check(close(numder(f3, y), -7 / (y - 3) ** 2), "f3' numeric")
    z = random.uniform(0.1, 20)
    check(close(numder(f5, z), 1.5 * math.sqrt(z)), "f5' = (3/2)sqrt(x) numeric")
# Q2 : f3 decreasing on ]3,+inf[, f4 min 2 at 1
g3 = [x for x in grid if x > 3]
check(all(f3(g3[i]) > f3(g3[i + 1]) for i in range(len(g3) - 1)), "f3 decroissante")
check(all(((x - 1) > 0) == (float(x - 1) / f4(float(x)) > 0) for x in grid if x != 1), "signe f4' = signe x-1")
check(f4(1.0) == 2.0 and all(f4(float(x)) >= 2 for x in grid), "min f4 = 2 en 1")

# ---------- Ex1 B : f(x) = x^3 + a x^2 + b
# f'(2) = 12 + 4a = 0 and f(2) = 8 + 4a + b = -3
a = F(-12, 4)
b = F(-3) - 8 - 4 * a
check((a, b) == (F(-3), F(1)), "a = -3, b = 1")
f = lambda x: x ** 3 - 3 * x ** 2 + 1
fp = lambda x: 3 * x ** 2 - 6 * x
for x in rats + grid:
    check(peval(pder([F(1), F(0), F(-3), F(1)]), x) == fp(x), "f'")
    check(fp(x) == 3 * x * (x - 2), "f' = 3x(x-2)")
    check((fp(x) > 0) == (x < 0 or x > 2), "signe de f'")
    check(f(x) + 3 == (x - 2) ** 2 * (x + 1), "f + 3 factorisation")
    check(f(x) - 1 == x ** 2 * (x - 3), "f - 1 factorisation")
check(f(F(2)) == -3 and f(F(0)) == 1, "f(2) = -3, f(0) = 1")
check([f(F(v)) for v in (-1, 1, 3, 4, -2)] == [-3, -1, 1, 17, -19], "f(-1), f(1), f(3), f(4), f(-2)")
check(fp(F(1)) < 0 and fp(F(3)) > 0, "f' change de signe en 2")
# monotonicity on the three intervals
for lo, hi, inc in ((-6, 0, True), (0, 2, False), (2, 6, True)):
    pts = [x for x in grid if lo <= x <= hi]
    check(all((f(pts[i]) < f(pts[i + 1])) == inc for i in range(len(pts) - 1)), "monotonie de f")
# roots by bisection
def bis(fn, lo, hi, n=80):
    flo = fn(lo)
    for _ in range(n):
        mid = (lo + hi) / 2
        if (fn(mid) < 0) == (flo < 0):
            lo = mid
        else:
            hi = mid
    return lo
ff = lambda x: x ** 3 - 3 * x ** 2 + 1
al, be, ga = bis(ff, -1.0, 0.0), bis(ff, 0.0, 1.0), bis(ff, 2.0, 3.0)
check(-1 < al < 0 < be < 1 and 2 < ga < 3, "encadrements alpha, beta, gamma")
check((round(al, 3), round(be, 3), round(ga, 3)) == (-0.532, 0.653, 2.879), "valeurs approchees des racines")
check(all(abs(ff(r)) < 1e-12 for r in (al, be, ga)), "ce sont des racines")
# number of solutions of f(x) = m : cubic discriminant of x^3 - 3x^2 + (1 - m)
def disc(m):
    A, B, C, D = 1, -3, 0, 1 - m
    return 18 * A * B * C * D - 4 * B ** 3 * D + B ** 2 * C ** 2 - 4 * A * C ** 3 - 27 * A ** 2 * D ** 2
def nsol_claimed(m):
    if m < -3 or m > 1: return 1
    if m == -3 or m == 1: return 2
    return 3
for m in [F(k, 4) for k in range(-40, 30)]:
    d = disc(m)
    check(d == 27 * (1 - m) * (3 + m), "discriminant = 27(1-m)(3+m)")
    real = 3 if d > 0 else (2 if d == 0 else 1)   # d = 0 here: double root, never triple
    check(real == nsol_claimed(m), "nombre de solutions de f(x) = m")
check(sorted(x for x in grid if f(x) == -3) == [F(-1), F(2)], "f(x) = -3 <=> x in {-1, 2}")
check(sorted(x for x in grid if f(x) == 1) == [F(0), F(3)], "f(x) = 1 <=> x in {0, 3}")
check(f(F(-1)) == -3 and f(F(3)) == 1, "solution < -1 si m < -3, > 3 si m > 1")

# ---------- Ex2 : S(x) = 2x(12 - x^2), p(x) = 2(2x + 12 - x^2)
S = lambda x: 24 * x - 2 * x ** 3
p = lambda x: -2 * x ** 2 + 4 * x + 24
r3 = 2 * math.sqrt(3)
check(math.isclose(12 - r3 ** 2, 0, abs_tol=1e-12) and math.isclose(math.sqrt(12), r3), "racines +-2sqrt3")
for x in rats + grid:
    check(2 * x * (12 - x * x) == S(x), "S(x)")
    check(2 * (2 * x + 12 - x * x) == p(x), "p(x)")
    check(peval(pder([F(0), F(24), F(0), F(-2)]), x) == 24 - 6 * x * x == 6 * (2 - x) * (2 + x), "S'")
    check(32 - S(x) == 2 * (x - 2) ** 2 * (x + 4), "32 - S = 2(x-2)^2(x+4)")
    check(x ** 3 - 12 * x + 11 == (x - 1) * (x * x + x - 11), "factorisation S = 22")
    check(peval(pder([F(24), F(4), F(-2)]), x) == 4 * (1 - x), "p'")
inner = [x for x in grid if 0 < x < r3]
check(all((24 - 6 * x * x > 0) == (x < 2) for x in inner if x != 2), "signe de S'")
check(all(S(x) <= 32 for x in inner) and S(F(2)) == 32, "max S = 32 en 2")
check(2 < r3 and S(F(0)) == 0 and math.isclose(24 * r3 - 2 * r3 ** 3, 0, abs_tol=1e-12), "S aux bornes")
check((2 * 2, 12 - 2 ** 2) == (4, 8), "dimensions 4 x 8")
check(p(F(1)) == 26 and p(F(0)) == 24 and p(F(2)) == 24, "p(1)=26, p(0)=24, p(2)=24")
check(math.isclose(p(r3), 8 * math.sqrt(3)) and round(8 * math.sqrt(3), 2) == 13.86, "p(2sqrt3) = 8sqrt3")
check(all(p(x) <= 26 for x in inner), "max p = 26")
# Ex2 Q3 : sign of p' and variations of p on a grid of ]0, 2sqrt3[
fine = [F(k, 64) for k in range(1, 222)]                      # 221/64 = 3.453... < 2sqrt3
check(fine[-1] < r3 and all(0 < x < r3 for x in fine), "grille dans ]0, 2sqrt3[")
for x in fine:
    check((4 * (1 - x) > 0) == (x < 1) and (4 * (1 - x) < 0) == (x > 1), "signe de p'")
up = [x for x in fine if x <= 1]
down = [x for x in fine if x >= 1]
check(all(p(up[i]) < p(up[i + 1]) for i in range(len(up) - 1)), "p strictement croissante sur ]0, 1]")
check(all(p(down[i]) > p(down[i + 1]) for i in range(len(down) - 1)), "p strictement decroissante sur [1, 2sqrt3[")
check(all(p(x) > 8 * math.sqrt(3) for x in fine) and all(p(x) > 24 for x in up), "p entre ses valeurs aux bornes")
check((2 * 1, 12 - 1) == (2, 11), "dimensions 2 x 11")
# S(x) = 22
check(1 + 44 == 45, "discriminant 45")
s5 = math.sqrt(5)
x1 = (3 * s5 - 1) / 2
check(math.isclose(S(x1), 22) and S(F(1)) == 22, "S(1) = S(x1) = 22")
check(0 < x1 < r3 and 2 < x1 and round(x1, 3) == 2.854, "x1 dans ]2, 2sqrt3[")
check((-1 - 3 * s5) / 2 < 0, "racine negative rejetee")
check(45 < 49 + 8 * math.sqrt(3), "45 < 49 + 8sqrt3")
# exact arithmetic in Q(sqrt5): numbers (u, v) = u + v sqrt5
def m5(a, b):
    return (a[0] * b[0] + 5 * a[1] * b[1], a[0] * b[1] + a[1] * b[0])
X1 = (F(-1, 2), F(3, 2))
check(m5(X1, X1) == (F(23, 2), F(-3, 2)), "x1^2 = (23 - 3sqrt5)/2")
height = (12 - F(23, 2), F(3, 2))
check(height == (F(1, 2), F(3, 2)), "hauteur (1 + 3sqrt5)/2")
width = (2 * X1[0], 2 * X1[1])
check(width == (F(-1), F(3)), "largeur 3sqrt5 - 1")
check(m5(width, height) == (F(22), F(0)), "aire = 22 exactement")
check(round(3 * s5 - 1, 3) == 5.708 and round((1 + 3 * s5) / 2, 3) == 3.854, "valeurs approchees")
# approximation affine en 2
check(24 - 6 * 2 ** 2 == 0, "S'(2) = 0")
check(S(F(41, 20)) == F(3196975, 100000), "S(2.05) = 31.96975")
check(round(32 - float(S(F(41, 20))), 2) == 0.03, "erreur ~ 0.03")

print(f"all {ok} checks passed")
