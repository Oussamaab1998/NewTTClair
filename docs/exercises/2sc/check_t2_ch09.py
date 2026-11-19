"""Checks every claim used in exercises T2 ch9 (Orthogonalite dans l'espace, 2eme Sciences).

The solids are put in an orthonormal frame (cube of edge 4, pyramid with (SA) perpendicular
to the base); every claimed orthogonality, perpendicular plane, mediator plane, axis,
length, area and volume is recomputed exactly.
"""
from fractions import Fraction as F
import math, random

random.seed(209)
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
def d2(P, Q): u = sub(Q, P); return dot(u, u)
def det3(u, v, w): return dot(u, cross(v, w))
def parallel(u, v): return cross(u, v) == Z
def coplanar(A, B, C, D): return det3(sub(B, A), sub(C, A), sub(D, A)) == 0
def normal(A, B, C): return cross(sub(B, A), sub(C, A))
def in_plane(M, A, B, C): return coplanar(A, B, C, M)
def on_line(M, A, B): return parallel(sub(B, A), sub(M, A))
def line_perp_plane(u, Pl):
    """Textbook definition : orthogonal to two secant lines of the plane."""
    A, B, C = Pl
    return dot(u, sub(B, A)) == 0 and dot(u, sub(C, A)) == 0 and not parallel(sub(B, A), sub(C, A))
def fsqrt(q):
    """Exact square root of a rational that must be a perfect square."""
    q = F(q); rn, rd = math.isqrt(q.numerator), math.isqrt(q.denominator)
    assert rn * rn == q.numerator and rd * rd == q.denominator, "not a perfect square"
    return F(rn, rd)
def area2_tri(P, Q, R): c = cross(sub(Q, P), sub(R, P)); return dot(c, c) / 4
def vol_tetra(P, Q, R, S): return abs(det3(sub(Q, P), sub(R, P), sub(S, P))) / 6
def rnd(): return F(random.randint(-30, 30), random.randint(1, 6))

# ================= Exercice 1 : cube d'arete 4 =================
A, B, C, D = V(0, 0, 0), V(4, 0, 0), V(4, 4, 0), V(0, 4, 0)
E, F_, G, H = V(0, 0, 4), V(4, 0, 4), V(4, 4, 4), V(0, 4, 4)
check(all(d2(P, Q) == 16 for P, Q in [(A, B), (B, C), (C, D), (D, A), (E, F_), (F_, G), (G, H), (H, E), (A, E), (B, F_), (C, G), (D, H)]), "12 aretes de longueur 4")
for q in [(A, B, C, D), (E, F_, G, H), (A, B, F_, E), (B, C, G, F_), (C, D, H, G), (D, A, E, H)]:
    check(coplanar(*q) and dot(sub(q[1], q[0]), sub(q[3], q[0])) == 0, "faces carrees")
