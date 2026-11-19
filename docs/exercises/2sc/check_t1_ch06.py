"""Checks every value and claim used in exercises T1 ch6 (2ème Sciences, barycentre)."""
from fractions import Fraction as F
import random

random.seed(6)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(*us): return (sum(u[0] for u in us), sum(u[1] for u in us))
def mul(k, u): return (k * u[0], k * u[1])
def pt(P, u): return (P[0] + u[0], P[1] + u[1])
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return u[0] * u[0] + u[1] * u[1]
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def rnd(): return F(random.randint(-50, 50), random.randint(1, 9))
def rpt(): return (rnd(), rnd())
def comb(M, wpts):
    """Vector sum of a*vec(MX) over weighted points (X, a)."""
    return add(*[mul(a, vec(M, X)) for X, a in wpts])
Z = (0, 0)

def coords(P, O, u, v):
    w = vec(O, P); d = det(u, v)
    return (det(w, v) / d, det(u, w) / d)

# ---------- Ex1 : A(0,0), B(6,0) on a line, unit cm, AB = 6
A, B = (F(0), F(0)), (F(6), F(0))
AB = vec(A, B)
check(n2(AB) == 36, "AB = 6")
G = pt(A, mul(F(1, 3), AB))
check(comb(G, [(A, 2), (B, 1)]) == Z, "G barycentre of (A,2),(B,1)")
check(G == (2, 0) and n2(vec(A, G)) == 4 and n2(vec(G, B)) == 16, "AG = 2, GB = 4, G in [AB]")
K = pt(A, mul(F(4, 3), AB))
check(comb(K, [(A, -1), (B, 4)]) == Z, "K barycentre of (A,-1),(B,4)")
check(K == (8, 0) and n2(vec(A, K)) == 64 and n2(vec(B, K)) == 4, "AK = 8, BK = 2")
check(not (0 <= K[0] <= 6), "K not in [AB]")
check(comb(B, [(G, 1), (K, 2)]) == Z, "B barycentre of (G,1),(K,2)")
check(vec(G, B) == mul(F(2, 3), AB) and vec(K, B) == mul(F(-1, 3), AB), "GB = 2/3 AB, KB = -1/3 AB")
E = mid(G, K)
check(E == (5, 0) and E[0] - B[0] == -1 and (G[0] + K[0]) / 2 == 5, "midpoint of [GK] at AE = (2 + 8)/2 = 5, EB = 1")
check(F(4, 3) * 6 == 8 and F(1, 3) * 6 == 2, "AK = 4/3 * 6 = 8, AG = 6/3 = 2")
for _ in range(400):
    M = rpt()
    check(comb(M, [(A, 2), (B, 1)]) == mul(3, vec(M, G)), "2MA + MB = 3MG")
    check(comb(M, [(A, -1), (B, 4)]) == mul(3, vec(M, K)), "-MA + 4MB = 3MK")
    # Gamma1 : equality of norms (squared) <=> x = 5
    g1 = n2(comb(M, [(A, 2), (B, 1)])) == n2(comb(M, [(A, -1), (B, 4)]))
    check(g1 == (M[0] == 5), "Gamma1 is the line x = 5")
    Mv = (F(5), M[1])
    check(n2(comb(Mv, [(A, 2), (B, 1)])) == n2(comb(Mv, [(A, -1), (B, 4)])), "points of x = 5 are in Gamma1")
    # Gamma2 : |2MA + MB| = |MA - MB| <=> MG = 2
    check(comb(M, [(A, 1), (B, -1)]) == vec(B, A), "MA - MB = BA")
    g2 = n2(comb(M, [(A, 2), (B, 1)])) == n2(comb(M, [(A, 1), (B, -1)]))
    check(g2 == (n2(vec(G, M)) == 4), "Gamma2 is the circle centre G radius 2")
    t = rnd()
    Mc = (2 + 2 * (1 - t * t) / (1 + t * t), 4 * t / (1 + t * t))      # rational point with GM = 2
    check(n2(vec(G, Mc)) == 4 and n2(comb(Mc, [(A, 2), (B, 1)])) == n2(comb(Mc, [(A, 1), (B, -1)])), "circle points in Gamma2")
check(n2(vec(G, A)) == 4 and n2(vec(G, (F(4), F(0)))) == 4, "Gamma2 passes through A and through F(4, 0)")
check(n2(comb(A, [(A, 2), (B, 1)])) == n2(comb(A, [(A, 1), (B, -1)])), "A in Gamma2")
# Q4 : C off the line (AB), many random positions
O = mid(A, B)
check(O == (3, 0), "O midpoint of [AB]")
for _ in range(300):
    C = rpt()
    if C[1] == 0:
        continue
    P = ((2 * A[0] + B[0] + 3 * C[0]) / 6, (2 * A[1] + B[1] + 3 * C[1]) / 6)
    check(comb(P, [(A, 2), (B, 1), (C, 3)]) == Z, "P barycentre of (A,2),(B,1),(C,3)")
    check(P == mid(G, C), "P midpoint of [GC]")
    CO = vec(C, O)
    for _ in range(5):
        M = rpt()
        w = comb(M, [(A, 1), (B, 1), (C, -2)])
        check(w == add(vec(C, A), vec(C, B)) == mul(2, CO), "MA + MB - 2MC = CA + CB = 2CO")
        V = comb(M, [(A, 2), (B, 1), (C, 3)])
        check(V == mul(6, vec(M, P)), "2MA + MB + 3MC = 6MP")
        check((det(V, w) == 0) == (det(vec(P, M), CO) == 0), "Delta: colinear <=> PM // CO")
        Ml = pt(P, mul(rnd(), CO))
        check(det(comb(Ml, [(A, 2), (B, 1), (C, 3)]), comb(Ml, [(A, 1), (B, 1), (C, -2)])) == 0, "line points in Delta")
    # intersection of Delta with (AB) (y = 0): P + s CO with y = 0
    s = -P[1] / CO[1]
    X = pt(P, mul(s, CO))
    check(X == (F(5, 2), 0) and X == mid(G, O), "Delta meets (AB) at the midpoint of [GO], AX = 5/2")
    check(vec(P, mid(G, O)) == mul(F(1, 2), CO), "PX = (1/2) CO")
    check(det(CO, AB) != 0, "Delta not parallel to (AB)")

