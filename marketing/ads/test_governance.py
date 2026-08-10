#!/usr/bin/env python3
"""Governance scenario tests (v6).

Builds a GOLDEN fully-approved fixture in a temporary directory — never in the
repository, so no APPROVED status is ever committed to make tests pass — then
mutates one thing per scenario and asserts the validator fails with the expected
reason. Also proves that hand-editing a generated CSV breaks parity.

Run: python3 test_governance.py"""
import os, sys, shutil, subprocess, tempfile, csv, copy
from datetime import datetime, timezone, timedelta
import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
NOW = datetime.now(timezone.utc)
def T(minutes_ago):            # always in the past, always same UTC date as NOW
    t = NOW - timedelta(minutes=minutes_ago)
    return t.replace(microsecond=0).isoformat().replace('+00:00', 'Z')

def build_golden(dst):
    """Copy the repo tree and fill in a complete, internally-consistent approval set."""
    shutil.copytree(ROOT, dst, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    subprocess.run([PY, 'generate.py'], cwd=dst, check=True, capture_output=True)
    dig = {}
    for line in open(f'{dst}/import/CHECKSUMS.txt'):
        h, label = line.split()[0], line.split()[-1]
        dig[label] = h
    kw = list(csv.reader(open(f'{dst}/import/plan-a/keywords.csv')))[1:]
    ads = list(csv.reader(open(f'{dst}/import/plan-a/ads.csv')))
    negs = list(csv.reader(open(f'{dst}/import/plan-a/negative-lists.csv')))[1:]
    final_url = ads[1][ads[0].index('Final URL')]
    spec = yaml.safe_load(open(f'{dst}/campaigns/search-implants-south-austin.yaml'))['campaign']

    # campaign spec: attribution decided (owner choice simulated in fixture only)
    s = open(f'{dst}/campaigns/search-implants-south-austin.yaml').read()
    s = s.replace('attribution_decision: PENDING', 'attribution_decision: D')
    open(f'{dst}/campaigns/search-implants-south-austin.yaml', 'w').write(s)
    subprocess.run([PY, 'generate.py'], cwd=dst, check=True, capture_output=True)
    dig = {}
    for line in open(f'{dst}/import/CHECKSUMS.txt'):
        dig[line.split()[-1]] = line.split()[0]

    def landing_ev(when):
        base = spec['landing_page']['url']
        utm = base + '?' + '&'.join(f'{k}={v}' for k, v in spec['tracking']['utm'].items())
        mk = lambda u: {'url': u, 'http_status': 200, 'final_url': u, 'title': 'Dental Implants | NextGen Dental',
                        'canonical': base, 'analytics_loader_present': True}
        return {'tested_at': when, 'tested_by': 'ratikk', 'spec_digest': dig['CAMPAIGN-SPEC-DIGEST'],
                'clean_url': mk(base), 'utm_url': mk(utm)}

    man = yaml.safe_load(open(f'{dst}/approval-manifest.yaml'))
    man['digests'] = {'campaign_spec_sha256': dig['CAMPAIGN-SPEC-DIGEST'],
                      'plan_a_package_sha256': dig['PLAN-A-PACKAGE-DIGEST'],
                      'plan_b_package_sha256': dig['PLAN-B-PACKAGE-DIGEST'],
                      'plan_c_attach_sha256': dig['PLAN-C-ATTACH-DIGEST'],
                      'plan_c_activation_sha256': dig['PLAN-C-ACTIVATION-DIGEST']}
    g = man['gates']
    for k, mins in (('marketing', 300), ('clinical', 295), ('budget', 290)):
        g[k] = {'status': 'APPROVED', 'approved_by': 'dr-kondragunta' if k == 'clinical' else 'ratikk',
                'approved_at': T(mins)}
    g['landing_page_verified'] = {'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(285),
                                  'evidence': landing_ev(T(287))}
    g['import_gate'] = {'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(270)}
    g['plan_a_applied'] = {'status': 'APPROVED', 'applied_by': 'ratikk', 'applied_at': T(240),
                           'package_digest': dig['PLAN-A-PACKAGE-DIGEST'],
                           'account_verification_evidence': {
                               'verified_at': T(230), 'verified_by': 'ratikk', 'evidence_reference': 'export-2026-08-10.csv',
                               'campaign_found': True, 'campaign_status': 'Paused',
                               'daily_budget': spec['budget']['average_daily_amount'],
                               'max_cpc': spec['bidding']['maximum_cpc'],
                               'keywords_total': len(kw), 'keywords_paused': len(kw),
                               'ads_total': len(ads) - 1, 'ads_paused': len(ads) - 1,
                               'negative_lists_created': len({r[0] for r in negs}),
                               'shared_list_attachments': 0, 'unexpected_changes': False,
                               'errors': 'none', 'result': 'MATCHES_PLAN'}}
    g['activation_landing_recheck'] = {'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(60),
                                       'evidence': landing_ev(T(65))}
    g['activation'] = {'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(30)}
    man['plan_b_decision'] = {'status': 'DECLINED', 'decided_by': 'ratikk', 'decided_at': T(200),
                              'rationale': 'Measured Leads impact was $0.00-$16.43; revisit after PMax work.'}
    yaml.safe_dump(man, open(f'{dst}/approval-manifest.yaml', 'w'), sort_keys=False)

    prev = yaml.safe_load(open(f'{dst}/preview-evidence.yaml'))
    prev.update({'completed': True, 'plan_a_digest': dig['PLAN-A-PACKAGE-DIGEST'], 'previewed_at': T(280),
                 'previewed_by': 'ratikk', 'account_confirmed': 'NextGen Dental (verified on screen)',
                 'evidence_reference': 'editor-preview-2026-08-10.png', 'errors': 'none',
                 'warnings': 'none', 'result': 'MATCHES_PLAN'})
    prev['observed'] = {'campaigns': 1, 'campaign_name': spec['name'], 'campaign_type': 'Search',
                        'campaign_status': 'Paused', 'daily_budget': spec['budget']['average_daily_amount'],
                        'budget_type': 'Daily', 'bid_strategy': 'Manual CPC',
                        'max_cpc': spec['bidding']['maximum_cpc'], 'networks': 'Google search only',
                        'display_network': False, 'search_partners': False, 'languages': ['English'],
                        'locations': ['Austin TX', 'Buda TX', 'Kyle TX'],
                        'location_option': 'People in your targeted locations',
                        'ad_groups': len(spec['ad_groups']), 'keywords': len(kw),
                        'exact_keywords': sum(1 for r in kw if r[3] == 'Exact'),
                        'phrase_keywords': sum(1 for r in kw if r[3] == 'Phrase'),
                        'enabled_keywords': 0, 'ads': len(ads) - 1, 'enabled_ads': 0,
                        'negative_lists': len({r[0] for r in negs}), 'negative_phrases': len(negs),
                        'shared_list_attachments': 0, 'final_urls': [final_url]}
    yaml.safe_dump(prev, open(f'{dst}/preview-evidence.yaml', 'w'), sort_keys=False)

    ap = yaml.safe_load(open(f'{dst}/activation-preview-evidence.yaml'))
    ap.update({'completed': True, 'activation_digest': dig['PLAN-C-ACTIVATION-DIGEST'], 'previewed_at': T(90),
               'previewed_by': 'ratikk', 'account_confirmed': 'NextGen Dental (verified on screen)',
               'evidence_reference': 'activation-preview-2026-08-10.png',
               'editor_column_compatibility': 'ACCEPTED', 'errors': 'none', 'warnings': 'none',
               'result': 'MATCHES_PLAN',
               'observed': {'campaigns_changed': 1, 'campaign_name': spec['name'], 'previous_status': 'Paused',
                            'requested_status': 'Enabled', 'daily_budget': spec['budget']['average_daily_amount'],
                            'max_cpc': spec['bidding']['maximum_cpc'], 'unexpected_changes': False}})
    yaml.safe_dump(ap, open(f'{dst}/activation-preview-evidence.yaml', 'w'), sort_keys=False)
    return dst

def restamp(d):
    subprocess.run([PY, 'generate.py'], cwd=d, check=True, capture_output=True)
    dig = {}
    for line in open(f'{d}/import/CHECKSUMS.txt'):
        dig[line.split()[-1]] = line.split()[0]
    man = yaml.safe_load(open(f'{d}/approval-manifest.yaml'))
    man['digests'] = {'campaign_spec_sha256': dig['CAMPAIGN-SPEC-DIGEST'],
                      'plan_a_package_sha256': dig['PLAN-A-PACKAGE-DIGEST'],
                      'plan_b_package_sha256': dig['PLAN-B-PACKAGE-DIGEST'],
                      'plan_c_attach_sha256': dig['PLAN-C-ATTACH-DIGEST'],
                      'plan_c_activation_sha256': dig['PLAN-C-ACTIVATION-DIGEST']}
    yaml.safe_dump(man, open(f'{d}/approval-manifest.yaml','w'), sort_keys=False)
    return dig

def make_plan_b_approved(d):
    """Turn the golden fixture into a fully valid ATTACH_APPROVED Plan B state:
    attachment approved BEFORE the decision, CSV regenerated, digests re-stamped."""
    def m(y):
        y['attachment']['NEG | Freebie Intent (low-risk)']['leads_campaign'] = {
            'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(215)}
        y['plan_b_decision'] = {'status': 'ATTACH_APPROVED', 'decided_by': 'ratikk',
                                'decided_at': T(200),
                                'rationale': 'Freebie-intent exclusions approved for the live Leads campaign.'}
    edit(d, MAN, m)
    restamp(d)

def run(d, mode):
    r = subprocess.run([PY, 'validate.py', f'--{mode}'], cwd=d, capture_output=True, text=True)
    return r.stdout + r.stderr

def edit(d, rel, fn):
    doc = yaml.safe_load(open(f'{d}/{rel}'))
    fn(doc)
    yaml.safe_dump(doc, open(f'{d}/{rel}', 'w'), sort_keys=False)

MAN, PREV, APREV, SPEC, ACT = ('approval-manifest.yaml', 'preview-evidence.yaml',
                               'activation-preview-evidence.yaml',
                               'campaigns/search-implants-south-austin.yaml',
                               'campaigns/activation-action.yaml')
S = []
def scen(name, mode, expect, mutate): S.append((name, mode, expect, mutate))

# ---- Plan A Editor preview ----
scen('preview: Enabled campaign', 'release-plan-a', 'preview campaign_status',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(campaign_status='Enabled')))
scen('preview: $80 budget', 'release-plan-a', 'preview daily_budget',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(daily_budget=80)))
scen('preview: wrong CPC', 'release-plan-a', 'preview max_cpc',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(max_cpc=25)))
scen('preview: Display Network on', 'release-plan-a', 'preview display_network',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(display_network=True)))
scen('preview: Search Partners on', 'release-plan-a', 'preview search_partners',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(search_partners=True)))
scen('preview: wrong language', 'release-plan-a', 'preview languages',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(languages=['Spanish'])))
scen('preview: wrong location option', 'release-plan-a', 'preview location_option',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(location_option='Presence or interest')))
scen('preview: wrong locations', 'release-plan-a', 'preview locations',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(locations=['Dallas TX'])))
scen('preview: errors present', 'release-plan-a', 'import errors present',
     lambda d: edit(d, PREV, lambda y: y.update(errors=['ad group missing'])))
