# Plan A — Create new PAUSED campaign + UNATTACHED negative lists
Approval is bound to **PLAN-A-PACKAGE-DIGEST** in `import/CHECKSUMS.txt`
(recorded in `approval-manifest.yaml → digests.plan_a_package_sha256`).
Regenerating any artifact changes the digest and invalidates the approval.
Plan A artifacts live in `import/plan-a/` ONLY — they cannot modify any existing campaign.

## Proposed actions (Google Ads Editor, executed by the owner)
+ 1 PAUSED Search campaign "Search | Dental Implants | South Austin"
+ 2 ad groups: General Dental Implants; Single-Tooth Replacement
+ 13 keywords (8 exact, 5 phrase) — all Paused
+ 2 responsive search ads — Paused; final URLs carry utm_source/medium/campaign
+ 3 shared negative lists CREATED, ATTACHED TO NOTHING (55 phrases)
+ Budget $8/day · Manual CPC max $6 · Google Search only · English
+ Locations Austin/Buda/Kyle, "People in your targeted locations" (presence)

## Behavioural impact of this import: none
Campaign and all children are Paused; the lists attach to nothing. Attaching to
the live Leads campaign is **Plan B** (separate approval); activation is **Plan C**.

## BLOCKED — the landing page is confirmed broken in production
`https://nextgendentalaustintx.com/services/dental-implants` returns **HTTP 404**
on both the clean and UTM URLs (independently measured and reproduced by
`validate.py --online`, 2026-08-10). No canonical tag is present because the
custom error page is being served. The agent's own proxied fetch returned a
rendered page and was WRONG — proxied observations are not evidence here.

**Nothing in this plan may be previewed, posted or activated until the page is
fixed and re-verified 200.** Diagnosis ladder: claude/ads-landing-page-404.md.
Verification: run `./preflight-landing-check.sh` from EC2 (or read the CI
`--online` result), then paste the structured result into
`approval-manifest.yaml → gates.landing_page_verified.evidence`
(url, http_status, final_url, tested_at, tested_by, spec_digest — all required).

## Budget guardrail (honest)
Google enforces only the $8/day average (≈$243/mo maximum charge). The $250/month
figure is a **governance threshold**, not a Google setting. Enforcement until the
Phase 2 reporting script exists = owner checks spend weekly; planned alerts at
70% ($175) / 85% ($212) / 100% ($250). No automatic budget changes, ever.

## Historical-spend context — NOT a savings forecast
Reproducible via `compute_evidence.py <export.csv>` (the export is never committed).
Recomputed by matching each list's EXACT phrases against the 876 real search-term
rows (the 881-row file contained 5 total/summary rows):

| List (phrases) | Matched terms | Clicks | Spend | of which Leads | of which PMax | Conv |
|---|---|---|---|---|---|---|
| Freebie Intent (11) | 21 | 29 | $155.33 | **$16.43** | $138.90 | 1 |
| Competitor Brands (30) | 127 | 6 | $84.57 | **$0.00** | $84.57 | 1 |
| Far Geography (14) | 21 | 1 | $3.41 | $0.00 | $3.41 | 0 |
| *Near-Metro (7, review-only, NOT generated)* | 65 | 1 | $7.75 | $0.00 | $7.75 | **1** |

Reading: **~89–100% of the historical spend these lists match came from
Performance Max, to which shared negative lists here do NOT apply.** Attaching
everything to Leads would have affected ~$16 of the last 30 days. Future savings
are unknown and depend on attachment decisions, query volume, matching behaviour
and conversion quality. The Price-Sensitive list was **deleted in v4** (matched $0.00 — no evidence). The Near-Metro list
would have blocked a recorded conversion — hence review-only.

## Rollback (operational, not historical)
Remove the campaign and delete the 4 lists in Editor/UI (<10 min). Google Ads
change history retains the record permanently; any traffic effects occurring
before rollback are not recoverable.

## Gates required before posting
marketing · clinical · budget · landing_page_verified · import_gate — all with
approver identity and UTC timestamp in `approval-manifest.yaml`, plus a completed
`EDITOR-PREVIEW-EVIDENCE.md`.
