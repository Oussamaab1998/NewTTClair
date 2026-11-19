"""Checks every claim used in exercises T2 ch7 (Droites et plans de l'espace, 2eme Sciences).

The exercises are synthetic; here each solid is put in coordinates and every claimed
intersection, alignment, coplanarity, midpoint, centroid and length is recomputed.
Affine claims (Ex1) are tested on many random tetrahedra. In Ex2 a point is stored as
(x, y, t) with real height z = t*h and h^2 = 8, so squared lengths stay rational.
"""
from fractions import Fraction as F
import math, random

random.seed(207)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

Z = (F(0), F(0), F(0))
def V(*c): return tuple(F(x) for x in c)
def sub(u, v): return tuple(a - b for a, b in zip(u, v))
def add(*us): return tuple(sum(c) for c in zip(*us))
def mul(k, u): return tuple(F(k) * a for a in u)
def mid(P, Q): return mul(F(1, 2), add(P, Q))
def bary(*pts): return mul(F(1, len(pts)), add(*pts))
def cross(u, v): return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
def dot(u, v): return sum(a * b for a, b in zip(u, v))
def det3(u, v, w): return dot(u, cross(v, w))
def parallel(u, v): return cross(u, v) == Z
def aligned(A, B, C): return parallel(sub(B, A), sub(C, A))
def coplanar(A, B, C, D): return det3(sub(B, A), sub(C, A), sub(D, A)) == 0
def in_plane(M, A, B, C): return coplanar(A, B, C, M)
def on_line(M, A, B): return aligned(A, B, M)
def line_inter(A, B, C, D):
    """Intersection of (AB) and (CD), assumed coplanar and not parallel."""
    u, v, w = sub(B, A), sub(D, C), sub(C, A)
    uv = cross(u, v)
    s = dot(cross(w, v), uv) / dot(uv, uv)
    return add(A, mul(s, u))
def line_plane(A, B, P, Q, R):
    n = cross(sub(Q, P), sub(R, P))
    u = sub(B, A)
    t = dot(sub(P, A), n) / dot(u, n)
    return add(A, mul(t, u)), t
def param(M, A, B):
    """t such that M = A + t(B - A) (M assumed on (AB))."""
    u = sub(B, A)
    i = max(range(3), key=lambda k: abs(u[k]))
    return (M[i] - A[i]) / u[i]

def comps(v, e1, e2):
    """(a, b) with v = a e1 + b e2 (v assumed in the plane of e1, e2)."""
    n = cross(e1, e2)
    assert dot(v, n) == 0
    return (dot(cross(v, e2), n) / dot(n, n), dot(cross(e1, v), n) / dot(n, n))
def rnd(): return F(random.randint(-30, 30), random.randint(1, 6))

# ================= Exercice 1 : tetraedre ABCD =================
tetras = []
while len(tetras) < 60:
    T = [V(rnd(), rnd(), rnd()) for _ in range(4)]
    if det3(sub(T[1], T[0]), sub(T[2], T[0]), sub(T[3], T[0])) != 0:
        tetras.append(T)
