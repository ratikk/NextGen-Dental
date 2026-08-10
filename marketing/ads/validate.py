#!/usr/bin/env python3
"""Campaign-as-code validator v3.  python3 validate.py [--online]
Blocking gates: spec schema, CSV parity, all-Paused, per-plan digests, approval
identity/ordering/expiry, attachment approvals, and (with --online) a real
landing-page health check. Exit 1 on any failure."""
import sys, re, os, csv, glob, hashlib, subprocess, tempfile, shutil, time
from datetime import datetime, timezone, date
import urllib.request, urllib.error
import yaml
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ROOT = os.path.dirname(os.path.abspath(__file__))
fails, warns = [], []
F, W = fails.append, warns.append
TODAY = datetime.now(timezone.utc).date()          # v3: real current date, UTC
FORBIDDEN = re.compile(r'\b(guarantee[ds]?|painless|pain[- ]free|best|#1|cure[sd]?|free|miracle|top[- ]rated)\b', re.I)
SECRETY = re.compile(r'(AKIA[0-9A-Z]{16}|-----BEGIN|password\s*[:=]|customer[_ ]?id\s*[:=]\s*\d|@gmail\.|\b\d{3}[-.]\d{3}[-.]\d{4}\b)', re.I)
APPROVED_GEO = {"Austin, TX (south metro service area)", "Buda, TX", "Kyle, TX"}
APPROVED_LANGS = {"English"}
DOMAIN = "nextgendentalaustintx.com"

man = yaml.safe_load(open(f'{ROOT}/approval-manifest.yaml'))
negdoc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))

# ---------------- specs ----------------
names, campaigns = [], []
for path in sorted(glob.glob(f'{ROOT}/campaigns/*.yaml')):
    raw = open(path).read()
    if SECRETY.search(raw): F(f'{path}: possible secret/PII pattern')
    doc = yaml.safe_load(raw)
    if doc.get('schema_version') != 1: F(f'{path}: schema_version must be 1')
    if 'campaign' not in doc: continue
    c = doc['campaign']; campaigns.append(c)
    if not c.get('name'): F(f'{path}: no name')
    elif c['name'] in names: F(f'{path}: duplicate campaign name')
    else: names.append(c['name'])
    if c.get('practice') != 'NextGen Dental': F(f'{path}: wrong practice')
    if not c.get('objective'): F(f'{path}: no objective')
    if c.get('status_after_apply') != 'PAUSED': F(f'{path}: not PAUSED')
    b = c.get('budget', {})
    for k in ('average_daily_amount', 'governance_monthly_threshold'):
        if not isinstance(b.get(k), (int, float)) or b[k] <= 0: F(f'{path}: budget.{k} invalid')
    if isinstance(b.get('average_daily_amount'), (int, float)) and b['average_daily_amount']*30.4 > b.get('governance_monthly_threshold', 0):
        F(f'{path}: daily*30.4 exceeds governance threshold')
    if b.get('currency') != 'USD': F(f'{path}: currency must be USD')
    tz = (c.get('schedule') or {}).get('timezone')
    if ZoneInfo:
        try: ZoneInfo(tz)
        except Exception: F(f'{path}: invalid timezone {tz!r}')
    g = c.get('geography', {})
    if g.get('target_setting') != 'PRESENCE_ONLY': F(f'{path}: geo not PRESENCE_ONLY')
    if not set(g.get('include', [])) <= APPROVED_GEO: F(f'{path}: unapproved geography')
    if not c.get('languages'): F(f'{path}: no languages set')
    elif not set(c['languages']) <= APPROVED_LANGS: F(f'{path}: unapproved language (Spanish needs its own campaign + landing page)')
    n = c.get('networks', {})
    if n.get('display') or n.get('search_partners'): F(f'{path}: unapproved network')
    if (c.get('bidding') or {}).get('strategy') == 'MANUAL_CPC' and not c['bidding'].get('maximum_cpc'):
        F(f'{path}: MANUAL_CPC without maximum_cpc')
    if not c.get('evidence'): F(f'{path}: no evidence')
    for ev in c.get('evidence', []):
        for k in ('source','period','sample','status','observed_at'):
            if k not in ev: F(f'{path}: evidence missing {k}')
    lp = (c.get('landing_page') or {}).get('url','')
    if not lp.startswith(f'https://{DOMAIN}/'): F(f'{path}: landing page must be HTTPS on {DOMAIN}')
    utm = ((c.get('tracking') or {}).get('utm') or {})
    for k in ('utm_source','utm_medium','utm_campaign'):
        if k not in utm: F(f'{path}: missing {k}')
    if (c.get('tracking') or {}).get('attribution_decision') not in ('PENDING','A','B','C','D'):
        F(f'{path}: tracking.attribution_decision must be PENDING or one of A/B/C/D')
    if not c.get('ad_groups'): F(f'{path}: no ad groups')
    seen = set()
    for ag in c.get('ad_groups', []):
        kws = ag.get('keywords', {})
        if 'broad' in kws: F(f'{path}: broad match present')
        allk = (kws.get('exact') or []) + (kws.get('phrase') or [])
        if not (1 <= len(allk) <= 30): F(f'{path}: ad group {ag.get("name")} keyword count {len(allk)}')
        for k in allk:
            nk = re.sub(r'\s+',' ',k.lower().strip())
            if nk in seen: F(f'{path}: duplicate keyword (normalized) {k!r}')
            seen.add(nk)
        for rsa in ag.get('responsive_search_ads', []):
            hs, ds = rsa.get('headlines', []), rsa.get('descriptions', [])
            if not (3 <= len(hs) <= 15): F(f'{path}: headline count {len(hs)}')
            if not (2 <= len(ds) <= 4): F(f'{path}: description count {len(ds)}')
            for t in hs:
                if len(t) > 30: F(f'{path}: headline >30ch ({len(t)}): {t!r}')
                if FORBIDDEN.search(t): F(f'{path}: forbidden term in headline: {t!r}')
            for t in ds:
                if len(t) > 90: F(f'{path}: description >90ch ({len(t)}): {t[:40]!r}')
                if FORBIDDEN.search(t): F(f'{path}: forbidden term in description: {t[:40]!r}')
    for nl in negdoc['negative_lists']:
        for t in nl['terms']:
            for k in seen:
                if re.search(r'\b'+re.escape(t.lower())+r'\b', k):
                    F(f'{path}: negative {t!r} ({nl["name"]}) would block own keyword {k!r}')

