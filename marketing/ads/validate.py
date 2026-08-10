#!/usr/bin/env python3
"""Campaign-as-code validator v6.1.
  python3 validate.py [--online] [--draft | --release-plan-a | --release-plan-b | --release-plan-c]

Draft mode: schemas, deterministic parity, checksums, financial parity, evidence
structure, timestamp syntax, internal decision consistency (+ live landing check
with --online). RELEASE modes additionally require that plan's genuine approvals,
evidence, chronology and digest binding. Exit 1 on any failure."""
import sys, re, os, csv, glob, hashlib, subprocess, tempfile, shutil, time
from datetime import datetime, timezone, date
import urllib.request, urllib.error
from urllib.parse import urlsplit, parse_qsl
import yaml
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ROOT = os.path.dirname(os.path.abspath(__file__))
MODE = next((a[2:] for a in sys.argv[1:] if a.startswith('--') and a[2:].startswith(('draft','release-plan-'))), 'draft')
ONLINE = '--online' in sys.argv
fails, warns = [], []
F, W = fails.append, warns.append
NOW = datetime.now(timezone.utc); TODAY = NOW.date()
FORBIDDEN = re.compile(r'\b(guarantee[ds]?|painless|pain[- ]free|best|#1|cure[sd]?|free|miracle|top[- ]rated)\b', re.I)
SECRETY = re.compile(r'(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|-----BEGIN|password\s*[:=]|secret\s*[:=]\s*["\']?\S|token\s*[:=]\s*["\']?[A-Za-z0-9._-]{12}|@gmail\.|@yahoo\.|\b\d{3}[-.]\d{3}[-.]\d{4}\b)', re.I)
# A POPULATED Google Ads customer id (not a prose mention of the term).
CUSTOMER_ID = re.compile(r'customer[ _-]?id\s*[:=]\s*["\']?\d{3}[- ]?\d{3}[- ]?\d{4}', re.I)
SCAN_FILES = ['approval-manifest.yaml', 'preview-evidence.yaml', 'activation-preview-evidence.yaml']
APPROVED_GEO = {"Austin, TX (south metro service area)", "Buda, TX", "Kyle, TX"}
APPROVED_LANGS = {"English"}
DOMAIN = "nextgendentalaustintx.com"

man    = yaml.safe_load(open(f'{ROOT}/approval-manifest.yaml'))
negdoc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))
actdoc = yaml.safe_load(open(f'{ROOT}/campaigns/activation-action.yaml')).get('activation_action', {})
prev   = yaml.safe_load(open(f'{ROOT}/preview-evidence.yaml')) or {}
aprev  = yaml.safe_load(open(f'{ROOT}/activation-preview-evidence.yaml')) or {}

def ts(v, label):
    if v in (None, ''): return None
    try: t = datetime.fromisoformat(str(v).replace('Z','+00:00'))
    except Exception: F(f'{label}: not a valid ISO timestamp'); return None
    if t.tzinfo is None: F(f'{label}: timestamp must be timezone-aware'); return None
    t = t.astimezone(timezone.utc)
    if t > NOW: F(f'{label}: timestamp is in the future'); return None
    return t
def num(x):
    try: return float(x)
    except Exception: return None
def order(a, b, la, lb):
    if a and b and a > b: F(f'chronology: {la} occurred AFTER {lb}')

def check_exact_url(u, expect_utm, label, base, approved_utm):
    """The stored URL must be EXACTLY the approved clean or UTM URL: same scheme,
    host, path, and — for the UTM form — exactly the approved key/value pairs with
    no missing, altered or extra parameters (order-insensitive)."""
    if not u: F(f'{label}: url missing'); return
    try: sp = urlsplit(str(u))
    except Exception: F(f'{label}: unparseable url'); return
    if sp.scheme != 'https': F(f'{label}: must be https')
    if sp.netloc != DOMAIN: F(f'{label}: host {sp.netloc!r} is not the approved domain')
    if sp.path.rstrip('/') != urlsplit(base).path.rstrip('/'):
        F(f'{label}: path {sp.path!r} is not the approved landing-page path')
    if sp.fragment: F(f'{label}: URL fragments are not permitted')
    q = parse_qsl(sp.query, keep_blank_values=True)
    if len(q) != len(dict(q)): F(f'{label}: duplicated query parameters')
    q = dict(q)
    if expect_utm:
        for k, v in approved_utm.items():
            if k not in q: F(f'{label}: missing UTM parameter {k}')
            elif q[k] != str(v): F(f'{label}: {k}={q[k]!r} but approved value is {v!r}')
        for k in q:
            if k not in approved_utm: F(f'{label}: unapproved query parameter {k!r}')
    elif q:
        F(f'{label}: clean URL must carry no query parameters (found {sorted(q)})')

