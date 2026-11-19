"""Checks every claim used in exercises T2 ch8 (Parallelisme dans l'espace, 2eme Sciences).

Ex1 : the cube is put in coordinates; since every claim is affine (parallelism, midpoints,
coplanarity, intersections), it is also re-checked on random parallelepipeds.
Ex2 : pyramid with square base 6 and lateral edges 6; a point is stored as (x, y, t) with
real height z = t*h and h^2 = 18, so squared lengths stay rational.
"""
from fractions import Fraction as F
import math, random

random.seed(208)
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
def cross(u, v): return (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
def dot(u, v): return sum(a * b for a, b in zip(u, v))
def det3(u, v, w): return dot(u, cross(v, w))
def parallel(u, v): return cross(u, v) == Z
def coplanar(A, B, C, D): return det3(sub(B, A), sub(C, A), sub(D, A)) == 0
def normal(A, B, C): return cross(sub(B, A), sub(C, A))
def in_plane(M, A, B, C): return coplanar(A, B, C, M)
def planes_parallel(P1, P2): return parallel(normal(*P1), normal(*P2))
def line_par_plane(u, Pl): return dot(u, normal(*Pl)) == 0
def line_plane(A, u, Pl):
    n = normal(*Pl)
    t = dot(sub(Pl[0], A), n) / dot(u, n)
    return add(A, mul(t, u)), t
def fsqrt(q):
    """Exact square root of a rational that must be a perfect square."""
    q = F(q); rn, rd = math.isqrt(q.numerator), math.isqrt(q.denominator)
    assert rn * rn == q.numerator and rd * rd == q.denominator, "not a perfect square"
    return F(rn, rd)
def line_inter(A, B, C, D):
    u, v, w = sub(B, A), sub(D, C), sub(C, A)
    uv = cross(u, v)
    s = dot(cross(w, v), uv) / dot(uv, uv)
    return add(A, mul(s, u))

# ================= Exercice 1 : cube ABCDEFGH (and random parallelepipeds) =================
def solid(O, a, b, c):
    A = O; B = add(O, a); D = add(O, b); E = add(O, c)
    C = add(O, a, b); F_ = add(O, a, c); H = add(O, b, c); G = add(O, a, b, c)
    return A, B, C, D, E, F_, G, H
cube = solid(V(0, 0, 0), V(2, 0, 0), V(0, 2, 0), V(0, 0, 2))
def rnd(): return F(random.randint(-20, 20), random.randint(1, 5))
solids = [cube]
while len(solids) < 40:
    a, b, c = V(rnd(), rnd(), rnd()), V(rnd(), rnd(), rnd()), V(rnd(), rnd(), rnd())
    if det3(a, b, c) != 0:
        solids.append(solid(V(rnd(), rnd(), rnd()), a, b, c))
for idx, (A, B, C, D, E, F_, G, H) in enumerate(solids):
    if idx == 0:   # the cube : faces are squares of side 2, edges perpendicular
        check(all(dot(sub(P, Q), sub(P, Q)) == 4 for P, Q in [(A, B), (B, C), (C, D), (D, A), (A, E), (B, F_), (C, G), (D, H), (E, F_), (F_, G), (G, H), (H, E)]), "cube : 12 aretes egales")
        check(dot(sub(B, A), sub(D, A)) == 0 and dot(sub(B, A), sub(E, A)) == 0 and dot(sub(D, A), sub(E, A)) == 0, "cube : angles droits en A")
    # the described faces are faces (coplanar quadruples)
    for q in [(A, B, C, D), (E, F_, G, H), (A, B, F_, E), (B, C, G, F_), (C, D, H, G), (D, A, E, H)]:
        check(coplanar(*q), "les six faces")
    I, J, K = mid(A, B), mid(A, D), mid(A, E)
    # 1 a) (IJ) // (BD), (IK) // (BE)
    check(sub(J, I) == mul(F(1, 2), sub(D, B)) and sub(K, I) == mul(F(1, 2), sub(E, B)), "IJ = BD/2, IK = BE/2")
    # 1 b) (IJK) // (BDE), distinct
    check(planes_parallel((I, J, K), (B, D, E)) and not in_plane(I, B, D, E), "(IJK) strictement parallele a (BDE)")
    check(not parallel(sub(D, B), sub(E, B)), "(BD) et (BE) secantes")
    def len2(P, Q): u = sub(Q, P); return dot(u, u)
    # 2 a) (BF) // (AE) // (DH) : B, F, H, D coplanar ; BF = DH ; [BD] in (ABC), [FH] in (EFG), strictly parallel
    check(parallel(sub(F_, B), sub(E, A)) and parallel(sub(H, D), sub(E, A)) and coplanar(B, F_, H, D), "(BF) // (AE) // (DH), B F H D coplanaires")
    check(len2(B, F_) == len2(D, H), "BF = DH")
    check(parallel(sub(F_, E), sub(B, A)) and parallel(sub(H, E), sub(D, A)), "(EF) // (AB), (EH) // (AD)")
    check(planes_parallel((A, B, C), (E, F_, G)) and not in_plane(E, A, B, C), "(ABC) et (EFG) strictement paralleles")
    check(in_plane(D, A, B, C) and in_plane(H, E, F_, G), "[BD] dans (ABC), [FH] dans (EFG)")
    check(mid(B, H) == mid(F_, D), "BFHD parallelogramme (diagonales de meme milieu, non croise)")
    check(parallel(sub(D, B), sub(H, F_)), "(BD) // (FH)")
    # 2 b) (BC) // (AD) // (EH) : B, C, H, E coplanar ; BC = EH ; [BE] in (ABF), [CH] in (DCG), strictly parallel
    check(parallel(sub(C, B), sub(D, A)) and parallel(sub(H, E), sub(D, A)) and coplanar(B, C, H, E), "(BC) // (AD) // (EH), B C H E coplanaires")
    check(len2(B, C) == len2(E, H), "BC = EH")
    check(parallel(sub(C, D), sub(B, A)) and parallel(sub(H, D), sub(E, A)), "(DC) // (AB), (DH) // (AE)")
    check(planes_parallel((A, B, F_), (D, C, G)) and not in_plane(D, A, B, F_), "(ABF) et (DCG) strictement paralleles")
    check(in_plane(E, A, B, F_) and in_plane(H, D, C, G), "[BE] dans (ABF), [CH] dans (DCG)")
    check(mid(B, H) == mid(C, E), "BCHE parallelogramme (non croise)")
    check(parallel(sub(E, B), sub(H, C)), "(BE) // (CH)")
    # 2 c) (BDE) // (CFH) // (IJK)
    check(not parallel(sub(H, F_), sub(H, C)), "(FH) et (CH) secantes")
    check(planes_parallel((B, D, E), (C, F_, H)) and not in_plane(C, B, D, E), "(BDE) strictement parallele a (CFH)")
    check(planes_parallel((I, J, K), (C, F_, H)) and not in_plane(I, C, F_, H), "(IJK) strictement parallele a (CFH)")
    # 3 a) (JK) // (CFH) ; also (JK) // (DE) // (CF)
    check(line_par_plane(sub(K, J), (C, F_, H)) and not in_plane(J, C, F_, H), "(JK) strictement parallele a (CFH)")
    # 3 b) (ABC) cap (CFH) = delta through C parallel to (BD)
    check(not planes_parallel((A, B, C), (C, F_, H)), "(ABC) et (CFH) secants")
    W = add(C, sub(D, B))
    check(in_plane(W, A, B, C) and in_plane(W, C, F_, H), "delta = droite par C parallele a (BD)")
    # 3 c) X = delta cap (AB), B midpoint of [AX], X = (AB) cap (CFH)
    X = line_inter(C, W, A, B)
    check(X == sub(mul(2, B), A) and mid(A, X) == B, "B milieu de [AX]")
    check(sub(X, B) == sub(C, D) == sub(B, A), "BDCX parallelogramme : vec(BX) = vec(DC) = vec(AB)")
    X2, t = line_plane(A, sub(B, A), (C, F_, H))
    check(X2 == X and t == 2 and not in_plane(A, C, F_, H), "(AB) perce (CFH) en X")
    # 4 a) A, B, G, H coplanar ; C, D, E, F coplanar ; (AB) // (HG) // (DC) // (EF)
    check(coplanar(A, B, G, H) and coplanar(C, D, E, F_), "ABGH et CDEF plans")
    check(sub(B, A) == sub(C, D) == sub(G, H) == sub(F_, E), "AB = DC = HG = EF (vecteurs)")
    # 4 b) U centre of ADHE (= AH cap DE), V centre of BCGF (= BG cap CF)
    U, Vv = mid(A, H), mid(B, G)
    check(U == mid(D, E) == line_inter(A, H, D, E) and Vv == mid(C, F_) == line_inter(B, G, C, F_), "centres U et V")
    check(U != Vv and in_plane(U, A, D, E) and in_plane(Vv, B, C, F_), "U != V, U dans (ADE), V dans (BCF)")
    check(planes_parallel((A, D, E), (B, C, F_)) and not in_plane(B, A, D, E), "(ADE) et (BCF) strictement paralleles")
    check(parallel(sub(C, B), sub(D, A)) and parallel(sub(F_, B), sub(E, A)), "(BC) // (AD), (BF) // (AE)")
    for Pt in (U, Vv):
        check(in_plane(Pt, A, B, G) and in_plane(Pt, C, D, E), "U, V dans (ABG) et (CDE)")
    # 4 c) intersection (UV), parallel to (AB) ; planes distinct
    check(not in_plane(C, A, B, G), "plans (ABG) et (CDE) distincts")
    check(parallel(sub(Vv, U), sub(B, A)) and sub(Vv, U) == sub(B, A), "(UV) // (AB), UV = AB")
    n1, n2 = normal(A, B, G), normal(C, D, E)
    check(dot(sub(Vv, U), n1) == 0 and dot(sub(Vv, U), n2) == 0 and not parallel(n1, n2), "(UV) = (ABG) cap (CDE)")

# ================= Exercice 2 : pyramide SABCD, toutes les aretes 6 =================
H2 = F(18)
def dotm(u, v): return u[0] * v[0] + u[1] * v[1] + u[2] * v[2] * H2
def d2(P, Q): u = sub(Q, P); return dotm(u, u)
def cross2(u, v):          # squared norm of the real cross product
    c = cross(u, v)
    return H2 * (c[0] ** 2 + c[1] ** 2) + c[2] ** 2
A, B, C, D = V(-3, -3, 0), V(3, -3, 0), V(3, 3, 0), V(-3, 3, 0)
S = V(0, 0, 1)
check(all(d2(P, Q) == 36 for P, Q in [(A, B), (B, C), (C, D), (D, A), (S, A), (S, B), (S, C), (S, D)]), "base carree de cote 6, aretes laterales 6")
check(dotm(sub(B, A), sub(D, A)) == 0, "ABCD carre")
# 1 a) equilateral faces, area SAB = 9 sqrt3
areaSAB2 = cross2(sub(B, A), sub(S, A)) / 4
check(areaSAB2 == 9 ** 2 * 3, "aire SAB = 9 sqrt3")
check(all(d2(S, P) == d2(S, Q) == d2(P, Q) for P, Q in [(A, B), (B, C), (C, D), (D, A)]), "faces laterales equilaterales")
# 1 b) (SAB) cap (SCD) = line through S parallel to (AB)
T = add(S, sub(B, A))
check(in_plane(T, S, A, B) and in_plane(T, S, C, D) and not in_plane(C, S, A, B), "Delta = (SAB) cap (SCD), parallele a (AB)")
xs = [F(k, 7) for k in range(1, 42)] + [F(3)]
res = {}
for x in xs:
    assert 0 < x < 6          # sample values of x
    M = add(B, mul(x / 6, sub(C, B)))
    check(d2(B, M) == x * x, "BM = x")
    Pl = (M, add(M, sub(B, A)), add(M, sub(S, A)))            # plane through M parallel to (SAB)
    check(planes_parallel(Pl, (S, A, B)) and not in_plane(M, S, A, B), "P strictement parallele a (SAB)")
    # 2 a) N on [AD] : P cap (ABC) is the parallel to (AB) through M
    N, tN = line_plane(A, sub(D, A), Pl)
    check(0 < tN < 1 and parallel(sub(N, M), sub(B, A)), "N sur [AD], (MN) // (AB)")
    check(d2(A, N) == x * x and d2(M, N) == 36, "AN = x, MN = 6")
    # 2 b) R on [SC] with (MR) // (SB), Q on [SD] with (NQ) // (SA)
    R, tR = line_plane(C, sub(S, C), Pl)
    Q, tQ = line_plane(D, sub(S, D), Pl)
    check(0 < tR < 1 and 0 < tQ < 1, "R sur [SC], Q sur [SD]")
    check(parallel(sub(R, M), sub(B, S)) and parallel(sub(Q, N), sub(A, S)), "(MR) // (SB), (NQ) // (SA)")
    check(d2(M, R) == (6 - x) ** 2 and d2(N, Q) == (6 - x) ** 2, "MR = NQ = 6 - x")
    check(d2(C, R) == (6 - x) ** 2 and d2(S, R) == x * x and d2(D, Q) == (6 - x) ** 2 and d2(S, Q) == x * x, "CR = DQ = 6 - x, SR = SQ = x")
    check(d2(C, M) * d2(C, S) == d2(C, R) * d2(C, B) and d2(C, M) * d2(B, S) == d2(M, R) * d2(C, B), "Thales : CM/CB = CR/CS = MR/BS")
    check(d2(D, N) * d2(D, S) == d2(D, Q) * d2(D, A) and d2(D, N) * d2(A, S) == d2(N, Q) * d2(D, A), "Thales : DN/DA = DQ/DS = NQ/AS")
    # 2 c) (QR) // (CD) // Delta, QR = x
    check(parallel(sub(R, Q), sub(C, D)) and parallel(sub(R, Q), sub(T, S)) and d2(Q, R) == x * x, "(QR) // (CD), QR = x")
    # the section : edges cut are [BC], [AD], [SC], [SD] ; the others are parallel to P
    for P0, P1 in [(A, B), (C, D), (S, A), (S, B)]:
        check(line_par_plane(sub(P1, P0), Pl) and not in_plane(P0, *Pl), "arete parallele a P, hors de P")
    for Pt in (N, R, Q):
        check(in_plane(Pt, *Pl), "N, R, Q dans P")
    # 3 a) isosceles trapezoid MNQR
    check(parallel(sub(N, M), sub(Q, R)) and d2(M, N) != d2(Q, R), "MN // QR et MN != QR : trapeze")
    check(d2(N, Q) == d2(M, R) and not parallel(sub(Q, N), sub(R, M)), "cotes non paralleles egaux : trapeze isocele")
    # convex order M, N, Q, R : the diagonals [MQ] and [NR] cross
    Xd = line_inter(M, Q, N, R)
    def tpar(P, A0, B0):
        u = sub(B0, A0); i = max(range(3), key=lambda k: abs(u[k])); return (P[i] - A0[i]) / u[i]
    check(0 < tpar(Xd, M, Q) < 1 and 0 < tpar(Xd, N, R) < 1, "MNQR convexe")
    # 3 b) perimeter 18 - x
    per = fsqrt(d2(M, N)) + fsqrt(d2(N, Q)) + fsqrt(d2(Q, R)) + fsqrt(d2(R, M))
    check(per == 18 - x, "p(x) = 18 - x")
    # 4 a) height^2 = (3/4)(6 - x)^2 and area = (sqrt3/4)(36 - x^2)
    h2 = cross2(sub(N, M), sub(Q, M)) / d2(M, N)
    check(h2 == F(3, 4) * (6 - x) ** 2, "hauteur du trapeze = (sqrt3/2)(6 - x)")
    u = sub(N, M)
    Qp = add(M, mul(dotm(sub(Q, M), u) / dotm(u, u), u))      # foot Q' of Q on (MN)
    check(d2(N, Qp) == ((6 - x) / 2) ** 2 and d2(N, Q) - d2(N, Qp) == h2 == d2(Q, Qp), "NQ' = (6 - x)/2, QQ'^2 = NQ^2 - NQ'^2")
    area_sq = cross2(sub(Q, M), sub(R, N)) / 4                 # planar quadrilateral : (1/2)|MQ x NR|
    check(area_sq == F(3, 16) * (36 - x * x) ** 2, "aire = (sqrt3/4)(36 - x^2)")
    check(((fsqrt(d2(M, N)) + fsqrt(d2(Q, R))) / 2) ** 2 * h2 == area_sq, "aire = (bases/2) x hauteur")
    res[x] = (per, area_sq)
# 4 b) The coordinates of M, N, Q, R are affine in x, so area^2 (computed above from coordinates)
# is a polynomial of degree <= 4 in x; it equals (3/16)(36 - x^2)^2 at 42 values, hence for every x.
check(len(set(xs)) > 5, "identite polynomiale (plus de 5 valeurs)")
xr = sorted(set(xs))
check(all(res[xr[i]][1] > res[xr[i + 1]][1] for i in range(len(xr) - 1)), "aire strictement decroissante sur ]0, 6[ : solution unique")
x0sq = F(18)
check(F(3, 16) * (36 - x0sq) ** 2 == areaSAB2 / 4 and 0 < x0sq < 36, "x^2 = 18 donne la moitie de l'aire de SAB")
check(res[F(25, 7)][1] > areaSAB2 / 4 > res[F(30, 7)][1] and F(25, 7) ** 2 < 18 < F(30, 7) ** 2, "encadrement 3.57 < x < 4.29")
check(round(math.sqrt(x0sq), 2) == 4.24, "3 sqrt2 ~ 4.24")
# 4 c) x = 3 (M midpoint of [BC])
check(res[F(3)][0] == 15 and res[F(3)][1] == F(27, 4) ** 2 * 3, "x = 3 : p = 15, aire = 27 sqrt3 / 4")
check(round(math.sqrt(res[F(3)][1]), 2) == 11.69 and round(math.sqrt(areaSAB2), 2) == 15.59, "approximations 11.69 et 15.59")

print(f"all {ok} checks passed")