scen('preview: warning without acceptance', 'release-plan-a', 'warnings present but not accepted',
     lambda d: edit(d, PREV, lambda y: y.update(warnings=['low search volume'])))
scen('preview: stale digest', 'release-plan-a', 'stale Plan A digest',
     lambda d: edit(d, PREV, lambda y: y.update(plan_a_digest='0'*64)))
scen('preview: no account confirmation', 'release-plan-a', 'account_confirmed empty',
     lambda d: edit(d, PREV, lambda y: y.update(account_confirmed=None)))
scen('preview: wrong final URL', 'release-plan-a', 'final_urls',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(final_urls=['https://nextgendentalaustintx.com/'])))
scen('preview: keyword count off', 'release-plan-a', 'preview keywords',
     lambda d: edit(d, PREV, lambda y: y['observed'].update(keywords=99)))
scen('preview: after import approval', 'release-plan-a', 'Editor preview occurred AFTER import approval',
     lambda d: edit(d, PREV, lambda y: y.update(previewed_at=T(10))))
scen('preview: not completed', 'release-plan-a', 'preview not completed',
     lambda d: edit(d, PREV, lambda y: y.update(completed=False)))

# ---- Plan A applied / verification ----
scen('applied: string evidence "yes"', 'release-plan-c', 'must be a structured object',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied'].update(account_verification_evidence='yes')))
scen('applied: before import approval', 'release-plan-c', 'import approval occurred AFTER Plan A application',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied'].update(applied_at=T(280))))
scen('applied: verified before applied', 'release-plan-c', 'account verification BEFORE Plan A application',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(verified_at=T(250))))
scen('applied: campaign Enabled in account', 'release-plan-c', 'campaign is not Paused after posting',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(campaign_status='Enabled')))
scen('applied: a keyword not paused', 'release-plan-c', 'keywords must all exist and be Paused',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(keywords_paused=12)))
scen('applied: an ad not paused', 'release-plan-c', 'ads must all exist and be Paused',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(ads_paused=1)))
scen('applied: unexpected attachment', 'release-plan-c', 'Plan A must create zero attachments',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(shared_list_attachments=1)))
scen('applied: stale package digest', 'release-plan-c', 'package_digest does not match',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied'].update(package_digest='0'*64)))
scen('applied: unexpected changes true', 'release-plan-c', 'unexpected_changes must be false',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied']['account_verification_evidence'].update(unexpected_changes=True)))

# ---- Plan B ----
def approve_leads(y):
    y['attachment']['NEG | Freebie Intent (low-risk)']['leads_campaign'] = {
        'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(210)}
scen('plan B: DECLINED with an approved attachment', 'draft', 'DECLINED but a Leads attachment gate is APPROVED',
     lambda d: edit(d, MAN, approve_leads))
scen('plan B: DECLINED without rationale', 'draft', 'rationale is required',
     lambda d: edit(d, MAN, lambda y: y['plan_b_decision'].update(rationale=None)))
def attach_approved_no_gates(y): y['plan_b_decision'].update(status='ATTACH_APPROVED')
scen('plan B: ATTACH_APPROVED with zero attachments', 'draft', 'no Leads attachment gate is APPROVED',
     lambda d: edit(d, MAN, attach_approved_no_gates))
scen('plan B: PENDING blocks activation', 'release-plan-c', 'plan_b_decision is PENDING',
     lambda d: edit(d, MAN, lambda y: y['plan_b_decision'].update(status='PENDING', decided_by=None, decided_at=None, rationale=None)))
scen('plan B: decision before Plan A verification', 'release-plan-c', 'Plan B decision BEFORE Plan A account verification',
     lambda d: edit(d, MAN, lambda y: y['plan_b_decision'].update(decided_at=T(260))))
def attach_after_decision(y):
    y['plan_b_decision'].update(status='ATTACH_APPROVED')
    y['attachment']['NEG | Freebie Intent (low-risk)']['leads_campaign'] = {
        'status': 'APPROVED', 'approved_by': 'ratikk', 'approved_at': T(100)}
scen('plan B: attachment approved after decision', 'draft', 'attachment approval occurred AFTER the Plan B decision',
     lambda d: edit(d, MAN, attach_after_decision))

# ---- Plan C / activation ----
scen('activation: before Plan A verification recorded', 'release-plan-c', 'Plan A was never recorded as applied',
     lambda d: edit(d, MAN, lambda y: y['gates']['plan_a_applied'].update(status='NOT_APPROVED')))
scen('activation: attribution PENDING', 'release-plan-c', 'attribution_decision is PENDING',
     lambda d: edit(d, SPEC, lambda y: y['campaign']['tracking'].update(attribution_decision='PENDING')))
scen('activation: stale activation digest', 'release-plan-c', 'ACTIVATION digest STALE',
     lambda d: edit(d, MAN, lambda y: y['digests'].update(plan_c_activation_sha256='0'*64)))
scen('activation: budget divergence in spec', 'draft', 'activation-action budget != campaign spec',
     lambda d: edit(d, ACT, lambda y: y['activation_action'].update(budget_daily=100)))
scen('activation: CPC divergence in spec', 'draft', 'activation-action max CPC != campaign spec',
     lambda d: edit(d, ACT, lambda y: y['activation_action'].update(maximum_cpc=25)))
scen('activation: missing activation preview', 'release-plan-c', 'activation Editor preview not completed',
     lambda d: edit(d, APREV, lambda y: y.update(completed=False)))
scen('activation: stale activation-preview digest', 'release-plan-c', 'activation preview: stale activation digest',
     lambda d: edit(d, APREV, lambda y: y.update(activation_digest='0'*64)))
scen('activation: Editor column compatibility PENDING', 'release-plan-c', 'editor_column_compatibility must be ACCEPTED',
     lambda d: edit(d, APREV, lambda y: y.update(editor_column_compatibility='PENDING')))
scen('activation: preview before Plan A verification', 'release-plan-c', 'activation preview BEFORE Plan A verification',
     lambda d: edit(d, APREV, lambda y: y.update(previewed_at=T(260))))
scen('activation: landing recheck missing', 'release-plan-c', 'without a same-day landing recheck',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck'].update(status='NOT_APPROVED')))
scen('activation: landing recheck on a different day', 'release-plan-c', 'SAME UTC date as activation approval',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence'].update(tested_at=T(60*30))))
scen('activation: UTM landing 404 in evidence', 'release-plan-c', 'http_status',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence']['utm_url'].update(http_status=404)))
scen('activation: clean landing off-domain', 'release-plan-c', 'final_url off-domain',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence']['clean_url'].update(final_url='https://evilnextgendentalaustintx.com/x')))
scen('activation: landing error-page title', 'release-plan-c', 'error-page title',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence']['clean_url'].update(title='404 Page Not Found')))
scen('activation: wrong canonical', 'release-plan-c', 'canonical is not the approved landing page',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence']['clean_url'].update(canonical='https://nextgendentalaustintx.com/')))
scen('activation: analytics loader absent', 'release-plan-c', 'analytics loader not present',
     lambda d: edit(d, MAN, lambda y: y['gates']['activation_landing_recheck']['evidence']['clean_url'].update(analytics_loader_present=False)))
scen('activation: production_status not verified', 'release-plan-c', 'production_status is not VERIFIED_200',
     lambda d: edit(d, SPEC, lambda y: y['campaign']['landing_page'].update(production_status='REQUIRES_REVERIFICATION')))
scen('activation: approved before import gate', 'release-plan-c', 'import approval occurred AFTER activation approval',
     lambda d: edit(d, MAN, lambda y: y['gates']['import_gate'].update(approved_at=T(5))))

# ---- artifact integrity ----
def tamper_csv(d):
    p = f'{d}/import/plan-a/campaign.csv'
    s = open(p).read().replace('Paused', 'Enabled')
    open(p, 'w').write(s)
scen('artifact: hand-edited CSV breaks parity', 'draft', 'differs from regenerated output', tamper_csv)
def second_enabled(d):
    p = f'{d}/import/plan-a/keywords.csv'
    rows = list(csv.reader(open(p)))
    rows[1][4] = 'Enabled'
    with open(p, 'w', newline='') as f: csv.writer(f, lineterminator='\n').writerows(rows)
scen('artifact: a second Enabled entity', 'draft', 'exactly one artifact may contain an Enabled entity', second_enabled)
scen('digests: renamed manifest key', 'draft', 'missing key plan_c_attach_sha256',
     lambda d: edit(d, MAN, lambda y: y['digests'].update({'plan_c_package_sha256': y['digests'].pop('plan_c_attach_sha256')})))
def spec_change(d):
    s = open(f'{d}/{SPEC}').read().replace('governance_monthly_threshold: 250', 'governance_monthly_threshold: 400')
    open(f'{d}/{SPEC}', 'w').write(s)
    subprocess.run([PY, 'generate.py'], cwd=d, check=True, capture_output=True)
scen('digests: spec change invalidates approvals', 'release-plan-a', 'campaign-spec digest STALE', spec_change)

# ---- (V6.1) warning acceptance ----
def warn(y, **kw):
    y['warnings'] = ['low search volume']
    y.setdefault('warning_acceptance', {}).update(kw)
scen('warning: present without acceptance', 'release-plan-a', 'warnings present but not accepted',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=False)))
scen('warning: accepted without timestamp', 'release-plan-a', 'warning acceptance without accepted_at timestamp',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=True, accepted_by='ratikk', accepted_at=None, rationale='ok')))
scen('warning: accepted BEFORE the preview', 'release-plan-a', 'warning acceptance',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=True, accepted_by='ratikk', accepted_at=T(290), rationale='ok')))
scen('warning: accepted AFTER the approval', 'release-plan-a', 'warning acceptance',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=True, accepted_by='ratikk', accepted_at=T(5), rationale='ok')))
scen('warning: unauthorized acceptor', 'release-plan-a', 'warning acceptance not by an authorized owner',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=True, accepted_by='mallory', accepted_at=T(275), rationale='ok')))
scen('warning: no rationale', 'release-plan-a', 'warning acceptance without rationale',
     lambda d: edit(d, PREV, lambda y: warn(y, accepted=True, accepted_by='ratikk', accepted_at=T(275), rationale=None)))
