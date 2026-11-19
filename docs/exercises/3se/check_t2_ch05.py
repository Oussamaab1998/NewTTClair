"""Checks every value and identity used in exercises T2 ch5 (Vecteurs de l'espace, 3eme Sc. exp.)."""
from fractions import Fraction as F
import random

random.seed(5)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def V(*c): return tuple(F(x) for x in c)
def sub(u, v): return tuple(a - b for a, b in zip(u, v))
def add(*us): return tuple(sum(c) for c in zip(*us))
def mul(k, u): return tuple(F(k) * a for a in u)
def mid(P, Q): return mul(F(1, 2), add(P, Q))
def colinear(u, v):
    return all(u[i] * v[j] - u[j] * v[i] == 0 for i in range(3) for j in range(3))
def det(u, v, w):
    # columns u, v, w ; expansion along the first column (as in the manuel)
    a, b, c = u
    a1, b1, c1 = v
    a2, b2, c2 = w
    return a * (b1 * c2 - c1 * b2) - b * (a1 * c2 - c1 * a2) + c * (a1 * b2 - b1 * a2)
def terms(u, v, w):
    """The three terms of the first-column expansion, as written in the corriges."""
    a, b, c = u
    a1, b1, c1 = v
    a2, b2, c2 = w
    return (a * (b1 * c2 - c1 * b2), -b * (a1 * c2 - c1 * a2), c * (a1 * b2 - b1 * a2))
def det_first_row(u, v, w):   # same value by Sarrus, as an independent check of det()
    a, b, c = u; a1, b1, c1 = v; a2, b2, c2 = w
    return a * b1 * c2 + a1 * b2 * c + a2 * b * c1 - c * b1 * a2 - c1 * b2 * a - c2 * b * a1
def solve3(cols, rhs):
    """Cramer's rule: x such that x0*cols[0] + x1*cols[1] + x2*cols[2] = rhs."""
    d = det(*cols)
    out = []
    for i in range(3):
        cs = list(cols)
        cs[i] = rhs
        out.append(det(*cs) / d)
    return tuple(out)

rats = [F(random.randint(-40, 40), random.randint(1, 9)) for _ in range(200)]
for _ in range(300):
    u, v, w = [tuple(random.choice(rats) for _ in range(3)) for _ in range(3)]
    check(det(u, v, w) == det_first_row(u, v, w), "det : premiere colonne = Sarrus")

# ================= Exercice 1 =================
O = V(0, 0, 0)
A, B, C = V(1, 0, 2), V(2, 1, 0), V(0, 3, 1)
AB, AC = sub(B, A), sub(C, A)
check(AB == V(1, 1, -2) and AC == V(-1, 3, -1), "AB(1,1,-2), AC(-1,3,-1)")
check(not colinear(AB, AC), "A, B, C non alignes")
check(AC[0] / AB[0] == -1 and AB[1] * (-1) != AC[1], "k = -1 from x, contradiction on y")
I = mid(B, C)
G = mul(F(1, 3), add(A, B, C))
check(I == (1, 2, F(1, 2)) and G == (1, F(4, 3), 1), "I(1, 2, 1/2), G(1, 4/3, 1)")
check(sub(I, A) == (0, 2, F(-3, 2)) and sub(G, A) == (0, F(4, 3), -1), "AI, AG")
check(sub(G, A) == mul(F(2, 3), sub(I, A)), "AG = (2/3) AI")
# 2. w(1, 0, 1)
w = V(1, 0, 1)
check(det(AB, AC, w) == 9, "det(AB, AC, w) = 9")
check(terms(AB, AC, w) == (3, 0, 6), "termes ecrits 3 - 0 + 6")
check(1 * (3 * 1 - (-1) * 0) - 1 * ((-1) * 1 - (-1) * 1) + (-2) * ((-1) * 0 - 3 * 1) == 9, "developpement ecrit")
t = V(2, 4, -1)
check(solve3((AB, AC, w), t) == (1, 1, 2), "t = AB + AC + 2w")
check(add(AB, AC, mul(2, w)) == t, "verification t")
# system: a - b + c = 2 ; a + 3b = 4 ; -2a - b + c = -1 ; eq1 - eq3 : 3a = 3
check((1 - 1 + 2, 1 + 3 * 1, -2 - 1 + 2) == (2, 4, -1) and 2 - (-1) == 3, "systeme du 2. b)")
# 3. a) D(4, -1, -1)
D = V(4, -1, -1)
AD = sub(D, A)
check(AD == V(3, -1, -3), "AD(3,-1,-3)")
check(det(AB, AC, AD) == 0, "A, B, C, D coplanaires")
check(terms(AB, AC, AD) == (-10, -6, 16), "termes ecrits -10 - 6 + 16")
check(add(mul(2, AB), mul(-1, AC)) == AD, "AD = 2AB - AC")
check((1 * (3 * (-3) - (-1) * (-1)), -1 * ((-1) * (-3) - (-1) * 3), (-2) * ((-1) * (-1) - 3 * 3)) == (-10, -6, 16), "termes du developpement de det(AB, AC, AD)")
# 3. b) E(m, -2, 1) : det = 5m - 15
for m in rats + [F(3)]:
    E = (m, F(-2), F(1))
    d = det(AB, AC, sub(E, A))
    check(d == 5 * m - 15, "det(AB, AC, AE) = 5m - 15")
    check(terms(AB, AC, sub(E, A)) == (-5, -m, -10 + 6 * m), "termes ecrits -5, -m, -10 + 6m")
    check((d == 0) == (m == 3), "E dans (ABC) <=> m = 3")
