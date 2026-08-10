/**
 * NextGen Dental — weekly Google Ads waste report.
 * Phase 2 of the ads-as-code charter: READ-ONLY reporting/alerting.
 *
 * WHERE THIS RUNS
 *   Inside your Google Ads account (Tools → Bulk actions → Scripts → + New script).
 *   It runs on Google's servers under your own login. No developer token, no OAuth
 *   client, no refresh token, no credential stored in GitHub or AWS. Nothing leaves
 *   Google except the summary email it sends you.
 *
 * WHAT IT WILL NEVER DO
 *   This script contains no mutating call of any kind — no create, no enable, no
 *   pause, no bid or budget change, no negative-keyword add. It only reads reports
 *   and sends an email. You can verify that yourself: search this file for
 *   "AdsApp." and confirm every hit is .search() or .report(). The charter puts
 *   activation, budgets, bids and billing permanently in human hands; a reporting
 *   script must not be the exception.
 *
 * PRIVACY
 *   Search terms are aggregated by Google before they are ever exposed here (rare
 *   queries are withheld), and this script emails only bucket TOTALS plus the top
 *   offending terms — never anything tied to a person. It reads no conversion,
 *   customer-list or audience data. Do not extend it to Customer Match, Enhanced
 *   Conversions, or anything joining ad data to patient records without the
 *   separate privacy and legal review the charter requires.
 *
 * SETUP
 *   1. Paste this file into a new script, set EMAIL_TO below.
 *   2. Click Preview. Read the log. Confirm the numbers look like your account.
 *   3. Only then Authorize + Run, and schedule it weekly (Monday morning is good).
 */

// ---------------------------------------------------------------------------
// CONFIG — the only part you edit.
// ---------------------------------------------------------------------------
var EMAIL_TO = 'ratik.nanda@gmail.com';   // comma-separate for more than one
var LOOKBACK_DAYS = 7;                    // reporting window
var TOP_N_TERMS = 8;                      // worst offenders listed per bucket
var CURRENCY = '$';

/**
 * Waste buckets. Order matters: the first matching bucket wins, so BRAND sits
 * above FREEBIE (someone searching "nextgen dental free consultation" is a brand
 * search, not a bargain hunter).
 *
 * These mirror the categories in the 2026-08-10 audit so week-over-week numbers
 * stay comparable. Edit the patterns, not the bucket names — renaming a bucket
 * breaks the comparison against the baseline.
 */
var BUCKETS = [
  { name: 'BRAND (own name)',      re: /next\s*gen\s*dental|nextgendental/i },
  { name: 'FREE / LOW COST',       re: /\bfree\b|cheap|cheapest|low[\s-]?cost|discount|affordable\s+dentures|no\s+cost|charity|dental\s+school|government/i },
  { name: 'JOBS / EDUCATION',      re: /salary|job|hiring|career|assistant\s+(school|program|course)|hygienist\s+(school|program)|how\s+to\s+become/i },
  { name: 'DIY / SELF-TREATMENT',  re: /\bdiy\b|home\s+remedy|at[\s-]?home|myself|without\s+(a\s+)?dentist/i },
  { name: 'INFORMATIONAL ONLY',    re: /^(what|why|how|when|does|can|is)\b|meaning|definition|wikipedia|reddit/i },
  // COMPETITORS: add the practice names from your search-terms report here.
  // Left deliberately narrow — a bad pattern here silently mislabels good traffic.
  { name: 'COMPETITOR BRANDS',     re: /onion\s*creek\s*dental|south\s*austin\s*dental|magnolia\s*dental|dr\.?\s*quick|aspen\s*dental|western\s*dental/i },
];

// ---------------------------------------------------------------------------

function main() {
  var range = dateRange(LOOKBACK_DAYS);
  Logger.log('NextGen Dental waste report — ' + range.start + ' to ' + range.end);

  var campaigns = fetchCampaigns(range);
  var terms     = fetchSearchTerms(range);
  var buckets   = bucketTerms(terms);
  var pmax      = fetchPmaxCategories(range);

  var html = render(range, campaigns, terms, buckets, pmax);

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: 'NextGen Dental — Google Ads waste report, week ending ' + range.end,
    htmlBody: html,
  });
  Logger.log('Report emailed to ' + EMAIL_TO);
}

