"""Checks every value and identity used in exercises T2 ch5 (2ème Sciences, trigonométrie et mesure des grandeurs)."""
from fractions import Fraction as F
import math, random

random.seed(5)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

pi = math.pi
close = lambda u, v: math.isclose(u, v, rel_tol=1e-12, abs_tol=1e-12)
s2, s3, s5 = math.sqrt(2), math.sqrt(3), math.sqrt(5)

def count_roots(fun, lo, hi, n=200000):
    """Number of sign changes of fun on ]lo, hi[ (simple roots), on a fine grid."""
    xs = [lo + (hi - lo) * (k + 0.5) / n for k in range(n)]
    vals = [fun(x) for x in xs]
    return sum(1 for i in range(n - 1) if (vals[i] > 0) != (vals[i + 1] > 0))

# ---------- Ex1, 1. a) angle 3pi/4 on the half circle
M = (math.cos(3 * pi / 4), math.sin(3 * pi / 4))
check(close(M[0], -s2 / 2) and close(M[1], s2 / 2), "M(-sqrt2/2, sqrt2/2)")
check(close(math.cos(pi / 4), s2 / 2) and close(-math.cos(pi - 3 * pi / 4), M[0]), "supplementary: M' at pi/4")
check(close(M[1] / M[0], -1) and close(M[0] / M[1], -1), "tan(3pi/4) = cot(3pi/4) = -1")
# 1. b) points of C (x^2 + y^2 = 1, y >= 0) with y = 1/2, with x = -1/2
pts_y = [(-s3 / 2, 0.5), (s3 / 2, 0.5)]
check(all(close(x * x + y * y, 1) for x, y in pts_y), "two points of ordinate 1/2")
check(close(math.acos(s3 / 2), pi / 6) and close(math.acos(-s3 / 2), 5 * pi / 6), "angles pi/6 and 5pi/6")
check(count_roots(lambda t: math.sin(t) - 0.5, 0, pi) == 2, "sin t = 1/2 has 2 solutions in [0, pi]")
check(count_roots(lambda t: math.cos(t) + 0.5, 0, pi) == 1, "cos t = -1/2 has 1 solution in [0, pi]")
check(close(math.acos(-0.5), 2 * pi / 3) and close(math.sin(2 * pi / 3), s3 / 2), "angle 2pi/3, point (-1/2, sqrt3/2)")

# ---------- Ex1, 2. a) cos a = -5/13
ca = F(-5, 13)
sa2 = 1 - ca * ca
check(sa2 == F(144, 169) and F(12, 13) ** 2 == sa2, "sin a = 12/13 (sin >= 0)")
sa = F(12, 13)
check(sa / ca == F(-12, 5) and ca / sa == F(-5, 12), "tan a = -12/5, cot a = -5/12")
a = math.acos(-5 / 13)
check(close(math.sin(a), 12 / 13) and pi / 2 < a < pi, "a in ]pi/2, pi[")
check(close(math.cos(pi - a), 5 / 13) and close(math.sin(pi - a), 12 / 13) and close(math.tan(pi - a), 12 / 5),
      "cos(pi - a) = 5/13, sin(pi - a) = 12/13, tan(pi - a) = 12/5")
check(-ca == F(5, 13) and -(sa / ca) == F(12, 5), "supplementary formulas give 5/13 and 12/5")
# 2. b) tan b = 2
cb2 = 1 / (1 + F(2) ** 2)
check(cb2 == F(1, 5), "cos^2 b = 1/5")
check(cb2 + 4 * cb2 == 1, "sin^2 b = tan^2 b cos^2 b = 4/5, sum 1")
b = math.atan(2)
check(0 < b < pi / 2, "b in ]0, pi/2[")
check(close(math.cos(b), s5 / 5) and close(math.sin(b), 2 * s5 / 5) and close(1 / math.tan(b), 0.5), "cos b = sqrt5/5, sin b = 2sqrt5/5, cot b = 1/2")
check(close(1 / s5, s5 / 5), "1/sqrt5 = sqrt5/5")
check(close(math.tan(pi / 2 - b), 0.5), "tan(pi/2 - b) = cot b = 1/2")
# tan x = 2 with x = pi - b would give tan = -2, and x = 0, pi give tan 0: b is the only solution
check(count_roots(lambda t: math.tan(t) - 2, 0, pi / 2 - 1e-9) == 1 and count_roots(lambda t: math.tan(t) - 2, pi / 2 + 1e-9, pi) == 0,
      "tan x = 2 has one solution in [0, pi]")