scen('warning: activation preview warning unaccepted', 'release-plan-c', 'warnings present but not accepted',
     lambda d: edit(d, APREV, lambda y: warn(y, accepted=False)))
scen('errors: cannot be overridden by acceptance', 'release-plan-a', 'errors can never be overridden',
     lambda d: edit(d, PREV, lambda y: (y.update(errors=['bad asset']),
                                        warn(y, accepted=True, accepted_by='ratikk', accepted_at=T(275), rationale='ok'))))

# ---- (V6.1) exact clean/UTM URL evidence ----
def set_url(d, key, url, gate='landing_page_verified'):
    edit(d, MAN, lambda y: y['gates'][gate]['evidence'][key].update(url=url))
BASE = 'https://nextgendentalaustintx.com/services/dental-implants'
UTM  = BASE + '?utm_source=google&utm_medium=cpc&utm_campaign=search_dental_implants_south_austin'
scen('url: clean URL is a different path', 'release-plan-a', 'is not the approved landing-page path',
     lambda d: set_url(d, 'clean_url', 'https://nextgendentalaustintx.com/services/invisalign'))
scen('url: clean URL carries query parameters', 'release-plan-a', 'clean URL must carry no query parameters',
     lambda d: set_url(d, 'clean_url', BASE + '?utm_source=google'))
