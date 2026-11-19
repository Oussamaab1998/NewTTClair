"""Checks every claim in exercises T1 ch9 (2eme Sciences, radians and rotations).

Each figure of the exercises is placed in a coordinate system inside this script (the direct sense
is the counterclockwise sense of the axes); exact arithmetic with fractions and with numbers
a + b*sqrt(3); float tolerance only for angle measures that are not checked exactly."""
from fractions import Fraction as F
import math, random

random.seed(9)
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
        def __float__(s): return float(s.a) + float(s.b) * d ** 0.5
    return Q

Q3 = make_field(3)
S3 = Q3(0, 1)   # sqrt(3)

def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def n2(u): return dot(u, u)
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def sym(I, M): return (2 * I[0] - M[0], 2 * I[1] - M[1])
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def pt(x, y): return (Q3(x) if not isinstance(x, Q3) else x, Q3(y) if not isinstance(y, Q3) else y)
def area(*pts):
    s = 0
    for i in range(len(pts)):
        s = s + det(pts[i], pts[(i + 1) % len(pts)])
    return s / 2
def fl(P): return (float(P[0]), float(P[1]))
def angle(P, O, Q):  # geometric angle POQ in [0, pi], float
    u, v = fl(vec(O, P)), fl(vec(O, Q))
    c = (u[0] * v[0] + u[1] * v[1]) / math.hypot(*u) / math.hypot(*v)
    return math.acos(max(-1.0, min(1.0, c)))

# exact cos / sin of the angles used
COS = {F(1, 6): Q3(0, F(1, 2)), F(1, 3): Q3(F(1, 2)), F(1, 2): Q3(0), F(2, 3): Q3(F(-1, 2)), F(1): Q3(-1)}
SIN = {F(1, 6): Q3(F(1, 2)), F(1, 3): Q3(0, F(1, 2)), F(1, 2): Q3(1), F(2, 3): Q3(0, F(1, 2)), F(1): Q3(0)}
for k in COS:
    check(COS[k] * COS[k] + SIN[k] * SIN[k] == 1, "cos^2 + sin^2 = 1")
    check(math.isclose(float(COS[k]), math.cos(k * math.pi), abs_tol=1e-12)
          and math.isclose(float(SIN[k]), math.sin(k * math.pi), abs_tol=1e-12), "table cos/sin")

def rot(O, k, direct=True):
    """rotation of centre O and angle k*pi (k in the table), direct or indirect."""
    c, s = COS[k], SIN[k] if direct else -SIN[k]
    def r(M):
        x, y = vec(O, M)
        return (O[0] + c * x - s * y, O[1] + s * x + c * y)
    return r

def is_rot_image(O, M, Mp, k, direct):
    """textbook definition: OM' = OM, angle MOM' = k*pi, sense given by the sign of det."""
    u, v = vec(O, M), vec(O, Mp)
    if n2(u) != n2(v): return False
    if dot(u, v) != COS[k] * n2(u): return False
    dt = det(u, v)
    if k in (0, 1): return dt == 0
    return dt > 0 if direct else dt < 0

# ---------- Ex1
# 1a conversions
check(F(15, 180) == F(1, 12) and F(135, 180) == F(3, 4), "1a: 15 deg = pi/12, 135 deg = 3pi/4")
check(F(3, 5) * 180 == 108 and F(7, 12) * 180 == 105, "1a: 3pi/5 = 108 deg, 7pi/12 = 105 deg")
# square ABCD side 4, centre O, D = image of B by the direct quarter turn of centre A
A, B, C, D = pt(0, 0), pt(4, 0), pt(4, 4), pt(0, 4)
O = mid(A, C)
check(O == mid(B, D) and O == pt(2, 2), "centre O")
check(rot(A, F(1, 2))(B) == D and is_rot_image(A, B, D, F(1, 2), True), "D = quart de tour direct de centre A de B")
# 1b
check(n2(vec(A, C)) == 32 and n2(vec(O, A)) == 8 and 4 * n2(vec(O, A)) == n2(vec(A, C)),
      "1b: AC^2 = 32 (AC = 4sqrt2), OA = AC/2, OA^2 = 8 (OA = 2sqrt2)")
check(dot(vec(O, A), vec(O, B)) == 0, "1b: angle AOB = pi/2")
L = math.sqrt(float(n2(vec(O, A)))) * angle(A, O, B)   # L = r x (mesure en radians)
check(math.isclose(L, math.pi * math.sqrt(2)) and round(L, 2) == 4.44, "1b: arc AB = pi*sqrt2 ~ 4.44")
# the arc intercepted by the angle AOB is the set of points of the circle inside that angle:
# X is inside the angle AOB iff vec(OX) = lam vec(OA) + mu vec(OB) with lam >= 0 and mu >= 0
def in_angle(X):
    dd = det(vec(O, A), vec(O, B))
    lam, mu = det(vec(O, X), vec(O, B)) / dd, det(vec(O, A), vec(O, X)) / dd
    return lam.sign() >= 0 and mu.sign() >= 0
