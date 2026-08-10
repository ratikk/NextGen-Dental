# Plan A — Create new PAUSED campaign + UNATTACHED negative lists
Import package digest: 2c595ecf8f4688029170a48439dc912beeab5e2c1365cd69697214f6908a099f (import/CHECKSUMS.txt; approval is against this digest —
any regeneration invalidates it)

## Proposed actions (Ads Editor, owner-executed)
+ 1 PAUSED Search campaign "Search | Dental Implants | South Austin"
+ 2 ad groups (General Dental Implants; Single-Tooth Replacement), 8 exact + 5 phrase keywords, all Paused
+ 2 responsive search ads (Paused), final URLs carry utm_source/medium/campaign
+ 4 shared negative lists CREATED, ATTACHED TO NOTHING (55 terms; the near-metro
  review list is deliberately NOT generated for import)
+ Budget $8/day, Manual CPC max $6, Google Search only, presence-only Austin/Buda/Kyle

## Behavioral impact of THIS import: none.
The campaign and all children are Paused; unattached lists affect no matching.
(Language corrected per 2026-08-10 review: the previous draft attached lists to
the live Leads campaign in the same import — that is now Plan B, separately gated.)

## Budget guardrail (honest version)
Google enforces only the $8/day average (monthly maximum charge ≈ $8 × 30.4).
The $250/month figure is a GOVERNANCE THRESHOLD, not a Google setting. Until the
Phase 2 reporting script exists, enforcement is: owner checks spend at each
weekly report; alerts at 70% ($175) / 85% ($212) / 100% ($250) become automated
in Phase 2. No automatic budget changes, ever.

## Historical-spend context (NOT a savings forecast)
The 30-day search-terms report associated these query categories with historical
spend: freebie/study/trial ≈ $155 (mostly PMax), competitor-brand ≈ $110 (mostly
PMax), far-geo ≈ $11, own-brand ≈ $45 (PMax; produced 1 conversion — not
classifiable as pure waste). Future savings are UNKNOWN and depend on which
campaigns accept exclusions (these lists do NOT apply to PMax), future query
volume, matching behavior, and conversion quality.

## Rollback (operational, not historical)
Remove the campaign and delete the 4 lists in Editor/UI (<10 min). Google Ads
change history retains the record permanently; any traffic effects that occurred
before rollback are not recoverable.
