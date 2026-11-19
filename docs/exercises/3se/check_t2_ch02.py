"""Checks every value used in exercises T2 ch2 (3ème Sc. exp., angles orientés).

Oriented angles are computed in an orthonormal direct frame with atan2 and compared
modulo 2*pi; the claimed principal measures are exact fractions of pi in ]-1, 1].
"""
from fractions import Fraction as F
import math, random

random.seed(2)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

TOL = 1e-9
PI = math.pi
def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def cross(u, v): return u[0] * v[1] - u[1] * v[0]
def norm(u): return math.hypot(u[0], u[1])
def ang(u, v):
    """A measure of the oriented angle (u, v)."""
    return math.atan2(cross(u, v), dot(u, v))
def geo(u, v):
    """Geometric angle between u and v, in [0, pi]."""
    return math.acos(max(-1.0, min(1.0, dot(u, v) / (norm(u) * norm(v)))))
def cong(a, b, mod=2 * PI):
    d = (a - b) % mod
    return min(d, mod - d) < TOL
def is_principal(fr):
    return -1 < fr <= 1
def principal(fr):
    """Principal measure (as a fraction of pi) of the angle fr*pi."""
    m = math.ceil((fr - 1) / 2)
    return fr - 2 * m
def angle_is(u, v, fr, msg):
    check(is_principal(fr), "claimed value is principal: " + msg)
    check(cong(ang(u, v), float(fr) * PI), msg)
def rot(u, t): return (u[0] * math.cos(t) - u[1] * math.sin(t), u[0] * math.sin(t) + u[1] * math.cos(t))
def pt(r, t): return (r * math.cos(t), r * math.sin(t))
def neg(u): return (-u[0], -u[1])
def scal(k, u): return (k * u[0], k * u[1])
def close(P, Q): return abs(P[0] - Q[0]) < TOL and abs(P[1] - Q[1]) < TOL

# ---------- Ex1 Q1 : (u, v) = 29pi/3, (v, w) = -43pi/4
check(principal(F(29, 3)) == F(-1, 3), "29pi/3 -> -pi/3")
check(F(29, 3) - F(-1, 3) == 10, "29pi/3 = -pi/3 + 10pi")
check(principal(F(-43, 4)) == F(-3, 4), "-43pi/4 -> -3pi/4")
check(F(-43, 4) - F(-3, 4) == -10, "-43pi/4 = -3pi/4 - 10pi")
check(F(-1, 3) + F(-3, 4) == F(-13, 12) and principal(F(-13, 12)) == F(11, 12), "(u, w) -> 11pi/12")
check(principal(F(-11, 12)) == F(-11, 12), "(w, u) -> -11pi/12")
check(F(11, 12) + 1 == F(23, 12) and principal(F(23, 12)) == F(-1, 12), "(-u, w) -> -pi/12")
check(principal(F(-3, 4) + 1) == F(1, 4), "(2v, -5w) -> pi/4")
for t0 in [0.0, 0.7, -2.1, 3.0]:  # independent check with actual vectors
    u = pt(1.3, t0)
    v = pt(0.4, t0 + 29 * PI / 3)
    w = pt(2.2, t0 + 29 * PI / 3 - 43 * PI / 4)
    angle_is(u, v, F(-1, 3), "(u, v)")
    angle_is(v, w, F(-3, 4), "(v, w)")
    angle_is(u, w, F(11, 12), "(u, w)")
    angle_is(w, u, F(-11, 12), "(w, u)")
    angle_is(neg(u), w, F(-1, 12), "(-u, w)")
    angle_is(scal(2, v), scal(-5, w), F(1, 4), "(2v, -5w)")

# ---------- Ex1 hexagon : centre O, radius 1, (OA, OB) = pi/3, direct order
O = (0.0, 0.0)
names = "ABCDEF"
P = {names[k]: pt(1, k * PI / 3) for k in range(6)}
A, B, C, D, E, Fp = (P[c] for c in names)
for k in range(6):
    X, Y = P[names[k]], P[names[(k + 1) % 6]]
    angle_is(vec(O, X), vec(O, Y), F(1, 3), "consecutive vertices pi/3")
    check(math.isclose(norm(vec(X, Y)), 1), "side = radius = 1")
