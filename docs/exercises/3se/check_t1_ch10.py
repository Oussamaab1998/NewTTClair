"""Checks every value and identity used in exercises T1 ch10 (Limites de suites reelles), 3eme Sc. exp."""
from fractions import Fraction as F
import math, random

random.seed(10)
ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

rats = [F(random.randint(-60, 60), random.randint(1, 13)) for _ in range(400)]

class R2:
    """exact numbers a + b*sqrt(2) with a, b rational"""
    def __init__(self, a, b=0):
        self.a, self.b = F(a), F(b)
    def __add__(s, o): o = o if isinstance(o, R2) else R2(o); return R2(s.a + o.a, s.b + o.b)
    __radd__ = __add__
    def __neg__(s): return R2(-s.a, -s.b)
    def __sub__(s, o): return s + (-(o if isinstance(o, R2) else R2(o)))
    def __rsub__(s, o): return R2(o) - s
    def __mul__(s, o):
        o = o if isinstance(o, R2) else R2(o)
        return R2(s.a * o.a + 2 * s.b * o.b, s.a * o.b + s.b * o.a)
    __rmul__ = __mul__
    def inv(s):
        n = s.a * s.a - 2 * s.b * s.b
        return R2(s.a / n, -s.b / n)
    def __truediv__(s, o): return s * (o if isinstance(o, R2) else R2(o)).inv()
    def __rtruediv__(s, o): return R2(o) * s.inv()
    def __pow__(s, k):
        r = R2(1)
        for _ in range(k): r = r * s
        return r
    def __eq__(s, o): o = o if isinstance(o, R2) else R2(o); return s.a == o.a and s.b == o.b
    def sign(s):
        a, b = s.a, s.b
        if b == 0: return (a > 0) - (a < 0)
        if a == 0: return (b > 0) - (b < 0)
        if (a > 0) == (b > 0): return 1 if a > 0 else -1
        if a > 0: return 1 if a * a > 2 * b * b else -1
        return 1 if 2 * b * b > a * a else -1
    def __abs__(s): return s if s.sign() >= 0 else -s
    def __lt__(s, o): return (s - o).sign() < 0
    def __gt__(s, o): return (s - o).sign() > 0
    def __float__(s): return float(s.a) + float(s.b) * math.sqrt(2)

S2 = R2(0, 1)
check(S2 * S2 == 2, "sqrt2^2 = 2")

# ================= Exercice 1 =================
# 1. a) u(n) = (2n^2 - 3n + 1)/(n^2 + 4) -> 2
u = lambda n: F(2 * n * n - 3 * n + 1, n * n + 4)
for n in range(1, 3000):
    check(u(n) == (2 - F(3, n) + F(1, n * n)) / (1 + F(4, n * n)), "u(n) apres division par n^2")
    check(u(n) - 2 == F(-3 * n - 7, n * n + 4), "u(n) - 2")
check(abs(u(10 ** 6) - 2) < F(1, 10 ** 5), "u(n) proche de 2")
# 1. b) v(n) = sqrt(n^2 + 3n) - n -> 3/2
for n in list(range(1, 2000)) + [10 ** 6, 10 ** 9]:
    a = math.sqrt(n * n + 3 * n) - n
    b = 3 * n / (math.sqrt(n * n + 3 * n) + n)
    c = 3 / (math.sqrt(1 + 3 / n) + 1)
    check(math.isclose(b, c, rel_tol=1e-12) and (n > 10 ** 5 or math.isclose(a, b, rel_tol=1e-9)), "v(n) : expression conjuguee")
    check(c < 1.5, "v(n) < 3/2")
check(abs(3 / (math.sqrt(1 + 3 / 10 ** 9) + 1) - 1.5) < 1e-8, "v(n) proche de 3/2")
# 2. a) w(n) = (3n + 2cos n)/(n+1) -> 3 ; 2. b) t(n) = 5 sin n - n^2 -> -inf
for n in range(0, 100000):
    w = (3 * n + 2 * math.cos(n)) / (n + 1)
    check(math.isclose(w - 3, (2 * math.cos(n) - 3) / (n + 1), abs_tol=1e-12), "w(n) - 3")
    check(abs(w - 3) <= 5 / (n + 1) + 1e-15, "|w(n) - 3| <= 5/(n+1)")
    check(5 * math.sin(n) - n * n <= 5 - n * n, "t(n) <= 5 - n^2")
