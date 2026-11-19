"""Checks every value and identity used in exercises T2 ch3 (2ème Sciences, généralités sur les fonctions)."""
from fractions import Fraction as F
import math, random

random.seed(3)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]
grid = [F(k, 8) for k in range(-80, 81)]

# ---------- Ex1 : f(x) = (x^2 - 1)/(x^2 + 1)
f = lambda x: (x * x - 1) / (x * x + 1)
fsq = lambda s: (s - 1) / (s + 1)          # f(x) written with s = x^2 (for x = sqrt3)
check(f(F(0)) == -1 and f(F(2)) == F(3, 5), "f(0) = -1, f(2) = 3/5")
check(fsq(F(3)) == F(1, 2) and math.isclose(f(math.sqrt(3)), 0.5), "f(sqrt3) = 1/2")
# 1. c) points
check(f(F(-2)) == F(3, 5), "A(-2, 3/5) on C")
check(f(F(1, 2)) == F(-3, 5), "B(1/2, -3/5) on C")
check(f(F(3)) == F(4, 5) and f(F(3)) != F(9, 10), "C(3, 9/10) not on C, f(3) = 4/5")
# 2. antecedents: f(x) = k  <=>  x^2 (1 - k) = 1 + k
def antecedents_sq(k):
    if k == 1: return None                 # equation -1 = 1, impossible
    s = (1 + k) / (1 - k)
    return s if s >= 0 else None
check(antecedents_sq(F(0)) == 1 and f(F(1)) == 0 and f(F(-1)) == 0, "antecedents of 0: -1, 1")
check([x for x in grid if f(x) == 0] == [F(-1), F(1)], "f(x) = 0 only at -1 and 1 (grid)")
check(antecedents_sq(F(1, 2)) == 3 and math.isclose(f(-math.sqrt(3)), 0.5), "antecedents of 1/2: -sqrt3, sqrt3")
check(antecedents_sq(F(1)) is None and all(f(x) != 1 for x in rats + grid), "1 has no antecedent")
check(antecedents_sq(F(-1)) == 0 and [x for x in grid if f(x) == -1] == [F(0)], "antecedent of -1: 0")
# fsq strictly increasing in s >= 0, so each s >= 0 gives exactly one value (x = +-sqrt s)
sq = [F(k, 4) for k in range(0, 200)]
check(all(fsq(sq[i]) < fsq(sq[i + 1]) for i in range(len(sq) - 1)), "f(x) determined by x^2 injectively")
# 3. parity
for x in rats:
    check(f(-x) == f(x), "f paire")
# 4. a) b)
for x in rats:
    check(f(x) == 1 - F(2) / (x * x + 1), "f(x) = 1 - 2/(x^2+1)")
for a in rats[:60]:
    for b in rats[60:120]:
        check(f(a) - f(b) == 2 * (a - b) * (a + b) / ((a * a + 1) * (b * b + 1)), "f(a) - f(b) identity")
pos = [x for x in grid if x >= 0]
neg = [x for x in grid if x <= 0]
check(all(f(pos[i]) < f(pos[i + 1]) for i in range(len(pos) - 1)), "f croissante sur [0, +inf[")
check(all(f(neg[i]) > f(neg[i + 1]) for i in range(len(neg) - 1)), "f decroissante sur ]-inf, 0]")
# 5. a) minimum -1 at 0
for x in rats + grid:
    check(f(x) + 1 == 2 * x * x / (x * x + 1), "f(x) + 1 = 2x^2/(x^2+1)")
    check(f(x) >= -1 and ((f(x) == -1) == (x == 0)), "min -1 only at 0")
# 5. b) f < 1 and no maximum
for x in rats + grid:
    check(1 - f(x) == F(2) / (x * x + 1) and f(x) < 1, "f(x) < 1")
for a in rats + grid:
    b = abs(a) + 1
    check(f(b) - f(abs(a)) == 2 * (2 * abs(a) + 1) / ((b * b + 1) * (a * a + 1)), "f(|a|+1) - f(|a|) formula")
    check(f(b) > f(a), "f(|a|+1) > f(a): no maximum")
# 5. c) on [-2, 3]
sub = [F(k, 40) for k in range(-80, 121)]
vals = [f(x) for x in sub]
check(max(vals) == F(4, 5) and [x for x in sub if f(x) == F(4, 5)] == [F(3)], "max on [-2,3] = 4/5 at 3")
check(min(vals) == -1 and [x for x in sub if f(x) == -1] == [F(0)], "min on [-2,3] = -1 at 0")
check(f(F(-2)) == F(3, 5) < F(4, 5), "f(-2) = 3/5 < f(3)")
# 6. f(x) <= 3/5 <=> -2 <= x <= 2
for x in rats + grid:
    check((f(x) <= F(3, 5)) == (-2 <= x <= 2), "f(x) <= 3/5 <=> x in [-2, 2]")
    check((5 * (x * x - 1) <= 3 * (x * x + 1)) == (x * x <= 4), "5(x^2-1) <= 3(x^2+1) <=> x^2 <= 4")
check([x for x in grid if f(x) == F(3, 5)] == [F(-2), F(2)], "f(x) = 3/5 at -2 and 2")

# ---------- Ex2 : square ABCD of side 6, AM = BN = CP = DQ = x
def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def n2(u): return dot(u, u)
def shoelace(*pts):
    s = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2