# ---------------- campaign specs ----------------
names, campaigns = [], []
for extra in SCAN_FILES:
    _raw = open(f'{ROOT}/{extra}').read()
    if SECRETY.search(_raw): F(f'{extra}: possible secret/PII pattern')
    if CUSTOMER_ID.search(_raw): F(f'{extra}: a populated Google Ads customer ID must never be stored here')
for path in sorted(glob.glob(f'{ROOT}/campaigns/*.yaml')):
    raw = open(path).read()
    if SECRETY.search(raw): F(f'{path}: possible secret/PII pattern')
    if CUSTOMER_ID.search(raw): F(f'{path}: a populated Google Ads customer ID must never be stored here')
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
    for k in ('average_daily_amount','governance_monthly_threshold'):
        if not isinstance(b.get(k), (int,float)) or b[k] <= 0: F(f'{path}: budget.{k} invalid')
    if isinstance(b.get('average_daily_amount'), (int,float)) and b['average_daily_amount']*30.4 > b.get('governance_monthly_threshold', 0):
        F(f'{path}: daily*30.4 exceeds governance threshold')
    if b.get('currency') != 'USD': F(f'{path}: currency must be USD')
    tzname = (c.get('schedule') or {}).get('timezone')
    if ZoneInfo:
        try: ZoneInfo(tzname)
        except Exception: F(f'{path}: invalid timezone {tzname!r}')
    g = c.get('geography', {})
    if g.get('target_setting') != 'PRESENCE_ONLY': F(f'{path}: geo not PRESENCE_ONLY')
    if not set(g.get('include', [])) <= APPROVED_GEO: F(f'{path}: unapproved geography')
    if not set(c.get('languages') or []) <= APPROVED_LANGS or not c.get('languages'):
        F(f'{path}: languages must be exactly approved set (Spanish needs its own campaign)')
    n = c.get('networks', {})
    if n.get('display') or n.get('search_partners'): F(f'{path}: unapproved network')
    if (c.get('bidding') or {}).get('strategy') == 'MANUAL_CPC' and not c['bidding'].get('maximum_cpc'):
        F(f'{path}: MANUAL_CPC without maximum_cpc')
    if not c.get('evidence'): F(f'{path}: no evidence')
    for ev in c.get('evidence', []):
        for k in ('source','period','sample','status','observed_at'):
            if k not in ev: F(f'{path}: evidence missing {k}')
    lp = c.get('landing_page') or {}
    if not str(lp.get('url','')).startswith(f'https://{DOMAIN}/'): F(f'{path}: landing page must be HTTPS on {DOMAIN}')
    if lp.get('production_status') not in ('REQUIRES_REVERIFICATION','FAILED_404','VERIFIED_200'):
        F(f'{path}: landing_page.production_status missing/invalid')
    utm = ((c.get('tracking') or {}).get('utm') or {})
    for k in ('utm_source','utm_medium','utm_campaign'):
        if k not in utm: F(f'{path}: missing {k}')
    if (c.get('tracking') or {}).get('attribution_decision') not in ('PENDING','A','B','C','D'):
        F(f'{path}: tracking.attribution_decision invalid')
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
                if len(t) > 90: F(f'{path}: description >90ch ({len(t)})')
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
dupn = {t for t in allt if allt.count(t) > 1}
if dupn: F(f'duplicate negatives across lists: {dupn}')

spec = next((c for c in campaigns if c['name'] == actdoc.get('campaign')), None)
if not spec: F('activation-action targets a campaign with no approved spec')
else:
    if actdoc.get('requested_status') != 'ENABLED': F('activation-action: requested_status must be ENABLED')
    if actdoc.get('previous_status') != 'PAUSED' or actdoc.get('rollback_status') != 'PAUSED':
        F('activation-action: previous/rollback status must be PAUSED')
    if num(actdoc.get('budget_daily')) != num(spec['budget']['average_daily_amount']):
        F('activation-action budget != campaign spec')
    if num(actdoc.get('maximum_cpc')) != num(spec['bidding']['maximum_cpc']):
        F('activation-action max CPC != campaign spec')
    if actdoc.get('currency') != spec['budget']['currency']: F('activation-action currency != campaign spec')
    if actdoc.get('governance_monthly_threshold') != spec['budget']['governance_monthly_threshold']:
        F('activation-action governance threshold != campaign spec')
    if not actdoc.get('preconditions'): F('activation-action: no preconditions listed')

