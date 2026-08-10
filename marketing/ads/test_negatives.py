#!/usr/bin/env python3
"""Negative-keyword SEMANTICS tests: representative search terms that must be
blocked vs allowed. Guards against over-blocking (lost patients) as much as
under-blocking (wasted spend). Run: python3 test_negatives.py"""
import re, sys, yaml, os
ROOT = os.path.dirname(os.path.abspath(__file__))
doc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))
GEN = {nl['name']: nl['terms'] for nl in doc['negative_lists'] if nl['risk_tier'] != 'review'}
REVIEW = {nl['name']: nl['terms'] for nl in doc['negative_lists'] if nl['risk_tier'] == 'review'}

def matches(term, phrase):
    tw = re.findall(r'[a-z0-9]+', term.lower()); pw = re.findall(r'[a-z0-9]+', phrase.lower())
    return any(tw[i:i+len(pw)] == pw for i in range(len(tw)-len(pw)+1))

def blocked_by(term, lists):
    return [f'{n}:{p}' for n, ts in lists.items() for p in ts if matches(term, p)]

CASES = [   # (search term, expected blocked-by-GENERATED-lists?, rationale)
    ("free dental implants near me",      True,  "freebie intent"),
    ("dental implant trial near me",      True,  "research/trial intent"),
    ("dental school clinic near me",      True,  "training-clinic intent"),
    ("dentist in temple tx",              True,  "far geography"),
    ("aspen dental austin",               True,  "competitor brand"),
    ("onion creek family dentistry",      True,  "competitor brand (exact practice name)"),
    ("dental implants austin",            False, "core paid intent - MUST serve"),
    ("dental implants near me",           False, "core paid intent - MUST serve"),
    ("affordable dental implants austin", False, "price-conscious but bookable; 'affordable dentures' must not over-match"),
    ("nextgen dental implants",           False, "own brand - never block"),
    ("compare implant dentists",          False, "comparison shopping - legitimate"),
    ("dentist onion creek",               False, "OUR service area; must NOT be caught by the competitor phrase"),
    ("emergency dentist south austin",    False, "other services - unaffected"),
    ("implant dentist near cedar park",   False, "near-metro list is REVIEW-ONLY and never generated"),
]
fails = 0
for term, expect_blocked, why in CASES:
    hits = blocked_by(term, GEN)
    ok = bool(hits) == expect_blocked
    if not ok:
        fails += 1
        print(f'FAIL  {term!r}: expected {"BLOCK" if expect_blocked else "ALLOW"}, got {hits or "ALLOW"}  ({why})')
# review-only list must never be in generated output
for term in ("implant dentist near cedar park", "dentist round rock"):
    if blocked_by(term, GEN):
        fails += 1; print(f'FAIL  review-only geography leaked into generated lists via {term!r}')
    if not blocked_by(term, REVIEW):
        print(f'note  {term!r} not matched by review list (informational)')
print(f'negative semantics: {len(CASES)} cases, {fails} failed')
sys.exit(1 if fails else 0)
