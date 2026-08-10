#!/usr/bin/env python3
"""Campaign-as-code validator v5.
  python3 validate.py [--online] [--draft | --release-plan-a | --release-plan-b | --release-plan-c]

Draft mode (default) checks structure, parity, evidence and cross-consistency.
RELEASE modes additionally require that plan's approvals to be complete,
chronological, evidence-backed and digest-bound. A draft-clean tree is NOT a
released one. Exit 1 on any failure."""
import sys, re, os, csv, glob, hashlib, subprocess, tempfile, shutil, time
from datetime import datetime, timezone, date
import urllib.request, urllib.error
import yaml
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

ROOT = os.path.dirname(os.path.abspath(__file__))
MODE = next((a[2:] for a in sys.argv[1:] if a.startswith('--') and a[2:].startswith(('draft','release-plan-'))), 'draft')
fails, warns = [], []
F, W = fails.append, warns.append
TODAY = datetime.now(timezone.utc).date()
NOW = datetime.now(timezone.utc)
FORBIDDEN = re.compile(r'\b(guarantee[ds]?|painless|pain[- ]free|best|#1|cure[sd]?|free|miracle|top[- ]rated)\b', re.I)
SECRETY = re.compile(r'(AKIA[0-9A-Z]{16}|-----BEGIN|password\s*[:=]|customer[_ ]?id\s*[:=]\s*\d|@gmail\.|\b\d{3}[-.]\d{3}[-.]\d{4}\b)', re.I)
APPROVED_GEO = {"Austin, TX (south metro service area)", "Buda, TX", "Kyle, TX"}
APPROVED_LANGS = {"English"}
DOMAIN = "nextgendentalaustintx.com"

man    = yaml.safe_load(open(f'{ROOT}/approval-manifest.yaml'))
negdoc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))
actdoc = yaml.safe_load(open(f'{ROOT}/campaigns/activation-action.yaml')).get('activation_action', {})
prev   = yaml.safe_load(open(f'{ROOT}/preview-evidence.yaml')) or {}

def ts(v, label):
    """Parse a tz-aware timestamp; report and return None on any problem."""
    if not v: return None
    try:
        t = datetime.fromisoformat(str(v).replace('Z', '+00:00'))
    except Exception:
        F(f'{label}: not a valid ISO timestamp'); return None
    if t.tzinfo is None: F(f'{label}: timestamp needs a timezone'); return None
    if t > NOW: F(f'{label}: timestamp is in the future'); return None
    return t

# ---------------- campaign specs ----------------
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
    if not c.get('languages'): F(f'{path}: no languages')
    elif not set(c['languages']) <= APPROVED_LANGS: F(f'{path}: unapproved language (Spanish needs its own campaign + landing page)')
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
dup = {t for t in allt if allt.count(t) > 1}
if dup: F(f'duplicate negatives across lists: {dup}')

# ------- activation action MUST agree with the approved campaign spec -------
spec = next((c for c in campaigns if c['name'] == actdoc.get('campaign')), None)
if not spec:
    F('activation-action targets a campaign with no approved spec')
else:
    if actdoc.get('requested_status') != 'ENABLED': F('activation-action: requested_status must be ENABLED')
    if actdoc.get('previous_status') != 'PAUSED' or actdoc.get('rollback_status') != 'PAUSED':
        F('activation-action: previous/rollback status must be PAUSED')
    if actdoc.get('budget_daily') != spec['budget']['average_daily_amount']:
        F(f'activation-action budget {actdoc.get("budget_daily")} != campaign spec {spec["budget"]["average_daily_amount"]}')
    if actdoc.get('maximum_cpc') != spec['bidding']['maximum_cpc']:
        F(f'activation-action max CPC {actdoc.get("maximum_cpc")} != campaign spec {spec["bidding"]["maximum_cpc"]}')
    if actdoc.get('currency') != spec['budget']['currency']:
        F('activation-action currency != campaign spec')
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
for p in glob.glob(f'{ROOT}/import/**/*.csv', recursive=True):
    rows = list(csv.reader(open(p)))
    if not rows: continue
    if len({len(r) for r in rows}) != 1: F(f'{p}: ragged CSV')
    if os.path.abspath(p) == ACT_CSV: continue          # the one governed exception
    hdr = rows[0]
    for col in ('Status','Campaign status'):
        if col in hdr:
            i = hdr.index(col)
            for r in rows[1:]:
                if len(r) > i and r[i] != 'Paused': F(f'{p}: non-Paused entity: {r[:3]}')