# ---------------- CSV parity ----------------
tmp = tempfile.mkdtemp()
try:
    shutil.copytree(f'{ROOT}/campaigns', f'{tmp}/campaigns')
    for f_ in ('generate.py','approval-manifest.yaml'): shutil.copy(f'{ROOT}/{f_}', tmp)
    subprocess.run([sys.executable,'generate.py'], cwd=tmp, check=True, capture_output=True)
    gen = {os.path.relpath(os.path.join(dp,f), f'{tmp}/import') for dp,_,fs in os.walk(f'{tmp}/import') for f in fs}
    com = {os.path.relpath(os.path.join(dp,f), f'{ROOT}/import') for dp,_,fs in os.walk(f'{ROOT}/import') for f in fs}
    for rel in gen - com: F(f'parity: import/{rel} missing from commit')
    for rel in com - gen: F(f'parity: import/{rel} not produced by generator (stray)')
    for rel in gen & com:
        if open(f'{tmp}/import/{rel}','rb').read() != open(f'{ROOT}/import/{rel}','rb').read():
            F(f'parity: import/{rel} differs from regenerated output (hand-edited?)')
finally:
    shutil.rmtree(tmp)

# ---------------- CSV safety ----------------
ACT_CSV = os.path.join(ROOT, 'import/plan-c/activation.csv')
enabled_files = []
for p in sorted(glob.glob(f'{ROOT}/import/**/*.csv', recursive=True)):
    rows = list(csv.reader(open(p)))
    if not rows: continue
    if len({len(r) for r in rows}) != 1: F(f'{p}: ragged CSV')
    if any('Enabled' in r for r in rows[1:]): enabled_files.append(os.path.relpath(p, ROOT))
    if os.path.abspath(p) == ACT_CSV: continue
    hdr = rows[0]
    for col in ('Status','Campaign status'):
        if col in hdr:
            i = hdr.index(col)
            for r in rows[1:]:
                if len(r) > i and r[i] != 'Paused': F(f'{p}: non-Paused entity: {r[:3]}')
if enabled_files != ['import/plan-c/activation.csv']:
    F(f'exactly one artifact may contain an Enabled entity; found {enabled_files}')
arows = list(csv.reader(open(ACT_CSV)))
GEN_FINAL_URL = None
try:
    ar = list(csv.reader(open(f'{ROOT}/import/plan-a/ads.csv')))
    GEN_FINAL_URL = ar[1][ar[0].index('Final URL')]
except Exception: F('cannot read generated Plan A ads.csv Final URL')
if len(arows) != 2: F('activation.csv must contain exactly one campaign mutation')
else:
    a = dict(zip(arows[0], arows[1]))
    if set(arows[0]) != {'Campaign','Campaign status','Budget','Max CPC'}:
        F('activation.csv must contain only Editor-recognised columns')
    if a.get('Campaign') not in names: F('activation.csv targets an unknown campaign')
    if a.get('Campaign status') != 'Enabled': F('activation.csv status must be Enabled')
    if spec and num(a.get('Budget')) != num(spec['budget']['average_daily_amount']): F('activation.csv budget != campaign spec')
    if spec and num(a.get('Max CPC')) != num(spec['bidding']['maximum_cpc']): F('activation.csv max CPC != campaign spec')

# ---------------- digests ----------------
def digest(label):
    for l in open(f'{ROOT}/import/CHECKSUMS.txt'):
        if l.strip().endswith(label): return l.split()[0]
    return None
CUR = {'campaign_spec_sha256': digest('CAMPAIGN-SPEC-DIGEST'),
       'plan_a_package_sha256': digest('PLAN-A-PACKAGE-DIGEST'),
       'plan_b_package_sha256': digest('PLAN-B-PACKAGE-DIGEST'),
       'plan_c_attach_sha256': digest('PLAN-C-ATTACH-DIGEST'),
       'plan_c_activation_sha256': digest('PLAN-C-ACTIVATION-DIGEST')}
MD = man.get('digests', {})
for k, v in CUR.items():
    if v is None: F(f'CHECKSUMS.txt has no digest for {k}')
    if k not in MD: F(f'approval-manifest digests: missing key {k} (validator references it)')
for k in MD:
    if k not in CUR: F(f'approval-manifest digests: unknown/stale key {k}')
for k, v in CUR.items():                       # surface drift even when nothing is approved
    if k in MD and MD[k] != v and MD[k] != 'PENDING-STAMP':
        W(f'manifest digest {k} is stale vs the current artifacts (re-stamp before approving)')
try:
    EXP = date.fromisoformat(str(man.get('expires')))
    if EXP < TODAY: F(f'plan expired {EXP} (today {TODAY})')
except Exception:
    F('manifest expires is not a valid ISO date'); EXP = None

AUTH = man.get('authorized_approvers', {}); G = man.get('gates', {})
def check_gate(name, gate, role='owner'):
    st = (gate or {}).get('status')
    if st not in ('NOT_APPROVED','PENDING','APPROVED'): F(f'gate {name}: invalid status {st!r}'); return False
    if st != 'APPROVED': return False
    who = gate.get('approved_by') or gate.get('applied_by')
    when = gate.get('approved_at') or gate.get('applied_at')
    if not who: F(f'gate {name}: APPROVED without an approver identity')
    elif who not in AUTH.get(role, []): F(f'gate {name}: {who!r} not an authorized {role} approver')
    if not when: F(f'gate {name}: APPROVED without a timestamp')
    t = ts(when, f'gate {name}')
    if t and EXP and t.date() > EXP: F(f'gate {name}: approved after expiry')
    return True
