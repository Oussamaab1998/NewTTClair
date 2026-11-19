"""Checks every claim in the exercises of chapter 4 (1ere annee, vecteurs et translations).

Each figure is placed in a coordinate system inside this script (the exercises
themselves use no coordinates). Exact arithmetic with fractions; points of the
form (x, s) stand for (x, s*sqrt(7)) when sqrt(7) is needed; floats only for
the approximate lengths of the bridge problem."""
from fractions import Fraction as F
import math, random

random.seed(4)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def n2(u): return dot(u, u)
def d2(P, Q): return n2(vec(P, Q))
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def sym(I, M): return (2 * I[0] - M[0], 2 * I[1] - M[1])  # symetrique de M par rapport a I
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def rnd(): return F(random.randint(-30, 30), random.randint(1, 7))
def rpt(): return (rnd(), rnd())
def same_vector(A, B, C, D):
    """Textbook definition: vec(AB) = vec(CD) iff [AD] and [BC] have the same midpoint."""
    return mid(A, D) == mid(B, C)
def parallelogram(P, Q, R, S):
    """PQRS is a (non flat) parallelogram: diagonals [PR], [QS] same midpoint, P, Q, R not aligned."""
    return mid(P, R) == mid(Q, S) and not aligned(P, Q, R)
def exact_len(n):
    """Exact square root of a rational perfect square (fails otherwise)."""
    n = F(n)
    a, b = math.isqrt(n.numerator), math.isqrt(n.denominator)
    if a * a != n.numerator or b * b != n.denominator:
        raise SystemExit("FAIL: not a perfect square: %s" % n)
    return F(a, b)
def circle_points(I, r, n=40):
    """Rational points of the circle of centre I and rational radius r."""
    pts = []
    for k in range(-n, n + 1):
        t = F(k, 7)
        pts.append((I[0] + r * (1 - t * t) / (1 + t * t), I[1] + r * 2 * t / (1 + t * t)))
    pts.append((I[0] - r, I[1]))
    return pts

# ======================= Exercice 1 : triangle ABC, t = translation de vecteur vec(AB)
done = 0
while done < 200:
    A, B, C = rpt(), rpt(), rpt()
    if aligned(A, B, C):
        continue
    done += 1
    u = vec(A, B)
    t = lambda M: add(M, u)
    I = mid(A, B)
    # 1. a) t(A) = B ; D = t(C), E = t(B)
    check(t(A) == B, "t(A) = B")
    D, E = t(C), t(B)
    # 1. b) ABDC parallelogramme ; B milieu de [AE]
    check(vec(C, D) == vec(A, B) and same_vector(A, B, C, D), "vec(CD) = vec(AB)")
    check(parallelogram(A, B, D, C), "ABDC parallelogramme")
    check(mid(A, E) == B, "B milieu de [AE]")
    # 2. a) vec(AC) = vec(BD) ; vec(BC) = vec(ED)   b) BCDE parallelogramme
    check(vec(A, C) == vec(B, D) and same_vector(A, C, B, D), "vec(AC) = vec(BD)")
    check(vec(B, E) == vec(C, D), "vec(BE) = vec(CD)")
    check(vec(B, C) == vec(E, D) and same_vector(B, C, E, D), "vec(BC) = vec(ED)")
    check(parallelogram(B, C, D, E), "BCDE parallelogramme")
    check(not aligned(B, C, E), "B, C, E non alignes")
    # 3. a) image du triangle ABC : BED, longueurs conservees
    check((t(A), t(B), t(C)) == (B, E, D), "t(ABC) = BED")
    check(d2(B, D) == d2(A, C) and d2(D, E) == d2(B, C) and d2(B, E) == d2(A, B), "BD = AC, DE = BC, BE = AB")
    # 3. b) images des droites (AB), (AC), (BC)
    for _ in range(5):
        k = rnd()
        M = add(A, mul(k, vec(A, B)))       # point de (AB)
        check(aligned(A, B, t(M)), "t((AB)) = (AB)")
        M = add(A, mul(k, vec(A, C)))       # point de (AC)
        check(aligned(B, D, t(M)), "t((AC)) = (BD)")
        M = add(B, mul(k, vec(B, C)))       # point de (BC)
        check(aligned(E, D, t(M)), "t((BC)) = (ED)")
    check(det(vec(A, C), vec(B, D)) == 0 and not aligned(A, C, B), "(BD) parallele a (AC), distincte")
    check(det(vec(B, C), vec(E, D)) == 0 and not aligned(B, C, E), "(ED) parallele a (BC), distincte")
    # 4. F symetrique de C par rapport a B
    Fp = sym(B, C)
    check(mid(C, Fp) == B, "B milieu de [CF]")
    check(parallelogram(A, C, E, Fp), "ACEF parallelogramme (diagonales [AE], [CF] de meme milieu B)")
    check(vec(A, C) == vec(Fp, E), "vec(AC) = vec(FE)")
    check(vec(B, D) == vec(Fp, E), "vec(BD) = vec(FE)")
    check(mid(B, E) == mid(D, Fp), "[BE] et [DF] ont le meme milieu")
    # 5. a) I' = t(I) milieu de [BE] et de [DF]
    Ip = t(I)
    check(Ip == mid(B, E) and Ip == mid(D, Fp), "I' milieu de [BE] et de [DF]")
    check(d2(B, Ip) == d2(A, I) and d2(Ip, E) == d2(I, B), "BI' = AI et I'E = IB")
    # 5. b) image du cercle de diametre [AB] : centre I', meme rayon ; seul point commun B
    r2 = d2(A, B) / 4
    check(d2(I, Ip) == d2(A, B), "II' = AB = 2r")
    check(d2(Ip, B) == r2 and d2(I, B) == r2 and d2(Ip, E) == r2, "B sur les deux cercles, E sur le cercle image")
    check(mid(I, Ip) == B, "B milieu de [II']")

