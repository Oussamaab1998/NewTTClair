"""Checks every claim in the exercises of chapter 3 (1ere annee secondaire,
rapports trigonometriques d'un angle aigu, relations metriques dans un triangle rectangle).

Each figure is placed in a coordinate system inside this script. Exact arithmetic with
fractions and with numbers a + b*sqrt(3); the calculator values (angles, rounded lengths)
are checked with floats, and each figure is also rebuilt in floats from the given angles."""
from fractions import Fraction as F
import math

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


def make_field(d):
    """Exact numbers a + b*sqrt(d), a and b rational, d not a perfect square."""
    class Q:
        __slots__ = ("a", "b")
        def __init__(self, a, b=0):
            self.a, self.b = F(a), F(b)
        @staticmethod
        def c(x):
            return x if isinstance(x, Q) else Q(x)
        def __add__(s, o): o = Q.c(o); return Q(s.a + o.a, s.b + o.b)
        __radd__ = __add__
        def __sub__(s, o): o = Q.c(o); return Q(s.a - o.a, s.b - o.b)
        def __rsub__(s, o): return Q.c(o) - s
        def __neg__(s): return Q(-s.a, -s.b)
        def __mul__(s, o): o = Q.c(o); return Q(s.a * o.a + d * s.b * o.b, s.a * o.b + s.b * o.a)
        __rmul__ = __mul__
        def __truediv__(s, o):
            o = Q.c(o); n = o.a * o.a - d * o.b * o.b
            p = s * Q(o.a, -o.b)
            return Q(p.a / n, p.b / n)
        def __rtruediv__(s, o): return Q.c(o) / s
        def __eq__(s, o): o = Q.c(o); return s.a == o.a and s.b == o.b
        def __hash__(s): return hash((s.a, s.b))
        def __float__(s): return float(s.a) + float(s.b) * math.sqrt(d)
        def sign(s):
            a, b = s.a, s.b
            if b == 0: return (a > 0) - (a < 0)
            if a == 0: return (b > 0) - (b < 0)
            if (a > 0) == (b > 0): return 1 if a > 0 else -1
            return (1 if a > 0 else -1) if a * a > d * b * b else (1 if b > 0 else -1)
        def __lt__(s, o): return (s - o).sign() < 0
        def __gt__(s, o): return (s - o).sign() > 0
    return Q

Q3 = make_field(3)
S3 = Q3(0, 1)                     # sqrt(3)

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(P, Q): return dot(vec(P, Q), vec(P, Q))
def foot(P, A, B):
    """orthogonal projection of P on (AB), and its parameter t (H = A + t AB)"""
    t = dot(vec(A, P), vec(A, B)) / n2(A, B)
    return add(A, mul(t, vec(A, B))), t
def sqrtF(x):
    x = F(x)
    a, b = math.isqrt(x.numerator), math.isqrt(x.denominator)
    return F(a, b) if a * a == x.numerator and b * b == x.denominator else None
def fl(P): return (float(P[0]), float(P[1]))
def fangle(P, V, Q):
    """angle PVQ in degrees, from float coordinates"""
    P, V, Q = fl(P), fl(V), fl(Q)
    u, w = (P[0] - V[0], P[1] - V[1]), (Q[0] - V[0], Q[1] - V[1])
    c = (u[0] * w[0] + u[1] * w[1]) / (math.hypot(*u) * math.hypot(*w))
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))
def close(x, y, eps=1e-9): return abs(x - y) < eps
def r2(x): return round(x, 2)
def finter(P, u, Q, w):
    d = u[0] * w[1] - u[1] * w[0]
    s = ((Q[0] - P[0]) * w[1] - (Q[1] - P[1]) * w[0]) / d
    return (P[0] + s * u[0], P[1] + s * u[1])
def fdir(deg): return (math.cos(math.radians(deg)), math.sin(math.radians(deg)))

def fdist(P, Q):
    P, Q = fl(P), fl(Q)
    return math.hypot(Q[0] - P[0], Q[1] - P[1])