for nl in negdoc['negative_lists']:
    if nl.get('risk_tier') not in ('low','confirm','review'): F(f'negative list {nl.get("name")}: bad risk_tier')
    if not nl.get('evidence'): F(f'negative list {nl.get("name")}: no evidence')
    if nl.get('phrase_count') != len(nl['terms']): F(f'negative list {nl.get("name")}: phrase_count mismatch')
allt = [t.lower() for nl in negdoc['negative_lists'] for t in nl['terms']]
dup = {t for t in allt if allt.count(t) > 1}
if dup: F(f'duplicate negatives across lists: {dup}')

# ---------------- CSV parity (regenerate & byte-compare) ----------------
tmp = tempfile.mkdtemp()
try:
    shutil.copytree(f'{ROOT}/campaigns', f'{tmp}/campaigns')
    shutil.copy(f'{ROOT}/generate.py', tmp); shutil.copy(f'{ROOT}/approval-manifest.yaml', tmp)
    subprocess.run([sys.executable,'generate.py'], cwd=tmp, check=True, capture_output=True)
    gen_files = {os.path.relpath(os.path.join(dp,f), f'{tmp}/import')
                 for dp,_,fs in os.walk(f'{tmp}/import') for f in fs}
    com_files = {os.path.relpath(os.path.join(dp,f), f'{ROOT}/import')
                 for dp,_,fs in os.walk(f'{ROOT}/import') for f in fs}
    for rel in gen_files - com_files: F(f'parity: import/{rel} missing from commit')
    for rel in com_files - gen_files: F(f'parity: import/{rel} not produced by generator (stray file)')
    for rel in gen_files & com_files:
        if open(f'{tmp}/import/{rel}','rb').read() != open(f'{ROOT}/import/{rel}','rb').read():
            F(f'parity: import/{rel} differs from regenerated output (hand-edited?)')
finally:
    shutil.rmtree(tmp)

# ---------------- CSV safety: all Paused, uniform widths ----------------
for p in glob.glob(f'{ROOT}/import/**/*.csv', recursive=True):
    rows = list(csv.reader(open(p)))
    if not rows: continue
    hdr = rows[0]
    if len({len(r) for r in rows}) != 1: F(f'{p}: ragged CSV (inconsistent column count)')
    for col_name in ('Status','Campaign status'):
        if col_name in hdr:
            i = hdr.index(col_name)
            for r in rows[1:]:
                if len(r) > i and r[i] != 'Paused': F(f'{p}: non-Paused entity: {r[:3]}')

# ---------------- approvals: identity, time, order, digests ----------------
def digest(label):
    for l in open(f'{ROOT}/import/CHECKSUMS.txt'):
        if l.strip().endswith(label): return l.split()[0]
    return None
CUR = {'campaign_spec_sha256': digest('CAMPAIGN-SPEC-DIGEST'),
       'plan_a_package_sha256': digest('PLAN-A-PACKAGE-DIGEST'),
       'plan_b_package_sha256': digest('PLAN-B-PACKAGE-DIGEST'),
       'plan_c_package_sha256': digest('PLAN-C-PACKAGE-DIGEST')}
try:
    EXP = date.fromisoformat(str(man.get('expires')))
    if EXP < TODAY: F(f'plan expired {EXP} (today {TODAY})')
