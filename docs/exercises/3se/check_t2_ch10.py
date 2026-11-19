"""Checks every probability used in exercises T2 ch10 (Probabilites, 3eme Sc. exp.).
Each value is checked by formula (exact fractions) AND by enumeration of the sample space (itertools)."""
from fractions import Fraction as F
from itertools import product, permutations, combinations
from math import comb

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def proba(space, event):
    """space: list of equally likely outcomes."""
    return F(sum(1 for w in space if event(w)), len(space))

# ================= Exercice 1, Partie A : de truque =================
q = F(1, 8)
law = {1: q, 2: q, 3: q, 4: q, 5: q, 6: 3 * q}
check(5 * q + 3 * q == 1, "5q + 3q = 1 donc q = 1/8")
check(sum(law.values()) == 1 and law[6] == F(3, 8), "loi : p(6) = 3/8")
# brute force model : 8 equally likely tickets, face 6 written on 3 of them
tickets = [1, 2, 3, 4, 5, 6, 6, 6]
for k in range(1, 7):
    check(proba(tickets, lambda w: w == k) == law[k], "loi par les 8 tickets")
pl = lambda ev: sum(law[k] for k in law if ev(k))
evA = lambda k: k % 2 == 0
evB = lambda k: k % 3 == 0
for ev, val, name in [(evA, F(5, 8), "p(A) = 5/8"),
                      (evB, F(1, 2), "p(B) = 1/2"),
                      (lambda k: evA(k) and evB(k), F(3, 8), "p(A inter B) = 3/8"),
                      (lambda k: evA(k) or evB(k), F(3, 4), "p(A union B) = 3/4"),
                      (lambda k: not evA(k), F(3, 8), "p(contraire de A) = 3/8"),
                      (lambda k: not evA(k) and not evB(k), F(1, 4), "p(C) = 1/4")]:
    check(pl(ev) == val and proba(tickets, ev) == val, name)
check(F(5, 8) + F(1, 2) - F(3, 8) == F(3, 4), "formule de la reunion")
check(1 - F(3, 4) == F(1, 4) and 1 - F(5, 8) == F(3, 8), "contraires")
check(F(5, 8) > F(1, 2), "plus favorable au pair qu'un de equilibre")

# ================= Exercice 1, Partie B : 40 eleves =================
students = [("F", "N")] * 8 + [("F",)] * 14 + [("N",)] * 7 + [()] * 11
check(len(students) == 40, "40 eleves")
check(sum(1 for s in students if "F" in s) == 22 and sum(1 for s in students if "N" in s) == 15, "22 F, 15 N")
check(sum(1 for s in students if "F" in s and "N" in s) == 8, "8 les deux")
check(22 - 8 == 14 and 15 - 8 == 7 and 40 - (22 + 15 - 8) == 11, "14 F seul, 7 N seul, 11 aucun")
pF = proba(students, lambda s: "F" in s)
pN = proba(students, lambda s: "N" in s)
pFN = proba(students, lambda s: "F" in s and "N" in s)
check(pF == F(11, 20) and pN == F(3, 8) and pFN == F(1, 5), "p(F) = 11/20, p(N) = 3/8, p(F inter N) = 1/5")
pU = proba(students, lambda s: "F" in s or "N" in s)
check(pU == F(29, 40) == pF + pN - pFN, "p(F union N) = 29/40")
check(proba(students, lambda s: not s) == F(11, 40) == 1 - pU, "aucun sport : 11/40")
check(proba(students, lambda s: len(s) == 1) == F(21, 40) == pU - pFN, "un seul sport : 21/40")
pairs = list(combinations(range(40), 2))
check(len(pairs) == 780 == comb(40, 2), "C(40,2) = 780")
pD = proba(pairs, lambda c: all("F" in students[i] for i in c))
check(pD == F(231, 780) == F(77, 260) and comb(22, 2) == 231, "deux footballeurs : 231/780 = 77/260")
pH = proba(pairs, lambda c: any("N" in students[i] for i in c))
check(comb(25, 2) == 300 and pH == 1 - F(300, 780) == F(8, 13), "au moins un nageur : 8/13")
check(F(300, 780) == F(5, 13), "aucun nageur : 5/13")

# ================= Exercice 2 : urne 3 R, 2 B =================
balls = ["R1", "R2", "R3", "B1", "B2"]
col = lambda b: b[0]
same = lambda t: col(t[0]) == col(t[1])
# 1. avec remise (independent)
w1 = list(product(balls, repeat=2))
check(len(w1) == 25, "25 tirages avec remise")
tree1 = {("R", "R"): F(3, 5) * F(3, 5), ("R", "B"): F(3, 5) * F(2, 5),
         ("B", "R"): F(2, 5) * F(3, 5), ("B", "B"): F(2, 5) * F(2, 5)}