angle_is(vec(O, A), vec(O, C), F(2, 3), "(OA, OC) = 2pi/3")
angle_is(vec(O, A), vec(O, E), F(-2, 3), "(OA, OE) = -2pi/3")
angle_is(vec(O, C), vec(O, Fp), F(1), "(OC, OF) = pi")
angle_is(vec(O, D), vec(O, B), F(-2, 3), "(OD, OB) = -2pi/3")
check(close(((C[0] + Fp[0]) / 2, (C[1] + Fp[1]) / 2), O), "O midpoint of [CF]")
angle_is(vec(A, B), vec(A, O), F(1, 3), "(AB, AO) = pi/3")
angle_is(vec(B, O), vec(B, A), F(1, 3), "(BO, BA) = pi/3")
angle_is(vec(A, O), vec(A, Fp), F(1, 3), "(AO, AF) = pi/3")
angle_is(vec(Fp, A), vec(Fp, O), F(1, 3), "(FA, FO) = pi/3")
angle_is(vec(A, B), vec(A, Fp), F(2, 3), "(AB, AF) = 2pi/3")
# Q3 a : inscribed angle, (CA) perpendicular to (CD)
angle_is(vec(O, A), vec(O, D), F(1), "(OA, OD) = pi")
check(cong(2 * ang(vec(C, A), vec(C, D)), PI), "2(CA, CD) = pi")
check(abs(dot(vec(C, A), vec(C, D))) < TOL, "(CA) perp (CD)")
for M in (B, C, E, Fp):  # inscribed angle theorem on the hexagon circle
    check(cong(2 * ang(vec(M, A), vec(M, D)), ang(vec(O, A), vec(O, D))), "angle inscrit")
# Q3 b : AB = OC, DE = OF, (AB, DE) = pi
check(close(vec(A, B), vec(O, C)) and close(vec(D, E), vec(O, Fp)), "OABC and ODEF rhombi")
angle_is(vec(A, B), vec(D, E), F(1), "(AB, DE) = pi")
# Q4 : Gamma = {M : (MA, MD) = pi/2 [2pi]}
angle_is(vec(E, O), vec(E, D), F(1, 3), "(EO, ED) = pi/3")
angle_is(vec(O, E), vec(O, A), F(2, 3), "(OE, OA) = 2pi/3")
check(cong(2 * ang(vec(E, A), vec(E, O)), PI / 3), "2(EA, EO) = pi/3")
check(math.isclose(geo(vec(E, A), vec(E, O)), PI / 6), "angle AEO = pi/6")
angle_is(vec(E, A), vec(E, O), F(1, 6), "(EA, EO) = pi/6")
angle_is(vec(E, A), vec(E, D), F(1, 2), "(EA, ED) = pi/2")
angle_is(vec(Fp, A), vec(Fp, D), F(1, 2), "(FA, FD) = pi/2")
angle_is(vec(B, A), vec(B, D), F(-1, 2), "(BA, BD) = -pi/2")
angle_is(vec(C, A), vec(C, D), F(-1, 2), "(CA, CD) = -pi/2")
for k in range(1, 2000):
    phi = 2 * PI * k / 2000
    if abs(math.sin(phi)) < 1e-6:
        continue  # A or D
    M = pt(1, phi)
    a = ang(vec(M, A), vec(M, D))
    check(cong(a, PI / 2) == (math.sin(phi) < 0), "Gamma = lower half-circle (contains E, F)")
    check(cong(a, -PI / 2) == (math.sin(phi) > 0), "upper half gives -pi/2")
for _ in range(3000):
    M = (random.uniform(-3, 3), random.uniform(-3, 3))
    if abs(norm(M) - 1) < 1e-3:
        continue
    check(not cong(ang(vec(M, A), vec(M, D)), PI / 2, 2 * PI), "points off the circle are not in Gamma")
