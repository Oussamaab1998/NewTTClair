"""Checks every value and identity used in CH11_ACTIVITES_ALGEBRIQUES.md (1ère année, Activités algébriques).
Polynomials are coefficient lists of Fractions (index = degree); identities are checked coefficient by
coefficient AND on random rationals."""
from fractions import Fraction as F
import math, random

random.seed(11)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def P(*c):  # P(c0, c1, c2, ...) = c0 + c1 x + c2 x^2 + ...
    return trim([F(v) for v in c])
def trim(c):
    c = list(c)
    while len(c) > 1 and c[-1] == 0:
        c.pop()
    return c
def add(p, q):
    n = max(len(p), len(q))
    return trim([(p[i] if i < len(p) else 0) + (q[i] if i < len(q) else 0) for i in range(n)])
def neg(p): return [-v for v in p]
def sub(p, q): return add(p, neg(q))
def mul(p, q):
    r = [F(0)] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] += a * b
    return trim(r)
def pw(p, n):
    r = P(1)
    for _ in range(n):
        r = mul(r, p)
    return r
def sc(k, p): return trim([F(k) * v for v in p])
def ev(p, x): return sum(c * x ** i for i, c in enumerate(p))

rats = [F(random.randint(-90, 90), random.randint(1, 12)) for _ in range(300)]
def same(p, q, msg):
    check(p == q, msg + " (coefficients)")
    for x in rats:
        check(ev(p, x) == ev(q, x), msg + " (valeurs)")

X = P(0, 1)
# ================= Exercice 1 =================
E = sub(pw(P(-3, 2), 2), pw(P(1, 1), 2))       # (2x-3)^2 - (x+1)^2
same(pw(P(-3, 2), 2), P(9, -12, 4), "(2x-3)^2 = 4x^2 - 12x + 9")
same(pw(P(1, 1), 2), P(1, 2, 1), "(x+1)^2 = x^2 + 2x + 1")
same(E, P(8, -14, 3), "E = 3x^2 - 14x + 8")
same(E, mul(P(-4, 1), P(-2, 3)), "E = (x-4)(3x-2)")
same(sub(P(-3, 2), P(1, 1)), P(-4, 1), "(2x-3) - (x+1) = x - 4")
same(add(P(-3, 2), P(1, 1)), P(-2, 3), "(2x-3) + (x+1) = 3x - 2")
check(ev(E, F(0)) == 8 and ev(E, F(-1)) == 25 and ev(E, F(4)) == 0, "E(0) = 8, E(-1) = 25, E(4) = 0")
check((2 * -1 - 3) ** 2 - (-1 + 1) ** 2 == 25, "E(-1) par la forme de depart")
# E(sqrt2) = 3*2 - 14 sqrt2 + 8 = 14 - 14 sqrt2 : coefficients (rational part, sqrt2 part)
c = E
rat = c[0] + c[2] * 2          # x^2 = 2
irr = c[1]                     # x = sqrt2
check((rat, irr) == (14, -14), "E(sqrt2) = 14 - 14 sqrt2")
check(math.isclose(ev([float(v) for v in E], math.sqrt(2)), 14 - 14 * math.sqrt(2)), "E(sqrt2) float")
check(ev(E, F(2, 3)) == 0, "E(2/3) = 0")
check(3 * F(196, 9) == F(196, 3) == 14 * F(14, 3) and ev(E, F(14, 3)) == 8, "controle E(14/3) = 8")
grid = sorted(set(rats + [F(k, 6) for k in range(-60, 61)] + [F(4), F(2, 3), F(14, 3), F(0)]))
check([x for x in grid if ev(E, x) == 0] == [F(2, 3), F(4)], "E(x) = 0 seulement en 2/3 et 4 (grille)")
for x in grid:
    a_, b_ = x - 4, 3 * x - 2
    if a_ != 0 and b_ != 0:
        check(a_ * b_ != 0 and ((a_ * b_ > 0) == ((a_ > 0) == (b_ > 0))), "regle des signes : produit non nul")
same(sub(E, P(8)), mul(X, P(-14, 3)), "E - 8 = x(3x - 14)")
check([x for x in grid if ev(E, x) == 8] == [F(0), F(14, 3)], "E(x) = 8 seulement en 0 et 14/3 (grille)")
# 3. factorisations
same(P(1, -10, 25), pw(P(-1, 5), 2), "25x^2 - 10x + 1 = (5x - 1)^2")
G = sub(mul(P(-1, 1), P(3, 2)), pw(P(-1, 1), 2))
same(G, mul(P(-1, 1), P(4, 1)), "(x-1)(2x+3) - (x-1)^2 = (x-1)(x+4)")
same(sub(P(3, 2), P(-1, 1)), P(4, 1), "(2x+3) - (x-1) = x + 4")
same(P(-27, 0, 0, 8), mul(P(-3, 2), P(9, 6, 4)), "8x^3 - 27 = (2x-3)(4x^2+6x+9)")
same(P(8, 12, 6, 1), pw(P(2, 1), 3), "x^3 + 6x^2 + 12x + 8 = (x+2)^3")
check(3 * 2 ** 2 == 12 and 3 * 2 == 6 and 2 ** 3 == 8, "3 x^2 x 2 = 6x^2, 3 x 2^2 = 12x, 2^3 = 8")
# a^3 - b^3 and (a+b)^3 identities on random pairs
for a in rats[:40]:
    for b in rats[40:80]:
        check(a ** 3 - b ** 3 == (a - b) * (a * a + a * b + b * b), "a^3 - b^3")
        check((a + b) ** 3 == a ** 3 + 3 * a * a * b + 3 * a * b * b + b ** 3, "(a+b)^3")
        check((a - b) ** 3 == a ** 3 - 3 * a * a * b + 3 * a * b * b - b ** 3, "(a-b)^3")
