#!/usr/bin/env python3
"""Deterministic checks for the geriatrics 200 collection.

Usage: python3 check_posts.py <posts.json> [more.json ...]  -> prints a JSON report
Each input file is {"posts": [post, ...]} or a list of posts. A post has
captions {x, linkedin, bluesky, threads}, alt_text (list or str), visual_text
(optional list of strings), source_reply.

Hits are reported for a human or agent to read in context. Quotations are the
one legitimate place for a banned word; the checker cannot see quotation marks
reliably, so every hit is read before it is changed.
"""
import json
import re
import sys
import unicodedata
from collections import Counter

BANNED = [
    r"cannot", r"plainly", r"crucial", r"vital", r"vitally", r"delve\w*", r"journey\w*", r"landscape\w*", r"robust\w*",
    r"leverag\w*", r"matters?", r"mattered", r"mattering", r"the shape of", r"lives in", r"sits in", r"sits alongside",
    r"lands", r"landed", r"quietly", r"load[- ]bearing", r"heavy lifting", r"carries weight", r"earns its place",
    r"the honest answer", r"worth saying", r"worth noting", r"it is important to note", r"the whole point", r"honestly",
    r"step by step", r"step-by-step", r"short answer", r"here's", r"here is", r"here are", r"the key is", r"key takeaway",
    r"let that sink in", r"game[- ]chang\w*", r"breakthrough\w*", r"proves?", r"proven", r"unpopular opinion", r"ultimately",
    r"in essence", r"the bottom line", r"furthermore", r"moreover", r"underscor\w*", r"highlights the importance",
    r"plays a role", r"play a role", r"sheds? light", r"paves? the way", r"simply put", r"wake-up call", r"red flag\w*",
    r"silver lining", r"tip of the iceberg", r"at the heart of", r"front ?line", r"roadmap", r"toolkit", r"spotlight",
    r"perfect storm", r"ticking time bomb", r"silver tsunami", r"the elderly", r"elderly", r"senior citizens?",
    r"did you know", r"imagine", r"just published", r"a new study", r"you won't believe", r"read that again",
    r"agree\?", r"thoughts\?", r"comment below", r"tag someone", r"navigate\w*", r"empower\w*", r"holistic\w*",
    r"unlock\w*", r"seamless\w*", r"tapestry", r"testament to", r"in today's", r"ever-evolving", r"deep dive",
]
QUIET_OK = re.compile(r"quiet (room|ward|bay|place|corner|space|area|voice|night)|sitting quiet|went quiet|go quiet|quieter (ward|room|bay|place|night)", re.I)
US = [r"\w+iz(e|es|ed|ing|ation|ations)\b", r"color\w*", r"behavior\w*", r"center\w*", r"\baging\b", r"pediatric\w*", r"anemi\w*",
      r"hemoglobin", r"labor\b", r"favor\w*", r"fiber\w*", r"orthopedic\w*", r"estrogen", r"edema", r"esophag\w*", r"diarrhea",
      r"hematolog\w*", r"judgment", r"program\b", r"programs\b", r"catalog\b", r"gray\b", r"counselor", r"theater", r"meter\b", r"liter\b"]
US_OK = {"size", "sizes", "sized", "prize", "prizes", "seize", "seizes", "seized", "seizing", "capsize", "citizen", "citizens",
         "sizeable", "downsize", "downsized", "downsizing", "resize", "resized", "outsized", "oversized", "baize"}
FIRST_PERSON = [r"\bI have seen\b", r"\bI've seen\b", r"\bmy patients?\b", r"\bon my ward\b", r"\bin my clinic\b", r"\bI once\b",
                r"\ba patient of mine\b", r"\bI remember\b", r"\bI saw\b", r"\bI treated\b", r"\bmy ward\b", r"\bin my experience\b"]
SHAPES = [
    (r"\b(is|are|was|were)(n't| not) [^.?\n]{1,80}[.;,:] (It|They|This|That)(’s|'s| is| are| was| were)\b", "negation then correction"),
    (r"\bnot (just|only|about|a|an|the) [^.?\n]{1,60}[.,;:] (It|This|That)(’s|'s| is)\b", "negation then correction"),
    (r"\?\s*(Because|Yes\.|No\.|The answer|Simple\.|Here)", "self-answered question"),
    (r"(^|\n)\s*Because [^\n]*\s*$", "closing moral beginning Because"),
    (r"\b(The result|The answer|The catch|The twist|The problem|The fix|The lesson)\?\s", "setup question"),
]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U00002B00-\U00002BFF️]")
URL = re.compile(r"https?://\S+")


def graphemes(s):
    s = unicodedata.normalize("NFC", s)
    return sum(1 for ch in s if not unicodedata.combining(ch))


def body_and_tags(text):
    lines = text.rstrip().split("\n")
    tags_line = lines[-1] if lines and lines[-1].strip().startswith("#") else ""
    return text, tags_line


