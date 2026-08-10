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
+ 4 shared negative lists CREATED, ATTACHED TO NOTHING (58 phrases)
+ Budget $8/day · Manual CPC max $6 · Google Search only · English
+ Locations Austin/Buda/Kyle, "People in your targeted locations" (presence)

## Behavioural impact of this import: none
Campaign and all children are Paused; the lists attach to nothing. Attaching to
the live Leads campaign is **Plan B** (separate approval); activation is **Plan C**.

## PREREQUISITE — landing page must be verified 200 from a clean network path
`https://nextgendentalaustintx.com/services/dental-implants`
An independent review measured **HTTP/2 404** on 2026-08-10; the agent's proxied
fetch returned a fully-rendered page (proxy caching makes that observation
unreliable). **Unresolved.** Run `./preflight-landing-check.sh` from EC2 and/or
read the CI `--online` result, paste the output into
`approval-manifest.yaml → gates.landing_page_verified.evidence`, and only then
approve. CI validation is BLOCKING on this check.

## Budget guardrail (honest)
Google enforces only the $8/day average (≈$243/mo maximum charge). The $250/month
figure is a **governance threshold**, not a Google setting. Enforcement until the
Phase 2 reporting script exists = owner checks spend weekly; planned alerts at
70% ($175) / 85% ($212) / 100% ($250). No automatic budget changes, ever.

## Historical-spend context — NOT a savings forecast
Recomputed by matching each list's EXACT phrases against the 876 real search-term
rows (the 881-row file contained 5 total/summary rows):

| List (phrases) | Matched terms | Clicks | Spend | of which Leads | of which PMax | Conv |
|---|---|---|---|---|---|---|
| Freebie Intent (11) | 21 | 29 | $155.33 | **$16.43** | $138.90 | 1 |
| Price-Sensitive (3) | 0 | 0 | **$0.00** | $0.00 | $0.00 | 0 |
| Competitor Brands (30) | 127 | 6 | $84.57 | **$0.00** | $84.57 | 1 |
| Far Geography (14) | 21 | 1 | $3.41 | $0.00 | $3.41 | 0 |
| *Near-Metro (7, review-only, NOT generated)* | 65 | 1 | $7.75 | $0.00 | $7.75 | **1** |

Reading: **~89–100% of the historical spend these lists match came from
Performance Max, to which shared negative lists here do NOT apply.** Attaching
everything to Leads would have affected ~$16 of the last 30 days. Future savings
are unknown and depend on attachment decisions, query volume, matching behaviour
and conversion quality. The Price-Sensitive list has **no supporting evidence at
all** and is recommended for removal rather than attachment. The Near-Metro list
would have blocked a recorded conversion — hence review-only.

## Rollback (operational, not historical)
Remove the campaign and delete the 4 lists in Editor/UI (<10 min). Google Ads
change history retains the record permanently; any traffic effects occurring
before rollback are not recoverable.

## Gates required before posting
marketing · clinical · budget · landing_page_verified · import_gate — all with
approver identity and UTC timestamp in `approval-manifest.yaml`, plus a completed
`EDITOR-PREVIEW-EVIDENCE.md`.
