"""Checks every claim in the exercises of chapter 1 (1ere annee secondaire, angles).

Each figure is built in a coordinate system from the data of the statement only
(given lengths, given angles, intersections of lines); every angle, length,
parallelism and position claimed in the corrigé is then measured on the
coordinates (floats, tolerance 1e-9)."""
import math, random

random.seed(11)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

EPS = 1e-9
def close(x, y, eps=EPS): return abs(x - y) < eps
def vec(P, Q): return (Q[0] - P[0], Q[1] - P[1])
def add(P, u): return (P[0] + u[0], P[1] + u[1])
def mul(k, u): return (k * u[0], k * u[1])
def dot(u, v): return u[0] * v[0] + u[1] * v[1]
def det(u, v): return u[0] * v[1] - u[1] * v[0]
def dist(P, Q): return math.hypot(Q[0] - P[0], Q[1] - P[1])
def unit(u):
    n = math.hypot(*u)
    return (u[0] / n, u[1] / n)
def rot(u, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (c * u[0] - s * u[1], s * u[0] + c * u[1])
def angle(P, V, Q):
    """measure in degrees of the geometric angle PVQ (vertex V)"""
    u, w = unit(vec(V, P)), unit(vec(V, Q))
    return math.degrees(math.acos(max(-1.0, min(1.0, dot(u, w)))))
def inter(P, u, Q, w):
    """intersection point of the line through P directed by u and the line through Q directed by w"""
    d = det(u, w)
    if abs(d) < 1e-12:
        return None
    s = det(vec(P, Q), w) / d
    return add(P, mul(s, u))
def strictly_on_segment(M, P, Q):
    return close(det(unit(vec(P, Q)), vec(P, M)), 0) and dot(vec(M, P), vec(M, Q)) < -EPS
def parallel(u, v): return close(det(unit(u), unit(v)), 0)
def side(P, Q, M): return det(vec(P, Q), vec(P, M))  # its sign tells on which side of (PQ) M lies


# ======================= Exercice 1 =======================
def ex1_figure(beta, gamma, a_cdf=None, BC=7.0):
    """Triangle with BC given, angle ABC = beta, angle ACB = gamma; D, E, F built as in the statement."""
    B, C = (0.0, 0.0), (BC, 0.0)
    A = inter(B, rot((1.0, 0.0), beta), C, rot((-1.0, 0.0), -gamma))   # rays [Bx) and [Cy), same side of (BC)
    bis = add(unit(vec(B, A)), unit(vec(B, C)))                         # direction of the bisector of ABC
    D = inter(B, bis, A, vec(A, C))
    E = inter(D, vec(B, C), A, vec(A, B))                               # parallel to (BC) through D
    if a_cdf is None:
        a_cdf = angle(B, A, C)
    cands = []
    for sgn in (1, -1):                                                 # the two rays [Dz) with angle CDz = a_cdf
        P = inter(D, rot(vec(D, C), sgn * a_cdf), B, vec(B, C))
        if P is not None and strictly_on_segment(P, B, C) and dot(vec(D, P), rot(vec(D, C), sgn * a_cdf)) > 0:
            cands.append(P)
    return A, B, C, D, E, cands

A, B, C, D, E, cands = ex1_figure(60.0, 40.0, 80.0)
check(A[1] > 0 and close(dist(B, C), 7), "1: triangle construit, BC = 7")
check(close(angle(A, B, C), 60) and close(angle(A, C, B), 40), "1: angles donnes 60 et 40")
check(close(angle(B, A, C), 80), "1: angle BAC = 80")
check(strictly_on_segment(D, A, C), "2: D sur le segment [AC]")
check(close(angle(A, B, D), 30) and close(angle(D, B, C), 30), "2a: ABD = DBC = 30")
check(close(angle(B, A, D), 80), "2b: angle BAD = angle BAC")
check(close(angle(A, D, B), 70), "2b: ADB = 70")
check(close(angle(B, D, C), 110), "2b: BDC = 110")
check(close(angle(D, B, C) + angle(B, C, D) + angle(B, D, C), 180), "2b: controle 30 + 40 + 110 = 180")
check(close(angle(A, D, B), angle(D, B, C) + angle(D, C, B)), "2b: angle exterieur ADB = DBC + DCB")
check(strictly_on_segment(E, A, B), "3: E sur le segment [AB]")
check(parallel(vec(E, D), vec(B, C)), "3: (ED) // (BC)")
check(side(B, D, E) * side(B, D, C) < 0, "3a: E et C de part et d'autre de (BD) : angles alternes-internes")
check(close(angle(E, D, B), 30), "3a: EDB = 30")
check(close(angle(E, B, D), 30), "3a: EBD = 30")
check(close(dist(E, B), dist(E, D)) and not close(dist(E, B), dist(B, D)), "3a: EBD isocele en E (non equilateral)")
check(close(angle(A, E, D), 60) and close(angle(A, D, E), 40), "3b: AED = 60, ADE = 40")
check(close(angle(E, A, D) + angle(A, E, D) + angle(A, D, E), 180), "3b: controle 80 + 60 + 40 = 180")
check(len(cands) == 1, "4: un seul point F de [BC] tel que CDF = 80")
F = cands[0]
check(close(angle(C, D, F), 80) and not close(dist(F, B), 0), "4: CDF = 80, F distinct de B")
check(side(A, C, F) * side(A, C, B) > 0 and dot(vec(D, C), vec(A, C)) > 0,
      "4a: CDF et CAB en position de correspondants (F et B du meme cote de (AC), [DC) et [AC) de meme sens)")
check(close(angle(C, A, B), angle(C, D, F)), "4a: CDF = CAB")
check(parallel(vec(D, F), vec(A, B)), "4a: (DF) // (AB)")
check(close(vec(B, E)[0], vec(F, D)[0]) and close(vec(B, E)[1], vec(F, D)[1]), "4b: BEDF parallelogramme")
sides = [dist(B, E), dist(E, D), dist(D, F), dist(F, B)]
check(all(close(s, sides[0]) for s in sides), "4b: BEDF losange (quatre cotes egaux)")
check(close(angle(E, B, F), 60) and close(angle(B, E, D), 120), "5a: EBF = 60, BED = 120")
check(close(angle(E, D, F), 60) and close(angle(D, F, B), 120), "5a: EDF = 60, DFB = 120")
check(close(angle(E, B, F) + angle(D, F, B), 180), "5a: EBF et DFB interieurs d'un meme cote supplementaires")
check(close(angle(E, D, F) + angle(D, F, B), 180), "5a: EDF et DFB supplementaires")
check(close(angle(D, F, C), 60), "5a: controle DFC = 60 dans le triangle DFC")
check(close(angle(E, B, F) + angle(B, E, D) + angle(E, D, F) + angle(D, F, B), 360), "5a: somme 360")
check(side(B, D, A) * side(B, D, F) < 0, "5b: A et F de part et d'autre de (BD) : alternes-internes")
check(close(angle(B, D, F), 30) and close(angle(D, B, A), 30), "5b: BDF = DBA = 30")
check(close(angle(E, D, B), angle(B, D, F)), "5b: [DB) bissectrice de EDF")
check(close(dot(unit(vec(E, F)), unit(vec(B, D))), 0), "5b: (EF) perpendiculaire a (BD)")
check(close(dist(F, B), dist(F, D)), "5b: E et F sur la mediatrice de [BD]")

# the reasoning of the exercise holds in any triangle (F defined by angle CDF = angle BAC)
done = 0
while done < 300:
    beta = random.uniform(15, 130)
    gamma = random.uniform(10, 170 - beta)
    A, B, C, D, E, cands = ex1_figure(beta, gamma)
    done += 1
    check(strictly_on_segment(D, A, C) and strictly_on_segment(E, A, B), "gen: D sur [AC], E sur [AB]")
    check(close(dist(E, B), dist(E, D)), "gen: EB = ED")
    check(close(angle(A, D, B), 180 - angle(B, A, C) - beta / 2), "gen: ADB = 180 - A - B/2")
    check(len(cands) == 1, "gen: F unique sur [BC]")
    F = cands[0]
    check(parallel(vec(D, F), vec(A, B)), "gen: (DF) // (AB)")
    sides = [dist(B, E), dist(E, D), dist(D, F), dist(F, B)]
    check(all(close(s, sides[0]) for s in sides), "gen: BEDF losange")
    check(close(dot(unit(vec(E, F)), unit(vec(B, D))), 0), "gen: (EF) perpendiculaire a (BD)")


# ======================= Exercice 2 : le cadran =======================
R = 10.0
O = (0.0, 0.0)
H = {k: (R * math.cos(math.radians(90 - 30 * k)), R * math.sin(math.radians(90 - 30 * k))) for k in range(1, 13)}
check(close(H[12][0], 0) and close(H[12][1], 10) and close(H[3][0], 10) and close(H[3][1], 0),
      "H12 en haut, H3 a droite (sens des aiguilles d'une montre)")
# 1.
for k in range(1, 13):
    check(close(angle(H[k], O, H[k % 12 + 1]), 30), "1a: angle au centre entre deux graduations = 30")
check(close(12 * 30, 360), "1a: 12 x 30 = 360")
check(close(angle(H[12], O, H[4]), 120), "1b: H12 O H4 = 120")
check(close(angle(H[12], O, H[2]), 60), "1c: H12 O H2 = 60")
check(close(angle(O, H[12], H[2]), 60) and close(angle(O, H[2], H[12]), 60), "1c: angles a la base 60")
check(close(dist(H[12], H[2]), 10) and close(dist(O, H[12]), 10) and close(dist(O, H[2]), 10),
      "1c: O H12 H2 equilateral, H12H2 = 10")
# 2.
check(side(H[12], H[4], H[8]) * side(H[12], H[4], H[2]) < 0, "2a: H8 n'est pas sur l'arc H12 H1 H2 H3 H4")
check(side(H[12], H[4], H[10]) * side(H[12], H[4], H[2]) < 0, "2b: H10 non plus")
check(close(angle(H[12], H[8], H[4]), 60), "2a: H12 H8 H4 = 60")
check(close(angle(H[12], H[8], H[4]), angle(H[12], O, H[4]) / 2), "2a: angle inscrit = moitie de l'angle au centre")
check(close(angle(H[12], H[10], H[4]), 60), "2b: H12 H10 H4 = 60")
check(close(angle(H[4], O, H[8]), 120) and close(angle(H[4], H[12], H[8]), 60), "2c: H4 O H8 = 120, H4 H12 H8 = 60")
check(close(angle(H[12], H[4], H[8]), 60), "2c: troisieme angle 60")
check(close(dist(H[12], H[4]), dist(H[4], H[8])) and close(dist(H[4], H[8]), dist(H[8], H[12])),
      "2c: triangle H12 H4 H8 equilateral")
# 3.
check(close(H[12][0] + H[6][0], 0) and close(H[12][1] + H[6][1], 0) and close(dist(H[12], H[6]), 20),
      "3a: [H12 H6] diametre (O milieu), longueur 20")
check(close(angle(H[12], O, H[6]), 180), "3a: H12 O H6 = 6 x 30 = 180")
check(close(angle(H[12], H[4], H[6]), 90), "3a: triangle H12 H4 H6 rectangle en H4")
check(close(angle(H[4], O, H[6]), 60) and close(dist(H[4], H[6]), 10), "3b: H4 O H6 = 60, H4H6 = 10")
check(close(dist(H[12], H[4]) ** 2, 400 - 100) and close(dist(H[12], H[4]), 10 * math.sqrt(3)),
      "3b: H12H4^2 = 300, H12H4 = 10 sqrt 3")
check(round(10 * math.sqrt(3), 2) == 17.32, "3b: 10 sqrt 3 ~ 17.32")
check(close(dist(H[12], H[8]), 10 * math.sqrt(3)), "3b: c'est aussi le cote H12H8")
for _ in range(200):
    t = random.uniform(0, 360)
    M = (R * math.cos(math.radians(t)), R * math.sin(math.radians(t)))
    if dist(M, H[12]) < 1e-3 or dist(M, H[6]) < 1e-3:
        continue
    check(close(angle(H[12], M, H[6]), 90, 1e-7), "3c: point du cercle -> angle droit")
    r = random.choice([random.uniform(0.5, 9.5), random.uniform(10.5, 30)])
    P = (r * math.cos(math.radians(t)), r * math.sin(math.radians(t)))
    if abs(P[0]) < 1e-3:
        continue  # P on the line (H12 H6): angle 0 or 180
    a = angle(H[12], P, H[6])
    check((a > 90) if r < 10 else (a < 90), "3c: hors du cercle l'angle n'est pas droit")
# 4.
check(close(angle(H[7], O, H[11]), 120) and close(angle(H[1], O, H[5]), 120), "4a: angles au centre 120")
check(side(H[1], H[11], H[7]) * side(H[1], H[11], H[9]) > 0 and side(H[7], H[5], H[1]) * side(H[7], H[5], H[3]) > 0,
      "4a: arcs interceptes H11 H10 H9 H8 H7 et H5 H4 H3 H2 H1")
check(close(angle(H[11], H[1], H[7]), 60), "4a: H11 H1 H7 = 60")
check(close(angle(H[5], H[7], H[1]), 60), "4a: H5 H7 H1 = 60")
check(close(H[1][0] + H[7][0], 0) and close(H[1][1] + H[7][1], 0), "4b: [H1 H7] diametre")
s8 = side(H[1], H[7], H[8])
check(all(side(H[1], H[7], H[k]) * s8 > 0 for k in (8, 9, 10, 11, 12)) and all(side(H[1], H[7], H[k]) * s8 < 0 for k in (2, 3, 4, 5)),
      "4b: H8..H12 d'un cote de (H1H7), H2..H5 de l'autre")
check(side(H[1], H[7], H[11]) * side(H[1], H[7], H[5]) < 0, "4b: H11 et H5 de part et d'autre : alternes-internes")
check(parallel(vec(H[1], H[11]), vec(H[5], H[7])), "4b: (H1H11) // (H5H7)")
# 5. simulation of the two hands (t = minutes after 12 h)
def hand_angles(t):
    hour = (t * 360 / (12 * 60)) % 360     # one turn in 12 h
    minute = (t * 360 / 60) % 360          # one turn in 60 min
    return hour, minute
def between_hands(t):
    h, m = hand_angles(t)
    d = abs(h - m) % 360
    return min(d, 360 - d)
def hand_point(a, r=R):  # point of the dial at angle a measured clockwise from [O H12)
    return (r * math.cos(math.radians(90 - a)), r * math.sin(math.radians(90 - a)))
h4, m4 = hand_angles(4 * 60)
check(close(dist(hand_point(h4), H[4]), 0) and close(dist(hand_point(m4), H[12]), 0), "1b: a 4 h, aiguilles vers H4 et H12")
check(close(between_hands(4 * 60), 120), "1b: angle 120 a 4 h")
check(close(hand_angles(61)[0] - hand_angles(1)[0], 30), "5b: l'aiguille des heures tourne de 30 par heure")
check(close(hand_angles(1)[1] - hand_angles(0)[1], 6), "5a: l'aiguille des minutes tourne de 6 par minute")
swept = (hand_angles(4 * 60 + 20)[1] - hand_angles(4 * 60)[1]) % 360
check(close(swept, 120), "5a: balayage de 120 entre 4 h et 4 h 20")
check(close(dist(hand_point(hand_angles(260)[1]), H[4]), 0), "5a: a 4 h 20 l'aiguille des minutes est vers H4")
area = math.pi * 9 ** 2 * swept / 360
check(close(area, 27 * math.pi) and round(area, 2) == 84.82, "5a: aire = 27 pi ~ 84.82")
check(close(hand_angles(260)[0], 130), "5b: aiguille des heures a 130 a 4 h 20")
check(close(between_hands(260), 10), "5b: angle entre les aiguilles a 4 h 20 = 10")

print(f"all {ok} checks passed")
