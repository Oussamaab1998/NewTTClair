"""Checks every value used in CH16_EXPLOITATION_INFORMATION.md (1ère année).

Exercise 1 rebuilds the raw list of 40 answers and recomputes every parameter
from it (sorting, counting), not from the formulas of the corrige.
Exercise 2 recomputes the grouped-data table, the histogram heights, the
cumulative-frequency polygon (median read by bisection on the polygon), and the
chronological series (multiplying coefficients, indices).
"""
from fractions import Fraction as F
from collections import Counter

ok = 0
def check(cond, msg):
    global ok
    if not cond:
        raise SystemExit("FAIL: " + msg)
    ok += 1

def r2(x):  # round half up to 2 decimals, as printed
    return f"{float(x) + 1e-12:.2f}"

# ================= Exercice 1 : livres lus pendant les vacances =================
values = [0, 1, 2, 3, 4, 5, 6]
counts = [4, 8, 10, 7, 6, 3, 2]
raw = sorted(v for v, c in zip(values, counts) for _ in range(c))
N = len(raw)
check(N == 40, "N = 40")
cnt = Counter(raw)
check([cnt[v] for v in values] == counts, "table")
freq = [F(cnt[v], N) for v in values]
check([float(f) for f in freq] == [0.1, 0.2, 0.25, 0.175, 0.15, 0.075, 0.05], "frequencies")
check([f"{float(f * 100):g}" for f in freq] == ["10", "20", "25", "17.5", "15", "7.5", "5"], "percentages")
cum = [F(sum(1 for x in raw if x <= v), N) for v in values]
check([float(c) for c in cum] == [0.1, 0.3, 0.55, 0.725, 0.875, 0.95, 1.0], "cumulative frequencies")
check([sum(1 for x in raw if x <= v) for v in values] == [4, 12, 22, 29, 35, 38, 40], "cumulative counts")
angles = [360 * f for f in freq]
check(angles == [36, 72, 90, 63, 54, 27, 18] and sum(angles) == 360, "pie chart angles")
check(F(360, N) == 9, "9 degrees per student")
mx = max(cnt.values())
modes = [v for v in values if cnt[v] == mx]
check(modes == [2], "unimodal, mode 2")
med = F(raw[19] + raw[20], 2)          # 20th and 21st values
check(raw[19] == 2 and raw[20] == 2 and med == 2, "median 2")
check(sum(1 for x in raw if x <= med) >= N / 2 and sum(1 for x in raw if x >= med) >= N / 2, "median splits the series")
mean = F(sum(raw), N)
check(sum(raw) == 100 and mean == F(5, 2), "mean 2.5")
check([v * cnt[v] for v in values] == [0, 8, 20, 21, 24, 15, 12], "products value x count written in the corrige")
check(sum(f * v for f, v in zip(freq, values)) == mean, "mean with frequencies")
check(max(raw) - min(raw) == 6, "range 6")
check(F(sum(1 for x in raw if x <= 2), N) == F(55, 100), "55% at most 2 books")
check(F(sum(1 for x in raw if x >= 4), N) == F(275, 1000), "27.5% at least 4 books")
check(1 - cum[3] == F(275, 1000), "via cumulative frequencies")
above = sum(1 for x in raw if x > mean)
check(above == 18 and F(above, N) == F(45, 100), "18 students (45%) above the mean")
check(sum(1 for x in raw if x >= 3) == 18, "above the mean = at least 3 books")
check(sum(1 for x in raw if x >= 4) == 11 and sum(1 for x in raw if x <= 1) == 12, "11 vs 12: chances")
check(sum(1 for x in raw if x <= 1) > sum(1 for x in raw if x >= 4), "more chances for 'at most 1'")
raw2 = sorted(raw + [10])
check(len(raw2) == 41 and sum(raw2) == 110, "new total 110 for 41 students")
check(F(110, 41) > mean and r2(F(110, 41)) == "2.68", "new mean 110/41 ~ 2.68")
check(raw2[20] == 2, "new median = 21st value = 2")
cnt2 = Counter(raw2)
check([v for v in cnt2 if cnt2[v] == max(cnt2.values())] == [2], "mode unchanged (2)")
check(max(raw2) - min(raw2) == 10, "new range 10")
check(r2(F(110, 41) - mean) == "0.18", "mean increases by about 0.18")

