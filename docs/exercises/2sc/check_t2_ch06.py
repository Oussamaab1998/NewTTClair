"""Checks every value and claim used in exercises T2 ch6 (Geometrie analytique, 2eme Sciences)."""
from fractions import Fraction as F
import math, random

random.seed(206)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def P(x, y): return (F(x), F(y))
def vec(A, B): return (B[0] - A[0], B[1] - A[1])
def det(u, v): return u[0] * v[1] - v[0] * u[1]          # det(u, v) = x y' - x' y
def orth(u, v): return u[0] * v[0] + u[1] * v[1]         # x x' + y y'
def n2(u): return u[0] ** 2 + u[1] ** 2
def d2(A, B): return n2(vec(A, B))
def mid(A, B): return ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
def L(a, b, c): return (F(a), F(b), F(c))               # line a x + b y + c = 0
def on(l, M): return l[0] * M[0] + l[1] * M[1] + l[2] == 0
def val(l, M): return l[0] * M[0] + l[1] * M[1] + l[2]
def same_line(l1, l2):
    return (l1[0] * l2[1] - l1[1] * l2[0] == 0 and l1[0] * l2[2] - l1[2] * l2[0] == 0
            and l1[1] * l2[2] - l1[2] * l2[1] == 0)
def inter(l1, l2):
    d = l1[0] * l2[1] - l2[0] * l1[1]
    assert d != 0
    return ((l1[1] * l2[2] - l2[1] * l1[2]) / d, (l2[0] * l1[2] - l1[0] * l2[2]) / d)
def dist2(M, l): return val(l, M) ** 2 / (l[0] ** 2 + l[1] ** 2)

rats = [F(random.randint(-50, 50), random.randint(1, 9)) for _ in range(150)]

# ================= Exercice 1 =================
A, B, C = P(-2, 1), P(2, 3), P(4, -1)
AB, AC = vec(A, B), vec(A, C)
check(AB == (4, 2) and AC == (6, -2), "composantes AB(4, 2), AC(6, -2)")
check(det(AB, AC) == -20, "det(AB, AC) = 4(-2) - 6(2) = -20")
check(det(AB, AC) != 0, "base, A B C non alignes")
# 1 c) E on the x-axis with A, B, E aligned
fE = lambda x: det(AB, vec(A, P(x, 0)))
check(all(fE(x) == -2 * x - 8 for x in rats), "det(AB, AE) = 4(-1) - 2(x + 2) = -2x - 8")
E = P(-4, 0)
check(fE(F(-4)) == 0 and fE(F(0)) != 0, "E(-4, 0) unique (fonction affine non constante)")
# 2 a) (AB) : x - 2y + 4 = 0
lAB = L(1, -2, 4)
for _ in range(100):
    M = (random.choice(rats), random.choice(rats))
    check(det(vec(A, M), AB) == 2 * val(lAB, M), "det(AM, AB) = 2(x - 2y + 4)")
check(on(lAB, A) and on(lAB, B) and on(lAB, E), "A, B, E sur (AB)")
# 2 b) reduite y = x/2 + 2, m = 1/2, directeur (2, 1) = (-b, a)
check(all(on(lAB, (x, x / 2 + 2)) for x in rats), "y = (1/2)x + 2")
check(F(B[1] - A[1], 1) / (B[0] - A[0]) == F(1, 2), "coefficient directeur 1/2")
check((-lAB[1], lAB[0]) == (2, 1) and det((2, 1), AB) == 0 and det((1, F(1, 2)), AB) == 0, "vecteurs directeurs (2, 1) et (1, 1/2)")
# 2 c) Delta : x - 2y - 6 = 0 through C, parallel to (AB)
lD = L(1, -2, -6)
check(on(lD, C), "C sur Delta")
check(lAB[0] * lD[1] - lD[0] * lAB[1] == 0 and not on(lD, A), "Delta strictement parallele a (AB)")
for _ in range(50):
    M = (random.choice(rats), random.choice(rats))
    check(det(vec(C, M), (2, 1)) == val(lD, M), "det(CM, u) = x - 2y - 6")
