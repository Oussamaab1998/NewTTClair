"""Checks every value, identity and solution set used in exercises T2 ch3 (3ème Sc. exp., trigonométrie).

Identities: tested on many sample angles.  Equations: each listed solution is plugged in,
and a fine grid over one period (sign changes refined by bisection) shows there is no other.
Inequations: every grid point is tested against the claimed solution set.
"""
from fractions import Fraction as F
import math, random

random.seed(3)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

PI = math.pi
cos, sin, tan, sqrt = math.cos, math.sin, math.tan, math.sqrt
def near(a, b, tol=1e-9): return abs(a - b) < tol
samples = [random.uniform(-20, 20) for _ in range(2000)] + [k * PI / 24 for k in range(-100, 101)]

def roots(g, a, b, n=200000):
    """All roots of g in [a, b) found by sign change on a grid of n steps, refined by bisection."""
    out = []
    h = (b - a) / n
    x0, g0 = a, g(a)
    for i in range(1, n + 1):
        x1 = a + i * h
        g1 = g(x1)
        if g0 == 0:
            out.append(x0)
        elif g0 * g1 < 0:
            lo, hi = x0, x1
            for _ in range(100):
                mid = (lo + hi) / 2
                if g(lo) * g(mid) <= 0: hi = mid
                else: lo = mid
            out.append((lo + hi) / 2)
        x0, g0 = x1, g1
    return out

def same_list(found, expected, tol=1e-7):
    return len(found) == len(expected) and all(abs(f - e) < tol for f, e in zip(sorted(found), sorted(expected)))

def ineq_ok(pred, a, b, intervals, n=200000, left_open=False, right_open=False):
    """pred(x) must hold exactly on the union of closed intervals, for grid points of [a, b]."""
    ends = [e for iv in intervals for e in iv]
    for i in range(n + 1):
        x = a + (b - a) * i / n
        if (left_open and i == 0) or (right_open and i == n):
            continue
        if any(abs(x - e) < 1e-7 for e in ends):
            continue
        inside = any(lo <= x <= hi for lo, hi in intervals)
        if pred(x) != inside:
            return False
    return True

# ---------- Ex1 Q1 : pi/12 = pi/3 - pi/4
check(F(1, 3) - F(1, 4) == F(1, 12), "pi/12 = pi/3 - pi/4")
c12, s12 = (sqrt(6) + sqrt(2)) / 4, (sqrt(6) - sqrt(2)) / 4
check(near(cos(PI / 3) * cos(PI / 4) + sin(PI / 3) * sin(PI / 4), c12), "cos(pi/3 - pi/4) formula value")
check(near(sin(PI / 3) * cos(PI / 4) - cos(PI / 3) * sin(PI / 4), s12), "sin(pi/3 - pi/4) formula value")
check(near(cos(PI / 12), c12) and near(sin(PI / 12), s12), "cos, sin of pi/12")
check(near(cos(5 * PI / 12), s12) and near(sin(5 * PI / 12), c12), "cos, sin of 5pi/12")
check(near(cos(11 * PI / 12), -c12), "cos(11pi/12)")
check(near(tan(PI / 12), 2 - sqrt(3)) and near(s12 / c12, 2 - sqrt(3)), "tan(pi/12) = 2 - sqrt3")
check(near((sqrt(6) - sqrt(2)) ** 2, 8 - 4 * sqrt(3)) and (6 - 2) == 4, "(sqrt6 - sqrt2)^2 = 8 - 4sqrt3")
for x in samples:  # formulas used
    y = random.uniform(-10, 10)
    check(near(cos(x - y), cos(x) * cos(y) + sin(x) * sin(y)), "cos(a - b)")
    check(near(sin(x - y), sin(x) * cos(y) - cos(x) * sin(y)), "sin(a - b)")
    check(near(cos(PI / 2 - x), sin(x)) and near(sin(PI / 2 - x), cos(x)) and near(cos(PI - x), -cos(x)), "angles associes")
# ---------- Ex1 Q2 : cos 3x = 4cos^3 x - 3cos x
for x in samples:
    check(near(cos(3 * x), 4 * cos(x) ** 3 - 3 * cos(x)), "cos 3x")
    check(near(cos(2 * x) * cos(x) - sin(2 * x) * sin(x), (2 * cos(x) ** 2 - 1) * cos(x) - 2 * sin(x) ** 2 * cos(x)), "cos 3x steps")
