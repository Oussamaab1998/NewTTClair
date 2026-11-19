"""Checks every value used in exercises T2 ch4 (Nombres complexes, 3eme Sc. exp.)."""
from fractions import Fraction as F
import cmath, math, random

random.seed(4)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


class R3:
    """Exact real number p + q*sqrt(3) with p, q rational."""
    def __init__(self, p, q=0):
        self.p, self.q = F(p), F(q)
    def __add__(self, o): o = r3(o); return R3(self.p + o.p, self.q + o.q)
    __radd__ = __add__
    def __neg__(self): return R3(-self.p, -self.q)
    def __sub__(self, o): return self + (-r3(o))
    def __rsub__(self, o): return r3(o) - self
    def __mul__(self, o):
        o = r3(o)
        return R3(self.p * o.p + 3 * self.q * o.q, self.p * o.q + self.q * o.p)
    __rmul__ = __mul__
    def inv(self):
        n = self.p * self.p - 3 * self.q * self.q
        return R3(self.p / n, -self.q / n)
    def __eq__(self, o): o = r3(o); return self.p == o.p and self.q == o.q
    def __float__(self): return float(self.p) + float(self.q) * math.sqrt(3)

def r3(x): return x if isinstance(x, R3) else R3(x)


class C:
    """Exact complex number x + iy with x, y in Q(sqrt 3)."""
    def __init__(self, x, y=0):
        self.x, self.y = r3(x), r3(y)
    def __add__(self, o): o = c(o); return C(self.x + o.x, self.y + o.y)
    __radd__ = __add__
    def __neg__(self): return C(-self.x, -self.y)
    def __sub__(self, o): return self + (-c(o))
    def __rsub__(self, o): return c(o) - self
    def __mul__(self, o):
        o = c(o)
        return C(self.x * o.x - self.y * o.y, self.x * o.y + self.y * o.x)
    __rmul__ = __mul__
    def conj(self): return C(self.x, -self.y)
    def norm2(self): return self.x * self.x + self.y * self.y   # |z|^2, exact
    def __truediv__(self, o):
        o = c(o)
        n = o.norm2().inv()
        q = self * o.conj()
        return C(q.x * n, q.y * n)
    def __pow__(self, n):
        r = C(1)
        for _ in range(n):
            r = r * self
        return r
    def __eq__(self, o): o = c(o); return self.x == o.x and self.y == o.y
    def f(self): return complex(float(self.x), float(self.y))

def c(z): return z if isinstance(z, C) else C(z)

I = C(0, 1)
S3 = R3(0, 1)                      # sqrt(3)

def same_angle(t1, t2):
    d = (t1 - t2) / (2 * math.pi)
    return math.isclose(d, round(d), abs_tol=1e-12)

def arg_is(z, theta):
    return same_angle(cmath.phase(z.f()), theta)

def modulus_is_sqrt(z, n):        # |z| = sqrt(n), checked exactly on |z|^2
    return z.norm2() == n

check(I * I == -1, "i^2 = -1")

# ================= Exercice 1 =================
# 1. z1 = (2 - 3i)(1 + 2i) = 8 + i ; z2 = (3 + i)/(1 - 2i) = (1 + 7i)/5 ; z3 = i^2026 = -1
z1 = C(2, -3) * C(1, 2)
z2 = C(3, 1) / C(1, -2)
check(z1 == C(8, 1), "z1 = 8 + i")
check(z2 == C(F(1, 5), F(7, 5)), "z2 = 1/5 + 7/5 i")
check(z2 * C(1, -2) == C(3, 1), "z2 * (1 - 2i) = 3 + i")
check(C(3, 1) * C(1, 2) == C(1, 7) and C(1, -2).norm2() == 5, "(3 + i)(1 + 2i) = 1 + 7i, |1 - 2i|^2 = 5")
check(2026 % 4 == 2 and I ** 2026 == -1, "i^2026 = -1")
check(I ** 4 == 1, "i^4 = 1")
check(z1.conj() == C(8, -1) and modulus_is_sqrt(z1, 65), "conj z1 = 8 - i, |z1| = sqrt(65)")
check(z2.conj() == C(F(1, 5), F(-7, 5)) and modulus_is_sqrt(z2, 2), "conj z2 = (1 - 7i)/5, |z2| = sqrt(2)")
check(F(1 + 49, 25) == 2, "|z2|^2 = 50/25 = 2")
check(C(3, 1).norm2() == 10 and C(1, -2).norm2() == 5 and F(10, 5) == 2, "|3 + i| / |1 - 2i| = sqrt(10)/sqrt(5) = sqrt(2)")
check(z1.norm2() == (z1 * z1.conj()).x and (z1 * z1.conj()).y == 0, "z1 * conj z1 = |z1|^2 = 65")