# ---------- Ex1, 3.
check(close(math.cos(6 * pi / 7), -math.cos(pi / 7)) and close(math.cos(5 * pi / 7), -math.cos(2 * pi / 7)), "cos(6pi/7) = -cos(pi/7), cos(5pi/7) = -cos(2pi/7)")
check(close(math.cos(pi / 7) + math.cos(2 * pi / 7) + math.cos(5 * pi / 7) + math.cos(6 * pi / 7), 0), "sum of cosines = 0")
check(close(math.sin(2 * pi / 5), math.cos(pi / 10)), "sin(2pi/5) = cos(pi/10)")
check(close(math.sin(pi / 10) ** 2 + math.sin(2 * pi / 5) ** 2, 1), "sin^2(pi/10) + sin^2(2pi/5) = 1")
check(close(math.tan(3 * pi / 8), 1 / math.tan(pi / 8)), "tan(3pi/8) = cot(pi/8)")
check(close(math.tan(pi / 8) * math.tan(3 * pi / 8), 1), "tan(pi/8) tan(3pi/8) = 1")

# ---------- Ex1, 4. equations on [0, pi]
ea = lambda t: 2 * math.cos(t) + s3
check(close(ea(5 * pi / 6), 0) and count_roots(ea, 0, pi) == 1, "a) S = {5pi/6}")
eb = lambda t: 4 * math.sin(t) ** 2 - 3
check(close(eb(pi / 3), 0) and close(eb(2 * pi / 3), 0) and count_roots(eb, 0, pi) == 2, "b) S = {pi/3, 2pi/3}")
ec = lambda t: s3 * math.tan(t) + 1
check(close(ec(5 * pi / 6), 0), "c) 5pi/6 solution")
check(count_roots(ec, 0, pi / 2 - 1e-9) == 0 and count_roots(ec, pi / 2 + 1e-9, pi) == 1 and close(ec(0), 1) and close(ec(pi), 1),
      "c) S = {5pi/6}")
tx = -1 / s3                                          # from sqrt3 tan x + 1 = 0
cx2 = 1 / (1 + tx * tx)
check(close(tx * tx, 1 / 3) and close(cx2, 0.75) and close(-math.sqrt(cx2), math.cos(5 * pi / 6)), "c) tan^2 = 1/3 -> cos^2 = 3/4 -> cos x = -sqrt3/2")
ed = lambda t: 2 * math.cos(t) ** 2 - math.cos(t) - 1
for _ in range(200):
    t = random.uniform(0, pi)
    check(close(ed(t), (math.cos(t) - 1) * (2 * math.cos(t) + 1)), "d) factorisation (cos x - 1)(2cos x + 1)")
Pd = lambda X: 2 * X * X - X - 1
check(Pd(F(1)) == 0 and Pd(F(0)) / 2 == F(-1, 2) and Pd(Pd(F(0)) / 2) == 0, "d) root 1, product c/a = -1/2, other root -1/2")
check(ed(0) == 0 and close(ed(2 * pi / 3), 0) and count_roots(ed, 0, pi) == 1, "d) S = {0, 2pi/3}")

# ---------- Ex1, 5. identities
for _ in range(300):
    t = random.uniform(0.01, pi - 0.01)
    if abs(t - pi / 2) > 1e-3:
        check(math.isclose(math.tan(t) + 1 / math.tan(t), 1 / (math.sin(t) * math.cos(t)), rel_tol=1e-9), "tan + cot = 1/(sin cos)")
    check(math.isclose(math.sin(t) ** 4 - math.cos(t) ** 4, 2 * math.sin(t) ** 2 - 1, abs_tol=1e-12), "sin^4 - cos^4 = 2sin^2 - 1")
tb = F(2)
sbcb = tb * cb2                                       # sin b cos b = tan b cos^2 b
check(tb + 1 / tb == F(5, 2) and sbcb == F(2, 5) and 1 / sbcb == tb + 1 / tb, "5. c) tan b + cot b = 5/2 = 1/(sin b cos b)")
check(close(math.sin(b) * math.cos(b), float(sbcb)) and close(2 * s5 / 5 * s5 / 5, float(sbcb)), "sin b cos b = (2sqrt5/5)(sqrt5/5) = 2/5")