GATES = ('marketing','clinical','budget','landing_page_verified','import_gate',
         'plan_a_applied','activation_landing_recheck','activation')
approved = {k: check_gate(k, G.get(k), 'clinical' if k=='clinical' else 'owner') for k in GATES}
def gtime(k):
    g = G.get(k) or {}
    return ts(g.get('approved_at') or g.get('applied_at'), f'gate {k}')

# ---------------- landing evidence (both URLs) ----------------
def check_landing_evidence(gname, ev, same_day_as=None):
    if not isinstance(ev, dict):
        F(f'{gname}: APPROVED without structured evidence (a bare string is not evidence)'); return
    for k in ('tested_at','tested_by','spec_digest','clean_url','utm_url'):
        if not ev.get(k): F(f'{gname} evidence missing {k}')
    if ev.get('tested_by') and ev['tested_by'] not in AUTH.get('owner', []):
        F(f'{gname} evidence: tested_by not an authorized owner')
    if ev.get('spec_digest') and ev['spec_digest'] != CUR['campaign_spec_sha256']:
        F(f'{gname} evidence captured against a different campaign spec')
    te = ts(ev.get('tested_at'), f'{gname} evidence tested_at')
    want_clean = {c['landing_page']['url'] for c in campaigns}
    base = spec['landing_page']['url'] if spec else ''
    approved_utm = (spec.get('tracking') or {}).get('utm', {}) if spec else {}
    for key, expect_utm in (('clean_url', False), ('utm_url', True)):
        u = ev.get(key)
        if not isinstance(u, dict): F(f'{gname} evidence.{key} must be an object'); continue
        for k in ('url','http_status','final_url','title','canonical','analytics_loader_present'):
            if u.get(k) in (None, ''): F(f'{gname} evidence.{key} missing {k}')
        if str(u.get('http_status')) != '200': F(f'{gname} evidence.{key}: http_status {u.get("http_status")!r} (must be 200)')
        fh = str(u.get('final_url','')).split('/')[2] if '//' in str(u.get('final_url','')) else ''
        if fh and not (fh == DOMAIN or fh.endswith('.'+DOMAIN)): F(f'{gname} evidence.{key}: final_url off-domain {fh!r}')
        if re.search(r'not found|404', str(u.get('title','')), re.I): F(f'{gname} evidence.{key}: error-page title')
        can = str(u.get('canonical','')).split('?')[0].rstrip('/')
        if can and can not in {w.rstrip('/') for w in want_clean}: F(f'{gname} evidence.{key}: canonical is not the approved landing page')
        if u.get('analytics_loader_present') is not True: F(f'{gname} evidence.{key}: analytics loader not present')
        check_exact_url(u.get('url'), expect_utm, f'{gname} evidence.{key}', base, approved_utm)
    ga = gtime(gname)
    order(te, ga, f'{gname} tested_at', f'{gname} approval')
    if same_day_as and te and same_day_as and te.date() != same_day_as.date():
        F(f'{gname}: recheck must occur on the SAME UTC date as activation approval')
if approved['landing_page_verified']:
    check_landing_evidence('landing_page_verified', (G.get('landing_page_verified') or {}).get('evidence'))
if approved['activation_landing_recheck']:
    check_landing_evidence('activation_landing_recheck', (G.get('activation_landing_recheck') or {}).get('evidence'),
                           same_day_as=gtime('activation'))

# ---------------- Plan A Editor preview evidence ----------------
def kw_counts():
    rows = list(csv.reader(open(f'{ROOT}/import/plan-a/keywords.csv')))[1:]
    return len(rows), sum(1 for r in rows if r[3]=='Exact'), sum(1 for r in rows if r[3]=='Phrase')
def check_warnings(obj, label, preview_t=None, approval_t=None):
    w = obj.get('warnings')
    has = bool(w) and str(w).strip().lower() not in ('none','[]','')
    if has:
        wa = obj.get('warning_acceptance') or {}
        if not wa.get('accepted'): F(f'{label}: warnings present but not accepted')
        if wa.get('accepted_by') not in AUTH.get('owner', []): F(f'{label}: warning acceptance not by an authorized owner')
        if not wa.get('accepted_at'): F(f'{label}: warning acceptance without accepted_at timestamp')
        ta_ = ts(wa.get('accepted_at'), f'{label} warning_acceptance.accepted_at')
        order(preview_t, ta_, f'{label} preview', f'{label} warning acceptance')
        order(ta_, approval_t, f'{label} warning acceptance', f'{label} approval')
        if not wa.get('rationale'): F(f'{label}: warning acceptance without rationale')
    e = obj.get('errors')
    if bool(e) and str(e).strip().lower() not in ('none','[]',''):
        F(f'{label}: import errors present - errors can never be overridden')