O = mid(A, C)
check(O == mid(B, D), "O centre de ABCD")
I = mid(A, E)
# 1 a) (AE) perpendicular to (ABC) : orthogonal to (AB) and (AD)
check(dot(sub(E, A), sub(B, A)) == 0 and dot(sub(E, A), sub(D, A)) == 0, "(AE) perp (AB) et (AD)")
check(line_perp_plane(sub(E, A), (A, B, D)), "(AE) perp (ABC)")
# 1 b) EAC right at A, AC = 4 sqrt2, EC = 4 sqrt3
check(dot(sub(E, A), sub(C, A)) == 0 and d2(A, C) == 32 and d2(E, C) == 48 == d2(A, E) + d2(A, C), "EAC rectangle en A, AC^2 = 32, EC^2 = 48")
# 2 a) (BD) perp (ACE)
check(dot(sub(D, B), sub(C, A)) == 0 and dot(sub(D, B), sub(E, A)) == 0, "(BD) perp (AC) et (AE)")
check(line_perp_plane(sub(D, B), (A, C, E)), "(BD) perp (ACE)")
# 2 b) (BD) orthogonal to (EC) and to (IO) ; (IO) in (ACE), meets (BD) at O
check(dot(sub(D, B), sub(C, E)) == 0, "(BD) orthogonale a (EC)")
check(in_plane(I, A, C, E) and in_plane(O, A, C, E) and dot(sub(D, B), sub(O, I)) == 0 and on_line(O, B, D), "(IO) dans (ACE), (IO) perp (BD) en O")
# 2 c) (EG) // (AC), orthogonal to (BD), not coplanar
check(parallel(sub(E, A), sub(F_, B)) and parallel(sub(G, C), sub(F_, B)) and coplanar(A, C, G, E), "(AE) // (BF) // (CG), A C G E coplanaires")
check(parallel(normal(A, B, C), normal(E, F_, G)) and not in_plane(E, A, B, C), "(ABC) et (EFG) strictement paralleles")
check(in_plane(C, A, B, D) and in_plane(G, E, F_, H), "(AC) dans (ABC), (EG) dans (EFG)")
check(parallel(sub(G, E), sub(C, A)), "(EG) // (AC)")
check(dot(sub(G, E), sub(D, B)) == 0 and not coplanar(E, G, B, D), "(EG) et (BD) orthogonales non coplanaires")
check(not parallel(sub(G, E), sub(D, B)), "(EG) non parallele a (BD)")
check(parallel(normal(E, F_, H), normal(A, B, D)) and not in_plane(E, A, B, D), "(EFGH) strictement parallele a (ABC)")
check(parallel(sub(F_, E), sub(B, A)) and parallel(sub(H, E), sub(D, A)), "(EF) // (AB), (EH) // (AD)")
# 3 a) A, C, E, G equidistant from B and D
check(d2(A, B) == d2(A, D) == 16 and d2(C, B) == d2(C, D) == 16, "AB = AD, CB = CD")
check(d2(E, B) == d2(E, D) == 32 and d2(G, B) == d2(G, D) == 32, "EB = ED = GB = GD = 4 sqrt2")
# 3 b) mediator plane of [BD] = (ACE) (contains G)
check(in_plane(G, A, C, E) and not on_line(E, A, C), "A, C, E non alignes, G dans (ACE)")
for _ in range(200):     # points of (ACE) are equidistant ; moving off the plane breaks it
    M = add(A, mul(rnd(), sub(C, A)), mul(rnd(), sub(E, A)))
    k = rnd() or F(1)
    Mo = add(M, mul(k, sub(D, B)))
    check(d2(M, B) == d2(M, D) and d2(Mo, B) != d2(Mo, D) and not in_plane(Mo, A, C, E), "plan mediateur de [BD] = (ACE)")
