"""Checks every value and claim used in CH07_QUART_DE_TOUR.md (1ère année).

Convention: usual drawing of an orthonormal frame (x to the right, y upwards).
The direct sense (counterclockwise) is the sense of a positive cross product.
Each claimed image is tested against the textbook definition
(OM' = OM, angle MOM' = 90 degrees, sense), not only against a formula.
"""
from fractions import Fraction as F
import random

random.seed(7)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def P(x, y): return (F(x), F(y))
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def d2(a, b): u = sub(b, a); return u[0] ** 2 + u[1] ** 2
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def cross(u, v): return u[0] * v[1] - u[1] * v[0]
def mid(a, b): return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

def is_image(c, m, mp, sense):
    """mp is the image of m by the quarter turn of centre c; sense +1 direct, -1 indirect."""
    u, v = sub(m, c), sub(mp, c)
    if m == c:
        return mp == c
    return d2(c, m) == d2(c, mp) and dot(u, v) == 0 and (cross(u, v) > 0) == (sense > 0)

def rot(c, m, sense):
    u = sub(m, c)
    v = (-u[1], u[0]) if sense > 0 else (u[1], -u[0])
    return add(c, v)

# the formula agrees with the definition, and the definition gives exactly one point
for _ in range(300):
    c = P(random.randint(-9, 9), random.randint(-9, 9))
    m = P(random.randint(-9, 9), random.randint(-9, 9))
    if m == c: continue
    for s in (1, -1):
        check(is_image(c, m, rot(c, m, s), s), "rot formula fits the definition")
        check(not is_image(c, m, rot(c, m, -s), s), "the other sense is rejected")
    check(mid(rot(c, m, 1), rot(c, m, -1)) == c, "direct and indirect images are symmetric about c")
    check(rot(c, rot(c, m, 1), 1) == add(c, sub(c, m)), "two direct quarter turns = demi-tour")

O = P(0, 0); I = P(1, 0); J = P(0, 1)
check(is_image(O, I, J, 1), "J is the image of I by the direct quarter turn of centre O")

# ================= Exercice 1 =================
A = P(3, 1)
A1 = P(-1, 3)      # A' (direct)
A2 = P(1, -3)      # A'' (indirect)
check(is_image(O, A, A1, 1), "A' = R(A) direct")
check(is_image(O, A, A2, -1), "A'' = image of A by the indirect quarter turn")
# grid method of the corrige: read the path centre -> M as horizontal and vertical steps,
# turn each step with the rules written in the corrige, add them up.
GRID_RULES = {1: {"right": "up", "up": "left", "left": "down", "down": "right"},
              -1: {"right": "down", "up": "right", "left": "up", "down": "left"}}
STEP = {"right": P(1, 0), "up": P(0, 1), "left": P(-1, 0), "down": P(0, -1)}
def grid_path(c, m):
    u = sub(m, c)
    path = []
    if u[0]: path.append(("right" if u[0] > 0 else "left", abs(u[0])))
    if u[1]: path.append(("up" if u[1] > 0 else "down", abs(u[1])))
    return path
def grid_image(c, m, sense):
    end = c
    for direction, n in grid_path(c, m):
        v = STEP[GRID_RULES[sense][direction]]
        end = add(end, (n * v[0], n * v[1]))
    return end
# the rules agree with the definition of the quarter turn
for s_ in (1, -1):
    for direction, v in STEP.items():
        check(is_image(O, v, STEP[GRID_RULES[s_][direction]], s_), "grid rule fits the definition")
for _ in range(200):
    c = P(random.randint(-9, 9), random.randint(-9, 9)); m = P(random.randint(-9, 9), random.randint(-9, 9))
    if m != c:
        check(all(is_image(c, m, grid_image(c, m, s_), s_) for s_ in (1, -1)), "grid method = definition")
