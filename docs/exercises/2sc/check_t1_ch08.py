"""Checks every claim in exercises T1 ch8 (2eme Sciences, homotheties).

Each figure of the exercises is placed in a coordinate system inside this script;
exact arithmetic with fractions and with numbers a + b*sqrt(7) (ex1) or a + b*sqrt(3) (ex2)."""
from fractions import Fraction as F
import math, random

random.seed(8)
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
        def __rtruediv__(s, o): return Q.c(o) / s
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
        def __float__(s): return float(s.a) + float(s.b) * d ** 0.5
    return Q

Q3, Q7 = make_field(3), make_field(7)

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return dot(u, u)
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def sym(I, M): return (2 * I[0] - M[0], 2 * I[1] - M[1])
def hom(I, k): return lambda M: add(I, mul(k, vec(I, M)))
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def rnd(): return F(random.randint(-30, 30), random.randint(1, 7))
def rpt(): return (rnd(), rnd())
def area(*pts):
    s = 0
    for i in range(len(pts)):
        s = s + det(pts[i], pts[(i + 1) % len(pts)])
    return s / 2
def inter(P1, u1, P2, u2):
    """intersection of the lines (P1, u1) and (P2, u2) (Cramer)."""
    dd = det(u1, u2)
    lam = det(vec(P1, P2), u2) / dd
    return add(P1, mul(lam, u1))
def circumcentre(A, B, C):
    # 2 (B - A).X = |B|^2 - |A|^2 ; 2 (C - A).X = |C|^2 - |A|^2
    a1, b1 = 2 * (B[0] - A[0]), 2 * (B[1] - A[1]); c1 = n2(B) - n2(A)
    a2, b2 = 2 * (C[0] - A[0]), 2 * (C[1] - A[1]); c2 = n2(C) - n2(A)
    dd = a1 * b2 - a2 * b1
    return ((c1 * b2 - c2 * b1) / dd, (a1 * c2 - a2 * c1) / dd)


