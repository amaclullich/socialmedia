#!/usr/bin/env python3
"""Controlled-randomness stimulus generator for the geriatrics 200 collection.

Each draw is an independent random string from the operating system's
cryptographic random source (secrets.token_hex). The string's hex digits are
split into fixed slices, and each slice selects one entry from a neutral word
bank. The combination is a creative prompt only. It never determines facts,
clinical advice, statistics or citations.

Usage: python3 generate_random.py [draws_per_category] > draws.json
"""
import json
import secrets
import sys
from datetime import datetime, timezone

BANKS = json.load(open(__file__.replace("generate_random.py", "wordbanks.json")))
CATEGORIES = [f"C{n:02d}" for n in range(1, 21)]
ORDER = ["object", "domain", "process", "quality", "operation", "viewpoint", "timescale"]


def draw():
    s = secrets.token_hex(14)  # 28 hex digits, 4 per bank
    picks = {}
    for i, bank in enumerate(ORDER):
        chunk = s[i * 4:(i + 1) * 4]
        entries = BANKS[bank]
        picks[bank] = entries[int(chunk, 16) % len(entries)]
    return s, picks


def main():
    per_cat = int(sys.argv[1]) if len(sys.argv) > 1 else 14
    out = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "method": "secrets.token_hex(14); slices of 4 hex digits index the banks in order "
                  + ", ".join(ORDER) + " (value modulo bank length).",
        "bank_sizes": {k: len(BANKS[k]) for k in ORDER},
        "draws": {},
    }
    for c in CATEGORIES:
        rows = []
        for j in range(per_cat):
            s, picks = draw()
            rows.append({"draw_id": f"{c}-R{j + 1:02d}", "string": s, **picks})
        out["draws"][c] = rows
    json.dump(out, sys.stdout, indent=1)


if __name__ == "__main__":
    main()