# ---------- Ex2 : triangle ABC, AB = 50, AC = 30, angle A = 2pi/3
class R3:
    """Exact number p + q*sqrt(3), p and q rational."""
    def __init__(self, p, q=0):
        self.p, self.q = F(p), F(q)
    def __add__(s, o):
        o = r3(o); return R3(s.p + o.p, s.q + o.q)
    __radd__ = __add__
    def __sub__(s, o):
        o = r3(o); return R3(s.p - o.p, s.q - o.q)
    def __rsub__(s, o):
        return r3(o) - s
    def __neg__(s):
        return R3(-s.p, -s.q)
    def __mul__(s, o):
        o = r3(o); return R3(s.p * o.p + 3 * s.q * o.q, s.p * o.q + s.q * o.p)
    __rmul__ = __mul__
    def __truediv__(s, k):
        k = F(k); return R3(s.p / k, s.q / k)
    def __eq__(s, o):
        o = r3(o); return s.p == o.p and s.q == o.q
    __hash__ = None
    def __float__(s):
        return float(s.p) + float(s.q) * math.sqrt(3)
def r3(x):
    return x if isinstance(x, R3) else R3(x)
def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return dot(u, u)
def eq_abs(x, y): return x == y or x == -y

A = (R3(0), R3(0)); B = (R3(50), R3(0)); C = (R3(-15), R3(0, 15))
AB, AC, BC = vec(A, B), vec(A, C), vec(B, C)
c_, b_ = 50, 30                                         # data: AB = 50, AC = 30
cosA, sin60, cos60 = F(-1, 2), R3(0, F(1, 2)), F(1, 2)
check(n2(AB) == c_ ** 2 and n2(AC) == b_ ** 2, "model: AB = 50, AC = 30")
check(close(math.cos(2 * pi / 3), float(cosA)) and dot(AB, AC) == cosA * c_ * b_, "model: angle BAC = 2pi/3, cos = -1/2")
check(math.isclose(math.degrees(2 * pi / 3), 120), "2pi/3 rad = 120 degrees")
check(close(float(sin60), math.sin(pi / 3)) and close(float(cos60), math.cos(pi / 3)), "sin(pi/3), cos(pi/3)")
# 1. BC
a2 = b_ ** 2 + c_ ** 2 - 2 * b_ * c_ * cosA
check(b_ ** 2 + c_ ** 2 == 3400 and -2 * b_ * c_ * cosA == 1500 and a2 == 4900, "BC^2 = 3400 + 1500 = 4900 (El-Kashi)")
check(n2(BC) == a2, "BC^2 = 4900 in the model")
a_ = math.isqrt(int(a2))
check(a_ * a_ == a2 and a_ == 70, "BC = 70")
# 2. cosines and sines of B and C
cosB = F(a_ ** 2 + c_ ** 2 - b_ ** 2, 2 * a_ * c_); cosC = F(a_ ** 2 + b_ ** 2 - c_ ** 2, 2 * a_ * b_)
check((a_ ** 2 + c_ ** 2 - b_ ** 2, 2 * a_ * c_) == (6500, 7000) and (a_ ** 2 + b_ ** 2 - c_ ** 2, 2 * a_ * b_) == (3300, 4200),
      "6500/7000 and 3300/4200")
check(cosB == F(13, 14) and cosC == F(11, 14), "cos B = 13/14, cos C = 11/14")
check(dot(vec(B, A), vec(B, C)) == cosB * c_ * a_ and dot(vec(C, A), vec(C, B)) == cosC * b_ * a_, "cosines from the model")
check(1 - cosB ** 2 == F(27, 196) and 1 - cosC ** 2 == F(75, 196), "sin^2 B = 27/196, sin^2 C = 75/196")
sinB = R3(0, F(3, 14)); sinC = R3(0, F(5, 14)); sinA = R3(0, F(1, 2))
check(sinB * sinB == 1 - cosB ** 2 and sinC * sinC == 1 - cosC ** 2 and sinA * sinA == 1 - cosA ** 2
      and sinB.q > 0 and sinC.q > 0 and sinA.q > 0, "sin B = 3sqrt3/14, sin C = 5sqrt3/14, sin A = sqrt3/2 (positive roots)")
