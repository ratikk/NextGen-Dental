#!/usr/bin/env bash
#
# inspect-urls.sh — Audit every URL in the sitemap for indexability signals.
#
# Checks, per URL:
#   - HTTP status code
#   - Content-Type (catches soft-404: page returns 200 but with unexpected type)
#   - Response size
#   - CloudFront cache status (x-cache header)
#   - <link rel="canonical"> in HTML
#   - <meta name="robots"> for noindex directives
#
# Does NOT check whether Google has indexed each URL. For that, use Google
# Search Console's URL Inspection API (OAuth required).
#
# Usage:
#   ./inspect-urls.sh                 # default: reads $DOMAIN/sitemap-index.xml
#   ./inspect-urls.sh <sitemap-url>   # override
#
# Exit codes:
#   0 — all URLs passed
#   1 — at least one URL flagged

set -u

DOMAIN="${DOMAIN:-https://nextgendentalaustintx.com}"
SITEMAP_URL="${1:-$DOMAIN/sitemap-index.xml}"

if [[ -t 1 ]]; then
  RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; BLU=$'\033[0;34m'; DIM=$'\033[2m'; RST=$'\033[0m'
else
  RED=""; GRN=""; YLW=""; BLU=""; DIM=""; RST=""
fi

# --- Dependencies ----------------------------------------------------------
for cmd in curl xmllint awk sed mktemp; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 2
  fi
done

# --- Fetch sitemap(s) ------------------------------------------------------
echo "${BLU}Fetching sitemap:${RST} $SITEMAP_URL"
sitemap_xml="$(curl -sSL --max-time 15 "$SITEMAP_URL")" || {
  echo "${RED}Failed to fetch sitemap${RST}" >&2
  exit 2
}

urls=()
if grep -q '<sitemapindex' <<<"$sitemap_xml"; then
  echo "${DIM}Sitemap index detected — following children...${RST}"
  while IFS= read -r child; do
    echo "${DIM}  → $child${RST}"
    child_xml="$(curl -sSL --max-time 15 "$child")" || continue
    while IFS= read -r u; do urls+=("$u"); done < <(
      echo "$child_xml" | xmllint --xpath '//*[local-name()="url"]/*[local-name()="loc"]/text()' - 2>/dev/null \
        | tr -s ' ' '\n' | grep -E '^https?://'
    )
  done < <(
    echo "$sitemap_xml" | xmllint --xpath '//*[local-name()="sitemap"]/*[local-name()="loc"]/text()' - 2>/dev/null \
      | tr -s ' ' '\n' | grep -E '^https?://'
  )
else
  while IFS= read -r u; do urls+=("$u"); done < <(
    echo "$sitemap_xml" | xmllint --xpath '//*[local-name()="url"]/*[local-name()="loc"]/text()' - 2>/dev/null \
      | tr -s ' ' '\n' | grep -E '^https?://'
  )
fi

if [[ ${#urls[@]} -eq 0 ]]; then
  echo "${RED}No URLs found in sitemap.${RST}" >&2
  exit 2
fi

echo "${BLU}Inspecting ${#urls[@]} URLs...${RST}"
echo

# --- Header ---------------------------------------------------------------
printf "%-4s  %-60s  %-6s  %-14s  %7s  %-12s  %s\n" \
  "#" "URL" "STATUS" "CONTENT-TYPE" "SIZE" "CACHE" "NOTES"
printf -- "----  ------------------------------------------------------------  ------  --------------  -------  ------------  -----\n"

# --- Per-URL inspection ---------------------------------------------------
total=0; ok=0; warn=0; fail=0
failed_urls=()

for u in "${urls[@]}"; do
  total=$((total+1))

  hdr="$(mktemp)"
  body="$(mktemp)"

  # Headers → $hdr, body → $body, metadata → stdout.
  # No more boundary-guessing in a single stream.
  meta="$(curl -sSL --max-time 20 \
    -D "$hdr" \
    -o "$body" \
    -w '%{http_code}|%{size_download}|%{content_type}' \
    "$u")"
  rc=$?

  IFS='|' read -r status size ctype <<<"$meta"

  xcache="$(awk -F': ' 'tolower($1)=="x-cache"{sub(/[\r\n]+$/,"",$2); print $2}' "$hdr" | head -1)"
  [[ -z "$xcache" ]] && xcache="-"

  canonical=""
  robots=""
  if [[ -s "$body" && "$ctype" == text/html* ]]; then
    canonical="$(grep -oiE '<link[^>]*rel="canonical"[^>]*>' "$body" \
      | grep -oiE 'href="[^"]+"' | head -1 | sed -E 's/href="([^"]+)"/\1/')"
    robots="$(grep -oiE '<meta[^>]*name="robots"[^>]*>' "$body" \
      | grep -oiE 'content="[^"]+"' | head -1 | sed -E 's/content="([^"]+)"/\1/')"
  fi

  notes=()
  state="ok"

  if [[ "$rc" -ne 0 ]]; then
    notes+=("curl-err($rc)"); state="fail"
  fi

  # Status must be strictly 2xx
  if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
    notes+=("status=$status"); state="fail"
  fi

  # Soft-404 heuristic: HTML with tiny body. Typical Astro pages here are 150KB+.
  if [[ "$ctype" == text/html* && "$size" =~ ^[0-9]+$ && "$size" -lt 2000 ]]; then
    notes+=("tiny-body($size)"); [[ "$state" != "fail" ]] && state="warn"
  fi

  # noindex check
  if [[ -n "$robots" ]] && grep -qi 'noindex' <<<"$robots"; then
    notes+=("noindex"); state="fail"
  fi

  # Off-domain canonical (catches brand-leak regressions)
  if [[ -n "$canonical" ]]; then
    canon_host="$(echo "$canonical" | awk -F'/' '{print $3}')"
    this_host="$(echo "$u" | awk -F'/' '{print $3}')"
    if [[ -n "$canon_host" && "$canon_host" != "$this_host" ]]; then
      notes+=("canonical→$canon_host"); state="fail"
    fi
  fi

  # XML URLs should return XML, not HTML
  if [[ "$u" == *.xml && "$ctype" != *xml* ]]; then
    notes+=("xml-url-got-$ctype"); state="fail"
  fi

  case "$state" in
    ok)   ok=$((ok+1));   color="$GRN" ;;
    warn) warn=$((warn+1)); color="$YLW" ;;
    fail) fail=$((fail+1)); color="$RED"; failed_urls+=("$u :: ${notes[*]:-}") ;;
  esac

  display_url="$u"
  if [[ ${#display_url} -gt 60 ]]; then
    display_url="${display_url:0:57}..."
  fi

  notes_str="${notes[*]:-ok}"
  printf "${color}%-4d  %-60s  %-6s  %-14s  %7s  %-12s  %s${RST}\n" \
    "$total" "$display_url" "${status:-???}" "${ctype:0:14}" "${size:-0}" "${xcache:0:12}" "$notes_str"

  rm -f "$hdr" "$body"
done

echo
echo "${BLU}Summary:${RST} $total URLs checked — ${GRN}${ok} ok${RST}, ${YLW}${warn} warn${RST}, ${RED}${fail} fail${RST}"

if [[ $fail -gt 0 ]]; then
  echo
  echo "${RED}Failed URLs:${RST}"
  for line in "${failed_urls[@]}"; do
    echo "  $line"
  done
  exit 1
fi

exit 0
