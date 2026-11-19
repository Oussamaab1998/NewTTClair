"""Checks every value used in exercises T2 ch6 (Produit scalaire dans l'espace, 3eme Sc. exp.)."""
from fractions import Fraction as F
import math, random

random.seed(6)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def V(*c): return tuple(F(x) for x in c)
def sub(u, v): return tuple(a - b for a, b in zip(u, v))
def add(*us): return tuple(sum(c) for c in zip(*us))
def mul(k, u): return tuple(F(k) * a for a in u)
def mid(P, Q): return mul(F(1, 2), add(P, Q))
def dot(u, v): return sum(a * b for a, b in zip(u, v))
def n2(u): return dot(u, u)                      # squared norm, exact
def colinear(u, v):
    return all(u[i] * v[j] - u[j] * v[i] == 0 for i in range(3) for j in range(3))
def det(u, v, w):
    a, b, c = u; a1, b1, c1 = v; a2, b2, c2 = w
    return a * (b1 * c2 - c1 * b2) - b * (a1 * c2 - c1 * a2) + c * (a1 * b2 - b1 * a2)

def sqrt_q(q):
    """Exact square root of a rational perfect square (fails otherwise)."""
    q = F(q)
    a, b = math.isqrt(q.numerator), math.isqrt(q.denominator)
    if q < 0 or a * a != q.numerator or b * b != q.denominator:
        raise SystemExit("FAIL: not a perfect square: " + str(q))
    return F(a, b)
def aire2(u, v):        # squared area of the triangle built on u, v (Lagrange identity), exact
    return (n2(u) * n2(v) - dot(u, v) ** 2) / 4
def aire(u, v):         # exact area when it is rational
    return sqrt_q(aire2(u, v))

rats = [F(random.randint(-40, 40), random.randint(1, 9)) for _ in range(120)]

# ================= Exercice 1 =================
A, B, C = V(1, 2, 0), V(3, 1, 2), V(3, 4, -1)
AB, AC, BC = sub(B, A), sub(C, A), sub(C, B)
check(AB == V(2, -1, 2) and AC == V(2, 2, -1) and BC == V(0, 3, -3), "composantes AB, AC, BC")
check(n2(AB) == 9 and n2(AC) == 9 and n2(BC) == 18, "AB = 3, AC = 3, BC = 3 sqrt2")
check(math.isclose(math.sqrt(18), 3 * math.sqrt(2)), "sqrt18 = 3 sqrt2")
check(dot(AB, AC) == 0, "AB.AC = 0")
check(n2(AB) + n2(AC) == n2(BC), "Pythagore (controle)")
BA = sub(A, B)
check(BA == V(-2, 1, -2) and dot(BA, BC) == 9, "BA.BC = 9")
cos2 = F(dot(BA, BC)) ** 2 / (n2(BA) * n2(BC))
check(cos2 == F(1, 2) and dot(BA, BC) > 0, "cos(ABC) = 1/sqrt2 = sqrt2/2")
check(math.isclose(math.acos(9 / (3 * math.sqrt(18))), math.pi / 4), "angle ABC = pi/4")
n = V(-1, 2, 2)
check(dot(n, AB) == 0 and dot(n, AC) == 0 and not colinear(AB, AC), "n normal a (ABC)")
check(n2(n) == 9, "||n|| = 3")
D = add(A, n)
check(D == V(0, 4, 2), "D(0, 4, 2)")
AD = sub(D, A)
check(n2(AD) == 9 and dot(AD, AB) == 0 and dot(AD, AC) == 0, "AD = 3, AD orthogonal a AB et AC")
check(det(AB, AC, AD) != 0, "D hors du plan (ABC)")
I = mid(B, C)
check(I == (3, F(5, 2), F(1, 2)), "I(3, 5/2, 1/2)")
AI, DI = sub(I, A), sub(I, D)
check(AI == (2, F(1, 2), F(1, 2)) and DI == (3, F(-3, 2), F(-3, 2)), "AI, DI")
check(dot(AI, BC) == 0 and dot(DI, BC) == 0, "AI.BC = DI.BC = 0")
check(not colinear(AI, DI), "AI, DI non colineaires")
check(F(3) / 2 * AI[1] == F(3, 4) and DI[1] == F(-3, 2), "k = 3/2 contradiction")
# volume
aireABC = aire(AB, AC)
check(aireABC == sqrt_q(n2(AB)) * sqrt_q(n2(AC)) / 2, "aire(ABC) = AB x AC / 2 (rectangle en A)")
Vol = F(1, 3) * aireABC * sqrt_q(n2(AD))
check(Vol == abs(det(AB, AC, AD)) / 6, "V = |det(AB, AC, AD)| / 6 (controle en repere orthonormal)")
check(aireABC == F(9, 2) and Vol == F(9, 2), "aire(ABC) = 9/2, V = 9/2")
K = mul(F(1, 3), add(B, C, D))
check(K == V(2, 3, 1), "K(2, 3, 1)")
AK, DB, DC = sub(K, A), sub(B, D), sub(C, D)
check(AK == V(1, 1, 1) and DB == V(3, -3, 0) and DC == V(3, 0, -3), "AK, DB, DC")
check(dot(AK, DB) == 0 and dot(AK, DC) == 0 and not colinear(DB, DC), "(AK) orthogonale a (BCD)")
check(det(DB, DC, sub(K, D)) == 0, "K dans le plan (BCD)")
check(n2(AK) == 3, "AK = sqrt3")
# aire(BCD) = 3V / AK = 27/(2 sqrt3) = 9 sqrt3 / 2 ; check squared
aire2BCD = (3 * Vol) ** 2 / n2(AK)
check(aire2BCD == aire2(DB, DC), "aire(BCD) = 3V/AK, egale a l'aire calculee par les vecteurs (au carre)")
check(aire2BCD == F(243, 4) and math.isclose(math.sqrt(243 / 4), 9 * math.sqrt(3) / 2), "aire(BCD) = 9 sqrt3 / 2")
check(math.isclose(27 / (2 * math.sqrt(3)), 9 * math.sqrt(3) / 2), "27/(2 sqrt3) = 9 sqrt3 / 2")
check(n2(DB) == 18 and n2(DC) == 18 and n2(BC) == 18, "BCD equilateral de cote 3 sqrt2")
check(n2(DI) == F(27, 2) and math.isclose(math.sqrt(27 / 2), 3 * math.sqrt(6) / 2), "DI = 3 sqrt6 / 2")
check(F(1, 4) * n2(BC) * n2(DI) == aire2BCD, "(1/2) BC.DI = 9 sqrt3 / 2 (au carre)")
check(math.isclose(0.5 * 3 * math.sqrt(2) * 3 * math.sqrt(6) / 2, 9 * math.sqrt(3) / 2), "(1/2)(3 sqrt2)(3 sqrt6/2)")
check(math.isclose(math.sqrt(3) / 4 * 18, 9 * math.sqrt(3) / 2), "formule du triangle equilateral (controle)")