arows = list(csv.reader(open(ACT_CSV)))
if len(arows) != 2: F('activation.csv must contain exactly one campaign mutation')
else:
    a = dict(zip(arows[0], arows[1]))
    if set(arows[0]) != {'Campaign','Campaign status','Budget','Max CPC'}:
        F('activation.csv must contain only Editor-recognised columns (governance metadata belongs in YAML)')
    if a.get('Campaign') not in names: F('activation.csv targets an unknown campaign')
    if a.get('Campaign status') != 'Enabled': F('activation.csv status must be Enabled')
    def num(x):
        try: return float(x)
        except Exception: return None
    if spec and num(a.get('Budget')) != float(spec['budget']['average_daily_amount']): F('activation.csv budget != campaign spec')
    if spec and num(a.get('Max CPC')) != float(spec['bidding']['maximum_cpc']): F('activation.csv max CPC != campaign spec')

# ---------------- digests (with key self-check) ----------------
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
for k, v in CUR.items():                       # guards the v4-style silent key drift
    if v is None: F(f'CHECKSUMS.txt has no digest for {k}')
    if k not in MD: F(f'approval-manifest digests: missing key {k} (validator references it)')
for k in MD:
    if k not in CUR: F(f'approval-manifest digests: unknown/stale key {k}')

try:
    EXP = date.fromisoformat(str(man.get('expires')))
    if EXP < TODAY: F(f'plan expired {EXP} (today {TODAY})')
except Exception:
    F('manifest expires is not a valid ISO date'); EXP = None

AUTH = man.get('authorized_approvers', {})
G = man.get('gates', {})
def check_gate(name, gate, role='owner'):
    st = (gate or {}).get('status')
    if st not in ('NOT_APPROVED','PENDING','APPROVED'): F(f'gate {name}: invalid status {st!r}'); return False
    if st != 'APPROVED': return False
    who = gate.get('approved_by') or gate.get('applied_by')
    when = gate.get('approved_at') or gate.get('applied_at')
    if not who: F(f'gate {name}: APPROVED without an approver identity')
    elif who not in AUTH.get(role, []): F(f'gate {name}: {who!r} not an authorized {role} approver')
    t = ts(when, f'gate {name}.approved_at')
    if when and t and EXP and t.date() > EXP: F(f'gate {name}: approved after expiry')
    if not when: F(f'gate {name}: APPROVED without a timestamp')
    return True

GATES = ('marketing','clinical','budget','landing_page_verified','import_gate','plan_a_applied','activation')
approved = {k: check_gate(k, G.get(k), 'clinical' if k == 'clinical' else 'owner') for k in GATES}
def gtime(k):
    g = G.get(k) or {}
    return ts(g.get('approved_at') or g.get('applied_at'), f'gate {k}')

# landing-page evidence
if approved['landing_page_verified']:
    ev = (G.get('landing_page_verified') or {}).get('evidence')
    if not isinstance(ev, dict):
        F('landing_page_verified APPROVED without structured evidence')
    else:
        for k in ('url','http_status','final_url','tested_at','tested_by','spec_digest'):
            if not ev.get(k): F(f'landing evidence missing {k}')
        if str(ev.get('http_status')) != '200': F(f'landing evidence http_status={ev.get("http_status")} (must be 200)')
        if ev.get('spec_digest') and ev['spec_digest'] != CUR['campaign_spec_sha256']:
            F('landing evidence captured against a different campaign spec')
        want = {c['landing_page']['url'] for c in campaigns}
        if ev.get('url') and ev['url'].split('?')[0] not in want:
            F('landing evidence url is not the campaign landing page')
        fh = str(ev.get('final_url','')).split('/')[2] if '//' in str(ev.get('final_url','')) else ''
        if fh and not (fh == DOMAIN or fh.endswith('.' + DOMAIN)): F(f'landing evidence final_url off-domain: {fh!r}')
        te = ts(ev.get('tested_at'), 'landing evidence tested_at')
        ta = gtime('landing_page_verified')
        if te and ta and te > ta: F('landing evidence tested_at is AFTER its approval timestamp')