def ex1(A, B, C, generic=True):
    E = add(A, mul(F(-1, 2), vec(A, B)))
    Fp = add(A, mul(F(-1, 2), vec(A, C)))
    h = hom(A, F(-1, 2))
    check(h(B) == E and h(C) == Fp, "1a: E = h(B), F = h(C), h = h(A, -1/2)")
    check(aligned(A, B, E) and dot(vec(A, E), vec(A, B)) < 0, "1a: E sur la demi-droite opposee a [AB)")
    check(4 * n2(vec(A, E)) == n2(vec(A, B)) and 4 * n2(vec(A, Fp)) == n2(vec(A, C)), "1a: AE = AB/2, AF = AC/2")
    check(vec(E, Fp) == mul(F(-1, 2), vec(B, C)), "1b: vec(EF) = -(1/2) vec(BC)")
    check(det(vec(E, Fp), vec(B, C)) == 0 and 4 * n2(vec(E, Fp)) == n2(vec(B, C)), "1b: (EF) // (BC), EF = BC/2")
    check(area(A, E, Fp) * 4 == area(A, B, C), "1c: aire(AEF) = aire(ABC)/4")
    # 2. f(M) = barycentre de (A, 3) et (M, -2)
    f = hom(A, F(-2))
    for _ in range(3):
        M = rpt()
        Mp = f(M)
        bary = add(mul(3, vec(Mp, A)), mul(-2, vec(Mp, M)))
        check(bary == (0, 0), "2a: 3 vec(M'A) - 2 vec(M'M) = 0 pour M' = h(A,-2)(M)")
    check(f(A) == A, "2a: f(A) = A")
    check(f(E) == B and f(Fp) == C, "2b: f(E) = B, f(F) = C")
    # 3. g homothetie de rapport 1/2 qui envoie B sur F
    Om = sym(Fp, B)
    g = hom(Om, F(1, 2))
    check(g(B) == Fp, "3a: Omega = symetrique de B par rapport a F convient")
    check(mul(2, vec(Om, Fp)) == vec(Om, B), "3a: vec(Omega F) = (1/2) vec(Omega B)")
    check(add(mul(2, vec(Om, Fp)), mul(-1, vec(Om, B))) == (0, 0), "3a: Omega barycentre de (F,2), (B,-1)")
    check(mid(Om, B) == Fp, "3a: F milieu de [Omega B]")
    check(vec(Fp, E) == mul(F(1, 2), vec(B, C)), "3b: vec(FE) = (1/2) vec(BC)")
    check(g(C) == E, "3b: g(C) = E")
    X = inter(B, vec(B, Fp), C, vec(C, E))
    check(X == Om, "3b: (BF) et (CE) secantes en Omega")
    check(not aligned(B, C, E), "3b: (BF) et (CE) distinctes")
    Ap = mid(B, C)
    App = mid(E, Fp)
    check(g(Ap) == App and h(Ap) == App, "3c: g(A') = A'' et h(A') = A''")
    check(not (Ap == App) and aligned(Om, Ap, App) and aligned(A, Ap, App), "3c: Omega, A, A', A'' alignes")
    check(aligned(A, Ap, Om), "3c: Omega sur la mediane (AA')")
    check(vec(A, Om) == mul(-2, vec(A, Ap)), "3d: vec(A Omega) = -2 vec(AA')")
    check(f(Ap) == Om, "3d: Omega = f(A')")
    check(sym(E, C) == Om, "3: Omega est aussi le symetrique de C par rapport a E")
    # 4. cercles circonscrits
    O = circumcentre(A, B, C)
    R2 = n2(vec(O, A))
    check(n2(vec(O, B)) == R2 and n2(vec(O, C)) == R2, "4: O centre du cercle circonscrit")
    Op = h(O)
    check(n2(vec(Op, A)) * 4 == R2 and n2(vec(Op, E)) * 4 == R2 and n2(vec(Op, Fp)) * 4 == R2,
          "4a: h(O) equidistant de A, E, F a la distance R/2")
    check(circumcentre(A, E, Fp) == Op, "4a: h(O) est le centre du cercle circonscrit a AEF")
    check(aligned(O, A, Op) and dot(vec(A, O), vec(A, Op)) < 0, "4b: O, A, O' alignes, A entre O et O'")
    check(n2(vec(O, Op)) * 4 == 9 * R2, "4b: OO' = 3R/2 = R + R/2")
    # common points: they satisfy n2(X - O) - R^2 = n2(X - O') - R^2/4, a line L (normal vec(OO'))
    rad = lambda X: n2(vec(O, X)) - R2 - (n2(vec(Op, X)) - R2 / 4)
    nrm = vec(O, Op); w = (-nrm[1], nrm[0])
    check(rad(A) == 0, "4b: A est sur la droite L des points communs possibles")
    for _ in range(3):
        s = rnd()
        X = add(A, mul(s, w))
        check(rad(X) == 0, "4b: L est la perpendiculaire a (OO') en A")
        check(n2(vec(O, X)) - R2 == s * s * n2(w), "4b: sur L, OX^2 = R^2 + s^2 |w|^2")
        check((n2(vec(O, X)) == R2) == (s == 0), "4b: A est le seul point commun aux deux cercles")
    check(dot(vec(A, O), w) == 0 and dot(vec(A, Op), w) == 0, "4b: L perpendiculaire aux rayons [OA] et [O'A] : tangente commune")
    # random points of C go to points of C'
    return E, Fp


done = 0
while done < 150:
    A, B, C = rpt(), rpt(), rpt()
    if det(vec(A, B), vec(A, C)) == 0:
        continue
    done += 1
    ex1(A, B, C)

# the numerical triangle AB = 6, AC = 4, BC = 5 : A(0,0), B(6,0), C(9/4, 5sqrt7/4)
x = F(36 - 25 + 16, 12)
check(x == F(9, 4) and 16 - x * x == F(175, 16), "C : x = 9/4, y^2 = 175/16")
A, B, C = (Q7(0), Q7(0)), (Q7(6), Q7(0)), (Q7(F(9, 4)), Q7(0, F(5, 4)))
check(n2(vec(A, B)) == 36 and n2(vec(A, C)) == 16 and n2(vec(B, C)) == 25, "AB = 6, AC = 4, BC = 5")
E, Fp = ex1(A, B, C)
check(n2(vec(A, E)) == 9 and n2(vec(A, Fp)) == 4 and n2(vec(E, Fp)) == F(25, 4), "AE = 3, AF = 2, EF = 5/2")
def rsqrt(q):  # exact square root of a rational square, given as a + 0*sqrt7
    q = Q7.c(q); assert q.b == 0
    r = F(math.isqrt(q.a.numerator), math.isqrt(q.a.denominator))
    assert r * r == q.a
    return r
pAEF = rsqrt(n2(vec(A, E))) + rsqrt(n2(vec(A, Fp))) + rsqrt(n2(vec(E, Fp)))
pABC = rsqrt(n2(vec(A, B))) + rsqrt(n2(vec(A, C))) + rsqrt(n2(vec(B, C)))
check(pAEF == F(15, 2) and pABC == 15 and 2 * pAEF == pABC, "1c: perimetre de AEF = 7.5, moitie de 15")
O = circumcentre(A, B, C)
R2 = n2(vec(O, A))
check(R2 == F(64, 7), "info: R^2 = 64/7 pour ce triangle")

