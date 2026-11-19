"""Checks every value used in exercises T1 ch4 (2ème Sciences, arithmétique et dénombrement)."""
from itertools import permutations, combinations, product
from math import gcd

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def digits(n):
    return [int(c) for c in str(n)]

def crit_rem(n, m):
    """Remainder of n by m, computed ONLY with the textbook criterion (never n % m)."""
    s = str(n)
    if m in (2, 5):
        return int(s[-1]) % m
    if m in (4, 25):
        return int(s[-2:]) % m
    if m == 8:
        return int(s[-3:]) % m
    if m in (3, 9):
        return sum(digits(n)) % m
    if m == 11:
        r = digits(n)[::-1]
        d = sum(r[0::2]) - sum(r[1::2])
        p = 0
        while d + 11 * p < 0:
            p += 1
        return (d + 11 * p) % 11
    raise ValueError(m)

def s1_s2(n):
    r = digits(n)[::-1]
    return sum(r[0::2]), sum(r[1::2])

# the criteria themselves agree with true remainders on many integers
for n in list(range(100, 5000)) + [7425, 3868091, 74251, 918273, 123454321]:
    for m in (2, 3, 4, 5, 8, 9, 11, 25):
        check(crit_rem(n, m) == n % m, f"criterion {m} on {n}")

# ---------- Ex1 Q1 a) : 7425
n = 7425
check(int(str(n)[-1]) == 5 and int(str(n)[-2:]) == 25 and int(str(n)[-3:]) == 425, "last digits of 7425")
check(25 == 4 * 6 + 1 and 425 == 8 * 53 + 1, "25 = 4*6+1, 425 = 8*53+1")
check(sum(digits(n)) == 18, "digit sum 18")
check(s1_s2(n) == (9, 9), "S1 = S2 = 9 for 7425")
divisible = {m for m in (2, 3, 4, 5, 8, 9, 11, 25) if crit_rem(n, m) == 0}
check(divisible == {3, 5, 9, 11, 25}, "7425 divisible by 3,5,9,11,25 only")
check(n == 27 * 275 == 3 ** 3 * 5 ** 2 * 11, "7425 = 27*275 = 3^3*5^2*11")

# ---------- Ex1 Q1 b) : N = 3868091
N = 3868091
claimed = {2: 1, 5: 1, 4: 3, 25: 16, 8: 3, 3: 2, 9: 8, 11: 7}
for m, r in claimed.items():
    check(crit_rem(N, m) == r and N % m == r, f"remainder of N by {m}")
check(91 == 4 * 22 + 3 and 91 == 25 * 3 + 16 and 91 == 8 * 11 + 3, "91 divisions")
check(sum(digits(N)) == 35 and 35 == 3 * 11 + 2 and 35 == 9 * 3 + 8, "digit sum 35")
check(s1_s2(N) == (10, 25), "S1 = 10, S2 = 25")
check(-15 + 11 * 1 == -4 < 0 <= -15 + 11 * 2 == 7, "p = 2 is the smallest, -15 + 22 = 7")
check(N == 11 * 351644 + 7, "N = 11*351644 + 7")

# ---------- Ex1 Q2 a) : 4c17 has remainder 3 by 9
sol = [c for c in range(10) if int(f"4{c}17") % 9 == 3]
check(sol == [0, 9], "c in {0, 9}")
check([12 + c for c in range(10) if (12 + c) % 9 == 3] == [12, 21], "12 + c in {12, 21}")
check(4017 == 9 * 446 + 3 and 4917 == 9 * 546 + 3, "4017, 4917 controls")

# ---------- Ex1 Q2 b) : 6a3b divisible by 4 and 11
sol = [(a, b) for a in range(10) for b in range(10)
       if int(f"6{a}3{b}") % 4 == 0 and int(f"6{a}3{b}") % 11 == 0]
check(sorted(sol) == [(3, 6), (7, 2)], "(a,b) = (7,2) or (3,6)")
check([b for b in range(10) if (30 + b) % 4 == 0] == [2, 6], "b in {2, 6}")
check(all(s1_s2(int(f"6{a}3{b}")) == (a + b, 9) for a in range(10) for b in range(10)), "S1 = a+b, S2 = 9")
check([(a, b) for a in range(10) for b in range(10) if crit_rem(int(f"6{a}3{b}"), 11) == 0]
      == [(a, b) for a in range(10) for b in range(10) if a + b == 9], "11 | 6a3b <=> a+b = 9")