scen('url: UTM missing a parameter', 'release-plan-a', 'missing UTM parameter utm_campaign',
     lambda d: set_url(d, 'utm_url', BASE + '?utm_source=google&utm_medium=cpc'))
scen('url: UTM wrong value', 'release-plan-a', 'approved value is',
     lambda d: set_url(d, 'utm_url', BASE + '?utm_source=bing&utm_medium=cpc&utm_campaign=search_dental_implants_south_austin'))
scen('url: UTM wrong key', 'release-plan-a', 'unapproved query parameter',
     lambda d: set_url(d, 'utm_url', BASE + '?utm_source=google&utm_med=cpc&utm_campaign=search_dental_implants_south_austin'))
scen('url: extra arbitrary parameter', 'release-plan-a', "unapproved query parameter 'gclid'",
     lambda d: set_url(d, 'utm_url', UTM + '&gclid=abc123'))
scen('url: off-domain evidence URL', 'release-plan-a', 'is not the approved domain',
     lambda d: set_url(d, 'clean_url', 'https://evil.example.com/services/dental-implants'))
scen('url: fragment present', 'release-plan-a', 'fragments are not permitted',
     lambda d: set_url(d, 'clean_url', BASE + '#book'))
scen('url: activation recheck UTM tampered', 'release-plan-c', 'unapproved query parameter',
     lambda d: set_url(d, 'utm_url', UTM + '&foo=bar', gate='activation_landing_recheck'))

