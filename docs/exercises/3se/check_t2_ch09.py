"""Checks every value used in exercises T2 ch9 (Statistiques), 3eme Sc. exp.

Definitions used (manuel CNP, tome 2, ch. 9):
- moyenne  m = (1/N) sum n_i x_i ; variance V = (1/N) sum n_i x_i^2 - m^2 ; ecart-type = sqrt(V)
- valeurs rangees x_1 <= ... <= x_N : Q1 = x_(E(N/4)+1), Me = x_(E(N/2)+1), Q3 = x_(E(3N/4)+1)
  The data are chosen so that the other usual rank rules (x_ceil(pN), and for the median of an
  even series the mean of the two middle values) give the same results; this is checked below.
"""
from fractions import Fraction as F
import math

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def expand(values, counts):
    out = []
    for v, c in zip(values, counts):
        out += [F(v)] * c
    return out

def mean(vals, cnts):
    return F(sum(F(v) * c for v, c in zip(vals, cnts)), sum(cnts))

def var(vals, cnts):
    N = sum(cnts)
    return F(sum(F(v) ** 2 * c for v, c in zip(vals, cnts)), N) - mean(vals, cnts) ** 2

def var_def(vals, cnts):
    m, N = mean(vals, cnts), sum(cnts)
    return F(sum(c * (F(v) - m) ** 2 for v, c in zip(vals, cnts)), N)