A, B, C, D = (F(0), F(0)), (F(6), F(0)), (F(6), F(6)), (F(0), F(6))
S = lambda x: 2 * x * x - 12 * x + 36
T = lambda x: 12 * x - 2 * x * x
xs = [F(k, 8) for k in range(0, 49)]
for x in xs:
    M, N, P, Q = (x, F(0)), (F(6), x), (6 - x, F(6)), (F(0), 6 - x)
    check(n2(vec(A, M)) == x * x and n2(vec(B, N)) == x * x and n2(vec(C, P)) == x * x and n2(vec(D, Q)) == x * x,
          "AM = BN = CP = DQ = x")
    check(n2(vec(A, Q)) == (6 - x) ** 2, "AQ = 6 - x")
    side2 = n2(vec(M, N))
    check(side2 == n2(vec(N, P)) == n2(vec(P, Q)) == n2(vec(Q, M)), "MNPQ four equal sides")
    check(dot(vec(M, N), vec(M, Q)) == 0, "MNPQ right angle at M (it is a square)")
    check(n2(vec(M, Q)) == x * x + (6 - x) ** 2 == S(x), "S(x) = MQ^2 = 2x^2 - 12x + 36")
    check(shoelace(M, N, P, Q) == S(x), "area of MNPQ = S(x)")
    tri = shoelace(A, M, Q) + shoelace(B, N, M) + shoelace(C, P, N) + shoelace(D, Q, P)
    check(n2(vec(B, M)) == n2(vec(C, N)) == n2(vec(D, P)) == (6 - x) ** 2, "BM = CN = DP = 6 - x")
    for t in ((A, M, Q), (B, N, M), (C, P, N), (D, Q, P)):
        check(shoelace(*t) == x * (6 - x) / 2, "each triangle has area x(6-x)/2")
    check(tri == T(x) and S(x) + T(x) == 36, "T(x) = 12x - 2x^2 = 36 - S(x)")
for a in rats[:60]:
    for b in rats[60:120]:
        check(S(a) - S(b) == 2 * (a - b) * (a + b - 6), "S(a) - S(b) identity")
left = [x for x in xs if x <= 3]; right = [x for x in xs if x >= 3]
check(all(S(left[i]) > S(left[i + 1]) for i in range(len(left) - 1)), "S decroissante sur [0,3]")
check(all(S(right[i]) < S(right[i + 1]) for i in range(len(right) - 1)), "S croissante sur [3,6]")
for x in rats + xs:
    check(S(x) - 18 == 2 * (x - 3) ** 2, "S(x) - 18 = 2(x-3)^2")
check(min(S(x) for x in xs) == 18 and [x for x in xs if S(x) == 18] == [F(3)], "min S = 18 at 3")
check(2 * S(F(3)) == shoelace(A, B, C, D), "S(3) = half of the area of ABCD")
check(all(S(x) <= 36 for x in xs) and [x for x in xs if S(x) == 36] == [F(0), F(6)], "max S = 36 at 0 and 6")
for x in rats:
    check((S(x) <= 36) == (0 <= x <= 6) and S(x) - 36 == 2 * x * (x - 6), "S(x) <= 36 <=> 2x(x-6) <= 0")
check([S(F(k)) for k in range(7)] == [36, 26, 20, 18, 20, 26, 36], "table S")
check([T(F(k)) for k in range(7)] == [0, 10, 16, 18, 16, 10, 0], "table T")
for x in rats + xs:
    check(S(x) - T(x) == 4 * (x - 3) ** 2, "S - T = 4(x-3)^2")
check(all(S(x) >= T(x) for x in xs) and [x for x in xs if S(x) == T(x)] == [F(3)], "C_S above C_T, contact at 3")
check(S(F(3)) == T(F(3)) == 18, "common point (3, 18)")
# 5. S(x) = 20 and S(x) <= 20
# coefficients of (S(x) - 20)/2 = x^2 - 6x + 8, read off the function S
q = lambda x: (S(x) - 20) / 2
qc = q(F(0)); qa = (q(F(1)) + q(F(-1)) - 2 * qc) / 2; qb = (q(F(1)) - q(F(-1))) / 2
check(all(q(x) == qa * x * x + qb * x + qc for x in rats) and (qa, qb, qc) == (1, -6, 8), "(S(x) - 20)/2 = x^2 - 6x + 8")
dq = qb * qb - 4 * qa * qc
check(dq == 4 and math.isqrt(int(dq)) ** 2 == dq, "discriminant 36 - 32 = 4")
check(((-qb - 2) / (2 * qa), (-qb + 2) / (2 * qa)) == (2, 4), "roots (6 - 2)/2 = 2 and (6 + 2)/2 = 4")
for x in rats + xs:
    check(S(x) - 20 == 2 * (x - 2) * (x - 4), "S(x) - 20 = 2(x-2)(x-4)")
check([x for x in xs if S(x) == 20] == [F(2), F(4)], "S(x) = 20 <=> x in {2, 4}")
check(all((S(x) <= 20) == (2 <= x <= 4) for x in xs), "S(x) <= 20 <=> x in [2, 4]")
# 6. perimeter p(x) = 4 sqrt(S(x))
p = lambda x: 4 * math.sqrt(S(x))
fx = [k / 100 for k in range(0, 601)]
lf = [x for x in fx if x <= 3]; rf = [x for x in fx if x >= 3]
check(all(p(lf[i]) > p(lf[i + 1]) for i in range(len(lf) - 1)), "p decroissante sur [0,3]")
check(all(p(rf[i]) < p(rf[i + 1]) for i in range(len(rf) - 1)), "p croissante sur [3,6]")
check(math.isclose(p(3), 12 * math.sqrt(2)) and round(p(3), 2) == 16.97 and p(0) == 24 and p(6) == 24, "p(3) = 12 sqrt2 ~ 16.97, p(0) = 24")
check(S(F(3)) == 3 ** 2 * 2, "S(3) = 18 = 3^2 * 2, so sqrt(S(3)) = 3 sqrt2 and p(3) = 12 sqrt2")

print(f"all {ok} checks passed")
