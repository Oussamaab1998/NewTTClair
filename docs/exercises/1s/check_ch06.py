"""Checks every claim in the exercises of chapter 6 (1ere annee, activites dans un repere).

Exact arithmetic with fractions; brute-force enumeration on grids of rationals
for the "determine the points such that ..." questions; floats only for
approximate values."""
from fractions import Fraction as F
import math, random

random.seed(6)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def n2(u): return dot(u, u)
def d2(P, Q): return n2(vec(P, Q))
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def colinear(u, v): return det(u, v) == 0
def area(*pts):
    s = 0
    for i in range(len(pts)):
        s += det(pts[i], pts[(i + 1) % len(pts)])
    return abs(s) / 2
grid1 = [F(k, 4) for k in range(-80, 81)]
def exact_len(n):
    """Exact square root of a rational perfect square (fails otherwise)."""
    n = F(n)
    a, b = math.isqrt(n.numerator), math.isqrt(n.denominator)
    if a * a != n.numerator or b * b != n.denominator:
        raise SystemExit("FAIL: not a perfect square: %s" % n)
    return F(a, b)

# ======================= Exercice 1, Partie A : droite graduee, OI = 1
xA = F(-3)
xB = xA + 4                       # vec(AB) = 4 vec(OI)
xC = xB + F(-3, 2) * (xB - xA)    # vec(BC) = -3/2 vec(AB)
check((xB, xC) == (1, -5), "xB = 1, xC = -5")
AB, AC, BC = abs(xB - xA), abs(xC - xA), abs(xC - xB)
check((AB, AC, BC) == (4, 2, 6), "AB = 4, AC = 2, BC = 6")
check(AC + AB == BC and min(xB, xC) <= xA <= max(xB, xC), "A appartient a [BC]")
xK = (xB + xC) / 2
check(xK == -2 and xK != xA, "K d'abscisse -2, A n'est pas le milieu de [BC]")
check(xA - xK == -1 and xB - xK == 3, "vec(KA) = -vec(OI), vec(KB) = 3 vec(OI)")
k = (xA - xK) / (xB - xK)
check(k == F(-1, 3) and xA - xK == k * (xB - xK), "vec(KA) = -1/3 vec(KB)")
check(xC < xA < 0 < xB and xA < xK < xB, "ordre C, A, O, B ; K entre A et B")
check([x for x in grid1 if abs(x - xK) == 3] == [xC, xB], "KM = 3 <=> M = C ou M = B")

# ======================= Exercice 1, Partie B : repere orthonorme
P, Q, R = (F(-1), F(-2)), (F(3), F(-1)), (F(4), F(3))
check(vec(P, Q) == (4, 1) and vec(Q, R) == (1, 4), "composantes de vec(PQ), vec(QR)")
check(not colinear(vec(P, Q), vec(Q, R)) and not aligned(P, Q, R), "non colineaires, P, Q, R non alignes")
# S tel que PQRS parallelogramme
S = add(R, vec(Q, P))
check(S == (0, 2) and vec(P, Q) == vec(S, R) and vec(P, S) == vec(Q, R), "S(0, 2), vec(PQ) = vec(SR)")
Om = mid(P, R)
check(Om == (F(3, 2), F(1, 2)) and Om == mid(Q, S), "centre (3/2, 1/2), milieu des deux diagonales")
check(d2(P, Q) == 17 and d2(Q, R) == 17 and d2(R, S) == 17 and d2(S, P) == 17, "quatre cotes de longueur sqrt(17)")
check(d2(P, R) == 50 and d2(Q, S) == 18, "PR = 5 sqrt2, QS = 3 sqrt2")
check(d2(P, R) != d2(Q, S), "diagonales de longueurs differentes : pas un carre")
check(dot(vec(P, Q), vec(Q, R)) != 0, "angle PQR non droit (controle)")
check(exact_len(d2(P, R) * d2(Q, S)) / 2 == 15 and area(P, Q, R, S) == 15, "aire du losange = PR x QS / 2 = 15")
# T(x, 8) aligne avec P et R
sols = [x for x in grid1 if aligned(P, R, (x, F(8)))]
check(sols == [9], "T(x, 8) aligne avec P, R <=> x = 9")
T = (F(9), F(8))
check(vec(P, T) == (10, 10) and vec(P, T) == mul(2, vec(P, R)), "vec(PT) = 2 vec(PR)")
check(mid(P, T) == R, "R milieu de [PT]")

