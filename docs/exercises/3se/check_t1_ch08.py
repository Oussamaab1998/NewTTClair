"""Checks every value and identity used in exercises T1 ch8 (Fonctions trigonometriques, 3eme Sc. exp.)."""
from fractions import Fraction as F
import math, random

random.seed(8)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

pi = math.pi
s3 = math.sqrt(3)
def near(a, b, tol=1e-9):
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))
def numder(fn, x, h=1e-6):
    return (fn(x + h) - fn(x - h)) / (2 * h)
reals = [random.uniform(-20, 20) for _ in range(2000)]

# ---------- Ex1 A : f(x) = cos 2x + sqrt3 sin 2x = 2 cos(2x - pi/3)
f = lambda x: math.cos(2 * x) + s3 * math.sin(2 * x)
fp = lambda x: -4 * math.sin(2 * x - pi / 3)
check(near(math.cos(pi / 3), 0.5) and near(math.sin(pi / 3), s3 / 2), "cos, sin de pi/3")
check(near(math.sqrt(1 + 3), 2), "r = 2")
for x in reals:
    check(near(f(x), 2 * math.cos(2 * x - pi / 3)), "f = 2cos(2x - pi/3)")
    check(near(f(x + pi), f(x)), "periode pi")
    check(near(f(pi / 3 - x), f(x)), "axe x = pi/6")
    check(near(numder(f, x), fp(x), 1e-6), "f' = -4 sin(2x - pi/3)")
    check(-2 - 1e-12 <= f(x) <= 2 + 1e-12, "|f| <= 2")
check(near(2 * pi / 2, pi), "2pi/omega = pi")
vals = {0: 1, pi / 6: 2, pi / 3: 1, 5 * pi / 12: 0, 2 * pi / 3: -2, 11 * pi / 12: 0, pi: 1}
check(all(near(f(x), y, 1e-12) or abs(f(x) - y) < 1e-12 for x, y in vals.items()), "tableau de valeurs")
check(near(fp(0), 2 * s3) and near(fp(pi), 2 * s3), "f'(0) = f'(pi) = 2sqrt3")
check(abs(fp(pi / 6)) < 1e-12 and abs(fp(2 * pi / 3)) < 1e-12, "f' = 0 en pi/6 et 2pi/3")
N = 20000
for k in range(N + 1):
    x = pi * k / N
    if min(abs(x - pi / 6), abs(x - 2 * pi / 3)) < 1e-6:
        continue
    pos = x < pi / 6 or x > 2 * pi / 3
    check((fp(x) > 0) == pos, "signe de f' sur [0, pi]")
    if min(abs(x), abs(x - pi / 3), abs(x - pi)) > 1e-6:
        check((f(x) > 1) == (x < pi / 3), "f(x) >= 1 <=> x in [0, pi/3] U {pi}")
# solutions of f(x) = 1 : x = k pi and x = pi/3 + k pi
for kk in range(-6, 7):
    check(near(f(kk * pi), 1, 1e-9) and near(f(pi / 3 + kk * pi), 1, 1e-9), "solutions de f(x) = 1")
sols = sorted(x for kk in range(-3, 4) for x in (kk * pi, pi / 3 + kk * pi) if -1e-12 <= x <= pi + 1e-12)
check(len(sols) == 3 and abs(sols[0]) < 1e-12 and near(sols[1], pi / 3) and near(sols[2], pi), "solutions dans [0, pi]")
# f(x) = 1 has no other solution than k pi and pi/3 + k pi : fine grid of one period [0, pi]
# |f'| <= 4, so if |f(x_i) - 1| > 4 * step, f - 1 has no zero on [x_i, x_i + step].
# Near 0, pi/3, pi (within delta) f is strictly monotonic (f' != 0 there), so each zero is alone.
step = pi / 200000
delta = 0.01
check(delta < pi / 6 and pi / 3 + delta < 2 * pi / 3 and pi / 3 - delta > pi / 6 and pi - delta > 2 * pi / 3, "voisinages dans les zones de monotonie")
changes = 0
prev = None
for k in range(200001):
    x = k * step
    d = f(x) - 1
    if min(abs(x), abs(x - pi / 3), abs(x - pi)) > delta + step:
        check(abs(d) > 4 * step, "pas d'autre zero de f - 1 sur la grille")
    if prev is not None and k < 200000 and (d > 0) != (prev > 0) and k > 1:
        changes += 1
    prev = d
check(changes == 1, "un seul changement de signe de f - 1 dans ]0, pi[ (en pi/3)")
check(f(1e-4) - 1 > 0 and f(pi - 1e-4) - 1 < 0, "f - 1 > 0 apres 0, < 0 avant pi")
for kk in range(-5, 6):
    check(near(f(kk * pi + 0.123), f(0.123)), "periode pi : les solutions se reproduisent")
# zeros 5pi/12 + k pi/2
for kk in range(-4, 5):
    check(abs(f(5 * pi / 12 + kk * pi / 2)) < 1e-9, "zeros de f")
# monotonicity on [0, pi]
for lo, hi, inc in ((0, pi / 6, True), (pi / 6, 2 * pi / 3, False), (2 * pi / 3, pi, True)):
    ps = [lo + (hi - lo) * i / 500 for i in range(501)]
    check(all((f(ps[i]) < f(ps[i + 1])) == inc for i in range(500)), "monotonie de f")
# tangent and limit
check(near(f(0), 1), "f(0) = 1")
for e in (1e-4, 1e-6, -1e-6):
    check(abs((f(e) - 1) / e - 2 * s3) < 1e-3, "limite (f(x) - 1)/x = 2sqrt3")