check(tree1 == {("R", "R"): F(9, 25), ("R", "B"): F(6, 25), ("B", "R"): F(6, 25), ("B", "B"): F(4, 25)}, "arbre 1")
for k, v in tree1.items():
    check(proba(w1, lambda t: (col(t[0]), col(t[1])) == k) == v, "arbre 1 par enumeration")
check(sum(tree1.values()) == 1, "somme arbre 1")
check(proba(w1, same) == F(13, 25) == tree1[("R", "R")] + tree1[("B", "B")], "p(G1) = 13/25")
check(proba(w1, lambda t: "B" in (col(t[0]), col(t[1]))) == F(16, 25) == 1 - F(9, 25), "au moins une blanche : 16/25")
# 2. sans remise (dependent)
w2 = list(permutations(balls, 2))
check(len(w2) == 20, "20 tirages sans remise")
tree2 = {("R", "R"): F(3, 5) * F(2, 4), ("R", "B"): F(3, 5) * F(2, 4),
         ("B", "R"): F(2, 5) * F(3, 4), ("B", "B"): F(2, 5) * F(1, 4)}
check(tree2 == {("R", "R"): F(3, 10), ("R", "B"): F(3, 10), ("B", "R"): F(3, 10), ("B", "B"): F(1, 10)}, "arbre 2")
for k, v in tree2.items():
    check(proba(w2, lambda t: (col(t[0]), col(t[1])) == k) == v, "arbre 2 par enumeration")
# branch probabilities of the second level, by enumeration among the pairs with a given first colour
def share(first, second):
    sub_space = [t for t in w2 if col(t[0]) == first]
    return proba(sub_space, lambda t: col(t[1]) == second)
check(proba(w2, lambda t: col(t[0]) == "R") == F(3, 5), "premier niveau : R 3/5")
check(share("R", "R") == F(1, 2) and share("R", "B") == F(1, 2), "apres R : R 2/4, B 2/4")
check(share("B", "R") == F(3, 4), "apres B : R 3/4")
check(share("B", "B") == F(1, 4), "apres B : B 1/4")
check(share("R", "R") != share("B", "R"), "le second tirage depend du premier (epreuves dependantes)")
check(proba(w2, same) == F(2, 5) == F(3, 10) + F(1, 10), "p(G2) = 2/5")
check(proba(w2, lambda t: col(t[1]) == "B") == F(2, 5) == F(3, 10) + F(1, 10), "deuxieme blanche : 2/5")
check(proba(w2, lambda t: col(t[0]) == "B") == F(2, 5), "premiere blanche : 2/5")
check(proba(w2, lambda t: "B" in (col(t[0]), col(t[1]))) == F(7, 10), "sans remise, au moins une blanche : 7/10")
# 3. simultane
w3 = list(combinations(balls, 2))
check(len(w3) == 10 == comb(5, 2), "C(5,2) = 10")
check(comb(3, 2) + comb(2, 2) == 4, "C(3,2) + C(2,2) = 4")
check(proba(w3, same) == F(4, 10) == F(2, 5), "p(G3) = 2/5")
# 4. comparison
check(F(13, 25) > F(2, 5) and float(F(13, 25)) == 0.52 and float(F(2, 5)) == 0.4, "13/25 = 0.52 > 0.4")
# 5. three independent games, simultaneous draw each time
w5 = list(product(w3, repeat=3))
check(len(w5) == 1000, "1000 issues pour 3 parties")
wins = lambda g: sum(1 for t in g if same(t))
check(proba(w5, lambda g: wins(g) == 3) == F(8, 125) == F(2, 5) ** 3, "3 gains : 8/125")
check(proba(w5, lambda g: wins(g) == 0) == F(27, 125) == F(3, 5) ** 3, "aucun gain : 27/125")
check(proba(w5, lambda g: wins(g) >= 1) == F(98, 125) == 1 - F(27, 125), "au moins un gain : 98/125")
check(proba(w5, lambda g: wins(g) == 1) == F(54, 125) == 3 * F(2, 5) * F(3, 5) ** 2, "exactement un gain : 54/125")
check(F(2, 5) * F(3, 5) ** 2 == F(18, 125), "une branche : 18/125")

print(f"all {ok} checks passed")
