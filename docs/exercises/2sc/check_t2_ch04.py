"""Checks every value and identity used in exercises T2 ch4 (2ème Sciences, fonctions de référence)."""
from fractions import Fraction as F
import math, random

random.seed(4)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]
grid = [F(k, 8) for k in range(-96, 97)]

def coeffs(q):
    """Coefficients (a, b, c) of a polynomial function q of degree <= 2, read from q(-1), q(0), q(1)."""
    c = q(F(0)); a = (q(F(1)) + q(F(-1)) - 2 * c) / 2; b = (q(F(1)) - q(F(-1))) / 2
    return a, b, c

def roots_by_discriminant(a, b, c):
    d = b * b - 4 * a * c
    r = math.isqrt(int(d))
    assert d.denominator == 1 and r * r == d, "perfect square discriminant expected"
    return d, sorted([(-b - r) / (2 * a), (-b + r) / (2 * a)])

# ---------- Ex1 Partie A : f(x) = -2x^2 + 8x - 6
f = lambda x: -2 * x * x + 8 * x - 6
for x in rats + grid:
    check(f(x) == -2 * (x - 2) ** 2 + 2, "forme canonique -2(x-2)^2 + 2")
    check(f(x) <= 2 and ((f(x) == 2) == (x == 2)), "max 2 only at 2 (sommet S(2,2))")
    check(f(4 - x) == f(x), "axe x = 2: the symmetric point (4 - x, f(x)) is on P")
# 1. b) homothety h(O, -1/2): M(x, y) -> M'(-x/2, -y/2); P0 : y = x^2 -> P1 : y = -2x^2
k = F(-1, 2)
for x in rats:
    M = (x, x * x)
    Mp = (k * M[0], k * M[1])
    check(Mp[1] == -2 * Mp[0] ** 2, "h(P0) in P1")
    N = (x, -2 * x * x)                          # any point of P1
    pre = (N[0] / k, N[1] / k)                   # its antecedent by h: vec(OM) = -2 vec(ON)
    check(pre[1] == pre[0] ** 2 and (k * pre[0], k * pre[1]) == N, "every point of P1 is the image of a point of P0")
    Q = (x, x * x + 1)
    check((k * Q[1]) != -2 * (k * Q[0]) ** 2, "a point off P0 is sent off P1")
# 1. c) translation of vector vec(OS) = 2i + 2j: P1 -> P
S = (F(2), f(F(2)))
check(S == (2, 2), "S(2, 2)")
for x in rats:
    Mp = (x + S[0], -2 * x * x + S[1])
    check(Mp[1] == f(Mp[0]), "t(P1) in P")
    N = (x, f(x))
    check((N[1] - S[1]) == -2 * (N[0] - S[0]) ** 2, "every point of P comes from P1")
check((F(0) + S[0], -2 * F(0) ** 2 + S[1]) == S, "the vertex O of P1 is sent onto S")
# 2. a) variations by the canonical form
le = [x for x in grid if x <= 2]; ge = [x for x in grid if x >= 2]
check(all(f(le[i]) < f(le[i + 1]) for i in range(len(le) - 1)), "f croissante sur ]-inf, 2]")
check(all(f(ge[i]) > f(ge[i + 1]) for i in range(len(ge) - 1)), "f decroissante sur [2, +inf[")
for a in rats[:80]:
    for b in rats[80:160]:
        lo, hi = min(a, b), max(a, b)
        if hi <= 2:
            check((lo - 2) ** 2 >= (hi - 2) ** 2, "a <= b <= 2 => (a-2)^2 >= (b-2)^2")
        if lo >= 2:
            check((lo - 2) ** 2 <= (hi - 2) ** 2, "2 <= a <= b => (a-2)^2 <= (b-2)^2")