check(in_plane(mid(B, D), A, C, E) and line_perp_plane(sub(D, B), (A, C, E)), "(ACE) perpendiculaire a [BD] en son milieu")
# 4) (IBD) perp (ACE) ; intersection (IO)
check(dot(normal(I, B, D), normal(A, C, E)) == 0, "(IBD) perp (ACE)")
check(in_plane(I, A, C, E) and in_plane(O, I, B, D) and in_plane(O, A, C, E) and I != O, "(IBD) cap (ACE) = (IO)")
check(not in_plane(B, A, C, E), "plans distincts")
# 5 a) IB = ID = 2 sqrt5, IO = 2 sqrt3, area IBD = 4 sqrt6
check(d2(I, A) == 4 and dot(sub(I, A), sub(B, A)) == 0, "IAB rectangle en A, IA = 2")
check(d2(I, B) == 20 and d2(I, D) == 20, "IB = ID = 2 sqrt5")
check(d2(B, D) == 32 and d2(O, B) == 8 and d2(I, O) == 12 == d2(I, B) - d2(O, B) == d2(I, A) + d2(A, O), "IO^2 = IB^2 - OB^2 = IA^2 + AO^2 = 12")
check(area2_tri(I, B, D) == 4 ** 2 * 6 == F(1, 4) * d2(B, D) * d2(I, O), "aire IBD = (1/2) BD x IO = 4 sqrt6")
check(round(math.sqrt(area2_tri(I, B, D)), 2) == 9.80, "4 sqrt6 ~ 9.80")
# 5 b) volume IABD = 16/3
check(vol_tetra(I, A, B, D) == F(16, 3) == F(1, 3) * fsqrt(area2_tri(A, B, D)) * fsqrt(d2(I, A)), "V = (1/3)(8)(2) = 16/3")
check(area2_tri(A, B, D) == 64, "aire ABD = 8")
# 5 c) h = 3V / area = 16 / (4 sqrt6) = 2 sqrt6 / 3
n = normal(I, B, D)
h2 = dot(sub(A, I), n) ** 2 / dot(n, n)
check(h2 == F(8, 3), "distance de A au plan (IBD) au carre = 8/3")
check((3 * vol_tetra(I, A, B, D)) ** 2 / area2_tri(I, B, D) == h2 == F(2, 3) ** 2 * 6, "h = 3V / aire(IBD) = 2 sqrt6/3")
check(round(math.sqrt(h2), 2) == 1.63, "h ~ 1.63")
# 5 d) foot K on (IO), AK = IA * AO / IO
t = dot(sub(I, A), n) / dot(n, n)
K = add(A, mul(t, n))
check(in_plane(K, I, B, D) and line_perp_plane(sub(K, A), (I, B, D)), "K pied de la perpendiculaire")
check(on_line(K, I, O) and in_plane(K, A, C, E), "K sur (IO)")
check(dot(sub(I, A), sub(O, A)) == 0 and d2(A, O) == 8, "IAO rectangle en A, AO = 2 sqrt2")
check(d2(A, K) == F(4 * 8, 12) and dot(sub(K, A), sub(O, I)) == 0, "AK = IA x AO / IO, (AK) perp (IO)")

# ================= Exercice 2 : pyramide SABCD, (SA) perp base =================
A, B, C, D = V(0, 0, 0), V(3, 0, 0), V(3, 3, 0), V(0, 3, 0)
S = V(0, 0, 4)
O = mid(A, C)
check(d2(A, B) == d2(B, C) == d2(C, D) == d2(D, A) == 9 and dot(sub(B, A), sub(D, A)) == 0, "ABCD carre de cote 3")
check(line_perp_plane(sub(S, A), (A, B, D)) and d2(S, A) == 16, "(SA) perp (ABC), SA = 4")
# 1 a) (BC) perp (SAB), SBC right at B
check(dot(sub(C, B), sub(B, A)) == 0 and dot(sub(C, B), sub(S, A)) == 0, "(BC) perp (AB) et (SA)")
check(line_perp_plane(sub(C, B), (S, A, B)), "(BC) perp (SAB)")
check(dot(sub(C, B), sub(S, B)) == 0, "SBC rectangle en B")
# 1 b) (CD) perp (SAD), SDC right at D
check(line_perp_plane(sub(D, C), (S, A, D)) and dot(sub(C, D), sub(S, D)) == 0, "(CD) perp (SAD), SDC rectangle en D")
# 1 c) SB = SD = 5, SC = sqrt34
check(d2(S, B) == 25 == d2(S, A) + d2(A, B) and d2(S, D) == 25 == d2(S, A) + d2(A, D), "SB = SD = 5")
check(d2(S, C) == 34 == d2(S, A) + d2(A, C) == d2(S, B) + d2(B, C) and d2(A, C) == 18, "SC = sqrt34 (deux calculs)")
# 2 a) (SAB) perp (SBC)
check(dot(normal(S, A, B), normal(S, B, C)) == 0, "(SAB) perp (SBC)")
# 2 b) (BD) perp (SAC), (BD) orthogonal to (SC)
check(line_perp_plane(sub(D, B), (S, A, C)) and dot(sub(D, B), sub(C, S)) == 0, "(BD) perp (SAC), orthogonale a (SC)")
# 2 c) (SAC) is the mediator plane of [BD]
check(d2(S, B) == d2(S, D) and d2(A, B) == d2(A, D) and d2(C, B) == d2(C, D), "S, A, C equidistants de B et D")
check(in_plane(mid(B, D), S, A, C) and mid(B, D) == O, "O milieu de [BD] dans (SAC)")
for _ in range(200):
    M = add(A, mul(rnd(), sub(C, A)), mul(rnd(), sub(S, A)))
    k = rnd() or F(1)
    Mo = add(M, mul(k, sub(D, B)))
    check(d2(M, B) == d2(M, D) and d2(Mo, B) != d2(Mo, D) and not in_plane(Mo, S, A, C), "plan mediateur de [BD] = (SAC)")
