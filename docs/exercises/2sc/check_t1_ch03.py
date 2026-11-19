"""Checks every value and identity used in 2eme Sciences, tome 1, chapitre 3 (Notion de polynomes)."""
from fractions import Fraction as F
import math, random

random.seed(3)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


# polynomials as coefficient lists, constant term first
def trim(a):
    a = [F(c) for c in a]
    while a and a[-1] == 0:
        a.pop()
    return a
def pmul(a, b):
    r = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            r[i + j] += F(x) * F(y)
    return trim(r)
def psub(a, b):
    n = max(len(a), len(b))
    a, b = list(a) + [0] * (n - len(a)), list(b) + [0] * (n - len(b))
    return trim([F(x) - F(y) for x, y in zip(a, b)])
def ev(a, x):
    r = 0
    for c in reversed(a):
        r = r * x + c
    return r


class R:
    """Exact number p + q*sqrt(d) with p, q rational and d a fixed non-square integer."""
    def __init__(self, p, q=0, d=65):
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
    def __float__(self): return float(self.p) + float(self.q) * math.sqrt(self.d)
    __hash__ = None


rats = [F(random.randint(-90, 90), random.randint(1, 13)) for _ in range(300)]
for _ in range(400):
    z = R(F(random.randint(-50, 50), random.randint(1, 9)), F(random.randint(-50, 50), random.randint(1, 9)))
    v = float(z.p) + float(z.q) * math.sqrt(65)
    check(z.sign() == ((v > 0) - (v < 0)), "R.sign agrees with floats")
for _ in range(50):
    a, b = [F(random.randint(-9, 9)) for _ in range(4)], [F(random.randint(-9, 9)) for _ in range(3)]
    x = random.choice(rats)
    check(ev(pmul(a, b), x) == ev(a, x) * ev(b, x), "pmul self-test")

# ---------- Ex1 : P(x) = 2x^3 + a x^2 - 11x + 6
for a in range(-30, 31):
    Pa = [6, -11, a, 2]
    check(ev(Pa, 3) == 27 + 9 * a, "1 P(3) = 27 + 9a")
    check((ev(Pa, 3) == 0) == (a == -3), "1 3 racine <=> a = -3")
P = trim([6, -11, -3, 2])
m = 2
n = -3 + 3 * m
p = -11 + 3 * n
check((m, n, p) == (2, 3, -2) and -3 * p == 6, "2a identification m = 2, n = 3, p = -2 (consistent)")
check(pmul([-3, 1], [p, n, m]) == P, "2a P(x) = (x - 3)(2x^2 + 3x - 2)")
check(3 ** 2 - 4 * 2 * (-2) == 25 and F(-3 - 5, 4) == -2 and F(-3 + 5, 4) == F(1, 2), "2b racines du trinome -2 et 1/2")
check(pmul([2, 1], [-1, 2]) == trim([-2, 3, 2]), "2b 2x^2 + 3x - 2 = (x + 2)(2x - 1)")
check(pmul(pmul([-3, 1], [2, 1]), [-1, 2]) == P, "2b P(x) = (x - 3)(x + 2)(2x - 1)")
grid = [F(k, 4) for k in range(-40, 41)]
check([x for x in grid if ev(P, x) == 0] == [-2, F(1, 2), 3], "2b S = {-2, 1/2, 3}")
for x in grid + rats:
    check((ev(P, x) > 0) == (-2 < x < F(1, 2) or x > 3), "3 P(x) > 0 <=> x in ]-2, 1/2[ U ]3, +inf[")
    check((ev(P, x) < 0) == (x < -2 or F(1, 2) < x < 3), "3 P(x) < 0 on ]-inf, -2[ U ]1/2, 3[")
Q = psub(pmul([1, 0, 1], P), [0, 0, 0, 0, 0, 2])
check(Q == trim([6, -11, 3, -9, -3]), "4a Q(x) = -3x^4 - 9x^3 + 3x^2 - 11x + 6")
check(len(Q) - 1 == 4 and Q[-1] == -3, "4a degre 4, coefficient -3")
check(len(pmul([1, 0, 1], P)) - 1 == 5 and pmul([1, 0, 1], P)[-1] == 2, "4a (x^2 + 1)P(x) has degree 5, leading 2")
for x in rats:
    check((x * x + 1) * ev(P, x) - 2 * x ** 5 == -3 * x ** 4 - 9 * x ** 3 + 3 * x * x - 11 * x + 6, "4a Q identity at random x")
