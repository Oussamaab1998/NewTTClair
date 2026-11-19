"""Checks every value and identity used in 2eme Sciences, tome 1, chapitre 2 (premier et second degre)."""
from fractions import Fraction as F
import math, random

random.seed(2)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


class R:
    """Exact number p + q*sqrt(d) with p, q rational and d a fixed non-square integer."""
    def __init__(self, p, q=0, d=5):
        self.p, self.q, self.d = F(p), F(q), d
    def _c(self, o):
        if isinstance(o, R):
            if o.d != self.d:
                raise ValueError("different radicands")
            return o
        return R(o, 0, self.d)
    def __add__(self, o):
        o = self._c(o); return R(self.p + o.p, self.q + o.q, self.d)
    __radd__ = __add__
    def __neg__(self):
        return R(-self.p, -self.q, self.d)
    def __sub__(self, o):
        return self + (-self._c(o))
    def __rsub__(self, o):
        return self._c(o) - self
    def __mul__(self, o):
        o = self._c(o)
        return R(self.p * o.p + self.q * o.q * self.d, self.p * o.q + self.q * o.p, self.d)
    __rmul__ = __mul__
    def inv(self):
        n = self.p * self.p - self.q * self.q * self.d
        return R(self.p / n, -self.q / n, self.d)
    def __truediv__(self, o):
        return self * self._c(o).inv()
    def __rtruediv__(self, o):
        return self._c(o) * self.inv()
    def __pow__(self, n):
        r = R(1, 0, self.d)
        for _ in range(n):
            r = r * self
        return r
    def sign(self):
        p, q, d = self.p, self.q, self.d
        sp, sq = (p > 0) - (p < 0), (q > 0) - (q < 0)
        if sq == 0:
            return sp
        if sp == 0 or sp == sq:
            return sq
        return sp if p * p > q * q * d else sq
    def __eq__(self, o):
        o = self._c(o); return self.p == o.p and self.q == o.q
    def __lt__(self, o): return (self - o).sign() < 0
    def __le__(self, o): return (self - o).sign() <= 0
    def __gt__(self, o): return (self - o).sign() > 0
    def __ge__(self, o): return (self - o).sign() >= 0
    def __abs__(self): return -self if self.sign() < 0 else self
    def __float__(self): return float(self.p) + float(self.q) * math.sqrt(self.d)
    __hash__ = None


rats = [F(random.randint(-90, 90), random.randint(1, 13)) for _ in range(300)]
for d in (3, 5):
    for _ in range(400):
        z = R(F(random.randint(-50, 50), random.randint(1, 9)), F(random.randint(-50, 50), random.randint(1, 9)), d)
        v = float(z.p) + float(z.q) * math.sqrt(d)
        check(z.sign() == ((v > 0) - (v < 0)), "R.sign agrees with floats")

# ---------- Ex1 : f(x) = 2x^2 - 5x - 3
f = lambda x: 2 * x * x - 5 * x - 3
grid = [F(k, 16) for k in range(-96, 97)]
for x in rats:
    check(f(x) == 2 * ((x - F(5, 4)) ** 2 - F(49, 16)), "1a forme canonique 2[(x - 5/4)^2 - 49/16]")
    check(f(x) == 2 * (x - F(5, 4)) ** 2 - F(49, 8), "1a 2(x - 5/4)^2 - 49/8")
    check(f(x) == (2 * x + 1) * (x - 3), "2b f(x) = (2x + 1)(x - 3)")
check(f(F(5, 4)) == F(-49, 8), "1b f(5/4) = -49/8")
for x in grid + rats:
    check(f(x) >= F(-49, 8) and (f(x) == F(-49, 8)) == (x == F(5, 4)), "1b minimum -49/8 atteint en 5/4 seulement")
check((-5) ** 2 - 4 * 2 * (-3) == 49, "2a discriminant 49")
check(F(5 - 7, 4) == F(-1, 2) and F(5 + 7, 4) == 3, "2a racines -1/2 et 3")
check(f(F(-1, 2)) == 0 and f(F(3)) == 0, "2a f(-1/2) = f(3) = 0")
check([x for x in grid if f(x) == 0] == [F(-1, 2), F(3)], "2a no other root on the grid")
for x in grid + rats:
    check((f(x) <= 0) == (F(-1, 2) <= x <= 3), "3a f(x) <= 0 <=> x in [-1/2, 3]")
    check((f(x) > 0) == (x < F(-1, 2) or x > 3), "3a f(x) > 0 outside the roots")
    if x != 1:
        check((f(x) / (x - 1) >= 0) == (F(-1, 2) <= x < 1 or x >= 3), "3b quotient >= 0 <=> x in [-1/2, 1[ U [3, +inf[")