check(not in_angle(C) and not in_angle(D), "1b: C (et D) hors de l'angle AOB : l'arc intercepte ne contient pas C")
check(in_angle(add(O, mul(Q3(1), add(vec(O, A), vec(O, B))))), "1b: controle, la bissectrice est dans l'angle")
# 2a
r = rot(O, F(1, 2))
check(r(A) == B and r(B) == C and r(C) == D and r(D) == A, "2a: r(A)=B, r(B)=C, r(C)=D, r(D)=A")
for X, Y in ((A, B), (B, C), (C, D), (D, A)):
    check(is_rot_image(O, X, Y, F(1, 2), True), "2a: definition (OX = OY, angle pi/2, sens direct)")
# 2b
check(dot(vec(A, C), vec(B, D)) == 0 and r(A) == B and r(C) == D, "2b: r((AC)) = (BD), perpendiculaire a (AC)")
# 2c
check(rot(O, F(1))(A) == C and sym(O, A) == C and rot(O, F(1), False)(A) == C, "2c: angle pi (symetrie centrale) de A vers C")
check(rot(O, F(1, 2), False)(A) == D and is_rot_image(O, A, D, F(1, 2), False), "2c: quart de tour indirect de A vers D")
check(not is_rot_image(O, A, D, F(1, 2), True), "2c: pas le quart de tour direct")
# 3. M, N, P, Q
S = lambda x: 2 * x * x - 8 * x + 16
for _ in range(200):
    x = F(random.randint(1, 399), 100)
    M, N, P, Qq = pt(x, 0), pt(4, x), pt(4 - x, 4), pt(0, 4 - x)
    check(n2(vec(A, M)) == x * x and n2(vec(B, N)) == x * x and n2(vec(C, P)) == x * x and n2(vec(D, Qq)) == x * x,
          "3: AM = BN = CP = DQ = x")
    check(r(M) == N and r(N) == P and r(P) == Qq and r(Qq) == M, "3a: r(M)=N, r(N)=P, r(P)=Q, r(Q)=M")
    check(n2(vec(B, r(M))) == n2(vec(A, M)) and aligned(B, C, r(M)), "3a: r(M) sur [BC] avec B r(M) = AM")
    check(n2(vec(M, N)) == n2(vec(N, P)) == n2(vec(P, Qq)) == n2(vec(Qq, M)), "3b: quatre cotes egaux")
    check(dot(vec(N, M), vec(N, P)) == 0, "3b: angle droit en N")
    check(sym(O, M) == P and sym(O, N) == Qq and mid(M, P) == O, "3b: O milieu de [MP] et [NQ]")
    check(n2(vec(M, B)) == (4 - x) ** 2 and n2(vec(M, N)) == (4 - x) ** 2 + x * x, "3c: Pythagore dans MBN")
    check(area(M, N, P, Qq) == S(x) and n2(vec(M, N)) == S(x), "3c: aire = 2x^2 - 8x + 16")
    check(S(x) == 2 * (x - 2) ** 2 + 8, "3d: forme canonique")
    check(S(x) >= 8 and ((S(x) == 8) == (x == 2)), "3d: minimum 8 atteint seulement en x = 2")
    check((S(x) == 10) == (x in (1, 3)), "3d: S(x) = 10 <=> x = 1 ou x = 3")