# 4.
same(pw(P(1, 1), 3), P(1, 3, 3, 1), "(x+1)^3")
same(pw(P(-1, 1), 3), P(-1, 3, -3, 1), "(x-1)^3")
same(sub(pw(P(1, 1), 3), pw(P(-1, 1), 3)), P(2, 0, 6), "(x+1)^3 - (x-1)^3 = 6x^2 + 2")
check(21 ** 3 - 19 ** 3 == 2402 == 6 * 20 ** 2 + 2 and 21 ** 3 == 9261 and 19 ** 3 == 6859, "21^3 - 19^3 = 2402")
check(1001 ** 3 - 999 ** 3 == 6000002 == 6 * 1000 ** 2 + 2, "1001^3 - 999^3 = 6 000 002")
# 5.
check(1002 ** 2 == 1004004 == 1000 ** 2 + 2 * 1000 * 2 + 4, "1002^2")
check(998 ** 2 == 996004 == 1000 ** 2 - 2 * 1000 * 2 + 4, "998^2")
check(1002 * 998 == 999996 == 1000 ** 2 - 4, "1002 x 998")

# ================= Exercice 2 =================
side = P(20, -2)                                  # 20 - 2x
S1 = sub(P(400), sc(4, pw(X, 2)))                 # 400 - 4x^2
S2 = add(pw(side, 2), sc(4, mul(X, side)))        # fond + 4 faces
same(S2, S1, "fond + faces laterales = 400 - 4x^2")
same(mul(side, add(side, sc(4, X))), S2, "(20-2x)[(20-2x) + 4x] = fond + faces")
same(add(side, sc(4, X)), P(20, 2), "(20-2x) + 4x = 20 + 2x")
same(mul(P(20, -2), P(20, 2)), S1, "(20-2x)(20+2x) = 400 - 4x^2")
same(sc(4, mul(P(10, -1), P(10, 1))), S1, "400 - 4x^2 = 4(10-x)(10+x)")
check(ev(S1, F(5, 2)) == 375 == 15 * 25 == 4 * F(15, 2) * F(25, 2), "S(2.5) = 375")
V = mul(X, pw(side, 2))
same(V, sc(4, mul(X, pw(P(10, -1), 2))), "V = 4x(10-x)^2")
same(pw(side, 2), P(400, -80, 4), "(20-2x)^2 = 400 - 80x + 4x^2")
same(V, P(0, 400, -80, 4), "V = 4x^3 - 80x^2 + 400x")
table = {x: ev(V, F(x)) for x in range(1, 10)}
check(table == {1: 324, 2: 512, 3: 588, 4: 576, 5: 500, 6: 384, 7: 252, 8: 128, 9: 36}, "tableau de valeurs")
check(max(table, key=table.get) == 3, "meilleur entier x = 3")
vmax = ev(V, F(10, 3))
check(vmax == F(16000, 27) and F(40, 3) * F(20, 3) ** 2 == F(16000, 27), "V(10/3) = 16000/27")
check(10 - F(10, 3) == F(20, 3) and 4 * F(10, 3) == F(40, 3), "4x = 40/3 et 10 - x = 20/3")
check(math.isclose(float(vmax), 592.5926, abs_tol=1e-4) and round(float(vmax)) == 593, "16000/27 ~ 592.59, arrondi 593")
check(F(59255, 100) <= vmax < F(59265, 100), "arrondi au centieme 592.59")
rhs = sc(4, mul(pw(P(-10, 3), 2), P(40, -3)))
same(sub(P(16000), sc(27, V)), rhs, "16000 - 27 V(x) = 4(3x-10)^2(40-3x)")
same(sc(27, V), P(0, 10800, -2160, 108), "27 V(x) = 108x^3 - 2160x^2 + 10800x")
same(pw(P(-10, 3), 2), P(100, -60, 9), "(3x-10)^2 = 9x^2 - 60x + 100")
same(mul(P(100, -60, 9), P(40, -3)), P(4000, -2700, 540, -27), "(9x^2-60x+100)(40-3x)")
check(sc(4, P(4000, -2700, 540, -27)) == P(16000, -10800, 2160, -108), "x 4 : -108x^3 + 2160x^2 - 10800x + 16000")
fine = [F(k, 300) for k in range(1, 3000)]   # ]0, 10[
check(all(ev(V, x) < vmax for x in fine if x != F(10, 3)), "V(x) < 16000/27 strictement si x != 10/3")
check(all(ev(rhs, x) > 0 for x in fine if x != F(10, 3)) and ev(rhs, F(10, 3)) == 0, "4(3x-10)^2(40-3x) > 0 sauf en 10/3")
check(all(40 - 3 * x > 10 for x in fine), "40 - 3x > 10 > 0 sur ]0, 10[")
check(all(ev(V, x) <= vmax for x in fine), "V(x) <= 16000/27 sur ]0, 10[")
check([x for x in fine if ev(V, x) == vmax] == [F(10, 3)], "egalite seulement en 10/3")
check(ev(V, F(5)) == 500 and vmax < 600, "500 cm3 possible (x = 5), 600 cm3 impossible")
check(20 - 2 * F(10, 3) == F(40, 3), "fond de cote 40/3 pour x = 10/3")

print(f"all {ok} checks passed")