except Exception:
    F('manifest expires is not a valid ISO date')
    EXP = None

AUTH = man.get('authorized_approvers', {})
def check_gate(name, gate, role='owner'):
    st = (gate or {}).get('status')
    if st not in ('NOT_APPROVED','PENDING','APPROVED'): F(f'gate {name}: invalid status {st!r}'); return False
    if st != 'APPROVED': return False
    who, when = gate.get('approved_by'), gate.get('approved_at')
    if not who: F(f'gate {name}: APPROVED without approved_by')
    elif who not in AUTH.get(role, []): F(f'gate {name}: {who!r} not an authorized {role} approver')
    if not when: F(f'gate {name}: APPROVED without approved_at')
    else:
        try:
            ts = datetime.fromisoformat(str(when).replace('Z','+00:00'))
            if ts.tzinfo is None: F(f'gate {name}: approved_at needs timezone')
            elif ts.date() > TODAY: F(f'gate {name}: approved_at in the future')
            elif EXP and ts.date() > EXP: F(f'gate {name}: approved after expiry')
        except Exception: F(f'gate {name}: approved_at not a valid timestamp')
    return True

G = man.get('gates', {})
approved = {k: check_gate(k, G.get(k), 'clinical' if k == 'clinical' else 'owner')
            for k in ('marketing','clinical','budget','landing_page_verified','import_gate','activation')}
if approved['import_gate']:
    if CUR['plan_a_package_sha256'] != man['digests'].get('plan_a_package_sha256'):
        F('import_gate APPROVED but Plan A package digest STALE - approval invalidated')
    if CUR['campaign_spec_sha256'] != man['digests'].get('campaign_spec_sha256'):
        F('import_gate APPROVED but campaign-spec digest STALE - approval invalidated')
    for pre in ('marketing','clinical','budget','landing_page_verified'):
        if not approved[pre]: F(f'import_gate APPROVED before prerequisite gate {pre}')
if approved['activation']:
    if not approved['import_gate']: F('activation APPROVED before import_gate')
    if CUR['plan_c_package_sha256'] != man['digests'].get('plan_c_package_sha256'):
        F('activation APPROVED but Plan C package digest STALE')
    for c in campaigns:
        if (c.get('tracking') or {}).get('attribution_decision') == 'PENDING':
            F('activation APPROVED while attribution_decision is PENDING (Measure/Learn loop undefined)')
for lname, targets in (man.get('attachment') or {}).items():
    known = {nl['name'] for nl in negdoc['negative_lists']}
    if lname not in known: F(f'attachment references unknown list {lname!r}')
    for tgt, gate in (targets or {}).items():
        if check_gate(f'attachment[{lname}][{tgt}]', gate, 'owner') and tgt == 'leads_campaign':
            if CUR['plan_b_package_sha256'] != man['digests'].get('plan_b_package_sha256'):
                F('live-Leads attachment APPROVED but Plan B package digest STALE')

# ---------------- landing page: BLOCKING (v3) ----------------
def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'NextGenDental-ads-validator/3'})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.getcode(), r.geturl(), r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            return e.code, url, ''
        except Exception as e:
            last = e; time.sleep(2 * (i + 1))
    raise last

if '--online' in sys.argv:
    for c in campaigns:
        base = c['landing_page']['url']
        withutm = base + '?' + '&'.join(f'{k}={v}' for k, v in c['tracking']['utm'].items())
        for url in (base, withutm):
            try:
                code, final, body = fetch(url)
            except Exception as e:
                F(f'landing page {url}: unreachable after 3 attempts ({e})'); continue
            if code != 200: F(f'landing page {url}: HTTP {code} (paid traffic must never hit a non-200)')
            if DOMAIN not in final.split('/')[2:3][0] if '//' in final else True:
                pass
            host = final.split('/')[2] if '//' in final else ''
            if host and not host.endswith(DOMAIN): F(f'landing page {url}: redirected off-domain to {host}')
            title = re.search(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)
            title = (title.group(1).strip() if title else '')
            if re.search(r'not found|404', title, re.I): F(f'landing page {url}: error-page title {title!r}')
            canon = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', body, re.I)
            if not canon: F(f'landing page {url}: no canonical link')
            elif canon.group(1).split('?')[0].rstrip('/') != base.rstrip('/'):
                F(f'landing page {url}: canonical {canon.group(1)!r} != intended page')
            if body and 'analytics.nextgendentalaustintx.com' not in body:
                W(f'landing page {url}: analytics loader not found in HTML (conversion measurement may be absent)')
else:
    W('landing-page health NOT checked (run with --online; CI does this and it is BLOCKING)')

print(f'campaign-as-code validation v3: {len(fails)} failed, {len(warns)} warnings   [{TODAY} UTC]')
for x in fails: print('  FAIL:', x)
for x in warns: print('  WARN:', x)
sys.exit(1 if fails else 0)
