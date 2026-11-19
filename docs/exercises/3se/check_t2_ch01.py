"""Checks every value and identity used in exercises T2 ch1 (3ème Sc. exp., produit scalaire dans le plan)."""
from fractions import Fraction as F
import math, random

random.seed(1)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


class R3:
    """Exact number a + b*sqrt(3), a and b rational."""
    def __init__(self, a, b=0):
        self.a, self.b = F(a), F(b)
    def __add__(s, o):
        o = r3(o); return R3(s.a + o.a, s.b + o.b)
    __radd__ = __add__
    def __sub__(s, o):
        o = r3(o); return R3(s.a - o.a, s.b - o.b)
    def __rsub__(s, o):
        return r3(o) - s
    def __neg__(s):
        return R3(-s.a, -s.b)
    def __mul__(s, o):
        o = r3(o); return R3(s.a * o.a + 3 * s.b * o.b, s.a * o.b + s.b * o.a)
    __rmul__ = __mul__
    def __truediv__(s, q):  # division by a rational only
        q = F(q); return R3(s.a / q, s.b / q)
    def __eq__(s, o):
        o = r3(o); return s.a == o.a and s.b == o.b
    __hash__ = None
    def __gt__(s, o):  # sign of a + b*sqrt3 - (c + d*sqrt3), exact
        d = s - r3(o)
        if d.b == 0: return d.a > 0
        if d.a == 0: return d.b > 0
        if d.a > 0 and d.b > 0: return True
        if d.a < 0 and d.b < 0: return False
        return (d.a * d.a > 3 * d.b * d.b) == (d.a > 0)
    def __float__(s):
        return float(s.a) + float(s.b) * math.sqrt(3)

def r3(x):
    return x if isinstance(x, R3) else R3(x)

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return dot(u, u)
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def rnd(): return F(random.randint(-40, 40), random.randint(1, 9))

