#!/usr/bin/env bash
# Ground-truth landing-page check. Run from EC2 or a laptop (NOT from an agent
# sandbox: caching proxies there can report a stale 200 for a page that is
# actually 404 in production). Paste the output into approval-manifest.yaml
# gates.landing_page_verified.evidence before approving the import gate.
set -u
URLS=(
  "https://nextgendentalaustintx.com/services/dental-implants"
  "https://nextgendentalaustintx.com/services/dental-implants?utm_source=google&utm_medium=cpc&utm_campaign=search_dental_implants_south_austin"
)
for u in "${URLS[@]}"; do
  echo "== $u"
  code=$(curl -s -o /tmp/lp.html -w '%{http_code}' -L --max-time 20 "$u")
  final=$(curl -s -o /dev/null -w '%{url_effective}' -L --max-time 20 "$u")
  echo "   HTTP: $code   final: $final"
  echo "   title: $(grep -o '<title[^>]*>[^<]*' /tmp/lp.html | head -1 | sed 's/<[^>]*>//')"
  echo "   canonical: $(grep -o 'rel="canonical" href="[^"]*"' /tmp/lp.html | head -1)"
  echo "   analytics loader present: $(grep -c 'analytics.nextgendentalaustintx.com' /tmp/lp.html)"
  [ "$code" = "200" ] || echo "   *** NOT 200 - DO NOT ADVERTISE THIS URL ***"
done
echo "checked at: $(date -u +%FT%TZ) from $(hostname)"