check(grid_path(O, A) == [("right", 3), ("up", 1)], "O -> A : 3 right, 1 up (as read in the corrige)")
check(grid_image(O, A, 1) == A1 and grid_image(O, A, -1) == A2, "grid method gives A'(-1, 3) and A''(1, -3)")
check(grid_path(O, A1) == [("left", 1), ("up", 3)], "O -> A' : 3 up, 1 left")
check(grid_path(O, A2) == [("right", 1), ("down", 3)], "O -> A'' : 3 down, 1 right")
check(d2(O, A) == 10 and d2(O, A1) == 10 and d2(O, A2) == 10, "OA = OA' = OA'' = sqrt(10)")
check(d2(A, A1) == 20 and d2(A, A2) == 20, "AA'^2 = AA''^2 = 20")
check(d2(A, A1) == d2(O, A) + d2(O, A1), "Pythagore reciproque in AOA'")
check(d2(A, A2) == d2(O, A) + d2(O, A2), "Pythagore reciproque in AOA''")
check(A1[0] < 0 < A1[1] and A2[0] > 0 > A2[1], "quadrants of A' and A''")
check(mid(A1, A2) == O, "O is the midpoint of [A'A'']")

B = P(6, 1); B1 = P(-1, 6)
check(is_image(O, B, B1, 1), "B' = R(B) = (-1, 6)")
check(d2(A, B) == 9 and d2(A1, B1) == 9, "AB = A'B' = 3")
check(A[1] == B[1] and A1[0] == B1[0], "(AB) horizontal, (A'B') vertical")
check(dot(sub(B, A), sub(B1, A1)) == 0, "(AB) perpendicular to (A'B')")
K = P(-1, 1)
check(K[1] == A[1] and K[0] == A1[0], "K(-1, 1) on (AB) and on (A'B')")

# circles: (C) centre A through O, (C') centre A' radius sqrt(10)
check(d2(A, O) == 10 and d2(A1, O) == 10, "O on (C) and on (C')")
Pp = P(2, 4)
check(d2(A, Pp) == 10 and d2(A1, Pp) == 10, "P(2,4) on both circles")
# the two circles meet exactly in O and P: radical line y = 2x, then 5x^2 - 10x = 0
for x in range(-20, 21):
    for y in range(-20, 21):
        q = P(x, y)
        both = d2(A, q) == 10 and d2(A1, q) == 10
        check(both == (q in (O, Pp)), "integer points common to both circles")
# exact solving on the radical line y = 2x: g(x) = a x^2 + b x + c, coefficients read from g(-1), g(0), g(1)
g = lambda x: (x - 3) ** 2 + (2 * x - 1) ** 2 - 10
c0 = g(F(0)); b0 = (g(F(1)) - g(F(-1))) / 2; a0 = (g(F(1)) + g(F(-1))) / 2 - c0
check(all(g(x) == a0 * x * x + b0 * x + c0 for x in map(F, range(-9, 10))), "g is quadratic")
check(c0 == 0 and a0 != 0, "x = 0 is a root")
roots = sorted({F(0), -b0 / a0})
check(all(g(x) == 0 for x in roots) and [(x, 2 * x) for x in roots] == [O, Pp], "the circles meet exactly in O and P")
check(all(((x - 3) ** 2 + (y - 1) ** 2 - 10) - ((x + 1) ** 2 + (y - 3) ** 2 - 10) == -8 * x + 4 * y
          for x in map(F, range(-5, 6)) for y in map(F, range(-5, 6))), "difference of circle equations")
check(mid(O, Pp) == mid(A, A1) == P(1, 2), "[OP] and [AA'] have the same midpoint (1, 2)")
check(dot(sub(A, O), sub(A1, O)) == 0 and d2(O, A) == d2(O, A1), "OAPA' square")
check(cross(sub(A, O), sub(Pp, A)) > 0 and cross(sub(Pp, A), sub(A1, Pp)) > 0, "O, A, P, A' in the direct sense")
# image of the circle (C) by R: centre R(A) = A', same radius (lattice points of (C) checked)
for k in range(-12, 13):
    for l in range(-12, 13):
        m = P(k, l)
        if d2(A, m) == 10:
            check(d2(A1, rot(O, m, 1)) == 10, "R maps points of (C) to points of (C')")
# triangle AOP right isosceles in A; P is the image of O by the indirect quarter turn of centre A
check(d2(A, O) == 10 and d2(A, Pp) == 10 and d2(O, Pp) == 20, "AO = AP, OP^2 = 20")
check(is_image(A, O, Pp, -1), "P = image of O by the indirect quarter turn of centre A")
check(not is_image(A, O, Pp, 1), "not the direct one")
check(grid_path(A, O) == [("left", 3), ("down", 1)] and grid_path(A, Pp) == [("left", 1), ("up", 3)],
      "grid: A->O 3 left 1 down, A->P 1 left 3 up")