def check_plan_a_preview():
    if not prev.get('completed'): F('Plan A Editor preview not completed'); return
    tot, ex, ph = kw_counts()
    negs = len(list(csv.reader(open(f'{ROOT}/import/plan-a/negative-lists.csv')))) - 1
    nlists = len({r[0] for r in list(csv.reader(open(f'{ROOT}/import/plan-a/negative-lists.csv')))[1:]})
    ads_n = len(list(csv.reader(open(f'{ROOT}/import/plan-a/ads.csv')))) - 1
    if prev.get('plan_a_digest') != CUR['plan_a_package_sha256']: F('preview evidence: stale Plan A digest')
    if prev.get('previewed_by') not in AUTH.get('owner', []): F('preview evidence: previewed_by not an authorized owner')
    tp = ts(prev.get('previewed_at'), 'preview previewed_at')
    if not prev.get('account_confirmed'): F('preview evidence: account_confirmed empty')
    if not prev.get('evidence_reference'): F('preview evidence: evidence_reference empty')
    if prev.get('result') != 'MATCHES_PLAN': F(f'preview evidence: result is {prev.get("result")!r}')
    check_warnings(prev, 'Plan A preview', tp, gtime('import_gate'))
    o = prev.get('observed') or {}
    exp = {'campaigns': 1, 'campaign_name': spec['name'] if spec else None, 'campaign_type': 'Search',
           'campaign_status': 'Paused', 'daily_budget': spec['budget']['average_daily_amount'] if spec else None,
           'budget_type': 'Daily', 'bid_strategy': 'Manual CPC',
           'max_cpc': spec['bidding']['maximum_cpc'] if spec else None,
           'networks': 'Google search only', 'display_network': False, 'search_partners': False,
           'location_option': 'People in your targeted locations',
           'ad_groups': len(spec['ad_groups']) if spec else None,
           'keywords': tot, 'exact_keywords': ex, 'phrase_keywords': ph,
           'enabled_keywords': 0, 'ads': ads_n, 'enabled_ads': 0,
           'negative_lists': nlists, 'negative_phrases': negs, 'shared_list_attachments': 0}
    for k, v in exp.items():
        ov = o.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            if num(ov) != num(v): F(f'preview {k}={ov!r} but approved/generated value is {v}')
        elif ov != v: F(f'preview {k}={ov!r} but approved/generated value is {v!r}')
    if set(o.get('languages') or []) != set(spec['languages'] if spec else []): F(f'preview languages={o.get("languages")!r}')
    if {re.sub(r'[ ,]+',' ',x.strip().lower()) for x in (o.get('locations') or [])} != {'austin tx','buda tx','kyle tx'}:
        F(f'preview locations={o.get("locations")!r} != approved Austin/Buda/Kyle targeting')
    fu = o.get('final_urls') or []
    fu = [str(x) for x in (fu if isinstance(fu, list) else [fu])]
    if fu != [GEN_FINAL_URL]: F('preview final_urls != generated approved UTM URL')
    for u in fu:
        check_exact_url(u, True, 'preview final_url', spec['landing_page']['url'] if spec else '',
                        (spec.get('tracking') or {}).get('utm', {}) if spec else {})
    return tp

# ---------------- Plan A applied + account verification ----------------
def check_plan_a_applied():
    pa = G.get('plan_a_applied') or {}
    if not approved['import_gate']: F('plan_a_applied recorded without import_gate approval')
    tap = gtime('plan_a_applied'); ti = gtime('import_gate')
    order(ti, tap, 'import approval', 'Plan A application')   # single canonical check
    if pa.get('package_digest') != CUR['plan_a_package_sha256']: F('plan_a_applied.package_digest does not match the current Plan A package')
    ev = pa.get('account_verification_evidence')
    if not isinstance(ev, dict):
        F('plan_a_applied.account_verification_evidence must be a structured object (a bare string fails)'); return tap, None
    for k in ('verified_at','verified_by','evidence_reference','campaign_found','campaign_status','daily_budget',
              'max_cpc','keywords_total','keywords_paused','ads_total','ads_paused','negative_lists_created',
              'shared_list_attachments','unexpected_changes','errors','result'):
        if ev.get(k) is None: F(f'plan_a_applied evidence missing {k}')
    if ev.get('verified_by') not in AUTH.get('owner', []): F('plan_a_applied: verified_by not an authorized owner')
    tv = ts(ev.get('verified_at'), 'plan_a_applied verified_at')
    if tap and tv and tv < tap: F('chronology: account verification BEFORE Plan A application')
    tot, ex, ph = kw_counts()
    ads_n = len(list(csv.reader(open(f'{ROOT}/import/plan-a/ads.csv')))) - 1
    nlists = len({r[0] for r in list(csv.reader(open(f'{ROOT}/import/plan-a/negative-lists.csv')))[1:]})
    if ev.get('campaign_found') is not True: F('plan_a_applied: campaign not found in account')
    if ev.get('campaign_status') != 'Paused': F('plan_a_applied: campaign is not Paused after posting')
    if spec and num(ev.get('daily_budget')) != num(spec['budget']['average_daily_amount']): F('plan_a_applied: daily budget mismatch')
    if spec and num(ev.get('max_cpc')) != num(spec['bidding']['maximum_cpc']): F('plan_a_applied: max CPC mismatch')
    if num(ev.get('keywords_total')) != tot or num(ev.get('keywords_paused')) != tot: F('plan_a_applied: keywords must all exist and be Paused')
    if num(ev.get('ads_total')) != ads_n or num(ev.get('ads_paused')) != ads_n: F('plan_a_applied: ads must all exist and be Paused')
    if num(ev.get('negative_lists_created')) != nlists: F('plan_a_applied: negative list count mismatch')
    if num(ev.get('shared_list_attachments')) != 0: F('plan_a_applied: Plan A must create zero attachments')
    if ev.get('unexpected_changes') is not False: F('plan_a_applied: unexpected_changes must be false')
    if str(ev.get('errors')).strip().lower() not in ('none','[]',''): F('plan_a_applied: errors present')
    if ev.get('result') != 'MATCHES_PLAN': F(f'plan_a_applied: result is {ev.get("result")!r}')
    if not ev.get('evidence_reference'): F('plan_a_applied: evidence_reference empty')
    return tap, tv

