# Google Ads Plan — Draft 2026-08-10 (apply mechanism: Ads Editor import by owner)

## Account
NextGen Dental (owner-verified account; no account IDs stored in repo)

## Proposed actions
+ Create 3 shared negative-keyword lists (65 phrase negatives: freebie-intent 14, competitor brands 30, out-of-area 21)
+ Attach all 3 lists to: Leads (existing), Search|Dental Implants|South Austin (new)
+ Create 1 PAUSED Search campaign "Search | Dental Implants | South Austin"
+ Create 1 ad group "Implants - Local Intent" (6 exact + 5 phrase keywords, all Paused)
+ Create 1 responsive search ad (10 headlines / 4 descriptions, Paused)
+ Set daily budget $8 (monthly ceiling $250), Manual CPC, max CPC $6.00
+ Geo: Austin+Buda+Kyle, PRESENCE ONLY. Networks: Google Search only.
MANUAL STEP (owner, in UI; Editor cannot): PMax brand exclusion for "NextGen Dental"
RECOMMENDATION ONLY (separate approval, not in this import): reduce PMax daily budget

## Financial exposure after (separate) activation
New campaign: $8/day ≈ $243/mo, ceiling $250/mo. Worst case if never touched: $250/mo.
Negatives + brand exclusion: NEGATIVE exposure (removes ~$155 freebie + ~$110 competitor
+ ~$45 own-brand ≈ $310/mo of observed waste).
Account total after import, before any activation: unchanged (campaign is PAUSED).

## No changes
- Billing  - Existing budgets/bids  - Existing Leads keywords/ads  - Conversion settings  - PMax structure

## Rollback
Remove campaign "Search | Dental Implants | South Austin"; detach/delete the 3 shared lists;
remove PMax brand exclusion. All reversible in Ads Editor or UI in <10 minutes; zero residual state.

## Approvals
Marketing: PENDING · Clinical (ad claims): PENDING — Dr. Kondragunta/Dr. Yanala · Budget owner: PENDING
Import: PENDING ("Approve Google Ads Editor import") · Activation: PENDING (separate, later)
Plan expires 2026-09-10; any edit to the YAML invalidates this plan.
