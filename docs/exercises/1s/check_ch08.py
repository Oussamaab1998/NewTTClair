"""Checks every value and claim used in CH08_SECTIONS_PLANES.md (1ère année).

Each solid is put in coordinates (cm). A plane section is computed by
intersecting the plane with every edge of the solid (exact fractions); the
section polygon is then tested (vertices, side lengths, right angles, area).
Volumes of the pieces are recomputed independently (2D clipping, or
decomposition into tetrahedra), not from the formula used in the corrige.
"""
from fractions import Fraction as F
from itertools import combinations
import math

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def V(x, y, z): return (F(x), F(y), F(z))
def sub(a, b): return tuple(p - q for p, q in zip(a, b))
def add(a, b): return tuple(p + q for p, q in zip(a, b))
def mul(k, a): return tuple(k * p for p in a)
def dot(a, b): return sum(p * q for p, q in zip(a, b))
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def d2(a, b): u = sub(a, b); return dot(u, u)
def mid(a, b): return mul(F(1, 2), add(a, b))
def det3(a, b, c): return dot(a, cross(b, c))

def section(edges, n, d):
    """Points where the plane n.X = d meets the edges (segments)."""
    pts = set()
    for a, b in edges:
        fa, fb = dot(n, a) - d, dot(n, b) - d
        if fa == 0: pts.add(a)
        if fb == 0: pts.add(b)
        if fa * fb < 0:
            t = fa / (fa - fb)
            pts.add(add(a, mul(t, sub(b, a))))
    return pts

def is_rectangle(p, q, r, s):
    """p q r s in this order: parallelogram with a right angle."""
    return add(p, r) == add(q, s) and dot(sub(q, p), sub(s, p)) == 0 and p != q and p != s

def area_rect(p, q, r, s):
    return d2(p, q) * d2(p, s)   # squared area

def plane_through(a, b, c):
    n = cross(sub(b, a), sub(c, a))
    return n, dot(n, a)

# ================= Exercice 1 : pavé droit ABCDEFGH =================
A, B, C, D = V(0, 0, 0), V(12, 0, 0), V(12, 9, 0), V(0, 9, 0)
E, Fv, G, H = V(0, 0, 8), V(12, 0, 8), V(12, 9, 8), V(0, 9, 8)
box_edges = [(A, B), (B, C), (C, D), (D, A), (E, Fv), (Fv, G), (G, H), (H, E), (A, E), (B, Fv), (C, G), (D, H)]
check(sub(E, A) == sub(Fv, B) == sub(G, C) == sub(H, D) == V(0, 0, 8), "E, F, G, H above A, B, C, D")
check(dot(sub(E, A), sub(B, A)) == 0 and dot(sub(E, A), sub(D, A)) == 0, "(AE) perpendicular to the base")
check(12 * 9 * 8 == 864, "volume of the pave")
check(d2(A, C) == 225 and d2(A, C) == d2(A, B) + d2(B, C), "AC = 15 (Pythagore in ABC)")
check(dot(sub(G, C), sub(A, C)) == 0, "(CG) perpendicular to (AC)")
check(d2(A, G) == 289 and d2(A, G) == d2(A, C) + d2(C, G), "AG = 17 (Pythagore in ACG)")

# 2D tools on the base rectangle (all cutting planes of Q2-Q4 are vertical)
def clip(poly, a, b, c):
    """part of the polygon where a x + b y <= c."""
    out = []
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        fp, fq = a * p[0] + b * p[1] - c, a * q[0] + b * q[1] - c
        if fp <= 0: out.append(p)
        if fp * fq < 0:
            t = fp / (fp - fq)
            out.append((p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])))
    return out
def area2d(poly):
    return abs(sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(poly, poly[1:] + poly[:1]))) / 2
base = [(F(0), F(0)), (F(12), F(0)), (F(12), F(9)), (F(0), F(9))]

