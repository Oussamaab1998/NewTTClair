"""Checks every value used in exercises T2 ch7 (Equations de droites et de plans, 3eme Sc. exp.)."""
from fractions import Fraction as F
import random

random.seed(7)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def sub(u, v): return tuple(a - b for a, b in zip(u, v))
def add(u, v): return tuple(a + b for a, b in zip(u, v))
def mul(k, u): return tuple(k * a for a in u)
def dot(u, v): return sum(a * b for a, b in zip(u, v))
def colinear(u, v):
    return all(u[i] * v[j] - u[j] * v[i] == 0 for i in range(3) for j in range(3))
def det(u, v, w):
    # columns u, v, w ; expansion along the first column (as in the manuel)
    a, b, c = u
    a1, b1, c1 = v
    a2, b2, c2 = w
    return a * (b1 * c2 - c1 * b2) - b * (a1 * c2 - c1 * a2) + c * (a1 * b2 - b1 * a2)

rats = [F(random.randint(-40, 40), random.randint(1, 9)) for _ in range(200)]

# ================= Exercice 1 (repere cartesien) =================
A, B, C = (F(1), F(1), F(0)), (F(2), F(0), F(-1)), (F(3), F(1), F(2))
AB, AC = sub(B, A), sub(C, A)
check(AB == (1, -1, -1) and AC == (2, 0, 2), "AB(1,-1,-1), AC(2,0,2)")
check(not colinear(AB, AC), "A, B, C non alignes")
lineAB = lambda a: add(A, mul(a, AB))
# 1.c L(4,-2,-3) in (AB) (alpha = 3), N(0,2,2) not in (AB)
check(lineAB(3) == (4, -2, -3), "L = point de parametre 3 de (AB)")
alphaN = F(0) - 1  # from x : 1 + alpha = 0
check(lineAB(alphaN) == (0, 2, 1) and lineAB(alphaN) != (0, 2, 2), "N n'est pas sur (AB) (z = 1, pas 2)")
# 2. plane P = (ABC): x + 2y - z - 3 = 0
P = lambda M: M[0] + 2 * M[1] - M[2] - 3
for M in (A, B, C):
    check(P(M) == 0, "A, B, C dans P")
check((1, 2, -1) != (0, 0, 0), "(a,b,c) non nul")
# determinant formula det(AM, AB, AC) = -2(x-1) - 4(y-1) + 2z = -2(x + 2y - z - 3)
for _ in range(300):
    M = (random.choice(rats), random.choice(rats), random.choice(rats))
    AM = sub(M, A)
    d = det(AM, AB, AC)
    check(d == -2 * (M[0] - 1) - 4 * (M[1] - 1) + 2 * M[2], "developpement du determinant")
    check(d == -2 * P(M), "det = -2(x + 2y - z - 3)")
check((AB[1] * AC[2] - AB[2] * AC[1], AB[0] * AC[2] - AB[2] * AC[0], AB[0] * AC[1] - AB[1] * AC[0]) == (-2, 4, 2),
      "mineurs -2, 4, 2")
# parametric representation of P
for a in rats[:40]:
    for b in rats[40:80]:
        M = add(add(A, mul(a, AB)), mul(b, AC))
        check(M == (1 + a + 2 * b, 1 - a, -a + 2 * b), "representation parametrique de P")
        check(P(M) == 0, "points parametriques dans P")
# 2.c D(4,-1,0) not in P ; P' : x + 2y - z - 2 = 0 through D
D = (F(4), F(-1), F(0))
check(P(D) == -1, "D n'appartient pas a P (valeur -1)")
check(D[0] + 2 * D[1] - D[2] - 2 == 0, "D dans P'")
for _ in range(200):
    M = (random.choice(rats), random.choice(rats), random.choice(rats))
    check(det(sub(M, D), AB, AC) == -2 * ((M[0] - 4) + 2 * (M[1] + 1) - M[2]) == -2 * (M[0] + 2 * M[1] - M[2] - 2),
          "det(DM, AB, AC) = -2(x + 2y - z - 2)")
# 3.a Delta : (1 + a, 2 - a, -1 + 2a), E(1,2,-1), u(1,-1,2)
E, u = (F(1), F(2), F(-1)), (F(1), F(-1), F(2))
Delta = lambda a: add(E, mul(a, u))
for a in rats:
    check(P(Delta(a)) == 3 - 3 * a, "substitution de Delta dans P : 3 - 3a")