def angles_with_tangent(points, value):
    """the geometric angles PVQ (P, V, Q among the named points) that are acute and have tangent `value`;
    an angle is identified by its vertex and the directions of its two sides"""
    found = {}
    names = list(points)
    for v in names:
        for p in names:
            for q in names:
                if len({p, v, q}) < 3:
                    continue
                a = fangle(points[p], points[v], points[q])
                if not (1e-6 < a < 90 - 1e-6) or not close(math.tan(math.radians(a)), value, 1e-9):
                    continue
                dirs = []
                for x in (p, q):
                    P, V = fl(points[x]), fl(points[v])
                    n = math.hypot(P[0] - V[0], P[1] - V[1])
                    dirs.append((round((P[0] - V[0]) / n, 9), round((P[1] - V[1]) / n, 9)))
                found.setdefault((v, frozenset(dirs)), set()).add(p + v + q)
    return found

# recalled special values, compared with the trigonometric functions of the math library
deg = math.radians
check(close(math.cos(deg(30)), float(S3 / 2)) and close(math.tan(deg(30)), float(S3 / 3)), "rappel: cos 30 = sqrt3/2, tan 30 = sqrt3/3")
check(close(math.sin(deg(30)), 0.5) and close(math.cos(deg(60)), 0.5), "rappel: sin 30 = cos 60 = 1/2")
check(close(math.sin(deg(60)), float(S3 / 2)), "rappel: sin 60 = sqrt3/2")
COS30, TAN30, SIN30, SIN60, COS60 = S3 / 2, S3 / 3, Q3(F(1, 2)), S3 / 2, Q3(F(1, 2))


# ======================= Exercice 1 =======================
# right triangle at A with AB = 9 and BH = 5.4: C is on the perpendicular to (AB) at A,
# and H, the foot of the altitude from A, must satisfy BH = 5.4. Search C = (0, c), c = n/10.
A, B = (F(0), F(0)), (F(9), F(0))
sols = []
for n in range(1, 1000):
    Cc = (F(0), F(n, 10))
    Hc, t = foot(A, B, Cc)
    if n2(B, Hc) == F(54, 10) ** 2:
        sols.append(Cc)
check(sols == [(F(0), F(12))], "1b: seul C = (0, 12) donne BH = 5.4 (AC = 12)")
C = sols[0]
H, t = foot(A, B, C)
check(0 < t < 1 and dot(vec(A, H), vec(B, C)) == 0, "H pied de la hauteur, sur [BC]")
AB, BC, AC = sqrtF(n2(A, B)), sqrtF(n2(B, C)), sqrtF(n2(A, C))
BH, HC, AH = sqrtF(n2(B, H)), sqrtF(n2(H, C)), sqrtF(n2(A, H))
check((AB, BC, AC) == (9, 15, 12), "1b: AB = 9, BC = 15, AC = 12")
check((BH, HC, AH) == (F(27, 5), F(48, 5), F(36, 5)), "2a: BH = 5.4, HC = 9.6, AH = 7.2")
angB = fangle(A, B, C)
check(close(angle_cos := math.cos(deg(angB)), float(BH / AB)) and close(angle_cos, float(AB / BC)),
      "1a: cos de l'angle ABC mesure = BH/AB = AB/BC")
