"""Checks every value and identity used in exercises T1 ch3 (3ème Sc. exp., Limites et continuité)."""
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
close = lambda a, b, tol=1e-9: abs(a - b) <= tol * max(1.0, abs(b))
near = lambda a: [a + s * 10.0 ** (-k) for k in range(3, 8) for s in (1, -1)]

# ---------- Ex1 A 1a : (x^3 - 8)/(x^2 - 4) -> 3 at 2
for x in rats + grid:
    if x not in (2, -2):
        check((x ** 3 - 8) / (x * x - 4) == (x * x + 2 * x + 4) / (x + 2), "1a simplification")
check((F(2) ** 2 + 2 * 2 + 4) / (2 + 2) == 3, "1a limit = 3")
check(all(abs(((x ** 3 - 8) / (x * x - 4)) - 3) < 1e-2 for x in near(2.0)), "1a numeric")

# ---------- Ex1 A 1b : (sqrt(x+3) - 2)/(x - 1) -> 1/4
for x in [float(r) for r in rats + grid if r >= -3 and r != 1]:
    check(close((math.sqrt(x + 3) - 2) / (x - 1), 1 / (math.sqrt(x + 3) + 2)), "1b conjugate")
check(1 / (math.sqrt(4) + 2) == 0.25, "1b limit = 1/4")
check(all(abs((math.sqrt(x + 3) - 2) / (x - 1) - 0.25) < 1e-3 for x in near(1.0)), "1b numeric")

# ---------- Ex1 A 1c : sqrt((x^2-9)/(x-3)) -> sqrt 6
for x in rats + grid:
    if x != 3:
        check((x * x - 9) / (x - 3) == x + 3, "1c simplification")
    if 0 < x < 6 and x != 3:
        check((x * x - 9) / (x - 3) > 0, "1c positive near 3")
check(all(abs(math.sqrt((x * x - 9) / (x - 3)) - math.sqrt(6)) < 1e-3 for x in near(3.0)), "1c numeric")

# ---------- Ex1 A 1d : (x^2+3x+2)/(|x|-1) -> -1 at -1
for x in rats + grid:
    if -2 < x < 0 and x != -1:
        check((x * x + 3 * x + 2) / (abs(x) - 1) == -(x + 2), "1d simplification on ]-2,0[")
check(-(F(-1) + 2) == -1, "1d limit = -1")
check(all(abs((x * x + 3 * x + 2) / (abs(x) - 1) + 1) < 1e-2 for x in near(-1.0)), "1d numeric")

# ---------- Ex1 A 2 : h(x) = (2x^2 + |x|)/x
for x in rats + grid:
    if x > 0: check((2 * x * x + abs(x)) / x == 2 * x + 1, "h = 2x+1 for x>0")
    if x < 0: check((2 * x * x + abs(x)) / x == 2 * x - 1, "h = 2x-1 for x<0")
hh = lambda x: (2 * x * x + abs(x)) / x
check(all(abs(hh(10.0 ** -k) - 1) < 1e-2 for k in range(3, 8)), "right limit 1")
check(all(abs(hh(-10.0 ** -k) + 1) < 1e-2 for k in range(3, 8)), "left limit -1")

# ---------- Ex1 B : f(x) = (x^2 - 3x + 2)/(sqrt x - 1) = (x - 2)(sqrt x + 1)
# exact check with x = t^2, t >= 0 rational, t != 1
for t in [abs(r) for r in rats] + [F(k, 7) for k in range(0, 60)]:
    if t != 1:
        x = t * t
        check((x * x - 3 * x + 2) / (t - 1) == (x - 2) * (t + 1), "B2 identity (exact, x = t^2)")
for x in [float(r) for r in rats + grid if r >= 0 and r != 1]:
    check(close((x * x - 3 * x + 2) / (math.sqrt(x) - 1), (x - 2) * (math.sqrt(x) + 1), 1e-7), "B2 identity (float)")
check((1 - 2) * (1 + 1) == -2, "B3 limit = -2")
check(all(abs((x * x - 3 * x + 2) / (math.sqrt(x) - 1) + 2) < 1e-2 for x in near(1.0)), "B3 numeric")
check((0 - 2) * (0 + 1) == -2, "F(0) = -2")
def f_defined(x):
    try:
        (x * x - 3 * x + 2) / (math.sqrt(x) - 1)
        return True
    except (ValueError, ZeroDivisionError):
        return False
check(all(f_defined(float(x)) == (x >= 0 and x != 1) for x in grid + rats), "D_f = [0,1[ U ]1,+inf[ (by trying to evaluate)")