# ================= Exercice 2 =================
O = V(0, 0, 0)
A, B, C, D, S = V(3, -3, 0), V(3, 3, 0), V(-3, 3, 0), V(-3, -3, 0), V(0, 0, 4)
AB, AD, BC = sub(B, A), sub(D, A), sub(C, B)
check(AB == V(0, 6, 0) and AD == V(-6, 0, 0) and BC == AD, "AB(0,6,0), AD(-6,0,0) = BC")
check(dot(AB, AD) == 0 and n2(AB) == 36 and n2(AD) == 36, "ABCD carre de cote 6")
check(mid(A, C) == O and mid(B, D) == O, "centre O")
AC = sub(C, A)
check(AC == V(-6, 6, 0) and not colinear(AB, AC), "A, B, C non alignes (AC(-6,6,0))")
check(det(AB, AC, sub(O, A)) == 0, "O dans le plan (ABC)")
check(sub(C, D) == AB, "AB = DC (parallelogramme)")
for P in (C, D):
    check(n2(sub(P, S)) == 34 and sub(P, S) in (V(-3, 3, -4), V(-3, -3, -4)), "SC, SD")
OS = sub(S, O)
check(dot(OS, AB) == 0 and dot(OS, AD) == 0, "(SO) orthogonale au plan de base")
for P in (A, B, C, D):
    check(n2(sub(P, S)) == 34, "aretes laterales = sqrt34")
check(sub(A, S) == V(3, -3, -4) and sub(B, S) == V(3, 3, -4), "SA, SB")
I = mid(A, B)
SI = sub(I, S)
check(I == V(3, 0, 0) and SI == V(3, 0, -4), "I(3,0,0), SI(3,0,-4)")
check(dot(SI, AB) == 0 and n2(SI) == 25, "SI orthogonal a AB, SI = 5")
aireSAB = aire(sub(A, S), sub(B, S))
check(aireSAB == sqrt_q(n2(AB)) * sqrt_q(n2(SI)) / 2, "aire(SAB) = AB x SI / 2")
check(aireSAB == 15, "aire(SAB) = 15")
for (P, Q) in ((B, C), (C, D), (D, A)):
    check(n2(sub(Q, P)) == 36 and n2(sub(P, S)) == 34 and n2(sub(Q, S)) == 34, "faces laterales isometriques (6, sqrt34, sqrt34)")
