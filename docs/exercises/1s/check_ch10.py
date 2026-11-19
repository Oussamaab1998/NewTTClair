"""Checks every value used in CH10_ACTIVITES_NUMERIQUES_II.md (1ère année, Activités numériques II).
Numbers p + q*sqrt(d) are handled exactly with Fractions; signs are decided exactly."""
from fractions import Fraction as F
import math, random

random.seed(10)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

class Q:
    """p + q*sqrt(d), d a non-square positive integer."""
    def __init__(self, p, q, d):
        self.p, self.q, self.d = F(p), F(q), d
    def _c(self, o):
        return o if isinstance(o, Q) else Q(o, 0, self.d)
    def __add__(self, o): o = self._c(o); return Q(self.p + o.p, self.q + o.q, self.d)
    __radd__ = __add__
    def __sub__(self, o): o = self._c(o); return Q(self.p - o.p, self.q - o.q, self.d)
    def __rsub__(self, o): return self._c(o) - self
    def __neg__(self): return Q(-self.p, -self.q, self.d)
    def __mul__(self, o):
        o = self._c(o)
        return Q(self.p * o.p + self.q * o.q * self.d, self.p * o.q + self.q * o.p, self.d)
    __rmul__ = __mul__
    def __truediv__(self, o):
        o = self._c(o)
        n = o.p * o.p - o.q * o.q * self.d
        return self * Q(o.p / n, -o.q / n, self.d)
    def __rtruediv__(self, o): return self._c(o) / self
    def __eq__(self, o): o = self._c(o); return self.p == o.p and self.q == o.q
    def sign(self):
        p, q, d = self.p, self.q, self.d
        if p == 0 and q == 0: return 0
        if p >= 0 and q >= 0: return 1
        if p <= 0 and q <= 0: return -1
        if p > 0: return 1 if p * p > q * q * d else -1
        return 1 if q * q * d > p * p else -1
    def __lt__(self, o): return (self - o).sign() < 0
    def __gt__(self, o): return (self - o).sign() > 0
    def __le__(self, o): return (self - o).sign() <= 0
    def __ge__(self, o): return (self - o).sign() >= 0
    def __abs__(self): return self if self.sign() >= 0 else -self
    def f(self): return float(self.p) + float(self.q) * math.sqrt(self.d)

r3 = Q(0, 1, 3)
r2 = Q(0, 1, 2)
check(r3 * r3 == 3 and r2 * r2 == 2, "sqrt3^2 = 3, sqrt2^2 = 2")