# ---- (V6.1) activation execution ----
def exec_rec(y, **kw):
    base = {'status': 'EXECUTED', 'executed_by': 'ratikk', 'executed_at': T(10),
            'activation_digest': y['digests']['plan_c_activation_sha256'],
            'account_verification_evidence': {
                'verified_at': T(5), 'verified_by': 'ratikk', 'evidence_reference': 'post-exec.png',
                'campaign_status': 'Enabled', 'daily_budget': 8, 'max_cpc': 6,
                'unexpected_changes': False, 'errors': 'none', 'result': 'MATCHES_PLAN'}}
    base.update(kw); y['activation_execution'] = base
scen('execution: NOT_EXECUTED stays valid', 'draft', None, lambda d: None)   # positive control
scen('execution: before activation approval', 'release-plan-c', 'activation approval',
     lambda d: edit(d, MAN, lambda y: exec_rec(y, executed_at=T(200))))
scen('execution: unauthorized identity', 'release-plan-c', 'executed_by not an authorized owner',
     lambda d: edit(d, MAN, lambda y: exec_rec(y, executed_by='mallory')))
scen('execution: missing timestamp', 'release-plan-c', 'missing executed_at',
     lambda d: edit(d, MAN, lambda y: exec_rec(y, executed_at=None)))