check(4 * aireSAB == 60, "60 m2 de toile")
SA, SB = sub(A, S), sub(B, S)
check(dot(SA, SB) == 16 and F(dot(SA, SB), 34) == F(8, 17), "cos(ASB) = 16/34 = 8/17")
ang = math.degrees(math.acos(8 / 17))
check(abs(ang - 61.9) < 0.05 and math.isclose(math.acos(8 / 17), 1.08, abs_tol=0.005), "ASB ~ 61.9 degres ~ 1.08 rad")
n = V(4, 0, 3)
check(dot(n, AB) == 0 and dot(n, SI) == 0 and not colinear(AB, SI), "n normal a (SAB)")
check(dot(n, SA) == 0 and dot(n, SB) == 0, "n orthogonal a SA et SB (controle)")
check(n2(n) == 25, "||n|| = 5")
# H = lambda n with IH.n = 0 : 25 lambda - 12 = 0
for lam in rats + [F(12, 25)]:
    H = mul(lam, n)
    val = dot(sub(H, I), n)
    check(val == 25 * lam - 12, "IH.n = 25 lambda - 12")
    check((val == 0) == (lam == F(12, 25)), "lambda = 12/25")
H = mul(F(12, 25), n)
check(H == V(F(48, 25), 0, F(36, 25)) and float(H[0]) == 1.92 and float(H[2]) == 1.44, "H(48/25, 0, 36/25)")
check(det(SA, SB, sub(H, S)) == 0, "H dans le plan (SAB)")
check(sub(H, I) == V(F(48, 25) - 3, 0, F(36, 25)) and dot(sub(mul(F(1, 1), H), I), n) == 0, "IH(4 lambda - 3, 0, 3 lambda)")
check(n2(H) == F(144, 25), "OH = 12/5")
check(F(12, 5) * 5 == 4 * 3 and n2(sub(I, O)) == 9 and n2(OS) == 16, "controle OH x SI = OS x OI")
mu = sub(H, S)[0] / SI[0]
check(mu == F(16, 25) and add(S, mul(mu, SI)) == H and 0 <= mu <= 1, "H sur [SI] (mu = 16/25 dans [0, 1])")
check(sub(H, S) == V(F(48, 25), 0, F(-64, 25)), "SH(48/25, 0, -64/25)")
SO_len = sqrt_q(n2(OS))
aireABD = aire(AB, AD)
aireABCD = 2 * aireABD
check(SO_len == 4 and aireABD == 18 and aireABCD == 36, "SO = 4, aire(ABD) = 18, aire(ABCD) = 36")
Vol = F(1, 3) * aireABCD * SO_len
check(Vol == 48, "V = 48")
VolSABD = F(1, 3) * aireABD * SO_len
check(VolSABD == 24 and VolSABD == abs(det(sub(A, S), sub(B, S), sub(D, S))) / 6, "V(SABD) = 24 (controle par le determinant)")
dD = 3 * VolSABD / aireSAB
check(dD == F(24, 5), "d(D, (SAB)) = 24/5")
# direct check by orthogonal projection of D on (SAB)
lamD = -dot(sub(D, I), n) / n2(n)
HD = add(D, mul(lamD, n))
check(dot(sub(HD, I), n) == 0 and n2(sub(HD, D)) == dD ** 2, "projection de D : distance 24/5")
check(lamD == F(24, 25) and sub(D, I) == V(-6, -3, 0) and dot(sub(D, I), n) == -24, "lambda_D = 24/25, ID.n = -24")
check(F(1, 3) * aireSAB == 5, "(1/3) aire(SAB) = 5")
# 5. a) MA^2 - MB^2 = 2 IM.AB  (so MA = MB <=> IM.AB = 0)
for _ in range(400):
    M = tuple(random.choice(rats) for _ in range(3))
    check(n2(sub(A, M)) - n2(sub(B, M)) == 2 * dot(sub(M, I), AB), "MA^2 - MB^2 = 2 IM.AB")
check(sub(S, I) == V(-3, 0, 4) and sub(O, I) == V(-3, 0, 0), "IS, IO")
for P in (S, O, mid(C, D)):
    check(dot(sub(P, I), AB) == 0 and n2(sub(A, P)) == n2(sub(B, P)), "S, O, milieu de [CD] dans le plan")
check(not colinear(sub(S, I), sub(O, I)), "S, O, I non alignes")
IS, IO = sub(S, I), sub(O, I)
check(dot(IS, AB) == 0 and dot(IO, AB) == 0, "5. b) IS.AB = 0, IO.AB = 0")
for a in rats[:25]:
    for b in rats[25:50]:
        M = add(I, mul(a, IS), mul(b, IO))
        check(dot(sub(M, I), AB) == 0, "5. c) IM.AB = a IS.AB + b IO.AB = 0")
        check(n2(sub(A, M)) == n2(sub(B, M)), "5. c) MA = MB pour M dans (SOI)")

print(f"all {ok} checks passed; angle ASB = {ang:.2f} degres")