check(S(F(1)) == 10 and S(F(3)) == 10 and S(F(2)) == 8 and S(F(2)) * 2 == area(A, B, C, D), "3d: valeurs, aire min = moitie de l'aire de ABCD")
check(area(mid(A, B), mid(B, C), mid(C, D), mid(D, A)) == 8, "3d: x = 2 : carre des milieux, aire 8")
# 4. E
E = rot(A, F(1, 3))(B)
check(E == pt(2, Q3(0, 2)), "4: E(2, 2sqrt3)")
check(is_rot_image(A, B, E, F(1, 3), True), "4: definition de E")
check(n2(vec(A, E)) == n2(vec(B, E)) == n2(vec(A, B)) == 16, "4a: ABE equilateral")
check(E[0] == 2 and n2(vec(E, A)) == n2(vec(E, B)), "4a: E sur la mediatrice de [AB]")
check(E[1] * E[1] == 12 and Q3(0) < E[1] and E[1] < Q3(4), "4a: hauteur 2sqrt3 entre 0 et 4 : E a l'interieur")
check(n2(vec(A, B)) - 4 == E[1] * E[1], "4a: hauteur^2 = 16 - 4 = 12")
check(dot(vec(A, D), vec(A, E)) == COS[F(1, 6)] * 16, "4b: angle DAE = pi/6 (exact)")
check(math.isclose(angle(D, A, E), math.pi / 6), "4b: DAE ~ pi/6")
check(math.isclose(angle(A, D, E), 5 * math.pi / 12) and math.isclose(angle(A, E, D), 5 * math.pi / 12), "4b: ADE = AED = 5pi/12")
check(math.isclose(angle(E, D, C), math.pi / 12), "4b: EDC = pi/12")
check(math.isclose(angle(A, D, E) + angle(E, D, C), math.pi / 2), "4b: [DE) a l'interieur de l'angle droit ADC")
check(math.isclose(angle(B, A, E) + angle(E, A, D), math.pi / 2), "4b: [AE) a l'interieur de l'angle droit BAD")
check(n2(vec(E, D)) == n2(vec(E, C)), "4b: ED = EC")
check(math.isclose(angle(E, C, D), math.pi / 12), "4b: angle ECD = pi/12")
check(dot(vec(E, D), vec(E, C)) == -COS[F(1, 6)] * n2(vec(E, D)), "4b: DEC = 5pi/6 (cos = -sqrt3/2, exact)")
check(math.isclose(angle(D, E, C), 5 * math.pi / 6), "4b: DEC ~ 5pi/6")
check(rot(A, F(1, 6), False)(D) == E and is_rot_image(A, D, E, F(1, 6), False), "4c: E = rotation indirecte (A, pi/6) de D")
check(not is_rot_image(A, D, E, F(1, 6), True), "4c: et pas la rotation directe")

# ---------- Ex2 : B(0,0), A(-4,0), C(2,0)
B, A, C = pt(0, 0), pt(-4, 0), pt(2, 0)
D = rot(B, F(1, 3), False)(A)
E = rot(B, F(1, 3))(C)
check(D == pt(-2, Q3(0, 2)) and E == pt(1, S3), "D(-2, 2sqrt3), E(1, sqrt3)")
check(is_rot_image(B, A, D, F(1, 3), False) and is_rot_image(B, C, E, F(1, 3), True), "definitions de D et E")
check(n2(vec(A, B)) == n2(vec(B, D)) == n2(vec(A, D)) == 16, "1a: ABD equilateral")
check(n2(vec(B, C)) == n2(vec(C, E)) == n2(vec(B, E)) == 4, "1a: BCE equilateral")
check(D[1] > Q3(0) and E[1] > Q3(0), "1a: D et E du meme cote de (AC)")
rr = rot(B, F(1, 3))
check(rr(D) == A and rr(C) == E, "1b: r(D) = A, r(C) = E")
check(n2(vec(D, C)) == n2(vec(A, E)) == 28, "1b, 2: DC^2 = AE^2 = 28, DC = AE = 2sqrt7")
check(n2(vec(B, D)) == n2(vec(B, A)) and n2(vec(B, rr(D))) == n2(vec(B, D)), "1b: r conserve BD = BA")
H = mid(B, C)
check(dot(vec(E, H), vec(A, C)) == 0 and n2(vec(E, H)) == 3 and n2(vec(A, H)) == 25, "2: (EH) perp (AC), EH = sqrt3, AH = 5")
check(n2(vec(E, B)) - n2(vec(B, H)) == 3, "2: EH^2 = 4 - 1")
check(n2(vec(A, E)) == 25 + 3 and n2(vec(A, E)) == 28, "2: AE^2 = 28, AE = 2sqrt7")
I, J = mid(A, E), mid(D, C)
check(rr(J) == I, "3a: r(J) = I")
check(J[1] == D[1] / 2 and J[1] > Q3(0), "3a: J a mi-hauteur de D, donc J != B")
check(n2(vec(B, I)) == n2(vec(B, J)) == n2(vec(I, J)) == 3, "3a: BIJ equilateral de cote sqrt3")
check(is_rot_image(B, J, I, F(1, 3), True), "3a: angle JBI = pi/3")
I0 = (I[0], Q3(0))
check(dot(vec(I0, I), vec(A, C)) == 0 and I0 == mid(A, H), "3b: I0 projete de I, milieu de [AH]")
check(n2(vec(I, I0)) == F(3, 4) and n2(vec(A, I0)) == F(25, 4) and n2(vec(B, I0)) == F(9, 4), "3b: II0 = sqrt3/2, AI0 = 5/2, BI0 = 3/2")
check(dot(vec(I0, B), vec(I0, I)) == 0 and n2(vec(B, I)) == n2(vec(B, I0)) + n2(vec(I0, I)) == S3 * S3,
      "3b: Pythagore dans BI0I : BI^2 = 9/4 + 3/4 = 3, BI = sqrt3")
