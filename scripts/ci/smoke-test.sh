#!/usr/bin/env bash
# Post-deployment smoke tests for the NextGen Dental static site.
# Usage: scripts/ci/smoke-test.sh <base-url>   e.g. https://dev.nextgendentalaustintx.com
# Exits non-zero on the first critical failure. No secrets involved.
set -uo pipefail

BASE="${1:?usage: smoke-test.sh <base-url>}"
BASE="${BASE%/}"
FAIL=0

check() { # check <path> <expected-status> [required-substring]
  local path="$1" want="$2" substr="${3:-}"
  local tmp; tmp=$(mktemp)
  local code
  code=$(curl -sS -o "$tmp" -w "%{http_code}" -L --max-time 30 "$BASE$path" 2>/dev/null) || code="000"
  if [ "$code" != "$want" ]; then
    echo "FAIL  $path -> HTTP $code (expected $want)"
    FAIL=1
  elif [ -n "$substr" ] && ! grep -qi "$substr" "$tmp"; then
    echo "FAIL  $path -> HTTP $code but missing expected content: $substr"
    FAIL=1
  else
    echo "PASS  $path -> HTTP $code${substr:+ (content ok)}"
  fi
  rm -f "$tmp"
}

echo "== Smoke tests against $BASE =="

# Core pages
check "/" "200" "NextGen Dental"
check "/blog/" "200" "blog"
check "/services/" "200" ""
check "/contact" "200" ""

# SEO surface
check "/robots.txt" "200" ""
check "/sitemap-index.xml" "200" "sitemap"

# Every individual service page (Google Ads + organic landing pages).
# Derived from the repo source, so a future service page is covered
# automatically with no edit here. Added after the 2026-08-10 incident where
# /services/dental-implants served a 404 for hours: only /services/ (the index)
# was checked, so no automation saw it — an advertiser did.
#
# SMOKE_SERVICES=off skips this block. rollback.yml sets it, because a rollback
# target may predate a service page that exists in the checked-out source, and
# an emergency restore must never be blocked by that mismatch.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$SCRIPT_DIR/../../src/pages/services"
if [ "${SMOKE_SERVICES:-on}" = "off" ]; then
  echo "SKIP  service-page sweep (SMOKE_SERVICES=off)"
elif [ -d "$SERVICES_DIR" ]; then
  SERVICE_COUNT=0
  for f in "$SERVICES_DIR"/*.astro; do
    [ -e "$f" ] || continue                 # no matches: glob stayed literal
    slug=$(basename "$f" .astro)
    [ "$slug" = "index" ] && continue       # /services/ is checked above
    check "/services/$slug" "200" ""
    SERVICE_COUNT=$((SERVICE_COUNT + 1))
  done
  echo "INFO  service-page sweep covered $SERVICE_COUNT pages"
else
  echo "WARN  $SERVICES_DIR not found — service-page sweep skipped"
fi

# A hashed asset referenced by the homepage must load
ASSET=$(curl -sS --max-time 30 "$BASE/" | grep -oE '/_astro/[^"]+\.(css|js)' | head -1 || true)
if [ -n "$ASSET" ]; then
  check "$ASSET" "200" ""
else
  echo "WARN  no /_astro/ asset reference found on homepage (inlined CSS build?)"
fi

# No accidental noindex on the homepage
HOME_HTML=$(curl -sS --max-time 30 "$BASE/" 2>/dev/null) || HOME_HTML=""
if [ -z "$HOME_HTML" ]; then
  echo "FAIL  homepage unreachable for noindex check"
  FAIL=1
elif echo "$HOME_HTML" | grep -qi '<meta[^>]*noindex'; then
  echo "FAIL  homepage contains a noindex meta tag"
  FAIL=1
else
  echo "PASS  no noindex on homepage"
fi

if [ "$FAIL" -ne 0 ]; then
  echo "== SMOKE TESTS FAILED =="
  exit 1
fi
echo "== ALL SMOKE TESTS PASSED =="
