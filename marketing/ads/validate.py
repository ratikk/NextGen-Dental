#!/usr/bin/env python3
"""Campaign-as-code validator v2. Requirements: requirements.txt (PyYAML).
Checks specs, regenerates CSVs for parity, verifies checksums + approval manifest.
Exit 1 on failure. Run: python3 validate.py [--online]"""
import sys, re, os, csv, glob, hashlib, subprocess, tempfile, shutil, datetime
import yaml
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ROOT = os.path.dirname(os.path.abspath(__file__))
fails, warns = [], []
F = fails.append; W = warns.append
FORBIDDEN = re.compile(r'\b(guarantee[ds]?|painless|pain[- ]free|best|#1|cure[sd]?|free|miracle|top[- ]rated)\b', re.I)
SECRETY = re.compile(r'(AKIA[0-9A-Z]{16}|-----BEGIN|password\s*[:=]|customer[_ ]?id\s*[:=]\s*\d|@gmail\.|@yahoo\.|\b\d{3}[-.]\d{3}[-.]\d{4}\b)', re.I)
APPROVED_GEO = {"Austin, TX (south metro service area)", "Buda, TX", "Kyle, TX"}

specs = sorted(glob.glob(os.path.join(ROOT, 'campaigns/*.yaml')))
names = []
for path in specs:
    raw = open(path).read()
    if SECRETY.search(raw): F(f'{path}: possible secret/PII pattern')
    doc = yaml.safe_load(raw)
    if doc.get('schema_version') != 1: F(f'{path}: schema_version must be 1')
    if 'campaign' in doc:
        c = doc['campaign']
        if not c.get('name'): F(f'{path}: no campaign name')
        elif c['name'] in names: F(f'{path}: duplicate campaign name')
        else: names.append(c['name'])
        if c.get('practice') != 'NextGen Dental': F(f'{path}: wrong practice')
        if not c.get('objective'): F(f'{path}: no objective')
        if c.get('status_after_apply') != 'PAUSED': F(f'{path}: not PAUSED')
        b = c.get('budget', {})
        for k in ('average_daily_amount', 'governance_monthly_threshold'):
            v = b.get(k)
            if not isinstance(v, (int, float)) or v <= 0: F(f'{path}: budget.{k} must be positive number')
        if isinstance(b.get('average_daily_amount'), (int, float)) and b['average_daily_amount'] * 30.4 > b.get('governance_monthly_threshold', 0):
            F(f'{path}: daily*30.4 exceeds governance threshold')
        if b.get('currency') != 'USD': F(f'{path}: currency must be USD')
        tz = c.get('schedule', {}).get('timezone')
        if ZoneInfo:
            try: ZoneInfo(tz)
            except Exception: F(f'{path}: invalid timezone {tz}')
        g = c.get('geography', {})
        if g.get('target_setting') != 'PRESENCE_ONLY': F(f'{path}: geo not PRESENCE_ONLY')
        if not set(g.get('include', [])) <= APPROVED_GEO: F(f'{path}: unapproved geography')
        n = c.get('networks', {})
        if n.get('display') or n.get('search_partners'): F(f'{path}: unapproved network')
        if c.get('bidding', {}).get('strategy') == 'MANUAL_CPC' and not c['bidding'].get('maximum_cpc'):
            F(f'{path}: MANUAL_CPC without max')
        if not c.get('evidence'): F(f'{path}: no evidence')
        for ev in c.get('evidence', []):
            for k in ('source', 'period', 'sample', 'status', 'observed_at'):
                if k not in ev: F(f'{path}: evidence missing {k}')
        lp = c.get('landing_page', {}).get('url', '')
        if not lp.startswith('https://nextgendentalaustintx.com/'): F(f'{path}: bad landing page')
        utm = c.get('tracking', {}).get('utm', {})
        for k in ('utm_source', 'utm_medium', 'utm_campaign'):
            if k not in utm: F(f'{path}: missing {k}')
        if not c.get('ad_groups'): F(f'{path}: no ad groups')
        seen = set()
        for ag in c.get('ad_groups', []):
            kws = ag.get('keywords', {})
            if 'broad' in kws: F(f'{path}: broad match')
            allk = (kws.get('exact') or []) + (kws.get('phrase') or [])
            if not (1 <= len(allk) <= 30): F(f'{path}: ad group {ag["name"]} keyword count {len(allk)}')
            for kw in allk:
                nk = re.sub(r'\s+', ' ', kw.lower().strip())
                if nk in seen: F(f'{path}: duplicate keyword (normalized) "{kw}"')
                seen.add(nk)
            for rsa in ag.get('responsive_search_ads', []):
                hs, ds = rsa.get('headlines', []), rsa.get('descriptions', [])
                if not (3 <= len(hs) <= 15): F(f'{path}: headline count {len(hs)}')
                if not (2 <= len(ds) <= 4): F(f'{path}: description count {len(ds)}')
                for t in hs + ds:
                    lim = 30 if t in hs else 90
                    if len(t) > lim: F(f'{path}: >{lim}ch: "{t[:40]}" ({len(t)})')
                    if FORBIDDEN.search(t): F(f'{path}: forbidden term: "{t[:40]}"')
        # negative-vs-positive conflict
        negdoc = yaml.safe_load(open(os.path.join(ROOT, 'campaigns/negative-lists.yaml')))
        for nl in negdoc['negative_lists']:
            for t in nl['terms']:
                for kw in seen:
                    if re.search(r'\b' + re.escape(t.lower()) + r'\b', kw):
                        F(f'{path}: negative "{t}" ({nl["name"]}) would block keyword "{kw}"')
    if 'negative_lists' in doc:
        allt = []
        for nl in doc['negative_lists']:
            if nl.get('risk_tier') not in ('low', 'confirm', 'review'): F(f'{path}: {nl.get("name")}: bad risk_tier')
            if not nl.get('evidence'): F(f'{path}: {nl.get("name")}: no evidence')
            allt += [t.lower() for t in nl['terms']]
        dup = {t for t in allt if allt.count(t) > 1}
        if dup: F(f'{path}: duplicate negatives {dup}')

