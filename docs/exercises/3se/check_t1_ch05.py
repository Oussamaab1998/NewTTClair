"""Checks every value and identity used in exercises T1 ch5 (3ème Sc. exp., Nombre dérivé)."""
from fractions import Fraction as F
import math, random

random.seed(5)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]
grid = [F(k, 8) for k in range(-80, 81)]
smallh = [F(s, 10 ** k) for k in range(2, 9) for s in (1, -1, 3, -7)]
close = lambda a, b, tol=1e-9: abs(a - b) <= tol * max(1.0, abs(b))

# ---------- Ex1 Q1 : f(x) = (2x - 1)/(x + 1)
f = lambda x: (2 * x - 1) / (x + 1)
check(f(F(0)) == -1, "f(0) = -1")
for h in rats + grid + smallh:
    if h not in (0, -1):
        check((f(h) - f(F(0))) / h == 3 / (h + 1), "rate at 0 = 3/(h+1)")
    if h != -1:
        check(f(h) == -1 + 3 * h - 3 * h * h / (1 + h), "f(h) = -1 + 3h - 3h^2/(1+h)")
check(3 / (F(0) + 1) == 3, "f'(0) = 3")
check(all(abs((f(h) - f(F(0))) / h - 3) <= 4 * abs(h) for h in smallh), "rate -> 3")
h = F(1, 100)
check(f(h) == F(-98, 101), "f(0.01) = -98/101")
check(-1 + 3 * h == F(-97, 100), "approx -0.97")
err = abs(f(h) - F(-97, 100))
check(err == F(3, 10100) and err == F(3, 10000) / F(101, 100) and err < F(3, 10000), "error 0.0003/1.01 < 0.0003")
check(abs(float(f(h)) + 0.970297) < 1e-6, "f(0.01) ~ -0.970297")
# f'(a) = 3/(a+1)^2 : exact rate (f(a+h)-f(a))/h = 3/((a+1)(a+1+h))
for a in rats[:60]:
    if a == -1: continue
    for hh in smallh[:12] + rats[60:80]:
        if hh != 0 and a + hh != -1:
            check((f(a + hh) - f(a)) / hh == 3 / ((a + 1) * (a + 1 + hh)), "rate at a")
    check((2 * (a + 1) - (2 * a - 1)) / (a + 1) ** 2 == 3 / (a + 1) ** 2, "quotient rule numerator = 3")
sol = sorted(a for a in grid if a != -1 and 3 / (a + 1) ** 2 == 3)
check(sol == [F(-2), F(0)], "f'(a) = 3 <=> a in {-2, 0}")
check(f(F(-2)) == 5, "f(-2) = 5")
check(all(3 * (x + 2) + 5 == 3 * x + 11 for x in rats), "tangent at -2 : y = 3x + 11")
check(all(3 * (x - 0) + f(F(0)) == 3 * x - 1 for x in rats), "tangent at 0 : y = 3x - 1")

# ---------- Ex1 Q2 : g(x) = sqrt(x + 3)
g = lambda x: math.sqrt(x + 3)
for hh in [float(v) for v in rats + grid + smallh if v >= -4 and v != 0]:
    check(close((g(1 + hh) - g(1)) / hh, 1 / (math.sqrt(4 + hh) + 2), 1e-6), "rate of g at 1 (conjugate)")
check(1 / (math.sqrt(4) + 2) == 0.25 and 1 / (2 * math.sqrt(4)) == 0.25, "g'(1) = 1/4")
check(F(2) + F(2, 100) / 4 == F(2005, 1000), "sqrt(4.02) ~ 2.005")
check(F(2) + F(-4, 100) / 4 == F(199, 100), "sqrt(3.96) ~ 1.99")
check(abs(math.sqrt(4.02) - 2.005) < 1e-5 and abs(math.sqrt(3.96) - 1.99) < 5e-5, "approximations are good")
check(abs(math.sqrt(4.02) - 2.004994) < 1e-6 and abs(math.sqrt(3.96) - 1.989975) < 1e-6, "calculator values")
check(all(close((g(-3 + e) - g(-3)) / e, 1 / math.sqrt(e), 1e-6) for e in [2.0 ** -k for k in range(1, 30)]), "rate at -3 = 1/sqrt(h)")
check(all(1 / math.sqrt(e) > 10 ** (k / 2 - 0.01) for k, e in [(k, 10.0 ** -k) for k in range(2, 12)]), "1/sqrt(h) -> +inf")

# ---------- Ex1 Q3
u = lambda x: math.sqrt(x + 7)
check(u(2) == 3 and 1 / (2 * math.sqrt(9)) == 1 / 6, "u(2) = 3, u'(2) = 1/6")
check(all(abs((u(2 + e) - 3) / e - 1 / 6) < abs(e) for e in [10.0 ** -k * s for k in range(2, 7) for s in (1, -1)]), "limit 1/6")
for x in rats + grid:
    check((2 * x + 1) ** 4 - 1 == x * (16 * x ** 3 + 32 * x ** 2 + 24 * x + 8), "((2x+1)^4 - 1)/x = 16x^3 + 32x^2 + 24x + 8")
