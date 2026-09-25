#!/usr/bin/env python3
"""Build the browsable catalogue: catalogue/index.html plus web-sized JPEGs in catalogue/img/.

The page embeds the post records as JSON and references images by relative path, so the
same folder works opened locally and published as an Artifact (images published as files).
"""
import html
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


def web_images(posts):
    os.makedirs(P("catalogue", "img"), exist_ok=True)
    for p in posts:
        out = []
        for f in p.get("visual_files") or []:
            src = P("visuals", "png", f)
            if not os.path.exists(src):
                continue
            dst_name = os.path.splitext(f)[0] + ".jpg"
            dst = P("catalogue", "img", dst_name)
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                im = Image.open(src).convert("RGB")
                im.thumbnail((1080, 1350), Image.LANCZOS)
                im.save(dst, "JPEG", quality=86, optimize=True, progressive=True)
            out.append("img/" + dst_name)
        p["_web"] = out


def main():
    d = json.load(open(P("posts", "ALL_POSTS.json")))
    posts = d["posts"]
    src = json.load(open(P("evidence", "SOURCES.json")))
    smap = {s["key"]: s for s in src["sources"]}
    cmap = {c["claim_id"]: c for c in src["claims"]}
    web_images(posts)
    recs = []
    for p in posts:
        claims = []
        for cid in p.get("claims_used") or []:
            c = cmap.get(cid, {})
            claims.append({"id": cid, "claim": c.get("claim", ""), "verdict": c.get("verdict", ""), "passage": c.get("supporting_passage", ""),
                           "location": c.get("location", ""), "sources": [{"citation": (smap.get(k) or {}).get("citation", k),
                                                                           "url": (smap.get(k) or {}).get("public_url", ""),
                                                                           "access": (smap.get(k) or {}).get("access", ""),
                                                                           "checked": (smap.get(k) or {}).get("date_checked", "")} for k in (c.get("source_keys") or [])]})
        recs.append({"id": p["id"], "title": p.get("title", ""), "cat": p.get("category"), "catName": p.get("category_name", ""), "aud": p.get("audience"),
                     "series": p.get("series"), "type": p.get("post_type"), "format": p.get("visual_format") or (p.get("visual_brief") or {}).get("format"),
                     "insight": p.get("insight", ""), "angle": p.get("angle", ""), "basis": p.get("position_basis", ""), "captions": p.get("captions", {}),
                     "reply": p.get("source_reply", ""), "imgs": p["_web"], "alt": p.get("alt_text") or [], "claims": claims,
                     "vnotes": p.get("verification_notes", ""), "pause": p.get("attention_note", ""), "gain": p.get("gain_note", ""),
                     "follow": p.get("follow_note", ""), "status": p.get("status"), "vstatus": p.get("visual_status"), "issues": p.get("open_issues") or [],
                     "design": p.get("design_instructions", "")})
    tpl = open(P("_system", "catalogue_template.html")).read()
    page = tpl.replace("/*__DATA__*/[]", json.dumps(recs, ensure_ascii=False).replace("</", "<\\/"))
    page = page.replace("__N_POSTS__", str(len(recs))).replace("__N_SOURCES__", str(src["n_sources"]))
    open(P("catalogue", "index.html"), "w").write(page)
    print(json.dumps({"posts": len(recs), "images": sum(len(r["imgs"]) for r in recs),
                      "img_bytes": sum(os.path.getsize(P("catalogue", x)) for r in recs for x in r["imgs"])}))


if __name__ == "__main__":
    main()