check(all(1 <= abs(2 * math.cos(n) - 3) <= 5 for n in range(10000)), "1 <= |2cos n - 3| <= 5")
# 3. a) s(n) = (4^n + 3^n)/(2*4^n - 1) -> 1/2
s = lambda n: F(4 ** n + 3 ** n, 2 * 4 ** n - 1)
for n in range(0, 300):
    check(s(n) == (1 + F(3, 4) ** n) / (2 - F(1, 4) ** n), "s(n) divise par 4^n")
check(abs(s(300) - F(1, 2)) < F(1, 10 ** 30), "s(n) proche de 1/2")
check(s(0) == 2 and s(1) == F(7, 7), "s0 = 2, s1 = 1")
# 3. b) 2.135135... = 79/37
for n in range(1, 60):
    dn = 2 + sum(F(135, 1000 ** k) for k in range(1, n + 1))
    check(dn == 2 + F(135, 1000) * (1 - F(1, 1000) ** n) / (1 - F(1, 1000)), "somme geometrique")
    check(dn == 2 + F(5, 37) * (1 - F(1, 1000) ** n), "d(n) = 2 + (5/37)(1 - 10^(-3n))")
    check(0 <= F(79, 37) - dn <= F(1, 1000) ** n, "0 <= a - d(n) <= 10^(-3n)")