E3 = V(3, -2, 1)
check(solve3((AB, AC, V(1, 0, 0)), sub(E3, A))[2] == 0, "E(3,-2,1) : AE combinaison de AB, AC")
ab = solve3((AB, AC, V(0, 0, 1)), sub(E3, A))
check(ab[2] == 0 and add(mul(ab[0], AB), mul(ab[1], AC)) == sub(E3, A), "AE = a AB + b AC")
# 4. w'(0, 4, -3) ; O not in (ABC)
w2 = V(0, 4, -3)
check(det(AB, AC, w2) == 0 and add(AB, AC) == w2, "w' = AB + AC, famille liee")
check(terms(AB, AC, w2) == (-5, -3, 8), "termes ecrits -5 - 3 + 8")
AO = sub(O, A)
check(AO == V(-1, 0, -2) and det(AB, AC, AO) == -13, "det(AB, AC, AO) = -13")
check(terms(AB, AC, AO) == (-6, -1, -6), "termes ecrits -6 - 1 - 6")
check(((-6), -1, -6) == (1 * (3 * (-2) - (-1) * 0), -1 * ((-1) * (-2) - (-1) * (-1)), (-2) * ((-1) * 0 - 3 * (-1))), "termes de det(AB, AC, AO)")
# no point of Delta lies in (ABC): det(AB, AC, AO + s w') = -13 for all s
for s in rats[:50]:
    check(det(AB, AC, add(AO, mul(s, w2))) == -13, "Delta strictement parallele")

# ================= Exercice 2 =================
# Coordinates in the repere (A, AB, AC, AD)
A0, B0, C0, D0 = V(0, 0, 0), V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)
check(det(B0, C0, D0) == 1, "(AB, AC, AD) base")
def pts(t, A, B, C, D):
    M = add(A, mul(t, sub(C, A)))
    N = add(B, mul(t, sub(C, B)))
    P = add(B, mul(t, sub(D, B)))
    Q = add(A, mul(t, sub(D, A)))
    return M, N, P, Q
ts = [F(k, 97) for k in range(1, 97)] + [F(2, 3), F(1, 2), F(1, 3)]
# a random genuine tetrahedron too (vector identities do not depend on the repere)
while True:
    T = [tuple(F(random.randint(-9, 9)) for _ in range(3)) for _ in range(4)]
    if det(sub(T[1], T[0]), sub(T[2], T[0]), sub(T[3], T[0])) != 0:
        break
