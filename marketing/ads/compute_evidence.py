#!/usr/bin/env python3
"""Recompute negative-list evidence from the Google Ads search-terms export and
CHECK it against the numbers written in campaigns/negative-lists.yaml.

The export is NEVER committed (it contains competitor names and raw queries);
this script is the reproducibility mechanism instead.

  python3 compute_evidence.py ~/Downloads/Search\\ terms\\ report.csv
Exit 1 if any claimed figure disagrees with the data."""
import csv, re, sys, os, yaml
ROOT = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2:
    sys.exit(__doc__)
lines = open(sys.argv[1]).read().splitlines()
start = next(i for i, l in enumerate(lines) if l.startswith('Search term,'))
rows = []
for r in csv.DictReader(lines[start:]):
    t = (r.get('Search term') or '').strip()
    if not t or t.lower().startswith('total'):
        continue
    r['Clicks'] = int(r['Clicks']); r['Cost'] = float(r['Cost'].replace(',', ''))
    r['Conversions'] = float(r['Conversions'])
    rows.append(r)

def matches(term, phrase):
    tw = re.findall(r'[a-z0-9]+', term.lower()); pw = re.findall(r'[a-z0-9]+', phrase.lower())
    return any(tw[i:i+len(pw)] == pw for i in range(len(tw)-len(pw)+1))

doc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))
claimed_rows = doc['source_report']['rows_actual_search_terms']
bad = 0
print(f'search-term rows in file (totals excluded): {len(rows)}  (spec claims {claimed_rows})')
if len(rows) != claimed_rows:
    bad += 1; print('  MISMATCH: row count')
for nl in doc['negative_lists']:
    m = [r for r in rows if any(matches(r['Search term'], p) for p in nl['terms'])]
    cost = round(sum(r['Cost'] for r in m), 2)
    clicks = sum(r['Clicks'] for r in m); conv = sum(r['Conversions'] for r in m)
    by = {}
    for r in m:
        b = by.setdefault(r['Campaign'] or '(none)', [0, 0.0]); b[0] += r['Clicks']; b[1] += round(r['Cost'], 2)
    print(f"\n{nl['name']}\n  matched={len(m)} clicks={clicks} cost=${cost:.2f} conv={conv:.0f}")
    for k, v in sorted(by.items()): print(f'    {k}: {v[0]} clicks ${v[1]:.2f}')
    if nl.get('phrase_count') != len(nl['terms']):
        bad += 1; print('  MISMATCH: phrase_count')
    sample = ' '.join(str(e.get('sample', '')) for e in nl.get('evidence', []))
    if f'${cost:.2f}' not in sample and f'{cost:g}' not in sample:
        bad += 1; print(f'  MISMATCH: evidence sample does not state ${cost:.2f}')
    if f'{len(m)} of' not in sample and f'{len(m)} ' not in sample:
        bad += 1; print(f'  MISMATCH: evidence sample does not state matched-term count {len(m)}')
print(f'\nevidence check: {bad} mismatch(es)')
sys.exit(1 if bad else 0)