# ================= Exercice 1 =================
# 1. a) A = 2^5 * 3^-2 * 6^3 / (4^3 * 3)
A = F(2) ** 5 * F(3) ** -2 * F(6) ** 3 / (F(4) ** 3 * 3)
check(A == 4, "A = 4")
check(F(6) ** 3 == F(2) ** 3 * F(3) ** 3 and F(4) ** 3 == F(2) ** 6, "6^3 = 2^3 3^3, 4^3 = 2^6")
check(F(2) ** 5 * F(3) ** -2 * F(2) ** 3 * F(3) ** 3 == F(2) ** 8 * 3, "numerateur = 2^8 x 3")
# 1. b) B = 0.00045 x 2.4 x 10^7 / (0.6 x 10^-2)
num = F("0.00045") * F("2.4") * 10 ** 7
den = F("0.6") * F(1, 100)
check(num == F("10.8") * 10 ** 3 == F("1.08") * 10 ** 4, "numerateur = 1.08 x 10^4")
check(den == 6 * F(1, 1000), "denominateur = 6 x 10^-3")
B = num / den
check(B == F("1.8") * 10 ** 6 and F("1.08") / 6 == F("0.18"), "B = 1.8 x 10^6")
check(round(1.8) == 2, "ordre de grandeur 2 x 10^6")
# 2. a) C = sqrt75 - 2 sqrt12 + sqrt27
check(5 ** 2 * 3 == 75 and 2 ** 2 * 3 == 12 and 3 ** 2 * 3 == 27, "75 = 25x3, 12 = 4x3, 27 = 9x3")
C = 5 * r3 - 2 * (2 * r3) + 3 * r3
check(C == Q(0, 4, 3), "C = 4 sqrt3")
check(math.isclose(math.sqrt(75) - 2 * math.sqrt(12) + math.sqrt(27), 4 * math.sqrt(3)), "C float")
# 2. b)
check((r3 - 1) * (r3 + 1) == 2, "(sqrt3 - 1)(sqrt3 + 1) = 2")
check(2 / (r3 - 1) == r3 + 1, "2/(sqrt3 - 1) = sqrt3 + 1")
# 2. c) 2 sqrt3 vs 3 sqrt2 : squares 12 and 18
check((2 * r3) * (2 * r3) == 12 and (3 * r2) * (3 * r2) == 18, "(2sqrt3)^2 = 12, (3sqrt2)^2 = 18")
check(2 * math.sqrt(3) < 3 * math.sqrt(2), "2 sqrt3 < 3 sqrt2")
# 3. a = sqrt3 - 1
a = r3 - 1
check(Q(1, 0, 3) < r3 < Q(2, 0, 3), "1 < sqrt3 < 2")
check(a > 0 and a < 1, "0 < a < 1")
a2 = a * a
check(a2 == Q(4, -2, 3), "a^2 = 4 - 2 sqrt3")
check(a2 < a, "a^2 < a")
check(a - a2 == a * (1 - a), "a - a^2 = a(1 - a)")
check(F(25) < 27 and Q(0, 3, 3) > 5, "5 < 3 sqrt3 (25 < 27)")
check((a - a2) == Q(-5, 3, 3), "a - a^2 = 3 sqrt3 - 5")
sa = math.sqrt(a.f())
inv = 1 / a
check(inv == (r3 + 1) / 2, "1/a = (sqrt3 + 1)/2")
check(inv > 1, "1/a > 1")
check(a2.f() < a.f() < sa < 1 < inv.f(), "a^2 < a < sqrt a < 1 < 1/a")
check(a.f() + 1e-3 < sa and sa + 1e-3 < 1, "marges float suffisantes")
# 4. F = |sqrt3 - 2| + |1 - sqrt3|
check((r3 - 2).sign() < 0 and (1 - r3).sign() < 0, "signes des deux quantites")
check(abs(r3 - 2) == 2 - r3 and abs(1 - r3) == r3 - 1, "valeurs absolues")
check(abs(r3 - 2) + abs(1 - r3) == 1, "F = 1")
# 5. encadrements avec 1.732 < sqrt3 < 1.733
lo, hi = F("1.732"), F("1.733")
check(lo * lo < 3 < hi * hi, "1.732^2 < 3 < 1.733^2")
check(lo * lo == F("2.999824") and hi * hi == F("3.003289"), "carres de 1.732 et 1.733")
check(F("0.732") < a and a < F("0.733"), "0.732 < a < 0.733")
check(-2 * hi == F("-3.466") and -2 * lo == F("-3.464"), "-3.466 < -2 sqrt3 < -3.464")
check(4 - 2 * hi == F("0.534") and 4 - 2 * lo == F("0.536"), "bornes 0.534 et 0.536")
check(F("0.534") < a2 and a2 < F("0.536"), "0.534 < a^2 < 0.536")
check((lo + 1) / 2 == F("1.366") and (hi + 1) / 2 == F("1.3665"), "bornes de 1/a")
check(F("1.366") < inv and inv < F("1.3665"), "1.366 < 1/a < 1.3665")
check(F("1.365") <= inv <= F("1.367"), "1.366 valeur approchee de 1/a a 10^-3 pres")
check(F("1.365") <= inv and inv < F("1.375"), "arrondi au centieme 1.37")
check(round(inv.f(), 2) == 1.37, "arrondi float 1.37")
# 6. -1 <= 2x - 3 <= 1/2
grid = [F(k, 40) for k in range(-200, 201)]
for x in grid:
    check((-1 <= 2 * x - 3 <= F(1, 2)) == (1 <= x <= F(7, 4)), "-1 <= 2x-3 <= 1/2 <=> x in [1, 7/4]")
inside = [x for x in grid if 1 <= x <= F(7, 4)]
check(min(5 - 2 * x for x in inside) == F(3, 2) and max(5 - 2 * x for x in inside) == 3, "5 - 2x in [3/2, 3]")
check(all(F(3, 2) <= 5 - 2 * x <= 3 for x in inside), "encadrement 5 - 2x")
check(all(abs(x - 2) == 2 - x for x in inside), "|x - 2| = 2 - x")
check(min(abs(x - 2) for x in inside) == F(1, 4) and max(abs(x - 2) for x in inside) == 1, "|x - 2| in [1/4, 1]")

