"""Checks every claim in exercises T1 ch7 (2eme Sciences, translations).

Each figure of the exercises is placed in a coordinate system inside this script;
exact arithmetic with fractions and with numbers a + b*sqrt(3)."""
from fractions import Fraction as F
import random

random.seed(7)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


def make_field(d):
    """Exact numbers a + b*sqrt(d), a and b rational, d not a perfect square."""
    class Q:
        __slots__ = ("a", "b")
        def __init__(self, a, b=0):
            self.a, self.b = F(a), F(b)
        @staticmethod
        def c(x):
            return x if isinstance(x, Q) else Q(x)
        def __add__(s, o): o = Q.c(o); return Q(s.a + o.a, s.b + o.b)
        __radd__ = __add__
        def __sub__(s, o): o = Q.c(o); return Q(s.a - o.a, s.b - o.b)
        def __rsub__(s, o): return Q.c(o) - s
        def __neg__(s): return Q(-s.a, -s.b)
        def __mul__(s, o): o = Q.c(o); return Q(s.a * o.a + d * s.b * o.b, s.a * o.b + s.b * o.a)
        __rmul__ = __mul__
        def __truediv__(s, o):
            o = Q.c(o); n = o.a * o.a - d * o.b * o.b
            p = s * Q(o.a, -o.b)
            return Q(p.a / n, p.b / n)
        def __eq__(s, o): o = Q.c(o); return s.a == o.a and s.b == o.b
        def __hash__(s): return hash((s.a, s.b))
        def sign(s):
            a, b = s.a, s.b
            if b == 0: return (a > 0) - (a < 0)
            if a == 0: return (b > 0) - (b < 0)
            if (a > 0) == (b > 0): return 1 if a > 0 else -1
            return (1 if a > 0 else -1) if a * a > d * b * b else (1 if b > 0 else -1)
        def __lt__(s, o): return (s - o).sign() < 0
        def __gt__(s, o): return (s - o).sign() > 0
    return Q

Q3 = make_field(3)

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return dot(u, u)
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def sym(I, M): return (2 * I[0] - M[0], 2 * I[1] - M[1])  # symetrique de M par rapport a I
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def rnd(): return F(random.randint(-30, 30), random.randint(1, 7))
def rpt(): return (rnd(), rnd())
def area(*pts):
    s = 0
    for i in range(len(pts)):
        s = s + det(pts[i], pts[(i + 1) % len(pts)])
    return s / 2