# 2. a) z^2 = -9 <=> z = 3i or z = -3i
for s in (C(0, 3), C(0, -3)):
    check(s * s == -9, "(+-3i)^2 = -9")
check((C(0, 3) - C(0, -3)) == C(0, 6), "two distinct solutions")
# no other Gaussian-integer solution in a box (sanity)
sols = [(x, y) for x in range(-6, 7) for y in range(-6, 7) if C(x, y) * C(x, y) == -9]
check(sols == [(0, -3), (0, 3)], "only +-3i in the box")
# 2. b) 2z - i conj(z) = 1 + 4i  <=>  (2x - y) + i(2y - x) = 1 + 4i  <=> z = 2 + 3i
rats = [F(random.randint(-30, 30), random.randint(1, 7)) for _ in range(60)]
for x in rats[:30]:
    for y in rats[30:]:
        z = C(x, y)
        lhs = 2 * z - I * z.conj()
        check(lhs == C(2 * x - y, 2 * y - x), "2z - i zbar = (2x - y) + i(2y - x)")
check(2 * C(2, 3) - I * C(2, 3).conj() == C(1, 4), "z = 2 + 3i is a solution")
check(I * C(2, -3) == C(3, 2) and C(4, 6) - C(3, 2) == C(1, 4), "verification : 4 + 6i - (2i + 3) = 1 + 4i")
# linear system 2x - y = 1, -x + 2y = 4 has determinant 3 != 0 -> unique
check(2 * 2 - (-1) * (-1) == 3, "systeme a solution unique")
check(2 * 2 - 3 == 1 and -2 + 2 * 3 == 4, "x = 2, y = 3")

