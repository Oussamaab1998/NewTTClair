"""Checks every value used in CH14_FONCTIONS_AFFINES.md (1ère année, fonctions affines)."""
from fractions import Fraction as F
import random

random.seed(14)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-300, 300), random.randint(1, 15)) for _ in range(400)]
grid = sorted({F(k, d) for d in (1, 2, 3, 5, 10) for k in range(-20 * d, 20 * d + 1)})

def affine_through(p, q):
    a = (q[1] - p[1]) / (q[0] - p[0])
    b = p[1] - a * p[0]
    return a, b

# ---------- Exercice 1
a, b = affine_through((F(-2), F(7)), (F(4), F(-2)))
check(a == F(-3, 2) and b == 4, "f(x) = -1.5x + 4")
f = lambda x: a * x + b
check(f(F(-2)) == 7 and f(F(4)) == -2, "f(-2) = 7, f(4) = -2")
check(F(-9, 6) == F(-3, 2) and -F(3, 2) * F(-2) == 3, "calcul de a et 3 + b = 7")
check(f(F(6)) == -5 and f(F(1, 3)) == F(7, 2), "f(6) = -5, f(1/3) = 3.5")
check([x for x in grid if f(x) == 10] == [F(-4)], "antecedent de 10 = -4 (unique)")
check([x for x in grid if f(x) == 0] == [F(8, 3)], "antecedent de 0 = 8/3 (unique)")
check(F(4) / F(3, 2) == F(8, 3), "4/1.5 = 8/3")
check(f(F(103)) - f(F(100)) == F(-9, 2), "f(103) - f(100) = -4.5")
for x in rats[:40]:
    for y in rats[40:80]:
        if x != y:
            check((f(x) - f(y)) / (x - y) == a, "taux d'accroissement = a")
c, d = affine_through((F(-2), F(-9)), (F(4), F(6)))
check(c == F(5, 2) and d == -4, "g(x) = 2.5x - 4")
g = lambda x: c * x + d
check(g(F(-2)) == -9 and g(F(4)) == 6, "Delta passe par A et B")
# axes
check(f(F(0)) == 4 and f(F(8, 3)) == 0, "D : (0, 4) et (8/3, 0)")
check(g(F(0)) == -4 and g(F(8, 5)) == 0 and F(4) / F(5, 2) == F(8, 5), "Delta : (0, -4) et (1.6, 0)")
# points for drawing
check(f(F(2)) == 1 and f(F(-2)) == 7 and f(F(4)) == -2, "points de D")
check(g(F(2)) == 1, "Delta passe par (2, 1)")
check(f(F(2)) - f(F(0)) == -3 and g(F(2)) - g(F(0)) == 5, "x augmente de 2 : -3 et +5")
# intersection
check([x for x in grid if f(x) == g(x)] == [F(2)], "E : seule abscisse 2")
check((f(F(2)), g(F(2))) == (1, 1), "E(2, 1)")
for x in grid + rats:
    check((f(x) <= g(x)) == (x >= 2), "f(x) <= g(x) <=> x >= 2")
    check((f(x) > g(x)) == (x < 2), "D au-dessus de Delta a gauche de E")
# h
hc, hd = affine_through((F(0), F(3)), (F(2), F(8)))
check(hc == F(5, 2) and hd == 3, "h(x) = 2.5x + 3")
h = lambda x: hc * x + hd
for x in rats:
    check(h(x) - g(x) == 7, "h - g constante non nulle : pas de solution")
check(hc == c and hd != d, "meme coefficient, ordonnees a l'origine differentes")

# ---------- Exercice 2
d1 = lambda t: 60 * t
check(d1(F(2)) == 120 and [t for t in grid if d1(t) == 120] == [F(2)], "camion en B a t = 2 (10 h)")
p, q = affine_through((F(1, 2), F(120)), (F(3, 2), F(30)))
check(p == -90 and q == 165, "d2(t) = -90t + 165")
d2 = lambda t: p * t + q
check(d2(F(1, 2)) == 120 and d2(F(3, 2)) == 30, "d2(0.5) = 120, d2(1.5) = 30")
check(120 - 30 == 90, "90 km en une heure")
check(F(165, 90) == F(11, 6) and d2(F(11, 6)) == 0, "arrivee en A a t = 11/6")
check(F(11, 6) * 60 == 110, "11/6 h = 1 h 50 min -> 9 h 50")
check(d1(F(1)) == 60 and d2(F(1)) == 75 and d2(F(1)) - d1(F(1)) == 15, "a 9 h : 60, 75, 15 km")
# graph (6 cm per hour, 1 cm per 10 km)
check(F(2) * 6 == 12 and F(120) / 10 == 12, "extremite (2, 120) -> 12 cm, 12 cm")
check(F(1, 2) * 6 == 3 and F(11, 6) * 6 == 11, "segment de d2 : de 3 cm a 11 cm")
check(d2(F(1)) == 75 and d2(F(3, 2)) == 30 and d1(F(1)) == 60, "points des segments")
# meeting, scanned minute by minute on [0.5, 11/6]
minutes = range(30, 111)
meet = [m for m in minutes if d1(F(m, 60)) == d2(F(m, 60))]
check(meet == [66], "rencontre a t = 66 min = 1.1 h (9 h 06)")
check(F(165, 150) == F(11, 10) and F(1, 2) <= F(11, 10) <= F(11, 6), "t = 1.1 dans l'intervalle")
check(d1(F(11, 10)) == 66 and d2(F(11, 10)) == 66 and 120 - 66 == 54, "66 km de A, 54 km de B")
# distance between the vehicles
for t in grid + rats:
    if F(1, 2) <= t <= F(11, 6):
        gap = abs(d1(t) - d2(t))
        if t <= F(11, 10):
            check(d2(t) - d1(t) == 165 - 150 * t and d2(t) >= d1(t), "avant : 165 - 150t >= 0")
        if t >= F(11, 10):
            check(d1(t) - d2(t) == 150 * t - 165 and d1(t) >= d2(t), "apres : 150t - 165 >= 0")
        check((gap <= 30) == (F(9, 10) <= t <= F(13, 10)), "ecart <= 30 <=> 0.9 <= t <= 1.3")
close = [m for m in minutes if abs(d1(F(m, 60)) - d2(F(m, 60))) <= 30]
check(close == list(range(54, 79)), "de 54 min a 78 min apres 8 h (8 h 54 -> 9 h 18)")
check(78 - 54 == 24 and F(13, 10) - F(9, 10) == F(2, 5), "duree 24 min = 0.4 h")
check(d1(F(9, 10)) == 54 and d2(F(9, 10)) == 84 and d1(F(13, 10)) == 78 and d2(F(13, 10)) == 48, "controles 0.9 et 1.3")

print(f"all {ok} checks passed")
