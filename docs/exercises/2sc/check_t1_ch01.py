"""Checks every value and identity used in 2eme Sciences, tome 1, chapitre 1 (Calcul dans R)."""
from fractions import Fraction as F
import math, random

random.seed(1)
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

# self-test of the exact sign used for every comparison below
for d in (5, 6):
    for _ in range(400):
        z = R(F(random.randint(-50, 50), random.randint(1, 9)), F(random.randint(-50, 50), random.randint(1, 9)), d)
        v = float(z.p) + float(z.q) * math.sqrt(d)
        check(z.sign() == ((v > 0) - (v < 0)), "R.sign agrees with floats")

# ---------- Ex1 : radicaux, valeur absolue, comparaison, encadrements
r5 = R(0, 1, 5)
check(r5 * r5 == 5, "sqrt5^2 = 5")
check((r5 - 1) ** 2 == R(6, -2, 5), "1a (sqrt5 - 1)^2 = 6 - 2sqrt5")
A = r5 - 1
check(A > 0 and A * A == R(6, -2, 5), "1b A = sqrt(6 - 2sqrt5) = sqrt5 - 1 (positive, right square)")
check(math.isclose(math.sqrt(6 - 2 * math.sqrt(5)), float(A)), "1b numeric")
B = 4 / (r5 - 1)
check(B == r5 + 1, "2 B = 4/(sqrt5 - 1) = sqrt5 + 1")
check((r5 - 1) * (r5 + 1) == 4, "2 conjugate product = 4")
check(B - A == 2, "2 B - A = 2")
check(4 < 5 < 9 and 2 < r5 < 3, "3a 2 < sqrt5 < 3")
check((2 - r5) < 0 and abs(2 - r5) == r5 - 2, "3b |2 - sqrt5| = sqrt5 - 2")
check((3 - r5) > 0 and abs(3 - r5) == 3 - r5, "3b |3 - sqrt5| = 3 - sqrt5")
C = abs(2 - r5) - abs(3 - r5)
check(C == R(-5, 2, 5), "3b C = 2sqrt5 - 5")
check(math.isclose(abs(2 - math.sqrt(5)) - abs(3 - math.sqrt(5)), 2 * math.sqrt(5) - 5), "3b numeric")
check(abs(B - A) == 2 and abs(A - r5) == 1 and abs(B - r5) == 1, "4a EF = 2, KE = KF = 1")
check((A + B) / 2 == r5 and A < r5 < B, "4a K milieu de [EF]")
check(abs(A - r5) == 1 and abs(B - r5) == 1, "4b E et F verifient |x - sqrt5| = 1")
grid = [F(k, 40) for k in range(-80, 321)]
for x in grid + rats:
    check((abs(x - r5) <= 1) == (A <= x <= B), "4b |x - sqrt5| <= 1 <=> x in [sqrt5 - 1, sqrt5 + 1]")
t = r5 - 2
check(0 < t < 1, "5a 0 < t < 1")
check(t * (r5 + 2) == 1 and 1 / t == r5 + 2, "5a 1/t = sqrt5 + 2")
check(t * t == R(9, -4, 5), "t^2 = 9 - 4sqrt5")
check(t * t < t, "5b t^2 < t")
check(t < 1 and 1 / t > 1, "5b sqrt t < 1 (t < 1) and 1/t > 1")
tf = float(t)
check(tf * tf < tf < math.sqrt(tf) < 1 < 1 / tf, "5b order t^2 < t < sqrt t < 1/t (numeric)")
lo, hi = F("2.236"), F("2.237")
check(lo * lo < 5 < hi * hi and lo < r5 < hi, "6 2.236 < sqrt5 < 2.237")
check(lo - 2 == F("0.236") and hi - 2 == F("0.237") and F("0.236") < t < F("0.237"), "6a encadrement de t")
check(lo + 2 == F("4.236") and hi + 2 == F("4.237") and F("4.236") < 1 / t < F("4.237"), "6a encadrement de 1/t")
check(F("0.236") ** 2 == F("0.055696") and F("0.237") ** 2 == F("0.056169"), "6b carres des bornes")
check(F("0.055696") < t * t < F("0.056169"), "6b encadrement de t^2")
check(F("0.05") < F("0.055696") and F("0.056169") < F("0.06"), "6c 0.05 < t^2 < 0.06")
check(0 < t * t - F("0.05") < F("0.01"), "6c 0.05 valeur approchee a 1e-2 par defaut")
check(F("0.055") < F("0.055696") and abs(t * t - F("0.06")) < F("0.005") < abs(t * t - F("0.05")), "6c arrondi 0.06")
check(round(float(t * t), 2) == 0.06 and round(float(t * t), 4) == 0.0557, "6c numeric t^2 ~ 0.0557")
# 6b remarque: from t^2 = 9 - 4sqrt5 the given bounds only yield ]0.052, 0.056[, which does not decide the rounding
arr = lambda y, n: F(math.floor(y * 10 ** n + F(1, 2)), 10 ** n)
check(9 - 4 * hi == F("0.052") and 9 - 4 * lo == F("0.056") and F("0.052") < t * t < F("0.056"), "6b remarque 0.052 < 9 - 4sqrt5 < 0.056")
ss = [lo + F(k, 10 ** 6) for k in range(1, 1000)]  # values s with 2.236 < s < 2.237
check(all(arr((s - 2) ** 2, 2) == F("0.06") for s in ss), "6c every s in ]2.236, 2.237[ gives (s - 2)^2 rounding to 0.06: first encadrement decides")
check({arr(9 - 4 * s, 2) for s in ss} == {F("0.05"), F("0.06")}, "6b remarque 9 - 4s rounds to 0.05 or 0.06: second encadrement does not decide")

