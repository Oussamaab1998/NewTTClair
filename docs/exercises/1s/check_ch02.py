"""Checks every claim in the exercises of chapter 2 (1ere annee secondaire, theoreme de Thales).

Each figure is placed in a coordinate system inside this script; points defined in the
statement by a parallel are built as intersections of lines; exact arithmetic with fractions."""
from fractions import Fraction as F
import math, random

random.seed(2)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(P, Q): return dot(vec(P, Q), vec(P, Q))           # squared distance
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def inter(P, u, Q, w):
    d = det(u, w)
    assert d != 0
    return add(P, mul(det(vec(P, Q), w) / d, u))
def param(P, Q, M):
    """k such that M = P + k (Q - P); fails if M is not on (PQ)"""
    u, w = vec(P, Q), vec(P, M)
    assert det(u, w) == 0, "point not on the line"
    return dot(w, u) / dot(u, u)
def sqrtF(x):
    """exact square root of a non-negative fraction, or None if it is not rational"""
    x = F(x)
    a, b = math.isqrt(x.numerator), math.isqrt(x.denominator)
    return F(a, b) if a * a == x.numerator and b * b == x.denominator else None
def length(P, Q): return sqrtF(n2(P, Q))
def tri_area(P, Q, R): return abs(det(vec(P, Q), vec(P, R))) / 2


# ======================= Exercice 1 =======================
A, B, C = (F(0), F(0)), (F(6), F(0)), (F(0), F(8))
check(n2(A, B) == 36 and n2(A, C) == 64 and n2(B, C) == 100, "AB = 6, AC = 8, BC = 10")
# 1.
check(36 + 64 == 100 and dot(vec(A, B), vec(A, C)) == 0, "1: AB^2 + AC^2 = BC^2, rectangle en A")
check(tri_area(A, B, C) == 24 and F(1, 2) * 6 * 8 == 24, "1: aire 24")
# 2.
M = add(A, mul(F(45, 10) / 6, vec(A, B)))
check(length(A, M) == F(9, 2) and 0 < param(A, B, M) < 1, "2: M sur [AB], AM = 4.5")
N = inter(M, vec(B, C), A, vec(A, C))                   # parallel to (BC) through M meets (AC)
check(0 < param(A, C, N) < 1, "2: N sur [AC]")
check(F(9, 2) / 6 == F(3, 4), "2a: AM/AB = 3/4")
check(length(A, N) == 6 and length(M, N) == F(15, 2), "2a: AN = 6, MN = 7.5")
k = F(3, 4)
check(length(A, M) / 6 == k and length(A, N) / 8 == k and length(M, N) / 10 == k, "2b: rapport de reduction 3/4")
per_AMN = length(A, M) + length(A, N) + length(M, N)
check(per_AMN == 18 and 6 + 8 + 10 == 24 and k * 24 == per_AMN, "2b: perimetres 18 = (3/4) x 24")
check(dot(vec(A, M), vec(A, N)) == 0 and tri_area(A, M, N) == F(27, 2) == F(1, 2) * F(9, 2) * 6, "2b: aire AMN = 13.5")
check(k * k == F(9, 16) and k * k * 24 == F(27, 2), "2b: aire = k^2 x 24")
# 3.
P, Q = (F(0), F(2)), (F(3, 2), F(0))
check(0 < param(A, C, P) < 1 and 0 < param(A, B, Q) < 1 and length(A, P) == 2 and length(A, Q) == F(3, 2), "3: P, Q")
check(length(A, Q) / length(A, B) == length(A, P) / length(A, C) == F(1, 4), "3a: AQ/AB = AP/AC = 1/4")
check(det(vec(Q, P), vec(B, C)) == 0, "3a: (PQ) // (BC)")
check(det(vec(Q, P), vec(M, N)) == 0, "3a: (PQ) // (MN)")
check(length(P, Q) == length(B, C) * length(A, Q) / length(A, B) == F(5, 2), "3b: PQ = BC x AQ/AB = 2.5")
check(n2(A, Q) + n2(A, P) == n2(P, Q) == F(25, 4), "3b: controle Pythagore dans APQ (2.25 + 4 = 6.25)")
R = (F(0), F(3))
check(0 < param(A, C, R) < 1 and length(A, R) == 3, "3c: R sur [AC], AR = 3")
check(length(A, R) / length(A, C) == F(3, 8) and length(A, Q) / length(A, B) == F(2, 8), "3c: AR/AC = 3/8, AQ/AB = 2/8")
check(det(vec(Q, R), vec(B, C)) != 0, "3c: (QR) non parallele a (BC)")
# 4.
E, Fp = (F(-3), F(0)), (F(0), F(-4))
check(det(vec(A, B), vec(A, E)) == 0 and 0 < param(B, E, A) < 1 and length(A, E) == 3, "4: E sur (AB), A dans [BE], AE = 3")
check(det(vec(A, C), vec(A, Fp)) == 0 and 0 < param(C, Fp, A) < 1 and length(A, Fp) == 4, "4: F sur (AC), A dans [CF], AF = 4")
check(length(A, E) / length(A, B) == length(A, Fp) / length(A, C) == F(1, 2), "4a: AE/AB = AF/AC = 1/2")
check(det(vec(E, Fp), vec(B, C)) == 0, "4a: (EF) // (BC)")
check(length(E, Fp) == length(B, C) * length(A, E) / length(A, B) == 5, "4b: EF = BC x AE/AB = 5")
# 5. construction of G on [BC] with BG = (2/5) BC, for many rays [Bx)
G_expected = add(B, mul(F(2, 5), vec(B, C)))
done = 0
while done < 60:
    w = (F(random.randint(-20, 20), random.randint(1, 6)), F(random.randint(-20, 20), random.randint(1, 6)))
    if det(w, vec(B, C)) == 0:
        continue                                        # the ray must not be carried by (BC)
    done += 1
    U = [add(B, mul(i, w)) for i in range(6)]           # B = U0, U1, ..., U5 equally spaced
    check(all(n2(U[i], U[i + 1]) == n2(U[0], U[1]) for i in range(5)), "5: BU1 = U1U2 = ... = U4U5")
    G = inter(U[2], vec(U[5], C), B, vec(B, C))         # parallel to (U5C) through U2
    check(G == G_expected, "5: G independant de la demi-droite choisie")
    check(param(B, U[5], U[2]) == F(2, 5) and param(B, C, G) == F(2, 5), "5: BG/BC = BU2/BU5 = 2/5")