# cercle : points rationnels, avec AB rationnel (A, B choisis sur une droite horizontale)
for _ in range(30):
    A = rpt(); B = (A[0] + abs(rnd()) + 1, A[1])
    u = vec(A, B); I = mid(A, B); Ip = add(I, u); r = (B[0] - A[0]) / 2
    pts = circle_points(I, r)
    for M in pts:
        check(d2(I, M) == r * r, "point sur (Gamma)")
        check(d2(Ip, add(M, u)) == r * r, "image sur (Gamma')")
        check((d2(Ip, M) == r * r) == (M == B), "seul point commun : B")

# Donnees numeriques : AB = 6, AC = 4, BC = 5. A(0,0), B(6,0), C(9/4, 5 sqrt7 / 4).
# Point (x, s) represente (x, s*sqrt(7)).
def d2s(P, Q): return (Q[0] - P[0]) ** 2 + 7 * (Q[1] - P[1]) ** 2
A, B, C = (F(0), F(0)), (F(6), F(0)), (F(9, 4), F(5, 4))
check(d2s(A, B) == 36 and d2s(A, C) == 16 and d2s(B, C) == 25, "AB = 6, AC = 4, BC = 5")
check(C[1] != 0, "ABC non aplati")
u = vec(A, B)
D, E, I = add(C, u), add(B, u), mid(A, B)
Fp = sym(B, C); Ip = add(I, u)
check(d2s(B, D) == 16 and d2s(D, E) == 25 and d2s(B, E) == 36, "BD = 4, DE = 5, BE = 6")
lens = lambda *pts: sum(exact_len(d2s(pts[i], pts[(i + 1) % len(pts)])) for i in range(len(pts)))
check(lens(B, E, D) == 15 and lens(B, E, D) == lens(A, B, C), "perimetre BED = 15 = perimetre ABC")
check(d2s(C, D) == 36 and lens(B, C, D, E) == 22, "BCDE : BC = 5, CD = 6, perimetre 22")
check(d2s(A, I) == 9 and d2s(Ip, B) == 9 and d2s(I, Ip) == 36, "rayon 3, II' = 6")
check(d2s(A, E) == 144, "AE = 12")

# ======================= Exercice 2 : le pont (unite : le metre)
# d1 : y = 0 ; d2 : y = 20 ; A du cote de d1, B de l'autre cote de d2.
A, B = (F(0), F(-45)), (F(80), F(35))
H, K = (F(0), F(0)), (F(80), F(0))
check(-A[1] == 45 and B[1] - 20 == 15, "A a 45 m de d1, B a 15 m de d2")
check(d2(H, K) == 80 ** 2 and vec(A, H)[0] == 0 and vec(B, K)[0] == 0, "H, K projetes, HK = 80")
u = (F(0), F(20))
# 1. vec(MN) le meme pour toutes les positions ; MNN1M1 parallelogramme
for _ in range(50):
    m, m1 = rnd() * 5, rnd() * 5
    M, N, M1, N1 = (m, F(0)), (m, F(20)), (m1, F(0)), (m1, F(20))
    check(vec(M, N) == u and vec(M1, N1) == u, "vec(MN) = u")
    if m != m1:
        check(parallelogram(M, N, N1, M1), "MNN1M1 parallelogramme")
# 2. A' = t(A)
Ap = add(A, u)
check(Ap == (0, -25), "A'(0, -25)")
check(aligned(A, H, Ap) and 0 < -Ap[1] < 45, "A' sur [AH]")
check(-Ap[1] == 25 and 20 - Ap[1] == 45, "A' a 25 m de d1 et 45 m de d2")
for _ in range(100):
    m = rnd() * 6
    M, N = (m, F(0)), (m, F(20))
    check(d2(A, M) == d2(Ap, N), "AM = A'N")
# 3. inegalite triangulaire, A' et B de part et d'autre de d2
check(Ap[1] < 20 < B[1], "A' et B de part et d'autre de d2")
def L(m):
    M, N = (F(m), F(0)), (F(m), F(20))
    return math.sqrt(d2(A, M)) + math.sqrt(d2(M, N)) + math.sqrt(d2(N, B))