# 3) volume 12, total area 36
check(vol_tetra(S, A, B, C) + vol_tetra(S, A, C, D) == 12 == F(1, 3) * fsqrt(4 * area2_tri(A, B, C)) * fsqrt(d2(S, A)), "V = (1/3)(9)(4) = 12")
faces = [area2_tri(S, A, B), area2_tri(S, A, D), area2_tri(S, B, C), area2_tri(S, C, D)]
check(faces == [36, 36, F(225, 4), F(225, 4)], "aires 6, 6, 7.5, 7.5")
check(sum(fsqrt(a) for a in faces) + fsqrt(4 * area2_tri(A, B, C)) == 36, "aire totale 36")
# 4) H foot of altitude from A in SAB ; (AH) perp (SBC) ; AH = 12/5 ; volumes
u = sub(B, S)
H_ = add(S, mul(dot(sub(A, S), u) / dot(u, u), u))
check(on_line(H_, S, B) and dot(sub(H_, A), u) == 0, "H pied de la hauteur issue de A")
check(0 < dot(sub(H_, S), u) / dot(u, u) < 1, "H sur le segment [SB]")
check(line_perp_plane(sub(H_, A), (S, B, C)), "(AH) perp (SBC)")
check(d2(A, H_) == F(144, 25) and fsqrt(d2(A, H_)) == fsqrt(d2(S, A)) * fsqrt(d2(A, B)) / fsqrt(d2(S, B)) == F(12, 5), "AH = SA x AB / SB = 12/5")
check(d2(S, H_) == F(256, 25) and d2(H_, B) == F(81, 25), "SH = 3.2, HB = 1.8")
check(vol_tetra(S, A, B, C) == 6 == F(1, 3) * fsqrt(area2_tri(A, B, C)) * fsqrt(d2(S, A)) == F(1, 3) * fsqrt(area2_tri(S, B, C)) * fsqrt(d2(A, H_)), "V(SABC) = 6 de deux facons")
check(fsqrt(area2_tri(A, B, C)) == F(9, 2) and fsqrt(area2_tri(S, B, C)) == F(15, 2), "aires 4.5 et 7.5")
# 5) axis of the circle circumscribed to ABCD ; K midpoint of [SC]
K = mid(S, C)
check(parallel(sub(K, O), sub(S, A)) and sub(K, O) == mul(F(1, 2), sub(S, A)), "(OK) // (SA), OK = 2")
check(line_perp_plane(sub(K, O), (A, B, D)), "(OK) perp (ABC)")
check(d2(O, A) == d2(O, B) == d2(O, C) == d2(O, D) == F(9, 2), "O centre du cercle circonscrit, rayon 3 sqrt2 / 2")
for _ in range(100):      # every point of the axis is equidistant from A, B, C, D
    P = add(O, mul(rnd(), sub(K, O)))
    check(d2(P, A) == d2(P, B) == d2(P, C) == d2(P, D), "points de l'axe equidistants")
check(d2(K, S) == d2(K, A) == d2(K, B) == d2(K, C) == d2(K, D) == F(34, 4), "K equidistant des 5 sommets, distance sqrt34/2")
check(dot(sub(S, A), sub(C, A)) == 0, "SAC rectangle en A")
check(d2(O, K) + d2(O, A) == F(17, 2) == d2(K, A) and dot(sub(K, O), sub(A, O)) == 0 and d2(O, K) == 4, "KA^2 = OK^2 + OA^2 = 4 + 9/2 = 17/2")
check(round(math.sqrt(d2(K, S)), 2) == 2.92, "sqrt34 / 2 ~ 2.92")

print(f"all {ok} checks passed")
