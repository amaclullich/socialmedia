#!/usr/bin/env python3
"""Assemble the finished collection.

Steps (idempotent; rerun after any change):
1. Load posts/C??_posts.json in category order and assign stable identifiers
   G001..G200 in that order. The mapping tmp_id -> G id is saved in
   posts/ID_MAP.json and never reassigned once written (new posts get the next
   free number; a replacement keeps its slot's tmp_id and therefore its G id).
2. Copy each visual source and PNG to G-named files (visuals/src/G001.html,
   visuals/png/G001.png or G001_1.png ...). tmp-named originals are kept.
3. Merge evidence batch files into evidence/SOURCES.json, evidence/sources.csv,
   evidence/claims.csv (deduplicated by source key; each claim lists the G ids
   that use it).
4. Write posts/ALL_POSTS.json (master), posts/by_id/G001.md ... (readable record
   per post) and INDEX.xlsx (index, captions, visuals, sources, claims,
   candidates, completion).
"""
import csv
import glob
import json
import os
import re
import shutil
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


def load_posts():
    posts = []
    for f in sorted(glob.glob(P("posts", "C[0-9][0-9]_posts.json"))):
        d = json.load(open(f))
        for p in d["posts"]:
            p.setdefault("category_name", d.get("category_name"))
            posts.append(p)
    return posts


def assign_ids(posts):
    mp_path = P("posts", "ID_MAP.json")
    mp = json.load(open(mp_path)) if os.path.exists(mp_path) else {}
    used = {int(v[1:]) for v in mp.values()}
    nxt = max(used) + 1 if used else 1
    for p in posts:
        t = p["tmp_id"]
        if t not in mp:
            while nxt in used:
                nxt += 1
            mp[t] = f"G{nxt:03d}"
            used.add(nxt)
            nxt += 1
        p["id"] = mp[t]
    json.dump(mp, open(mp_path, "w"), indent=1)
    return mp


def copy_visuals(p):
    t, g = p["tmp_id"], p["id"]
    src = P("visuals", "src", f"{t}.html")
    if os.path.exists(src):
        shutil.copyfile(src, P("visuals", "src", f"{g}.html"))
        p["visual_source"] = f"visuals/src/{g}.html"
    new = []
    for f in p.get("visual_files", []) or []:
        base = os.path.basename(f)
        gname = base.replace(t, g)
        for ext in ("", ".jpg"):
            a = P("visuals", "png", base if not ext else base.replace(".png", ".jpg"))
            b = P("visuals", "png", gname if not ext else gname.replace(".png", ".jpg"))
            if os.path.exists(a) and a != b:
                shutil.copyfile(a, b)
        new.append(gname)
    txt = P("visuals", "png", "text", f"{t}.txt")
    if os.path.exists(txt):
        shutil.copyfile(txt, P("visuals", "png", "text", f"{g}.txt"))
    p["visual_files"] = new