check(close(float(sinA), math.sin(2 * pi / 3)), "sin(2pi/3) = sin(pi/3) = sqrt3/2")
check(eq_abs(det(vec(B, A), vec(B, C)), sinB * c_ * a_), "sin B from the model")
check(eq_abs(det(vec(C, A), vec(C, B)), sinC * b_ * a_), "sin C from the model")
degB, degC = math.degrees(math.acos(float(cosB))), math.degrees(math.acos(float(cosC)))
check(round(degB, 1) == 21.8 and round(degC, 1) == 38.2, "B ~ 21.8 deg, C ~ 38.2 deg")
check(math.isclose(120 + degB + degC, 180) and math.isclose(120 + round(degB, 1) + round(degC, 1), 180), "sum of angles 180 (exact and rounded)")
# 3. law of sines, R, area, altitude
check(a_ * sinB == b_ * sinA and a_ * sinC == c_ * sinA, "a/sinA = b/sinB = c/sinC (cross products)")
ratios2 = [F(a_ ** 2) / (sinA * sinA).p, F(b_ ** 2) / (sinB * sinB).p, F(c_ ** 2) / (sinC * sinC).p]
check(all(r == F(140) ** 2 / 3 for r in ratios2), "each ratio equals 140/sqrt3 = 140sqrt3/3")
check(F(b_ * 14, 3) == 140 and F(c_ * 14, 5) == 140, "30 * 14/(3sqrt3) and 50 * 14/(5sqrt3) give 140/sqrt3")
R = R3(0, F(70, 3))                                  # 70 sqrt3 / 3
check(2 * R * sinA == a_, "a = 2R sin A: R = 70/sqrt3 = 70sqrt3/3")
O = (R3(25), R3(0, F(55, 3)))                        # circumcentre in the model
check(n2(vec(O, A)) == n2(vec(O, B)) == n2(vec(O, C)) == R * R, "circumcentre at distance R from A, B, C")
check(round(float(R), 2) == 40.41, "R ~ 40.41 m")
S = F(1, 2) * c_ * b_ * sinA
check(S == R3(0, 375) and eq_abs(det(AB, AC) / 2, S), "S = 375 sqrt3")
check(round(float(S), 1) == 649.5, "S ~ 649.5 m2")
AH = 2 * S / a_
check(AH == R3(0, F(75, 7)) and eq_abs(det(BC, vec(B, A)) / a_, AH), "AH = 750sqrt3/70 = 75sqrt3/7 = distance from A to (BC)")
check(round(float(AH), 2) == 18.56, "AH ~ 18.56 m")
tH = dot(vec(B, A), BC).p / n2(BC).p
check(dot(vec(B, A), BC).q == 0 and 0 < tH < 1, "foot H of the altitude lies inside [BC]")
fourR = 4 * R
check((fourR * fourR).q == 0 and (a_ * b_ * c_) * fourR / (fourR * fourR).p == S, "abc/(4R) = S exactly")
check(fourR.q * 3 == 280 and F(a_ * b_ * c_ * 3) / (fourR.q * 3) == 1125 and R3(0, F(1125, 3)) == S,
      "105000 * 3/(280 sqrt3) = 1125/sqrt3 = 375 sqrt3")
# 4. bisector: D = intersection of (BC) with the ray from A directed by AB/AB + AC/AC (angles of pi/3)
w = (AB[0] / c_ + AC[0] / b_, AB[1] / c_ + AC[1] / b_)
num_t, den_t = det(vec(A, B), w), det(BC, w)
check(num_t.p == 0 and den_t.p == 0, "det values are multiples of sqrt3")
tD = -num_t.q / den_t.q
D = (B[0] + tD * BC[0], B[1] + tD * BC[1])
AD = vec(A, D)
check(det(AD, w) == 0 and 0 < tD < 1, "D on the bisector ray and on the segment [BC]")
ADl = F(75, 4)
check(n2(AD) == ADl ** 2, "AD = 18.75 in the model")
check(dot(AB, AD) == cos60 * c_ * ADl and dot(AD, AC) == cos60 * b_ * ADl, "angles BAD = DAC = pi/3")
kAD = F(1, 2) * c_ * sin60 + F(1, 2) * b_ * sin60
check(F(1, 2) * c_ * sin60 == R3(0, F(25, 2)) and F(1, 2) * b_ * sin60 == R3(0, F(15, 2)) and kAD == R3(0, 20),
      "areas (25sqrt3/2) AD and (15sqrt3/2) AD, sum 20sqrt3 AD")