# ---------- Ex2 : terrain triangulaire AB = 50, BC = 60, AC = 70
for x in rats:
    check((2500 - x * x) - (4900 - (60 - x) ** 2) == 1200 - 120 * x, "1b equation reduces to 120x = 1200")
check(1200 - 120 * 10 == 0, "1b x = 10")
check(70 ** 2 < 50 ** 2 + 60 ** 2 and 0 < 10 < 60, "H in [BC] (largest angle acute, BH = 10)")
check(2500 - 10 ** 2 == 2400 and 4900 - (60 - 10) ** 2 == 2400 and 2400 == 400 * 6, "1b AH^2 = 2400")
r6 = R(0, 1, 6)
AH = 20 * r6
check(AH > 0 and AH * AH == 2400, "1b AH = 20sqrt6")
# coordinates B(0,0), C(60,0), H(10,0), A(10, 20sqrt6)
check(10 ** 2 + AH * AH == 50 ** 2 and (60 - 10) ** 2 + AH * AH == 70 ** 2, "AB = 50 and AC = 70 in coordinates")
area = 60 * AH / 2
check(area == 600 * r6, "1c aire = 600sqrt6")
p = F(50 + 60 + 70, 2)
check(p == 90 and (p - 50, p - 60, p - 70) == (40, 30, 20), "2 demi-perimetre et differences")
check(p * (p - 50) * (p - 60) * (p - 70) == 2160000 == 600 ** 2 * 6, "2 produit de Heron = 600^2 * 6")
check(area * area == 2160000 and area > 0, "2 Heron gives the same area")
check(AH * AH < 49 ** 2 and 49 ** 2 == 2401 and AH < 49, "3 AH < 49")
check(F("48.9") ** 2 == F("2391.21") and F("48.9") ** 2 < 2400 and F("48.9") < AH, "3 AH > 48.9")
check(0 < AH - F("48.9") < F("0.1"), "3 48.9 valeur approchee par defaut a 0.1")
check(F("2.449") ** 2 < 6 < F("2.45") ** 2, "4a 2.449 < sqrt6 < 2.450")
check(600 * F("2.449") == F("1469.4") and 600 * F("2.45") == 1470, "4a bornes 1469.4 et 1470")
check(F("1469.4") < area < 1470, "4a encadrement de l'aire")
check({arr(600 * (F("2.449") + F(k, 10 ** 5)), 0) for k in range(1, 100)} == {1469, 1470}, "4a 2.449 < s < 2.450 allows 600s to round to 1469 or 1470: undecided")
check(0 < area - 1469 < 1, "4a 1469 valeur approchee a l'unite par defaut")
check(F("2.4494") ** 2 < 6 < F("2.4495") ** 2, "4b 2.4494 < sqrt6 < 2.4495")
check(600 * F("2.4494") == F("1469.64") and 600 * F("2.4495") == F("1469.7"), "4b bornes 1469.64 et 1469.7")
check(F("1469.64") < area < F("1469.7") and F("1469.5") < area < 1470, "4b arrondi 1470")
check(all(arr(600 * (F("2.4494") + F(k, 10 ** 6)), 0) == 1470 for k in range(1, 100)), "4b every s in ]2.4494, 2.4495[ gives 600s rounding to 1470")
check(round(float(area)) == 1470 and round(float(area), 2) == 1469.69, "4b numeric aire ~ 1469.69")
check(1470 * 45 == 66150, "5a valeur du terrain")
check(45 * F(6, 5) == 54 and 54 * F(4, 5) == F("43.2"), "5b 45 -> 54 -> 43.2")
check(F(6, 5) * F(4, 5) == F(96, 100) and 1 - F(96, 100) == F(4, 100), "5b baisse globale 4 %")
check(54 * F(5, 6) == 45 and 1 - F(45, 54) == F(1, 6), "5c baisse de 1/6")
check(round(100 / 6, 2) == 16.67, "5c 16.67 %")
check(350 * 1470 == 514500 == F("5.145") * 10 ** 5 and 1 <= F("5.145") < 10, "6a 514500 = 5.145 x 10^5")
check(round(5.145) == 5, "6a ordre de grandeur 5 x 10^5")
mass = 514500 * F(4, 100)
check(mass == 20580 == F("2.058") * 10 ** 4 and round(2.058) == 2, "6b 20580 g = 2.058 x 10^4, ordre 2 x 10^4")
check(mass / 1000 == F("20.58") and arr(mass / 1000, 0) == 21, "6b 20.58 kg, environ 21 kg")

print(f"all {ok} checks passed")