# chronology
PRE = ('marketing','clinical','budget','landing_page_verified')
if approved['import_gate']:
    ti = gtime('import_gate')
    for k in PRE:
        tk = gtime(k)
        if approved[k] and ti and tk and tk > ti: F(f'gate order: {k} approved AFTER import_gate')
if approved['plan_a_applied']:
    tap, ti = gtime('plan_a_applied'), gtime('import_gate')
    if not approved['import_gate']: F('plan_a_applied recorded without import_gate approval')
    if tap and ti and tap < ti: F('plan_a_applied recorded BEFORE import_gate approval')
    pa = G.get('plan_a_applied') or {}
    if pa.get('package_digest') != CUR['plan_a_package_sha256']:
        F('plan_a_applied.package_digest does not match the current Plan A package')
    if not pa.get('account_verification_evidence'): F('plan_a_applied without account_verification_evidence')
if approved['activation']:
    ta, ti = gtime('activation'), gtime('import_gate')
    if not approved['import_gate']: F('activation APPROVED before import_gate')
    if not approved['plan_a_applied']: F('activation APPROVED but Plan A was never recorded as applied+verified')
    if ta and ti and ti > ta: F('gate order: import_gate approved AFTER activation')
    if CUR['plan_c_activation_sha256'] != MD.get('plan_c_activation_sha256'):
        F('activation APPROVED but Plan C ACTIVATION digest STALE')
    if (man.get('plan_b_decision') or {}).get('status') not in ('ATTACH_APPROVED','DECLINED'):
        F('activation APPROVED while plan_b_decision is still PENDING (silence is not a decision)')
    for c in campaigns:
        if (c.get('tracking') or {}).get('attribution_decision') == 'PENDING':
            F('activation APPROVED while attribution_decision is PENDING')
    if spec and (spec.get('landing_page') or {}).get('production_status') != 'VERIFIED_200':
        F('activation APPROVED while landing_page.production_status is not VERIFIED_200')

# import gate digest binding + preview evidence
if approved['import_gate']:
    if CUR['plan_a_package_sha256'] != MD.get('plan_a_package_sha256'): F('import_gate APPROVED but Plan A digest STALE')
    if CUR['campaign_spec_sha256'] != MD.get('campaign_spec_sha256'): F('import_gate APPROVED but campaign-spec digest STALE')
    for pre in PRE:
        if not approved[pre]: F(f'import_gate APPROVED before prerequisite gate {pre}')
    if not prev.get('completed'): F('import_gate APPROVED without a completed Editor preview')
    else:
        if prev.get('plan_a_digest') != CUR['plan_a_package_sha256']: F('preview evidence was captured against a different Plan A package')
        tp, ti = ts(prev.get('previewed_at'), 'preview previewed_at'), gtime('import_gate')
        if tp and ti and tp > ti: F('Editor preview happened AFTER the import approval')
        if prev.get('previewed_by') not in AUTH.get('owner', []): F('preview evidence: previewed_by is not an authorized owner')
        if prev.get('result') != 'MATCHES_PLAN': F(f'preview result is {prev.get("result")!r}')
        exp_counts = {'campaigns': 1, 'ad_groups': len(spec['ad_groups']) if spec else None,
                      'keywords': len(list(csv.reader(open(f'{ROOT}/import/plan-a/keywords.csv')))) - 1,
                      'ads': len(list(csv.reader(open(f'{ROOT}/import/plan-a/ads.csv')))) - 1,
                      'negative_lists': len([n for n in negdoc['negative_lists'] if n['risk_tier'] != 'review']),
                      'negative_phrases': len(list(csv.reader(open(f'{ROOT}/import/plan-a/negative-lists.csv')))) - 1,
                      'shared_list_attachments': 0}
        for k, v in exp_counts.items():
            if prev.get('observed', {}).get(k) != v:
                F(f'preview evidence {k}={prev.get("observed", {}).get(k)!r} but artifacts contain {v}')