# ---------- Ex2 : C (O, 3), C' (O', 1), OO' = 4
O, Op, T = (Q3(0), Q3(0)), (Q3(4), Q3(0)), (Q3(3), Q3(0))
check(n2(vec(O, Op)) == (3 + 1) ** 2, "1a: OO' = 4 = R + R' = 3 + 1")
check(n2(vec(O, T)) == 9 and n2(vec(Op, T)) == 1 and aligned(O, Op, T), "1a: T sur [OO'], OT = 3, O'T = 1")
# common points: x^2 + y^2 = 9 and (x-4)^2 + y^2 = 1 -> 8x - 16 = 8 -> x = 3 -> y^2 = 0
xT = F(9 - 1 + 16, 8)
check(xT == 3 and 9 - xT * xT == 0, "1a: T est le seul point commun")
# common tangent at T: the line through T perpendicular to (OO'), at distance 3 from O and 1 from O'
w = (Q3(0), Q3(1))
check(dot(w, vec(O, Op)) == 0, "1a: tangente commune perpendiculaire a (OO') en T")
check(det(vec(T, O), w) * det(vec(T, O), w) == 9 * n2(w) and det(vec(T, Op), w) * det(vec(T, Op), w) == 1 * n2(w),
      "1a: distances de O et O' a cette droite = 3 et 1 (rayons)")
h1 = hom(T, F(-1, 3))
check(h1(O) == Op, "1b: h1(O) = O'")
check(vec(T, Op) == mul(F(-1, 3), vec(T, O)), "1b: vec(TO') = -(1/3) vec(TO)")
def circ_pt(c, r, s):
    return (c[0] + r * (1 - s * s) / (1 + s * s), c[1] + r * 2 * s / (1 + s * s))
Om = (Q3(6), Q3(0))
h2 = hom(Om, F(1, 3))
for _ in range(150):
    s = rnd()
    M = circ_pt(O, 3, s)
    check(n2(vec(Op, h1(M))) == 1 and n2(vec(Op, h2(M))) == 1, "1b, 3b: h1(C) et h2(C) inclus dans C'")
    N = circ_pt(Op, 1, s)
    check(n2(vec(O, hom(T, F(-3))(N))) == 9 and n2(vec(O, hom(Om, F(3))(N))) == 9, "1b, 3b: tout point de C' a son antecedent sur C")
# 2. a line Delta through T with slope m cuts C again at M and C' again at M'
for _ in range(150):
    m = rnd()
    u = (Q3(1), Q3(m))
    lam = -2 * dot(vec(O, T), u) / n2(u)
    lamp = -2 * dot(vec(Op, T), u) / n2(u)
    M = add(T, mul(lam, u))
    Mp = add(T, mul(lamp, u))
    check(n2(vec(O, M)) == 9 and n2(vec(Op, Mp)) == 1, "2: M sur C, M' sur C'")
    if m == 0:
        continue  # Delta = (OO') : excluded in the statement
    check(not (M == T) and not (Mp == T), "2: M et M' distincts de T")
    check(h1(M) == Mp, "2a: h1(M) = M'")
    check(det(vec(O, M), vec(Op, Mp)) == 0, "2b: (OM) // (O'M')")
    check(9 * n2(vec(T, Mp)) == n2(vec(T, M)), "2b: TM' = TM/3")
    tM, tMp = (-vec(O, M)[1], vec(O, M)[0]), (-vec(Op, Mp)[1], vec(Op, Mp)[0])
    check(det(tM, tMp) == 0, "2c: tangentes en M et M' paralleles")
    Mpp = sym(Op, Mp)
    check(h2(M) == Mpp and aligned(Om, M, Mpp), "3c: h2(M) = M'' (diametralement oppose a M'), Omega, M, M'' alignes")
    check(vec(Op, h2(M)) == mul(F(1, 3), vec(O, M)) and vec(Op, Mp) == mul(F(-1, 3), vec(O, M)),
          "3c: vec(O'M'') = (1/3) vec(OM), vec(O'M') = -(1/3) vec(OM)")
# 3. Omega
check(vec(Om, Op) == mul(F(1, 3), vec(Om, O)), "3a: vec(Omega O') = (1/3) vec(Omega O)")
check(add(mul(-1, vec(Om, O)), mul(3, vec(Om, Op))) == (0, 0), "3a: Omega barycentre de (O,-1), (O',3)")
check(vec(O, Om) == mul(F(3, 2), vec(O, Op)), "3a: vec(O Omega) = (3/2) vec(OO')")
check(n2(vec(O, Om)) == 36 and n2(vec(Op, Om)) == 4 and dot(vec(Op, Om), vec(O, Op)) > 0,
      "3a: O Omega = 6, O' Omega = 2, Omega au-dela de O'")