def scan(text, where):
    hits = []
    low = text
    for pat in BANNED:
        for m in re.finditer(r"(?<![\w-])" + pat + r"(?![\w-])", low, re.I):
            w = m.group(0)
            ctx = low[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
            if w.lower() in ("matter", "matters") and re.search(r"What Matters", ctx):
                continue
            if w.lower() == "quietly" and QUIET_OK.search(ctx):
                continue
            if w.lower() in ("lands", "landed") and re.search(r"(land|lands) (in|on) (the )?(floor|ground)", ctx, re.I):
                continue
            hits.append({"where": where, "type": "banned", "term": w, "context": ctx})
    for m in re.finditer(r"\bquiet\b", low, re.I):
        ctx = low[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
        if not QUIET_OK.search(ctx):
            hits.append({"where": where, "type": "check_quiet", "term": "quiet", "context": ctx})
    for pat in US:
        for m in re.finditer(r"\b" + pat, low, re.I):
            w = m.group(0)
            if w.lower() in US_OK or URL.search(low[max(0, m.start() - 60): m.end() + 5]):
                continue
            hits.append({"where": where, "type": "us_spelling?", "term": w, "context": low[max(0, m.start() - 30): m.end() + 30].replace("\n", " ")})
    for pat in FIRST_PERSON:
        for m in re.finditer(pat, low, re.I):
            hits.append({"where": where, "type": "first_person_clinical", "term": m.group(0)})
    for pat, name in SHAPES:
        for m in re.finditer(pat, low, re.I | re.M):
            hits.append({"where": where, "type": "shape:" + name, "context": low[max(0, m.start() - 20): m.end() + 20].replace("\n", " ")})
    if re.search("[—–]", low):
        hits.append({"where": where, "type": "dash", "term": "em/en dash"})
    if re.search(r"\s-\s", URL.sub("", low)):
        hits.append({"where": where, "type": "dash", "term": "spaced hyphen"})
    if "!" in URL.sub("", low):
        hits.append({"where": where, "type": "exclamation"})
    if EMOJI.search(low):
        hits.append({"where": where, "type": "emoji"})
    if re.search(r"\*\*|^#{1,3} |→|➡|•", low, re.M):
        hits.append({"where": where, "type": "markdown_or_bullet"})
    if re.search(r"\bdelirium\b", low, re.I):
        hits.append({"where": where, "type": "mentions_delirium"})
    return hits


def check_post(p):
    pid = p.get("id") or p.get("cand_id")
    caps = p.get("captions", {})
    issues = []
    lengths = {}
    for plat in ("x", "linkedin", "bluesky", "threads"):
        t = caps.get(plat)
        if not t:
            issues.append({"where": plat, "type": "missing_caption"})
            continue
        n = graphemes(t)
        lengths[plat] = n
        issues += scan(t, plat)
        tags = re.findall(r"(?<![\w/])#\w+", URL.sub("", t))
        last = t.rstrip().split("\n")[-1]
        if tags:
            if not last.strip().startswith("#") or any(tag not in last for tag in tags):
                issues.append({"where": plat, "type": "hashtag_not_on_final_line"})
            if len(t.rstrip().split("\n")) >= 2 and t.rstrip().split("\n")[-2].strip() != "":
                issues.append({"where": plat, "type": "hashtag_line_needs_blank_line_before"})
        limit = {"x": 1, "linkedin": 3, "bluesky": 1, "threads": 1}[plat]
        if len(tags) > limit:
            issues.append({"where": plat, "type": "too_many_hashtags", "n": len(tags)})
        if "\n\n" not in t and n > 320 and plat != "bluesky":
            issues.append({"where": plat, "type": "no_paragraph_breaks"})
        if plat == "threads" and tags and any(c in "".join(tags) for c in ".&"):
            issues.append({"where": plat, "type": "threads_tag_chars"})
    if lengths.get("bluesky", 0) > 300:
        issues.append({"where": "bluesky", "type": "over_limit", "n": lengths["bluesky"]})
    if lengths.get("threads", 0) > 500:
        issues.append({"where": "threads", "type": "over_limit", "n": lengths["threads"]})
    if lengths.get("x") and not (250 <= lengths["x"] <= 1400):
        issues.append({"where": "x", "type": "length_outside_250_1400", "n": lengths["x"]})
    if lengths.get("linkedin") and not (700 <= lengths["linkedin"] <= 2400):
        issues.append({"where": "linkedin", "type": "length_outside_700_2400", "n": lengths["linkedin"]})
    if lengths.get("x") and lengths.get("linkedin") and lengths["x"] >= lengths["linkedin"]:
        issues.append({"where": "x", "type": "x_not_shorter_than_linkedin"})
    alts = p.get("alt_text")
    alts = alts if isinstance(alts, list) else ([alts] if alts else [])
    if not alts:
        issues.append({"where": "alt_text", "type": "missing"})
    for i, a in enumerate(alts):
        if len(a) > 400:
            issues.append({"where": f"alt_text[{i}]", "type": "alt_over_400", "n": len(a)})
        issues += scan(a, f"alt_text[{i}]")
    for i, v in enumerate(p.get("visual_text", []) or []):
        issues += [h for h in scan(v, f"visual_text[{i}]") if h["type"] not in ("no_paragraph_breaks",)]
    sr = p.get("source_reply", "")
    if not URL.search(sr or ""):
        issues.append({"where": "source_reply", "type": "no_link"})
    return {"id": pid, "lengths": lengths, "issues": issues}


def openings(posts):
    c = Counter()
    for p in posts:
        t = (p.get("captions", {}).get("x") or "").strip()
        first = " ".join(re.findall(r"[A-Za-z']+", t)[:3]).lower()
        c[first] += 1
    return [(k, v) for k, v in c.most_common(25) if v > 1]


def main():
    posts = []
    for f in sys.argv[1:]:
        d = json.load(open(f))
        posts += d["posts"] if isinstance(d, dict) else d
    reports = [check_post(p) for p in posts]
    summary = Counter(i["type"] for r in reports for i in r["issues"])
    print(json.dumps({"n_posts": len(posts), "issue_counts": summary, "repeated_openings_first3": openings(posts),
                      "posts": [r for r in reports if r["issues"]]}, indent=1))


if __name__ == "__main__":
    main()
