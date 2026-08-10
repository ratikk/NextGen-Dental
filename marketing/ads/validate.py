#!/usr/bin/env python3
"""Campaign-as-code validator. No dependencies. Exit 1 on any failure."""
import sys, re, glob

def load_yaml_lite(path):
    # minimal YAML reader sufficient for our restricted schema (no anchors/flow)
    import json, subprocess
    try:
        import yaml  # available in CI via pyyaml if installed; fallback below
        return yaml.safe_load(open(path))
    except ImportError:
        sys.exit("pyyaml required: pip install pyyaml")

FORBIDDEN = re.compile(r'\b(guarantee[ds]?|painless|pain-free|best|#1|cure[sd]?|free|miracle|permanent smile)\b', re.I)
fails, warns = [], []

def check(cond, msg):
    (fails if not cond else []).append(msg) if not cond else None

for path in glob.glob('marketing/ads/campaigns/*.yaml'):
    doc = load_yaml_lite(path)
    if 'campaign' in doc:
        c = doc['campaign']
        if c.get('status_after_apply') != 'PAUSED': fails.append(f"{path}: not PAUSED")
        b = c.get('budget', {})
        if not b.get('approved_monthly_limit'): fails.append(f"{path}: no monthly limit")
        if not b.get('currency'): fails.append(f"{path}: no currency")
        if not c.get('schedule', {}).get('timezone'): fails.append(f"{path}: no timezone")
        n = c.get('networks', {})
        if n.get('display') or n.get('search_partners'): fails.append(f"{path}: unapproved network enabled")
        if c.get('geography', {}).get('target_setting') != 'PRESENCE_ONLY': fails.append(f"{path}: geo not PRESENCE_ONLY")
        if c.get('bidding', {}).get('strategy') == 'MANUAL_CPC' and not c.get('bidding', {}).get('maximum_cpc'):
            fails.append(f"{path}: MANUAL_CPC without maximum_cpc")
        if not c.get('evidence'): fails.append(f"{path}: no evidence block")
        lp = c.get('landing_page', {}).get('url', '')
        if not lp.startswith('https://nextgendentalaustintx.com/'): fails.append(f"{path}: landing page off-domain or not HTTPS")
        if not c.get('approvals', {}).get('expires'): fails.append(f"{path}: approvals missing expiry")
        seen = set()
        for ag in c.get('ad_groups', []):
            for mt in ('exact', 'phrase'):
                for kw in ag.get('keywords', {}).get(mt, []) or []:
                    if kw in seen: fails.append(f"{path}: duplicate keyword '{kw}'")
                    seen.add(kw)
            if 'broad' in (ag.get('keywords') or {}): fails.append(f"{path}: broad match present")
            for rsa in ag.get('responsive_search_ads', []) or []:
                hs, ds = rsa.get('headlines', []), rsa.get('descriptions', [])
                if not (3 <= len(hs) <= 15): fails.append(f"{path}: headline count {len(hs)}")
                if not (2 <= len(ds) <= 4): fails.append(f"{path}: description count {len(ds)}")
                for h in hs:
                    if len(h) > 30: fails.append(f"{path}: headline >30ch: '{h}' ({len(h)})")
                    if FORBIDDEN.search(h): fails.append(f"{path}: forbidden term in headline: '{h}'")
                for d in ds:
                    if len(d) > 90: fails.append(f"{path}: description >90ch ({len(d)}): '{d[:40]}...'")
                    if FORBIDDEN.search(d): fails.append(f"{path}: forbidden term in description: '{d[:40]}'")
        if c.get('clinical_claims_flagged') and c['approvals'].get('clinical', '').startswith('PENDING'):
            warns.append(f"{path}: clinical claims await dentist sign-off (blocking for ACTIVATION, not draft)")
    if 'negative_lists' in doc:
        allterms = []
        for nl in doc['negative_lists']:
            if not nl.get('evidence'): fails.append(f"{path}: negative list '{nl.get('name')}' missing evidence")
            allterms += [t.lower() for t in nl.get('terms', [])]
        dups = {t for t in allterms if allterms.count(t) > 1}
        if dups: fails.append(f"{path}: duplicate negatives {dups}")

print(f"campaign-as-code validation: {len(fails)} failed, {len(warns)} warnings")
for f in fails: print("  FAIL:", f)
for w in warns: print("  WARN:", w)
sys.exit(1 if fails else 0)
