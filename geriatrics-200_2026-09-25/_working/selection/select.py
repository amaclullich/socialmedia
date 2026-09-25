#!/usr/bin/env python3
"""Combine blind judge scores into a shortlist of 200 posts plus reserves.

Rules
- Candidates flagged as delirium-topic, or as a substantial duplicate of an earlier
  post, are excluded. Within-set duplicates keep the higher-scoring candidate.
- Each category's allocation starts from the judge's recommendation, is scaled so
  the total is 200, clamped to 6..14, then adjusted one post at a time by comparing
  the score of the marginal candidate across categories.
- Reserves: max(3, ceil(allocation / 4)) extra candidates per category, in rank order.
- Research batches: the shortlist (selected + reserves) split into groups of up to 5.
Origin (random or non-random) is not used in selection; it is reported afterwards.
"""
import glob
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TARGET, LO, HI = 200, 6, 14

cats = {}
for f in sorted(glob.glob(os.path.join(ROOT, "_working", "candidates", "C*.json"))):
    d = json.load(open(f))
    cid = d["category"]
    sc = json.load(open(os.path.join(HERE, f"{cid}_scores.json")))
    byid = {c["cand_id"]: c for c in d["candidates"]}
    scores = {s["cand_id"]: s for s in sc["scores"]}
    ranked, excluded = [], []
    seen_dupes = set()
    for s in sorted(sc["scores"], key=lambda s: -float(s["total"])):
        cid2 = s["cand_id"]
        why = None
        if s.get("delirium_topic"):
            why = "delirium topic"
        elif s.get("earlier_duplicate"):
            why = f"duplicates earlier post {s['earlier_duplicate']}"
        elif s.get("duplicate_of") and s["duplicate_of"] in [r for r in ranked]:
            why = f"duplicate of {s['duplicate_of']} (kept the higher score)"
        if why:
            excluded.append({"cand_id": cid2, "reason": why, "total": s["total"]})
        else:
            ranked.append(cid2)
    cats[cid] = {"name": d.get("category_name"), "ranked": ranked, "excluded": excluded, "scores": scores, "cands": byid,
                 "rec": int(sc.get("recommended_allocation", 10)), "reason": sc.get("allocation_reason", "")}

rec_total = sum(c["rec"] for c in cats.values())
alloc = {k: max(LO, min(HI, round(v["rec"] * TARGET / rec_total), len(v["ranked"]))) for k, v in cats.items()}


def marginal(k, n):
    r = cats[k]["ranked"]
    return float(cats[k]["scores"][r[n - 1]]["total"]) if 0 < n <= len(r) else -1


while sum(alloc.values()) != TARGET:
    if sum(alloc.values()) > TARGET:
        k = min((k for k in alloc if alloc[k] > LO), key=lambda k: marginal(k, alloc[k]))
        alloc[k] -= 1
    else:
        k = max((k for k in alloc if alloc[k] < min(HI, len(cats[k]["ranked"]))), key=lambda k: marginal(k, alloc[k] + 1))
        alloc[k] += 1

out = {"target": TARGET, "categories": []}
aud, orig, series = {}, {}, {}
for k in sorted(cats):
    c = cats[k]
    n = alloc[k]
    res_n = max(3, math.ceil(n / 4))
    sel = c["ranked"][:n]
    reserves = c["ranked"][n:n + res_n]
    short = sel + reserves
    batches = [short[i:i + 5] for i in range(0, len(short), 5)]
    for x in sel:
        cc = c["cands"][x]
        aud[cc["audience"]] = aud.get(cc["audience"], 0) + 1
        orig[cc["origin"]] = orig.get(cc["origin"], 0) + 1
        series[cc["series"]] = series.get(cc["series"], 0) + 1
    out["categories"].append({"id": k, "name": c["name"], "allocation": n, "judge_recommendation": c["rec"],
                              "judge_reason": c["reason"], "selected": sel, "reserves": reserves, "batches": batches,
                              "excluded": c["excluded"],
                              "selected_scores": {x: c["scores"][x]["total"] for x in short}})
out["selected_audience"] = aud
out["selected_origin"] = orig
out["selected_series"] = series
out["n_candidates_total"] = sum(len(c["cands"]) for c in cats.values())
out["n_candidates_random"] = sum(1 for c in cats.values() for x in c["cands"].values() if x["origin"] == "random")
json.dump(out, open(os.path.join(HERE, "SHORTLIST.json"), "w"), indent=1)
print(json.dumps({k: out[k] for k in ("n_candidates_total", "n_candidates_random", "selected_audience", "selected_origin", "selected_series")}, indent=1))
print({c["id"]: (c["allocation"], c["judge_recommendation"], len(c["reserves"])) for c in out["categories"]})

# Compact digest of every candidate for the selection editor (one line each).
lines = []
for k in sorted(cats):
    c = cats[k]
    lines.append(f"\n## {k} {c['name']} (judge recommends {c['rec']}; mechanical allocation {alloc[k]})")
    sc_file = json.load(open(os.path.join(HERE, f"{k}_scores.json")))
    lines.append(f"Judge balance note: {sc_file.get('balance_note', '')}")
    lines.append(f"Judge allocation reason: {sc_file.get('allocation_reason', '')}")
    order = {x: i for i, x in enumerate(c['ranked'])}
    for cid, cc in sorted(c['cands'].items(), key=lambda kv: order.get(kv[0], 999)):
        s = c['scores'].get(cid, {})
        flag = next((e['reason'] for e in c['excluded'] if e['cand_id'] == cid), '')
        mark = 'SEL' if cid in c['ranked'][:alloc[k]] else ('RES' if cid in c['ranked'][alloc[k]:alloc[k] + max(3, math.ceil(alloc[k] / 4))] else '   ')
        lines.append(f"- [{mark}] {cid} total {s.get('total')} | {cc['audience']} | {cc['series']} | {cc.get('post_type')} | risk {cc.get('evidence_risk')} | {cc['working_title']} :: {cc['core_insight']}"
                     + (f" || EXCLUDED: {flag}" if flag else '')
                     + (f" || accuracy: {s.get('accuracy_concern')}" if s.get('accuracy_concern') else '')
                     + (f" || sharpen: {s.get('sharpen')}" if s.get('sharpen') else ''))
open(os.path.join(HERE, "DIGEST_FOR_EDITOR.md"), "w").write("\n".join(lines) + "\n")
print("digest lines", len(lines))
