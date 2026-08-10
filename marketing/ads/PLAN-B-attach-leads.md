# Plan B — Attach negative lists to the LIVE "Leads" campaign (separate approval)
Artifact: `import/plan-b/attach-leads.csv`, bound to PLAN-B-PACKAGE-DIGEST.
The generator emits a row **only** for lists whose
`attachment[<list>][leads_campaign].status == APPROVED` in the manifest.
With nothing approved the file contains a header and zero rows — fail-closed.

## Impact: immediate and live
Attaching changes matching on a campaign that is spending money **the moment it
is posted**. This is a production behaviour change, never bundled with Plan A.

## Evidence-based expectation (be honest with yourself here)
Against the last 30 days, attaching every list to Leads would have affected
**$16.43** (freebie terms only). Competitor/Far-Geo/Price-Sensitive matched
**$0.00** of Leads spend. The measurable case for Plan B is therefore weak;
its value is prospective (preventing future drift). The strong waste signal is
in Performance Max, which these lists cannot touch — address that separately
(brand exclusion, placement exclusions, budget decision).

## Recommended decisions
- Freebie Intent → attach (low risk, evidence exists)
- Far Geography → attach (defence-in-depth; presence targeting already primary)
- Competitor Brands → business/strategy decision; 1 conversion of unknown quality
- Price-Sensitive → do NOT attach (zero evidence); consider deleting the list

Before approving: review Leads' recent search terms for any legitimate query the
phrases would block. Approval phrase: **"Approve negative-list attachment"** —
recorded per list, per campaign, with approver and UTC timestamp.
Rollback: detach (immediate); traffic suppressed while attached is not recoverable.