grid = [k / 4 for k in range(-400, 801)]
vals = [L(m) for m in grid]
best = min(vals)
check(math.isclose(best, 120) and grid[vals.index(best)] == 60, "minimum 120 atteint pour m = 60")
check(all(v > 120 + 1e-9 for m, v in zip(grid, vals) if m != 60), "minimum atteint seulement en 60")
# 4. calculs
check(d2(Ap, B) == 100 ** 2 and exact_len(d2(Ap, B)) + exact_len(n2(u)) == 120, "A'B = 100, longueur minimale 100 + 20 = 120")
P = (A[0], B[1])                                      # pied de la perpendiculaire a (AH) issue de B
Q = (A[0], F(20))                                     # (AH) inter d2
check(aligned(A, H, P) and dot(vec(P, B), vec(A, H)) == 0, "P sur (AH), (BP) perpendiculaire a (AH)")
check(aligned(A, H, Q) and Q[1] == 20, "Q sur (AH) et sur d2")
check(d2(Ap, P) == 60 ** 2 and d2(P, B) == 80 ** 2 and dot(vec(P, Ap), vec(P, B)) == 0, "A'P = 60, PB = 80, angle droit en P")
check(d2(Ap, P) + d2(P, B) == d2(Ap, B), "Pythagore dans A'PB")
s0 = (20 - Ap[1]) / (B[1] - Ap[1])                    # [A'B] inter d2
check(0 < s0 < 1, "[A'B] coupe d2")
N0 = add(Ap, mul(s0, vec(Ap, B)))
check(N0 == (60, 20) and aligned(Ap, B, N0) and N0[1] == 20, "N0(60, 20) sur [A'B] et sur d2")
check(det(vec(Q, N0), vec(P, B)) == 0, "(QN0) parallele a (PB)")
ratio = exact_len(d2(Ap, Q)) / exact_len(d2(Ap, P))
check(d2(Ap, Q) == 45 ** 2 and ratio == exact_len(d2(Q, N0)) / exact_len(d2(P, B)) and ratio * exact_len(d2(P, B)) == 60,
      "Thales : A'Q / A'P = QN0 / PB, QN0 = 60")
M0 = add(N0, mul(-1, u))                              # antecedent de N0 par t
check(M0[1] == 0 and vec(M0, N0) == u and d2(H, M0) == 60 ** 2, "M0 sur d1, HM0 = 60")
check(d2(M0, K) == 20 ** 2 and aligned(H, K, M0) and 0 < M0[0] < K[0], "M0 entre H et K, a 20 m de K")
check(vec(H, M0) == vec(Q, N0), "HM0N0Q rectangle (vec(HM0) = vec(QN0))")
Lmin = exact_len(d2(A, M0)) + exact_len(d2(M0, N0)) + exact_len(d2(N0, B))
check(d2(A, M0) == 75 ** 2 and d2(N0, B) == 25 ** 2 and Lmin == 120 and math.isclose(L(M0[0]), 120), "AM0 = 75, N0B = 25, total 120")
Kp = (B[0], F(20))                                    # point commun a (BK) et d2
check(aligned(B, K, Kp), "K' sur (BK)")
check(d2(H, P) == 35 ** 2 and d2(K, B) == 35 ** 2 and d2(P, B) == d2(H, K), "HPBK rectangle : HP = KB = 35, PB = HK")
check(d2(Ap, H) == 25 ** 2 and exact_len(d2(Ap, H)) + exact_len(d2(H, P)) == exact_len(d2(Ap, P)), "A'P = A'H + HP = 25 + 35")
check(d2(Q, Kp) == 80 ** 2 and d2(N0, Kp) == 20 ** 2 and d2(Kp, B) == 15 ** 2, "QK' = 80, N0K' = 20, K'B = 15")
check(dot(vec(Kp, N0), vec(Kp, B)) == 0 and dot(vec(H, M0), vec(H, A)) == 0, "angles droits en K' et en H")
check(exact_len(d2(Ap, Q)) + exact_len(d2(Q, P)) == exact_len(d2(Ap, P)), "Q sur [A'P]")
check(exact_len(d2(Ap, N0)) + exact_len(d2(N0, B)) == exact_len(d2(Ap, B)), "N0 sur [A'B]")
# 5. pont en face de A (M = H, N = Q)
check(vec(H, Q) == u, "le pont [HQ] est une position possible")
check(d2(Q, B) == 6625 == 25 * 265 and d2(Q, Kp) + d2(Kp, B) == d2(Q, B), "QB = sqrt(6625) = 5 sqrt(265)")
LH = math.sqrt(d2(A, H)) + math.sqrt(d2(H, Q)) + math.sqrt(d2(Q, B))
check(math.isclose(LH, L(0)) and math.isclose(LH, 65 + 5 * math.sqrt(265)), "trajet 45 + 20 + 5 sqrt(265)")
check(round(math.sqrt(d2(Q, B)), 1) == 81.4 and round(LH, 1) == 146.4 and round(LH - float(Lmin), 1) == 26.4, "pont en H : 146.4 m, 26.4 m de plus")

print(f"all {ok} checks passed")