# 3. a = 1 + i sqrt3, b = 1 + i
a = C(1, S3)
b = C(1, 1)
check(a.norm2() == 4 and b.norm2() == 2, "|a| = 2, |b| = sqrt2")
check(arg_is(a, math.pi / 3) and arg_is(b, math.pi / 4), "arg a = pi/3, arg b = pi/4")
check(a == C(2 * R3(F(1, 2)), 2 * R3(0, F(1, 2))), "a = 2(cos pi/3 + i sin pi/3) with cos = 1/2, sin = sqrt3/2")
check(math.isclose(math.cos(math.pi / 3), 0.5) and math.isclose(math.sin(math.pi / 3), math.sqrt(3) / 2), "cos, sin pi/3")
check(math.isclose(math.cos(math.pi / 4), math.sqrt(2) / 2) and math.isclose(math.sin(math.pi / 4), math.sqrt(2) / 2), "cos, sin pi/4")
ab = a * b
check(ab.norm2() == 8, "|ab| = 2 sqrt2 (|ab|^2 = 8)")
check(arg_is(ab, 7 * math.pi / 12), "arg(ab) = pi/3 + pi/4 = 7pi/12")
check(math.isclose(math.pi / 3 + math.pi / 4, 7 * math.pi / 12), "pi/3 + pi/4 = 7pi/12")
q = a / b
check(q.norm2() == 2 and arg_is(q, math.pi / 12), "|a/b| = sqrt2, arg(a/b) = pi/12")
check(q == C(R3(F(1, 2), F(1, 2)), R3(F(-1, 2), F(1, 2))), "a/b = ((1 + sqrt3) + i(sqrt3 - 1))/2")
a2 = a * a
check(a2 == C(-2, 2 * S3) and a2.norm2() == 16 and arg_is(a2, 2 * math.pi / 3), "a^2 = -2 + 2i sqrt3, |a^2| = 4, arg 2pi/3")
a3 = a2 * a
check(a3 == -8, "a^3 = -8")
check(arg_is(a3, math.pi) and a3.norm2() == 64, "arg(a^3) = 2pi/3 + pi/3 = pi, |a^3| = 8")
check(math.isclose(8 * math.cos(math.pi), -8) and abs(8 * math.sin(math.pi)) < 1e-12, "8(cos pi + i sin pi) = -8")
# 3. c) ab = (1 - sqrt3) + i(1 + sqrt3) ; cos(7pi/12) = (1 - sqrt3)/(2 sqrt2) = (sqrt2 - sqrt6)/4
check(ab == C(R3(1, -1), R3(1, 1)), "ab = (1 - sqrt3) + i(1 + sqrt3)")
cos2 = R3(1, -1) * R3(1, -1) * R3(F(1, 8))      # cos^2 = (1 - sqrt3)^2 / 8
sin2 = R3(1, 1) * R3(1, 1) * R3(F(1, 8))
check(cos2 == R3(F(1, 2), F(-1, 4)) and sin2 == R3(F(1, 2), F(1, 4)), "cos^2 = (2 - sqrt3)/4, sin^2 = (2 + sqrt3)/4")
check(cos2 + sin2 == 1, "cos^2 + sin^2 = 1")
s2, s6 = math.sqrt(2), math.sqrt(6)
check(math.isclose(((s2 - s6) / 4) ** 2, float(cos2)) and math.isclose(((s2 + s6) / 4) ** 2, float(sin2)), "(sqrt2 -+ sqrt6)/4 squared")
check(math.isclose(math.cos(7 * math.pi / 12), (s2 - s6) / 4), "cos(7pi/12) = (sqrt2 - sqrt6)/4")
check(math.isclose(math.sin(7 * math.pi / 12), (s2 + s6) / 4), "sin(7pi/12) = (sqrt2 + sqrt6)/4")
check(math.isclose((1 - math.sqrt(3)) / (2 * s2), (s2 - s6) / 4), "(1 - sqrt3)/(2 sqrt2) = (sqrt2 - sqrt6)/4")
check(math.isclose(math.cos(7 * math.pi / 12), -0.2588, abs_tol=5e-5) and math.isclose(math.sin(7 * math.pi / 12), 0.9659, abs_tol=5e-5), "decimal values")
check(math.cos(7 * math.pi / 12) < 0 < math.sin(7 * math.pi / 12), "7pi/12 in ]pi/2, pi[ : cos < 0 < sin")

# 4. Delta = {M(z), z != 0 : arg z = pi/3 [2pi]} = half-line [OA) minus O ; Gamma = circle |z| = 2 ; Gamma n Delta = {A}
for r in (F(1, 3), F(1), F(2), F(7, 2)):
    z = C(R3(r / 2), R3(0, r / 2))         # r(cos pi/3 + i sin pi/3)
    check(arg_is(z, math.pi / 3), "points r(cos pi/3 + i sin pi/3) are in Delta")
    check((z.norm2() == 4) == (r == 2), "on Gamma only for r = 2")
check(C(R3(1), R3(0, 1)) == a, "r = 2 gives A")
check(not arg_is(C(-1, -S3), math.pi / 3), "-a (other side of O) is not in Delta")