c9 = cos(PI / 9)
check(near(8 * c9 ** 3 - 6 * c9 - 1, 0), "cos(pi/9) root of 8X^3 - 6X - 1")
# ---------- Ex1 Q3 a : cos(2x - pi/3) = -sqrt2/2
check(near(cos(3 * PI / 4), -sqrt(2) / 2), "-sqrt2/2 = cos(3pi/4)")
check(F(1, 3) + F(3, 4) == F(13, 12) and F(1, 3) - F(3, 4) == F(-5, 12), "2x = 13pi/12 or -5pi/12")
g = lambda x: cos(2 * x - PI / 3) + sqrt(2) / 2
for k in range(-6, 7):
    for base in (13 * PI / 24, -5 * PI / 24):
        check(near(g(base + k * PI), 0), "listed solutions work")
check(same_list(roots(g, 0, PI), [13 * PI / 24, 19 * PI / 24]), "no other solution on one period [0, pi)")
sol = roots(g, -PI, PI)
check(same_list(sol, [-11 * PI / 24, -5 * PI / 24, 13 * PI / 24, 19 * PI / 24]), "solutions in ]-pi, pi]")
check(near(13 * PI / 24 - (-11 * PI / 24), PI) and near(19 * PI / 24 - (-5 * PI / 24), PI), "two pairs of opposite points")
# ---------- Ex1 Q3 b : sin(x + pi/4) >= 1/2 on ]-pi, pi]
check(F(1, 6) - F(1, 4) == F(-1, 12) and F(5, 6) - F(1, 4) == F(7, 12), "bounds -pi/12, 7pi/12")
check(near(sin(-PI / 12 + PI / 4), 0.5) and near(sin(7 * PI / 12 + PI / 4), 0.5), "equality at bounds")
check(ineq_ok(lambda x: sin(x + PI / 4) >= 0.5, -PI, PI, [(-PI / 12, 7 * PI / 12)], left_open=True), "S = [-pi/12, 7pi/12]")
# ---------- Ex1 Q3 c : tan x = -sqrt3 on ]-pi, pi]
for x in (-PI / 3, 2 * PI / 3):
    check(near(tan(x), -sqrt(3)) and abs(cos(x)) > 0.1, "tan solutions")
gt = lambda x: sin(x) + sqrt(3) * cos(x)  # = 0 <=> tan x = -sqrt3 (cos x != 0 there)
check(same_list(roots(gt, -PI, PI), [-PI / 3, 2 * PI / 3]), "only -pi/3 and 2pi/3 in ]-pi, pi]")
check(near(abs(cos(PI / 2)), 0, 1e-15) and near(gt(PI / 2), 1) and near(gt(-PI / 2), -1), "x = +-pi/2 not solutions")
# ---------- Ex1 Q4 : f(x) = sqrt3 cos x - sin x = 2cos(x + pi/6)
f = lambda x: sqrt(3) * cos(x) - sin(x)
for x in samples:
    check(near(f(x), 2 * cos(x + PI / 6)), "f = 2cos(x + pi/6)")
check(near(f(PI / 12), sqrt(2)) and near(sqrt(3) * c12 - s12, sqrt(2)), "f(pi/12) = sqrt2")
check(near(sqrt(3) * sqrt(6), 3 * sqrt(2)) and near(sqrt(3) * sqrt(2), sqrt(6)), "radicals in f(pi/12)")
check(F(1, 4) - F(1, 6) == F(1, 12) and F(-1, 4) - F(1, 6) == F(-5, 12), "x = pi/12 or -5pi/12")
for k in range(-5, 6):
    check(near(f(PI / 12 + 2 * k * PI), sqrt(2)) and near(f(-5 * PI / 12 + 2 * k * PI), sqrt(2)), "listed solutions of f = sqrt2")
check(same_list(roots(lambda x: f(x) - sqrt(2), 0, 2 * PI), [PI / 12, 2 * PI - 5 * PI / 12]), "no other solution on [0, 2pi)")
check(F(2, 3) - F(1, 6) == F(1, 2) and F(4, 3) - F(1, 6) == F(7, 6), "bounds pi/2, 7pi/6")
check(ineq_ok(lambda x: f(x) <= -1, 0, 2 * PI, [(PI / 2, 7 * PI / 6)], right_open=True), "f(x) <= -1 on [0, 2pi[ : [pi/2, 7pi/6]")
check(near(f(PI / 2), -1) and near(f(7 * PI / 6), -1), "equality at bounds")

# ---------- Ex2 : grande roue, R = 8, centre at 10 m, theta(t) = pi t / 15 - pi/2
theta = lambda t: PI * t / 15 - PI / 2
def principal(a):
    while a <= -PI: a += 2 * PI
    while a > PI: a -= 2 * PI
    return a