# ---------- Ex2 : random triangles ABC, then the repere (A, AB, AC)
for _ in range(300):
    A, B, C = rpt(), rpt(), rpt()
    if det(vec(A, B), vec(A, C)) == 0:
        continue
    AB, AC, BC = vec(A, B), vec(A, C), vec(B, C)
    I = pt(B, mul(F(1, 3), BC))
    J = pt(A, mul(F(1, 4), AC))
    K = pt(A, mul(F(2, 5), AB))
    check(comb(I, [(B, 2), (C, 1)]) == Z, "I barycentre of (B,2),(C,1)")
    check(comb(J, [(A, 3), (C, 1)]) == Z, "J barycentre of (A,3),(C,1)")
    check(comb(K, [(A, 3), (B, 2)]) == Z, "K barycentre of (A,3),(B,2)")
    G = pt(A, add(mul(F(1, 3), AB), mul(F(1, 6), AC)))
    check(comb(G, [(A, 3), (B, 2), (C, 1)]) == Z, "G barycentre, AG = 1/3 AB + 1/6 AC")
    check(comb(G, [(A, 3), (I, 3)]) == Z and G == mid(A, I), "G barycentre of (A,3),(I,3): midpoint of [AI]")
    check(comb(G, [(B, 2), (J, 4)]) == Z, "G barycentre of (B,2),(J,4)")
    check(comb(G, [(C, 1), (K, 5)]) == Z, "G barycentre of (C,1),(K,5)")
    check(det(vec(A, G), vec(A, I)) == 0 and det(vec(B, G), vec(B, J)) == 0 and det(vec(C, G), vec(C, K)) == 0, "concurrency at G")
    check(vec(B, G) == mul(F(2, 3), vec(B, J)) and vec(C, G) == mul(F(5, 6), vec(C, K)), "x = 2/3, y = 5/6")
    check(vec(A, I) == add(mul(F(2, 3), AB), mul(F(1, 3), AC)), "AI = 2/3 AB + 1/3 AC")
    L = pt(B, mul(-1, BC))
    check(mid(C, L) == B, "L symmetric of C wrt B")
    check(comb(L, [(B, 2), (C, -1)]) == Z, "L barycentre of (B,2),(C,-1)")
    for _ in range(5):
        M = rpt()
        check(add(mul(5, vec(M, K)), mul(-4, vec(M, J))) == vec(M, L), "5MK - 4MJ = ML")
        check(mul(5, vec(M, K)) == comb(M, [(A, 3), (B, 2)]) and mul(4, vec(M, J)) == comb(M, [(A, 3), (C, 1)]), "reductions")
    check(vec(J, L) == mul(5, vec(J, K)) and det(vec(J, K), vec(J, L)) == 0, "JL = 5 JK: J, K, L aligned")
    check(comb(L, [(K, 5), (J, -4)]) == Z, "L barycentre of (K,5),(J,-4)")
    claimed = {"I": (F(2, 3), F(1, 3)), "J": (0, F(1, 4)), "K": (F(2, 5), 0), "G": (F(1, 3), F(1, 6)), "L": (2, -1)}
    real = {"I": I, "J": J, "K": K, "G": G, "L": L}
    for k in claimed:
        check(coords(real[k], A, AB, AC) == claimed[k], "coordinates of " + k)
c = {"A": (0, 0), "B": (1, 0), "C": (0, 1), "I": (F(2, 3), F(1, 3)), "J": (0, F(1, 4)),
     "K": (F(2, 5), 0), "G": (F(1, 3), F(1, 6)), "L": (2, -1)}
check(mid(c["A"], c["I"]) == c["G"], "G midpoint of [AI] in coordinates")
JK, JL = vec(c["J"], c["K"]), vec(c["J"], c["L"])
check(JK == (F(2, 5), F(-1, 4)) and JL == (2, F(-5, 4)), "JK, JL components")
check(F(2, 5) * F(-5, 4) == F(-1, 2) and 2 * F(-1, 4) == F(-1, 2) and det(JK, JL) == 0, "det(JK, JL) = -1/2 + 1/2 = 0")
BG, BJ = vec(c["B"], c["G"]), vec(c["B"], c["J"])
check(BG == (F(-2, 3), F(1, 6)) and BJ == (-1, F(1, 4)) and det(BG, BJ) == 0, "det(BG, BJ) = 0")
check(F(-2, 3) * F(1, 4) == F(-1, 6), "(-2/3)(1/4) = -1/6")
CG, CK = vec(c["C"], c["G"]), vec(c["C"], c["K"])
check(CG == (F(1, 3), F(-5, 6)) and CK == (F(2, 5), -1) and det(CG, CK) == 0, "det(CG, CK) = 0")
check(F(1, 3) * (-1) == F(-1, 3) and F(2, 5) * F(-5, 6) == F(-1, 3), "det(CG, CK) = -1/3 + 1/3")
check(vec(c["B"], c["L"]) == (1, -1) and vec(c["B"], c["C"]) == (-1, 1), "BL = -BC")

print(f"all {ok} checks passed")