scen('execution: stale activation digest', 'release-plan-c', 'activation_digest does not match',
     lambda d: edit(d, MAN, lambda y: exec_rec(y, activation_digest='0'*64)))
scen('execution: campaign not Enabled', 'release-plan-c', 'campaign is not Enabled after execution',
     lambda d: edit(d, MAN, lambda y: (exec_rec(y), y['activation_execution']['account_verification_evidence'].update(campaign_status='Paused'))))
scen('execution: budget divergence', 'release-plan-c', 'daily budget changed',
     lambda d: edit(d, MAN, lambda y: (exec_rec(y), y['activation_execution']['account_verification_evidence'].update(daily_budget=100))))
scen('execution: CPC divergence', 'release-plan-c', 'max CPC changed',
     lambda d: edit(d, MAN, lambda y: (exec_rec(y), y['activation_execution']['account_verification_evidence'].update(max_cpc=25))))
scen('execution: unexpected account changes', 'release-plan-c', 'unexpected account changes',
     lambda d: edit(d, MAN, lambda y: (exec_rec(y), y['activation_execution']['account_verification_evidence'].update(unexpected_changes=True))))
scen('execution: string evidence', 'release-plan-c', 'must be a structured object',
     lambda d: edit(d, MAN, lambda y: exec_rec(y, account_verification_evidence='done')))