for lname, targets in (man.get('attachment') or {}).items():
    known = {nl['name'] for nl in negdoc['negative_lists']}
    if lname not in known: F(f'attachment references unknown list {lname!r}')
    for tgt, gate in (targets or {}).items():
        if check_gate(f'attachment[{lname}][{tgt}]', gate, 'owner'):
            if tgt == 'leads_campaign' and CUR['plan_b_package_sha256'] != MD.get('plan_b_package_sha256'):
                F('live-Leads attachment APPROVED but Plan B digest STALE')
            if tgt == 'new_campaign' and CUR['plan_c_attach_sha256'] != MD.get('plan_c_attach_sha256'):
                F('new-campaign attachment APPROVED but Plan C ATTACH digest STALE')
pbd = (man.get('plan_b_decision') or {}).get('status')
if pbd not in ('PENDING','ATTACH_APPROVED','DECLINED'): F(f'plan_b_decision.status invalid: {pbd!r}')
if pbd in ('ATTACH_APPROVED','DECLINED'):
    if not (man['plan_b_decision'].get('decided_by') in AUTH.get('owner', [])): F('plan_b_decision: decided_by not an authorized owner')
    ts(man['plan_b_decision'].get('decided_at'), 'plan_b_decision.decided_at')

# ---------------- online landing-page check ----------------
def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'NextGenDental-ads-validator/5'})
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.getcode(), r.geturl(), r.read().decode('utf-8','replace')
        except urllib.error.HTTPError as e:
            return e.code, url, ''
        except Exception as e:
            last = e; time.sleep(2*(i+1))
    raise last

if '--online' in sys.argv:
    for c in campaigns:
        base = c['landing_page']['url']
        withutm = base + '?' + '&'.join(f'{k}={v}' for k,v in c['tracking']['utm'].items())
        for url in (base, withutm):
            try:
                code, final, body = fetch(url)
            except Exception as e:
                F(f'landing page {url}: unreachable after 3 attempts ({e})'); continue
            if code != 200: F(f'landing page {url}: HTTP {code} (paid traffic must never hit a non-200)')
            host = final.split('/')[2].split('@')[-1].split(':')[0] if '//' in final else ''
            if host and not (host == DOMAIN or host.endswith('.'+DOMAIN)): F(f'landing page {url}: redirected off-domain to {host!r}')
            m = re.search(r'<title[^>]*>(.*?)</title>', body, re.S|re.I)
            title = m.group(1).strip() if m else ''
            if re.search(r'not found|404', title, re.I): F(f'landing page {url}: error-page title {title!r}')
            can = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', body, re.I)
            if not can: F(f'landing page {url}: no canonical link')
            elif can.group(1).split('?')[0].rstrip('/') != base.rstrip('/'): F(f'landing page {url}: canonical {can.group(1)!r} != intended page')
            if body and 'analytics.nextgendentalaustintx.com' not in body:
                W(f'landing page {url}: analytics loader absent (conversion measurement)')
else:
    W('landing-page health NOT checked (run with --online; release modes require it)')

REQUIRED = {'release-plan-a': ('marketing','clinical','budget','landing_page_verified','import_gate'),
            'release-plan-b': (),
            'release-plan-c': ('marketing','clinical','budget','landing_page_verified','import_gate','plan_a_applied','activation')}
if MODE.startswith('release-'):
    for k in REQUIRED[MODE]:
        if not approved.get(k): F(f'[{MODE}] gate {k} is not APPROVED - release blocked')
    if MODE == 'release-plan-b':
        rows = list(csv.reader(open(f'{ROOT}/import/plan-b/attach-leads.csv')))
        if len(rows) <= 1: F('[release-plan-b] no approved attachments - nothing to release')
        if pbd != 'ATTACH_APPROVED': F('[release-plan-b] plan_b_decision is not ATTACH_APPROVED')
    if MODE == 'release-plan-c':
        for c in campaigns:
            if (c.get('tracking') or {}).get('attribution_decision') == 'PENDING':
                F('[release-plan-c] attribution_decision still PENDING')
    if '--online' not in sys.argv:
        F(f'[{MODE}] release validation must be run with --online (live landing-page check)')

print(f'campaign-as-code validation v5 [{MODE}]: {len(fails)} failed, {len(warns)} warnings   [{TODAY} UTC]')
for x in fails: print('  FAIL:', x)
for x in warns: print('  WARN:', x)
sys.exit(1 if fails else 0)
