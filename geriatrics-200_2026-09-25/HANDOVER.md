# Handover: geriatrics 200 collection (for checking next week)

Status on 26 Sep 2026: in progress, running with minimal token use.

## Done
- Style guide, categories, platform limits, design system, renderer, checker, illustration kit (`_system/`, `visuals/design_system/`).
- 620 candidate ideas (297 from random stimuli, 323 without), all blind-scored (`_working/`).
- 200 selected plus reserves, independently checked (`_working/selection/SELECTION_FINAL.json`).
- C01 (falls): 11 posts researched, written, fact-checked, cold-read, fixed (`posts/C01_posts.json`).

## Running when this was written
- Research, writing, fact-check and plain-English checks for C02 to C20 (six workflows, `_system/workflows/produce_text.js`).
- Visuals: one low-effort pass per category (`_system/workflows/produce_visuals.js`), no separate visual inspection. C01 visuals had a full inspection.

## To check next week
1. Count posts: `python3 -c "import json,glob;print(sum(len(json.load(open(f))['posts']) for f in glob.glob('posts/C*_posts.json')))"` (target 200).
2. Text status: every post should be `text_final`; review `open_issues` fields.
3. Visuals: `visuals/png/` should hold an image for each post; spot-check them, since only C01 had independent inspection.
4. Run `python3 _system/check_posts.py posts/C*_posts.json` for style hits.
5. Run `python3 _system/assemble.py` then `python3 _system/build_catalogue.py` to produce `INDEX.xlsx`, `posts/by_id/G###.md`, the evidence library (`evidence/sources.csv`, `claims.csv`) and `catalogue/index.html`.
6. If something stopped at a usage limit, re-run the same workflow with `resumeFromRunId` (completed steps are cached), or run the remaining categories by hand from the files.

## Known issues
- Official web pages (NICE, ONS, NHS, gov.uk) could not be opened here; claims rest on PubMed-indexed papers and Drive documents.
- Scite hit its monthly limit; retraction checks were done in PubMed.
- AI artwork was not possible (image hosts blocked); all visuals are drawn in code.
- C01 lost three selected ideas (hip protectors, getting up off the floor, falls-rate metric) to fully verified reserves; consider restoring the hip-protector post.
- Drive folder created: `@ SOCIAL MEDIA HUB/Geriatrics 200 posts (non-delirium) 25 Sep 2026` (empty until assembly). Images can go into Google Docs via raw GitHub links (tested).
- Nothing has been published or scheduled.
