"""Checks every value and claim used in exercises T2 ch1 (Suites arithmetiques), 2eme Sciences.

Sequences are built by iterating their definition (U_{n+1} = U_n + r, or the given recurrence)
and compared with the closed forms and sums written in the corrige; sums are also added term by
term; "smallest n" and "is k a term" claims are checked by scanning n.
"""
from fractions import Fraction as F
import math, os, random

random.seed(2)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def is_arith(terms):
    d = [terms[i + 1] - terms[i] for i in range(len(terms) - 1)]
    return all(x == d[0] for x in d)

# ================= Exercice 1 =================
# 1. a) a_n = (5 - 3n)/2
a = [F(5 - 3 * n, 2) for n in range(200)]
check(is_arith(a) and a[0] == F(5, 2) and a[1] - a[0] == F(-3, 2), "a_n arithmetique, a0 = 2.5, r = -1.5")
for n in range(200):
    check(F(5 - 3 * (n + 1), 2) - F(5 - 3 * n, 2) == F(-3, 2), "a_{n+1} - a_n = -3/2")
# 1. b) b0 = 4, b_{n+1} = b_n + n
b = [F(4)]
for n in range(10):
    b.append(b[-1] + n)
check(b[:4] == [4, 4, 5, 7], "b1, b2, b3 = 4, 5, 7")
check(b[1] - b[0] == 0 and b[2] - b[1] == 1 and not is_arith(b), "b_n pas arithmetique")
# 1. c) c_n = (n+3)^2 - n^2 = 6n + 9
c = [F((n + 3) ** 2 - n ** 2) for n in range(200)]
check(all(c[n] == 6 * n + 9 for n in range(200)), "c_n = 6n + 9")
check(is_arith(c) and c[0] == 9 and c[1] - c[0] == 6, "c_n arithmetique, c0 = 9, r = 6")
# 1. d) d_n = 1/(n+1)
d = [F(1, n + 1) for n in range(10)]
check(d[1] - d[0] == F(-1, 2) and d[2] - d[1] == F(-1, 6) and not is_arith(d[:3]), "d_n pas arithmetique")

# 2. x - 1, 2x + 1, 5x - 3 consecutive terms <=> b - a = c - b
for x in [F(random.randint(-500, 500), random.randint(1, 17)) for _ in range(500)]:
    # (c - b) - (b - a) = 2x - 6 : the condition b - a = c - b is linear, with the single root 3
    check(((5 * x - 3) - (2 * x + 1)) - ((2 * x + 1) - (x - 1)) == 2 * x - 6, "condition lineaire 2x - 6 = 0")
check(2 * F(3) - 6 == 0, "racine x = 3")
for x in [F(random.randint(-90, 90), random.randint(1, 9)) for _ in range(200)]:
    check((2 * x + 1) - (x - 1) == x + 2 and (5 * x - 3) - (2 * x + 1) == 3 * x - 4, "differences x+2, 3x-4")
x = F(3)
check((x - 1, 2 * x + 1, 5 * x - 3) == (2, 7, 12) and 7 - 2 == 5 and 12 - 7 == 5, "termes 2, 7, 12, raison 5")
check(F(2 + 12, 2) == 7, "7 = (2+12)/2")

# 3. U7 = 26, U19 = 62
r = F(62 - 26, 19 - 7)
U0 = 26 - 7 * r
check(r == 3 and U0 == 5, "r = 3, U0 = 5")
U = [U0]
for n in range(3000):
    U.append(U[-1] + r)
check(U[7] == 26 and U[19] == 62, "U7 = 26 et U19 = 62 retrouves par iteration")
check(all(U[n] == 5 + 3 * n for n in range(3001)), "U_n = 5 + 3n")
check(2026 not in U and sum(int(ch) for ch in "2021") == 5 and 2021 % 3 != 0, "2026 n'est pas un terme")
check(U.index(2027) == 674 and 3 * 674 == 2022, "2027 = U_674")
check(U[40] == 125 and U[10] == 35, "U40 = 125, U10 = 35")
S = sum(U[0:41]); S2 = sum(U[10:41])
check(S == 2665 and S == F(41 * (5 + 125), 2) and 41 * 65 == 2665, "S = 2665")
check(S2 == 2480 and S2 == F(31 * (35 + 125), 2) and len(U[10:41]) == 31, "S' = 2480, 31 termes")
check(sum(U[0:10]) == 185 == F(10 * (5 + 32), 2) and U[9] == 32 and S - S2 == 185, "controle S - S' = 185")

# 4. A_n(n, U_n) on y = 3x + 5
check([U[n] for n in range(5)] == [5, 8, 11, 14, 17], "U0..U4")
check(all(U[n] == 3 * n + 5 for n in range(3001)), "A_n sur D : y = 3x + 5")
closed = lambda k: 5 + 3 * k          # U_n = 5 + 3n, as written in the corrige
check(closed(7) == 26 and closed(19) == 62, "la forme U_n = 5 + 3n redonne U7 = 26 et U19 = 62")
pts = [(F(k), F(closed(k))) for k in range(3001)]
check(all(y == 3 * x + 5 for x, y in pts), "points A_n(n, 5 + 3n) sur y = 3x + 5")

