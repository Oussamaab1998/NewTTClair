"""Checks every value and identity used in exercises T1 ch4 (3ème Sc. exp., Limites et comportements asymptotiques)."""
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
grid = [F(k, 8) for k in range(-80, 81)]
close = lambda a, b, tol=1e-9: abs(a - b) <= tol * max(1.0, abs(b))
big = [10.0 ** k for k in range(3, 9)]

# ---------- Ex1 A 1a : -2x^3 + 5x^2 - 7 -> +inf at -inf
P = lambda x: -2 * x ** 3 + 5 * x * x - 7
for x in rats:
    if x != 0:
        check(P(x) == -2 * x ** 3 * (1 - F(5, 2) / x + F(7, 2) / x ** 3), "1a factorisation by -2x^3")
vals = [P(F(-(10 ** k))) for k in range(1, 8)]
check(all(vals[i] < vals[i + 1] for i in range(len(vals) - 1)) and vals[-1] > 10 ** 20, "1a -> +inf")

# ---------- 1b : (3x^2 - x + 4)/(1 - 2x^2) -> -3/2 at +inf
R = lambda x: (3 * x * x - x + 4) / (1 - 2 * x * x)
for x in rats:
    if x != 0 and 1 - 2 * x * x != 0:
        check(R(x) == (3 - 1 / x + 4 / x ** 2) / (1 / x ** 2 - 2), "1b divide by x^2")
check(all(abs(R(x) + 1.5) < 2 / x for x in big), "1b -> -3/2")
check(F(3, -2) == F(-3, 2), "1b value")

# ---------- 1c : (x^2 + 1)/(x + 3) -> -inf at -inf
for x in rats:
    if x != -3:
        check((x * x + 1) / (x + 3) == x - 3 + 10 / (x + 3), "1c division")
check(all((x * x + 1) / (x + 3) < x / 2 for x in [-b for b in big]), "1c -> -inf")

# ---------- 1d : (x + 1)/(x - 3) at 3
check(F(3) + 1 == 4, "numerator -> 4")
check(all((3 - e + 1) / (3 - e - 3) < -1 / e for e in [10.0 ** -k for k in range(2, 9)]), "3^- -> -inf")
check(all((3 + e + 1) / (3 + e - 3) > 1 / e for e in [10.0 ** -k for k in range(2, 9)]), "3^+ -> +inf")

# ---------- 3 : sqrt(x^2 + 4x) - x = 4/(sqrt(1 + 4/x) + 1) -> 2
for x in [float(r) for r in rats + grid if r > 0] + big:
    s = math.sqrt(x * x + 4 * x)
    check(close(s - x, 4 * x / (s + x), 1e-6), "3a conjugate")
    check(close(4 * x / (s + x), 4 / (math.sqrt(1 + 4 / x) + 1)), "3a divide by x")
    check(close(s, x * math.sqrt(1 + 4 / x)), "3a sqrt(x^2(1+4/x)) = x sqrt(1+4/x)")
check(all(abs(4 / (math.sqrt(1 + 4 / x) + 1) - 2) < 4 / x for x in big), "3b limit 2")
check(abs(math.sqrt(1e12 + 4e6) - (1e6 + 2)) < 1e-5, "3b asymptote y = x + 2")

# ---------- Ex1 B : f(x) = (2x^2 - 3x - 1)/(x - 2) = 2x + 1 + 1/(x - 2)
f = lambda x: (2 * x * x - 3 * x - 1) / (x - 2)
a, b, c = 2, 1, 1
check(a == 2 and b - 2 * a == -3 and -2 * b + c == -1, "identification a, b, c")
for x in rats + grid:
    check((2 * x + 1) * (x - 2) + 1 == 2 * x * x - 3 * x - 1, "division")
    if x != 2:
        check(f(x) == a * x + b + F(c) / (x - 2), "f = 2x + 1 + 1/(x-2)")
        check(f(x) - (2 * x + 1) == 1 / (x - 2), "f - (2x+1)")
        check((f(x) > 2 * x + 1) == (x > 2), "position above iff x > 2")
        check(f(x) != 2 * x + 1, "no common point")
        check(4 - x != 2 and f(4 - x) + f(x) == 10, "centre I(2,5)")
        N = (2 * 2 - x, 2 * 5 - f(x))
        check(((x + N[0]) / 2, (f(x) + N[1]) / 2) == (2, 5), "I midpoint of [MN]")
        check(N[0] != 2 and f(N[0]) == N[1], "N(4 - x, 10 - f(x)) on C")
        check((1 / abs(x - 2) < F(1, 100)) == (x < -98 or x > 102), "MP < 0.01")