# ================= Exercice 2 =================
L0, l0 = F(15), F(10)
for _ in range(200):
    k = F(random.randint(1, 400), random.randint(1, 50))
    check(2 * (k * L0 + k * l0) == k * 2 * (L0 + l0) == 50 * k, "perimetre x k")
    check((k * L0) * (k * l0) == k * k * 150, "aire x k^2")
check(2 * (L0 + l0) == 50 and L0 * l0 == 150, "photo : P = 50, aire = 150")
k = F("1.6")
check((k * l0, k * L0) == (16, 24) and 2 * (16 + 24) == 80 == 50 * k, "k = 1.6 : 16 x 24, P = 80")
check(16 * 24 == 384 == 150 * k * k and k * k == F("2.56"), "aire 384 = 150 x 2.56")
check((F(384) - 150) / 150 == F("1.56"), "augmentation de 156 %")
# poster k = sqrt2
check(150 * 2 == 300 and (10 * r2) * (15 * r2) == 300, "poster : aire 300 = (10 sqrt2)(15 sqrt2)")
check(2 * (10 * r2 + 15 * r2) == Q(0, 50, 2), "perimetre 50 sqrt2")
l2, h2 = F("1.414"), F("1.415")
check(l2 * l2 < 2 < h2 * h2 and l2 * l2 == F("1.999396") and h2 * h2 == F("2.002225"), "1.414 < sqrt2 < 1.415")
check(10 * l2 == F("14.14") and 10 * h2 == F("14.15"), "14.14 < 10 sqrt2 < 14.15")
check(15 * l2 == F("21.21") and 15 * h2 == F("21.225"), "21.21 < 15 sqrt2 < 21.225")
check(50 * l2 == F("70.7") and 50 * h2 == F("70.75"), "70.7 < 50 sqrt2 < 70.75")
check(F("14.14") < 10 * r2 < F("14.15") and F("21.21") < 15 * r2 < F("21.225") and F("70.7") < 50 * r2 < F("70.75"), "encadrements exacts")
check(F("70.6") <= 50 * r2 <= F("70.8"), "70.7 valeur approchee du perimetre a 10^-1 pres")
# cadre 14.2 x 21.22
check(10 * r2 < F("14.15") < F("14.2"), "largeur : 10 sqrt2 < 14.2")
check(F("21.21") < F("21.22") < F("21.225"), "21.22 dans l'encadrement : on ne peut pas conclure")
check((15 * r2) * (15 * r2) == 450 and F("21.22") ** 2 == F("450.2884"), "450 et 21.22^2 = 450.2884")
check(15 * r2 < F("21.22"), "15 sqrt2 < 21.22 : le poster entre")
check(math.isclose(15 * math.sqrt(2), 21.2132, abs_tol=1e-4), "15 sqrt2 ~ 21.2132")
check(F("21.22") - F("0.01") < 15 * r2, "marge 21.22 - 15 sqrt2 < 0.01 cm (moins d'un dixieme de mm)")
check(F(234, 150) == F("1.56"), "234/150 = 1.56")
# vignette k = 4/15
k = F(4, 15)
check(k * 15 == 4 and k * 10 == F(8, 3), "vignette 8/3 x 4")
check(150 * k * k == F(32, 3) == F(8, 3) * 4, "aire vignette 32/3")
check(k * k == F(16, 225), "rapport des aires 16/225")
check(round(float(F(8, 3)), 2) == 2.67 and round(float(F(32, 3)), 2) == 10.67, "arrondis 2.67 et 10.67")
check(F(7105, 100000) <= F(16, 225) < F(7115, 100000), "16/225 ~ 7.11 %")
check(F(16, 225) * 100 == F(64, 9), "16/225 = (64/9) %")
# pixels
n = 2400 * 3600 * 3
check(2400 * 3600 == 8640000 and n == 25920000 == F("2.592") * 10 ** 7, "25 920 000 = 2.592 x 10^7 octets")
check(round(2.592) == 3, "ordre de grandeur 3 x 10^7")
c = F(15, 3600)
check(c == F(10, 2400) == F(1, 240), "cote d'un pixel 1/240 cm")
check(F(415, 100000) <= c < F(425, 100000) and (c * 10 ** 6) // 1 == 4166, "1/240 = 0.0041666...")
check(F(4165, 10 ** 6) <= c < F(4175, 10 ** 6), "arrondi au cent-millieme 0.00417")
check(F(417, 10 ** 5) == F("4.17") * F(1, 1000), "0.00417 = 4.17 x 10^-3")

print(f"all {ok} checks passed")