check(BH / AB == AB / BC == F(3, 5), "1a: BH/AB = AB/BC = 0.6")
check(AB ** 2 / BH == BC == 15, "1b: BC = AB^2/BH = 15")
check(BC ** 2 - AB ** 2 == AC ** 2 == 144, "1b: AC^2 = BC^2 - AB^2 = 144")
check(BC - BH == HC == F(96, 10), "2a: HC = BC - BH = 9.6")
check(AB * AC / BC == AH == F(72, 10), "2a: AH = AB x AC / BC = 7.2")
check(AH ** 2 == BH * HC == F(5184, 100), "2b: AH^2 = HB x HC = 51.84")
check(AB ** 2 - BH ** 2 == AH ** 2, "2b: Pythagore dans ABH")
cosB, sinB, tanB = AB / BC, AC / BC, AC / AB
check((cosB, sinB, tanB) == (F(3, 5), F(4, 5), F(4, 3)), "3a: cos 0.6, sin 0.8, tan 4/3")
check(close(math.sin(deg(angB)), float(sinB)) and close(math.tan(deg(angB)), float(tanB)), "3a: sin et tan de l'angle mesure")
check(sinB ** 2 + cosB ** 2 == 1 and sinB / cosB == tanB, "3a: sin^2 + cos^2 = 1, tan = sin/cos")
check(r2(angB) == 53.13 and r2(math.degrees(math.acos(0.6))) == 53.13, "3b: angle ABC ~ 53.13 (2ndF cos 0.6)")
angC = fangle(A, C, B)
check(close(angB + angC, 90) and r2(angC) == 36.87 and r2(90 - r2(angB)) == r2(angC), "3b: angle ACB ~ 90 - 53.13 = 36.87")
check(close(math.sin(deg(angC)), float(cosB)) and close(math.cos(deg(angC)), float(sinB)),
      "3c: sin ACB = cos ABC = 0.6, cos ACB = sin ABC = 0.8 (angle ACB mesure)")
check(AB / BC == F(3, 5) and AC / BC == F(4, 5), "3c: AB/BC = 0.6 et AC/BC = 0.8")
# 4. construction: [IJ] of length 4, perpendicular to (IJ) at J, K on it with JK = 3
I, J = (0.0, 0.0), (4.0, 0.0)
perp = (0.0, 1.0)
check(close(perp[0] * (J[0] - I[0]) + perp[1] * (J[1] - I[1]), 0), "4: direction perpendiculaire a (IJ)")
K = (J[0] + 3 * perp[0], J[1] + 3 * perp[1])
check(close(fangle(I, J, K), 90) and close(fdist(I, J), 4) and close(fdist(J, K), 3), "4: IJK rectangle en J, IJ = 4, JK = 3")
angJIK = fangle(J, I, K)
check(close(math.tan(deg(angJIK)), 0.75), "4: tan JIK = 0.75")
check(AB / AC == F(3, 4) and close(math.tan(deg(angC)), 0.75), "4: tan ACB = AB/AC = 0.75")
check(close(angJIK, angC) and r2(angJIK) == 36.87, "4: angle JIK = angle ACB ~ 36.87")
angBAH = fangle(B, A, H)
check(BH / AH == F(3, 4) and close(math.tan(deg(angBAH)), 0.75), "4: tan BAH = BH/AH = 5.4/7.2 = 0.75")
check(close(angBAH + angB, 90) and close(angBAH, angC), "4: BAH et ACB complementaires de ABC, donc egaux")
found = angles_with_tangent({"A": A, "B": B, "C": C, "H": H}, 0.75)
check(sorted(sorted(s) for s in found.values()) == [["ACB", "ACH", "BCA", "HCA"], ["BAH", "HAB"]],
      "4: les angles de la figure de tangente 0.75 sont exactement ACB (= ACH) et BAH")
