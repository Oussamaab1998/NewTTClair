"""Merge map_3se / map_2sc / map_1s into one component list with the exercises that use each one.

usage: python3 -I merge_maps.py <mapping dir> <out.md> <out.json>
"""
import json, sys, re, pathlib
from collections import defaultdict, OrderedDict

mdir, out_md, out_json = map(pathlib.Path, sys.argv[1:4])
YEARS = [("1s", "1ère"), ("2sc", "2ème Sc."), ("3se", "3ème Sc. exp.")]
DOMAIN_ORDER = ["generic", "numbers & algebra", "functions & analysis", "sequences",
                "plane geometry & transformations", "vectors & analytic geometry", "trigonometry",
                "space geometry", "complex numbers", "counting & probability", "statistics"]
STATUS_ORDER = {"existing": 0, "extend": 1, "reserved": 2, "new": 3}

maps = {y: json.load(open(mdir / f"map_{y}.json")) for y, _ in YEARS if (mdir / f"map_{y}.json").exists()}

comp = OrderedDict()        # name -> merged info
uses = defaultdict(lambda: defaultdict(list))  # name -> year -> [(exercise, questions, why)]
for y, _ in [("3se", ""), ("2sc", ""), ("1s", "")]:   # 3se first: it defined the vocabulary
    if y not in maps:
        continue
    for c in maps[y]["components"]:
        n = c["name"]
        # later years may write "extend" relative to the 3se definition; repo_status says where the repo is
        st = c.get("repo_status") or c["status"]
        if n not in comp:
            comp[n] = dict(c, status=st, first_year=y, notes_by_year={})
            comp[n].pop("repo_status", None); comp[n].pop("vocabulary", None)
        else:
            base = comp[n]
            # a component the app already has becomes "extend" if any year needs more from it
            if base["status"] == "existing" and st == "extend":
                base["status"] = "extend"
            if c.get("domain") and base.get("domain") != c["domain"]:
                base.setdefault("other_domains", set()).add(c["domain"])
        note = (c.get("extends_note") or "").strip()
        if note:
            comp[n]["notes_by_year"][y] = note
    for u in maps[y]["uses"]:
        for n in u["components"]:
            uses[n][y].append((u["exercise"], u.get("questions", ""), u.get("why", "")))

missing = [n for n in uses if n not in comp]
if missing:
    raise SystemExit(f"components used but never defined: {missing}")

def ex_count(n, y=None):
    ys = [y] if y else list(uses[n])
    return len({e for yy in ys for (e, _, _) in uses[n].get(yy, [])})

def link(ex):
    year, stem, exn = ex.split("/")
    m = re.match(r"(?:(T\d)_)?(CH\d+)", stem)
    label = "-".join(p for p in m.groups() if p) if m else stem
    return f"[{label} {exn}]({year}/{stem}.md)"

total_ex = {y: len({u["exercise"] for u in maps[y]["uses"]}) for y in maps}
rows = sorted(comp, key=lambda n: (DOMAIN_ORDER.index(comp[n]["domain"]) if comp[n]["domain"] in DOMAIN_ORDER else 99,
                                    -ex_count(n), n))
by_status = defaultdict(list)
for n in comp:
    by_status[comp[n]["status"]].append(n)

L = []
L.append("# Components the exercise banks need\n")
L.append("Which interactive components the 110 practice exercises in `docs/exercises/` (1ère, 2ème Sciences, 3ème Sc. exp.) need, and which exercises use each one. One component serves many exercises.\n")
L.append(f"- Exercises mapped: " + ", ".join(f"{lab} {total_ex[y]}" for y, lab in YEARS if y in total_ex) + f" (total {sum(total_ex.values())}).")
L.append(f"- Components: {len(comp)} in total — " + ", ".join(f"{len(by_status[s])} {s}" for s in ["existing", "extend", "reserved", "new"]) + ".")
L.append("  - **existing**: in the registry today, usable as is. **extend**: in the registry, needs new props (notes below). **reserved**: name reserved in `src/components/contract.ts`, not built. **new**: to design and build.")
L.append("- An exercise counts once per component even if several of its questions use it. Data: `components_needed.json` next to this file. Generated from the per-year maps in `component_maps/` (with the question-by-question reasons) by `component_maps/merge_maps.py`; the summary below comes from `component_maps/PREAMBLE.md`. `reviewed: false`.\n")
pre = mdir / "PREAMBLE.md"
if pre.exists():
    L.append(pre.read_text(encoding="utf-8").rstrip() + "\n")

L.append("## Summary table\n")
L.append("| Component | Domain | Status | " + " | ".join(lab for _, lab in YEARS) + " | Total |")
L.append("|---|---|---|" + "---|" * len(YEARS) + "---|")
for n in rows:
    c = comp[n]
    L.append(f"| [{n}](#{n.lower()}) | {c['domain']} | {c['status']} | " + " | ".join(str(ex_count(n, y) or "") for y, _ in YEARS) + f" | {ex_count(n)} |")
L.append("")

L.append("## Components and the exercises that use them\n")
cur = None
for n in rows:
    c = comp[n]
    if c["domain"] != cur:
        cur = c["domain"]
        L.append(f"### {cur[0].upper() + cur[1:]}\n")
    L.append(f"#### {n}\n")
    L.append(f"- **Status:** {c['status']}. **Used by** {ex_count(n)} exercises (" + ", ".join(f"{lab} {ex_count(n, y)}" for y, lab in YEARS if ex_count(n, y)) + ").")
    L.append(f"- **Purpose:** {c.get('purpose', '').strip()}")
    if c.get("student_action"):
        L.append(f"- **Student action:** {c['student_action'].strip()}")
    if c.get("engine_needs"):
        L.append(f"- **Engine:** {c['engine_needs'].strip()}")
    if c.get("props_sketch"):
        L.append(f"- **Props (sketch):** {c['props_sketch'].strip()}")
    for y, lab in YEARS[::-1]:
        if y in c["notes_by_year"]:
            L.append(f"- **To add for {lab}:** {c['notes_by_year'][y]}")
    for y, lab in YEARS:
        lst = uses[n].get(y)
        if not lst:
            continue
        grouped = OrderedDict()
        for ex, q, _ in lst:
            grouped.setdefault(ex, []).append(q)
        L.append(f"- **{lab}:** " + "; ".join(f"{link(ex)} ({', '.join(dict.fromkeys(q for q in qs if q))})" if any(qs) else link(ex) for ex, qs in grouped.items()))
    L.append("")

out_md.write_text("\n".join(L) + "\n", encoding="utf-8")
data = {"years": {y: total_ex[y] for y in total_ex},
        "components": [dict({k: v for k, v in comp[n].items() if k not in ("other_domains",)},
                            exercises={y: sorted({e for e, _, _ in uses[n].get(y, [])}) for y in maps},
                            exercise_count=ex_count(n)) for n in rows]}
out_json.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(comp)} components; exercises per year {total_ex}; status {dict((s, len(v)) for s, v in by_status.items())}")
print("top 15:", [(n, ex_count(n)) for n in sorted(comp, key=lambda n: -ex_count(n))[:15]])