# ---------- Ex1 : AB = 4, AC = 6, angle BAC = pi/3.  Model: A(0,0), B(4,0), C(3, 3*sqrt3)
A = (R3(0), R3(0)); B = (R3(4), R3(0)); C = (R3(3), R3(0, 3))
AB, AC, BC = vec(A, B), vec(A, C), vec(B, C)
check(n2(AB) == 16 and n2(AC) == 36, "AB = 4, AC = 6")
check(dot(AB, AC) == 12 and F(4 * 6, 2) == 12, "AB.AC = 4*6*cos(pi/3) = 12")
check(math.isclose(math.acos(float(dot(AB, AC)) / 24), math.pi / 3), "angle BAC = pi/3 in the model")
check(n2(BC) == 28 and 16 + 36 - 2 * 12 == 28, "BC^2 = 28 (Al-Kashi)")
check(math.isclose(math.sqrt(float(n2(BC))), 2 * math.sqrt(7)), "BC = 2 sqrt7")
BA, CA, CB = vec(B, A), vec(C, A), vec(C, B)
check(dot(BA, BC) == 4 and F(16 + 28 - 36, 2) == 4, "BA.BC = 4")
check(dot(CA, CB) == 24 and F(36 + 28 - 16, 2) == 24, "CA.CB = 24")
check(dot(AB, AC) > 0 and dot(BA, BC) > 0 and dot(CA, CB) > 0, "triangle acutangle")
cB = 4 / (4 * 2 * math.sqrt(7)); cC = 24 / (6 * 2 * math.sqrt(7))
check(math.isclose(cB, math.sqrt(7) / 14) and math.isclose(cC, 2 * math.sqrt(7) / 7), "cos B, cos C exact forms")
check(math.isclose(cB, float(dot(BA, BC)) / math.sqrt(float(n2(BA)) * float(n2(BC)))), "cos B from model")
check(math.isclose(cC, float(dot(CA, CB)) / math.sqrt(float(n2(CA)) * float(n2(CB)))), "cos C from model")
angB, angC = math.acos(cB), math.acos(cC)
check(round(angB, 2) == 1.38 and round(angC, 2) == 0.71, "angles B ~ 1.38, C ~ 0.71")
check(math.isclose(math.pi / 3 + angB + angC, math.pi), "sum of angles = pi")
# H = projection of C on (AB)
H = (R3(3), R3(0))
AH = vec(A, H)
check(det(AH, AB) == 0 and dot(vec(H, C), AB) == 0, "H projection of C on (AB)")
check(n2(AH) == 9 and dot(AH, AB) > 0 and dot(AH, AB) == dot(AC, AB), "AH = 3, same direction, AB.AH = AB.AC")
check(n2(vec(H, B)) == 1, "HB = 1")
check(n2(vec(C, H)) == 27 and 36 - 9 == 27, "CH^2 = 27, CH = 3 sqrt3")
check(det(AB, AC) / 2 == R3(0, 6) and R3(4) * R3(0, 3) / 2 == R3(0, 6), "area = 6 sqrt3")
# K = projection of A on (BC)
t = dot(BA, BC).a / n2(BC).a
check(dot(BA, BC).b == 0 and n2(BC).b == 0 and t == F(1, 7), "K = B + (1/7) BC")
K = (B[0] + BC[0] * t, B[1] + BC[1] * t)
check(dot(vec(A, K), BC) == 0 and det(vec(B, K), BC) == 0, "K projection of A on (BC)")
check(n2(vec(B, K)) == F(4, 7) and (F(2) / 7) ** 2 * 7 == F(4, 7), "BK = 2/sqrt7 = 2sqrt7/7")
check(0 < t < 1, "K in [BC]")
check(n2(vec(A, K)) == F(108, 7) and F(16) - F(4, 7) == F(108, 7), "AK^2 = 108/7")
check(F(6) ** 2 * 21 / 49 == F(108, 7), "AK = 6 sqrt21 / 7")
check(math.isclose(0.5 * 2 * math.sqrt(7) * 6 * math.sqrt(21) / 7, 6 * math.sqrt(3)), "area via BC*AK/2")
# I midpoint of [BC]
I = mid(B, C)
AI = vec(A, I)
check(n2(AI) == 19 and F(16 + 36) == 2 * 19 + F(28, 2), "AI^2 = 19 (mediane)")
check(dot(AI, BC) == 10 and F(36 - 16, 2) == 10, "AI.BC = 10")
KI = vec(K, I)
check(n2(KI) == F(25, 7) and F(5) ** 2 * 7 / 49 == F(25, 7), "KI = 5/sqrt7 = 5sqrt7/7")
check(dot(KI, BC) == dot(AI, BC) and dot(KI, BC) > 0, "AI.BC = KI.BC, same direction")
check(math.isclose(2 / math.sqrt(7) + 5 / math.sqrt(7), math.sqrt(7)), "BK + KI = BI")
check(n2(vec(B, I)) == 7, "IB^2 = 7")
# level sets
for _ in range(300):
    M = (R3(rnd(), rnd()), R3(rnd(), rnd()))
    MB, MC, MI = vec(M, B), vec(M, C), vec(M, I)
    check(dot(MB, MC) == n2(MI) - 7, "MB.MC = MI^2 - 7")
    AM = vec(A, M)
    check(dot(AM, AB) - 12 == dot(vec(H, M), AB), "AM.AB - 12 = HM.AB")
# Gamma : MB.MC = 12 exactly on the circle centre I radius sqrt19, and not off it (float model)
fB, fC, fI = [(float(P[0]), float(P[1])) for P in (B, C, I)]
fdot = lambda M: (fB[0] - M[0]) * (fC[0] - M[0]) + (fB[1] - M[1]) * (fC[1] - M[1])
for k in range(720):
    t = 2 * math.pi * k / 720
    for r in (math.sqrt(19), 1.0, 3.0, 4.2, 4.5, 6.0):
        M = (fI[0] + r * math.cos(t), fI[1] + r * math.sin(t))
        check(math.isclose(fdot(M), r * r - 7, abs_tol=1e-9), "MB.MC = MI^2 - 7 (float)")
        check((abs(fdot(M) - 12) < 1e-9) == (r == math.sqrt(19)), "MB.MC = 12 <=> M on circle (I, sqrt19)")
check(dot(vec(A, B), vec(A, C)) == 12 and n2(AI) == 19, "A in Gamma")
check(dot(AC, AB) == 12, "C in Delta")
P = (R3(3), R3(rnd(), rnd()))
check(dot(vec(A, P), AB) == 12, "points with x = 3 are in Delta")

