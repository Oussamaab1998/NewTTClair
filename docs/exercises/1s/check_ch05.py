"""Checks every claim in the exercises of chapter 5 (1ere annee,
somme de deux vecteurs, vecteurs colineaires).

Each figure is placed in a coordinate system inside this script. Exact
arithmetic with fractions; numbers a*sqrt(7) are handled through their
squares; floats only for angles and approximate values."""
from fractions import Fraction as F
import math, random

random.seed(5)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1


def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def vsum(*us): return (sum(u[0] for u in us), sum(u[1] for u in us))
def mul(k, u): return (k * u[0], k * u[1])
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def n2(u): return dot(u, u)
def d2(P, Q): return n2(vec(P, Q))
def mid(P, Q): return ((P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2)
def aligned(P, Q, R): return det(vec(P, Q), vec(P, R)) == 0
def parallelogram(P, Q, R, S): return mid(P, R) == mid(Q, S) and not aligned(P, Q, R)
def on_segment(P, Q, M): return aligned(P, Q, M) and dot(vec(M, P), vec(M, Q)) <= 0
def rnd(): return F(random.randint(-30, 30), random.randint(1, 7))
def rpt(): return (rnd(), rnd())
ZERO = (0, 0)

# ======================= Exercice 1 : triangle ABC, I milieu de [BC], J milieu de [AC]
done = 0
while done < 300:
    A, B, C = rpt(), rpt(), rpt()
    if aligned(A, B, C):
        continue
    done += 1
    I, J = mid(B, C), mid(A, C)
    # 1. a) D : vec(AD) = vec(AB) + vec(AC) ; ABDC parallelogramme
    D = add(A, vsum(vec(A, B), vec(A, C)))
    check(parallelogram(A, B, D, C), "ABDC parallelogramme")
    check(vec(A, B) == vec(C, D) and vec(A, C) == vec(B, D), "cotes opposes de ABDC")
    # 1. b) I milieu de [AD], vec(AB) + vec(AC) = 2 vec(AI)
    check(mid(A, D) == I, "I milieu de [AD]")
    check(vec(A, D) == mul(2, vec(A, I)), "vec(AD) = 2 vec(AI)")
    check(vsum(vec(A, B), vec(A, C)) == mul(2, vec(A, I)), "vec(AB) + vec(AC) = 2 vec(AI)")
    # 2. E : vec(BE) = vec(BA) + vec(BC) ; BAEC parallelogramme
    E = add(B, vsum(vec(B, A), vec(B, C)))
    check(parallelogram(B, A, E, C), "BAEC parallelogramme")
    check(vec(C, E) == vec(B, A) and vec(C, D) == vec(A, B), "vec(CE) = vec(BA), vec(CD) = vec(AB)")
    check(vsum(vec(A, B), vec(B, A)) == ZERO, "vec(AB) + vec(BA) = 0")
    check(vsum(vec(C, D), vec(C, E)) == ZERO, "vec(CD) + vec(CE) = 0")
    check(det(vec(B, D), vec(A, C)) == 0 and det(vec(C, D), vec(A, B)) == 0, "construction de D")
    check(det(vec(A, E), vec(B, C)) == 0 and det(vec(C, E), vec(B, A)) == 0, "construction de E")
    check(mid(D, E) == C, "C milieu de [DE]")
    # 3. vec(ED) = 2 vec(AB) ; ABDE trapeze
    check(vec(E, C) == vec(A, B), "vec(EC) = vec(AB)")
    check(vsum(vec(E, C), vec(C, D)) == vec(E, D), "Chasles vec(EC) + vec(CD) = vec(ED)")
    check(vec(E, D) == mul(2, vec(A, B)), "vec(ED) = 2 vec(AB)")
    check(vsum(vec(A, B), vec(A, B)) == mul(2, vec(A, B)), "vec(AB) + vec(AB) = 2 vec(AB)")
    check(d2(E, D) == 4 * d2(A, B), "ED = 2 AB")
    check(det(vec(A, B), vec(E, D)) == 0 and not aligned(A, B, D) and not aligned(A, B, E),
          "(AB) // (ED), droites distinctes")
    check(d2(E, D) != d2(A, B), "ABDE n'est pas un parallelogramme (trapeze)")
    # 4. centre de gravite G
    G = ((A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3)
    check(aligned(B, G, J) and aligned(C, G, mid(A, B)) and aligned(A, G, I), "G sur les trois medianes")
    check(vec(A, G) == mul(F(2, 3), vec(A, I)), "vec(AG) = 2/3 vec(AI)")
    check(vec(A, G) == mul(F(1, 3), vec(A, D)), "vec(AG) = 1/3 vec(AD)")
    check(vsum(vec(I, B), vec(I, C)) == ZERO, "vec(IB) + vec(IC) = 0")
    check(vsum(vec(G, B), vec(G, C)) == mul(2, vec(G, I)), "vec(GB) + vec(GC) = 2 vec(GI)")
    Gp = add(G, mul(2, vec(G, I)))                       # symetrique de G par rapport a I
    check(mid(G, Gp) == I, "G' symetrique de G par rapport a I")
    check(d2(G, I) * 9 == d2(A, I) and d2(A, G) == d2(G, Gp) and on_segment(A, Gp, G), "AG = GG' = 2 GI, G entre A et G'")
    check(mid(A, Gp) == G, "G milieu de [AG']")
    check(vsum(vec(G, A), vec(G, B), vec(G, C)) == ZERO, "vec(GA) + vec(GB) + vec(GC) = 0")
    # 5. J milieu de [BE] ; vec(BG) = 1/3 vec(BE)
    check(mid(B, E) == J, "J milieu de [BE]")
    check(vec(B, G) == mul(F(2, 3), vec(B, J)), "vec(BG) = 2/3 vec(BJ)")
    check(vec(B, G) == mul(F(1, 3), vec(B, E)), "vec(BG) = 1/3 vec(BE)")
    check(aligned(B, G, E) and on_segment(B, E, G), "B, G, E alignes, G sur [BE]")

# ======================= Exercice 2 : la barque (unite : le metre ; repere : x le long des rives)
# d : y = 0 ; d' : y = 120 ; A(0, 0) ; H(0, 120).
A, H = (F(0), F(0)), (F(0), F(120))
u, v = (F(0), F(60)), (F(45), F(0))
check(dot(u, v) == 0 and n2(u) == 60 ** 2 and n2(v) == 45 ** 2, "u perpendiculaire aux rives (60 m), v parallele (45 m)")
# 1. P, Q, M1 ; APM1Q rectangle ; AM1 = 75
P, Q = add(A, u), add(A, v)
M1 = add(A, vsum(u, v))
check(parallelogram(A, P, M1, Q), "APM1Q parallelogramme")
check(dot(vec(A, P), vec(A, Q)) == 0, "angle droit en A : rectangle")
check(vec(P, M1) == v and d2(P, M1) == 45 ** 2, "PM1 = AQ = 45")
check(M1[1] == P[1] and M1[0] == Q[0], "construction de M1 (parallele a d par P, perpendiculaire par Q)")
check(d2(A, M1) == 75 ** 2 and d2(A, P) + d2(P, M1) == d2(A, M1), "AM1 = 75 (Pythagore dans APM1)")
# 2. M2 ; vec(AM2) = 2 vec(AM1) ; M1 milieu de [AM2]
M2 = add(M1, vsum(u, v))
check(vsum(vec(A, M1), vec(M1, M2)) == vec(A, M2) == mul(2, vec(A, M1)), "vec(AM2) = 2 vec(AM1)")
check(aligned(A, M1, M2) and mid(A, M2) == M1, "A, M1, M2 alignes, M1 milieu de [AM2]")
check(mid(A, H) == P and vec(A, H) == mul(2, u), "P milieu de [AH]")
# route de Chasles du corrige
check(vsum(vec(H, P), vec(P, M1), vec(M1, M2)) == vec(H, M2), "Chasles : vec(HM2) = vec(HP) + vec(PM1) + vec(M1M2)")
check(vec(H, P) == vec(P, A) and vec(M1, M2) == vec(A, M1), "vec(HP) = vec(PA), vec(M1M2) = vec(AM1)")
check(vsum(vec(P, A), vec(A, M1)) == vec(P, M1), "vec(PA) + vec(AM1) = vec(PM1)")
check(vec(H, M2) == mul(2, vec(P, M1)) and vec(P, M1) == vec(A, Q) == v, "vec(HM2) = 2 vec(PM1) = 2 v")
check(det(vec(H, M2), v) == 0 and M2[1] == H[1] == 120, "(HM2) parallele aux rives : M2 sur d'")
check(d2(H, M2) == 90 ** 2 and d2(A, M2) == 150 ** 2, "HM2 = 90, AM2 = 150")
check(dot(vec(H, A), vec(H, M2)) == 0, "AHM2 rectangle en H")
tanH = math.sqrt(d2(H, M2)) / math.sqrt(d2(A, H))
ang = math.degrees(math.atan(tanH))
check(tanH == 0.75 and round(ang, 1) == 36.9, "tan(HAM2) = 0.75, angle HAM2 = 36.9 degres")
# 3. w : |w| = 60, dirige vers d' (composante y > 0), N = W + v sur la demi-droite [AH).
# Recherche sur le demi-cercle de rayon 60 : w = 60 (cos t, sin t), 0 < t < pi.
# f(t) = abscisse de N = 60 cos t + v_x est strictement decroissante : une seule solution, par dichotomie.
vx = float(v[0])
f = lambda t: 60 * math.cos(t) + vx
grid_t = [k * math.pi / 3600 for k in range(1, 3600)]
sign_changes = [k for k in range(len(grid_t) - 1) if f(grid_t[k]) * f(grid_t[k + 1]) <= 0]
check(len(sign_changes) == 1, "une seule direction de w met N sur (AH) du cote de d'")
lo, hi = grid_t[sign_changes[0]], grid_t[sign_changes[0] + 1]
for _ in range(80):
    mid_t = (lo + hi) / 2
    lo, hi = (mid_t, hi) if f(mid_t) > 0 else (lo, mid_t)
t0 = (lo + hi) / 2
w = (60 * math.cos(t0), 60 * math.sin(t0))
Af = (0.0, 0.0); Hf = (0.0, 120.0)
W = (Af[0] + w[0], Af[1] + w[1])
N = (W[0] + vx, W[1] + float(v[1]))                 # image de W par la translation de vecteur v
check(abs(N[0]) < 1e-9 and N[1] > 0, "N sur la demi-droite [AH)")
check(math.isclose(w[0], -45, abs_tol=1e-9) and math.isclose(w[1], 15 * math.sqrt(7)), "w = (-45, 15 sqrt7)")
# valeur exacte : la composante de w le long des rives est l'opposee de celle de v
a = -v[0]
b2 = 60 ** 2 - a * a
check(b2 == 1575 == 225 * 7 and math.isclose(math.sqrt(b2), w[1]), "AN^2 = 1575 = 225 * 7, AN = 15 sqrt7")
vAN = (N[0] - Af[0], N[1] - Af[1])
check(math.isclose(vAN[0], w[0] + vx, abs_tol=1e-9) and math.isclose(vAN[1], w[1] + float(v[1])), "Chasles : vec(AN) = vec(AW) + vec(WN) = w + v")
dWN = (N[0] - W[0], N[1] - W[1]); dNA = (Af[0] - N[0], Af[1] - N[1])
check(abs(dWN[0] * dNA[0] + dWN[1] * dNA[1]) < 1e-9, "ANW rectangle en N")
AN = math.hypot(*vAN); WN = math.hypot(*dWN); AW = math.hypot(*w)
check(math.isclose(AN ** 2 + WN ** 2, AW ** 2) and math.isclose(AW, 60) and math.isclose(WN, 45), "Pythagore ANW : AW = 60, WN = 45")
check(math.isclose(AN, 15 * math.sqrt(7)) and round(AN, 1) == 39.7, "AN = 15 sqrt7 = 39.7")
angW = math.degrees(math.atan2(abs(w[0] * vAN[1] - w[1] * vAN[0]), w[0] * vAN[0] + w[1] * vAN[1]))
check(math.isclose(math.sin(math.radians(angW)), WN / AW) and round(angW, 1) == 48.6, "angle WAN = 48.6 degres (sin = 3/4)")
check(W[0] < 0 < vx, "W du cote oppose au courant (en amont)")
AH = math.sqrt(d2(A, H))
T = AH / AN
check(F(d2(A, H)) / b2 == F(64, 7) and math.isclose(T, 8 / math.sqrt(7)) and math.isclose(T, 8 * math.sqrt(7) / 7), "duree^2 = 120^2 / 1575 = 64/7 : duree = 8 sqrt7 / 7")
check(round(T, 2) == 3.02 and round((T - 3) * 60) == 1, "duree = 3.02 min, environ 3 min 1 s")
# 4. comparaison : premiere traversee (duree = nombre de minutes pour atteindre y = 120)
t1 = H[1] / vsum(u, v)[1]
check(t1 == 2 and add(A, mul(t1, vsum(u, v))) == M2, "premiere traversee : 2 min, arrivee en M2")
check(d2(A, H) < d2(A, M2) and math.sqrt(d2(A, H)) == 120 and math.sqrt(d2(A, M2)) == 150, "longueurs : 120 m < 150 m")
check(t1 < T and math.sqrt(d2(H, M2)) == 90, "deuxieme traversee plus longue en temps ; premiere arrivee a 90 m de H")

print(f"all {ok} checks passed")