found_D = angles_with_tangent({"A": A, "B": B, "C": C, "H": H, "D": (0.0, 3 * math.sqrt(3))}, 0.75)
check(len(found_D) == 2, "4: aucun autre angle, meme avec le point D de la question 5")
# 5. D on [AC] with angle ABD = 30 degrees
Ae, Be, Ce = (Q3(0), Q3(0)), (Q3(9), Q3(0)), (Q3(0), Q3(12))
D = (Q3(0), 3 * S3)
Dfl = finter(fl(Be), fdir(180 - 30), fl(Ae), (0.0, 1.0))      # ray from B at 30 degrees from [BA)
check(close(Dfl[0], float(D[0])) and close(Dfl[1], float(D[1])), "5: D (exact) = point construit avec l'angle 30")
check(close(fangle(Ae, Be, D), 30), "5: angle ABD = 30")
check(close(fangle(Be, Ae, D), 90), "5a: ABD rectangle en A")
check(Q3(0) < D[1] < Ce[1], "5: D sur [AC] (3 sqrt 3 < 12)")
AD = D[1] - Ae[1]
check(9 * TAN30 == AD == 3 * S3, "5a: AD = 9 tan 30 = 3 sqrt 3")
BD = Q3(9) / COS30
check(BD == Q3(18) / S3 == 6 * S3 and BD * BD == n2(Be, D), "5a: BD = 9 / cos 30 = 18/sqrt3 = 6 sqrt 3, egal a la mesure")
check(n2(Be, Ae) + n2(Ae, D) == n2(Be, D) == Q3(108), "5a: controle AB^2 + AD^2 = 81 + 27 = 108")
check(r2(fdist(Ae, D)) == 5.20 and r2(fdist(Be, D)) == 10.39, "5a: AD ~ 5.20, BD ~ 10.39")
DC = Ce[1] - D[1]
check(DC == 12 - 3 * S3 and DC * DC == n2(D, Ce), "5b: DC = 12 - 3 sqrt 3")
check(dot(vec(Ae, Be), vec(D, Ce)) == Q3(0), "5b: (BA) perpendiculaire a (DC) : BA hauteur de BDC")
area_BDC = Q3(F(1, 2)) * DC * 9
check(area_BDC == Q3(54, F(-27, 2)), "5b: aire BDC = 54 - 13.5 sqrt 3")
shoelace = abs(det(vec(fl(Be), fl(D)), vec(fl(Be), fl(Ce)))) / 2
check(close(shoelace, float(area_BDC)), "5b: aire BDC controlee par les coordonnees")
area_ABC = Q3(F(1, 2)) * 9 * 12
area_ABD = Q3(F(1, 2)) * 9 * AD
check(area_ABC - area_ABD == area_BDC, "5b: aire ABC - aire ABD")
check(r2(shoelace) == 30.62, "5b: aire ~ 30.62")
check(close(fangle(D, Be, Ce), angB - 30) and r2(fangle(D, Be, Ce)) == 23.13, "5c: angle DBC ~ 23.13")


# ======================= Exercice 2, partie A : le toit =======================
# [BC] = 8 horizontal, angle ABC = 30, angle ACB = 60 (A built in floats from the angles)
Bf, Cf = (0.0, 0.0), (8.0, 0.0)
Af = finter(Bf, fdir(30), Cf, fdir(180 - 60))
B, C = (Q3(0), Q3(0)), (Q3(8), Q3(0))
A = (Q3(6), 2 * S3)                                      # exact candidate for the ridge
check(close(Af[0], float(A[0])) and close(Af[1], float(A[1])), "A : sommet construit avec les angles 30 et 60")
check(close(fangle(A, B, C), 30) and close(fangle(A, C, B), 60), "A : angles 30 et 60")
check(close(fangle(Bf, Af, Cf), 90) and dot(vec(A, B), vec(A, C)) == Q3(0), "1a: angle BAC = 90, rectangle en A")
AB_ = Q3(8) * COS30
check(AB_ == 4 * S3 and AB_ * AB_ == n2(A, B), "1b: AB = 8 cos 30 = 4 sqrt 3, egal a la mesure")
AC_ = Q3(8) * COS60
check(AC_ == Q3(4) and AC_ * AC_ == n2(A, C), "1b: AC = 8 cos 60 = 4, egal a la mesure")
check(n2(A, B) + n2(A, C) == n2(B, C) == Q3(64), "1b: controle Pythagore 48 + 16 = 64")
check(r2(fdist(A, B)) == 6.93, "1b: AB ~ 6.93")
H, t = foot(A, B, C)
check(H == (Q3(6), Q3(0)) and Q3(0) < t < Q3(1), "2: H = pied du poteau, sur [BC]")
AH = A[1] - H[1]
check(AH * AH == n2(A, H) and AH == 2 * S3, "2a: AH = 2 sqrt 3 (mesure)")
check(close(fangle(A, H, C), 90) and close(fangle(A, C, H), 60), "2a: AHC rectangle en H, angle ACH = 60")
check(AC_ * SIN60 == AH and AB_ * AC_ / (C[0] - B[0]) == AH, "2a: AH = 4 sin 60 = AB x AC / BC")
check(r2(fdist(A, H)) == 3.46, "2a: AH ~ 3.46")
BC_ = C[0] - B[0]
BH_rel, CH_rel = n2(A, B) / BC_, n2(A, C) / BC_
check(BH_rel == H[0] - B[0] == Q3(6) and CH_rel == C[0] - H[0] == Q3(2), "2b: BH = AB^2/BC = 6, CH = AC^2/CB = 2 (mesures)")
check(BH_rel + CH_rel == BC_, "2b: controle BH + HC = BC")
check(n2(A, H) == (H[0] - B[0]) * (C[0] - H[0]) == Q3(12), "2b: AH^2 = HB x HC = 12")
angBAH, angHAC = fangle(B, A, H), fangle(H, A, C)
check(close(angBAH, 60) and close(angHAC, 30) and close(angBAH + fangle(A, B, H), 90), "3a: BAH = 60, HAC = 30")
cosBAH, sinHAC = AH / AB_, (C[0] - H[0]) / AC_
check(cosBAH == Q3(F(1, 2)) and close(float(cosBAH), math.cos(deg(angBAH))) and close(float(cosBAH), math.cos(deg(60))),
      "3b: cos BAH = AH/AB = 1/2 = cos 60")