check(all(2 <= a + b + 2 <= 10 for a in range(10) for b in range(10) if a + b < 9), "case d < 0 gives 2..10")
check(6732 == 4 * 1683 == 11 * 612 and 6336 == 4 * 1584 == 11 * 576, "6732, 6336 controls")

# ---------- Ex1 Q3 : x = n + 3, y = 2n + 1
for n in range(0, 3000):
    x, y = n + 3, 2 * n + 1
    check(2 * x - y == 5 and 2 * x >= y, "2x - y = 5")
    g = gcd(x, y)
    check(g in (1, 5), "gcd in {1,5}")
    check((g == 5) == (n % 10 in (2, 7)), "gcd = 5 <=> last digit 2 or 7")
    check((x % 5 == 0) == ((n % 10 + 3) in (5, 10)), "5 | n+3 <=> u+3 in {5,10}")
check(2012 + 3 == 2015 and 2 * 2012 + 1 == 4025 and gcd(2015, 4025) == 5, "PGCD(2015, 4025) = 5")
check(2026 + 3 == 2029 and 2 * 2026 + 1 == 4053 and gcd(2029, 4053) == 1, "PGCD(2029, 4053) = 1")

# ---------- Ex1 Q4 : squares modulo 4
for k in range(0, 2000):
    check((2 * k) ** 2 == 4 * k * k, "even square")
    check((2 * k + 1) ** 2 == 4 * (k * k + k) + 1, "odd square")
check({n * n % 4 for n in range(5000)} == {0, 1}, "n^2 mod 4 in {0,1}")
tree = {(r, s): (r + s) % 4 for r in (0, 1) for s in (0, 1)}
check(tree == {(0, 0): 0, (0, 1): 1, (1, 0): 1, (1, 1): 2}, "tree of a^2 + b^2 mod 4")
check({(a * a + b * b) % 4 for a in range(300) for b in range(300)} == {0, 1, 2}, "a^2+b^2 mod 4 in {0,1,2}")
check(int(str(74251)[-2:]) == 51 and 51 == 4 * 12 + 3 and 74251 % 4 == 3, "74251 has remainder 3 by 4")
squares = {a * a for a in range(0, 273)}
check(272 ** 2 < 74251 < 273 ** 2, "a <= 272")
check(not any(74251 - s in squares for s in squares), "74251 is not a sum of two squares (brute force)")

