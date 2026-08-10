#!/usr/bin/env python3
"""
apply.py — plan/apply engine for the campaign spec (Phase 3 groundwork).

WHAT THIS IS
    Terraform for Google Ads. It turns campaigns/*.yaml into the exact ordered
    list of Google Ads API mutate operations that would create the campaign,
    hashes that list, prints a reviewable diff with the financial exposure, and
    can execute it against a transport.

WHY A MOCK TRANSPORT EXISTS
    The whole pipeline — spec parsing, operation building, ordering, temp-resource
    linking, digest, gating — is exercisable end to end today with no developer
    token, no OAuth client, no credential and no Google account. `--transport mock`
    runs the real code path against an in-memory fake that assigns resource names
    and validates required fields. That is what "build it now with dummy data"
    should mean: fake TRANSPORT, real LOGIC.

WHAT IS DELIBERATELY NOT FAKEABLE
    Approvals. The mock transport will happily execute a plan; it can never mark
    a gate approved, and `--transport google` refuses to run unless validate.py
    passes in the matching release mode against the REAL approval manifest. There
    is no --force, no --skip-gates, and no environment variable that bypasses it.
    A governance system that can be put in "test mode" is decoration.

USAGE
    python3 apply.py plan                          # build + print the plan
    python3 apply.py plan --json plan.json         # machine-readable
    python3 apply.py apply --transport mock        # full dry run, no credentials
    python3 apply.py apply --transport google --customer-id 000-000-0000
                                                   # refuses without gates + creds
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip install -r requirements.txt")

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = os.path.join(HERE, 'campaigns', 'search-implants-south-austin.yaml')
NEGS = os.path.join(HERE, 'campaigns', 'negative-lists.yaml')
MANIFEST = os.path.join(HERE, 'approval-manifest.yaml')

MICROS = 1_000_000
CUSTOMER_ID_RE = re.compile(r'^\d{3}-\d{3}-\d{4}$')

MATCH_TYPES = {'exact': 'EXACT', 'phrase': 'PHRASE', 'broad': 'BROAD'}


# ---------------------------------------------------------------------------
# Plan construction
# ---------------------------------------------------------------------------

def load(path):
    with open(path) as fh:
        return yaml.safe_load(fh)


def build_operations(spec, negs):
    """
    Build the ordered mutate operations. Temporary resource names use the
    Google Ads convention of negative ids, so later operations can reference
    earlier ones inside a single atomic mutate.

    Order matters and is asserted by the tests: budget -> campaign -> criteria
    -> ad groups -> keywords -> ads -> negative lists -> list members.
    """
    c = spec['campaign']
    ops = []
    tmp = [0]

    def next_tmp():
        tmp[0] -= 1
        return tmp[0]

    if c['status_after_apply'] != 'PAUSED':
        raise ValueError(
            'refusing to build: status_after_apply is %r, expected PAUSED. '
            'This engine creates paused campaigns only; activation is Plan C '
            'and goes through its own approval.' % c['status_after_apply'])

    budget_id = next_tmp()
    ops.append({
        'op': 'campaign_budget.create',
        'temp_id': budget_id,
        'resource': {
            'name': '%s — daily' % c['name'],
            'amount_micros': int(round(c['budget']['average_daily_amount'] * MICROS)),
            'delivery_method': 'STANDARD',
            'explicitly_shared': False,
        },
    })

    net = c['networks']
    campaign_id = next_tmp()
    ops.append({
        'op': 'campaign.create',
        'temp_id': campaign_id,
        'resource': {
            'name': c['name'],
            'status': 'PAUSED',
            'advertising_channel_type': 'SEARCH',
            'campaign_budget': {'temp_id': budget_id},
            'manual_cpc': {'enhanced_cpc_enabled': False},
            'network_settings': {
                'target_google_search': bool(net['search']),
                'target_search_network': bool(net['search_partners']),
                'target_content_network': bool(net['display']),
                'target_partner_search_network': False,
            },
            'geo_target_type_setting': {
                'positive_geo_target_type':
                    'PRESENCE' if c['geography']['target_setting'] == 'PRESENCE_ONLY'
                    else 'PRESENCE_OR_INTEREST',
                'negative_geo_target_type': 'PRESENCE',
            },
        },
    })

    for loc in c['geography']['include']:
        ops.append({
            'op': 'campaign_criterion.create',
            'resource': {
                'campaign': {'temp_id': campaign_id},
                'location_spec': loc,          # resolved to a geo id at apply time
                'negative': False,
            },
        })
    for loc in c['geography'].get('exclude') or []:
        ops.append({
            'op': 'campaign_criterion.create',
            'resource': {
                'campaign': {'temp_id': campaign_id},
                'location_spec': loc,
                'negative': True,
            },
        })
    for lang in c['languages']:
        ops.append({
            'op': 'campaign_criterion.create',
            'resource': {
                'campaign': {'temp_id': campaign_id},
                'language_spec': lang,
                'negative': False,
            },
        })

    cpc_micros = int(round(c['bidding']['maximum_cpc'] * MICROS))
    for ag in c['ad_groups']:
        ag_id = next_tmp()
        ops.append({
            'op': 'ad_group.create',
            'temp_id': ag_id,
            'resource': {
                'name': ag['name'],
                'campaign': {'temp_id': campaign_id},
                'status': 'PAUSED',
                'type': 'SEARCH_STANDARD',
                'cpc_bid_micros': cpc_micros,
            },
        })
        for kind, match in MATCH_TYPES.items():
            for text in ag['keywords'].get(kind, []) or []:
                ops.append({
                    'op': 'ad_group_criterion.create',
                    'resource': {
                        'ad_group': {'temp_id': ag_id},
                        'status': 'PAUSED',
                        'keyword': {'text': text, 'match_type': match},
                    },
                })
        for ad in ag.get('responsive_search_ads', []) or []:
            ops.append({
                'op': 'ad_group_ad.create',
                'resource': {
                    'ad_group': {'temp_id': ag_id},
                    'status': 'PAUSED',
                    'ad': {
                        'final_urls': [c['landing_page']['url']],
                        'responsive_search_ad': {
                            'headlines': [{'text': h} for h in ad['headlines']],
                            'descriptions': [{'text': d} for d in ad['descriptions']],
                        },
                    },
                },
            })

    # Negative lists are CREATED UNATTACHED. Attaching them to a campaign is
    # Plan B / Plan C and is intentionally absent from this operation set.
    #
    # risk_tier 'review' lists are NEVER generated for import — same rule as
    # generate.py:51. The Near-Metro list is analysis material, not an artifact.
    for nl in negs['negative_lists']:
        if nl['risk_tier'] == 'review':
            continue
        set_id = next_tmp()
        ops.append({
            'op': 'shared_set.create',
            'temp_id': set_id,
            'resource': {'name': nl['name'], 'type': 'NEGATIVE_KEYWORDS'},
        })
        match = MATCH_TYPES.get(nl.get('match_type', 'phrase'), 'PHRASE')
        terms = nl.get('terms') or []
        if len(terms) != nl['phrase_count']:
            raise ValueError('%s: %d terms but phrase_count says %d'
                             % (nl['name'], len(terms), nl['phrase_count']))
        for text in terms:
            ops.append({
                'op': 'shared_criterion.create',
                'resource': {
                    'shared_set': {'temp_id': set_id},
                    'keyword': {'text': text, 'match_type': match},
                },
            })

    return ops


def digest_of(ops):
    return hashlib.sha256(
        json.dumps(ops, sort_keys=True, separators=(',', ':')).encode()
    ).hexdigest()


def exposure(spec):
    b = spec['campaign']['budget']
    daily = b['average_daily_amount']
    return {
        'currency': b['currency'],
        'daily_budget': daily,
        # Google may spend up to 2x the daily budget on any one day but caps the
        # month at ~30.4x. The month figure is the number that matters.
        'max_single_day': round(daily * 2, 2),
        'max_monthly': round(daily * 30.4, 2),
        'governance_monthly_threshold': b.get('governance_monthly_threshold'),
        'spend_while_paused': 0,
    }


def summarize(ops):
    counts = {}
    for o in ops:
        counts[o['op']] = counts.get(o['op'], 0) + 1
    return counts


# ---------------------------------------------------------------------------
# Transports
# ---------------------------------------------------------------------------

class MockTransport:
    """
    In-memory fake. Validates the shape of every operation and links temp ids
    exactly as the real API would, so the plan is proven executable without a
    credential. It creates nothing anywhere.
    """
    name = 'mock'

    def __init__(self, customer_id='000-000-0000'):
        self.customer_id = customer_id
        self.created = []
        self._seq = 1000

    def _rn(self, kind):
        self._seq += 1
        return 'customers/%s/%s/%d' % (self.customer_id.replace('-', ''), kind, self._seq)

    KINDS = {
        'campaign_budget.create': 'campaignBudgets',
        'campaign.create': 'campaigns',
        'campaign_criterion.create': 'campaignCriteria',
        'ad_group.create': 'adGroups',
        'ad_group_criterion.create': 'adGroupCriteria',
        'ad_group_ad.create': 'adGroupAds',
        'shared_set.create': 'sharedSets',
        'shared_criterion.create': 'sharedCriteria',
    }

    def execute(self, ops):
        resolved = {}
        results = []
        for i, o in enumerate(ops):
            kind = self.KINDS.get(o['op'])
            if kind is None:
                raise ValueError('operation %d: unknown op %r' % (i, o['op']))
            for ref in _temp_refs(o['resource']):
                if ref not in resolved:
                    raise ValueError(
                        'operation %d (%s) references temp id %d before it is '
                        'created — operation ordering is wrong' % (i, o['op'], ref))
            rn = self._rn(kind)
            if 'temp_id' in o:
                resolved[o['temp_id']] = rn
            self.created.append((o['op'], rn))
            results.append({'op': o['op'], 'resource_name': rn})
        return results


class GoogleTransport:
    """
    Real Google Ads API transport. Intentionally fail-closed and, at this stage,
    intentionally unimplemented: shipping a half-built mutate path that looks
    ready is worse than one that says so.

    When it is implemented, credentials come from AWS SSM Parameter Store via the
    existing GitHub OIDC role — never from a GitHub variable, never from a file in
    this repo. Required parameters (SecureString), none of which exist yet:
        /nextgendental/ads/developer_token
        /nextgendental/ads/client_id
        /nextgendental/ads/client_secret
        /nextgendental/ads/refresh_token
    A missing parameter is an error, never a silent skip.
    """
    name = 'google'

    def __init__(self, customer_id, test_account=False):
        if not CUSTOMER_ID_RE.match(customer_id or ''):
            raise ValueError('customer id must look like 000-000-0000')
        self.customer_id = customer_id
        self.test_account = test_account

    def execute(self, ops):
        missing = [k for k in ('GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID',
                               'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN')
                   if not os.environ.get(k)]
        raise NotImplementedError(
            'the Google transport is not implemented yet.\n'
            '  missing credentials: %s\n'
            '  next step: apply for a developer token. Until Basic access is\n'
            '  granted the token works against TEST ACCOUNTS ONLY, which is the\n'
            '  correct place to exercise this path first (--test-account).'
            % (', '.join(missing) or 'none in env, but no client is wired up'))


def _temp_refs(node):
    """Yield every temp_id a resource references (not the one it defines)."""
    out = []
    if isinstance(node, dict):
        if set(node.keys()) == {'temp_id'}:
            out.append(node['temp_id'])
        else:
            for v in node.values():
                out.extend(_temp_refs(v))
    elif isinstance(node, list):
        for v in node:
            out.extend(_temp_refs(v))
    return out


# ---------------------------------------------------------------------------
# Gating
# ---------------------------------------------------------------------------

def gates_pass(mode):
    """Delegate to validate.py — the single source of truth for approvals."""
    cmd = [sys.executable, os.path.join(HERE, 'validate.py'), '--release-%s' % mode, '--online']
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode == 0, (proc.stdout + proc.stderr).strip()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def render(ops, spec):
    exp = exposure(spec)
    lines = []
    lines.append('Plan: %d operations' % len(ops))
    lines.append('Digest: %s' % digest_of(ops))
    lines.append('')
    for op, n in sorted(summarize(ops).items()):
        lines.append('  %-32s %d' % (op, n))
    lines.append('')
    lines.append('Financial exposure')
    lines.append('  daily budget            %s%.2f' % ('$', exp['daily_budget']))
    lines.append('  max on any single day   %s%.2f  (Google may spend 2x daily)' % ('$', exp['max_single_day']))
    lines.append('  max in a month          %s%.2f' % ('$', exp['max_monthly']))
    lines.append('  while PAUSED            %s0.00  <-- the campaign is created paused' % '$')
    thr = exp['governance_monthly_threshold']
    if thr is not None and exp['max_monthly'] > thr:
        lines.append('  WARNING: max monthly %.2f exceeds the governance threshold %s'
                     % (exp['max_monthly'], thr))
    return '\n'.join(lines)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)

    pl = sub.add_parser('plan', help='build and print the plan')
    pl.add_argument('--json', help='also write the plan as JSON to this path')

    ap = sub.add_parser('apply', help='execute the plan against a transport')
    ap.add_argument('--transport', choices=['mock', 'google'], required=True)
    ap.add_argument('--customer-id', help='000-000-0000 (google transport only)')
    ap.add_argument('--test-account', action='store_true',
                    help='target a Google Ads TEST account (no money, no real ads)')
    ap.add_argument('--mode', default='plan-a', choices=['plan-a', 'plan-b', 'plan-c'])

    a = p.parse_args(argv)
    spec, negs = load(SPEC), load(NEGS)
    ops = build_operations(spec, negs)

    if a.cmd == 'plan':
        print(render(ops, spec))
        if a.json:
            with open(a.json, 'w') as fh:
                json.dump({'digest': digest_of(ops), 'operations': ops,
                           'exposure': exposure(spec)}, fh, indent=2, sort_keys=True)
            print('\nwrote %s' % a.json)
        return 0

    if a.transport == 'mock':
        t = MockTransport(a.customer_id or '000-000-0000')
        results = t.execute(ops)
        print(render(ops, spec))
        print('\nMOCK APPLY: %d operations executed against an in-memory fake.' % len(results))
        print('Nothing was created in any Google Ads account. No credential was used.')
        return 0

    # google transport: gates first, always.
    ok, out = gates_pass(a.mode)
    if not ok:
        print('REFUSED: approval gates for %s are not satisfied.\n' % a.mode)
        print(out)
        print('\nNothing was sent to Google. Record genuine approvals in '
              'approval-manifest.yaml; there is no bypass flag.')
        return 2
    t = GoogleTransport(a.customer_id, test_account=a.test_account)
    t.execute(ops)          # raises NotImplementedError until the client is wired
    return 0


if __name__ == '__main__':
    sys.exit(main())