# ---------- Ex1 : parallelogramme ABCD de centre O, t = translation de vecteur vec(AO)
done = 0
while done < 150:
    A, B, D = rpt(), rpt(), rpt()
    if det(vec(A, B), vec(A, D)) == 0:
        continue
    done += 1
    C = add(B, vec(A, D))                       # ABCD parallelogramme
    O = mid(A, C)
    check(O == mid(B, D), "les diagonales ont le meme milieu O")
    I, J, K = mid(B, C), mid(A, D), mid(A, B)
    u = vec(A, O)
    t = lambda M: add(M, u)
    # 1.
    check(t(A) == O and t(O) == C, "1a: t(A) = O, t(O) = C")
    Bp, Dp = t(B), t(D)
    check(vec(O, B) == vec(C, Bp) and vec(O, D) == vec(C, Dp), "1b: OBB'C et ODD'C parallelogrammes")
    check(vec(A, B) == vec(O, Bp), "1b: ABB'O parallelogramme")
    check(vec(B, Bp) == vec(D, Dp) and det(vec(B, Bp), vec(B, D)) != 0, "1b: BB'D'D parallelogramme non aplati")
    check(mid(Bp, Dp) == C, "1c: C milieu de [B'D']")
    check(vec(C, Bp) == mul(-1, vec(C, Dp)), "1c: controle vec(CB') = -vec(CD')")
    # 2.
    check(vec(K, I) == mul(F(1, 2), vec(A, C)) and t(K) == I, "2a: vec(KI) = (1/2)vec(AC) = vec(AO), t(K) = I")
    check(mid(I, J) == O and sym(O, J) == I, "2b: O milieu de [IJ]")
    check(det(vec(I, J), vec(A, B)) == 0, "2b: (IJ) // (AB)")
    check(vec(A, J) == vec(B, I) and vec(J, I) == vec(A, B), "2b: ABIJ parallelogramme, vec(JI) = vec(AB)")
    check(det(vec(I, J), vec(B, C)) != 0, "2c: (IJ) et (BC) secantes")
    for _ in range(4):
        s = rnd()
        P = add(A, mul(s, vec(A, B)))
        check(aligned(I, J, t(P)), "2b: image d'un point de (AB) sur (IJ)")
        P2 = add(I, mul(s, vec(I, J)))
        check(aligned(A, B, add(P2, mul(-1, u))), "2b: antecedent d'un point de (IJ) sur (AB)")
    # 2c: point P = A + s vec(AB) of (AB) with t(P) on (BC): phi(s) affine, solve phi(s) = 0
    phi = lambda s: det(vec(B, t(add(A, mul(s, vec(A, B))))), vec(B, C))
    slope = phi(F(1)) - phi(F(0))
    check(slope != 0, "2c: equation du premier degre en s")
    s0 = -phi(F(0)) / slope
    check(s0 == F(1, 2) and add(A, mul(s0, vec(A, B))) == K, "2c: le point cherche est K, milieu de [AB]")
    check(t(K) == I, "2c: son image est I")
    # 3. et 4.
    for _ in range(4):
        M = rpt()
        M1 = sym(A, M)
        Mp = sym(O, M1)
        check(vec(M, Mp) == mul(2, u) and vec(M, Mp) == vec(A, C), "3a: vec(MM') = 2vec(AO) = vec(AC)")
        check(t(t(M)) == Mp, "3b: g(M) = t(t(M))")
        fM = add(M, add(add(vec(M, B), vec(M, D)), mul(-2, vec(M, A))))
        check(add(add(vec(M, B), vec(M, D)), mul(-2, vec(M, A))) == vec(A, C), "4: MB + MD - 2MA = AC")
        check(fM == Mp, "4: f = g")
    check(sym(O, sym(A, A)) == C, "3c: g(A) = C")
    gO = sym(O, sym(A, O))
    check(gO == sym(C, O) and gO == t(C), "3c: g(O) est le symetrique de O par rapport a C (= t(C))")

# ---------- Ex2 : AB = 6, O milieu, cercle C de diametre [AB], t = translation de vecteur vec(AO)
A, B, O = (F(-3), F(0)), (F(3), F(0)), (F(0), F(0))
u = vec(A, O)
t = lambda M: add(M, u)
tinv = lambda M: add(M, mul(-1, u))
check(n2(vec(A, B)) == 36 and mid(A, B) == O, "AB = 6, O milieu")
check(t(A) == O and t(O) == B, "1a: t(A) = O, t(O) = B")
B1 = t(B)
check(mid(O, B1) == B and aligned(A, B, B1) and n2(vec(B, B1)) == 9 and n2(vec(A, B1)) == 81,
      "1a: B milieu de [OB1], BB1 = 3, AB1 = 9")
def on_circle(P, c, r2): return n2(vec(c, P)) == r2
def circ_pt(c, r, s):  # rational point of the circle of centre c and radius r
    return (c[0] + r * (1 - s * s) / (1 + s * s), c[1] + r * 2 * s / (1 + s * s))
for _ in range(200):
    s = rnd()
    if s == 0:
        continue
    M = circ_pt(O, 3, s)
    check(on_circle(M, O, 9) and M != A and M != B, "M sur C, distinct de A et B")
    N = t(M)
    check(vec(A, O) == vec(M, N) and det(vec(A, O), vec(A, M)) != 0, "1b: AONM parallelogramme non aplati")
    check(vec(A, M) == vec(O, N), "1b: vec(AM) = vec(ON)")
    check(on_circle(N, B, 9) and N != O and N != B1, "2: N sur le cercle de centre B de rayon 3, N != O, B1")
    check(vec(O, B) == vec(M, N) and n2(vec(O, M)) == 9 == n2(vec(O, B)), "3a: OBNM losange")
    check(n2(vec(B, N)) == 9 and n2(vec(M, N)) == 9, "3a: les quatre cotes valent 3")
    check(dot(vec(O, N), vec(M, B)) == 0, "3b: (ON) perpendiculaire a (MB)")
    check(dot(vec(M, A), vec(M, B)) == 0 and det(vec(O, N), vec(A, M)) == 0, "3c: AMB droit, (ON) // (AM)")