check(h2(O) == Op and n2(vec(Op, h2(T))) == 1, "3b: h2(O) = O', et h2(T) a la distance 1 de O'")
# 4. tangents from Omega. P on C and on the circle of diameter [O Omega] (centre (3,0), radius 3)
xP = F(9, 6)
check(xP == F(3, 2) and (xP - 3) ** 2 - xP ** 2 == 0, "4a: x_P = 3/2")
check(9 - xP * xP == F(27, 4), "4a: y_P^2 = 27/4")
check(mid(O, Om) == T and n2(vec(O, T)) * 4 == n2(vec(O, Om)), "4a: le milieu de [O Omega] est T")
MOT = mid(O, T)
check(n2(vec(O, MOT)) == F(9, 4) and n2(vec(O, MOT)) < 9, "4a: la mediatrice de [OT] est a la distance 3/2 < 3 de O")
P = (Q3(F(3, 2)), Q3(0, F(3, 2)))
P2 = (Q3(F(3, 2)), Q3(0, F(-3, 2)))
check(P2 == (P[0], -P[1]), "4a: P1 et P2 symetriques par rapport a (OO')")
for X in (P, P2):
    check(n2(vec(O, X)) == 9 and n2(vec(mid(O, Om), X)) == 9, "4a: P sur C et sur le cercle de diametre [O Omega]")
    check(dot(vec(X, O), vec(X, Om)) == 0, "4a: (Omega P) perpendiculaire a (OP) : tangente")
    check(dot(vec(MOT, X), vec(O, T)) == 0 and n2(vec(T, X)) == 9, "4a: P sur la mediatrice de [OT] et a la distance 3 de T")
check(n2(vec(Om, P)) == Q3(0, 3) * Q3(0, 3), "4a: Omega P = 3sqrt3")
check(n2(vec(Om, P)) == n2(vec(Om, O)) - n2(vec(O, P)), "4a: Pythagore 36 - 9 = 27")
Pp = h2(P)
check(Pp == (Q3(F(9, 2)), Q3(0, F(1, 2))), "4b: P'(9/2, sqrt3/2)")
check(n2(vec(Op, Pp)) == 1, "4b: P' sur C'")
check(dot(vec(Pp, Op), vec(Pp, Om)) == 0 and aligned(Om, P, Pp), "4b: (Omega P) tangente a C' en P'")
check(det(vec(O, P), vec(Op, Pp)) == 0, "4b: (O'P') // (OP)")
check(n2(vec(Om, Pp)) == 3 and dot(vec(Pp, Om), vec(Pp, P)) < 0, "4c: Omega P' = sqrt3, P' entre Omega et P")
check(n2(vec(Om, Op)) - n2(vec(Op, Pp)) == 3, "4c: controle Omega O'^2 - O'P'^2 = 4 - 1 = 3")
check(vec(Om, Pp) == mul(F(1, 3), vec(Om, P)), "4c: vec(Omega P') = (1/3) vec(Omega P)")
check(vec(Pp, P) == mul(2, vec(Om, Pp)) and n2(vec(P, Pp)) == Q3(0, 2) * Q3(0, 2), "4c: PP' = 2 Omega P' = 2sqrt3")
# 5. K = (Omega P) inter (x = 3)
lamK = (Q3(3) - Om[0]) / (P[0] - Om[0])
K = add(Om, mul(lamK, vec(Om, P)))
check(lamK == F(2, 3) and K == (Q3(3), Q3(0, 1)), "5: K(3, sqrt3)")
check(n2(vec(K, P)) == n2(vec(K, T)) == n2(vec(K, Pp)) == 3, "5a: KP = KT = KP' = sqrt3")
check(n2(vec(K, P)) == n2(vec(K, O)) - 9 and n2(vec(K, T)) == n2(vec(K, O)) - 9, "5a: KP^2 = KO^2 - 9 = KT^2")
check(n2(vec(K, Pp)) == n2(vec(K, Op)) - 1 and n2(vec(K, T)) == n2(vec(K, Op)) - 1, "5a: KP'^2 = KO'^2 - 1 = KT^2")
check(K == mid(P, Pp), "5a: K milieu de [PP']")
check(round(float(n2(vec(K, T))) ** 0.5, 2) == 1.73, "5b: KT ~ 1.73")

print(f"all {ok} checks passed")