check(F(135, 999) == F(5, 37) and 2 + F(5, 37) == F(79, 37), "135/999 = 5/37 ; limite 79/37")
num, den, digits = 79 % 37, 37, ""
for _ in range(30):
    num *= 10
    digits += str(num // den)
    num %= den
check(79 // 37 == 2 and digits == "135" * 10, "79/37 = 2.135135...")
# 4. r(n) = (-1)^n n/(n+1) n'a pas de limite
r = lambda n: (-1) ** n * F(n, n + 1)
for n in range(1, 3000):
    check(abs(r(n + 1) - r(n)) == F(n, n + 1) + F(n + 1, n + 2), "|r(n+1) - r(n)|")
    check(F(n, n + 1) >= F(1, 2) and F(n + 1, n + 2) >= F(2, 3), "minorations")
    check(abs(r(n + 1) - r(n)) >= F(7, 6), "|r(n+1) - r(n)| >= 7/6 > 1")
for n in range(0, 3000):
    check(abs(r(n)) < 1, "|r(n)| < 1")
# 5. x0 = 5, x(n+1) = -0.5 x(n) + 3
x = [F(5)]
for _ in range(100):
    x.append(-F(1, 2) * x[-1] + 3)
check(x[1:4] == [F(1, 2), F(11, 4), F(13, 8)], "x1, x2, x3")
check(x[1] < x[0] and x[2] > x[1], "x non monotone")
check(2 == -F(1, 2) * 2 + 3, "alpha = 2")
y = [t - 2 for t in x]
check(y[0] == 3, "y0 = 3")
for n in range(100):
    check(y[n + 1] == -F(1, 2) * y[n], "y geometrique de raison -1/2")
    check(x[n] == 2 + 3 * (-F(1, 2)) ** n, "x(n) = 2 + 3(-0.5)^n")
    check((abs(x[n] - 2) < F(1, 1000)) == (n >= 12), "|x(n) - 2| < 10^-3 <=> n >= 12")
check(2 ** 11 == 2048 and 2 ** 12 == 4096, "2^11, 2^12")

# ================= Exercice 2 : u(n+1) = (u(n)+2)/(u(n)+1), u0 = 1 =================
f = lambda t: (t + 2) / (t + 1)
for t in rats:
    if t != -1:
        check(f(t) == 1 + 1 / (t + 1), "f(x) = 1 + 1/(x+1)")
        check(f(t) - t == (2 - t * t) / (t + 1), "f(x) - x = (2 - x^2)/(x+1)")
grid = [F(k, 10) for k in range(0, 101)]
check(all(f(grid[i]) > f(grid[i + 1]) for i in range(len(grid) - 1)), "f decroissante sur [0, 10]")
check(f(F(1)) == F(3, 2) and f(F(3, 2)) == F(7, 5), "f(1) = 3/2, f(3/2) = 7/5")
U = [F(1)]
for _ in range(40):
    U.append(f(U[-1]))
check(U[1:9] == [F(3, 2), F(7, 5), F(17, 12), F(41, 29), F(99, 70), F(239, 169), F(577, 408), F(1393, 985)], "u1..u8")
check(all(1 <= t <= F(3, 2) for t in U), "1 <= u(n) <= 3/2")
check(1 < S2 and S2 < F(3, 2), "1 < sqrt2 < 3/2")
q = (1 - S2) / (1 + S2)
check(q == R2(-3, 2), "q = 2sqrt2 - 3")
check(q.sign() < 0 and (q + 1).sign() > 0, "-1 < q < 0")
check(abs(q) < F(172, 1000) and F(1414, 1000) ** 2 < 2, "|q| < 0.172")
check(round(float(q), 4) == -0.1716, "q ~ -0.1716")
for t in [F(1), F(3, 2), F(7, 5)] + [abs(z) + 1 for z in rats[:50]]:
    T = R2(t)
    check(f(t) - S2 == (1 - S2) * (T - S2) / (t + 1), "u(n+1) - sqrt2")
    check(f(t) + S2 == (1 + S2) * (T + S2) / (t + 1), "u(n+1) + sqrt2")
V = [(R2(t) - S2) / (R2(t) + S2) for t in U]
check(V[0] == q, "v0 = q")
for n in range(40):
    check(V[n + 1] == q * V[n], "v geometrique de raison q")
    check(V[n] == q ** (n + 1), "v(n) = q^(n+1)")
    check(abs(V[n]) < 1, "|v(n)| < 1")
    check(R2(U[n]) == S2 * (1 + V[n]) / (1 - V[n]), "u = sqrt2 (1+v)/(1-v)")
    check((R2(U[n]) - S2).sign() == (-1 if n % 2 == 0 else 1), "u(2k) < sqrt2 < u(2k+1)")
    check(abs(R2(U[n]) - S2) == abs(V[n]) * (R2(U[n]) + S2), "|u - sqrt2| = |v|(u + sqrt2)")
    check(not (abs(R2(U[n]) - S2) > 3 * abs(q) ** (n + 1)), "|u(n) - sqrt2| <= 3|q|^(n+1)")
check(F(3, 2) + S2 < 3, "3/2 + sqrt2 < 3")
check(U[7] - U[8] == F(1, 401880) and F(1, 401880) < F(1, 10 ** 5), "u7 - u8 = 1/401880 < 10^-5")
check(577 * 985 == 568345 and 1393 * 408 == 568344 and 408 * 985 == 401880, "produits de l'encadrement")
check(round(1 / 401880 * 1e6, 2) == 2.49, "1/401880 ~ 2.49e-6")
check(3 * F(172, 1000) ** 9 < F(1, 10 ** 6), "3 * 0.172^9 < 10^-6")
check(round(3 * 0.172 ** 9 * 1e7, 2) == 3.95, "3 * 0.172^9 ~ 3.95e-7")
check(F(1414, 1000) ** 2 == F(1999396, 1000000), "1.414^2 = 1.999396")
check(abs(q) ** 9 < F(1, 3 * 10 ** 6), "3|q|^9 < 10^-6 (exact)")
check(round(float(abs(q) ** 9) * 1e7, 2) == 1.29 and round(0.172 ** 9 * 1e7, 2) == 1.32, "|q|^9 ~ 1.29e-7, 0.172^9 ~ 1.32e-7")
check(abs(R2(U[8]) - S2) < F(1, 10 ** 6) and abs(R2(U[7]) - S2) > F(1, 10 ** 6), "u8 a 1e-6 pres, pas u7")
check(all(abs(R2(U[n]) - S2) < F(1, 10 ** 6) for n in range(8, 41)), "|u(n) - sqrt2| < 1e-6 pour n >= 8")
check([round(float(U[n]), 7) for n in (7, 8)] == [1.4142157, 1.4142132] and round(math.sqrt(2), 7) == 1.4142136, "decimales")

print(f"all {ok} checks passed")