check(A[0] < I0[0] and I0[0] < B[0], "3b: I0 sur [AB]")
ar = area(B, I, J)
check(ar == Q3(0, F(3, 4)) or ar == Q3(0, F(-3, 4)), "3c: aire de BIJ = 3sqrt3/4")
per = sum(math.sqrt(float(n2(vec(X, Y)))) for X, Y in ((B, I), (I, J), (J, B)))
check(math.isclose(per, float(Q3(0, 3))) and round(per, 2) == 5.20, "3c: perimetre 3sqrt3 ~ 5.20")
check(n2(vec(B, mid(I, J))) == F(9, 4) and dot(vec(B, mid(I, J)), vec(I, J)) == 0, "3c: hauteur issue de B = 3/2")
check(round(abs(float(ar)), 2) == 1.30, "3c: aire ~ 1.30")
# 4. C variable on [Bx) (x > 0)
K, Lm = mid(A, B), mid(B, D)
ydir = rr(pt(1, 0))
check(ydir == pt(F(1, 2), Q3(0, F(1, 2))), "4b: direction de [By)")
check(det(vec(B, E), vec(A, D)) == 0 and dot(vec(B, E), vec(A, D)) > Q3(0), "4b: [By) parallele a (AD), meme sens")
check(det(vec(K, Lm), vec(A, D)) == 0 and vec(K, Lm) == mul(F(1, 2), vec(A, D)), "4c: (KL) // (AD), KL = AD/2")
for _ in range(200):
    c = F(random.randint(1, 400), random.randint(1, 20))
    Cc = pt(c, 0)
    Ee = rr(Cc)
    Ii, Jj = mid(A, Ee), mid(D, Cc)
    check(rr(Jj) == Ii, "4a: r(J) = I pour tout C")
    check(Jj[1] == D[1] / 2, "4a: J a mi-hauteur de D, J != B")
    check(n2(vec(B, Ii)) == n2(vec(B, Jj)) == n2(vec(Ii, Jj)), "4a: BIJ equilateral pour tout C")
    check(det(vec(B, Ee), ydir) == 0 and dot(vec(B, Ee), ydir) > Q3(0) and n2(vec(B, Ee)) == c * c,
          "4b: E sur [By) prive de B, BE = BC")
    check(vec(K, Ii) == mul(F(1, 2), vec(B, Ee)), "4c: vec(KI) = (1/2) vec(BE)")
    check(det(vec(K, Ii), vec(K, Lm)) == 0 and dot(vec(K, Ii), vec(K, Lm)) > Q3(0), "4c: I sur [KL) prive de K")
    check(aligned(B, D, Ii) == (c == 4), "4d: I sur (BD) <=> BC = 4")
    # converse: every point X of [KL) other than K is reached
    s = F(random.randint(1, 300), random.randint(1, 20))
    X = add(K, mul(s, vec(K, Lm)))
    Ee2 = add(B, mul(2 * s, vec(K, Lm)))           # E such that (1/2) vec(BE) = vec(KX)
    Cc2 = rot(B, F(1, 3), False)(Ee2)              # antecedent of E by r
    check(Cc2[1] == 0 and Cc2[0] > Q3(0) and mid(A, rr(Cc2)) == X, "4c: tout point de [KL) prive de K est atteint")
# 4d
phi = lambda c: det(vec(B, D), vec(B, mid(A, rr(pt(c, 0)))))
slope = phi(F(1)) - phi(F(0))
c0 = -phi(F(0)) / slope
check(c0 == 4, "4d: equation du premier degre : BC = 4")
C4 = pt(4, 0); E4 = rr(C4)
check(mid(A, E4) == Lm, "4d: pour BC = 4, I = L")
check(vec(B, E4) == vec(A, D) and n2(vec(A, B)) == n2(vec(A, D)) == 16, "4d: ABED losange")
check(C4 == sym(B, A), "4d: C symetrique de A par rapport a B")
check(n2(vec(B, E4)) == n2(vec(E4, D)) == n2(vec(B, D)) == 16, "4d: BED equilateral")
check(not aligned(B, D, K), "4d: K n'est pas sur (BD)")
check(ydir[1] > Q3(0) and D[1] > Q3(0), "4b: [By) du cote de D")
check(mid(A, E) == mid(K, Lm), "pour BC = 2, I est le milieu de [KL]")

print(f"all {ok} checks passed")