check(length(B, G_expected) == 4, "5: BG = 4")


# ======================= Exercice 2 : deux poteaux =======================
def poles(a, b, d):
    """ground (AD) on the x-axis, A = (0, 0), D = (d, 0), pole tops B = (0, a), C = (d, b)"""
    A, D = (F(0), F(0)), (F(d), F(0))
    B, C = (F(0), F(a)), (F(d), F(b))
    O = inter(B, vec(B, D), A, vec(A, C))               # cables (BD) and (AC)
    Hf = inter(O, (F(0), F(1)), A, vec(A, D))            # perpendicular to the ground through O
    return A, B, C, D, O, Hf

A, B, C, D, O, H = poles(6, 3, 9)
check(dot(vec(A, B), vec(A, D)) == 0 and dot(vec(D, C), vec(A, D)) == 0, "1a: poteaux perpendiculaires au sol")
check(det(vec(A, B), vec(D, C)) == 0, "1a: (AB) // (DC)")
check(n2(B, D) == 117 == 9 * 13 and n2(A, C) == 90 == 9 * 10, "1b: BD = 3 sqrt 13, AC = 3 sqrt 10")
check(round(3 * math.sqrt(13), 2) == 10.82 and round(3 * math.sqrt(10), 2) == 9.49, "1b: valeurs approchees")
check(0 < param(B, D, O) < 1 and 0 < param(A, C, O) < 1, "2: O sur les deux cables")
check(param(O, B, D) == F(-1, 2) and param(O, A, C) == F(-1, 2), "2a: OD/OB = OC/OA = 1/2 (configuration papillon)")
check(length(D, C) / length(A, B) == F(1, 2), "2a: DC/AB = 1/2")
check(param(B, D, O) == F(2, 3), "2b: OB = 2BD/3, OD = BD/3")
check(n2(O, D) == 13 and n2(O, B) == 52 == 4 * 13, "2b: OD = sqrt 13, OB = 2 sqrt 13")
check(n2(O, C) == 10 and n2(O, A) == 40 == 4 * 10, "2b: OC = sqrt 10, OA = 2 sqrt 10")
check([round(x, 2) for x in (math.sqrt(13), 2 * math.sqrt(13), math.sqrt(10), 2 * math.sqrt(10))] == [3.61, 7.21, 3.16, 6.32],
      "2b: valeurs approchees")