check(sinHAC == Q3(F(1, 2)) and close(float(sinHAC), math.sin(deg(angHAC))) and close(float(sinHAC), math.sin(deg(30))),
      "3b: sin HAC = HC/AC = 1/2 = sin 30")
panel = 10 * AB_
check(panel == 40 * S3 and panel * panel == 100 * n2(A, B), "4: aire du pan 10 x AB = 40 sqrt 3")
check(r2(10 * fdist(A, B)) == 69.28, "4: aire ~ 69.28")


# ======================= Exercice 2, partie B : l'echelle =======================
# wall foot W = (0, 0), wall = positive y-axis, ladder foot P = (x, 0), top S on the wall with PS = 6
def ladder(x):
    W, P = (0.0, 0.0), (x, 0.0)
    S = (0.0, math.sqrt(36 - x * x))
    check(close(fdist(P, S), 6) and close(fangle(P, W, S), 90), "echelle de 6 m, mur perpendiculaire au sol")
    return fangle(S, P, W), S[1]
def safe(a): return 65 - 1e-9 <= a <= 75 + 1e-9
alpha_a, h_a = ladder(2.0)
check(close(math.cos(deg(alpha_a)), 1 / 3) and r2(alpha_a) == 70.53, "5a: cos a = 2/6 = 1/3, a ~ 70.53")
check(safe(alpha_a), "5a: recommandation respectee")
check(close(h_a * h_a, 32) and close(h_a, 4 * math.sqrt(2)) and r2(h_a) == 5.66, "5a: hauteur^2 = 32, hauteur 4 sqrt 2 ~ 5.66")
alpha_b, h_b = ladder(3.0)
check(close(math.cos(deg(alpha_b)), 0.5) and close(alpha_b, 60) and not safe(alpha_b), "5b: cos a = 1/2, a = 60, non respectee")
check(close(h_b * h_b, 27) and close(h_b, 3 * math.sqrt(3)) and close(h_b, 6 * float(SIN60)) and r2(h_b) == 5.20,
      "5b: hauteur^2 = 27, hauteur 3 sqrt 3 = 6 sin 60 ~ 5.20")
x75 = 6 * math.cos(deg(75))
alpha_c, h_c = ladder(x75)
check(close(alpha_c, 75) and safe(alpha_c) and r2(x75) == 1.55, "5c: a = 75 respecte la regle, pied a 6 cos 75 ~ 1.55")
check(close(h_c, 6 * math.sin(deg(75))) and r2(h_c) == 5.80, "5c: hauteur 6 sin 75 ~ 5.80")
verdicts = [h >= 5.5 and safe(a) for a, h in ((alpha_a, h_a), (alpha_b, h_b), (alpha_c, h_c))]
check(verdicts == [True, False, True], "5d: fenetre a 5.5 m atteinte en respectant la regle dans a) et c) seulement")
check(h_b < 5.5, "5d: en b) la fenetre n'est pas atteinte")

print(f"all {ok} checks passed")