check(grid_image(A, O, -1) == Pp and grid_image(A, O, 1) == P(4, -2), "grid method around A")
check(rot(A, O, 1) == P(4, -2) and is_image(A, O, P(4, -2), 1), "direct quarter turn of centre A sends O to (4, -2)")
# grid rules: direct: right->up, up->left ; indirect: right->down, up->right
right, up, left, down = P(1, 0), P(0, 1), P(-1, 0), P(0, -1)
check(rot(O, right, 1) == up and rot(O, up, 1) == left and rot(O, left, 1) == down, "direct grid rules")
check(rot(O, right, -1) == down and rot(O, up, -1) == right and rot(O, left, -1) == up and rot(O, down, -1) == left,
      "indirect grid rules")
check(grid_path(O, B) == [("right", 6), ("up", 1)] and grid_image(O, B, 1) == B1, "O -> B' : 6 up, 1 left")

# ================= Exercice 2 =================
A, B, C, D = P(0, 0), P(6, 0), P(6, 6), P(0, 6)
O = P(3, 3)
area2 = sum(cross(p, q) for p, q in zip((A, B, C, D), (B, C, D, A)))
check(area2 > 0, "ABCD named in the direct sense")
check(mid(A, C) == O == mid(B, D), "O centre of the square")
for X, Y in ((A, B), (B, C), (C, D), (D, A)):
    check(is_image(O, X, Y, 1), "R maps the vertices A->B->C->D->A")
E, Fp, G, Hh = P(2, 0), P(6, 2), P(4, 6), P(0, 4)
check(d2(A, E) == 4 and d2(B, Fp) == 4 and d2(C, G) == 4 and d2(D, Hh) == 4, "AE = BF = CG = DH = 2")
def on_seg(p, a, b):
    return cross(sub(b, a), sub(p, a)) == 0 and dot(sub(p, a), sub(p, b)) <= 0
check(on_seg(E, A, B) and on_seg(Fp, B, C) and on_seg(G, C, D) and on_seg(Hh, D, A), "points on the sides")
for X, Y in ((E, Fp), (Fp, G), (G, Hh), (Hh, E)):
    check(is_image(O, X, Y, 1), "R maps E->F->G->H->E")
# the point of [BC] at distance 2 from B is unique: F
cands = [P(6, F(k, 4)) for k in range(0, 25) if d2(B, P(6, F(k, 4))) == 4]
check(cands == [Fp], "unique point of [BC] with BF' = 2")
check(mid(E, G) == O and mid(Fp, Hh) == O, "central symmetry: O midpoint of [EG] and [FH]")
check(d2(O, E) == 10 and d2(O, Fp) == 10, "OE = OF = sqrt(10)")
check(all(d2(X, Y) == 20 for X, Y in ((E, Fp), (Fp, G), (G, Hh), (Hh, E))), "EF = FG = GH = HE = sqrt(20)")
check(d2(E, G) == 40 == d2(Fp, Hh) and dot(sub(G, E), sub(Hh, Fp)) == 0, "diagonals equal and perpendicular")
check(d2(E, B) == 16 and d2(B, Fp) == 4 and d2(E, Fp) == d2(E, B) + d2(B, Fp), "Pythagore in EBF")
def shoelace(pts):
    return abs(sum(cross(p, q) for p, q in zip(pts, pts[1:] + pts[:1]))) / 2
check(shoelace([E, Fp, G, Hh]) == 20, "area EFGH = 20")
corners = [shoelace([E, B, Fp]), shoelace([Fp, C, G]), shoelace([G, D, Hh]), shoelace([Hh, A, E])]
check(corners == [4, 4, 4, 4], "four corner triangles of area 4")
check(shoelace([A, B, C, D]) - sum(corners) == shoelace([E, Fp, G, Hh]), "area by the 4 corner triangles")
check(shoelace([E, Fp, G, Hh]) / shoelace([A, B, C, D]) == F(5, 9), "ratio 5/9")
check(2 * d2(O, E) == d2(E, Fp), "EOF right isosceles: EF^2 = 2 OE^2")

# lines (AF), (BG), (CH), (DE)
check(d2(A, Fp) == 40 and d2(B, G) == 40, "AF = BG = 2 sqrt(10)")
check(dot(sub(Fp, A), sub(G, B)) == 0, "(AF) perpendicular to (BG)")
def inter(p1, p2, p3, p4):
    d1, d2_ = sub(p2, p1), sub(p4, p3)
    den = cross(d1, d2_)
    t = cross(sub(p3, p1), d2_) / den
    return add(p1, (t * d1[0], t * d1[1]))