K = Delta(F(1))
check(K == (2, 1, 1) and P(K) == 0, "K(2,1,1) = Delta inter P")
check(P(E) == 3, "E n'est pas dans P")
# 3.b Delta' : (a, 0, 1 + a) strictly parallel to P
Fp, v = (F(0), F(0), F(1)), (F(1), F(0), F(1))
for a in rats:
    check(P(add(Fp, mul(a, v))) == -4, "substitution de Delta' : -4 (jamais 0)")
check(P(Fp) == -4, "F n'est pas dans P")
# 4. Q : 2x - y + z - 1 = 0 ; P inter Q = line (1 + a, 1 - 3a, -5a)
Q = lambda M: 2 * M[0] - M[1] + M[2] - 1
check(not colinear((1, 2, -1), (2, -1, 1)) and 2 == 2 * 1 and -1 != 2 * 2, "(1,2,-1) et (2,-1,1) non proportionnels")
check(Q(A) == 0, "A dans Q")
inter = lambda a: (1 + a, 1 - 3 * a, -5 * a)
for a in rats:
    M = inter(a)
    check(P(M) == 0 and Q(M) == 0, "droite d'intersection dans P et Q")
    check(M[0] + 2 * M[1] - M[2] + 2 * M[0] - M[1] + M[2] == 4 and 3 * M[0] + M[1] == 4, "somme : 3x + y = 4")
# every common point is on the line : for x = 1 + a, y and z are forced
for a in rats[:50]:
    x = 1 + a
    y = 4 - 3 * x
    z = x + 2 * y - 3
    check((x, y, z) == inter(a), "la droite est toute l'intersection")
# 5. (AB) and Delta : not coplanar
check(not colinear(AB, u), "AB et u non colineaires")
AE = sub(E, A)
check(AE == (0, 1, -1), "AE(0,1,-1)")
check(det(AB, u, AE) == -3, "det(AB, u, AE) = -3 non nul")
check((u[1] * AE[2] - AE[1] * u[2], u[0] * AE[2] - AE[0] * u[2], u[0] * AE[1] - AE[0] * u[1]) == (-1, -1, 1), "mineurs -1, -1, 1")
# K is not on (AB): x = 2 -> alpha = 1 -> point B = (2,0,-1) != K
check(lineAB(F(1)) == B and B != K, "K n'est pas sur (AB)")
# system x : 1 + a = 1 + b, y : 1 - a = 2 - b ; written as (coef a, coef b, left const, right const)
ex_, ey_ = (AB[0], -u[0], A[0], E[0]), (AB[1], -u[1], A[1], E[1])
s = tuple(p + q for p, q in zip(ex_, ey_))
check(s[0] == 0 and s[1] == 0 and (s[2], s[3]) == (2, 3), "x + y : a et b disparaissent, 2 = 3 impossible")
for a in rats[:60]:
    for b in rats[60:120]:
        check(lineAB(a) != Delta(b), "aucun point commun (echantillon)")

# ================= Exercice 2 (cube d'arete 2, repere orthonorme) =================
A2 = (F(0), F(0), F(0))
Bc, Cc, Dc = (F(2), F(0), F(0)), (F(2), F(2), F(0)), (F(0), F(2), F(0))
Ec, Fc, Gc, Hc = (F(0), F(0), F(2)), (F(2), F(0), F(2)), (F(2), F(2), F(2)), (F(0), F(2), F(2))
cube = [A2, Bc, Cc, Dc, Ec, Fc, Gc, Hc]
dist2 = lambda X, Y: dot(sub(X, Y), sub(X, Y))
# cube check: edges of length 2 and right angles at A
for X, Y in [(A2, Bc), (Bc, Cc), (Cc, Dc), (Dc, A2), (Ec, Fc), (Fc, Gc), (Gc, Hc), (Hc, Ec),
             (A2, Ec), (Bc, Fc), (Cc, Gc), (Dc, Hc)]:
    check(dist2(X, Y) == 4, "aretes de longueur 2")