for A, B, C, D in tetras:
    I = mid(A, B)
    J = add(A, mul(F(2, 3), sub(C, A)))
    K = mid(A, D)
    # 1 a) I, J, K not aligned ; K not in (ABC)
    check(not in_plane(K, A, B, C), "K hors du plan (ABC)")
    check(not aligned(I, J, K), "I, J, K non alignes")
    # 1 b) (IK) and (BD) coplanar, parallel, distinct
    check(coplanar(I, K, B, D) and parallel(sub(K, I), sub(D, B)) and not on_line(I, B, D), "(IK) // (BD), distinctes")
    check(sub(K, I) == mul(F(1, 2), sub(D, B)), "IK = BD/2 (droite des milieux)")
    # 1 c) (IJ) and (CD) not coplanar
    check(not coplanar(I, J, C, D), "(IJ) et (CD) non coplanaires")
    # 2 a) (IJ), (BC) coplanar, not parallel (AI/AB = 1/2, AJ/AC = 2/3)
    check(coplanar(I, J, B, C) and not parallel(sub(J, I), sub(C, B)), "(IJ) et (BC) secantes")
    check(param(I, A, B) == F(1, 2) and param(J, A, C) == F(2, 3) and param(K, A, D) == F(1, 2), "AI/AB = 1/2, AJ/AC = 2/3, AK/AD = 1/2")
    Lp = line_inter(I, J, B, C)
    check(Lp == sub(mul(2, C), B), "L = point tel que C milieu de [BL]")
    check(mid(B, Lp) == C, "C milieu de [BL]")
    # 2 b) J centroid of A B L
    check(bary(A, B, Lp) == J, "J centre de gravite de ABL")
    check(on_line(J, Lp, I) and on_line(Lp, I, J), "L, J, I alignes")
    # 3) M = (JK) cap (CD), C midpoint of [DM], J centroid of A D M
    check(coplanar(J, K, C, D) and not parallel(sub(K, J), sub(D, C)), "(JK) et (CD) secantes")
    M = line_inter(J, K, C, D)
    check(mid(D, M) == C and bary(A, D, M) == J, "C milieu de [DM], J centre de gravite de ADM")
    # 4 a) (IJK) cap (BCD) = (LM)
    check(in_plane(Lp, I, J, K) and in_plane(M, I, J, K), "L, M dans (IJK)")
    check(in_plane(Lp, B, C, D) and in_plane(M, B, C, D), "L, M dans (BCD)")
    check(not in_plane(I, B, C, D) and Lp != M, "plans distincts, L != M")
    # 4 b) BDLM parallelogram : vec(ML) = vec(BD)
    check(sub(Lp, M) == sub(D, B) and mid(B, Lp) == mid(D, M), "BDLM parallelogramme, (LM) // (BD), LM = BD")
    # 5) (CK) cap (DJ) = P midpoint of [CK]
    check(coplanar(C, K, D, J) and not parallel(sub(K, C), sub(J, D)), "(CK), (DJ) secantes")
    # components in the base (AC, AD) of plane (ACD)
    AC_, AD_ = sub(C, A), sub(D, A)
    check(sub(K, C) == add(mul(-1, AC_), mul(F(1, 2), AD_)), "vec(CK) = -AC + (1/2)AD")
    check(sub(J, D) == add(mul(F(2, 3), AC_), mul(-1, AD_)), "vec(DJ) = (2/3)AC - AD")
    cCK, cDJ = comps(sub(K, C), AC_, AD_), comps(sub(J, D), AC_, AD_)
    check(cCK == (-1, F(1, 2)) and cDJ == (F(2, 3), -1), "composantes de CK et DJ dans la base (AC, AD)")
    check(cCK[0] * cDJ[1] - cDJ[0] * cCK[1] == F(2, 3), "det(CK, DJ) = 2/3 != 0")
    Pp = line_inter(C, K, D, J)
    check(Pp == mid(C, K), "P milieu de [CK]")
    check(sub(Pp, A) == add(mul(F(1, 2), AC_), mul(F(1, 4), AD_)), "vec(AP) = (1/2)AC + (1/4)AD")
    check(sub(Pp, D) == add(mul(F(1, 2), AC_), mul(F(-3, 4), AD_)), "vec(DP) = (1/2)AC - (3/4)AD")
    cDP = comps(sub(mid(C, K), D), AC_, AD_)
    check(cDP == (F(1, 2), F(-3, 4)) and cDP[0] * cDJ[1] - cDJ[0] * cDP[1] == 0, "det(DP', DJ) = 0")
    check(param(Pp, D, J) == F(3, 4), "DP = (3/4) DJ")
    # (CK) pierces (BDJ) at P ; C not in (BDJ)
    check(in_plane(Pp, B, D, J) and not in_plane(C, B, D, J), "P dans (BDJ), C hors de (BDJ)")
    X, t = line_plane(C, K, B, D, J)
    check(X == Pp and t == F(1, 2), "(CK) perce (BDJ) en P")
    check(not in_plane(A, B, D, J), "A hors de (BDJ)")

# ================= Exercice 2 : pyramide SABCD, toutes les aretes 4 =================
H2 = F(8)                      # h^2, with z = t*h
def dotm(u, v): return u[0] * v[0] + u[1] * v[1] + u[2] * v[2] * H2
def d2(P, Q): u = sub(Q, P); return dotm(u, u)
def area2(P, Q, R):            # (area)^2 of triangle PQR, exact
    u, v = sub(Q, P), sub(R, P)
    c = cross(u, v)            # components (h c0, h c1, c2) in real coordinates
    return (H2 * (c[0] ** 2 + c[1] ** 2) + c[2] ** 2) / 4
A, B, C, D = V(-2, -2, 0), V(2, -2, 0), V(2, 2, 0), V(-2, 2, 0)
S = V(0, 0, 1)
O = V(0, 0, 0)
check(O == mid(A, C) == mid(B, D), "O centre du carre")
edges = [(A, B), (B, C), (C, D), (D, A), (S, A), (S, B), (S, C), (S, D)]
check(all(d2(P, Q) == 16 for P, Q in edges), "les huit aretes mesurent 4")
check(dotm(sub(B, A), sub(D, A)) == 0, "ABCD carre (angle droit)")
# 1 a) equilateral faces, total area 16 + 16 sqrt3
for P, Q in [(A, B), (B, C), (C, D), (D, A)]:
    check(d2(S, P) == d2(S, Q) == d2(P, Q) == 16, "face laterale equilaterale")
    check(area2(S, P, Q) == 48, "aire d'une face = 4 sqrt3 (carre 48)")