def merge_evidence(posts):
    sources, claims = {}, {}
    for f in sorted(glob.glob(P("evidence", "batches", "*.json"))):
        d = json.load(open(f))
        for s in d.get("sources", []):
            k = s["key"]
            if k not in sources:
                s = dict(s)
                s["batches"] = [d["batch"]]
                s.setdefault("date_checked", d.get("date_checked"))
                sources[k] = s
            else:
                sources[k]["batches"].append(d["batch"])
                if sources[k].get("access") != "full_text" and s.get("access") == "full_text":
                    sources[k]["access"] = "full_text"
        for c in d.get("claims", []):
            c = dict(c)
            c["batch"] = d["batch"]
            claims[c["claim_id"]] = c
    use = {}
    for p in posts:
        for cid in p.get("claims_used", []) or []:
            use.setdefault(cid, []).append(p["id"])
    for cid, c in claims.items():
        c["used_by"] = use.get(cid, [])
    for s in sources.values():
        s["used_by"] = sorted({g for c in claims.values() if s["key"] in (c.get("source_keys") or []) for g in c["used_by"]})
    json.dump({"generated": str(date.today()), "n_sources": len(sources), "n_claims": len(claims),
               "sources": list(sources.values()), "claims": list(claims.values())},
              open(P("evidence", "SOURCES.json"), "w"), indent=1)
    with open(P("evidence", "sources.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["key", "citation", "pmid", "pmcid", "doi", "public_url", "design", "year", "access", "tool_used", "correction_check", "date_checked", "used_by"])
        for s in sources.values():
            w.writerow([s.get("key"), s.get("citation"), s.get("pmid"), s.get("pmcid"), s.get("doi"), s.get("public_url"), s.get("design"), s.get("year"),
                        s.get("access"), s.get("tool_used"), s.get("correction_check"), s.get("date_checked"), " ".join(s.get("used_by", []))])
    with open(P("evidence", "claims.csv"), "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["claim_id", "claim", "verdict", "source_keys", "supporting_passage", "location", "safe_wording", "qualifications", "used_by"])
        for c in claims.values():
            w.writerow([c.get("claim_id"), c.get("claim"), c.get("verdict"), " ".join(c.get("source_keys") or []), c.get("supporting_passage"),
                        c.get("location"), c.get("safe_wording"), c.get("qualifications"), " ".join(c.get("used_by", []))])
    return sources, claims


def post_md(p, sources, claims):
    L = [f"# {p['id']}: {p.get('title', '')}", ""]
    L += [f"- Category: {p.get('category')} {p.get('category_name', '')}", f"- Audience: {p.get('audience')}", f"- Series: {p.get('series')}",
          f"- Post type: {p.get('post_type')}", f"- Visual format: {p.get('visual_format') or (p.get('visual_brief') or {}).get('format')}",
          f"- Status: text {p.get('status')}, visual {p.get('visual_status')}", f"- Working id: {p['tmp_id']} (candidate {p.get('cand_id')})", ""]
    L += ["## Insight", "", p.get("insight", ""), "", "## Angle and position", "", p.get("angle", ""), "", f"Basis: {p.get('position_basis', '')}", ""]
    for plat, name in (("x", "X"), ("linkedin", "LinkedIn"), ("bluesky", "Bluesky"), ("threads", "Threads")):
        t = (p.get("captions") or {}).get(plat, "")
        L += [f"## {name} ({len(t)} characters)", "", "```text", t, "```", ""]
    L += ["## Source reply", "", p.get("source_reply", ""), ""]
    L += ["## Visual", ""]
    for i, f in enumerate(p.get("visual_files", []) or []):
        alt = (p.get("alt_text") or [""] * 99)[i] if i < len(p.get("alt_text") or []) else ""
        L += [f"![{p['id']} image {i + 1}](../../visuals/png/{f})", "", f"Alt text: {alt}", ""]
    L += [f"Editable source: `{p.get('visual_source', '')}`", "", f"Design instructions: {p.get('design_instructions', '')}", ""]
    L += ["## Sources and verification", ""]
    for cid in p.get("claims_used", []) or []:
        c = claims.get(cid, {})
        keys = c.get("source_keys") or []
        cites = "; ".join((sources.get(k) or {}).get("citation", k) for k in keys)
        L += [f"- {cid} ({c.get('verdict', 'not found')}): {c.get('claim', '')}", f"  - Source: {cites}", f"  - Passage: \"{c.get('supporting_passage', '')}\" ({c.get('location', '')})"]
    L += ["", f"Verification notes: {p.get('verification_notes', '')}", ""]
    L += ["## Attention and follow potential", "", f"Pause: {p.get('attention_note', '')}", "", f"Gain: {p.get('gain_note', '')}", "", f"Follow: {p.get('follow_note', '')}", ""]
    oi = p.get("open_issues") or []
    L += ["## Open issues", ""] + ([f"- {x}" for x in oi] if oi else ["None."]) + [""]
    return "\n".join(L)


def write_xlsx(posts, sources, claims):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font
    wb = Workbook()
    ws = wb.active
    ws.title = "Index"
    hdr = ["ID", "Category", "Category name", "Audience", "Series", "Post type", "Visual format", "Images", "Title", "Insight", "Angle", "Text status", "Visual status", "Sources", "Open issues"]
    ws.append(hdr)
    for p in posts:
        ws.append([p["id"], p.get("category"), p.get("category_name"), p.get("audience"), p.get("series"), p.get("post_type"),
                   p.get("visual_format") or (p.get("visual_brief") or {}).get("format"), len(p.get("visual_files") or []), p.get("title"), p.get("insight"),
                   p.get("angle"), p.get("status"), p.get("visual_status"), " ".join(p.get("sources_used") or []), " | ".join(p.get("open_issues") or [])])
    ws2 = wb.create_sheet("Captions")
    ws2.append(["ID", "X", "X chars", "LinkedIn", "LinkedIn chars", "Bluesky", "Bluesky chars", "Threads", "Threads chars", "Source reply"])
    for p in posts:
        c = p.get("captions") or {}
        ws2.append([p["id"], c.get("x"), len(c.get("x") or ""), c.get("linkedin"), len(c.get("linkedin") or ""), c.get("bluesky"), len(c.get("bluesky") or ""),
                    c.get("threads"), len(c.get("threads") or ""), p.get("source_reply")])
    ws3 = wb.create_sheet("Visuals")
    ws3.append(["ID", "Files", "Editable source", "Alt text", "Visual text", "Design instructions"])
    for p in posts:
        ws3.append([p["id"], " ".join(p.get("visual_files") or []), p.get("visual_source"), "\n\n".join(p.get("alt_text") or []),
                    "\n".join(p.get("visual_text") or []), p.get("design_instructions")])
    ws4 = wb.create_sheet("Sources")
    ws4.append(["Key", "Citation", "Public link", "PMID", "DOI", "Design", "Year", "Access", "Tool", "Correction check", "Date checked", "Used by"])
    for s in sources.values():
        ws4.append([s.get("key"), s.get("citation"), s.get("public_url"), s.get("pmid"), s.get("doi"), s.get("design"), s.get("year"), s.get("access"),
                    s.get("tool_used"), s.get("correction_check"), s.get("date_checked"), " ".join(s.get("used_by", []))])
    ws5 = wb.create_sheet("Claims")
    ws5.append(["Claim id", "Claim", "Verdict", "Source keys", "Supporting passage", "Location", "Safe wording", "Qualifications", "Used by"])
    for c in claims.values():
        ws5.append([c.get("claim_id"), c.get("claim"), c.get("verdict"), " ".join(c.get("source_keys") or []), c.get("supporting_passage"), c.get("location"),
                    c.get("safe_wording"), c.get("qualifications"), " ".join(c.get("used_by", []))])
    ws6 = wb.create_sheet("Candidates")
    ws6.append(["Candidate", "Category", "Origin", "Draw id", "Working title", "Audience", "Series", "Judge total", "Selected", "Used as"])
    used = {p.get("cand_id"): p["id"] for p in posts}
    sl = json.load(open(P("_working", "selection", "SHORTLIST.json"))) if os.path.exists(P("_working", "selection", "SHORTLIST.json")) else {"categories": []}
    selected = {x for c in sl["categories"] for x in c["selected"]}
    for f in sorted(glob.glob(P("_working", "candidates", "C*.json"))):
        d = json.load(open(f))
        sc = {s["cand_id"]: s for s in json.load(open(P("_working", "selection", f"{d['category']}_scores.json")))["scores"]} if os.path.exists(P("_working", "selection", f"{d['category']}_scores.json")) else {}
        for c in d["candidates"]:
            ws6.append([c["cand_id"], d["category"], c.get("origin"), c.get("draw_id"), c.get("working_title"), c.get("audience"), c.get("series"),
                        (sc.get(c["cand_id"]) or {}).get("total"), "yes" if c["cand_id"] in selected else "", used.get(c["cand_id"], "")])
    for w in wb.worksheets:
        for cell in w[1]:
            cell.font = Font(bold=True)
        w.freeze_panes = "B2"
        for col in w.columns:
            w.column_dimensions[col[0].column_letter].width = 18 if col[0].column_letter in "ABCDEFGH" else 60
        for row in w.iter_rows(min_row=2):
            for cell in row:
                cell.alignment = Alignment(wrap_text=True, vertical="top")
    wb.save(P("INDEX.xlsx"))


def main():
    posts = load_posts()
    assign_ids(posts)
    for p in posts:
        copy_visuals(p)
    sources, claims = merge_evidence(posts)
    json.dump({"generated": str(date.today()), "n_posts": len(posts), "posts": posts}, open(P("posts", "ALL_POSTS.json"), "w"), indent=1)
    os.makedirs(P("posts", "by_id"), exist_ok=True)
    for p in posts:
        open(P("posts", "by_id", f"{p['id']}.md"), "w").write(post_md(p, sources, claims))
    write_xlsx(posts, sources, claims)
    print(json.dumps({"posts": len(posts), "sources": len(sources), "claims": len(claims),
                      "visual_final": sum(1 for p in posts if p.get("visual_status") == "final"),
                      "text_final": sum(1 for p in posts if p.get("status") == "text_final")}))


if __name__ == "__main__":
    main()