# ---------- Ex2 : codes = 3 distinct digits among 1..5
E = [100 * x + 10 * y + z for x, y, z in permutations(range(1, 6), 3)]
check(len(E) == 60 == 5 * 4 * 3 and len(set(E)) == 60, "card E = 60")
check(len([n for n in E if n > 400]) == 24 == 2 * 4 * 3, "24 codes > 400")
check(min(n for n in E if n // 100 == 4) == 412, "smallest code starting with 4")
check(all(n < 400 for n in E if n // 100 <= 3) and all(n > 400 for n in E if n // 100 >= 4), "> 400 <=> first digit 4 or 5")
check(len([n for n in E if n // 100 == 4]) == 12 == len([n for n in E if n // 100 == 5]), "12 + 12")
A2 = {n for n in E if n % 2 == 0}
A5 = {n for n in E if n % 5 == 0}
check(len(A2) == 24 == 2 * 4 * 3 and len(A5) == 12 == 1 * 4 * 3, "card A2 = 24, card A5 = 12")
check(A2 & A5 == set() and len(A2 | A5) == 36, "disjoint, union 36")
neither = [n for n in E if n % 2 and n % 5]
check(len(neither) == 24 == 60 - 36 and all(n % 10 in (1, 3) for n in neither), "24 codes divisible by neither")
parts = {frozenset(c): sum(c) for c in combinations(range(1, 6), 3)}
check(len(parts) == 10, "10 parts")
check(sorted((tuple(sorted(p)), s) for p, s in parts.items()) ==
      [((1, 2, 3), 6), ((1, 2, 4), 7), ((1, 2, 5), 8), ((1, 3, 4), 8), ((1, 3, 5), 9),
       ((1, 4, 5), 10), ((2, 3, 4), 9), ((2, 3, 5), 10), ((2, 4, 5), 11), ((3, 4, 5), 12)], "list of sums")
three = sorted(tuple(sorted(p)) for p, s in parts.items() if s % 3 == 0)
check(three == [(1, 2, 3), (1, 3, 5), (2, 3, 4), (3, 4, 5)], "4 parts with sum divisible by 3")
A3 = {n for n in E if n % 3 == 0}
check(len(A3) == 24 == 4 * 3 * 2 * 1, "24 codes divisible by 3")
check(all(len([n for n in E if set(digits(n)) == set(p)]) == 6 for p in three), "6 codes per part")
A9 = {n for n in E if n % 9 == 0}
check(len(A9) == 12 and {frozenset(digits(n)) for n in A9} == {frozenset({1, 3, 5}), frozenset({2, 3, 4})}, "12 codes divisible by 9")
ends4 = [10 * a + b for a, b in permutations(range(1, 6), 2) if (10 * a + b) % 4 == 0]
check(sorted(ends4) == [12, 24, 32, 52], "endings 12, 24, 32, 52")
check([m for m in range(12, 55, 4)] == [12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52], "multiples of 4 from 12 to 52")
removed = [m for m in range(12, 55, 4) if m not in ends4]
check(removed == [16, 20, 28, 36, 40, 44, 48], "eliminated multiples of 4")
check([m for m in removed if not set(str(m)) <= set("12345")] == [16, 20, 28, 36, 40, 48], "eliminated for a digit outside 1..5")
A4 = {n for n in E if n % 4 == 0}
check(len(A4) == 12 == 4 * 3, "12 codes divisible by 4")
check(sorted(n for n in E if n % 25 == 0) == [125, 325, 425], "codes divisible by 25")
check(sorted(A3 & A4) == [132, 312, 324, 432], "codes divisible by 3 and 4")
by_end = {e: [x for x in range(1, 6) if x not in digits(e) and (x + sum(digits(e))) % 3 == 0] for e in ends4}
check(by_end == {12: [3], 24: [3], 32: [1, 4], 52: []}, "hundreds digit per ending")
check({e: [x for x in range(1, 6) if x not in digits(e)] for e in ends4} ==
      {12: [3, 4, 5], 24: [1, 3, 5], 32: [1, 4, 5], 52: [1, 3, 4]}, "available hundreds digits")
check([7 + x for x in (1, 3, 4)] == [8, 10, 11], "ending 52: sums 8, 10, 11")
check(len(A3 | A4) == 32 == 24 + (12 - 4) and len(A4 - A3) == 8, "32 codes divisible by 3 or 4")
check(all(n % 12 == 0 for n in A3 & A4), "they are multiples of 12")
for n in E:
    x, y, z = digits(n)
    d = (x + z) - y
    check(-2 <= d <= 8, "d in [-2, 8]")
    check(s1_s2(n) == (x + z, y), "S1 = x+z, S2 = y")
    check((n % 11 == 0) == (y == x + z), "11 | n <=> y = x + z")
check(min((x + z) - y for x, y, z in permutations(range(1, 6), 3)) == -2 and
      max((x + z) - y for x, y, z in permutations(range(1, 6), 3)) == 8, "d range attained")
A11 = sorted(n for n in E if n % 11 == 0)
check(A11 == sorted([132, 231, 143, 341, 154, 451, 253, 352]) and len(A11) == 8, "8 codes divisible by 11")
check([n // 11 for n in [132, 231, 143, 341, 154, 451, 253, 352]] == [12, 21, 13, 31, 14, 41, 23, 32], "quotients by 11")
pairs = sorted(tuple(sorted(p)) for p in combinations(range(1, 6), 2) if sum(p) <= 5)
check(pairs == [(1, 2), (1, 3), (1, 4), (2, 3)], "pairs {x,z} with x+z <= 5")
check(all(x + z not in (x, z) and 1 <= x + z <= 5 for x, z in pairs), "y = x + z differs from x and z")

print(f"all {ok} checks passed")