# ======================= Exercice 2 : carre ABCD de cote 4
A, B, C, D = (F(0), F(0)), (F(4), F(0)), (F(4), F(4)), (F(0), F(4))
check(d2(A, B) == d2(B, C) == d2(C, D) == d2(D, A) == 16 and dot(vec(A, B), vec(A, D)) == 0, "carre de cote 4")
E = mid(B, C)
Fp = add(C, mul(F(1, 4), vec(C, D)))                # F sur [CD], CF = 1
check(E == (4, 2) and Fp == (3, 4) and d2(C, Fp) == 1 and d2(D, Fp) == 9, "E(4, 2), F(3, 4), CF = 1, DF = 3")
check((d2(A, E), d2(E, Fp), d2(A, Fp)) == (20, 5, 25), "AE^2 = 20, EF^2 = 5, AF^2 = 25")
check(d2(A, E) + d2(E, Fp) == d2(A, Fp) and dot(vec(E, A), vec(E, Fp)) == 0, "AEF rectangle en E")
check(exact_len(d2(A, E) * d2(E, Fp)) / 2 == 5 and area(A, E, Fp) == 5, "aire AE x EF / 2 = 5")
tri = lambda P1, P2, P3: exact_len(d2(P1, P2)) * exact_len(d2(P2, P3)) / 2     # triangle rectangle en P2
check((tri(A, B, E), tri(E, C, Fp), tri(Fp, D, A)) == (4, 1, 6), "aires ABE = 4, ECF = 1, FDA = 6 (cotes de l'angle droit)")
check(d2(A, B) - tri(A, B, E) - tri(E, C, Fp) - tri(Fp, D, A) == 5 == area(A, E, Fp), "aire par difference : 16 - 4 - 1 - 6 = 5")
G = add(D, mul(2, vec(D, C)))
check(G == (8, 4) and aligned(D, C, G), "G(8, 4) sur (DC)")
check(mid(D, G) == C, "G symetrique de D par rapport a C")
check((area(A, B, E), area(E, C, Fp), area(Fp, D, A)) == (4, 1, 6), "aires ABE = 4, ECF = 1, FDA = 6")
check(vec(A, G) == mul(2, vec(A, E)) and aligned(A, E, G) and mid(A, G) == E, "A, E, G alignes, E milieu de [AG]")
check(d2(Fp, G) == 25 and d2(Fp, A) == 25, "FG = FA = 5")
check(d2(E, A) == d2(E, G) and Fp != E, "E et F sur la mediatrice de [AG]")
check(dot(vec(E, Fp), vec(A, G)) == 0, "(EF) perpendiculaire a (AG) (controle)")
# points de la mediatrice de [AG] : ceux de la droite (EF)
for x in grid1:
    for y in (F(-2), F(0), F(5, 2), F(4), F(7)):
        M = (x, y)
        check((d2(M, A) == d2(M, G)) == aligned(E, Fp, M), "mediatrice de [AG] = (EF)")
Mm = mid(A, Fp)
check(Mm == (F(3, 2), 2), "M(3/2, 2)")
check(d2(Mm, A) == d2(Mm, E) == d2(Mm, Fp) == F(25, 4) and exact_len(d2(Mm, A)) == F(5, 2), "MA = ME = MF = 5/2")
check(exact_len(d2(Mm, A)) == exact_len(d2(A, Fp)) / 2, "rayon = AF / 2 (cercle de diametre [AF])")
check(d2(Mm, B) == F(41, 4) and d2(Mm, B) != F(25, 4), "MB = sqrt(41)/2, B pas sur le cercle")
check(round(math.sqrt(d2(Mm, B)), 1) == 3.2 and math.isclose(math.sqrt(d2(Mm, B)), math.sqrt(41) / 2), "MB = sqrt(41)/2 ~ 3.2")
# cas general : carre de cote a
for _ in range(300):
    a = F(random.randint(1, 60), random.randint(1, 9))
    A2, B2, C2, D2 = (F(0), F(0)), (a, F(0)), (a, a), (F(0), a)
    E2 = mid(B2, C2)
    F2 = add(C2, mul(F(1, 4), vec(C2, D2)))
    check(E2 == (a, a / 2) and F2 == (3 * a / 4, a) and d2(C2, F2) == (a / 4) ** 2, "coordonnees E, F (cote a)")
    check(d2(A2, E2) == 5 * a * a / 4 and d2(E2, F2) == 5 * a * a / 16 and d2(A2, F2) == 25 * a * a / 16, "AE^2, EF^2, AF^2 (cote a)")
    check(d2(A2, E2) + d2(E2, F2) == d2(A2, F2), "AEF rectangle en E pour tout a")
    check((d2(A2, E2) + d2(E2, F2)) / (a * a) == F(20, 16) + F(5, 16) == d2(A2, F2) / (a * a), "20a^2/16 + 5a^2/16 = 25a^2/16")

print(f"all {ok} checks passed")