# Q2: plane through I (AI = 4) parallel to the face ADHE (x = 0)
I = V(4, 0, 0); J = V(4, 9, 0); K = V(4, 9, 8); L = V(4, 0, 8)
check(d2(A, I) == 16 and d2(D, J) == 16 and d2(H, K) == 16 and d2(E, L) == 16, "AI = DJ = HK = EL = 4")
sec = section(box_edges, V(1, 0, 0), 4)
check(sec == {I, J, K, L}, "section by x = 4 is I J K L")
check(is_rectangle(I, J, K, L), "IJKL rectangle")
check(d2(I, J) == d2(A, D) == 81 and d2(J, K) == d2(D, H) == 64, "IJKL isometric to ADHE (9 x 8)")
check(area_rect(I, J, K, L) == 72 ** 2, "area 72")
check(area2d(clip(base, 1, 0, 4)) * 8 == 288 and area2d(clip(base, -1, 0, -4)) * 8 == 576, "pieces 288 and 576")

# Q3: plane (ACG) contains the edges [CG] and [AE]
n, d = plane_through(A, C, G)
check(dot(n, E) == d, "E in the plane (ACG)")
sec = section(box_edges, n, d)
check(sec == {A, C, G, E}, "section is ACGE")
check(is_rectangle(A, C, G, E), "ACGE rectangle")
check(d2(A, C) == 225 and d2(C, G) == 64 and area_rect(A, C, G, E) == 120 ** 2, "15 x 8, area 120")
check(d2(A, G) == d2(C, E) == 289, "diagonals AG = CE = 17")
# the line (AC) in the base: 9x - 12y = 0
p1, p2 = clip(base, 9, -12, 0), clip(base, -9, 12, 0)
check(area2d(p1) * 8 == 432 and area2d(p2) * 8 == 432, "two prisms of volume 432")
check(sorted(map(len, (p1, p2))) == [3, 3], "the pieces have triangular bases")

# Q4: plane through M (BM = 3) and N (BN = 4), parallel to (BF)
M = V(9, 0, 0); N = V(12, 4, 0); M1 = V(9, 0, 8); N1 = V(12, 4, 8)
check(d2(B, M) == 9 and d2(B, N) == 16, "BM = 3, BN = 4")
n = cross(sub(N, M), sub(Fv, B)); d = dot(n, M)
check(dot(n, sub(Fv, B)) == 0, "plane parallel to (BF)")
check(all(dot(n, add(X, mul(F(t, 4), sub(Fv, B)))) == d for X in (M, N) for t in range(-8, 9)),
      "the parallels to (BF) through M and through N lie in the plane Q")
sec = section(box_edges, n, d)
check(sec == {M, N, N1, M1}, "section is M N N' M'")
check(d2(Fv, M1) == 9 and d2(Fv, N1) == 16, "M' on [EF] with FM' = 3, N' on [FG] with FN' = 4")
check(is_rectangle(M, N, N1, M1), "MNN'M' rectangle")
check(d2(M, N) == 25 and d2(M, M1) == 64 and area_rect(M, N, N1, M1) == 40 ** 2, "5 x 8, area 40")
check(sub(M1, M) == sub(Fv, B) == sub(N1, N), "(MM') and (NN') parallel to (BF), MM' = NN' = 8")
# line (MN): 4x - 3y = 36 (through (9,0) and (12,4)); B is on the side 4x - 3y >= 36
check(4 * 9 - 3 * 0 == 36 and 4 * 12 - 3 * 4 == 36 and 4 * 12 - 3 * 0 > 36, "line (MN)")
pB, pO = clip(base, -4, 3, -36), clip(base, 4, -3, 36)
check(area2d(pB) == 6 and area2d(pB) * 8 == 48 and area2d(pO) * 8 == 816, "pieces 48 and 816")
check(len(pB) == 3, "the piece containing B is a prism with triangular base MBN")