check(S.q / kAD.q == ADl and kAD * ADl == S, "20sqrt3 AD = 375sqrt3 => AD = 375/20 = 18.75")
BD2 = c_ ** 2 + ADl ** 2 - 2 * c_ * ADl * cos60
check(ADl ** 2 == F(3515625, 10000) and 2 * c_ * ADl * cos60 == F(9375, 10) and BD2 == F(19140625, 10000),
      "BD^2 = 2500 + 351.5625 - 937.5 = 1914.0625")
check(n2(vec(B, D)) == BD2, "BD^2 matches the model")
BDl = F(175, 4)
check(BDl ** 2 == BD2 and BDl == F(4375, 100), "BD = 43.75")
DCl = a_ - BDl
check(DCl == F(2625, 100) and n2(vec(D, C)) == DCl ** 2, "DC = 70 - 43.75 = 26.25 (matches the model)")
check(BDl / DCl == F(c_, b_) == F(5, 3), "BD/DC = AB/AC = 5/3")
check(b_ ** 2 + ADl ** 2 - 2 * b_ * ADl * cos60 == DCl ** 2 == F(6890625, 10000), "DC^2 = 689.0625 by El-Kashi in ADC")
SABD = F(1, 2) * c_ * ADl * sin60; SADC = F(1, 2) * b_ * ADl * sin60
check(eq_abs(det(AB, AD) / 2, SABD) and eq_abs(det(AD, AC) / 2, SADC), "areas ABD, ADC from the model")
check(SABD.q == F(234375, 1000) and SADC.q == F(140625, 1000), "234.375 sqrt3 and 140.625 sqrt3")
check(SABD + SADC == S and SABD.q / SADC.q == F(5, 3), "areas add up to S, ratio 5/3")
check(round(float(SABD), 1) == 405.9 and round(float(SADC), 1) == 243.6, "areas ~ 405.9 and 243.6 m2")
# 5. angle ADB
DA, DB = vec(D, A), vec(D, B)
numD, denD = ADl ** 2 + BDl ** 2 - c_ ** 2, 2 * ADl * BDl
check(numD == F(-234375, 1000) and denD == F(1640625, 1000) and numD / denD == F(-1, 7), "cos ADB = -234.375/1640.625 = -1/7")
cosD = numD / denD
check(dot(DA, DB) == cosD * ADl * BDl and cosD < 0, "cos ADB from the model, negative: obtuse")
sinD2 = 1 - cosD ** 2
check(sinD2 == F(48, 49) and 0 < sinD2 < 1 and R3(0, F(4, 7)) * R3(0, F(4, 7)) == sinD2, "sin ADB = sqrt48/7 = 4sqrt3/7, in ]0, 1[")
check(eq_abs(det(DA, DB), R3(0, F(4, 7)) * ADl * BDl), "sin ADB from the model")
degD = math.degrees(math.acos(float(cosD)))
acute = math.degrees(math.asin(float(R3(0, F(4, 7)))))
check(round(degD, 1) == 98.2 and round(acute, 1) == 81.8 and round(180 - round(acute, 1), 1) == 98.2, "ADB ~ 98.2 deg; arcsin gives 81.8; 180 - 81.8 = 98.2")
check(count_roots(lambda u: math.sin(u) - float(R3(0, F(4, 7))), 0, pi) == 2, "two reals of [0, pi] have sine 4sqrt3/7")
check(math.isclose(degD + acute, 180), "the two are supplementary")
check(math.isclose(degD, 180 - 60 - degB) and round(180 - 60 - round(degB, 1), 1) == 98.2, "ADB = 180 - 60 - B (exact and rounded)")

# points of the half circle used in Ex1 4. a) b)
check(count_roots(lambda t: math.cos(t) + s3 / 2, 0, pi) == 1 and count_roots(lambda t: math.sin(t) - s3 / 2, 0, pi) == 2,
      "one point of abscissa -sqrt3/2, two of ordinate sqrt3/2")

print(f"all {ok} checks passed")