for (Aa, Bb, Cc, Dd) in ((A0, B0, C0, D0), tuple(T)):
    ABv, CDv = sub(Bb, Aa), sub(Dd, Cc)
    check(not colinear(ABv, CDv), "AB et CD non colineaires")
    for t in ts:
        M, N, P, Q = pts(t, Aa, Bb, Cc, Dd)
        MN, QP, MQ, NP = sub(N, M), sub(P, Q), sub(Q, M), sub(P, N)
        check(MN == mul(1 - t, ABv), "MN = (1 - t) AB")
        check(QP == mul(1 - t, ABv), "QP = (1 - t) AB")
        check(MQ == mul(t, CDv) and NP == mul(t, CDv), "MQ = NP = t CD")
        check(not colinear(MN, MQ) and not colinear(MN, NP), "M, N, Q et M, N, P non alignes")
        check(mid(M, P) == mid(N, Q), "MNPQ parallelogramme (diagonales de meme milieu)")
        check(det(ABv, MN, MQ) == 0 and det(CDv, MN, MQ) == 0, "(AB), (CD) paralleles au plan (MNQ)")
        check(det(sub(Aa, M), MN, MQ) != 0, "A n'est pas dans (MNQ) (parallelisme strict)")
# coordinates as functions of t
for t in ts:
    M, N, P, Q = pts(t, A0, B0, C0, D0)
    check(M == (0, t, 0) and N == (1 - t, t, 0) and P == (1 - t, 0, t) and Q == (0, 0, t), "coordonnees de M, N, P, Q")
    Ip, Jp = mid(A0, B0), mid(C0, D0)
    check(Ip == (F(1, 2), 0, 0) and Jp == (0, F(1, 2), F(1, 2)), "I(1/2,0,0), J(0,1/2,1/2)")
    K = mid(M, P)
    check(K == ((1 - t) / 2, t / 2, t / 2) and K == mid(N, Q), "K((1-t)/2, t/2, t/2)")
    check(sub(K, Ip) == mul(t, sub(Jp, Ip)), "IK = t IJ")
    Gc = mul(F(1, 3), add(B0, C0, D0))
    check(Gc == (F(1, 3), F(1, 3), F(1, 3)), "G(1/3,1/3,1/3)")
    MG = sub(Gc, M)
    check(sub(N, M) == (1 - t, 0, 0) and sub(Q, M) == (0, -t, t) and MG == (F(1, 3), F(1, 3) - t, F(1, 3)), "MN, MQ, MG")
    d = det(sub(N, M), sub(Q, M), MG)
    check(d == t * (1 - t) * (t - F(2, 3)), "det(MN, MQ, MG) = t(1 - t)(t - 2/3)")
    check((-t) * F(1, 3) - t * (F(1, 3) - t) == t * (t - F(2, 3)), "mineur = t(t - 2/3)")
    check(terms(sub(N, M), sub(Q, M), MG) == ((1 - t) * t * (t - F(2, 3)), 0, 0), "termes ecrits (1 - t)(...) - 0 + 0")
    check((d == 0) == (t == F(2, 3)), "G dans (MNQ) <=> t = 2/3")
M, N, P, Q = pts(F(2, 3), A0, B0, C0, D0)
check(N == (F(1, 3), F(2, 3), 0) and P == (F(1, 3), 0, F(2, 3)), "N, P pour t = 2/3")
check(mid(N, P) == (F(1, 3), F(1, 3), F(1, 3)), "G milieu de [NP] pour t = 2/3")
G0 = mul(F(1, 3), add(B0, C0, D0))
BG, BC0, BD0, BN, BP = sub(G0, B0), sub(C0, B0), sub(D0, B0), sub(N, B0), sub(P, B0)
check(BN == mul(F(2, 3), BC0) and BP == mul(F(2, 3), BD0), "BN = (2/3) BC, BP = (2/3) BD pour t = 2/3")
check(BG == mul(F(1, 3), add(BC0, BD0)), "BG = (1/3)(BC + BD)")
check(BG == mul(F(1, 2), add(mul(F(2, 3), BC0), mul(F(2, 3), BD0))) and BG == mul(F(1, 2), add(BN, BP)), "BG = (1/2)(BN + BP)")
check(sub(mul(F(1, 3), add(B0, C0, D0)), M) == add(sub(N, M), mul(F(1, 2), sub(Q, M))), "MG = MN + (1/2) MQ pour t = 2/3")

print(f"all {ok} checks passed")
