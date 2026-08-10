#!/usr/bin/env python3
"""Deterministic YAML -> Ads Editor CSV generator.
CSVs under import/ are BUILD ARTIFACTS: never hand-edit. CI regenerates and
fails on any diff (parity check). Also writes CHECKSUMS.txt (sha256 per file +
package digest) used by approval-manifest.yaml."""
import yaml, csv, hashlib, io, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
IMP = os.path.join(ROOT, 'import')
os.makedirs(os.path.join(IMP, 'plan-b'), exist_ok=True)

camp = yaml.safe_load(open(os.path.join(ROOT, 'campaigns/search-implants-south-austin.yaml')))['campaign']
negs = yaml.safe_load(open(os.path.join(ROOT, 'campaigns/negative-lists.yaml')))['negative_lists']

def final_url(c):
    u = c['tracking']['utm']
    return c['landing_page']['url'] + '?' + '&'.join(f'{k}={v}' for k, v in u.items())

def write(path, rows):
    with open(path, 'w', newline='') as f:
        csv.writer(f, lineterminator='\n').writerows(rows)

# Plan A artifacts: new paused campaign + UNATTACHED shared lists
write(os.path.join(IMP, 'editor-import-campaign.csv'), [
    ['Campaign','Campaign type','Campaign status','Budget','Budget type','Bid strategy type','Max CPC','Networks','Location','Location option'],
    [camp['name'],'Search','Paused',camp['budget']['average_daily_amount'],'Daily','Manual CPC',
     camp['bidding']['maximum_cpc'],'Google search','Austin TX;Buda TX;Kyle TX','People in your targeted locations']])

kw_rows = [['Campaign','Ad group','Keyword','Match type','Status']]
ad_rows_header, ad_rows = None, []
for ag in camp['ad_groups']:
    for kw in ag['keywords'].get('exact', []): kw_rows.append([camp['name'], ag['name'], kw, 'Exact', 'Paused'])
    for kw in ag['keywords'].get('phrase', []): kw_rows.append([camp['name'], ag['name'], kw, 'Phrase', 'Paused'])
    for rsa in ag['responsive_search_ads']:
        hs, ds = rsa['headlines'], rsa['descriptions']
        hdr = ['Campaign','Ad group','Ad type','Final URL'] + [f'Headline {i+1}' for i in range(len(hs))] + [f'Description {i+1}' for i in range(len(ds))] + ['Status']
        if ad_rows_header is None: ad_rows_header = hdr
        ad_rows.append([camp['name'], ag['name'], 'Responsive search ad', final_url(camp)] + hs + ds + ['Paused'])
write(os.path.join(IMP, 'editor-import-keywords.csv'), kw_rows)
write(os.path.join(IMP, 'editor-import-ads.csv'), [ad_rows_header] + ad_rows)

neg_rows = [['Shared set','Shared set type','Keyword','Match type']]
for nl in negs:
    if nl['risk_tier'] == 'review': continue   # review-only list is NOT generated for import
    for t in nl['terms']: neg_rows.append([nl['name'], 'Negative keywords', t, 'Phrase'])
write(os.path.join(IMP, 'editor-import-negatives.csv'), neg_rows)

# Plan B artifact (SEPARATE approval): attach lists to LIVE Leads campaign
att = [['Campaign','Shared set']]
for nl in negs:
    if nl['risk_tier'] == 'low':
        att.append(['Leads', nl['name']])
write(os.path.join(IMP, 'plan-b/attach-leads-lowrisk.csv'), att)

# Plan C artifact: attach all non-review lists to the NEW campaign (pre-activation)
attc = [['Campaign','Shared set']]
for nl in negs:
    if nl['risk_tier'] != 'review':
        attc.append([camp['name'], nl['name']])
write(os.path.join(IMP, 'plan-b/attach-new-campaign.csv'), attc)

# Checksums
files = sorted(
    os.path.join(dp, f) for dp, _, fs in os.walk(IMP) for f in fs if f.endswith('.csv'))
lines, pkg = [], hashlib.sha256()
for p in files:
    d = open(p, 'rb').read()
    h = hashlib.sha256(d).hexdigest()
    pkg.update(h.encode())
    lines.append(f'{h}  {os.path.relpath(p, ROOT)}')
spec_h = hashlib.sha256(open(os.path.join(ROOT,'campaigns/search-implants-south-austin.yaml'),'rb').read()
                        + open(os.path.join(ROOT,'campaigns/negative-lists.yaml'),'rb').read()).hexdigest()
lines.append(f'{spec_h}  campaign-specs (combined)')
lines.append(f'{pkg.hexdigest()}  IMPORT-PACKAGE-DIGEST')
open(os.path.join(IMP, 'CHECKSUMS.txt'), 'w').write('\n'.join(lines) + '\n')
print('generated:', len(files), 'CSVs · package digest:', pkg.hexdigest()[:16] + '…', '· spec digest:', spec_h[:16] + '…')