g4 = lambda x: 2 * x ** 4 - 5 * x ** 2 - 3
for x in rats:
    check(g4(x) == f(x * x), "4a g4(x) = f(x^2)")
    check(g4(x) == (2 * x * x + 1) * (x * x - 3), "4a g4(x) = (2x^2 + 1)(x^2 - 3)")
r3 = R(0, 1, 3)
check(g4(r3) == 0 and g4(-r3) == 0, "4a +-sqrt3 are roots")
for P_ in range(-6, 7):
    for Q_ in range(-6, 7):
        z = R(F(P_, 2), F(Q_, 2), 3)
        check((g4(z) == 0) == (z == r3 or z == -r3), "4a in Q(sqrt3) samples, g4 vanishes only at +-sqrt3")
for x in grid + rats:
    check(2 * x * x + 1 > 0 and g4(x) != 0, "4a factor 2x^2 + 1 never zero (x^2 = -1/2 impossible), no rational root")
check(2 * 9 - 5 * 3 - 3 == 0, "4b x = 9 solution of 2x - 5sqrt(x) - 3 = 0")
for X in [F(k, 8) for k in range(0, 200)]:
    check((2 * X * X - 5 * X - 3 == 0) == (X == 3), "4b only X = sqrt(x) = 3 with X >= 0")
for x in grid + rats:
    check((g4(x) < 0) == (x * x < 3), "4c g4(x) < 0 <=> x^2 < 3")
    check((x * x < 3) == (-r3 < x < r3), "4c x^2 < 3 <=> -sqrt3 < x < sqrt3")
h = lambda x: 3 * x * x + 7 * x - 10
check(3 + 7 - 10 == 0 and h(1) == 0, "5a 1 racine (a + b + c = 0)")
check(h(F(-10, 3)) == 0 and 1 * F(-10, 3) == F(-10, 3) and 1 + F(-10, 3) == F(-7, 3), "5a autre racine -10/3, produit c/a, somme -b/a")
u, v = R(F(7, 2), F(1, 2), 5), R(F(7, 2), F(-1, 2), 5)
check(49 - 4 * 11 == 5, "5b discriminant 5")
check(u + v == 7 and u * v == 11, "5b (7 +- sqrt5)/2 have sum 7, product 11")
check(u * u - 7 * u + 11 == 0 and v * v - 7 * v + 11 == 0, "5b roots of X^2 - 7X + 11")
check(49 - 4 * 13 == -3, "5c discriminant -3 < 0")
for w in rats:
    check(w * (7 - w) == F(49, 4) - (w - F(7, 2)) ** 2 and w * (7 - w) <= F(49, 4) < 13, "5c product of two reals of sum 7 is <= 49/4 < 13")

# ---------- Ex2 Partie A : grillage
cA = lambda L: F("7.5") * L
cB = lambda L: 6 * L + 54
check(cA(30) == 225 and cB(30) == 234 and cA(60) == 450 and cB(60) == 414, "A1a prix pour 30 m et 60 m")
check(cA(36) == cB(36) == 270, "A1b prix egaux pour 36 m")
for L in [F(k, 4) for k in range(1, 481)]:
    check((cB(L) < cA(L)) == (L > 36) and (cB(L) == cA(L)) == (L == 36), "A1b B moins cher <=> L > 36")

# ---------- Ex2 Partie B : enclos x(60 - 2x)
A = lambda x: x * (60 - 2 * x)
xs = [F(k, 8) for k in range(1, 240)]  # ]0, 30[
check(all(60 - 2 * x > 0 for x in xs) and 60 - 2 * 30 == 0, "B1a x in ]0, 30[")
for x in rats:
    check(A(x) == -2 * x * x + 60 * x == -2 * (x - 15) ** 2 + 450, "B1b/B2a A(x) = -2(x - 15)^2 + 450")