# Q5 : determinant through n with ||n|| = ||OA|| and (OA, n) = pi/2
n = rot(vec(O, A), PI / 2)
check(math.isclose(norm(n), 1) and abs(dot(n, vec(O, A))) < TOL, "(OA, n) orthonormal")
angle_is(vec(O, A), n, F(1, 2), "(OA, n) = pi/2 : base directe")
angle_is(n, vec(O, B), F(-1, 6), "(n, OB) = -pi/6")
angle_is(n, vec(O, C), F(1, 6), "(n, OC) = pi/6")
check(math.isclose(dot(n, vec(O, B)), math.sqrt(3) / 2), "det(OA, OB) = sqrt3/2")
check(math.isclose(dot(n, vec(O, C)), math.sqrt(3) / 2), "det(OA, OC) = sqrt3/2")
check(math.isclose(cross(vec(O, A), vec(O, B)), dot(n, vec(O, B))), "definition matches xy' - x'y")
check(math.isclose(cross(vec(O, A), vec(O, C)), dot(n, vec(O, C))), "definition matches xy' - x'y (C)")
check(abs(cross(vec(O, A), vec(O, D))) < TOL and abs(cross(vec(O, B), vec(O, E))) < TOL, "det(OA, OD) = det(OB, OE) = 0")
for _ in range(200):  # the definition u'.v equals xy' - x'y in general
    u = (random.uniform(-3, 3), random.uniform(-3, 3)); v = (random.uniform(-3, 3), random.uniform(-3, 3))
    check(math.isclose(dot(rot(u, PI / 2), v), cross(u, v), abs_tol=1e-12), "det(u, v) = u'.v")