# Q5: pyramid GABCD
check(sub(G, C) == V(0, 0, 8), "C is the foot of the height from G, GC = 8")
vol_tetra = lambda p, q, r, s: abs(det3(sub(q, p), sub(r, p), sub(s, p))) / 6
vol_pyr = vol_tetra(G, A, B, C) + vol_tetra(G, A, C, D)
check(vol_pyr == 288 and F(1, 3) * 108 * 8 == 288 and vol_pyr * 3 == 864, "pyramid volume 288 = pave / 3")
pyr_edges = [(G, A), (G, B), (G, C), (G, D), (A, B), (B, C), (C, D), (D, A)]
Kp = mid(G, C)
check(Kp == V(12, 9, 4), "K midpoint of [GC]")
sec = section(pyr_edges, V(0, 0, 1), 4)
A1, B1, D1 = mid(G, A), mid(G, B), mid(G, D)
check(sec == {A1, B1, Kp, D1}, "section = midpoints of [GA], [GB], [GD] and K")
check(is_rectangle(A1, B1, Kp, D1), "A1B1KD1 rectangle")
check(d2(A1, B1) == 36 and d2(B1, Kp) == F(81, 4), "sides 6 and 4.5")
check(area_rect(A1, B1, Kp, D1) == 27 ** 2 and 27 * 4 == 108, "area 27 = base / 4")
small = vol_tetra(G, A1, B1, Kp) + vol_tetra(G, A1, Kp, D1)
check(small == 36 and small * 8 == vol_pyr and vol_pyr - small == 252, "small pyramid 36, tronc 252")
check(dot(sub(B1, Kp), sub(D1, Kp)) == 0, "right angle in K")
check(sub(B1, A1) == mul(F(1, 2), sub(B, A)) and sub(Kp, D1) == mul(F(1, 2), sub(C, D)), "vec(A1B1) = AB/2, vec(D1C1) = DC/2")
check(sub(B1, A1) == sub(Kp, D1), "vec(A1B1) = vec(D1C1): A1B1C1D1 parallelogram (not crossed)")
check(cross(sub(A1, B1), sub(A, B)) == V(0, 0, 0), "(A1B1) parallel to (AB)")
# cross-section areas at other heights: the section is a rectangle reduced by (8 - z)/8
for z in range(0, 9):
    pts = section(pyr_edges, V(0, 0, 1), z)
    if z == 8:
        check(pts == {G}, "apex"); continue
    xs = sorted({p[0] for p in pts}); ys = sorted({p[1] for p in pts})
    check(len(pts) == 4 and (xs[1] - xs[0]) * (ys[1] - ys[0]) == 108 * F(8 - z, 8) ** 2, "section area at height z")
check(section(box_edges, V(0, 0, 1), 4) == {V(0, 0, 4), V(12, 0, 4), V(12, 9, 4), V(0, 9, 4)}, "pave cut by P: 12 x 9")

# ================= Exercice 2 : cornet et boule de glace =================
# S at the origin, axis = z axis, opening (rim) in the plane z = 12, centre O(0, 0, 12), radius 3.5
h, R = F(12), F(7, 2)
check(h ** 2 + R ** 2 == F(625, 4), "SA^2 = 156.25, SA = 12.5")
SA = F(25, 2)
check(F(1, 3) * R ** 2 * h == 49, "cornet volume 49 pi")
check(f"{49 * math.pi:.1f}" == "153.9", "49 pi ~ 153.9")
angle = 360 * R / SA
check(angle == F(504, 5) and float(angle) == 100.8, "patron angle 100.8 degrees")
check(angle / 360 * 2 * SA == 2 * R, "arc length of the sector = perimeter of the opening")
check(angle / 360 * SA ** 2 == R * SA == F(175, 4), "sector area 43.75 pi")
check(f"{43.75 * math.pi:.1f}" == "137.4", "43.75 pi ~ 137.4")
# rational points of the unit circle -> points of the rim
circ = [(F(1 - t * t, 1 + t * t), F(2 * t, 1 + t * t)) for t in (F(k, 5) for k in range(-15, 16))]
rim = [(R * c, R * s, h) for c, s in circ]
Sv = V(0, 0, 0)
for p in rim:
    check(d2(Sv, p) == SA ** 2, "every generatrix has length 12.5")
    q = mul(F(6, 12), p)          # point of the generatrix [S p] at height 6
    check(q[2] == 6 and q[0] ** 2 + q[1] ** 2 == F(7, 4) ** 2, "section at height 6: circle of radius 1.75")