# ================= Exercice 2, Partie A : temps de trajet =================
classes = [(0, 10), (10, 20), (20, 30), (30, 40), (40, 60)]
eff = [8, 14, 12, 10, 6]
n = sum(eff)
check(n == 50, "n = 50")
fr = [F(e, n) for e in eff]
check([float(x) for x in fr] == [0.16, 0.28, 0.24, 0.20, 0.12], "frequencies A")
cumA = [sum(fr[:i + 1]) for i in range(5)]
check([float(x) for x in cumA] == [0.16, 0.44, 0.68, 0.88, 1.0], "cumulative A")
centres = [F(a + b, 2) for a, b in classes]
check(centres == [5, 15, 25, 35, 50], "class centres")
meanA = sum(c * f for c, f in zip(centres, fr))
check(meanA == 24 and sum(c * e for c, e in zip(centres, eff)) == 1200, "mean 24 min")
# histogram: 1 cm for 10 min; one student = a rectangle 1 cm wide and 0.5 cm high (0.5 cm2)
widths = [F(b - a, 10) for a, b in classes]
heights = [e * F(1, 2) / w for e, w in zip(eff, widths)]
check(widths == [1, 1, 1, 1, 2], "widths in cm")
check(heights == [4, 7, 6, 5, F(3, 2)], "histogram heights 4, 7, 6, 5, 1.5 cm")
check(all(h * w == e * F(1, 2) for h, w, e in zip(heights, widths, eff)), "areas proportional to counts")
check(eff.index(max(eff)) == 1, "modal class [10;20[ (largest count)")
check(heights.index(max(heights)) == 1 and heights.count(max(heights)) == 1, "modal class = tallest rectangle")
check([c * f for c, f in zip(centres, fr)] == [F(8, 10), F(42, 10), 6, 7, 6], "products centre x frequency")
# cumulative polygon
pts = [(F(0), F(0))] + [(F(b), c) for (a, b), c in zip(classes, cumA)]
check(pts == [(0, 0), (10, F(16, 100)), (20, F(44, 100)), (30, F(68, 100)), (40, F(88, 100)), (60, 1)], "polygon points")
def Fcum(x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    raise ValueError
lo, hi = F(0), F(60)
for _ in range(80):
    m = (lo + hi) / 2
    if Fcum(m) < F(1, 2): lo = m
    else: hi = m
check(abs(float(lo) - 22.5) < 1e-9 and Fcum(F(45, 2)) == F(1, 2), "median 22.5 min")
check(F(10) * (F(1, 2) - F(44, 100)) / (F(68, 100) - F(44, 100)) == F(5, 2), "interpolation step 2.5")
check(Fcum(F(30)) == F(68, 100), "68% under 30 min")
check(1 - Fcum(F(40)) == F(12, 100), "12% at least 40 min")
check(Fcum(F(15)) == F(30, 100) and Fcum(F(35)) == F(78, 100), "F(15) = 0.30, F(35) = 0.78")
check(Fcum(F(35)) - Fcum(F(15)) == F(48, 100), "about 48% between 15 and 35 min")
check(meanA > F(45, 2), "mean > median")

# ================= Exercice 2, Partie B : effectif du lycée =================
years = [2018, 2019, 2020, 2021, 2022, 2023]
pop = [800, 840, 888, 920, 960, 1000]
coef = [F(p, pop[0]) for p in pop]
check(coef == [1, F(105, 100), F(111, 100), F(115, 100), F(120, 100), F(125, 100)], "coefficients exact, no rounding needed")
check([r2(c) for c in coef] == ["1.00", "1.05", "1.11", "1.15", "1.20", "1.25"], "coefficients as printed")
idx = [100 * c for c in coef]
check(idx == [100, 105, 111, 115, 120, 125], "indices base 100 in 2018")
check([100 * F(r2(c)) for c in coef] == idx, "indices from the printed coefficients are the same")
check(coef[-1] - 1 == F(25, 100), "increase 25%")
c2023_2020 = F(pop[5], pop[2])
check(c2023_2020 == idx[5] / idx[2] == coef[5] / coef[2] == F(125, 111), "C(2020 -> 2023) = 1000/888 = 125/111")
check(r2(F(1000, 888)) == "1.13" and r2(F(125, 111)) == "1.13", "both routes give 1.13")
check(f"{float(c2023_2020 - 1) * 100:.1f}" == "12.6", "+12.6%")
inc = [b - a for a, b in zip(pop, pop[1:])]
check(inc == [40, 48, 32, 40, 40], "increases +40, +48, +32, +40, +40")
check(max(inc) == 48 and inc.count(48) == 1 and inc.index(48) == 1, "2020 unique largest increase in students")
pct = [F(i, p) for i, p in zip(inc, pop)]
check([f"{float(x) * 100:.1f}" for x in pct] == ["5.0", "5.7", "3.6", "4.3", "4.2"], "yearly increases in %")
check(pct.index(max(pct)) == 1 and pct.count(max(pct)) == 1, "2020 unique largest increase in percent")
long_trip = F(12, 100) * 1000
check(long_trip == 120, "estimate 120 students with a trip of at least 40 min")
check(2 * 50 < 120 <= 3 * 50, "3 buses of 50 seats")
p2024 = pop[-1] + 40
check(p2024 == 1040 and F(12, 100) * p2024 == F(1248, 10) and F(1248, 10) <= 150, "2024: 1040, about 125, 3 buses")

print(f"all {ok} checks passed")