# ---------------- Plan B decision consistency ----------------
pb = man.get('plan_b_decision') or {}
pbd = pb.get('status')
if pbd not in ('PENDING','ATTACH_APPROVED','DECLINED'): F(f'plan_b_decision.status invalid: {pbd!r}')
tpb = None
leads_approved = []
for lname, targets in (man.get('attachment') or {}).items():
    known = {nl['name'] for nl in negdoc['negative_lists']}
    if lname not in known: F(f'attachment references unknown list {lname!r}')
    for tgt, gate in (targets or {}).items():
        ok = check_gate(f'attachment[{lname}][{tgt}]', gate, 'owner')
        if ok and tgt == 'leads_campaign':
            leads_approved.append((lname, ts(gate.get('approved_at'), f'attachment[{lname}] approval')))
            if CUR['plan_b_package_sha256'] != MD.get('plan_b_package_sha256'): F('live-Leads attachment APPROVED but Plan B digest STALE')
        if ok and tgt == 'new_campaign' and CUR['plan_c_attach_sha256'] != MD.get('plan_c_attach_sha256'):
            F('new-campaign attachment APPROVED but Plan C ATTACH digest STALE')
planb_rows = list(csv.reader(open(f'{ROOT}/import/plan-b/attach-leads.csv')))[1:]
if pbd in ('ATTACH_APPROVED','DECLINED'):
    if pb.get('decided_by') not in AUTH.get('owner', []): F('plan_b_decision: decided_by not an authorized owner')
    tpb = ts(pb.get('decided_at'), 'plan_b_decision.decided_at')
    if not pb.get('decided_at'): F('plan_b_decision: missing decided_at')
    if not pb.get('rationale'): F('plan_b_decision: rationale is required')
if pbd == 'ATTACH_APPROVED':
    if not leads_approved: F('plan_b_decision ATTACH_APPROVED but no Leads attachment gate is APPROVED')
    if not planb_rows: F('plan_b_decision ATTACH_APPROVED but Plan B CSV contains zero attachments')
    approved_names = {n for n, _ in leads_approved}
    for r in planb_rows:
        if r[1] not in approved_names: F(f'Plan B CSV contains unapproved attachment {r[1]!r}')
    for _, t in leads_approved:
        if t and tpb and t > tpb: F('chronology: attachment approval occurred AFTER the Plan B decision')
if pbd == 'DECLINED':
    if leads_approved: F('plan_b_decision DECLINED but a Leads attachment gate is APPROVED')
    if planb_rows: F('plan_b_decision DECLINED but Plan B CSV is not empty')

# ---------------- Plan B chronology (independent of activation) ----------------
def plan_b_chronology(t_verified_):
    if pbd in ('ATTACH_APPROVED','DECLINED'):
        if t_verified_ and tpb and tpb < t_verified_:
            F('chronology: Plan B decision BEFORE Plan A account verification')

