"""Checks every value used in CH12_FONCTIONS_LINEAIRES.md (1ère année, fonctions linéaires)."""
from fractions import Fraction as F
import random

random.seed(12)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-200, 200), random.randint(1, 12)) for _ in range(300)]
grid = [F(k, 10) for k in range(-200, 201)]

def on_line(coef, pt):
    return pt[1] == coef * pt[0]

def collinear(p, q, r):
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]) == 0

O = (F(0), F(0))

# ---------- Exercice 1
a = F(6) / F(-4)
check(a == F(-3, 2), "coefficient de f = -1.5")
f = lambda x: a * x
check(f(F(-4)) == 6, "f(-4) = 6")
check(f(F(2)) == -3, "f(2) = -3")
check(f(F(-1, 3)) == F(1, 2), "f(-1/3) = 0.5")
check(f(F(8, 10)) == F(-12, 10), "f(0.8) = -1.2")
# antecedents: claimed values map to the targets, and a != 0 gives uniqueness
check(f(F(-6)) == 9 and [x for x in grid if f(x) == 9] == [F(-6)], "antecedent de 9 = -6 (unique)")
check(f(F(3, 2)) == F(-9, 4) and [x for x in grid if f(x) == F(-9, 4)] == [F(3, 2)], "antecedent de -2.25 = 1.5")
check(F(9) / F(-3, 2) == -6 and F(-9, 4) / F(-3, 2) == F(3, 2), "divisions par le coefficient")
# property f(x + x') = f(x) + f(x') used for f(2.8)
check(F(2) + F(8, 10) == F(28, 10), "2.8 = 2 + 0.8")
check(f(F(2)) + f(F(8, 10)) == F(-42, 10), "f(2) + f(0.8) = -4.2")
check(f(F(28, 10)) == F(-42, 10), "controle -1.5 x 2.8 = -4.2")
for x in rats[:50]:
    for y in rats[50:100]:
        check(f(x + y) == f(x) + f(y), "additivite de f")
# g through B(5, 2)
c = F(2) / F(5)
check(c == F(4, 10), "coefficient de g = 0.4")
check(on_line(c, (F(5), F(2))), "B sur Delta")
check(on_line(c, (F(-75, 10), F(-3))), "C(-7.5, -3) sur Delta")
check(c * 12 == F(48, 10) and not on_line(c, (F(12), F(5))), "E(12, 5) pas sur Delta, g(12) = 4.8")
# points used for the drawing of D and Delta
for pt in [(F(1), F(-3, 2)), (F(2), F(-3)), (F(-4), F(6)), O]:
    check(on_line(a, pt), "point de D")
for pt in [(F(1), F(4, 10)), (F(5), F(2)), (F(-75, 10), F(-3)), O]:
    check(on_line(c, pt), "point de Delta")
check(a < 0, "coefficient de f negatif")
# only common point O
check([x for x in grid if f(x) == c * x] == [F(0)], "seul point commun O")
check(a - c == F(-19, 10), "-1.5x = 0.4x <=> -1.9x = 0")
# alignment O, M(-6, 9), N(4, -6)
M, N = (F(-6), F(9)), (F(4), F(-6))
check(f(M[0]) == M[1] and f(N[0]) == N[1], "M et N sur D")
check(collinear(O, M, N), "O, M, N alignes (determinant)")
# h through P(2, 5), Q(3, 7)
k = F(5) / F(2)
check(k == F(5, 2), "coefficient de h = 2.5")
P, Q = (F(2), F(5)), (F(3), F(7))
check(on_line(k, O) and on_line(k, P), "h passe par O et P")
check(k * 3 == F(15, 2) and not on_line(k, Q), "h(3) = 7.5, Q pas sur (OP)")
check(not collinear(O, P, Q), "O, P, Q non alignes (determinant)")

# ---------- Exercice 2
f2 = lambda x: x + F(8, 100) * x
for x in rats:
    check(f2(x) == F(108, 100) * x, "f(x) = 1.08x")
check(f2(F(850)) == 918, "f(850) = 918")
check(F(432) / F(108, 100) == 400 and f2(F(400)) == 432, "four : 400 D")
check(f2(F(850)) + f2(F(400)) == f2(F(1250)), "f(850) + f(400) = f(1250)")
check(F(918) + F(432) == 1350 and F(108, 100) * 1250 == 1350, "facture 1350 D (deux manieres)")
rem = lambda y: y - F(25, 100) * y
h = lambda x: rem(f2(x))
for x in rats:
    check(h(x) == F(81, 100) * x, "h(x) = 0.81x")
check(F(75, 100) * F(108, 100) == F(81, 100), "0.75 x 1.08 = 0.81")
check(1 - F(81, 100) == F(19, 100), "baisse de 19 %")
check(F(81, 100) != 1 - F(17, 100), "pas 17 %")
check(f2(F(100)) == 108 and h(F(100)) == 81, "exemple 100 -> 108 -> 81")
# graph
check(f2(F(1000)) == 1080 and f2(F(500)) == 540, "segment de f : (1000, 1080), (500, 540)")
check(h(F(1000)) == 810 and h(F(500)) == 405, "segment de h : (1000, 810), (500, 405)")
check(f2(F(1000)) / 100 == F(108, 10) and F(1000) / 100 == 10, "extremite du segment de f : (10 cm, 10.8 cm)")
check(h(F(800)) / 100 == F(648, 100) and F(800) / 100 == 8, "lecture : (8 cm, 6.48 cm) sur le segment de h")
check(all(h(x) < f2(x) for x in grid if x > 0), "h sous f pour x > 0")
check(F(648) / F(81, 100) == 800 and h(F(800)) == 648, "648 D en juillet <-> 800 D")
# saving e(x)
for x in rats:
    check(f2(x) - h(x) == F(27, 100) * x, "e(x) = 0.27x")
check(F(81) / F(27, 100) == 300, "e(x) = 81 <=> x = 300")
check(f2(F(300)) == 324 and h(F(300)) == 243 and 324 - 243 == 81, "controle 324 - 243 = 81")

print(f"all {ok} checks passed")