def positions(data):
    """all usual rank rules; returns (Q1, Me, Q3) after checking that they agree"""
    N = len(data)
    x = lambda k: data[k - 1]  # 1-based rank
    q1 = {x(N // 4 + 1), x(math.ceil(F(N, 4)))}
    q3 = {x(3 * N // 4 + 1), x(math.ceil(F(3 * N, 4)))}
    me = {x(N // 2 + 1), x(math.ceil(F(N, 2)))}
    if N % 2 == 0:
        me.add((x(N // 2) + x(N // 2 + 1)) / 2)
    check(len(q1) == 1 and len(me) == 1 and len(q3) == 1, "les definitions usuelles coincident")
    return q1.pop(), me.pop(), q3.pop()

r2 = lambda t: round(float(t), 2)

# ================= Exercice 1 : notes de 35 eleves =================
X = [4, 6, 8, 9, 10, 11, 12, 14, 16, 18]
n = [1, 3, 4, 5, 7, 5, 4, 3, 2, 1]
N = sum(n)
check(N == 35, "N = 35")
check(max(n) == 7 and X[n.index(7)] == 10, "mode 10")
check(sum(c * v for v, c in zip(X, n)) == 364, "somme n_i x_i = 364")
m = mean(X, n)
check(m == F(52, 5), "moyenne 10.4")
check(sum(c * v * v for v, c in zip(X, n)) == 4090, "somme n_i x_i^2 = 4090")
V = var(X, n)
check(V == F(4090, 35) - F(52, 5) ** 2 and V == var_def(X, n), "variance (deux formules)")
check(V == F(6088, 700) and round(float(F(4090, 35)), 3) == 116.857, "V = 60.88/7, 4090/35 ~ 116.857")
check(round(float(V), 3) == 8.697, "V ~ 8.697")
s = math.sqrt(V)
check(round(s, 2) == 2.95 and round(s, 3) == 2.949, "sigma ~ 2.949")
cum = [sum(n[:i + 1]) for i in range(len(n))]
check(cum == [1, 4, 8, 13, 20, 25, 29, 32, 34, 35], "effectifs cumules")
data = expand(X, n)
Q1, Me, Q3 = positions(data)
check((N // 4 + 1, N // 2 + 1, 3 * N // 4 + 1) == (9, 18, 27), "rangs 9, 18, 27")
check((Q1, Me, Q3) == (9, 10, 12), "Q1 = 9, Me = 10, Q3 = 12")
check(Q3 - Q1 == 3, "ecart interquartile 3")
check(min(data) == 4 and max(data) == 18, "min 4, max 18")
check(sum(1 for t in data if Q1 <= t <= Q3) == 21, "21 notes dans [Q1, Q3]")
le = lambda v: sum(1 for t in data if t <= v)
ge = lambda v: sum(1 for t in data if t >= v)
check((le(Q1), ge(Q1), le(Me), ge(Me), le(Q3), ge(Q3)) == (13, 27, 20, 22, 29, 10), "comptages <= et >=")
check(4 * le(Q1) >= N and 4 * ge(Q1) >= 3 * N and 2 * le(Me) >= N and 2 * ge(Me) >= N
      and 4 * le(Q3) >= 3 * N and 4 * ge(Q3) >= N, "definition par les pourcentages (25 %, 50 %, 75 %)")
check([r2(100 * F(c, N)) for c in (13, 27, 20, 22, 29, 10)] == [37.14, 77.14, 57.14, 62.86, 82.86, 28.57], "pourcentages")
# intervalles [m - k s, m + k s]
check((r2(float(m) - s), r2(float(m) + s)) == (7.45, 13.35), "[m - s, m + s]")
check((r2(float(m) - 2 * s), r2(float(m) + 2 * s)) == (4.50, 16.30), "[m - 2s, m + 2s]")
check((r2(float(m) - 3 * s), r2(float(m) + 3 * s)) == (1.55, 19.25), "[m - 3s, m + 3s]")
c1 = sum(1 for t in data if float(m) - s <= t <= float(m) + s)
c2 = sum(1 for t in data if float(m) - 2 * s <= t <= float(m) + 2 * s)
c3 = sum(1 for t in data if float(m) - 3 * s <= t <= float(m) + 3 * s)
check((c1, c2, c3) == (25, 33, 35), "effectifs 25, 33, 35")
check((r2(100 * F(c1, N)), r2(100 * F(c2, N)), r2(100 * F(c3, N))) == (71.43, 94.29, 100.0), "pourcentages")
# harmonisation y = 0.8 x + 4
a, b = F(4, 5), 4
h = lambda t: a * t + b
check(h(20) == 20 and h(0) == 4 and h(4) == F(36, 5) and h(18) == F(92, 5), "y(20) = 20, y(4) = 7.2, y(18) = 18.4")
Y = [h(t) for t in X]
check(mean(Y, n) == a * m + b == F(308, 25), "nouvelle moyenne 12.32")
check(var(Y, n) == a * a * V, "nouvelle variance")
check(round(math.sqrt(var(Y, n)), 2) == 2.36 and round(0.8 * s, 3) == 2.359, "nouvel ecart-type ~ 2.36")
dY = expand(Y, n)
q1y, mey, q3y = positions(dY)
check((q1y, mey, q3y) == (h(Q1), h(Me), h(Q3)) == (F(56, 5), 12, F(68, 5)), "Q1' = 11.2, Me' = 12, Q3' = 13.6")
check(q3y - q1y == F(12, 5), "nouvel ecart interquartile 2.4")
ge10 = sum(1 for t in data if t >= 10)
ge10y = sum(1 for t in dY if t >= 10)
check((ge10, ge10y) == (22, 31), "22 puis 31 notes >= 10")
check(all((h(t) >= 10) == (t >= F(15, 2)) for t in X), "y >= 10 <=> x >= 7.5")
check((r2(100 * F(22, 35)), r2(100 * F(31, 35))) == (62.86, 88.57), "62.86 % puis 88.57 %")
# ecarts reduits
zA = (13 - float(m)) / s
zB = (14 - 11.5) / 3.2
check(round(zA, 2) == 0.88 and zB == 0.78125 and zA > zB, "Ali 0.88 > Sami 0.78")

# ================= Exercice 2 Partie A : tableau a deux entrees (50 eleves) =================
xs = [0, 2, 4, 6]          # heures de sport par semaine
ys = [3, 5, 7, 9]          # palier atteint
T = [[5, 3, 1, 0],         # ligne y = 3 ; colonnes x = 0, 2, 4, 6
     [3, 7, 4, 1],         # y = 5
     [1, 4, 7, 3],         # y = 7
     [0, 1, 4, 6]]         # y = 9
nx = [sum(T[i][j] for i in range(4)) for j in range(4)]
ny = [sum(T[i]) for i in range(4)]
NT = sum(nx)
check(NT == 50 and sum(ny) == 50, "N = 50")
check(nx == [9, 15, 16, 10] and ny == [9, 15, 15, 11], "effectifs marginaux")
check([F(100 * c, NT) for c in nx] == [18, 30, 32, 20], "frequences marginales de X (%)")
check([F(100 * c, NT) for c in ny] == [18, 30, 30, 22], "frequences marginales de Y (%)")
mx, my = mean(xs, nx), mean(ys, ny)
check(sum(c * v for v, c in zip(xs, nx)) == 154 and sum(c * v * v for v, c in zip(xs, nx)) == 676, "sommes X")
check(sum(c * v for v, c in zip(ys, ny)) == 306 and sum(c * v * v for v, c in zip(ys, ny)) == 2082, "sommes Y")
check(mx == F(308, 100) and my == F(612, 100), "moyennes 3.08 et 6.12")
vx, vy = var(xs, nx), var(ys, ny)
check(vx == F(40336, 10000) and vy == F(41856, 10000), "variances 4.0336 et 4.1856")
check(vx == var_def(xs, nx) and vy == var_def(ys, ny), "variances (deux formules)")
sx, sy = math.sqrt(vx), math.sqrt(vy)
check(round(sx, 2) == 2.01 and round(sy, 2) == 2.05, "ecarts-types 2.01 et 2.05")
check(round(sx, 3) == 2.008 and round(sy, 3) == 2.046, "ecarts-types 2.008 et 2.046")
check(round(100 * sx / float(mx)) == 65 and round(100 * sy / float(my)) == 33, "ecarts-types relatifs 65 % et 33 %")
check(round(100 * 2.01 / 3.08) == 65 and round(100 * 2.05 / 6.12) == 33, "memes arrondis avec sigma a 0.01")
check(13.52 == 676 / 50 and F(308, 100) ** 2 == F(94864, 10000), "13.52 et 3.08^2 = 9.4864")
check(F(2082, 50) == F(4164, 100) and F(612, 100) ** 2 == F(374544, 10000), "41.64 et 6.12^2 = 37.4544")
cumy = [sum(ny[:i + 1]) for i in range(4)]
check(cumy == [9, 24, 39, 50], "effectifs cumules de Y")
dYm = expand(ys, ny)
check(dYm[24] == dYm[25] == 7, "25e et 26e valeurs egales a 7")
check(positions(dYm) == (5, 7, 7), "Y : Q1 = 5, Me = 7, Q3 = 7")
check((NT // 4 + 1, NT // 2 + 1, 3 * NT // 4 + 1) == (13, 26, 38), "rangs 13, 26, 38")
# point moyen : meme resultat a partir du tableau
gx = F(sum(T[i][j] * xs[j] for i in range(4) for j in range(4)), NT)
gy = F(sum(T[i][j] * ys[i] for i in range(4) for j in range(4)), NT)
check((gx, gy) == (mx, my), "point moyen G(3.08, 6.12)")
both = sum(T[i][j] for i in range(4) for j in range(4) if xs[j] >= 4 and ys[i] >= 7)
low = sum(T[i][j] for i in range(4) for j in range(4) if xs[j] <= 2 and ys[i] >= 7)
check((both, low) == (20, 6), "20 et 6 eleves")
check((F(100 * both, NT), F(100 * low, NT)) == (40, 12), "40 % et 12 %")
check(nx[2] + nx[3] == 26 and nx[0] + nx[1] == 24, "26 eleves >= 4 h, 24 eleves <= 2 h")
check(ny[2] + ny[3] == 26, "26 eleves au palier >= 7")

# ================= Exercice 2 Partie B : ajustement affine (8 eleves) =================
pts = {1: (5, 2400), 2: (2, 2000), 3: (7, 2600), 4: (1, 1850),
       5: (3, 2150), 6: (8, 2740), 7: (2, 2100), 8: (6, 2520)}
check(sum(p[0] for p in pts.values()) == 34 and sum(p[1] for p in pts.values()) == 18360, "sommes 34 et 18360")
P = sorted(pts.values())
xs2 = [F(p[0]) for p in P]
ys2 = [F(p[1]) for p in P]
G = (sum(xs2) / 8, sum(ys2) / 8)
check(G == (F(17, 4), 2295), "G(4.25, 2295)")
G1 = (sum(xs2[:4]) / 4, sum(ys2[:4]) / 4)
G2 = (sum(xs2[4:]) / 4, sum(ys2[4:]) / 4)
check(xs2[:4] == [1, 2, 2, 3] and xs2[4:] == [5, 6, 7, 8], "partage du nuage")
check(G1 == (2, 2025) and G2 == (F(13, 2), 2565), "G1(2, 2025), G2(6.5, 2565)")
slope = (G2[1] - G1[1]) / (G2[0] - G1[0])
icpt = G1[1] - slope * G1[0]
check(slope == 120 and icpt == 1785, "y = 120 x + 1785")
check(slope * G[0] + icpt == G[1], "G sur (G1G2)")
check(G == ((G1[0] + G2[0]) / 2, (G1[1] + G2[1]) / 2), "G milieu de [G1G2] (parties de meme effectif)")
check(slope * F(9, 2) + icpt == 2325, "estimation pour 4.5 h : 2325 m")
xe = (2500 - icpt) / slope
check(xe == F(143, 24) and round(float(xe), 2) == 5.96, "2500 m <=> x ~ 5.96 h")

print(f"all {ok} checks passed")