# CSV parity: regenerate into temp and diff against committed import/
tmp = tempfile.mkdtemp()
try:
    shutil.copytree(os.path.join(ROOT, 'campaigns'), os.path.join(tmp, 'campaigns'))
    shutil.copy(os.path.join(ROOT, 'generate.py'), tmp)
    subprocess.run([sys.executable, 'generate.py'], cwd=tmp, check=True, capture_output=True)
    for dp, _, fs in os.walk(os.path.join(tmp, 'import')):
        for f in fs:
            gen = os.path.join(dp, f)
            rel = os.path.relpath(gen, os.path.join(tmp, 'import'))
            com = os.path.join(ROOT, 'import', rel)
            if not os.path.exists(com): F(f'parity: committed import/{rel} missing')
            elif open(gen, 'rb').read() != open(com, 'rb').read(): F(f'parity: import/{rel} differs from regenerated (hand-edited?)')
    for dp, _, fs in os.walk(os.path.join(ROOT, 'import')):
        for f in fs:
            rel = os.path.relpath(os.path.join(dp, f), os.path.join(ROOT, 'import'))
            if not os.path.exists(os.path.join(tmp, 'import', rel)): F(f'parity: import/{rel} is not produced by generator')
finally:
    shutil.rmtree(tmp)

# Every CSV row that has a Status column must be Paused
for p in glob.glob(os.path.join(ROOT, 'import/**/*.csv'), recursive=True):
    rows = list(csv.reader(open(p)))
    if rows and 'Status' in rows[0] or (rows and 'Campaign status' in rows[0]):
        col = rows[0].index('Status') if 'Status' in rows[0] else rows[0].index('Campaign status')
        for r in rows[1:]:
            if len(r) > col and r[col] != 'Paused': F(f'{p}: non-Paused row: {r[:3]}')

# Approval manifest: digests + statuses + expiry
mpath = os.path.join(ROOT, 'approval-manifest.yaml')
if not os.path.exists(mpath): F('approval-manifest.yaml missing')
else:
    m = yaml.safe_load(open(mpath))
    pkg = [l for l in open(os.path.join(ROOT, 'import/CHECKSUMS.txt')) if 'IMPORT-PACKAGE-DIGEST' in l][0].split()[0]
    spec = [l for l in open(os.path.join(ROOT, 'import/CHECKSUMS.txt')) if 'campaign-specs' in l][0].split()[0]
    any_approved = any((m.get(k) or {}).get('status') == 'APPROVED' for k in ('marketing', 'clinical', 'budget', 'import_gate', 'activation'))
    if m.get('import_package_sha256') != pkg:
        (F if any_approved else W)(f'manifest package digest {"STALE — approvals invalidated" if any_approved else "not yet stamped"}')
    if m.get('campaign_spec_sha256') != spec:
        (F if any_approved else W)('manifest spec digest ' + ('STALE — approvals invalidated' if any_approved else 'not yet stamped'))
    try:
        exp = datetime.date.fromisoformat(str(m.get('expires')))
        if exp < datetime.date(2026, 8, 10): F('manifest expired')
    except Exception:
        F('manifest expires not a valid date')
    for gate in ('marketing', 'clinical', 'budget', 'import_gate', 'activation'):
        st = (m.get(gate) or {}).get('status')
        if st not in ('NOT_APPROVED', 'PENDING', 'APPROVED'): F(f'manifest {gate}.status invalid: {st}')
    if (m.get('activation') or {}).get('status') == 'APPROVED' and not all(
            (m.get(k) or {}).get('status') == 'APPROVED' for k in ('marketing', 'clinical', 'budget', 'import_gate')):
        F('activation approved before prerequisite gates')

if '--online' in sys.argv:
    import urllib.request
    for path in specs:
        doc = yaml.safe_load(open(path))
        if 'campaign' in doc:
            u = doc['campaign']['landing_page']['url']
            try:
                r = urllib.request.urlopen(u, timeout=10)
                if r.status != 200: F(f'landing page {u} -> {r.status}')
            except Exception as e:
                W(f'landing page {u} unreachable from this environment: {e}')

print(f'campaign-as-code validation v2: {len(fails)} failed, {len(warns)} warnings')
for x in fails: print('  FAIL:', x)
for x in warns: print('  WARN:', x)
sys.exit(1 if fails else 0)