# ---------- Ex2 : f(x) = (x^2 + ax + b)/(x - 1)
# Q1a : if 1 + a + b != 0, |f| is unbounded near 1 (no finite limit); if 1 + a + b = 0, f stays near a + 2
pairs_bad = [(F(0), F(0)), (F(1), F(1)), (F(-3), F(5)), (F(2), F(-2)), (F(1, 2), F(-7, 3)), (F(-1), F(1, 10))]
for a, b in pairs_bad:
    c = 1 + a + b
    check(c != 0, "pair really has 1 + a + b != 0")
    for k in range(3, 10):
        for s in (1, -1):
            x = 1 + s * F(1, 10 ** k)
            fx = (x * x + a * x + b) / (x - 1)
            check(abs(fx) > abs(c) * 10 ** k / 2, "|f(x)| -> large near 1 when 1 + a + b != 0")
for a in [F(0), F(1), F(-3), F(5, 2)]:
    b = -1 - a
    for k in range(3, 10):
        for s in (1, -1):
            x = 1 + s * F(1, 10 ** k)
            check(abs((x * x + a * x + b) / (x - 1) - (a + 2)) == F(1, 10 ** k), "f -> a + 2 when b = -1 - a")
for a in rats[:40]:
    b = -1 - a
    for x in rats[40:80]:
        if x != 1:
            check(x * x + a * x + b == (x - 1) * (x + 1 + a), "x^2+ax+b = (x-1)(x+1+a) when b = -1-a")
    check(1 + 1 + a == a + 2, "L = a + 2")
sols = [(a, -1 - a) for a in range(-10, 11) if a + 2 == 3]
check(sols == [(1, -2)], "a = 1, b = -2")
for x in rats + grid:
    if x != 1:
        check((x * x + x - 2) / (x - 1) == x + 2, "f(x) = x + 2")
check(F(1) + 2 == 3, "g(1) = 3 = 1 + 2")

# g, x > 1 part
for x in [float(r) for r in rats + grid if r > 1]:
    check(close((math.sqrt(2 * x + 7) - 3) / (x - 1), 2 / (math.sqrt(2 * x + 7) + 3)), "conjugate 2/(sqrt(2x+7)+3)")
check(2 / (math.sqrt(9) + 3) == 1 / 3, "right limit 1/3")
check(all(abs((math.sqrt(2 * x + 7) - 3) / (x - 1) - 1 / 3) < 1e-3 for x in [1 + 10.0 ** -k for k in range(3, 8)]), "right limit numeric")
check([m for m in range(-30, 31) if F(m, 3) == 3] == [9], "m = 9")

def g(x):
    x = float(x)
    if x < 1: return x + 2
    if x == 1: return 3.0
    return 18 / (math.sqrt(2 * x + 7) + 3)
xs_right = [float(r) for r in rats + grid if r > 1] + [1 + 10.0 ** -k for k in range(1, 9)] + [1e6]
check(all(0 < g(x) < 3 for x in xs_right), "0 < g < 3 on ]1,+inf[")
check(all(g(x) < 3 for x in [float(r) for r in rats + grid if r < 1]), "g < 3 on ]-inf,1[")
check(max(g(x) for x in [float(r) for r in rats + grid] + [1.0]) == 3.0, "max 3 at 1")
check(all(math.isclose(9 * (math.sqrt(2 * x + 7) - 3) / (x - 1), g(x), rel_tol=1e-9) for x in [float(r) for r in rats + grid if r > 1]), "g formula with m = 9")
# g(x) = 2
check(g(0) == 2.0, "g(0) = 2")
check(math.isqrt(36) == 6 and 2 * F(29, 2) + 7 == 36 and 18 / (6 + 3) == 2, "g(14.5) = 2 exactly")
check(g(14.5) == 2.0, "g(14.5) = 2 (float)")
# uniqueness on ]1,+inf[ : g strictly decreasing there, so g - 2 changes sign once
pts = [1 + k / 10 for k in range(1, 400)]
check(all(g(pts[i]) > g(pts[i + 1]) for i in range(len(pts) - 1)), "g decreasing on ]1, 41[")
check(sum(1 for i in range(len(pts) - 1) if (g(pts[i]) - 2) * (g(pts[i + 1]) - 2) <= 0) in (1, 2), "one root of g = 2 on ]1,+inf[")
check(all((F(x) + 2 == 2) == (x == 0) for x in grid if x < 1), "x + 2 = 2 only at 0")

print(f"all {ok} checks passed")