for _ in range(200):  # converse: every point of the circle (B, 3) except O and B1 is reached
    s = rnd()
    if s == 0:
        continue
    N = circ_pt(B, 3, s)
    if N == O or N == B1:
        continue
    M = tinv(N)
    check(on_circle(M, O, 9) and M != A and M != B, "2: tout point de Gamma a un antecedent sur C prive de A, B")
check(circ_pt(B, 3, F(0)) == B1, "B1 est sur le cercle (B, 3)")
check(on_circle(O, B, 9), "O est sur le cercle (B, 3)")
# 4. C : x^2 + y^2 = 9 ; C' : (x - 3)^2 + y^2 = 9. Subtracting: -6x + 9 = 0
x0 = F(9, 6)
check(x0 == F(3, 2) and ((x0 - 3) ** 2 - x0 ** 2) == 0, "4a: x = 3/2 (mediatrice de [OB])")
y2 = 9 - x0 ** 2
check(y2 == F(27, 4) and Q3(0, F(3, 2)) * Q3(0, F(3, 2)) == y2, "4a: y^2 = 27/4, y = 3sqrt3/2")
P = (Q3(F(3, 2)), Q3(0, F(3, 2)))
Qp = (Q3(F(3, 2)), Q3(0, F(-3, 2)))
O3, A3, B3 = tuple(map(Q3, O)), tuple(map(Q3, A)), tuple(map(Q3, B))
u3 = tuple(map(Q3, u))
MOB = mid(O3, B3)
check(MOB == (Q3(F(3, 2)), Q3(0)) and n2(vec(O3, MOB)) == F(9, 4) and n2(vec(O3, MOB)) < 9,
      "4a: la mediatrice de [OB] passe par le milieu de [OB], a la distance 3/2 < 3 de O")
for X in (P, Qp):
    check(dot(vec(MOB, X), vec(O3, B3)) == 0, "4a: P, Q sur la mediatrice de [OB]")
    check(n2(vec(O3, X)) == 9 and n2(vec(B3, X)) == 9, "4a: P, Q sur C et sur Gamma'")
    check(not (X[0] == 0 and X[1] == 0) and not (X[0] == 6 and X[1] == 0), "4a: P, Q distincts de O et B1")
    check(n2(vec(O3, B3)) == 9, "4b: OBP equilateral (OB = OP = BP = 3)")
M1 = add(P, mul(-1, u3))
M2 = add(Qp, mul(-1, u3))
check(M1 == (Q3(F(-3, 2)), Q3(0, F(3, 2))), "4c: M1(-3/2, 3sqrt3/2)")
check(n2(vec(O3, M1)) == 9 and add(M1, u3) == P, "4c: M1 sur C et t(M1) = P")
check(not (M1 == A3) and not (M1 == B3), "4c: M1 distinct de A et B")
check(n2(vec(M1, A3)) == n2(vec(M1, O3)), "4c: M1 sur la mediatrice de [AO]")
check(n2(vec(O3, M1)) == n2(vec(O3, P)) == n2(vec(M1, P)) == 9, "4c: OM1P equilateral")
check(vec(A3, O3) == vec(M1, P) and n2(vec(A3, O3)) == n2(vec(O3, P)) == 9, "4c: AOPM1 losange de cote 3")
check(n2(vec(A3, M1)) == 9, "4c: AOM1 equilateral aussi")
check(M2 == (M1[0], -M1[1]) and n2(vec(O3, M2)) == 9, "4c: M2 symetrique de M1 par rapport a (AB)")
ar = area(A3, O3, P, M1)
check(ar == Q3(0, F(9, 2)), "4d: aire du losange AOPM1 = 9sqrt3/2")
check(n2(vec(A3, O3)) == 9 and M1[1] == Q3(0, F(3, 2)) and Q3(3) * M1[1] == ar,
      "4d: base AO = 3, hauteur (distance de M1 a (AB)) = 3sqrt3/2, aire = base x hauteur")
check(n2(vec(mid(O3, M1), A3)) == F(27, 4), "4d: hauteur du triangle equilateral AOM1 = sqrt(27/4)")
check(round(float(ar.a) + float(ar.b) * 3 ** 0.5, 2) == 7.79, "4d: ~ 7.79")

print(f"all {ok} checks passed")