# ---------------- activation execution (dormant unless recorded) ----------------
def check_activation_execution():
    ex = man.get('activation_execution') or {}
    st = ex.get('status')
    if st not in ('NOT_EXECUTED','EXECUTED','VERIFIED'):
        F(f'activation_execution.status invalid: {st!r}'); return None
    if st == 'NOT_EXECUTED':
        return None                      # dormant: the inactive draft stays valid
    if not approved['activation']: F('activation_execution recorded without activation approval')
    if ex.get('executed_by') not in AUTH.get('owner', []): F('activation_execution: executed_by not an authorized owner')
    if not ex.get('executed_at'): F('activation_execution: missing executed_at')
    te_ = ts(ex.get('executed_at'), 'activation_execution.executed_at')
    order(gtime('activation'), te_, 'activation approval', 'activation execution')
    if ex.get('activation_digest') != CUR['plan_c_activation_sha256']:
        F('activation_execution: activation_digest does not match the approved Plan C activation package')
    ev = ex.get('account_verification_evidence')
    if not isinstance(ev, dict):
        F('activation_execution: account_verification_evidence must be a structured object'); return te_
    for k in ('verified_at','verified_by','evidence_reference','campaign_status','daily_budget',
              'max_cpc','unexpected_changes','errors','result'):
        if ev.get(k) is None: F(f'activation_execution evidence missing {k}')
    # identity + time of the POST-EXECUTION verification (presence alone is not enough)
    if ev.get('verified_by') not in AUTH.get('owner', []):
        F('activation_execution: verified_by not an authorized owner')
    tv_ = ts(ev.get('verified_at'), 'activation_execution evidence verified_at')
    order(te_, tv_, 'activation execution', 'post-execution verification')
    if ev.get('campaign_status') != 'Enabled': F('activation_execution: campaign is not Enabled after execution')
    if spec and num(ev.get('daily_budget')) != num(spec['budget']['average_daily_amount']): F('activation_execution: daily budget changed')
    if spec and num(ev.get('max_cpc')) != num(spec['bidding']['maximum_cpc']): F('activation_execution: max CPC changed')
    if ev.get('unexpected_changes') is not False: F('activation_execution: unexpected account changes')
    if str(ev.get('errors')).strip().lower() not in ('none','[]',''): F('activation_execution: verification errors present')
    if not ev.get('evidence_reference'): F('activation_execution: evidence_reference empty')
    if ev.get('result') != 'MATCHES_PLAN': F(f'activation_execution: result is {ev.get("result")!r}')
    return te_

# ---------------- activation preview evidence ----------------
def check_activation_preview():
    if not aprev.get('completed'): F('activation Editor preview not completed'); return None
    if aprev.get('activation_digest') != CUR['plan_c_activation_sha256']: F('activation preview: stale activation digest')
    if aprev.get('previewed_by') not in AUTH.get('owner', []): F('activation preview: previewed_by not an authorized owner')
    tap_ = ts(aprev.get('previewed_at'), 'activation preview previewed_at')
    if not aprev.get('account_confirmed'): F('activation preview: account_confirmed empty')
    if not aprev.get('evidence_reference'): F('activation preview: evidence_reference empty')
    if aprev.get('editor_column_compatibility') != 'ACCEPTED':
        F('activation preview: editor_column_compatibility must be ACCEPTED (real Editor evidence required)')
    if aprev.get('result') != 'MATCHES_PLAN': F(f'activation preview: result is {aprev.get("result")!r}')
    check_warnings(aprev, 'activation preview', tap_, gtime('activation'))
    o = aprev.get('observed') or {}
    if num(o.get('campaigns_changed')) != 1: F('activation preview: must change exactly one campaign')
    if spec and o.get('campaign_name') != spec['name']: F('activation preview: campaign name mismatch')
    if o.get('previous_status') != 'Paused': F('activation preview: previous status must be Paused')
    if o.get('requested_status') != 'Enabled': F('activation preview: requested status must be Enabled')
    if spec and num(o.get('daily_budget')) != num(spec['budget']['average_daily_amount']): F('activation preview: budget mismatch')
    if spec and num(o.get('max_cpc')) != num(spec['bidding']['maximum_cpc']): F('activation preview: max CPC mismatch')
    if o.get('unexpected_changes') is not False: F('activation preview: unexpected_changes must be false')
    return tap_

# ---------------- gate-driven checks ----------------
t_preview = check_plan_a_preview() if approved['import_gate'] else None
t_applied = t_verified = None
if approved['plan_a_applied']:
    t_applied, t_verified = check_plan_a_applied()
if approved['import_gate']:
    if CUR['plan_a_package_sha256'] != MD.get('plan_a_package_sha256'): F('import_gate APPROVED but Plan A digest STALE')
    if CUR['campaign_spec_sha256'] != MD.get('campaign_spec_sha256'): F('import_gate APPROVED but campaign-spec digest STALE')
    for pre in ('marketing','clinical','budget','landing_page_verified'):
        if not approved[pre]: F(f'import_gate APPROVED before prerequisite gate {pre}')
        order(gtime(pre), gtime('import_gate'), f'{pre} approval', 'import approval')
    order(t_preview, gtime('import_gate'), 'Editor preview', 'import approval')