for x in [F(k) for k in range(-150, 151)] + [F(-98), F(102), F(-981, 10), F(1021, 10)]:
    if x != 2:
        check((1 / abs(x - 2) < F(1, 100)) == (x < -98 or x > 102), "MP < 0.01 (integers + borders)")
check(2 * 2 + 1 == 5, "I = (2, 5)")
check(F(2 * 2 * 2 - 3 * 2 - 1) == 1, "numerator at 2 equals 1 > 0")
fl = lambda x: (2 * x * x - 3 * x - 1) / (x - 2)
check(all(fl(x) > x for x in big) and all(fl(-x) < -x for x in big), "limits at +-inf")
check(all(fl(2 + e) > 1 / (2 * e) for e in [10.0 ** -k for k in range(2, 9)]), "2^+ -> +inf")
check(all(fl(2 - e) < -1 / (2 * e) for e in [10.0 ** -k for k in range(2, 9)]), "2^- -> -inf")

# ---------- Ex2 : d(x) = sqrt(x^2 + 2x + 5), A(-1, 2), M(x, 0)
D2 = lambda x: x * x + 2 * x + 5          # d(x)^2, exact
d = lambda x: math.sqrt(x * x + 2 * x + 5)
for x in rats + grid:
    check((x + 1) ** 2 + (0 - 2) ** 2 == D2(x), "AM^2 = x^2 + 2x + 5")
    check(D2(x) == (x + 1) ** 2 + 4 and D2(x) >= 4, "d^2 >= 4")
    check((D2(x) == 4) == (x == -1), "min only at -1")
    check(D2(-2 - x) == D2(x), "axis x = -1")
    check((x + (-2 - x)) / 2 == -1, "x = -1 is the mediator of Q and Q'")
    check(D2(x) > (x + 1) ** 2, "d > |x + 1|")
    check(D2(x) - (x + 1) ** 2 == 4, "d^2 - (x+1)^2 = 4")
for x in [float(r) for r in rats + grid] + big + [-b for b in big]:
    check(d(x) + x + 1 > 0 and d(x) - x - 1 > 0, "d + x + 1 > 0 and d - x - 1 > 0")
for x in [float(r) for r in rats + grid]:
    check(close(d(x) - (x + 1), 4 / (d(x) + x + 1), 1e-7), "4b identity")
    check(close(d(x) + (x + 1), 4 / (d(x) - x - 1), 1e-7), "4d identity")
check(all(0 < 4 / (d(x) + x + 1) < 4 / x for x in big), "asymptote y = x + 1 at +inf")
check(all(0 < 4 / (d(-x) + x - 1) < 4 / x for x in big), "asymptote y = -x - 1 at -inf")
for x in rats:
    check(-(-2 - x) - 1 == x + 1, "symmetric of Delta is Delta'")
check(d(-1.0) == 2.0, "d(-1) = 2")
check(all(d(x) > x and d(-x) > x - 2 for x in big), "d -> +inf at +-inf (d(x) > |x + 1|)")
# question 5 : d(x) < x + 1.1  <=>  x > 18.95  (x >= -1)
check(F(379, 100) / F(2, 10) == F(1895, 100), "3.79 / 0.2 = 18.95")
check(F(11, 10) ** 2 == F(121, 100) and 2 * F(11, 10) == F(22, 10), "(x + 1.1)^2 expansion")
xs5 = [F(k, 20) for k in range(-20, 801)] + [F(1895, 100), F(18949, 1000), F(18951, 1000)]
for x in xs5:
    check((D2(x) < (x + F(11, 10)) ** 2) == (x > F(1895, 100)), "d(x) - HM < 0.1 <=> x > 18.95 (exact)")
for x in [float(v) for v in xs5 if abs(v - F(1895, 100)) > F(1, 100)]:
    check((d(x) - (x + 1) < 0.1) == (x > 18.95), "d(x) - HM < 0.1 <=> x > 18.95 (float)")
check(D2(F(25)) == 680 and 26 < math.sqrt(680) < 26.1 and abs(math.sqrt(680) - 26.077) < 1e-3, "26 < d(25) < 26.1")

print(f"all {ok} checks passed")
