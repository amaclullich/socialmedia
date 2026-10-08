#!/usr/bin/env python3
"""Merge posts/visual_updates/<tmp_id>.json into posts/<cat>_posts.json. Usage: merge_visuals.py C08 [C09 ...]"""
import json, os, sys
for cat in sys.argv[1:]:
    f = f'posts/{cat}_posts.json'
    d = json.load(open(f)); n = 0
    for p in d['posts']:
        u = f"posts/visual_updates/{p['tmp_id']}.json"
        if not os.path.exists(u):
            continue
        v = json.load(open(u))
        ok = all(os.path.exists('visuals/png/' + x) for x in v['visual_files']) and all(len(a) <= 400 for a in v['alt_text'])
        for k in ('visual_files', 'visual_source', 'visual_format', 'visual_text', 'alt_text', 'design_instructions'):
            p[k] = v[k]
        p['visual_status'] = 'final' if ok else 'visual_open'
        n += ok
    json.dump(d, open(f, 'w'), indent=1)
    print(cat, 'merged', n, 'of', len(d['posts']))