plan_b_chronology(t_verified)
t_exec = check_activation_execution()
t_actprev = check_activation_preview() if approved['activation'] else None
if approved['activation']:
    ta = gtime('activation')
    if not approved['import_gate']: F('activation APPROVED before import_gate')
    if not approved['plan_a_applied']: F('activation APPROVED but Plan A was never recorded as applied+verified')
    if not approved['activation_landing_recheck']: F('activation APPROVED without a same-day landing recheck')
    if CUR['plan_c_activation_sha256'] != MD.get('plan_c_activation_sha256'): F('activation APPROVED but Plan C ACTIVATION digest STALE')
    if pbd not in ('ATTACH_APPROVED','DECLINED'): F('activation APPROVED while plan_b_decision is PENDING (silence is not a decision)')
    for c in campaigns:
        if (c.get('tracking') or {}).get('attribution_decision') == 'PENDING':
            F('activation APPROVED while attribution_decision is PENDING')
    if spec and (spec.get('landing_page') or {}).get('production_status') != 'VERIFIED_200':
        F('activation APPROVED while landing_page.production_status is not VERIFIED_200')
    order(gtime('import_gate'), ta, 'import approval', 'activation approval')
    order(t_verified, ta, 'Plan A verification', 'activation approval')
    order(tpb, ta, 'Plan B decision', 'activation approval')
    order(t_actprev, ta, 'activation Editor preview', 'activation approval')
    if t_verified and t_actprev and t_actprev < t_verified: F('chronology: activation preview BEFORE Plan A verification')


# ---------------- online landing check ----------------
def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'NextGenDental-ads-validator/6'})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.getcode(), r.geturl(), r.read().decode('utf-8','replace')
        except urllib.error.HTTPError as e:
            return e.code, url, ''
        except Exception as e:
            last = e; time.sleep(2*(i+1))
    raise last
if ONLINE:
    for c in campaigns:
        base = c['landing_page']['url']
        withutm = base + '?' + '&'.join(f'{k}={v}' for k,v in c['tracking']['utm'].items())
        for url in (base, withutm):
            try:
                code, final, body = fetch(url)
            except Exception as e:
                F(f'landing page {url}: unreachable after 3 attempts ({e})'); continue
            if code != 200: F(f'landing page {url}: HTTP {code}')
            host = final.split('/')[2].split('@')[-1].split(':')[0] if '//' in final else ''
            if host and not (host == DOMAIN or host.endswith('.'+DOMAIN)): F(f'landing page {url}: off-domain redirect {host!r}')
            m = re.search(r'<title[^>]*>(.*?)</title>', body, re.S|re.I)
            if m and re.search(r'not found|404', m.group(1), re.I): F(f'landing page {url}: error-page title')
            can = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', body, re.I)
            if not can: F(f'landing page {url}: no canonical link')
            elif can.group(1).split('?')[0].rstrip('/') != base.rstrip('/'): F(f'landing page {url}: canonical mismatch')
            if body and 'analytics.nextgendentalaustintx.com' not in body:
                W(f'landing page {url}: analytics loader absent (conversion measurement)')
else:
    W('landing-page health NOT checked (run with --online; release modes require it)')

REQUIRED = {'release-plan-a': ('marketing','clinical','budget','landing_page_verified','import_gate'),
            'release-plan-b': ('import_gate','plan_a_applied'),
            'release-plan-c': ('marketing','clinical','budget','landing_page_verified','import_gate',
                               'plan_a_applied','activation_landing_recheck','activation')}
if MODE.startswith('release-'):
    for k in REQUIRED[MODE]:
        if not approved.get(k): F(f'[{MODE}] gate {k} is not APPROVED - release blocked')
    if MODE == 'release-plan-b':
        if pbd != 'ATTACH_APPROVED': F('[release-plan-b] plan_b_decision is not ATTACH_APPROVED')
        if not planb_rows: F('[release-plan-b] no approved attachments - nothing to release')
        if not leads_approved: F('[release-plan-b] no Leads attachment gate is APPROVED')
        if CUR['plan_b_package_sha256'] != MD.get('plan_b_package_sha256'): F('[release-plan-b] Plan B digest STALE')
    if MODE == 'release-plan-c':
        if pbd not in ('ATTACH_APPROVED','DECLINED'): F('[release-plan-c] plan_b_decision still PENDING')
        for c in campaigns:
            if (c.get('tracking') or {}).get('attribution_decision') == 'PENDING':
                F('[release-plan-c] attribution_decision still PENDING')
        if not aprev.get('completed'): F('[release-plan-c] activation Editor preview not completed')
    if not ONLINE: F(f'[{MODE}] release validation must be run with --online')

print(f'campaign-as-code validation v6.1 [{MODE}]: {len(fails)} failed, {len(warns)} warnings   [{TODAY} UTC]')
for x in fails: print('  FAIL:', x)
for x in warns: print('  WARN:', x)
sys.exit(1 if fails else 0)