# 3 a) (BC) : y = -2x + 7
mBC = (C[1] - B[1]) / (C[0] - B[0])
check(mBC == -2, "coefficient directeur de (BC) = -2")
check(B[1] == -2 * B[0] + 7 and C[1] == -2 * C[0] + 7, "y = -2x + 7 passe par B et C")
check(F(1, 2) * mBC == -1, "m m' = -1 : (AB) perpendiculaire a (BC)")
lBC = L(2, 1, -7)
check(on(lBC, B) and on(lBC, C), "(BC) : 2x + y - 7 = 0")
check(orth((1, -2), (2, 1)) == 0, "vecteurs normaux (1, -2) et (2, 1) orthogonaux")
# 3 b) BA = BC = 2 sqrt5, right angle at B
check(d2(B, A) == 20 and d2(B, C) == 20 and orth(vec(B, A), vec(B, C)) == 0, "ABC rectangle isocele en B, BA = BC = sqrt20")
check(vec(B, A) == (-4, -2) and vec(B, C) == (2, -4), "composantes BA, BC")
# 3 c) square ABCD : D(0, -3)
D = (A[0] + C[0] - B[0], A[1] + C[1] - B[1])
check(D == (0, -3) and vec(A, D) == vec(B, C), "D(0, -3), AD = BC (vecteurs)")
check(d2(A, B) == d2(B, C) == d2(C, D) == d2(D, A) == 20 and d2(A, C) == d2(B, D) == 40, "ABCD carre")
check(orth(vec(A, B), vec(A, D)) == 0, "angle droit en A")
check(on(lD, D), "D sur Delta")
# 4 a) d(C, (AB)) = 10 / sqrt5 = 2 sqrt5 = BC
check(val(lAB, C) == 10 and dist2(C, lAB) == 20 == d2(B, C), "d(C, (AB)) = 10/sqrt5 = 2sqrt5 = BC")
check(abs(10 / math.sqrt(5) - 2 * math.sqrt(5)) < 1e-12, "10/sqrt5 = 2sqrt5")
# 4 b) area 20
check(d2(B, A) == 20, "aire du carre 20")
# 5 a) Omega(1, 0), Delta' : 3x - y - 3 = 0 (normal AC(6, -2))
Om = mid(A, C)
check(Om == (1, 0), "Omega(1, 0)")
lDp = L(3, -1, -3)
for _ in range(50):
    M = (random.choice(rats), random.choice(rats))
    check(6 * (M[0] - 1) - 2 * (M[1] - 0) == 2 * val(lDp, M), "6(x - 1) - 2y = 2(3x - y - 3)")
check(on(lDp, Om) and det((lDp[0], lDp[1]), AC) == 0, "Delta' passe par Omega, normal colineaire a AC")
# 5 b) Delta' and (AB) : a b' - a' b = -5, intersection B
check(lDp[0] * lAB[1] - lAB[0] * lDp[1] == -5, "3(-2) - 1(-1) = -5")
check(inter(lDp, lAB) == B, "Delta' et (AB) se coupent en B(2, 3)")
# 5 c) D on Delta', Delta' = (BD) = mediatrice de [AC]
check(on(lDp, D) and on(lDp, B), "B et D sur Delta'")
for _ in range(50):
    t = random.choice(rats)
    M = (t, 3 * t - 3)
    check(on(lDp, M) and d2(M, A) == d2(M, C), "Delta' = mediatrice de [AC]")

# ================= Exercice 2 =================
A, B, C = P(-1, 5), P(6, 4), P(5, -3)
eqs = []
for X in (A, B, C):
    eqs.append((X[0], X[1], F(1), -(X[0] ** 2 + X[1] ** 2)))   # a x + b y + c = -(x^2 + y^2)
check(eqs[0] == (-1, 5, 1, -26) and eqs[1] == (6, 4, 1, -52) and eqs[2] == (5, -3, 1, -34), "systeme ecrit")
def det3(m):
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
Mx = [list(e[:3]) for e in eqs]
dM = det3(Mx)
check(dM != 0, "systeme de Cramer (solution unique)")
sol = []
for k in range(3):
    Mk = [row[:] for row in Mx]
    for i in range(3):
        Mk[i][k] = eqs[i][3]
    sol.append(det3(Mk) / dM)
a, b, c = sol
check((a, b, c) == (-4, -2, -20), "a = -4, b = -2, c = -20")
check(7 * a - b == -26 and a + 7 * b == -18, "combinaisons 7a - b = -26, a + 7b = -18")
check(-26 + a - 5 * b == c, "c = -26 + a - 5b")
G2 = lambda M: M[0] ** 2 + M[1] ** 2 - 4 * M[0] - 2 * M[1] - 20
for _ in range(80):
    M = (random.choice(rats), random.choice(rats))
    check(G2(M) == (M[0] - 2) ** 2 + (M[1] - 1) ** 2 - 25, "forme canonique (x-2)^2 + (y-1)^2 = 25")
