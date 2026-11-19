"""Checks every count used in exercises T2 ch8 (Denombrement, 3eme Sc. exp.).
Each count is checked by formula AND by brute-force enumeration (itertools)."""
from itertools import permutations, combinations, product
from math import factorial, comb, perm

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def A(n, p): return factorial(n) // factorial(n - p)
def C(n, p): return factorial(n) // (factorial(p) * factorial(n - p))

for n in range(0, 15):
    for p in range(0, n + 1):
        check(A(n, p) == perm(n, p) and C(n, p) == comb(n, p), "formules A et C")

# ================= Exercice 1 =================
# 1. E = {1..60}, M4 multiples de 4, M6 multiples de 6
E = range(1, 61)
M4 = {k for k in E if k % 4 == 0}
M6 = {k for k in E if k % 6 == 0}
check(len(M4) == 15 == 60 // 4, "card(M4) = 15")
check(len(M6) == 10 == 60 // 6, "card(M6) = 10")
check(M4 & M6 == {k for k in E if k % 12 == 0} and len(M4 & M6) == 5, "M4 inter M6 = multiples de 12, card 5")
check(sorted(M4 & M6) == [12, 24, 36, 48, 60], "multiples de 12 : 12, 24, 36, 48, 60")
check(len(M4 | M6) == 20 == 15 + 10 - 5, "card(M4 union M6) = 20")
check(len([k for k in E if k % 4 and k % 6]) == 40 == 60 - 20, "ni multiple de 4 ni de 6 : 40")
# 2.a
check(factorial(6) == 720, "6! = 720")
check(len(list(permutations(range(7), 3))) == 210 == 7 * 6 * 5 == A(7, 3), "A(7,3) = 210")
check(len(list(combinations(range(7), 3))) == 35 == C(7, 3), "C(7,3) = 35")
check(A(7, 3) == factorial(3) * C(7, 3), "A(7,3) = 3! C(7,3)")
# each 3-subset gives 3! ordered triples
seen = {}
for t in permutations(range(7), 3):
    seen.setdefault(frozenset(t), 0)
    seen[frozenset(t)] += 1
check(len(seen) == 35 and set(seen.values()) == {6}, "chaque partie donne 6 arrangements")
# 2.b (n+2)!/n! = (n+1)(n+2)
for n in range(0, 30):
    check(factorial(n + 2) // factorial(n) == (n + 1) * (n + 2) and factorial(n + 2) % factorial(n) == 0, "(n+2)!/n!")
# 2.c C(n,2) = 45 <=> n = 10
check([n for n in range(2, 500) if C(n, 2) == 45] == [10], "C(n,2) = 45 <=> n = 10")
check([n for n in range(2, 60) if sum(1 for _ in combinations(range(n), 2)) == 45] == [10], "brute force : n = 10 seul")
check(sum(1 for _ in combinations(range(10), 2)) == 45, "brute force : 45 paires parmi 10")
check(10 * 9 == 90 and 10 ** 2 - 10 - 90 == 0 and (-9) ** 2 - (-9) - 90 == 0, "n^2 - n - 90 = (n - 10)(n + 9)")
# 3. Pascal
check(C(9, 3) == 84 and 9 * 8 * 7 // 6 == 84, "C(9,3) = 84")
check(C(9, 4) == 126 and 9 * 8 * 7 * 6 // 24 == 126, "C(9,4) = 126")
check(C(10, 4) == 84 + 126 == 210, "C(10,4) = 210 (Pascal)")
check(sum(1 for _ in combinations(range(10), 4)) == 210, "brute force C(10,4)")
# Pascal by brute force: 4-subsets of {0..9} containing 9 / not containing 9
with9 = sum(1 for s in combinations(range(10), 4) if 9 in s)
check(with9 == 84 and 210 - with9 == 126, "parties contenant 9 : C(9,3) ; sans 9 : C(9,4)")
check(C(10, 6) == C(10, 4) == sum(1 for _ in combinations(range(10), 6)), "C(10,6) = C(10,4)")
rows = [[C(n, p) for p in range(n + 1)] for n in range(7)]
check(rows[6] == [1, 6, 15, 20, 15, 6, 1] and rows[5] == [1, 5, 10, 10, 5, 1] and rows[4] == [1, 4, 6, 4, 1],
      "triangle de Pascal")
# 4. binome : polynomial products (coefficient lists, index = degree)
def pmul(P, Q):
    R = [0] * (len(P) + len(Q) - 1)
    for i, a in enumerate(P):
        for j, b in enumerate(Q):
            R[i + j] += a * b
    return R
def ppow(P, n):
    R = [1]
    for _ in range(n):
        R = pmul(R, P)
    return R
check(ppow([2, 1], 4) == [16, 32, 24, 8, 1], "(x + 2)^4 = x^4 + 8x^3 + 24x^2 + 32x + 16")
check([C(4, k) * 2 ** (4 - k) for k in range(5)] == [16, 32, 24, 8, 1], "(x + 2)^4 par la formule")
check(ppow([-1, 2], 6)[3] == -160 == C(6, 3) * 2 ** 3 * (-1) ** 3, "coef de x^3 dans (2x - 1)^6 = -160")
check(C(6, 3) == 20, "C(6,3) = 20")
for n in range(0, 13):
    check(sum(C(n, k) * 2 ** k for k in range(n + 1)) == 3 ** n, "somme C(n,k) 2^k = 3^n")
    # brute force : words of length n on {a, b, c}; k = number of letters different from a
    check(sum(1 for _ in product("abc", repeat=n)) == 3 ** n, "3^n mots")
    by_k = [0] * (n + 1)
    for w in product("abc", repeat=n):
        by_k[sum(1 for x in w if x != "a")] += 1
    for k in range(n + 1):
        check(by_k[k] == C(n, k) * 2 ** k, "mots avec exactement k lettres differentes de a : C(n,k) 2^k")
check([C(5, k) * 2 ** k for k in range(6)] == [1, 10, 40, 80, 80, 32] and sum([1, 10, 40, 80, 80, 32]) == 243,
      "1 + 10 + 40 + 80 + 80 + 32 = 243")
# 5. parts of a set with 6 elements
G6 = range(6)
parts = [s for r in range(7) for s in combinations(G6, r)]
check(len(parts) == 64 == 2 ** 6 == sum(C(6, k) for k in range(7)), "64 parties")
check(sum(1 for s in parts if len(s) == 2) == 15 == C(6, 2), "15 parties a 2 elements")
check(sum(1 for s in parts if len(s) >= 2) == 57 == 64 - 1 - 6, "57 parties a au moins 2 elements")

# ================= Exercice 2 : club de 10 (6 filles dont Rim, 4 garcons dont Omar) =================
girls = ["Rim", "F2", "F3", "F4", "F5", "F6"]
boys = ["Omar", "G2", "G3", "G4"]
club = girls + boys
isg = lambda x: x in girls
# 1. bureau (president, secretaire, tresorier)
bureaux = list(permutations(club, 3))
check(len(bureaux) == 720 == A(10, 3) == 10 * 9 * 8, "720 bureaux")
check(sum(1 for b in bureaux if isg(b[0]) and not isg(b[1])) == 192 == 6 * 4 * 8, "president fille, secretaire garcon : 192")
check(sum(1 for b in bureaux if all(isg(x) for x in b)) == 120 == A(6, 3), "bureaux de filles : 120")
check(sum(1 for b in bureaux if any(not isg(x) for x in b)) == 600 == 720 - 120, "au moins un garcon : 600")
# 2. comite de 4
comites = list(combinations(club, 4))
check(len(comites) == 210 == C(10, 4) == 10 * 9 * 8 * 7 // 24, "210 comites")
check(A(6, 3) == 6 * 5 * 4 == 120, "A(6,3) = 6.5.4 = 120")
check(sum(1 for c in comites if sum(map(isg, c)) == 2) == 90 == C(6, 2) * C(4, 2), "exactement 2 filles : 90")
check(C(6, 2) == 15 == 6 * 5 // 2 and C(4, 2) == 6, "C(6,2) = 15, C(4,2) = 6")
check(sum(1 for c in comites if sum(map(isg, c)) < 4) == 195 == 210 - C(6, 4), "au moins un garcon : 195")
check(C(6, 4) == 15, "C(6,4) = 15")
check(sum(1 for c in comites if "Rim" in c and "Omar" in c) == 28 == C(8, 2), "comites avec Rim et Omar : 28")
check(sum(1 for c in comites if not ("Rim" in c and "Omar" in c)) == 182 == 210 - 28, "pas Rim et Omar ensemble : 182")
# also by direct cases : neither (C(8,4)) + Rim only (C(8,3)) + Omar only (C(8,3))
check(C(8, 4) + 2 * C(8, 3) == 182 and C(8, 4) == 70 and C(8, 3) == 56, "182 = 70 + 56 + 56")
# 3. votes : each member votes P1, P2 or P3 ; a result is a 10-tuple
votes = list(product((1, 2, 3), repeat=10))
check(len(votes) == 59049 == 3 ** 10, "3^10 = 59049 resultats")
check(sum(1 for v in votes if 3 not in v) == 1024 == 2 ** 10, "personne ne vote P3 : 1024")
check(sum(1 for v in votes if v.count(1) == 4 and v.count(2) == 6) == 210 == C(10, 4), "4 votent P1, 6 votent P2 : 210")
check(sum(1 for v in votes if v.count(1) == 4) == 13440 == C(10, 4) * 2 ** 6, "exactement 4 votent P1 : 13440")
check(sum(1 for v in votes if v.count(1) >= 1) == 59049 - 1024, "au moins un vote P1 : 58025")
# 4. photo : 10 chairs in a row
nb = together = ends = 0
starts = set()
for s in permutations(range(10)):
    nb += 1
    pos = [i for i, x in enumerate(s) if x < 6]  # members 0..5 are the girls
    if pos[-1] - pos[0] == 5:
        together += 1
        starts.add(pos[0] + 1)
    if s[0] >= 6 and s[-1] >= 6:
        ends += 1
check(nb == 3628800 == factorial(10), "10! = 3628800")
check(together == 86400 == factorial(5) * factorial(6), "filles cote a cote : 5! 6! = 86400")
check(starts == {1, 2, 3, 4, 5} and 5 * 720 * 24 == 86400 and factorial(4) == 24, "bloc : 5 positions, 5 x 720 x 24")
check(ends == 483840 == 4 * 3 * factorial(8), "garcons aux deux bouts : 4 x 3 x 8! = 483840")
check(factorial(8) == 40320 and factorial(5) == 120, "8! = 40320, 5! = 120")

print(f"all {ok} checks passed")
