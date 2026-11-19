"""Checks every value and identity used in exercises T1 ch9 (Suites reelles), 3eme Sc. exp."""
from fractions import Fraction as F
import random

random.seed(9)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def r3(x):
    """round a Fraction to 3 decimals (half up), returned as a Fraction"""
    return F(int(x * 1000 + F(1, 2) if x >= 0 else x * 1000 - F(1, 2)), 1000)

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]

# ---------- Ex1 Partie A : u(n) = (3n+1)/(n+2)
u = lambda n: F(3 * n + 1, n + 2)
check([u(n) for n in range(5)] == [F(1, 2), F(4, 3), F(7, 4), F(2), F(13, 6)], "u0..u4")
check(u(10) == F(31, 12), "u10 = 31/12")
check([round(float(u(n)), 2) for n in (1, 4, 10)] == [1.33, 2.17, 2.58], "valeurs decimales u1, u4, u10")
f = lambda x: (3 * x + 1) / (x + 2)
for x in rats:
    if x != -2:
        check(f(x) == 3 - 5 / (x + 2), "f(x) = 3 - 5/(x+2)")
for n in range(3000):
    check(u(n) == 3 - F(5, n + 2), "u(n) = 3 - 5/(n+2)")
    check(u(n + 1) - u(n) == F(5, (n + 2) * (n + 3)), "u(n+1) - u(n)")
    check(F(1, 2) <= u(n) < 3, "1/2 <= u(n) < 3")
check(u(498) == F(299, 100), "u498 = 2.99 exactement")
first = next(n for n in range(3000) if u(n) > F(299, 100))
check(first == 499, "premier rang avec u(n) > 2.99 : 499")
check(all(u(n) > F(299, 100) for n in range(499, 3000)), "u(n) > 2.99 pour n >= 499")

# ---------- Ex1 Partie B : v(n+1) = (4v(n)+2)/(v(n)+3), v0 = 0
g = lambda x: (4 * x + 2) / (x + 3)
for x in rats:
    if x != -3:
        check(g(x) == 4 - F(10) / (x + 3), "g(x) = 4 - 10/(x+3)")
        check(g(x) - x == (2 - x) * (x + 1) / (x + 3), "g(x) - x factorise")
        check(g(x) - 2 == 2 * (x - 2) / (x + 3), "g(x) - 2")
        check(g(x) + 1 == 5 * (x + 1) / (x + 3), "g(x) + 1")
check(g(F(0)) == F(2, 3) and g(F(2)) == 2, "g(0) = 2/3, g(2) = 2")
check([x for x in range(-10, 11) if x != -3 and g(F(x)) == x] == [-1, 2], "points fixes de g : -1 et 2")
grid = [F(k, 10) for k in range(0, 101)]
check(all(g(grid[i]) < g(grid[i + 1]) for i in range(len(grid) - 1)), "g strictement croissante sur [0, 10]")
v = [F(0)]
for _ in range(40):
    v.append(g(v[-1]))
check(v[1:4] == [F(2, 3), F(14, 11), F(78, 47)], "v1, v2, v3")
check([round(float(x), 2) for x in v[1:4]] == [0.67, 1.27, 1.66], "v1..v3 decimales")
q = F(2, 5)
w = [(x - 2) / (x + 1) for x in v]
check(w[0] == -2, "w0 = -2")
for n in range(40):
    check(0 <= v[n] < 2, "0 <= v(n) < 2")
    check(v[n + 1] > v[n], "v strictement croissante")
    check(v[n + 1] - v[n] == (2 - v[n]) * (v[n] + 1) / (v[n] + 3), "v(n+1) - v(n)")
    check(w[n + 1] == q * w[n], "w geometrique de raison 2/5")
    check(w[n] == -2 * q ** n, "w(n) = -2 (2/5)^n")
    check(v[n] == (2 + w[n]) / (1 - w[n]), "v = (2 + w)/(1 - w)")
    check(v[n] == (2 - 2 * q ** n) / (1 + 2 * q ** n), "v(n) en fonction de n")
check((2 - 2 * F(64, 1000)) / (1 + 2 * F(64, 1000)) == F(78, 47), "controle v3 avec 0.4^3 = 0.064")

# ---------- Ex2 : epargne d'Amine (geometrique / recurrente affine) et de Salma (arithmetique)
k = F(105, 100)
A = [F(2000)]
for _ in range(60):
    A.append(k * A[-1] + 300)
S = lambda n: 3000 + 400 * n
check(A[1] == 2400 and A[2] == 2820, "A1 = 2400, A2 = 2820")
check(S(1) == 3400 and S(2) == 3800, "S1 = 3400, S2 = 3800")
check(-6000 == k * -6000 + 300, "point fixe -6000")
B = [a + 6000 for a in A]
check(B[0] == 8000, "B0 = 8000")
for n in range(60):
    check(B[n + 1] == k * B[n], "B geometrique de raison 1.05")
    check(A[n] == 8000 * k ** n - 6000, "A(n) = 8000*1.05^n - 6000")
    check(A[n + 1] - A[n] == 400 * k ** n, "A(n+1) - A(n) = 400*1.05^n")
    check(A[n] == 2000 * k ** n + 300 * sum(k ** i for i in range(n)), "forme avec la somme geometrique")
    if n >= 1:
        check(sum(k ** i for i in range(n)) == (k ** n - 1) / (k - 1), "somme 1 + ... + 1.05^(n-1)")
check(300 / (k - 1) == 6000, "300 / 0.05 = 6000")
check(r3(A[10]) == F(7031157, 1000), "A10 ~ 7031.157")
check(r3(A[10] - 5000) == F(2031157, 1000), "interets sur 10 ans ~ 2031.157")
check(2000 + 300 * 10 == 5000, "versements cumules sur 10 ans")
d = [A[n] - S(n) for n in range(61)]
for n in range(60):
    check(d[n] == 8000 * k ** n - 9000 - 400 * n, "d(n) explicite")
    check(d[n + 1] - d[n] == 400 * (k ** n - 1), "d(n+1) - d(n)")
    check(d[n + 1] - d[n] >= 0, "d croissante")
check(all(d[n] < 0 for n in range(10)) and all(d[n] > 0 for n in range(10, 61)), "A(n) > S(n) <=> n >= 10")
check([r3(A[n]) for n in (8, 9, 10)] == [F(5819644, 1000), F(6410626, 1000), F(7031157, 1000)], "A8, A9, A10")
check([S(n) for n in (8, 9, 10)] == [6200, 6600, 7000], "S8, S9, S10")
check([r3(d[n]) for n in (8, 9, 10)] == [F(-380356, 1000), F(-189374, 1000), F(31157, 1000)], "d8, d9, d10")
for n in range(300):
    check(k ** n >= 1 + F(n, 20), "1.05^n >= 1 + 0.05n")
    check(8000 * k ** n - 6000 >= 2000 + 400 * n, "A(n) >= 2000 + 400n")
# non majoree : pour M = 10^6, n = 2500 > M/400 convient
check(2000 + 400 * 2501 > 10 ** 6, "exemple M = 10^6")

print(f"all {ok} checks passed")