Om = P(2, 1)
check(d2(Om, A) == d2(Om, B) == d2(Om, C) == 25, "Omega A = Omega B = Omega C = 5")
check(vec(Om, A) == (-3, 4) and vec(Om, B) == (4, 3) and vec(Om, C) == (3, -4), "composantes")
# 2) villages E and F
Ev, Fv = P(-3, -1), P(1, -3)
check(d2(Om, Ev) == 29 and d2(Om, Fv) == 17, "Omega E^2 = 29, Omega F^2 = 17")
check(round(math.sqrt(d2(Om, Ev)), 2) == 5.39 and round(math.sqrt(d2(Om, Fv)), 2) == 4.12, "approximations")
# 3) route D : x + 2y - 14 = 0
lR = L(1, 2, -14)
check(val(lR, Om) == -10 and dist2(Om, lR) == 20 and 20 < 25, "d(Omega, D) = 10/sqrt5 = 2sqrt5 < 5")
check(round(math.sqrt(dist2(Om, lR)), 2) == 4.47, "2 sqrt5 ~ 4.47")
for y in rats:
    check(G2((14 - 2 * y, y)) == (12 - 2 * y) ** 2 + (y - 1) ** 2 - 25 == 5 * y * y - 50 * y + 120, "equation en y (x = 14 - 2y dans Gamma)")
pol = lambda y: (14 - 2 * y - 2) ** 2 + (y - 1) ** 2 - 25        # x = 14 - 2y put into Gamma
c0, s1, s2 = pol(F(0)) / 5, pol(F(1)) / 5, pol(F(2)) / 5
qa = (s2 - 2 * s1 + c0) / 2
qb, qc = s1 - c0 - qa, c0
check((qa, qb, qc) == (1, -10, 24), "y^2 - 10y + 24 obtenu a partir de Gamma et D")
check(qb ** 2 - 4 * qa * qc == 4, "discriminant 4")
roots = sorted(y for y in range(-20, 21) if pol(F(y)) == 0)
check(roots == [4, 6], "racines 4 et 6")
Gp = P(2, 6)
for X in (B, Gp):
    check(on(lR, X) and G2(X) == 0, "B et G sur D et sur Gamma")
check(d2(B, Gp) == 20, "BG = sqrt20 = 2sqrt5")
# 3 c) H projection of Omega on D
lOH = L(2, -1, -3)
for _ in range(40):
    M = (random.choice(rats), random.choice(rats))
    check(det(vec(Om, M), (1, 2)) == val(lOH, M), "det(Omega M, n) = 2x - y - 3")
H = inter(lOH, lR)
check(H == (4, 5) and on(lOH, Om), "H(4, 5)")
check(det(vec(Om, H), (1, 2)) == 0 and d2(Om, H) == 20, "Omega H normal a D, Omega H^2 = 20")
check(mid(B, Gp) == H, "H milieu de [BG]")
for _ in range(80):
    t = random.choice(rats)
    M = (14 - 2 * t, t)
    check(d2(Om, M) >= d2(Om, H), "H est le point de D le plus proche de Omega")
# 4) tangent T at A : 3x - 4y + 23 = 0
lT = L(3, -4, 23)
for _ in range(40):
    M = (random.choice(rats), random.choice(rats))
    check(-3 * (M[0] + 1) + 4 * (M[1] - 5) == -val(lT, M), "-3(x + 1) + 4(y - 5) = -(3x - 4y + 23)")
check(on(lT, A) and orth((lT[0], lT[1]), (4, 3)) == 0 and det((lT[0], lT[1]), vec(Om, A)) == 0, "T passe par A, normal colineaire a Omega A")
check(val(lT, Om) == 25 and dist2(Om, lT) == 25, "d(Omega, T) = 25/5 = 5")
for _ in range(80):     # T touches Gamma only at A : along T, G2 = 25 t^2 >= 0 (perfect square)
    t = random.choice(rats)
    M = (A[0] + 4 * t, A[1] + 3 * t)
    check(on(lT, M) and G2(M) == 25 * t * t, "T tangente en A")
# 5) Gamma_k : (x - 2)^2 + (y - 1)^2 = 5 - k
for k in (F(-15), F(0), F(5), F(6), F(7, 2)):
    for _ in range(20):
        M = (random.choice(rats), random.choice(rats))
        check(M[0] ** 2 + M[1] ** 2 - 4 * M[0] - 2 * M[1] + k == (M[0] - 2) ** 2 + (M[1] - 1) ** 2 - (5 - k), "Gamma_k canonique")
check(all((M[0] - 2) ** 2 + (M[1] - 1) ** 2 > 0 for M in [(random.choice(rats), random.choice(rats)) for _ in range(50)] if M != (2, 1)), "Gamma_5 = {Omega}")
k = 5 - dist2(Om, lR)          # radius^2 = 5 - k must equal d(Omega, D)^2
check(k == -15, "k = -15")
Ek = lambda M: M[0] ** 2 + M[1] ** 2 - 4 * M[0] - 2 * M[1] - 15
check(Ek(H) == 0, "H sur Gamma_-15 (point de contact)")
for _ in range(60):
    t = random.choice(rats)
    M = (14 - 2 * t, t)
    check(Ek(M) == 5 * (t - 5) ** 2, "D tangente a Gamma_-15 en H")
check(d2(Om, Fv) < 20, "F encore couvert (17 < 20)")

print(f"all {ok} checks passed")
