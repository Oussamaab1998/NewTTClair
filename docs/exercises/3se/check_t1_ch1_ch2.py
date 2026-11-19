"""Checks every value and identity used in exercises T1 ch1 + ch2 (3ème Sc. exp.)."""
from fractions import Fraction as F
import math, random

random.seed(1)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]
grid = [F(k, 8) for k in range(-80, 81)]

# ---------- Ch1 Ex1 : f(x) = 2x/(x^2+1)
f = lambda x: 2 * x / (x * x + 1)
for x in rats:
    check(f(-x) == -f(x), "f impaire")
    check(1 - f(x) == (x - 1) ** 2 / (x * x + 1), "1 - f(x) identity")
    check(-1 <= f(x) <= 1, "bornes")
for a in rats[:60]:
    for b in rats[60:120]:
        check(f(a) - f(b) == 2 * (a - b) * (1 - a * b) / ((a * a + 1) * (b * b + 1)), "f(a)-f(b) identity")
check(f(F(1)) == 1 and f(F(-1)) == -1 and f(F(0)) == 0, "f(1)=1, f(-1)=-1, f(0)=0")
inc01 = [x for x in grid if 0 <= x <= 1]
check(all(f(inc01[i]) < f(inc01[i + 1]) for i in range(len(inc01) - 1)), "f croissante sur [0,1]")
dec1 = [x for x in grid if x >= 1]
check(all(f(dec1[i]) > f(dec1[i + 1]) for i in range(len(dec1) - 1)), "f decroissante sur [1,+inf[")
incm10 = [x for x in grid if -1 <= x <= 0]
check(all(f(incm10[i]) < f(incm10[i + 1]) for i in range(len(incm10) - 1)), "f croissante sur [-1,0]")
check(all((f(x) >= 0) == (x >= 0) for x in rats + grid), "D_h = [0,+inf[")
check(all(0 <= math.sqrt(f(x)) <= 1 for x in grid if x >= 0), "h bornee")

# ---------- Ch1 Ex2 A : f(x) = |x-1| + |x+2|
g = lambda x: abs(x - 1) + abs(x + 2)
def g_pieces(x):
    if x <= -2: return -2 * x - 1
    if x <= 1: return F(3)
    return 2 * x + 1
for x in rats + grid:
    check(g(x) == g_pieces(x), "forme sans valeur absolue")
    check(g(-1 - x) == g(x), "axe x = -1/2")
    check(g(x) >= 3, "minimum 3")
    check((g(x) == 3) == (-2 <= x <= 1), "minimum atteint exactement sur [-2,1]")
    check((g(x) <= 5) == (-3 <= x <= 2), "f(x) <= 5 <=> x in [-3,2]")
check([x for x in grid if g(x) == 5] == [F(-3), F(2)], "f(x) = 5 <=> x in {-3, 2}")
check([g(F(v)) for v in (-4, -3, -2, 1, 2, 3)] == [7, 5, 3, 3, 5, 7], "points du trace")

# ---------- Ch1 Ex2 B : g(x) = x - E(x) on [-1, 2[
for x in grid:
    if -1 <= x < 2:
        d = x - math.floor(x)
        exp = x + 1 if x < 0 else (x if x < 1 else x - 1)
        check(d == exp, "pieces of x - E(x)")
        check(0 <= d < 1, "0 <= g < 1")
check(all(F(v) - math.floor(F(v)) == 0 for v in (-1, 0, 1)), "min 0 en -1, 0, 1")

# ---------- Ch2 Ex1 A : continuity at 1 needs P(1) = sqrt(4) = 2
for m in range(-5, 6):
    P1 = 1 + m - 1
    check((P1 == 2) == (m == 2), "m = 2 unique")
check(math.isclose(math.sqrt(1 + 3), 2), "f(1) = 2")

# ---------- Ch2 Ex1 B : g(x) = (x^2-4)/|x-2|, g(2) = 4
G = lambda x: (x * x - 4) / abs(x - 2)
for x in rats + grid:
    if x > 2: check(G(x) == x + 2, "g = x+2 for x>2")
    if x < 2: check(G(x) == -x - 2, "g = -x-2 for x<2")
    if 1 < x < 2: check(abs(G(x) - 4) > 7, "|g(x)-g(2)| > 7 on ]1,2[")
check(F(2) + 2 == 4, "x+2 at 2 equals g(2)")

# ---------- Ch2 Ex2 : f(x) = x^3 + x - 1
h = lambda x: x ** 3 + x - 1
check(h(F(0)) == -1 and h(F(1)) == 1, "f(0), f(1)")
check(h(F(-1)) == -3 and h(F(2)) == 9, "f(-1), f(2)")
a, b = F(0), F(1)
rows = []
for _ in range(4):
    c = (a + b) / 2
    rows.append((a, b, c, h(c)))
    if h(c) < 0: a = c
    else: b = c
expected = [(F(0), F(1), F(1, 2), F(-3, 8)),
            (F(1, 2), F(1), F(3, 4), F(11, 64)),
            (F(1, 2), F(3, 4), F(5, 8), F(-67, 512)),
            (F(5, 8), F(3, 4), F(11, 16), F(51, 4096))]
check(rows == expected, "tableau de dichotomie")
check((a, b) == (F(5, 8), F(11, 16)), "encadrement final ]0.625, 0.6875[")
check([float(r[3]) for r in rows] == [-0.375, 0.171875, -0.130859375, 0.012451171875], "valeurs decimales")
# alpha by bisection to 1e-12
lo, hi = 0.0, 1.0
for _ in range(60):
    mid = (lo + hi) / 2
    lo, hi = (mid, hi) if mid ** 3 + mid - 1 < 0 else (lo, mid)
alpha = lo
check(0.625 < alpha < 0.6875 and math.floor(alpha * 10) / 10 == 0.6, "alpha ~ 0.6823")
lo, hi = 1.0, 2.0
for _ in range(60):
    mid = (lo + hi) / 2
    lo, hi = (mid, hi) if mid ** 3 + mid - 5 < 0 else (lo, mid)
beta = lo
check(1 < beta < 2, "beta in ]1,2[")
xs = [F(k, 16) for k in range(-48, 49)]
check(all(h(xs[i]) < h(xs[i + 1]) for i in range(len(xs) - 1)), "f strictement croissante")

print(f"all {ok} checks passed; alpha = {alpha:.6f}, beta = {beta:.6f}")