/** Campaign-level spend, clicks and status. */
function fetchCampaigns(range) {
  var rows = [];
  var q =
    'SELECT campaign.name, campaign.status, campaign.advertising_channel_type, ' +
    'metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.ctr ' +
    'FROM campaign ' +
    'WHERE segments.date BETWEEN "' + range.startApi + '" AND "' + range.endApi + '" ' +
    'AND campaign.status != "REMOVED"';
  var it = AdsApp.search(q);
  while (it.hasNext()) {
    var r = it.next();
    rows.push({
      name:    r.campaign.name,
      status:  r.campaign.status,
      channel: r.campaign.advertisingChannelType,
      cost:    micros(r.metrics.costMicros),
      clicks:  Number(r.metrics.clicks || 0),
      impr:    Number(r.metrics.impressions || 0),
      ctr:     Number(r.metrics.ctr || 0) * 100,
    });
  }
  rows.sort(function (a, b) { return b.cost - a.cost; });
  return rows;
}

/**
 * Raw search terms. NOTE: search_term_view covers Search and Shopping only.
 * Performance Max does NOT report raw search terms here — see fetchPmaxCategories.
 */
function fetchSearchTerms(range) {
  var rows = [];
  var q =
    'SELECT search_term_view.search_term, campaign.name, ' +
    'metrics.cost_micros, metrics.clicks, metrics.impressions ' +
    'FROM search_term_view ' +
    'WHERE segments.date BETWEEN "' + range.startApi + '" AND "' + range.endApi + '"';
  try {
    var it = AdsApp.search(q);
    while (it.hasNext()) {
      var r = it.next();
      rows.push({
        term:     r.searchTermView.searchTerm,
        campaign: r.campaign.name,
        cost:     micros(r.metrics.costMicros),
        clicks:   Number(r.metrics.clicks || 0),
        impr:     Number(r.metrics.impressions || 0),
      });
    }
  } catch (e) {
    Logger.log('search_term_view unavailable: ' + e);
  }
  return rows;
}

/**
 * Performance Max exposes search CATEGORIES, not raw terms. This is a real
 * limitation, not a bug in this script: with PMax you cannot see the exact
 * queries, which is precisely why PMax waste is hard to police and why the
 * campaign-level negative keywords and brand exclusions matter so much.
 */
function fetchPmaxCategories(range) {
  var rows = [];
  var q =
    'SELECT campaign_search_term_insight.category_label, campaign.name, ' +
    'metrics.clicks, metrics.impressions ' +
    'FROM campaign_search_term_insight ' +
    'WHERE segments.date BETWEEN "' + range.startApi + '" AND "' + range.endApi + '" ' +
    'ORDER BY metrics.clicks DESC';
  try {
    var it = AdsApp.search(q);
    var n = 0;
    while (it.hasNext() && n < 25) {
      var r = it.next();
      rows.push({
        label:  r.campaignSearchTermInsight.categoryLabel,
        clicks: Number(r.metrics.clicks || 0),
        impr:   Number(r.metrics.impressions || 0),
      });
      n++;
    }
  } catch (e) {
    Logger.log('campaign_search_term_insight unavailable: ' + e);
  }
  return rows;
}

/** Assign each term to the first matching bucket; total the damage. */
function bucketTerms(terms) {
  var out = {};
  BUCKETS.forEach(function (b) { out[b.name] = { cost: 0, clicks: 0, terms: [] }; });
  out['(not classified)'] = { cost: 0, clicks: 0, terms: [] };

  terms.forEach(function (t) {
    var hit = null;
    for (var i = 0; i < BUCKETS.length; i++) {
      if (BUCKETS[i].re.test(t.term)) { hit = BUCKETS[i].name; break; }
    }
    var key = hit || '(not classified)';
    out[key].cost += t.cost;
    out[key].clicks += t.clicks;
    if (hit) out[key].terms.push(t);
  });

  Object.keys(out).forEach(function (k) {
    out[k].terms.sort(function (a, b) { return b.cost - a.cost; });
    out[k].terms = out[k].terms.slice(0, TOP_N_TERMS);
  });
  return out;
}

