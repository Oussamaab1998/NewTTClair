"""Checks every value and claim used in exercises T1 ch5 (2ème Sciences, calcul vectoriel)."""
from fractions import Fraction as F
import random

random.seed(5)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(*us): return (sum(u[0] for u in us), sum(u[1] for u in us))
def mul(k, u): return (k * u[0], k * u[1])
def neg(u): return (-u[0], -u[1])
def pt(P, u): return (P[0] + u[0], P[1] + u[1])
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return u[0] * u[0] + u[1] * u[1]
def ortho(u, v): return u[0] * v[0] + u[1] * v[1] == 0
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def rnd(): return F(random.randint(-40, 40), random.randint(1, 9))
def rpt(): return (rnd(), rnd())
Z = (0, 0)

def coords(P, O, u, v):
    """Coordinates (x, y) of P in the repere (O, u, v): vec(OP) = x u + y v (Cramer)."""
    w = vec(O, P); d = det(u, v)
    return (det(w, v) / d, det(u, w) / d)

# ---------- Ex1 : many random triangles ABC (exact rationals)
for _ in range(300):
    A, B, C = rpt(), rpt(), rpt()
    if det(vec(A, B), vec(A, C)) == 0:
        continue
    AB, AC, BC = vec(A, B), vec(A, C), vec(B, C)
    I = mid(B, C)
    G = ((A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3)   # centre de gravite (1ere)
    # Q1
    M = rpt()
    u = add(vec(M, A), neg(vec(M, B)), BC, neg(AC))
    check(u == mul(2, vec(B, A)), "u = 2 BA")
    check(add(vec(M, A), neg(vec(M, B))) == vec(B, A) and add(BC, neg(AC)) == vec(B, A), "the two halves of u")
    v = add(mul(3, AB), mul(-2, AC), mul(2, BC))
    check(v == AB, "v = AB")
    # Q2 : E and F from the claimed formulas, then the defining relations
    E = pt(A, mul(F(1, 3), AB))
    Fp = pt(A, mul(F(1, 3), AC))
    check(add(mul(2, vec(E, A)), vec(E, B)) == Z, "2EA + EB = 0")
    check(vec(C, Fp) == mul(2, vec(Fp, A)), "CF = 2FA")
    check(vec(E, Fp) == mul(F(1, 3), BC), "EF = (1/3) BC")
    check(det(vec(B, E), BC) != 0, "E not on (BC): (EF) and (BC) are distinct parallels")
    # Q3
    check(add(vec(G, A), vec(G, B), vec(G, C)) == Z, "GA + GB + GC = 0")
    check(vec(A, G) == mul(F(1, 3), add(AB, AC)), "AG = (1/3)(AB + AC)")
    check(add(vec(A, E), vec(A, Fp)) == vec(A, G), "AE + AF = AG")
    check(vec(A, E) == vec(Fp, G) and det(vec(A, E), vec(A, Fp)) != 0, "AEGF non-flat parallelogram")
    check(vec(E, G) == vec(A, Fp), "EG = AF")
    J = mid(E, Fp)
    check(J == mid(A, G), "J midpoint of [AG]")
    check(vec(A, J) == mul(F(1, 3), vec(A, I)), "AJ = (1/3) AI")
    check(vec(A, G) == mul(F(2, 3), vec(A, I)), "AG = (2/3) AI")
    # Q4
    P = pt(A, mul(2, AB))
    check(mid(A, P) == B, "P symmetric of A wrt B")
    Q = pt(A, mul(F(2, 3), AC))
    PI, PQ = vec(P, I), vec(P, Q)
    check(PI == add(mul(F(-3, 2), AB), mul(F(1, 2), AC)), "PI = -3/2 AB + 1/2 AC")
    check(PQ == add(mul(-2, AB), mul(F(2, 3), AC)), "PQ = -2 AB + 2/3 AC")
    check(PQ == mul(F(4, 3), PI), "PQ = (4/3) PI")
    check(Fp == mid(A, Q), "F midpoint of [AQ] (remark)")
    # Q5 : coordinates in (A, AB, AC)
    claimed = {"B": (1, 0), "C": (0, 1), "I": (F(1, 2), F(1, 2)), "G": (F(1, 3), F(1, 3)),
               "E": (F(1, 3), 0), "F": (0, F(1, 3)), "P": (2, 0), "Q": (0, F(2, 3))}
    real = {"B": B, "C": C, "I": I, "G": G, "E": E, "F": Fp, "P": P, "Q": Q}
    for k in claimed:
        check(coords(real[k], A, AB, AC) == claimed[k], "coordinates of " + k)
    c = {k: claimed[k] for k in claimed}
    EF_ = vec(c["E"], c["F"]); BC_ = vec(c["B"], c["C"])
    check(EF_ == (F(-1, 3), F(1, 3)) and BC_ == (-1, 1) and det(EF_, BC_) == 0, "det(EF, BC) = 0 in the repere")
    PI_ = vec(c["P"], c["I"]); PQ_ = vec(c["P"], c["Q"])
    check(PI_ == (F(-3, 2), F(1, 2)) and PQ_ == (-2, F(2, 3)), "PI, PQ components")
    check(F(-3, 2) * F(2, 3) == -1 and (-2) * F(1, 2) == -1 and det(PI_, PQ_) == 0, "det(PI, PQ) = -1 + 1 = 0")

# ---------- Ex2 : A(-1, 2), B(3, 4), C(5, 0), orthonormal frame
A, B, C = (F(-1), F(2)), (F(3), F(4)), (F(5), F(0))
AB, BC, AC = vec(A, B), vec(B, C), vec(A, C)
check(AB == (4, 2) and BC == (2, -4) and AC == (6, -2), "components AB, BC, AC")
check(det(AB, AC) == 4 * (-2) - 6 * 2 == -20, "det(AB, AC) = -20")
check(n2(AB) == 20 and n2(BC) == 20 and n2(AC) == 40, "AB^2 = BC^2 = 20, AC^2 = 40")
check(4 * 2 + 2 * (-4) == 0 and ortho(AB, BC), "AB orthogonal to BC")
check(n2(AB) + n2(BC) == n2(AC), "Pythagore")
check(20 == 4 * 5 and 40 == 4 * 10, "sqrt20 = 2sqrt5, sqrt40 = 2sqrt10")
D = pt(A, BC)
check(D == (1, -2), "D(1, -2)")
check(vec(A, B) == vec(D, C), "ABCD parallelogram (AB = DC)")
check(ortho(AB, BC) and n2(AB) == n2(BC), "square: right angle and equal consecutive sides")
check(ortho(vec(A, C), vec(B, D)) and n2(vec(A, C)) == n2(vec(B, D)), "square: diagonals perpendicular and equal")
Om = mid(A, C)
check(Om == (2, 1) and mid(B, D) == Om, "Omega(2, 1) midpoint of both diagonals")
check(all(n2(vec(Om, X)) == 10 for X in (A, B, C, D)), "Omega A = Omega B = Omega C = Omega D = sqrt10")
check(vec(Om, A) == (-3, 1) and vec(Om, B) == (1, 3) and vec(Om, C) == (3, -1) and vec(Om, D) == (-1, -3), "OmegaX components")
check(4 * 10 == n2(AC), "radius = AC/2")
I, J = mid(A, B), mid(B, C)
check(I == (1, 3) and J == (4, 2), "I(1, 3), J(4, 2)")
AJ, DI = vec(A, J), vec(D, I)
check(AJ == (5, 0) and DI == (0, 5), "AJ(5, 0), DI(0, 5)")
check(ortho(AJ, DI) and n2(AJ) == n2(DI) == 25, "(AJ) perp (DI), AJ = DI = 5")
check(det(DI, AC) == 0 * (-2) - 6 * 5 == -30, "det(DI, AC) = -30")
# K = A + t AC on (DI): det(DK, DI) = 5(6t - 2) is affine in t
def K_of(t): return pt(A, mul(t, AC))
def g(t): return det(vec(D, K_of(t)), DI)
for t in [F(k, 7) for k in range(-20, 21)]:
    check(K_of(t) == (-1 + 6 * t, 2 - 2 * t), "K(-1 + 6t, 2 - 2t)")
    check(vec(D, K_of(t)) == (-2 + 6 * t, 4 - 2 * t), "DK(-2 + 6t, 4 - 2t)")
    check(g(t) == 5 * (6 * t - 2), "det(DK, DI) = 5(6t - 2)")
check(g(F(1, 3)) == 0 and g(F(0)) != 0 and (g(F(1)) - g(F(0))) != 0, "unique root t = 1/3")
K = K_of(F(1, 3))
check(K == (1, F(4, 3)), "K(1, 4/3)")
check(det(vec(D, K), DI) == 0 and det(vec(A, K), AC) == 0, "K on (DI) and on (AC)")
check(D[0] == I[0] == K[0] == 1, "(DI) has constant abscissa 1")
check(vec(K, A) == (-2, F(2, 3)) and vec(K, B) == (2, F(8, 3)) and vec(K, D) == (0, F(-10, 3)), "KA, KB, KD")
check(add(vec(K, A), vec(K, B), vec(K, D)) == Z, "K centre de gravite of ABD")
check(mid(B, D) == Om and det(vec(A, Om), AC) == 0, "(AC) = (A Omega) is the median from A in ABD")
check(mid(A, B) == I, "(DI) is the median from D in ABD")
check(vec(A, K) == mul(F(2, 3), vec(A, Om)) and vec(A, K) == mul(F(1, 3), AC), "AK = 2/3 A Omega = 1/3 AC")

print(f"all {ok} checks passed")