check(ev(Q, 3) == -486 and 10 * ev(P, 3) - 2 * 3 ** 5 == -486, "4b Q(3) = -486")
fD = [x for x in grid + rats if x * x != 9]
check(3 * 3 - 9 == 0 and (-3) * (-3) - 9 == 0, "5a x^2 - 9 = 0 <=> x = +-3")
for x in fD:
    fx = ev(P, x) / (x * x - 9)
    check(fx == (x + 2) * (2 * x - 1) / (x + 3), "5b f(x) = (x + 2)(2x - 1)/(x + 3)")
    check((fx <= 0) == (x < -3 or -2 <= x <= F(1, 2)), "5c f(x) <= 0 <=> x in ]-inf, -3[ U [-2, 1/2]")
check(sorted(set(x for x in fD if ev(P, x) == 0)) == [-2, F(1, 2)], "5d antecedents de 0 : -2 et 1/2")
check(ev(P, 3) == 0 and 3 * 3 - 9 == 0, "5d 3 is a root of P but not in D")

# ---------- Ex2 : bac a base carree, volume 32
S = lambda x: x * x + F(128) / x
hgt = lambda x: F(32) / (x * x)
pos = [abs(x) for x in rats if x != 0]
for x in pos:
    check(x * x * hgt(x) == 32, "1a volume x^2 h = 32")
    check(x * x + 4 * x * hgt(x) == S(x), "1b S(x) = x^2 + 4xh = x^2 + 128/x")
check((S(2), S(4), S(8)) == (68, 48, 80), "1c S(2), S(4), S(8)")
check((hgt(2), hgt(4), hgt(8)) == (8, 2, F(1, 2)), "1c hauteurs 8, 2, 0.5")
P2 = trim([128, -48, 0, 1])
check(ev(P2, 4) == 0, "2a P(4) = 0")
m2 = 1
n2 = 0 + 4 * m2
p2 = -48 + 4 * n2
check((m2, n2, p2) == (1, 4, -32) and -4 * p2 == 128, "2b identification m = 1, n = 4, p = -32 (consistent)")
check(pmul([-4, 1], [p2, n2, m2]) == P2, "2b P(x) = (x - 4)(x^2 + 4x - 32)")
check(2 ** 2 + 32 == 36 and -2 - 6 == -8 and -2 + 6 == 4, "2c discriminant reduit 36, racines -8 et 4")
check(ev([-32, 4, 1], 4) == 0 and ev([-32, 4, 1], -8) == 0, "2c racines du trinome")
check(pmul(pmul([-4, 1], [-4, 1]), [8, 1]) == P2, "2c P(x) = (x - 4)^2 (x + 8)")
xs = [F(k, 256) for k in range(1, 4096)]  # ]0, 16[
for x in pos:
    check(S(x) - 48 == ev(P2, x) / x, "3a S(x) - 48 = P(x)/x")
for x in xs + pos:
    check(S(x) >= 48 and (S(x) == 48) == (x == 4), "3b S(x) >= 48, equality only at 4")
check(hgt(4) == 2 and 4 == 2 * hgt(4), "3b bac 4 x 4 x 2")
T = trim([128, -68, 0, 1])
for x in xs + pos:
    check((S(x) <= 68) == (ev(T, x) <= 0), "4a S(x) <= 68 <=> T(x) <= 0 for x > 0")
check(ev(T, 2) == 0, "4b T(2) = 0")
b = 0 + 2
c = -68 + 2 * b
check((b, c) == (2, -64) and -2 * c == 128, "4b identification b = 2, c = -64 (consistent)")
check(pmul([-2, 1], [c, b, 1]) == T, "4b T(x) = (x - 2)(x^2 + 2x - 64)")
r65 = R(0, 1)
x0, x1 = -1 - r65, r65 - 1
check(1 + 64 == 65 and x0 * x0 + 2 * x0 - 64 == 0 and x1 * x1 + 2 * x1 - 64 == 0, "4c racines -1 -+ sqrt65")
check(x0 < 0 and x1 > 2, "4c -1 - sqrt65 < 0 < 2 < sqrt65 - 1")
for x in xs + pos:
    check((ev(T, x) <= 0) == (2 <= x <= x1), "4c T(x) <= 0 on ]0, +inf[ <=> x in [2, sqrt65 - 1]")
    check((S(x) <= 68) == (2 <= x <= x1), "4c S(x) <= 68 <=> x in [2, sqrt65 - 1]")
check(F("8.06") ** 2 == F("64.9636") and F("8.07") ** 2 == F("65.1249"), "4c carres 8.06 et 8.07")
check(F("8.06") ** 2 < 65 < F("8.07") ** 2 and F("7.06") < x1 < F("7.07"), "4c 7.06 < sqrt65 - 1 < 7.07")

print(f"all {ok} checks passed")