# ---------- Ex2 : square ABCD (AB, AD) = pi/2, ABE equilateral (AB, AE) = pi/3, BCF equilateral (BC, BF) = -pi/3
A, B, C, D = (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)
E = pt(1, PI / 3)
Fp = (B[0] + math.cos(PI / 6), B[1] + math.sin(PI / 6))
angle_is(vec(A, B), vec(A, D), F(1, 2), "(AB, AD) = pi/2")
angle_is(vec(A, B), vec(A, E), F(1, 3), "(AB, AE) = pi/3")
angle_is(vec(B, C), vec(B, Fp), F(-1, 3), "(BC, BF) = -pi/3")
check(all(math.isclose(norm(vec(X, Y)), 1) for X, Y in [(A, B), (B, E), (E, A), (B, C), (C, Fp), (Fp, B)]), "equilateral")
check(0 < E[0] < 1 and 0 < E[1] < 1, "E inside the square")
check(Fp[0] > 1, "F outside the square")
# Q1
angle_is(vec(B, A), vec(B, C), F(-1, 2), "(BA, BC) = -pi/2")
check(close(vec(B, C), vec(A, D)), "BC = AD")
angle_is(vec(A, D), vec(A, E), F(-1, 6), "(AD, AE) = -pi/6")
angle_is(vec(B, E), vec(B, A), F(1, 3), "(BE, BA) = pi/3")
angle_is(vec(E, A), vec(E, B), F(1, 3), "(EA, EB) = pi/3")
angle_is(vec(B, E), vec(B, Fp), F(-1, 2), "(BE, BF) = -pi/2")
check(math.isclose(norm(vec(A, D)), norm(vec(A, E))), "ADE isosceles at A")
check(math.isclose(geo(vec(A, D), vec(A, E)), PI / 6), "angle DAE = pi/6")
check(math.isclose(geo(vec(E, A), vec(E, D)), 5 * PI / 12) and math.isclose(geo(vec(D, A), vec(D, E)), 5 * PI / 12), "base angles 5pi/12")
check(math.isclose(norm(vec(B, E)), norm(vec(B, Fp))) and math.isclose(geo(vec(B, E), vec(B, Fp)), PI / 2), "BEF right isosceles at B")
check(math.isclose(geo(vec(E, B), vec(E, Fp)), PI / 4), "angle BEF = pi/4")
# Q2
check(cong(2 * ang(vec(E, A), vec(E, D)), 7 * PI / 6), "2(EA, ED) = 7pi/6")
check(cong(2 * (-5 * PI / 12), 7 * PI / 6) and not cong(2 * (5 * PI / 12), 7 * PI / 6), "-5pi/12 chosen, not 5pi/12")
check(cong(7 * PI / 12 + PI, -5 * PI / 12), "7pi/12 [pi] gives 7pi/12 or -5pi/12")
angle_is(vec(E, A), vec(E, D), F(-5, 12), "(EA, ED) = -5pi/12")
angle_is(vec(E, D), vec(E, A), F(5, 12), "(ED, EA) = 5pi/12")
check(cong(2 * ang(vec(E, Fp), vec(E, B)), 3 * PI / 2), "2(EF, EB) = 3pi/2")
angle_is(vec(E, Fp), vec(E, B), F(-1, 4), "(EF, EB) = -pi/4")
angle_is(vec(E, B), vec(E, Fp), F(1, 4), "(EB, EF) = pi/4")
check(F(5, 12) + F(1, 3) + F(1, 4) == 1, "5pi/12 + pi/3 + pi/4 = pi")
angle_is(vec(E, D), vec(E, Fp), F(1), "(ED, EF) = pi")
check(abs(cross(vec(D, E), vec(D, Fp))) < TOL and dot(vec(E, D), vec(E, Fp)) < 0, "D, E, F aligned, E between")
# Q3
check(all(math.isclose(norm(vec(B, X)), 1) for X in (A, E, C, Fp)), "A, E, C, F on circle centre B radius a")
angle_is(vec(B, E), vec(B, C), F(-1, 6), "(BE, BC) = -pi/6")
check(math.isclose(geo(vec(E, B), vec(E, C)), 5 * PI / 12), "angle BEC = 5pi/12")
check(cong(2 * ang(vec(E, C), vec(E, B)), 7 * PI / 6), "2(EC, EB) = 7pi/6")
angle_is(vec(E, B), vec(E, C), F(5, 12), "(EB, EC) = 5pi/12")
check(F(1, 3) + F(5, 12) == F(3, 4), "pi/3 + 5pi/12 = 3pi/4")
angle_is(vec(E, A), vec(E, C), F(3, 4), "(EA, EC) = 3pi/4")
check(cong(2 * 3 * PI / 4, ang(vec(B, A), vec(B, C))), "2(EA, EC) = (BA, BC) (angle inscrit)")
# Q4 : Lambda = {M : (MA, MC) = 3pi/4 [2pi]}
for k in range(1, 4000):
    phi = 2 * PI * k / 4000  # M = B + (cos phi, sin phi); A at phi = pi, C at phi = pi/2
    if min(abs(phi - PI / 2), abs(phi - PI)) < 1e-6:
        continue
    M = (B[0] + math.cos(phi), B[1] + math.sin(phi))
    a = ang(vec(M, A), vec(M, C))
    inside = PI / 2 < phi < PI
    check(cong(a, 3 * PI / 4) == inside, "Lambda = quarter circle inside the square")
    check(cong(a, -PI / 4) == (not inside), "other arc gives -pi/4")
    check(inside == (0 <= M[0] <= 1 and 0 <= M[1] <= 1), "arc inside the square <=> pi/2 < phi < pi")
for _ in range(3000):
    M = (random.uniform(-2, 3), random.uniform(-2, 3))
    if abs(norm(vec(B, M)) - 1) < 1e-3:
        continue
    check(not cong(ang(vec(M, A), vec(M, C)), 3 * PI / 4), "points off Gamma are not in Lambda")
angle_is(vec(Fp, A), vec(Fp, C), F(-1, 4), "(FA, FC) = -pi/4")
angle_is(vec(B, A), vec(B, Fp), F(-5, 6), "(BA, BF) = -5pi/6")
angle_is(vec(Fp, A), vec(Fp, B), F(1, 12), "(FA, FB) = pi/12")
angle_is(vec(Fp, B), vec(Fp, C), F(-1, 3), "(FB, FC) = -pi/3")
check(cong(2 * ang(vec(Fp, A), vec(Fp, B)), PI / 6), "2(FA, FB) = pi/6")
check(math.isclose(geo(vec(Fp, A), vec(Fp, B)), PI / 12), "angle AFB = pi/12")

print(f"all {ok} checks passed")