# 2. b) intersections with the axes, sign
qa, qb, qc = coeffs(lambda x: f(x) / -2)
check(all(f(x) / -2 == qa * x * x + qb * x + qc for x in rats) and (qa, qb, qc) == (1, -4, 3), "f(x) = 0 <=> x^2 - 4x + 3 = 0")
d, rts = roots_by_discriminant(qa, qb, qc)
check(d == 4 and rts == [1, 3] and all(f(r) == 0 for r in rts), "discriminant 16 - 12 = 4, roots 1 and 3")
check([x for x in grid if f(x) == 0] == [F(1), F(3)], "P cuts (Ox) only at (1,0), (3,0)")
check(f(F(0)) == -6 and f(F(4)) == -6, "(0,-6) and (4,-6) on P")
check(all((f(x) >= 0) == (1 <= x <= 3) for x in rats + grid), "f(x) >= 0 <=> x in [1, 3]")
# 2. c) P' : y = -f(x)
mf = lambda x: -f(x)
for x in rats + grid:
    check(mf(x) == 2 * (x - 2) ** 2 - 2, "-f(x) = 2(x-2)^2 - 2")
    check(mf(x) >= -2 and ((mf(x) == -2) == (x == 2)), "sommet S'(2, -2): minimum of -f")
    check(mf(4 - x) == mf(x), "axe x = 2 for P'")
    check(f(x) == -mf(x), "(x, -y) on P when (x, y) on P'")

# ---------- Ex1 Partie B : g(x) = sqrt(x + 4), D : y = x + 2
g = lambda x: math.sqrt(x + 4)
line = lambda x: x + 2
check([g(v - 4) for v in (0, 1, 4, 9)] == [math.sqrt(v) for v in (0, 1, 4, 9)] == [0, 1, 2, 3],
      "Gamma0 points (0,0), (1,1), (4,2), (9,3) shifted to (-4,0), (-3,1), (0,2), (5,3)")
fx = [-4 + k / 200 for k in range(0, 4001)]
check(all(g(fx[i]) < g(fx[i + 1]) for i in range(len(fx) - 1)), "g croissante sur [-4, +inf[")
for x in [k / 7 for k in range(0, 300)]:
    check(math.isclose(g(x - 4), math.sqrt(x)), "translation -4i sends (x, sqrt x) to (x - 4, sqrt x) on Gamma")
# 2. a) sqrt(x + 4) = x + 2
for x in rats:
    check((x + 4) - (x + 2) ** 2 == -x * (x + 3), "x + 4 - (x+2)^2 = -(x^2 + 3x) = -x(x+3)")
check([x for x in grid if x * (x + 3) == 0] == [F(-3), F(0)], "x(x + 3) = 0 <=> x in {-3, 0}")
check(line(-3) < 0 and g(-3) == 1 and g(-3) != line(-3), "-3 rejected: sqrt(1) = 1 but -3 + 2 = -1 < 0")
check(g(0) == 2 == line(0), "x = 0 is a solution: point (0, 2)")
sols = [x for x in grid if x >= -4 and line(x) >= 0 and x + 4 == line(x) ** 2]
check(sols == [F(0)], "only solution 0 (exact squares)")
check([line(F(v)) for v in (-4, -2, 0)] == [-2, 0, 2], "D passes through (-4,-2), (-2,0), (0,2)")
# 2. b) sqrt(x + 4) > x + 2 <=> x in [-4, 0[
for x in fx:
    if abs(x) > 1e-9:
        check((g(x) > line(x)) == (x < 0), "g(x) > x + 2 <=> x in [-4, 0[")
for x in grid:
    if x >= -4:
        exact = (line(x) < 0) or (x + 4 > line(x) ** 2)
        check(exact == (x < 0), "case analysis: x < -2, or x >= -2 and x^2 + 3x < 0")
        if x >= -2:
            check((x + 4 > line(x) ** 2) == (-3 < x < 0), "x^2 + 3x < 0 <=> -3 < x < 0")