# ---------- Ex2 : A(-3,-1), B(5,-1), C(4,6)
A = (F(-3), F(-1)); B = (F(5), F(-1)); C = (F(4), F(6))
AB, AC, BC = vec(A, B), vec(A, C), vec(B, C)
check(dot(AB, AC) == 56 and n2(AB) == 64 and n2(AC) == 98, "AB.AC = 56, AB = 8, AC = 7 sqrt2")
check(F(56) ** 2 / (n2(AB) * n2(AC)) == F(1, 2) and dot(AB, AC) > 0, "cos BAC = sqrt2/2 -> pi/4")
check(math.isclose(math.acos(56 / (8 * 7 * math.sqrt(2))), math.pi / 4), "BAC = pi/4")
BA, CA, CB = vec(B, A), vec(C, A), vec(C, B)
check(dot(BA, BC) == 8 and n2(BC) == 50, "BA.BC = 8, BC = 5 sqrt2")
check(F(8) ** 2 / (n2(BA) * n2(BC)) == F(1, 50), "cos B = sqrt2/10")
check(dot(CA, CB) == 42 and F(42) ** 2 / (n2(CA) * n2(CB)) == F(36, 100), "cos C = 0.6")
aB, aC = math.acos(math.sqrt(2) / 10), math.acos(0.6)
check(round(aB, 2) == 1.43 and round(aC, 2) == 0.93, "B ~ 1.43, C ~ 0.93")
check(math.isclose(math.pi / 4 + aB + aC, math.pi), "angle sum")
K = (F(4), F(-1))
check(det(vec(A, K), AB) == 0 and dot(vec(K, C), AB) == 0, "K(4,-1) projection of C on (AB)")
check(n2(vec(C, K)) == 49 and F(8 * 7, 2) == 28 and abs(det(AB, AC)) / 2 == 28, "CK = 7, area 28")
# altitudes
hA = lambda x, y: x - 7 * y - 4
hB = lambda x, y: x + y - 4
check(hA(*A) == 0 and hB(*B) == 0, "altitudes pass through A and B")
for _ in range(200):
    M = (rnd(), rnd())
    check(dot(vec(A, M), BC) == -hA(*M), "AM.BC = -(x - 7y - 4)")
    check(dot(vec(B, M), AC) == 7 * hB(*M), "BM.AC = 7(x + y - 4)")
H = (F(4), F(0))
check(hA(*H) == 0 and hB(*H) == 0, "H(4,0) on both altitudes")
check(dot(vec(C, H), AB) == 0, "(CH) perpendicular to (AB)")
# circumcircle
for _ in range(200):
    M = (rnd(), rnd())
    x, y = M
    check(n2(vec(M, A)) - n2(vec(M, B)) == 16 * (x - 1), "MA^2 - MB^2 = 16(x - 1)")
    check(n2(vec(M, A)) - n2(vec(M, C)) == 14 * (x + y - 3), "MA^2 - MC^2 = 14(x + y - 3)")
    G = dot(vec(M, A), vec(M, H))
    check(G == x * x + y * y - x + y - 12, "MA.MH = x^2 + y^2 - x + y - 12")
    check(G == (x - F(1, 2)) ** 2 + (y + F(1, 2)) ** 2 - F(25, 2), "canonical form of Gamma")
W = (F(1), F(2))
check(n2(vec(W, A)) == n2(vec(W, B)) == n2(vec(W, C)) == 25, "Omega(1,2), R = 5")
sumv = tuple(vec(W, A)[k] + vec(W, B)[k] + vec(W, C)[k] for k in range(2))
check(sumv == vec(W, H) == (3, -2), "OmegaA + OmegaB + OmegaC = OmegaH")
# circle of diameter [AH]
check(mid(A, H) == (F(1, 2), F(-1, 2)) and n2(vec(A, H)) / 4 == F(25, 2), "center (1/2,-1/2), radius^2 25/2")
check(math.isclose(math.sqrt(25 / 2), 5 * math.sqrt(2) / 2), "radius 5 sqrt2 / 2")
L = (F(1), F(3))
check(det(vec(A, L), AC) == 0 and dot(vec(B, L), AC) == 0, "L(1,3) foot of altitude from B")
check(L[0] - L[1] + 2 == 0 and hB(*L) == 0, "L on (AC): x - y + 2 = 0 and on altitude from B")
check(dot(vec(K, A), vec(K, H)) == 0 and dot(vec(L, A), vec(L, H)) == 0, "K and L on Gamma")
for _ in range(200):
    M = (rnd(), rnd())
    check((dot(vec(A, M), AB) == 56) == (M[0] == 4), "AM.AB = 56 <=> x = 4")
    check(dot(vec(A, M), AB) == 8 * (M[0] + 3), "AM.AB = 8(x + 3)")
check(C[0] == 4 and H[0] == 4, "line x = 4 is (CH)")

print(f"all {ok} checks passed")