# 5. B0(0, 9), B4(4, 3)
rV = F(3 - 9, 4)
check(rV == F(-3, 2), "raison -1.5")
V = [F(9)]
for n in range(100):
    V.append(V[-1] + rV)
check(V[4] == 3, "V4 = 3 retrouve")
check(all(V[n] == 9 - F(3, 2) * n for n in range(101)), "V_n = 9 - 1.5n (droite y = -1.5x + 9)")
first_neg = next(n for n in range(101) if V[n] < 0)
check(first_neg == 7 and V[7] == F(-3, 2) and V[6] == 0, "premier terme negatif V7 = -1.5, V6 = 0")
check(all(V[n] < 0 for n in range(7, 101)) and all(V[n] >= 0 for n in range(7)), "V_n < 0 <=> n > 6")
check(V[12] == -9 and sum(V[0:13]) == 0 and F(13 * (9 - 9), 2) == 0, "V0 + ... + V12 = 0")
check(all(V[k] + V[12 - k] == 0 for k in range(13)), "V_k + V_{12-k} = 0")
check([V[k] for k in range(6)] == [9, F(15, 2), 6, F(9, 2), 3, F(3, 2)], "termes 9 ; 7.5 ; ... ; 1.5")

# ================= Exercice 2 =================
aa = {1: 800}; bb = {1: 950}
for n in range(1, 300):
    aa[n + 1] = aa[n] + 12
    bb[n + 1] = bb[n] + 6
check((aa[2], aa[3], bb[2], bb[3]) == (812, 824, 956, 962), "a2, a3, b2, b3")
check(all(aa[n] == 788 + 12 * n and bb[n] == 944 + 6 * n for n in aa), "a_n = 788 + 12n, b_n = 944 + 6n")
check(aa[26] == 1100 == bb[26], "a26 = b26 = 1100")
check(next(n for n in aa if aa[n] > bb[n]) == 27 and all(aa[n] > bb[n] for n in range(27, 301))
      and all(aa[n] <= bb[n] for n in range(1, 27)), "a_n > b_n <=> n >= 27")
check(aa[27] == 1112 and bb[27] == 1106, "a27 = 1112, b27 = 1106")

A = {}; B = {}
sa = sb = 0
for n in range(1, 301):
    sa += aa[n]; sb += bb[n]
    A[n] = sa; B[n] = sb
check(all(A[n] == 6 * n * n + 794 * n and B[n] == 3 * n * n + 947 * n for n in A), "A_n et B_n")
check(all(A[n] == F(n * (800 + aa[n]), 2) for n in A), "A_n = n (a1 + an)/2")
check(A[24] == 22512 and B[24] == 24456 and B[24] - A[24] == 1944, "A24, B24, ecart 1944")
check(3456 + 19056 == 22512 and 1728 + 22728 == 24456, "details A24, B24")
check(all(A[n] - B[n] == 3 * n * (n - 51) for n in A), "A_n - B_n = 3n(n - 51)")
check(A[51] == B[51] == 56100, "A51 = B51 = 56100")
check(all((A[n] > B[n]) == (n >= 52) for n in A), "A_n > B_n <=> n >= 52")
check(A[60] == 69240 and B[60] == 67620 and A[60] - B[60] == 1620, "60 mois : A de 1620 de plus")
check(aa[25] == 1088 and aa[36] == 1220 and sum(aa[n] for n in range(25, 37)) == 13848, "3eme annee 13848")
check(A[36] == 36360 and A[36] - A[24] == 13848 and 7776 + 28584 == 36360, "controle A36 - A24")
# 5. A_n >= 50000
D = 397 ** 2 + 4 * 3 * 25000
check(D == 457609 and 397 ** 2 == 157609, "Delta = 457609")
sq = math.sqrt(D)
x1, x2 = (-397 - sq) / 6, (-397 + sq) / 6
check(round(sq, 2) == 676.47 and round(x1, 2) == -178.91 and round(x2, 2) == 46.58, "racines -178.91 et 46.58")
check(all((6 * n * n + 794 * n >= 50000) == (3 * n * n + 397 * n - 25000 >= 0) for n in range(1, 301)), "equivalence")
check(next(n for n in A if A[n] >= 50000) == 47 and A[46] == 49220 and A[47] == 50572, "47 mois")
check(all((A[n] >= 50000) == (n >= 47) for n in A), "A_n >= 50000 <=> n >= 47")
check(12696 + 36524 == 49220 and 13254 + 37318 == 50572, "details A46, A47")

# ================= text hygiene of the exercise file =================
md = os.path.join(os.path.dirname(os.path.abspath(__file__)), "T2_CH01_SUITES_ARITHMETIQUES.md")
txt = open(md, encoding="utf-8").read()
bad = [ch for ch in txt if ch in "    ​‎‏‪‫‬‭‮⁦⁧⁨⁩"]
check(not bad, "pas d'espace insecable ni de caractere bidi")

print(f"all {ok} checks passed")