# ---------- Ex2 : lens, phi(x) = 10x/(x - 10), x > 10
phi = lambda x: 10 * x / (x - 10)
nz = [x for x in rats + grid if x != 10] + [F(k, 3) for k in range(31, 400)]
for x in nz:
    check(phi(x) == 10 + F(100) / (x - 10), "phi(x) = 10 + 100/(x - 10)")
    X, Y = x - 10, phi(x) - 10
    check(Y == 100 / X, "Y = 100/X in the frame (Omega, i, j), Omega(10, 10)")
    check(phi(20 - x) == 20 - phi(x), "Omega(10, 10) is a centre of symmetry of H")
for X in rats:
    if X != 0:
        check(phi(X + 10) == 100 / X + 10, "Y = 100/X gives a point of H")
ca, cb, cc, cd = 10, 0, 1, -10
check(all((ca * x + cb) / (cc * x + cd) == phi(x) for x in nz) and (F(-cd, cc), F(ca, cc)) == (10, 10),
      "phi = (10x + 0)/(1x - 10): centre (-d/c, a/c) = (10, 10)")
for a in nz[:80]:
    for b in nz[80:160]:
        check(phi(a) - phi(b) == 100 * (b - a) / ((a - 10) * (b - 10)), "phi(a) - phi(b) identity")
big = [F(k, 4) for k in range(41, 2000)]           # x in ]10, 500[
check(all(phi(big[i]) > phi(big[i + 1]) for i in range(len(big) - 1)), "phi decroissante sur ]10, +inf[")
check([phi(F(v)) for v in (12, 15, 20, 30, 60)] == [60, 30, 20, 15, 12], "points of H")
gamma = lambda x: 10 / (x - 10)
for x in big:
    check(phi(x) > 10, "image beyond 10 cm")
    check(phi(x) - x == x * (20 - x) / (x - 10), "phi(x) - x = x(20 - x)/(x - 10)")
    check((phi(x) > x) == (x < 20) and (phi(x) == x) == (x == 20), "position of H and y = x")
    check(phi(x) / x == gamma(x), "gamma = y/x = 10/(x - 10)")
    check((gamma(x) == 2) == (x == 15), "gamma = 2 <=> x = 15")
    dd = x + phi(x)
    check(dd == x * x / (x - 10) and dd - 40 == (x - 20) ** 2 / (x - 10), "d(x) = x^2/(x-10), d - 40 = (x-20)^2/(x-10)")
    check(dd >= 40 and ((dd == 40) == (x == 20)), "min d = 40 at x = 20")
    check((dd == 45) == (x in (15, 30)), "d = 45 <=> x in {15, 30}")
    check(dd != 35, "d = 35 impossible")
check(phi(F(20)) == 20, "x = 20 : y = 20, point (20, 20)")
check(sorted(set(x for x in nz if phi(x) == x)) == [0, 20] and [x for x in big if phi(x) == x] == [20],
      "phi(x) = x <=> x(x - 20) = 0 <=> x in {0, 20}, only 20 > 10")
# gamma curve: a/(x + alpha) with a = 10, alpha = -10
al = -10
for x in nz:
    check(10 / (x + al) == gamma(x), "gamma(x) = a/(x + alpha), a = 10, alpha = -10")
    check(gamma(2 * (-al) - x) == -gamma(x), "centre (-alpha, 0) = (10, 0): symmetric point of the gamma curve")
    check(gamma(x) != 0, "y = 0 never reached")
check(phi(F(15)) == 30 and phi(F(15)) / 15 == 2, "x = 15 -> screen at 30 cm, y/x = 2")
# 4. c) d(x) = 45 <=> x^2 - 45x + 450 = 0
na, nb, nc = coeffs(lambda x: x * x - 45 * (x - 10))
check((na, nb, nc) == (1, -45, 450), "x^2 = 45(x - 10) <=> x^2 - 45x + 450 = 0")
d45, r45 = roots_by_discriminant(na, nb, nc)
check(d45 == 225 and r45 == [15, 30] and all(r > 10 for r in r45), "discriminant 2025 - 1800 = 225, roots 15 and 30")
check([r + phi(r) for r in r45] == [45, 45] and phi(F(15)) == 30 and phi(F(30)) == 15, "15 + 30 = 45 both ways")

print(f"all {ok} checks passed")