def exec_ev(y, **kw):
    exec_rec(y); y['activation_execution']['account_verification_evidence'].update(kw)
scen('execution: unauthorized verifier', 'release-plan-c', 'verified_by not an authorized owner',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_by='mallory')))
scen('execution: missing verification timestamp', 'release-plan-c', 'evidence missing verified_at',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_at=None)))
scen('execution: invalid verification timestamp', 'release-plan-c', 'not a valid ISO timestamp',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_at='invalid-value')))
scen('execution: timezone-naive verification timestamp', 'release-plan-c', 'must be timezone-aware',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_at='2026-08-10T12:00:00')))
scen('execution: future verification timestamp', 'release-plan-c', 'timestamp is in the future',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_at='2027-01-01T00:00:00Z')))
scen('execution: verification BEFORE execution', 'release-plan-c', 'activation execution',
     lambda d: edit(d, MAN, lambda y: exec_ev(y, verified_at=T(60))))

# ---- (V6.1) privacy ----
scen('privacy: populated customer id in manifest', 'draft', 'customer ID must never be stored',
     lambda d: edit(d, MAN, lambda y: y.update(customer_id=1234567890)))
scen('privacy: hyphenated customer id in preview evidence', 'draft', 'customer ID must never be stored',
     lambda d: edit(d, PREV, lambda y: y.update(customer_id='123-456-7890')))

# ---- (V6.1) Plan B independent chronology + golden path ----
def pb_before_verification(d):
    make_plan_b_approved(d)
    edit(d, MAN, lambda y: y['plan_b_decision'].update(decided_at=T(260)))
scen('plan B: decision before Plan A verification (release-plan-b)', 'release-plan-b',
     'Plan B decision BEFORE Plan A account verification', pb_before_verification)
def pb_attach_after_decision(d):
    make_plan_b_approved(d)
    edit(d, MAN, lambda y: y['attachment']['NEG | Freebie Intent (low-risk)']['leads_campaign'].update(approved_at=T(100)))
scen('plan B: attachment approved after decision (release-plan-b)', 'release-plan-b',
     'attachment approval occurred AFTER the Plan B decision', pb_attach_after_decision)
def pb_declined_with_csv(d):
    make_plan_b_approved(d)
    edit(d, MAN, lambda y: y['plan_b_decision'].update(status='DECLINED'))
