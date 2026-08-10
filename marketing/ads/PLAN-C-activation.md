# Plan C — Activate "Search | Dental Implants | South Austin" (separate approval)
Plan C contains **two independently-approvable actions with separate digests**:
| Action | Artifact | Digest |
|---|---|---|
| Attach approved negative lists to the new campaign | `import/plan-c/attach-new-campaign.csv` | PLAN-C-ATTACH-DIGEST |
| **Activate** the campaign (PAUSED → ENABLED) | `import/plan-c/activation.csv` | PLAN-C-ACTIVATION-DIGEST |

The activation mutation is defined in `campaigns/activation-action.yaml`
(previous_status PAUSED → requested_status ENABLED, rollback_status PAUSED,
budget $8/day, max CPC $6) and is the ONLY file permitted to contain a
non-Paused entity — the validator enforces that exception narrowly and checks
the artifact against its spec.

## Prerequisites
Machine-enforced by `validate.py --release-plan-c --online`: gate approvals with
authorized identity, chronological ordering, per-action digests, `plan_a_applied`
(posted package digest + account verification evidence), a non-PENDING
`plan_b_decision`, a non-PENDING `attribution_decision`, `production_status:
VERIFIED_200`, and a live landing-page check.
NOT machine-enforceable (external human controls): that the named approver truly
approved, that the dentists actually reviewed the claims, and that the Editor
preview screenshots match what was posted. Those rest on branch protection, PR
review identity and retained evidence.
1. gates.marketing / clinical / budget / landing_page_verified / import_gate = APPROVED
   (each with authorized approver + UTC timestamp, before plan expiry)
2. Plan A posted and the account verified against EDITOR-PREVIEW-EVIDENCE.md
3. Plan B decision made (attach or explicitly decline)
4. `activation-preview-evidence.yaml` completed from a real Editor preview, with
   `editor_column_compatibility: ACCEPTED` — Editor's handling of the four activation
   columns is NOT assumed from CSV structure
5. `gates.activation_landing_recheck` APPROVED with same-UTC-date evidence for BOTH URLs
6. `plan_b_decision` is ATTACH_APPROVED or DECLINED (PENDING blocks activation)
7. `tracking.attribution_decision` is no longer PENDING — one of:
   A allow-list utm keys (privacy-posture change, needs review) · B campaign-category
   event · C distinct landing path · D accept Google-aggregate-only reporting
   (validator BLOCKS activation while PENDING — otherwise Measure/Learn is undefined)
5. Landing page verified 200 again immediately before enabling

## Financial exposure once active
$8/day average (≈$243/mo). Governance threshold $250/mo with 70/85/100% alerts.
First week: check search terms daily, spend vs threshold, policy disapprovals.

Approval phrase: **"Approve campaign activation"**.
After execution (if ever approved and performed), record `activation_execution`
with the post-execution account evidence; it is validated the same way. Rollback: pause (one click,
immediate); spend already incurred is not recoverable.