check(sub(Cc, Bc) == sub(Dc, A2) and sub(Gc, Fc) == sub(Dc, A2) and sub(Fc, Bc) == sub(Ec, A2), "ABCD carre, faces")
I = mul(F(1, 2), add(A2, Bc))
J = mul(F(1, 2), add(Bc, Cc))
check(I == (1, 0, 0) and J == (2, 1, 0), "I(1,0,0), J(2,1,0)")
IJ, IF = sub(J, I), sub(Fc, I)
check(IJ == (1, 1, 0) and IF == (1, 0, 2), "IJ(1,1,0), IF(1,0,2)")
check(not colinear(IJ, IF), "I, J, F non alignes")
n = (F(2), F(-2), F(-1))
check(dot(n, IJ) == 0 and dot(n, IF) == 0, "n normal a (IJF)")
Pl = lambda M: 2 * M[0] - 2 * M[1] - M[2] - 2
for M in (I, J, Fc):
    check(Pl(M) == 0, "I, J, F dans 2x - 2y - z - 2 = 0")
check(2 * I[0] - 2 * I[1] - I[2] == 2, "d = -2")
# 3.a (AC) strictly parallel to (IJF)
AC2 = sub(Cc, A2)
check(AC2 == mul(2, IJ) and dot(n, AC2) == 0, "AC = 2 IJ, n.AC = 0")
check(Pl(A2) == -2, "A pas dans (IJF)")
# 3.b plane (EFG) : z = 2 ; intersection line through F with direction (1,1,0)
for M in (Ec, Fc, Gc, Hc):
    check(M[2] == 2, "E, F, G, H dans z = 2")
check(not colinear(sub(Fc, Ec), sub(Gc, Ec)), "E, F, G non alignes")
Lambda = lambda a: (2 + a, a, F(2))
for a in rats:
    M = Lambda(a)
    check(Pl(M) == 0 and M[2] == 2, "Delta dans (IJF) et (EFG)")
check(Lambda(F(0)) == Fc, "Delta passe par F")
check(colinear((1, 1, 0), sub(Gc, Ec)), "Delta parallele a (EG)")
# every common point : z = 2 and 2x - 2y - 4 = 0 -> x = y + 2
for y in rats[:40]:
    check(Pl((y + 2, y, F(2))) == 0, "x = y + 2")
# 4. line D through B perpendicular to (IJF), K = projete orthogonal de B
Dl = lambda a: add(Bc, mul(a, n))
for a in rats:
    check(Pl(Dl(a)) == 9 * a + 2, "substitution : 9a + 2")
aK = F(-2, 9)
K2 = Dl(aK)
check(K2 == (F(14, 9), F(4, 9), F(2, 9)), "K(14/9, 4/9, 2/9)")
check(Pl(K2) == 0, "K dans (IJF)")
BK = sub(K2, Bc)
check(BK == (F(-4, 9), F(4, 9), F(2, 9)), "BK(-4/9, 4/9, 2/9)")
check(dot(BK, BK) == F(4, 9), "BK^2 = 4/9 donc BK = 2/3")
check(dot(n, n) == 9, "||n|| = 3")
check(colinear(BK, n) and dot(BK, IJ) == 0 and dot(BK, IF) == 0, "(BK) orthogonale au plan")
# BK is the smallest distance from B to a point of the plane (sample points of the plane)
for a in rats[:30]:
    for b in rats[30:60]:
        M = add(add(I, mul(a, IJ)), mul(b, IF))
        check(dist2(Bc, M) >= F(4, 9), "BK minimal")
# 5. K orthocentre of IJF
IK, JK, FK = sub(K2, I), sub(K2, J), sub(K2, Fc)
JF = sub(Fc, J)
check(IK == (F(5, 9), F(4, 9), F(2, 9)) and JF == (0, -1, 2), "IK(5/9,4/9,2/9), JF(0,-1,2)")
check(dot(IK, JF) == 0, "IK . JF = 0")
check(JK == (F(-4, 9), F(-5, 9), F(2, 9)), "JK(-4/9,-5/9,2/9)")
check(dot(JK, IF) == 0, "JK . IF = 0")
check(FK == (F(-4, 9), F(4, 9), F(-16, 9)) and dot(FK, IJ) == 0, "FK(-4/9,4/9,-16/9), FK . IJ = 0 (troisieme hauteur)")
check(K2 not in (I, J, Fc), "K distinct de I, J, F")

print(f"all {ok} checks passed")