Pq = inter(A, Fp, B, G)
check(Pq == P(F(27, 5), F(9, 5)), "P = (5.4, 1.8)")
check(d2(B, Pq) == F(36, 10), "BP^2 = 3.6, BP = 6/sqrt(10) = 3 sqrt(10)/5")
check(F(36, 10) == (F(3, 5)) ** 2 * 10, "6/sqrt(10) = 3 sqrt(10)/5")
check(d2(A, Pq) == F(324, 10) and d2(Pq, Fp) == F(4, 10), "AP = 18/sqrt(10), PF = 2/sqrt(10)")
check(F(324, 10) == (F(9, 5)) ** 2 * 10 and F(4, 10) == (F(1, 5)) ** 2 * 10, "AP = 9 sqrt(10)/5, PF = sqrt(10)/5")
# metric relations in ABF right in B, altitude [BP]
check((d2(B, A) * d2(B, Fp)) == d2(B, Pq) * d2(A, Fp), "BA x BF = BP x AF (squared)")
check(d2(B, A) ** 2 == d2(A, Pq) * d2(A, Fp), "BA^2 = AP x AF (squared)")
check(d2(B, Fp) ** 2 == d2(Fp, Pq) * d2(A, Fp), "BF^2 = FP x FA (squared)")
check(d2(mid(A, B), Pq) == 9, "P on the circle of diameter [AB]")
check(dot(sub(A, Pq), sub(B, Pq)) == 0, "angle APB = 90")
Q = inter(B, G, C, Hh); S = inter(C, Hh, D, E); T = inter(D, E, A, Fp)
check(Q == P(F(21, 5), F(27, 5)) and S == P(F(3, 5), F(21, 5)) and T == P(F(9, 5), F(3, 5)), "Q, S, T coordinates")
check(is_image(O, Pq, Q, 1) and is_image(O, Q, S, 1) and is_image(O, S, T, 1) and is_image(O, T, Pq, 1),
      "R maps P->Q->S->T->P")
check(is_image(O, B, C, 1) and is_image(O, G, Hh, 1), "R maps (BG) onto (CH)")
check(dot(sub(G, B), sub(Hh, C)) == 0, "(BG) perpendicular to (CH): single intersection point")
check(mid(Pq, S) == O and mid(Q, T) == O, "O midpoint of [PS] and [QT]")
# order B, P, Q, G on (BG)
def param(p, a, b):
    u = sub(b, a); return dot(sub(p, a), u) / dot(u, u)
check(param(Pq, B, G) == F(3, 10) and param(Q, B, G) == F(9, 10), "B, P, Q, G in this order")
check(d2(B, Q) == F(324, 10), "BQ = 18/sqrt(10)")
check(d2(B, C) ** 2 == d2(B, Q) * d2(B, G), "BC^2 = BQ x BG (squared)")
check(dot(sub(B, C), sub(G, C)) == 0, "BCG right in C")
check(dot(sub(Hh, C), sub(G, B)) == 0 and param(Q, B, G) > 0, "Q foot of the altitude from C")
check(d2(Pq, Q) == F(144, 10), "PQ^2 = 14.4, PQ = 12/sqrt(10)")
check(F(144, 10) == (F(6, 5)) ** 2 * 10, "12/sqrt(10) = 6 sqrt(10)/5")
check(shoelace([Pq, Q, S, T]) == F(72, 5), "area PQST = 14.4")
check(all(d2(X, Y) == F(144, 10) for X, Y in ((Pq, Q), (Q, S), (S, T), (T, Pq))), "PQST four equal sides")
check(F(72, 5) / 36 == F(2, 5), "ratio 2/5")
# rounded values printed in the corrige (to 0.01)
import math
for exact2, shown, name in ((40, "6.32", "AF"), (F(36, 10), "1.90", "BP"), (F(324, 10), "5.69", "AP"),
                            (F(4, 10), "0.63", "PF"), (F(144, 10), "3.79", "PQ")):
    check(f"{math.sqrt(exact2):.2f}" == shown, "rounded " + name)
check(F(18, 10) * 2 == F(36, 10) and math.isclose(18 / math.sqrt(10) - 6 / math.sqrt(10), 12 / math.sqrt(10)), "BQ - BP")

print(f"all {ok} checks passed")
