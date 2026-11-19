"""Checks every value used in CH09_ACTIVITES_NUMERIQUES_I.md (1ère année, Activités numériques I)."""
from fractions import Fraction as F
from itertools import product
import math

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def is_prime(n):
    return n >= 2 and all(n % p for p in range(2, int(math.isqrt(n)) + 1))

def factor(n):
    out, p = {}, 2
    while n > 1:
        while n % p == 0:
            out[p] = out.get(p, 0) + 1
            n //= p
        p += 1
    return out

def rebuild(fac):
    r = 1
    for p, e in fac.items():
        r *= p ** e
    return r

def divisors(n):
    return [d for d in range(1, n + 1) if n % d == 0]

# ================= Exercice 1 =================
a, b = 756, 1176
# 1. decompositions
check(factor(a) == {2: 2, 3: 3, 7: 1}, "756 = 2^2 * 3^3 * 7")
check(factor(b) == {2: 3, 3: 1, 7: 2}, "1176 = 2^3 * 3 * 7^2")
check(rebuild({2: 2, 3: 3, 7: 1}) == 756 and rebuild({2: 3, 3: 1, 7: 2}) == 1176, "rebuild")
check(all(is_prime(p) for p in (2, 3, 7)), "facteurs premiers")
# divisions successives affichees dans le corrige
check([756 // 2, 378 // 2, 189 // 3, 63 // 3, 21 // 3, 7 // 7] == [378, 189, 63, 21, 7, 1], "divisions de 756")
check([1176 // 2, 588 // 2, 294 // 2, 147 // 3, 49 // 7, 7 // 7] == [588, 294, 147, 49, 7, 1], "divisions de 1176")
# 2. PGCD, PPCM
g = 2 ** 2 * 3 * 7
l = 2 ** 3 * 3 ** 3 * 7 ** 2
check(g == 84 and math.gcd(a, b) == 84, "PGCD = 84")
check(l == 10584 and a * b // math.gcd(a, b) == 10584, "PPCM = 10584")
check(min(m for m in range(b, 20000, b) if m % a == 0) == 10584, "PPCM brute force (premier multiple de 1176 divisible par 756)")
check(max(d for d in divisors(a) if b % d == 0) == 84, "PGCD brute force")
check(g * l == a * b == 889056, "PGCD x PPCM = 756 x 1176 = 889056")
# Euclide
rows = []
x, y = b, a
while y:
    rows.append((x, y, x // y, x % y))
    x, y = y, x % y
check(rows == [(1176, 756, 1, 420), (756, 420, 1, 336), (420, 336, 1, 84), (336, 84, 4, 0)], "algorithme d'Euclide")
check(x == 84, "dernier reste non nul = 84")
# 3. fractions
check(F(756, 1176) == F(9, 14) and 756 // 84 == 9 and 1176 // 84 == 14 and math.gcd(9, 14) == 1, "756/1176 = 9/14 irreductible")
check(10584 // 756 == 14 and 10584 // 1176 == 9, "facteurs vers le denominateur commun")
s = F(5, 756) + F(1, 1176)
check(s == F(79, 10584) and s.numerator == 79 and s.denominator == 10584, "5/756 + 1/1176 = 79/10584 irreductible")
check(5 * 14 + 9 == 79, "70 + 9 = 79")
check(79 % 2 == 1 and 79 % 3 == 1 and 79 % 7 == 2, "79 = 2*39+1 = 3*26+1 = 7*11+2")
check(math.gcd(79, 10584) == 1, "PGCD(79, 10584) = 1")
# 4. 9/14 : division posee
r = 9
steps = []
for _ in range(7):
    q, r2 = divmod(10 * r, 14)
    steps.append((10 * r, q, r2))
    r = r2
check(steps == [(90, 6, 6), (60, 4, 4), (40, 2, 12), (120, 8, 8), (80, 5, 10), (100, 7, 2), (20, 1, 6)], "division de 9 par 14")
check(steps[0][2] == steps[-1][2] == 6, "le reste 6 reapparait")
# all remainders ever produced (simulate many steps): never 0
r, seen = 9, set()
for _ in range(500):
    r = (10 * r) % 14
    seen.add(r)
check(0 not in seen and seen == {6, 4, 12, 8, 10, 2}, "restes jamais nuls : 6, 4, 12, 8, 10, 2")
check(all((9 * 10 ** n) % 14 != 0 for n in range(0, 200)), "9/14 n'est pas N/10^n (n < 200)")
check(7 in factor(14) and 7 not in factor(9 * 10 ** 12), "7 divise 14 mais pas 9 x 10^n")
def digit(n):  # n-th digit after the decimal point of 9/14
    return (9 * 10 ** n // 14) % 10
check("".join(str(digit(n)) for n in range(1, 14)) == "6428571428571", "9/14 = 0.6428571428571...")
check(all(digit(n) == int("428571"[(n - 2) % 6]) for n in range(2, 400)), "bloc 428571 periodique a partir du 2e chiffre")
check(99 == 6 * 16 + 3 and "428571"[3 - 1] == "8" and digit(100) == 8, "100e chiffre = 8")
x = F(9, 14)
for v in (F(64, 100), F(65, 100)):
    check(v - F(1, 100) <= x <= v + F(1, 100), "valeur approchee a 10^-2 pres : %s" % v)
check(not (F(66, 100) - F(1, 100) <= x), "0.66 ne convient pas (contre-controle)")
check(F(642, 1000) <= x < F(643, 1000) and digit(4) == 8, "0.642... avec 4e chiffre 8")
check(F(6425, 10000) <= x < F(6435, 10000), "arrondi au millieme = 0.643")
# 5. carre et cube
def is_square(n):
    return math.isqrt(n) ** 2 == n
def is_cube(n):
    c = round(n ** (1 / 3))
    return any((c + t) ** 3 == n for t in (-1, 0, 1))
check(min(k for k in range(1, 1000) if is_square(756 * k)) == 21, "plus petit k : 756k carre -> 21")
check(756 * 21 == 15876 == 126 ** 2 and 126 == 2 * 3 ** 2 * 7, "756 x 21 = 126^2")
check(factor(15876) == {2: 2, 3: 4, 7: 2}, "15876 = 2^2 3^4 7^2")
check(min(k for k in range(1, 1000) if is_cube(1176 * k)) == 63, "plus petit k' : 1176k' cube -> 63")
check(1176 * 63 == 74088 == 42 ** 3 and 42 == 2 * 3 * 7 and 63 == 3 ** 2 * 7, "1176 x 63 = 42^3")
check(factor(74088) == {2: 3, 3: 3, 7: 3}, "74088 = 2^3 3^3 7^3")
# admitted criterion, tested on many integers
for n in range(2, 3000):
    fac = factor(n)
    check(is_square(n) == all(e % 2 == 0 for e in fac.values()), "critere carre")
    check(is_cube(n) == all(e % 3 == 0 for e in fac.values()), "critere cube")

# ================= Exercice 2 =================
R, T = 252, 180
check(252 % 24 == 12 and 252 // 24 == 10, "252 = 24 x 10 + 12 : pas 24 bouquets")
check(252 % 18 == 0 and 180 % 18 == 0 and 252 // 18 == 14 and 180 // 18 == 10, "18 bouquets de 14 roses et 10 tulipes")
check(factor(R) == {2: 2, 3: 2, 7: 1} and factor(T) == {2: 2, 3: 2, 5: 1}, "252 = 2^2 3^2 7, 180 = 2^2 3^2 5")
check(math.gcd(R, T) == 36 and R // 36 == 7 and T // 36 == 5, "36 bouquets de 7 roses et 5 tulipes")
common = [d for d in range(1, 253) if R % d == 0 and T % d == 0]
check(common == [1, 2, 3, 4, 6, 9, 12, 18, 36], "liste des nombres de bouquets possibles")
check(sorted(2 ** i * 3 ** j for i, j in product(range(3), range(3))) == common, "forme 2^a 3^b, a, b dans {0,1,2}")
check(len(common) == 3 * 3 == 9, "9 possibilites")
check(divmod(180, 7) == (25, 5), "180 = 7 x 25 + 5 : 7 ne divise pas 180")
for p_ in range(-30, 31):
    for q_ in range(-30, 31):
        check((2 * p_ + 1) * (2 * q_ + 1) == 2 * (2 * p_ * q_ + p_ + q_) + 1, "produit de deux impairs")
# Partie B
tickets = range(1, 501)
check(divmod(500, 12) == (41, 8) and divmod(500, 18) == (27, 14) and divmod(500, 36) == (13, 32), "divisions euclidiennes")
S = {n for n in tickets if n % 12 == 0}
L = {n for n in tickets if n % 18 == 0}
check(len(S) == 41 and len(L) == 27, "41 stylos, 27 livres")
check(12 * 41 == 492 and 18 * 27 == 486 and 36 * 13 == 468, "derniers multiples")
for k in range(1, 200):
    check(((18 * k) % 12 == 0) == (k % 2 == 0), "18k multiple de 12 <=> k pair")
check(S & L == {n for n in tickets if n % 36 == 0} and len(S & L) == 13, "les deux lots : multiples de 36, 13 tickets")
check(math.lcm(12, 18) == 36 and factor(12) == {2: 2, 3: 1} and factor(18) == {2: 1, 3: 2}, "PPCM(12, 18) = 36")
check(len(S - L) == 28 and len(L - S) == 14 and len(S ^ L) == 42, "exactement un lot : 28 + 14 = 42")
check(len(S | L) == 55 == 13 + 28 + 14 and 500 - len(S | L) == 445, "au moins un lot 55, aucun 445")
check(F(55, 500) == F(11, 100), "11 % de tickets gagnants")
check(F(445, 500) == F(89, 100), "89 % de tickets perdants")
# ventes
d1 = F(2, 5) * 500
d2 = F(3, 4) * (500 - d1)
check(d1 == 200 and d2 == 225 and 500 - d1 - d2 == 75, "200 puis 225 vendus, 75 invendus")
check(1 - F(2, 5) - F(3, 4) * F(3, 5) == F(3, 20) and F(9, 20) == F(3, 4) * F(3, 5), "fraction invendue 3/20")
check(F(3, 20) * 500 == 75 and F(3, 20) == F(15, 100), "75 tickets, 15 %")
check(F(425) * F(8, 10) == 340, "recette 425 x 0.800 = 340 dinars")
print(f"all {ok} checks passed")