function render(range, campaigns, terms, buckets, pmax) {
  var totalCost = campaigns.reduce(function (s, c) { return s + c.cost; }, 0);
  var wasted = 0;
  Object.keys(buckets).forEach(function (k) {
    if (k !== '(not classified)') wasted += buckets[k].cost;
  });
  var pct = totalCost > 0 ? (wasted / totalCost * 100) : 0;

  var h = [];
  h.push('<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c2430;max-width:720px">');
  h.push('<h2 style="margin:0 0 4px">Google Ads waste report</h2>');
  h.push('<div style="color:#5d6b7a;font-size:13px">' + range.start + ' → ' + range.end +
         ' · read-only · no account changes were made</div>');

  h.push('<p style="font-size:15px;margin:18px 0"><b>' + money(wasted) + '</b> of <b>' +
         money(totalCost) + '</b> (' + pct.toFixed(1) + '%) went to searches that look ' +
         'unlikely to become patients.</p>');

  h.push('<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#5d6b7a">By campaign</h3>');
  h.push(table(['Campaign', 'Status', 'Cost', 'Clicks', 'CTR'],
    campaigns.map(function (c) {
      return [c.name, c.status, money(c.cost), String(c.clicks), c.ctr.toFixed(2) + '%'];
    })));

  h.push('<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#5d6b7a">Waste buckets</h3>');
  var brows = [];
  Object.keys(buckets).forEach(function (k) {
    var b = buckets[k];
    if (b.cost === 0 && b.clicks === 0) return;
    brows.push([k, money(b.cost), String(b.clicks)]);
  });
  h.push(table(['Bucket', 'Cost', 'Clicks'], brows));

  Object.keys(buckets).forEach(function (k) {
    var b = buckets[k];
    if (!b.terms.length) return;
    h.push('<h4 style="margin:16px 0 4px;font-size:13px">Worst in “' + k + '”</h4>');
    h.push(table(['Search term', 'Campaign', 'Cost'],
      b.terms.map(function (t) { return [t.term, t.campaign, money(t.cost)]; })));
  });

  if (pmax.length) {
    h.push('<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#5d6b7a">Performance Max search categories</h3>');
    h.push('<div style="font-size:13px;color:#5d6b7a;margin-bottom:6px">PMax does not report raw search terms — ' +
           'only these category labels. Clicks only; Google does not break cost out per category.</div>');
    h.push(table(['Category', 'Clicks', 'Impressions'],
      pmax.map(function (p) { return [p.label, String(p.clicks), String(p.impr)]; })));
  }

  h.push('<p style="font-size:12px;color:#5d6b7a;margin-top:24px;border-top:1px solid #dfe5ec;padding-top:12px">' +
         'Generated by weekly-waste-report.js (marketing/ads/scripts). This script only reads reports and ' +
         'sends mail; it cannot change budgets, bids, keywords or campaign status. Bucket definitions live ' +
         'in the script — keep the names stable so weeks stay comparable.</p>');
  h.push('</div>');
  return h.join('\n');
}

// --- small helpers ---------------------------------------------------------

function table(headers, rows) {
  if (!rows.length) return '<div style="font-size:13px;color:#5d6b7a">(nothing in this window)</div>';
  var s = '<table style="border-collapse:collapse;width:100%;font-size:13px;margin:6px 0 14px"><tr>';
  headers.forEach(function (x) {
    s += '<th style="border:1px solid #dfe5ec;padding:6px 8px;background:#f2f5f8;text-align:left">' + esc(x) + '</th>';
  });
  s += '</tr>';
  rows.forEach(function (r) {
    s += '<tr>';
    r.forEach(function (c) {
      s += '<td style="border:1px solid #dfe5ec;padding:6px 8px">' + esc(c) + '</td>';
    });
    s += '</tr>';
  });
  return s + '</table>';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function micros(v) { return Number(v || 0) / 1000000; }

function money(v) { return CURRENCY + v.toFixed(2); }

function dateRange(days) {
  var tz = AdsApp.currentAccount().getTimeZone();
  var end = new Date();
  end.setDate(end.getDate() - 1);              // yesterday: today is incomplete
  var start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    start:    Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    end:      Utilities.formatDate(end,   tz, 'yyyy-MM-dd'),
    startApi: Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    endApi:   Utilities.formatDate(end,   tz, 'yyyy-MM-dd'),
  };
}