check(near(principal(theta(0)), -PI / 2) and near(principal(theta(5)), -PI / 6) and near(principal(theta(20)), 5 * PI / 6), "polar angles at t = 0, 5, 20")
check(near(theta(30) - theta(0), 2 * PI), "one turn in 30 min")
N = lambda t: (8 * cos(theta(t)), 8 * sin(theta(t)))
check(near(N(0)[0], 0) and near(N(0)[1], -8), "N(0) = (0, -8), lowest point")
check(near(N(5)[0], 4 * sqrt(3)) and near(N(5)[1], -4), "N(5) = (4sqrt3, -4)")
check(near(N(20)[0], -4 * sqrt(3)) and near(N(20)[1], 4), "N(20) = (-4sqrt3, 4)")
h = lambda t: 10 - 8 * cos(PI * t / 15)
for t in samples:
    check(near(10 + 8 * sin(theta(t)), h(t)), "h(t) = 10 + 8 sin(theta) = 10 - 8cos(pi t/15)")
    check(near(sin(t - PI / 2), -cos(t)), "sin(a - pi/2) = -cos a")
check(near(h(5), 6) and near(h(20), 14), "h(5) = 6, h(20) = 14")
check(near(10 + N(5)[1], 6) and near(10 + N(20)[1], 14), "consistent with cartesian coordinates")
for k in range(-4, 5):
    check(near(h(10 + 30 * k), 14) and near(h(-10 + 30 * k), 14), "t = +-10 + 30k solutions")
check(same_list(roots(lambda t: h(t) - 14, 0, 30), [10, 20]), "no other solution on one period [0, 30)")
check(same_list(roots(lambda t: h(t) - 14, 0, 60.5), [10, 20, 40, 50]), "solutions in [0, 60]")
check(ineq_ok(lambda t: h(t) >= 14, 0, 30, [(10, 20)]), "h >= 14 on [0, 30] <=> t in [10, 20]")
# Q4 chord between neighbouring cabins
for th in samples[:300]:
    P1, P2 = (8 * cos(th), 8 * sin(th)), (8 * cos(th + PI / 4), 8 * sin(th + PI / 4))
    d2 = (P1[0] - P2[0]) ** 2 + (P1[1] - P2[1]) ** 2
    check(near(d2, 128 - 64 * sqrt(2), 1e-8), "NN'^2 = 128 - 64 sqrt2")
    check(near(P1[0] * P2[0] + P1[1] * P2[1], 64 * cos(PI / 4), 1e-8), "OmegaN . OmegaN' = 64 cos(pi/4)")
for a in samples:
    check(near(1 - cos(a), 2 * sin(a / 2) ** 2), "1 - cos a = 2 sin^2(a/2)")
check(near(sqrt(128 - 64 * sqrt(2)), 8 * sqrt(2 - sqrt(2))), "NN' = 8 sqrt(2 - sqrt2)")
check(near(16 * sin(PI / 8), 8 * sqrt(2 - sqrt(2))) and sin(PI / 8) > 0, "NN' = 16 sin(pi/8)")
check(near(sin(PI / 8), sqrt(2 - sqrt(2)) / 2), "sin(pi/8) = sqrt(2 - sqrt2)/2")
check(round(8 * sqrt(2 - sqrt(2)), 2) == 6.12, "NN' ~ 6.12 m")
# Q5 same height : sin(theta + pi/4) = sin(theta)
gs = lambda th: sin(th + PI / 4) - sin(th)
for k in range(-4, 5):
    check(near(gs(3 * PI / 8 + k * PI), 0), "theta = 3pi/8 + k pi solutions")
check(same_list(roots(gs, 0, 2 * PI), [3 * PI / 8, 11 * PI / 8]), "no other solution on one period [0, 2pi)")
check(F(3, 8) + F(1, 2) == F(7, 8) and F(7, 8) * 15 == F(105, 8) == F(13125, 1000), "t = 105/8 = 13.125")
gt5 = lambda t: sin(theta(t) + PI / 4) - sin(theta(t))
check(same_list(roots(gt5, 0, 30.01), [13.125, 28.125]), "t in [0, 30] : 13.125 and 28.125")
check(round(10 + 8 * sin(3 * PI / 8), 2) == 17.39 and round(10 + 8 * sin(11 * PI / 8), 2) == 2.61, "heights 17.39 m, 2.61 m")
check(near(theta(13.125), 3 * PI / 8) and near(theta(28.125), 11 * PI / 8), "theta at those times")

print(f"all {ok} checks passed")