check(area2(A, B, C) * 4 == 16 ** 2, "aire de la base 16")
tot = 2 * math.sqrt(area2(A, B, C)) + sum(math.sqrt(area2(S, P, Q)) for P, Q in [(A, B), (B, C), (C, D), (D, A)])
check(abs(tot - (16 + 16 * math.sqrt(3))) < 1e-9 and round(tot, 2) == 43.71, "aire totale 16 + 16 sqrt3 ~ 43.71")
# 1 b) AC = 4 sqrt2, SAC right isosceles at S, SO = 2 sqrt2
check(d2(A, C) == 32 and d2(S, A) + d2(S, C) == d2(A, C) and dotm(sub(A, S), sub(C, S)) == 0, "SAC rectangle en S")
check(d2(S, O) == 8 and d2(S, O) * 4 == d2(A, C), "SO = AC/2 = 2 sqrt2")
# 2 a) (SA), (BC) not coplanar
check(not coplanar(S, A, B, C), "(SA) et (BC) non coplanaires")
# 2 b) (SAC) cap (SBD) = (SO)
check(in_plane(O, S, A, C) and in_plane(O, S, B, D) and not in_plane(A, S, B, D), "(SAC) cap (SBD) = (SO)")
# 3) M midpoint of [SC], G = (AM) cap (SO), centroid of SAC
M = mid(S, C)
check(coplanar(A, M, S, O) and not parallel(sub(M, A), sub(O, S)), "(AM), (SO) secantes")
G = line_inter(A, M, S, O)
check(G == bary(S, A, C), "G centre de gravite de SAC")
check(sub(G, S) == mul(F(2, 3), sub(O, S)) and sub(G, A) == mul(F(2, 3), sub(M, A)), "SG = 2/3 SO, AG = 2/3 AM")
X, t = line_plane(A, M, S, B, D)
check(X == G and 0 < t < 1, "(AM) perce (SBD) en G, entre A et M")
check(not in_plane(A, S, B, D), "A hors de (SBD)")
# G inside triangle SBD : G = (1/3)S + (1/3)B + (1/3)D
check(G == bary(S, B, D), "G centre de gravite de SBD (donc a l'interieur)")
check(d2(S, G) == F(32, 9) and d2(A, M) == 20 and d2(A, G) == F(80, 9), "SG = 4sqrt2/3, AM = 2sqrt5, AG = 4sqrt5/3")
check(d2(S, A) + d2(S, M) == d2(A, M) and dotm(sub(A, S), sub(M, S)) == 0, "ASM rectangle en S")
check(round(math.sqrt(d2(S, G)), 2) == 1.89 and round(math.sqrt(d2(A, G)), 2) == 2.98, "approximations SG, AG")
check(round(math.sqrt(d2(S, O)), 2) == 2.83, "SO ~ 2.83")
# 4) N midpoint of [SB] on (DG) ; (SB) cap (ADM) = N
N = mid(S, B)
check(on_line(N, D, G), "D, G, N alignes")
check(in_plane(N, A, D, M) and in_plane(G, A, D, M), "N et G dans (ADM)")
check(not in_plane(S, A, D, M), "S hors de (ADM), donc (SB) non incluse")
X, t = line_plane(S, B, A, D, M)
check(X == N and t == F(1, 2), "(SB) perce (ADM) en N, milieu de [SB]")
check(coplanar(A, D, M, N), "A, D, M, N coplanaires")
# 5) ribbon ADMN : 4 + 2sqrt3 + 2 + 2sqrt3
check(d2(A, D) == 16 and d2(D, M) == 12 and d2(M, N) == 4 and d2(N, A) == 12, "AD = 4, DM = 2sqrt3, MN = 2, NA = 2sqrt3")
check(sub(N, M) == mul(F(1, 2), sub(B, C)), "MN = BC/2 (droite des milieux)")
rib = sum(math.sqrt(d2(P, Q)) for P, Q in [(A, D), (D, M), (M, N), (N, A)])
check(abs(rib - (6 + 4 * math.sqrt(3))) < 1e-9 and round(rib, 2) == 12.93, "ruban 6 + 4 sqrt3 ~ 12.93")

print(f"all {ok} checks passed")