check(4 * 2 * 1 ** 3 == 8, "v'(0) = 8")

# ---------- Ex1 Q4 : k(x) = (x - 1)|x + 2|
k = lambda x: (x - 1) * abs(x + 2)
check(k(F(-2)) == 0, "k(-2) = 0")
for hh in rats + grid + smallh:
    if hh == 0: continue
    check(k(-2 + hh) == (hh - 3) * abs(hh), "k(-2+h) = (h-3)|h|")
    r = (k(-2 + hh) - k(F(-2))) / hh
    if hh > 0: check(r == hh - 3, "right rate = h - 3")
    else: check(r == 3 - hh, "left rate = 3 - h")
check(F(0) - 3 == -3 and 3 - F(0) == 3, "k'_d(-2) = -3, k'_g(-2) = 3")
check(all(-3 * (x + 2) == -3 * x - 6 and 3 * (x + 2) == 3 * x + 6 for x in rats), "half-tangents")

# ---------- Ex2 : toboggan
# continuity at 2 : 2m + 4 = 4k <=> m = 2k - 2
for kk in rats[:50]:
    for mm in rats[50:100] + [2 * kk - 2]:
        check((2 * mm + 4 == kk * (2 - 4) ** 2) == (mm == 2 * kk - 2), "continuity condition")
    # right rate at 2, assuming f(2) = 4k
    for hh in [abs(v) for v in smallh] + [F(1, 2), F(2)]:
        check((kk * (hh - 2) ** 2 - 4 * kk) / hh == kk * (hh - 4), "right rate at 2 = k(h - 4)")
    for hh in [-abs(v) for v in smallh]:
        mm = 2 * kk - 2
        check(((mm * (2 + hh) + 4) - (2 * mm + 4)) / hh == mm, "left rate at 2 = m")
# derivable at 2 : m = -4k and m = 2k - 2
K = F(1, 3); M = F(-4, 3)
check(M == -4 * K and M == 2 * K - 2 and K > 0, "k = 1/3, m = -4/3")
check([kk for kk in [F(i, 12) for i in range(-60, 61)] if 2 * kk - 2 == -4 * kk] == [F(1, 3)], "unique k")
def fb(x):
    return M * x + 4 if x <= 2 else K * (x - 4) ** 2
check(fb(F(2)) == F(4, 3) and K * (2 - 4) ** 2 == F(4, 3), "f(2) = 4/3 both sides")
check(fb(F(0)) == 4 and fb(F(4)) == 0, "D(0,4), B(4,0)")
check(all(M * (x - 2) + F(4, 3) == M * x + 4 for x in rats), "tangent at E = line y = -4x/3 + 4")
for hh in [-abs(v) for v in smallh] + [F(-1), F(-2)]:
    check((fb(4 + hh) - fb(F(4))) / hh == hh / 3, "left rate at 4 = h/3")
for hh in [abs(v) for v in smallh] + [F(1), F(2)]:
    check((fb(hh) - fb(F(0))) / hh == M, "right rate at 0 = m")
# f'(a) = (2/3)(a - 4) on ]2,4[ : exact rate = k(2(a-4) + h)
for a in [F(i, 16) for i in range(33, 64)]:
    for hh in smallh:
        if 2 < a + hh <= 4:
            check((fb(a + hh) - fb(a)) / hh == K * (2 * (a - 4) + hh), "rate on ]2,4[")
    check(2 * K * (a - 4) == F(2, 3) * (a - 4), "f'(a) = (2/3)(a-4)")
sol = [a for a in [F(i, 16) for i in range(33, 64)] if F(2, 3) * (a - 4) == -1]
check(sol == [F(5, 2)], "tangent parallel to y = -x at a = 2.5 only")
check(M != -1 and 0 != -1, "no other point (slope -4/3 on [0,2], 0 at 4)")
check(fb(F(5, 2)) == F(3, 4), "F(2.5, 0.75)")
check(all(-(x - F(5, 2)) + F(3, 4) == -x + F(13, 4) for x in rats), "tangent at F : y = -x + 3.25")
# question 5
for hh in [F(i, 20) for i in range(-19, 21)] + smallh:
    if -1 < hh <= 1:
        check(fb(3 + hh) == F(1, 3) - F(2, 3) * hh + F(1, 3) * hh * hh, "f(3+h) expansion")
check(fb(F(3)) == F(1, 3) and F(2, 3) * (3 - 4) == F(-2, 3), "f(3) = 1/3, f'(3) = -2/3")
h = F(3, 100)
approx = F(1, 3) - F(2, 3) * h
check(approx == F(1, 3) - F(2, 100), "approx = 1/3 - 0.02")
check(abs(float(approx) - 0.3133) < 5e-5, "approx ~ 0.3133")
check(fb(F(303, 100)) == F(9409, 30000) and abs(float(fb(F(303, 100))) - 0.3136) < 5e-5, "exact f(3.03) = 0.9409/3")
check(fb(F(303, 100)) - approx == F(3, 10000), "error = 0.0003 exactly")

print(f"all {ok} checks passed")
