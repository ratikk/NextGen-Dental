#!/usr/bin/env python3
"""
test_apply.py — tests for the plan/apply engine.

The property that matters most here is PARITY: the operations apply.py would
send to the Google Ads API must describe the same campaign as the CSVs that
generate.py produces for Ads Editor. Two routes to production that disagree is
exactly the failure mode governance is supposed to prevent, so it is asserted
rather than assumed.

Run: python3 test_apply.py     (expects: all passed)
"""

import copy
import csv
import os
import subprocess
import sys

import apply as A

HERE = os.path.dirname(os.path.abspath(__file__))
FAILED = []


def check(name, cond, detail=''):
    if cond:
        print('  ok   %s' % name)
    else:
        print('  FAIL %s %s' % (name, detail))
        FAILED.append(name)


def ops_of(kind, ops):
    return [o for o in ops if o['op'] == kind]


def main():
    spec, negs = A.load(A.SPEC), A.load(A.NEGS)
    ops = A.build_operations(spec, negs)

    print('structure')
    check('budget is the first operation', ops[0]['op'] == 'campaign_budget.create')
    check('campaign is the second operation', ops[1]['op'] == 'campaign.create')
    check('exactly one campaign', len(ops_of('campaign.create', ops)) == 1)

    print('everything is created paused')
    camp = ops_of('campaign.create', ops)[0]['resource']
    check('campaign PAUSED', camp['status'] == 'PAUSED')
    check('all ad groups PAUSED',
          all(o['resource']['status'] == 'PAUSED' for o in ops_of('ad_group.create', ops)))
    check('all keywords PAUSED',
          all(o['resource']['status'] == 'PAUSED'
              for o in ops_of('ad_group_criterion.create', ops)))
    check('all ads PAUSED',
          all(o['resource']['status'] == 'PAUSED' for o in ops_of('ad_group_ad.create', ops)))

    print('networks and geo match the spec')
    ns = camp['network_settings']
    check('display network off', ns['target_content_network'] is False)
    check('search partners off', ns['target_search_network'] is False)
    check('partner search off', ns['target_partner_search_network'] is False)
    check('google search on', ns['target_google_search'] is True)
    check('presence-only geo',
          camp['geo_target_type_setting']['positive_geo_target_type'] == 'PRESENCE')

    print('parity with the Ads Editor CSVs')
    with open(os.path.join(HERE, 'import/plan-a/keywords.csv')) as fh:
        csv_kw = list(csv.DictReader(fh))
    plan_kw = [o['resource']['keyword']['text'] for o in ops_of('ad_group_criterion.create', ops)]
    csv_kw_text = [r.get('Keyword') or r.get('keyword') for r in csv_kw]
    check('keyword count matches keywords.csv',
          len(plan_kw) == len(csv_kw_text), '(%d vs %d)' % (len(plan_kw), len(csv_kw_text)))
    check('keyword texts match keywords.csv', sorted(plan_kw) == sorted(csv_kw_text))

    with open(os.path.join(HERE, 'import/plan-a/negative-lists.csv')) as fh:
        csv_ng = list(csv.DictReader(fh))
    plan_ng = [o['resource']['keyword']['text'] for o in ops_of('shared_criterion.create', ops)]
    csv_ng_text = [r.get('Keyword') or r.get('keyword') for r in csv_ng]
    check('negative count matches negative-lists.csv',
          len(plan_ng) == len(csv_ng_text), '(%d vs %d)' % (len(plan_ng), len(csv_ng_text)))
    check('negative texts match negative-lists.csv', sorted(plan_ng) == sorted(csv_ng_text))

    print('review-tier lists are never built')
    built = {o['resource']['name'] for o in ops_of('shared_set.create', ops)}
    review = {nl['name'] for nl in negs['negative_lists'] if nl['risk_tier'] == 'review'}
    check('no review-tier list in the plan', not (built & review),
          'leaked: %s' % (built & review))
    check('every non-review list is built',
          built == {nl['name'] for nl in negs['negative_lists']
                    if nl['risk_tier'] != 'review'})

    print('no attachment operations exist in plan A')
    check('nothing attaches a list to a campaign',
          not any('campaign_shared_set' in o['op'] for o in ops))

    print('determinism')
    check('digest is stable across builds',
          A.digest_of(A.build_operations(spec, negs)) == A.digest_of(ops))
    mutated = copy.deepcopy(spec)
    mutated['campaign']['budget']['average_daily_amount'] = 9
    check('digest changes when the spec changes',
          A.digest_of(A.build_operations(mutated, negs)) != A.digest_of(ops))

    print('mock transport')
    t = A.MockTransport()
    res = t.execute(ops)
    check('mock executes every operation', len(res) == len(ops))
    check('mock assigned a resource name to each', all(r['resource_name'] for r in res))

    print('ordering is enforced, not assumed')
    scrambled = [ops[2], ops[0], ops[1]] + ops[3:]      # criterion before its campaign
    try:
        A.MockTransport().execute(scrambled)
        check('out-of-order plan is rejected', False, '(it was accepted)')
    except ValueError:
        check('out-of-order plan is rejected', True)

    print('refusals')
    unpaused = copy.deepcopy(spec)
    unpaused['campaign']['status_after_apply'] = 'ENABLED'
    try:
        A.build_operations(unpaused, negs)
        check('refuses to build a non-paused campaign', False, '(it built one)')
    except ValueError:
        check('refuses to build a non-paused campaign', True)

    proc = subprocess.run(
        [sys.executable, os.path.join(HERE, 'apply.py'), 'apply',
         '--transport', 'google', '--customer-id', '123-456-7890'],
        capture_output=True, text=True)
    check('google transport refuses while gates are closed', proc.returncode == 2,
          '(exit %d)' % proc.returncode)
    check('refusal says nothing was sent', 'Nothing was sent to Google' in proc.stdout)

    proc = subprocess.run(
        [sys.executable, os.path.join(HERE, 'apply.py'), 'apply',
         '--transport', 'google', '--customer-id', 'not-an-id'],
        capture_output=True, text=True)
    check('malformed customer id never reaches Google', proc.returncode != 0)

    print('')
    if FAILED:
        print('%d FAILED: %s' % (len(FAILED), ', '.join(FAILED)))
    else:
        print('all passed')
    return 1 if FAILED else 0


if __name__ == '__main__':
    sys.exit(main())
