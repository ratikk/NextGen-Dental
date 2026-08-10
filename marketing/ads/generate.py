#!/usr/bin/env python3
"""Deterministic YAML -> Ads Editor CSV generator (v3).
import/ files are BUILD ARTIFACTS - never hand-edit; CI regenerates and diffs.
Fixed RSA columns (Headline 1-15, Description 1-4). Per-plan digests.
Attachment CSVs contain ONLY pairs explicitly APPROVED in approval-manifest.yaml."""
import yaml, csv, hashlib, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
IMP = os.path.join(ROOT, 'import')
MAX_H, MAX_D = 15, 4
for d in ('plan-a', 'plan-b', 'plan-c'):
    os.makedirs(os.path.join(IMP, d), exist_ok=True)

camp = yaml.safe_load(open(f'{ROOT}/campaigns/search-implants-south-austin.yaml'))['campaign']
negdoc = yaml.safe_load(open(f'{ROOT}/campaigns/negative-lists.yaml'))
negs = negdoc['negative_lists']
man = yaml.safe_load(open(f'{ROOT}/approval-manifest.yaml'))

def final_url(c):
    return c['landing_page']['url'] + '?' + '&'.join(f'{k}={v}' for k, v in c['tracking']['utm'].items())

def write(rel, rows):
    with open(os.path.join(IMP, rel), 'w', newline='') as f:
        csv.writer(f, lineterminator='\n').writerows(rows)

# ---------- Plan A: new PAUSED campaign + UNATTACHED lists ----------
write('plan-a/campaign.csv', [
    ['Campaign','Campaign type','Campaign status','Budget','Budget type','Bid strategy type',
     'Max CPC','Networks','Languages','Location','Location option'],
    [camp['name'],'Search','Paused',camp['budget']['average_daily_amount'],'Daily','Manual CPC',
     camp['bidding']['maximum_cpc'],'Google search',';'.join(camp['languages']),
     'Austin TX;Buda TX;Kyle TX','People in your targeted locations']])

kw = [['Campaign','Ad group','Keyword','Match type','Status']]
ads = [['Campaign','Ad group','Ad type','Final URL']
       + [f'Headline {i+1}' for i in range(MAX_H)]
       + [f'Description {i+1}' for i in range(MAX_D)] + ['Status']]
for ag in camp['ad_groups']:
    for mt, label in (('exact','Exact'), ('phrase','Phrase')):
        for k in ag['keywords'].get(mt, []) or []:
            kw.append([camp['name'], ag['name'], k, label, 'Paused'])
    for rsa in ag['responsive_search_ads']:
        hs = list(rsa['headlines']) + [''] * (MAX_H - len(rsa['headlines']))
        ds = list(rsa['descriptions']) + [''] * (MAX_D - len(rsa['descriptions']))
        ads.append([camp['name'], ag['name'], 'Responsive search ad', final_url(camp)] + hs + ds + ['Paused'])
write('plan-a/keywords.csv', kw)
write('plan-a/ads.csv', ads)

neg_rows = [['Shared set','Shared set type','Keyword','Match type']]
for nl in negs:
    if nl['risk_tier'] == 'review':      # never generated
        continue
    for t in nl['terms']:
        neg_rows.append([nl['name'], 'Negative keywords', t, 'Phrase'])
write('plan-a/negative-lists.csv', neg_rows)

# ---------- Plans B/C: attachments, ONLY where explicitly approved ----------
def attach_rows(target_key, campaign_name):
    rows = [['Campaign','Shared set']]
    for nl in negs:
        if nl['risk_tier'] == 'review':
            continue
        st = (((man.get('attachment') or {}).get(nl['name']) or {}).get(target_key) or {}).get('status')
        if st == 'APPROVED':
            rows.append([campaign_name, nl['name']])
    return rows

b = attach_rows('leads_campaign', 'Leads')
c_ = attach_rows('new_campaign', camp['name'])
write('plan-b/attach-leads.csv', b)
write('plan-c/attach-new-campaign.csv', c_)

# ---------- Plan C: the ACTIVATION MUTATION, as its own artifact ----------
act = yaml.safe_load(open(f'{ROOT}/campaigns/activation-action.yaml'))['activation_action']
# Only columns Google Ads Editor recognises. Previous/rollback state, thresholds
# and preconditions are governance metadata and live in activation-action.yaml
# + the approval manifest, NOT in the import file.
write('plan-c/activation.csv', [
    ['Campaign','Campaign status','Budget','Max CPC'],
    [act['campaign'], 'Enabled' if act['requested_status'] == 'ENABLED' else act['requested_status'],
     act['budget_daily'], act['maximum_cpc']]])

# ---------- per-plan digests ----------
def digest_dir(sub):
    # plan name is part of the digest so two structurally-identical (e.g. empty)
    # packages can never share an approval digest across plans
    h = hashlib.sha256(sub.encode() + b'\x00')
    for p in sorted(os.listdir(os.path.join(IMP, sub))):
        h.update(p.encode() + b'\x00')
        h.update(open(os.path.join(IMP, sub, p), 'rb').read())
    return h.hexdigest()

spec_h = hashlib.sha256(
    open(f'{ROOT}/campaigns/search-implants-south-austin.yaml','rb').read()
    + open(f'{ROOT}/campaigns/negative-lists.yaml','rb').read()).hexdigest()
lines = [f'{spec_h}  CAMPAIGN-SPEC-DIGEST']
for sub in ('plan-a','plan-b'):
    lines.append(f'{digest_dir(sub)}  {sub.upper()}-PACKAGE-DIGEST')
# Plan C carries TWO independently-approvable actions -> two digests
for fname, label in (('attach-new-campaign.csv','PLAN-C-ATTACH-DIGEST'),
                     ('activation.csv','PLAN-C-ACTIVATION-DIGEST')):
    h = hashlib.sha256(('plan-c/' + fname).encode() + b'\x00')
    h.update(open(os.path.join(IMP, 'plan-c', fname), 'rb').read())
    lines.append(f'{h.hexdigest()}  {label}')
for sub in ('plan-a','plan-b','plan-c'):
    for p in sorted(os.listdir(os.path.join(IMP, sub))):
        fp = os.path.join(IMP, sub, p)
        lines.append(f'{hashlib.sha256(open(fp,"rb").read()).hexdigest()}  import/{sub}/{p}')
open(os.path.join(IMP, 'CHECKSUMS.txt'), 'w').write('\n'.join(lines) + '\n')
print(f'generated. plan-a: {len(kw)-1} keywords, {len(ads)-1} ads, {len(neg_rows)-1} negatives | '
      f'plan-b attachments: {len(b)-1} | plan-c attachments: {len(c_)-1} | activation artifact: 1')