# ================= Exercice 2 =================
zA, zB, zC = C(1, 1), C(3, 2), C(0, 3)
check(zB - zA == C(2, 1) and zC - zA == C(-1, 2), "affixes des vecteurs AB et AC")
check(zC - zA == I * (zB - zA), "zC - zA = i(zB - zA)")
check((zB - zA).norm2() == 5 and (zC - zA).norm2() == 5, "AB = AC = sqrt5")
check((zC - zB) == C(-3, 1) and (zC - zB).norm2() == 10, "BC = sqrt10")
check((zB - zA).norm2() + (zC - zA).norm2() == (zC - zB).norm2(), "AB^2 + AC^2 = BC^2")
# plane scalar product check of the right angle: (2,1).(-1,2) = 0
check(2 * (-1) + 1 * 2 == 0, "AB.AC = 0")
zD = zB - zA + zC
check(zD == C(2, 4), "zD = 2 + 4i")
check(zD - zC == zB - zA and zD - zB == zC - zA, "ABDC parallelogramme (AB = CD, AC = BD en vecteurs)")
check((zD - zB).norm2() == 5 and (zD - zC).norm2() == 5, "BD = CD = sqrt5")
zO = (zA + zD) / 2
check(zO == C(F(3, 2), F(5, 2)) and zO == (zB + zC) / 2, "centre Omega = (3 + 5i)/2, milieu de [AD] et [BC]")
check((zD - zA).norm2() == 10, "AD = sqrt10 = BC (diagonales egales)")
# E : |z - zB| = |z - zC| <=> -6x + 2y + 4 = 0 <=> y = 3x - 2
for x in rats[:30]:
    for y in rats[30:]:
        z = C(x, y)
        diff = (z - zB).norm2() - (z - zC).norm2()
        check(diff == R3(-6 * x + 2 * y + 4), "|z - zB|^2 - |z - zC|^2 = -6x + 2y + 4")
        check((diff == 0) == (y == 3 * x - 2), "E : y = 3x - 2")
check(zA - zB == C(-2, -1) and zA - zC == C(1, -2) and zD - zB == C(-1, 2) and zD - zC == C(2, 1), "differences du 4. a)")
for P in (zA, zD):
    check((P - zB).norm2() == (P - zC).norm2(), "A et D dans E")
    check(P.y == 3 * P.x - 2, "A(1,1), D(2,4) sur y = 3x - 2")
check(not ((zB - zB).norm2() == (zB - zC).norm2()), "B pas dans E")
# F : |2z - 3 - 5i| = sqrt10 <=> |z - zO| = sqrt10/2
check([2 * P - C(3, 5) for P in (zA, zB, zC, zD)] == [C(-1, -3), C(3, -1), C(-3, 1), C(1, 3)], "valeurs de 2z - 3 - 5i au 5. b)")
check(zA - zO == C(F(-1, 2), F(-3, 2)), "zA - zOmega = (-1 - 3i)/2")
for P in (zA, zB, zC, zD):
    check((2 * P - C(3, 5)).norm2() == 10, "A, B, C, D dans F")
    check((P - zO).norm2() == F(10, 4), "Omega A = ... = sqrt10/2")
for x in rats[:20]:
    for y in rats[20:40]:
        z = C(x, y)
        check((2 * z - C(3, 5)).norm2() == 4 * (z - zO).norm2(), "|2z - 3 - 5i| = 2|z - zO|")
# F n axe (O, v) : z = iy, 9 + (2y - 5)^2 = 10 <=> y = 3 or y = 2
for y in rats + [F(2), F(3)]:
    z = C(0, y)
    on = (2 * z - C(3, 5)).norm2() == 10
    check(on == (y in (2, 3)), "F coupe (O, v) en 3i (C) et 2i (K)")
    check((2 * z - C(3, 5)).norm2() == R3(9 + (2 * y - 5) ** 2), "|2iy - 3 - 5i|^2 = 9 + (2y - 5)^2")
check(C(0, 3) == zC, "y = 3 donne C")

print(f"all {ok} checks passed; cos(7pi/12) = {math.cos(7 * math.pi / 12):.4f}, sin(7pi/12) = {math.sin(7 * math.pi / 12):.4f}")
