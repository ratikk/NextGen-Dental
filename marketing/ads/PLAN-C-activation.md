# Plan C — Activate "Search | Dental Implants | South Austin" (separate approval)
Artifact: `import/plan-c/attach-new-campaign.csv` (approved attachments only),
bound to PLAN-C-PACKAGE-DIGEST.

## Prerequisites — ALL enforced by validate.py
1. gates.marketing / clinical / budget / landing_page_verified / import_gate = APPROVED
   (each with authorized approver + UTC timestamp, before plan expiry)
2. Plan A posted and the account verified against EDITOR-PREVIEW-EVIDENCE.md
3. Plan B decision made (attach or explicitly decline)
4. `tracking.attribution_decision` is no longer PENDING — one of:
   A allow-list utm keys (privacy-posture change, needs review) · B campaign-category
   event · C distinct landing path · D accept Google-aggregate-only reporting
   (validator BLOCKS activation while PENDING — otherwise Measure/Learn is undefined)
5. Landing page verified 200 again immediately before enabling

## Financial exposure once active
$8/day average (≈$243/mo). Governance threshold $250/mo with 70/85/100% alerts.
First week: check search terms daily, spend vs threshold, policy disapprovals.

Approval phrase: **"Approve campaign activation"**. Rollback: pause (one click,
immediate); spend already incurred is not recoverable.