check(det(vec(O, H), vec(A, B)) == 0 and dot(vec(O, H), vec(A, D)) == 0, "3a: (OH) // (AB)")
check(0 < param(D, A, H) < 1, "3b: H sur [AD]")
check(param(D, A, H) == param(D, B, O) == F(1, 3) and length(O, H) / length(A, B) == F(1, 3), "3b: DH/DA = DO/DB = OH/AB = 1/3")
check(length(D, H) == 3 and length(O, H) == 2 and length(A, H) == 6, "3b: DH = 3, OH = 2, AH = 6")
check(0 < param(D, B, O) < 1 and 0 < param(A, C, O) < 1, "3b: O sur les deux cables")
check(length(D, H) == 9 * param(D, B, O) == 3 and length(A, H) == 9 * param(A, C, O) == 6, "3b: DH = 9 x DO/DB, AH = 9 x AO/AC")
check(length(D, H) < 9 and length(A, H) < 9 and length(D, H) + length(A, H) == length(A, D) == 9,
      "3b: DH = 3 < 9, AH = 6 < 9, donc H entre A et D et DH + AH = 9")
check(param(A, D, H) == param(A, C, O) == F(2, 3) and length(O, H) == F(2, 3) * 3, "3c: AH/AD = AO/AC = OH/DC = 2/3")
# 4. general case
for _ in range(300):
    a = F(random.randint(1, 200), random.randint(1, 10))
    b = F(random.randint(1, 200), random.randint(1, 10))
    d = F(random.randint(1, 200), random.randint(1, 10))
    A_, B_, C_, D_, O_, H_ = poles(a, b, d)
    OH, DH, AH = O_[1], length(D_, H_), length(A_, H_)
    check(0 < param(D_, B_, O_) < 1 and 0 < param(A_, C_, O_) < 1, "4b: O sur les deux cables")
    check(DH == d * param(D_, B_, O_) < d and AH == d * param(A_, C_, O_) < d, "4b: DH = d x DO/DB < d, AH = d x AO/AC < d")
    check(0 < param(A_, D_, H_) < 1 and DH + AH == d, "4b: H entre A et D, DH + AH = d")
    check(OH / a == DH / d and OH / b == AH / d, "4a: OH/a = DH/d et OH/b = AH/d")
    check(OH / a + OH / b == 1, "4b: OH/a + OH/b = 1")
    check(OH == a * b / (a + b), "4b: OH = ab/(a + b)")
    d2 = d + random.randint(1, 50)
    check(poles(a, b, d2)[4][1] == OH, "4b: OH ne depend pas de la distance entre les poteaux")
    A_, B_, C_, D_, O_, H_ = poles(a, a, d)
    check(O_[1] == a / 2 and O_ == mid(A_, C_) == mid(B_, D_), "4c: poteaux egaux : OH = a/2, O centre du rectangle")
check(poles(6, 3, 9)[4][1] == F(6 * 3, 6 + 3) == 2, "4c: formule avec a = 6, b = 3 : OH = 2")
# 5.
b5 = F(24, 10) / (1 - F(24, 10) / 6)
check(b5 == 4, "5: 2.4/6 + 2.4/b = 1 donne b = 2.4/0.6 = 4")
check(poles(6, b5, 9)[4][1] == F(12, 5) == F(6 * 4, 6 + 4), "5: avec un poteau de 4 m, les cables se croisent a 2.4 m")
grid = [F(i, 8) for i in range(1, 400)]
heights = [poles(6, b, 9)[4][1] for b in grid]
check(all(heights[i] < heights[i + 1] for i in range(len(heights) - 1)), "5: OH croit avec b")
check([b for b, h in zip(grid, heights) if h == F(12, 5)] == [F(4)], "5: b = 4 est la seule solution")
# 6.
A, B, C, D, O, H = poles(6, 3, 9)
P = add(B, mul(F(1, 3), vec(B, D)))
Q = (F(0), F(4))
check(0 < param(B, A, Q) < 1 and length(A, Q) == 4 and length(B, Q) == 2, "6: Q sur [AB], AQ = 4, BQ = 2")
check(param(B, D, P) == F(1, 3) and param(B, A, Q) == F(1, 3), "6a: BP/BD = BQ/BA = 1/3")
check(det(vec(Q, P), vec(A, D)) == 0, "6a: (PQ) // (AD)")
K = (P[0], F(0))
check(dot(vec(A, Q), vec(A, K)) == 0 and vec(A, Q) == vec(K, P) and dot(vec(Q, P), vec(Q, A)) == 0,
      "6b: AQPK rectangle (K pied de P sur le sol)")
check(P[1] == 4 and length(K, P) == 4, "6b: l'anneau est a 4 m du sol")
check(length(Q, P) == 3 and length(Q, P) / length(A, D) == F(1, 3), "6b: PQ = AD/3 = 3")
check(param(B, D, P) < param(B, D, O), "6: P est entre B et O")

print(f"all {ok} checks passed")