# ---------- Ex1 B : g(x) = tan x - x on [0, pi/2[
g = lambda x: math.tan(x) - x
for k in range(1, 400):
    x = (pi / 2) * k / 400 * 0.999
    check(near(numder(math.tan, x), 1 + math.tan(x) ** 2, 1e-5), "tan' = 1 + tan^2")
    check(near(numder(g, x), math.tan(x) ** 2, 1e-5) or abs(numder(g, x) - math.tan(x) ** 2) < 1e-8, "g' = tan^2")
    check(g(x) > 0, "tan x > x sur ]0, pi/2[")
    check(math.tan(-x) - (-x) < 0, "tan x < x sur ]-pi/2, 0[")
    check(near(math.tan(-x), -math.tan(x)), "tan impaire")
ps = [(pi / 2) * k / 1000 * 0.999 for k in range(1001)]
check(all(g(ps[i]) < g(ps[i + 1]) for i in range(1000)), "g strictement croissante")
check(g(0) == 0 and math.tan(0) == 0, "g(0) = 0")
check(g(pi / 2 - 1e-9) > 1e8, "limite +inf en pi/2")
check(near(1 + math.tan(0) ** 2, 1), "tangente y = x en O")

# ---------- Ex2 : h(t) = 20 - 18 cos(pi t / 10)
h = lambda t: 20 - 18 * math.cos(pi * t / 10)
hp = lambda t: (9 * pi / 5) * math.sin(pi * t / 10)
h2 = lambda t: h(t + 10)
check(F(18, 10) == F(9, 5), "18pi/10 = 9pi/5")
check(abs(h(0) - 2) < 1e-12 and abs(h(5) - 20) < 1e-12 and abs(h(10) - 38) < 1e-12, "h(0), h(5), h(10)")
check(abs(h(15) - 20) < 1e-12 and abs(h(20) - 2) < 1e-12, "h(15), h(20)")
check((20 - 18, 20 + 18) == (2, 38), "hauteurs extremes")
check(near(2 * pi / (pi / 10), 20), "periode 20")
for t in reals:
    check(near(h(t + 20), h(t)), "h periodique de periode 20")
    check(near(numder(h, t), hp(t), 1e-6), "h' = (9pi/5) sin(pi t/10)")
    check(near(numder(hp, t), (9 * pi ** 2 / 50) * math.cos(pi * t / 10), 1e-6), "v' = (9pi^2/50) cos(pi t/10)")
    check(abs(hp(t)) <= 9 * pi / 5 + 1e-12, "|v| <= 9pi/5")
    check(near(h2(t), 20 + 18 * math.cos(pi * t / 10)), "h2 = 20 + 18cos")
    check(near(h(t) + h2(t), 40), "h + h2 = 40")
check(F(9, 5) * F(1, 10) == F(9, 50), "9/5 * 1/10 = 9/50")
M = 20000
for k in range(M + 1):
    t = 20 * k / M
    if min(abs(t - c) for c in (0, 5, 10, 15, 20)) < 1e-6:
        continue
    check((hp(t) > 0) == (t < 10), "signe de h'")
    check((math.cos(pi * t / 10) > 0) == (t < 5 or t > 15), "signe de v'")
    check((h(t) > h(t + 10)) == (5 < t < 15), "h = h2 seulement en 5 et 15")
    if min(abs(t - 20 / 3), abs(t - 40 / 3)) > 1e-6:
        check((h(t) > 29) == (20 / 3 < t < 40 / 3), "h >= 29 <=> t in [20/3, 40/3]")
check(abs(h(20 / 3) - 29) < 1e-9 and abs(h(40 / 3) - 29) < 1e-9, "h(20/3) = h(40/3) = 29")
check(near(math.cos(2 * pi / 3), -0.5) and near(math.cos(4 * pi / 3), -0.5), "cos(2pi/3) = cos(4pi/3) = -1/2")
check(near(pi * 20 / 3 / 10, 2 * pi / 3) and near(pi * 40 / 3 / 10, 4 * pi / 3), "u = 2pi/3, 4pi/3")
dur = F(40, 3) - F(20, 3)
check(dur == F(20, 3) and dur * 60 == 400 and divmod(400, 60) == (6, 40), "duree 6 min 40 s")
check(dur == F(20) / 3, "un tiers de tour")
check(round(20 / 3, 2) == 6.67 and round(40 / 3, 2) == 13.33, "valeurs approchees des instants")
check(near(hp(5), 9 * pi / 5) and near(hp(15), -9 * pi / 5) and abs(hp(0)) < 1e-12 and abs(hp(20)) < 1e-12, "v(5), v(15), v(0), v(20)")
ps = [20 * i / 2000 for i in range(2001)]
for lo, hi, inc in ((0, 5, True), (5, 15, False), (15, 20, True)):
    seg = [t for t in ps if lo <= t <= hi]
    check(all((hp(seg[i]) < hp(seg[i + 1])) == inc for i in range(len(seg) - 1)), "monotonie de v")
for lo, hi, inc in ((0, 10, True), (10, 20, False)):
    seg = [t for t in ps if lo <= t <= hi]
    check(all((h(seg[i]) < h(seg[i + 1])) == inc for i in range(len(seg) - 1)), "monotonie de h")
check(round(9 * pi / 5, 2) == 5.65, "9pi/5 ~ 5.65")
check(near(math.cos(1.234 + pi), -math.cos(1.234)), "cos(a + pi) = -cos a")
check([5 + 10 * kk for kk in range(-3, 4) if 0 <= 5 + 10 * kk <= 20] == [5, 15], "t = 5 + 10k dans [0, 20]")
check(abs(h(5) - 20) < 1e-12 and abs(h(15) - 20) < 1e-12, "cabines a 20 m")

print(f"all {ok} checks passed")