check(all(A(x) <= 450 for x in xs) and A(F(15)) == 450 and [x for x in xs if A(x) == 450] == [15], "B2b max 450 en x = 15")
check(60 - 2 * 15 == 30, "B2b dimensions 15 x 30")
check(15 ** 2 - 176 == 49, "B3a discriminant reduit 49")
check([x for x in xs if A(x) == 352] == [8, 22], "B3a A(x) = 352 <=> x in {8, 22}")
check(60 - 16 == 44 and 8 * 44 == 352 and 60 - 44 == 16 and 22 * 16 == 352, "B3a dimensions 8 x 44 et 22 x 16")
check(30 * 12 == 360 and 15 ** 2 - 180 == 45 == 9 * 5, "B3b 360 m2, discriminant reduit 45")
lo, hi = R(15, -3, 5), R(15, 3, 5)
check(A(lo) == 360 and A(hi) == 360 and 0 < lo < hi < 30, "B3b bornes 15 -+ 3sqrt5 dans ]0, 30[")
for x in [F(k, 64) for k in range(1, 1920)]:
    check((A(x) >= 360) == (lo <= x <= hi), "B3b A(x) >= 360 <=> x in [15 - 3sqrt5, 15 + 3sqrt5]")
check(round(float(lo), 2) == 8.29 and round(float(hi), 2) == 21.71, "B3b valeurs approchees 8.29 et 21.71")
arr = lambda y, n: F(math.floor(y * 10 ** n + F(1, 2)), 10 ** n)
s_lo, s_hi = F("2.236"), F("2.237")
check(s_lo ** 2 < 5 < s_hi ** 2, "B3b 2.236 < sqrt5 < 2.237")
check(15 - 3 * s_hi == F("8.289") and 15 - 3 * s_lo == F("8.292") and F("8.289") < lo < F("8.292"), "B3b 8.289 < 15 - 3sqrt5 < 8.292")
check(15 + 3 * s_lo == F("21.708") and 15 + 3 * s_hi == F("21.711") and F("21.708") < hi < F("21.711"), "B3b 21.708 < 15 + 3sqrt5 < 21.711")
ss = [s_lo + F(k, 10 ** 6) for k in range(1, 1000)]
check(all(arr(15 - 3 * s, 2) == F("8.29") and arr(15 + 3 * s, 2) == F("21.71") for s in ss), "B3b the given bounds decide the roundings 8.29 and 21.71")
check(F("8.285") < lo < F("8.295") and F("21.705") < hi < F("21.715"), "B3b exact bounds round to 8.29 and 21.71")
check(A(F("8.29")) == A(F("21.71")) == F("359.9518") and A(F("8.29")) < 360 and arr(A(F("8.29")), 2) == F("359.95"), "B3b A(8.29) = A(21.71) = 359.9518 < 360")
check([k for k in range(1, 3000) if A(F(k, 100)) >= 360] == list(range(830, 2171)), "B3b au centimetre pres: 8.30 <= x <= 21.70")
d2 = lambda x: x * x + (60 - 2 * x) ** 2
for x in rats:
    check(d2(x) == 5 * x * x - 240 * x + 3600, "B4a d^2 = 5x^2 - 240x + 3600")
    check(d2(x) == 5 * (x - 24) ** 2 + 720, "B4c d^2 = 5(x - 24)^2 + 720")
check(24 ** 2 - 540 == 36 and d2(F(18)) == 900 and d2(F(30)) == 900, "B4b racines 18 et 30")
check([x for x in xs if d2(x) == 900] == [18] and 60 - 2 * 30 == 0, "B4b seule x = 18 convient")
check(60 - 36 == 24 and 18 ** 2 + 24 ** 2 == 900, "B4b enclos 18 x 24")
check(all(d2(x) >= 720 for x in xs) and [x for x in xs if d2(x) == 720] == [24], "B4c minimum 720 en x = 24")
dm = R(0, 12, 5)
check(dm > 0 and dm * dm == 720 and 60 - 48 == 12, "B4c diagonale minimale 12sqrt5, enclos 24 x 12")
check(round(float(dm), 2) == 26.83, "B4c 12sqrt5 ~ 26.83")

print(f"all {ok} checks passed")