check(R * 6 / h == F(7, 4), "Thales: O'A' = 3.5 x 6 / 12")
small_cone = F(1, 3) * F(7, 4) ** 2 * 6
check(small_cone == F(49, 8) and small_cone / 49 == F(1, 8), "liquid volume 49 pi / 8 = cornet / 8")
check(f"{49 / 8 * math.pi:.1f}" == "19.2", "49 pi / 8 ~ 19.2")
# the ice ball: centre I on the axis, radius 3.7, passing through the rim
r = F(37, 10)
IO = F(6, 5)
check(IO ** 2 == r ** 2 - R ** 2 and IO > 0, "IO = 1.2")
Iv = V(0, 0, h + IO)
for p in rim:
    check(d2(Iv, p) == r ** 2, "the rim circle lies on the sphere")
check(h + IO + r == F(169, 10), "top of the ball at 16.9 cm above S")
check(h - (h + IO - r) == F(5, 2) and r - IO == F(5, 2), "the ball goes 2.5 cm into the cornet")
check(r - R == F(1, 5), "great circle radius 3.7 exceeds the rim by 0.2")
# below the rim, the ball stays strictly inside the cornet (it touches only the rim)
zmin = h + IO - r
steps = 2000
for k in range(1, steps):
    z = float(zmin) + (float(h) - float(zmin)) * k / steps
    rb = math.sqrt(max(0.0, float(r) ** 2 - (float(h + IO) - z) ** 2))
    rc = float(R) * z / float(h)
    check(rb < rc, "ball inside the cornet below the rim")
vb = F(4, 3) * r ** 3
check(vb == F(50653, 750), "ball volume (4/3) pi 3.7^3 = 50653/750 pi")
check(f"{float(vb) * math.pi:.1f}" == "212.2", "ball ~ 212.2 cm3")
check(vb > 49, "melted ice overflows")
check(f"{float(vb - 49) * math.pi:.1f}" == "58.2", "overflow ~ 58.2 cm3")

# numbers written in the corrige of exercise 2
check(F(7, 2) ** 2 == F(1225, 100) and F(37, 10) ** 2 == F(1369, 100) and IO ** 2 == F(144, 100), "12.25, 13.69, 1.44")
check(F(7, 4) ** 2 == F(30625, 10000) and F(1, 3) * F(30625, 10000) * 6 == F(6125, 1000), "1.75^2 = 3.0625, volume 6.125 pi")
check(F(504, 5) / 360 == F(28, 100) and F(28, 100) * F(15625, 100) == F(4375, 100), "0.28 x 156.25 = 43.75")
check(angle / 360 * 2 * SA == 7, "arc length 7 pi")
check(F(37, 10) ** 3 == F(50653, 1000) and f"{float(vb):.2f}" == "67.54", "3.7^3 = 50.653, (4/3) x 50.653 ~ 67.54")
check(f"{float(vb) * math.pi:.2f}" == "212.17" and f"{49 * math.pi:.2f}" == "153.94", "212.17 and 153.94")
check(h + IO - r == F(19, 2), "lowest point 9.5 cm above S")
check(vb == F(202612, 1000) / 3 and 4 * F(50653, 1000) == F(202612, 1000), "exact ball volume 202.612 pi / 3")
check(F(6, 12) * F(7, 2) == F(7, 4), "O'A' = 3.5 / 2")

print(f"all {ok} checks passed")