scen('plan B: DECLINED but CSV populated', 'release-plan-b', 'DECLINED but Plan B CSV is not empty', pb_declined_with_csv)
def pb_unapproved_row(d):
    make_plan_b_approved(d)
    p = f'{d}/import/plan-b/attach-leads.csv'
    rows = list(csv.reader(open(p))); rows[1][1] = 'NEG | Far Geography (clearly outside strategy)'
    with open(p,'w',newline='') as f: csv.writer(f, lineterminator='\n').writerows(rows)
scen('plan B: CSV row without an approved gate', 'release-plan-b', 'differs from regenerated output', pb_unapproved_row)

# ---- (V6.1) stale checksums / duplicate chronology ----
def stale_checksums(d):
    p = f'{d}/import/CHECKSUMS.txt'
    s_ = open(p).read().replace('PLAN-A-PACKAGE-DIGEST', 'PLAN-A-PACKAGE-DIGEST-OLD')
    open(p,'w').write(s_)
scen('artifacts: stale CHECKSUMS.txt', 'draft', 'no digest for plan_a_package_sha256', stale_checksums)

# ---------------- run ----------------
base = tempfile.mkdtemp(prefix='ads-golden-')
golden = build_golden(os.path.join(base, 'ads'))
out = run(golden, 'release-plan-c')
non_online = [l for l in out.splitlines() if l.startswith('  FAIL') and 'must be run with --online' not in l]
print('GOLDEN fixture (release-plan-c, offline):',
      'clean apart from the --online requirement' if not non_online else 'UNEXPECTED FAILURES')
for l in non_online: print('   ', l)
# ATTACH_APPROVED Plan B golden path must be clean apart from --online
pb_dir = tempfile.mkdtemp(prefix='ads-planb-')
pb = os.path.join(pb_dir, 'ads'); shutil.copytree(golden, pb)
make_plan_b_approved(pb)
pb_out = run(pb, 'release-plan-b')
pb_fail = [l for l in pb_out.splitlines() if l.startswith('  FAIL') and 'must be run with --online' not in l]
print('GOLDEN Plan B ATTACH_APPROVED (release-plan-b, offline):',
      'clean apart from the --online requirement' if not pb_fail else 'UNEXPECTED FAILURES')
for l in pb_fail: print('   ', l)
shutil.rmtree(pb_dir, ignore_errors=True)

# duplicate chronology: the same violation must be reported exactly once
dup_dir = tempfile.mkdtemp(prefix='ads-dup-')
dd = os.path.join(dup_dir, 'ads'); shutil.copytree(golden, dd)
edit(dd, MAN, lambda y: y['gates']['plan_a_applied'].update(applied_at=T(280)))
dup_out = run(dd, 'release-plan-c')
n_dup = sum(1 for l in dup_out.splitlines() if 'import approval' in l and 'Plan A application' in l)
print(f'duplicate-chronology check: violation reported {n_dup} time(s)',
      '(expected exactly 1)' if n_dup == 1 else '*** EXPECTED 1 ***')
shutil.rmtree(dup_dir, ignore_errors=True)

passed = failed = 0
if non_online: failed += 1
if pb_fail: failed += 1
if n_dup != 1: failed += 1
for name, mode, expect, mutate in S:
    d = tempfile.mkdtemp(prefix='ads-scen-')
    tgt = os.path.join(d, 'ads'); shutil.copytree(golden, tgt)
    try:
        mutate(tgt)
        out = run(tgt, mode)
        if expect is None:
            bad = [l for l in out.splitlines() if l.startswith('  FAIL') and 'must be run with --online' not in l]
            if not bad: passed += 1
            else:
                failed += 1; print(f'FAIL  {name}: expected clean, got:'); [print('        ', b.strip()) for b in bad]
            continue
        if expect.lower() in out.lower(): passed += 1
        else:
            failed += 1
            print(f'FAIL  {name}: expected {expect!r}')
            for l in out.splitlines():
                if l.startswith('  FAIL'): print('        got:', l.strip())
    finally:
        shutil.rmtree(d, ignore_errors=True)
shutil.rmtree(base, ignore_errors=True)
print(f'governance scenarios: {len(S)} run, {passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
