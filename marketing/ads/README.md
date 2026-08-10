# Google Ads as Code — NextGen Dental (CETO v6)

> **POSTING IS NOT AUTHORIZED.** Nothing in this directory may be posted to
> Google Ads, attached to a live campaign, or activated without the specific
> approval gates in `approval-manifest.yaml` being APPROVED with an authorized
> approver identity and UTC timestamp. The agent drafts; a human posts.

## Layout
| Path | What it is |
|---|---|
| `campaigns/*.yaml` | **Source of truth.** Campaign, negative-list and activation-action specs with per-item evidence. |
| `compute_evidence.py` | Recomputes negative-list evidence from an (uncommitted) search-terms export and fails on any mismatch. |
| `generate.py` | Deterministic YAML → Ads Editor CSVs + per-plan digests. |
| `import/plan-a/` | **Generated.** New PAUSED campaign, keywords, ads, unattached negative lists. |
| `import/plan-b/` | **Generated.** Attachments to the LIVE Leads campaign (only APPROVED pairs). |
| `import/plan-c/` | **Generated.** Attachments to the new campaign, pre-activation. |
| `import/CHECKSUMS.txt` | Per-file + per-plan digests; approvals bind to these. |
| `validate.py` | 40+ governance checks incl. CSV parity, all-Paused, approval identity/order, live landing page. |
| `test_negatives.py` | Semantics tests: which searches must be blocked vs must still serve. |
| `preview-evidence.yaml` | **Machine-validated** Plan A Editor preview: every observed setting (status, budget, CPC, networks, language, locations, presence option, counts, final URLs) is compared against the spec and generated artifacts. |
| `activation-preview-evidence.yaml` | **Machine-validated** Plan C activation preview, incl. `editor_column_compatibility` — Editor compatibility is NOT claimed until real preview evidence exists. |
| `test_governance.py` | 53 scenario tests: builds a golden approved fixture in a temp dir (never committed) and proves each control fails correctly. |
| `approval-manifest.yaml` | Approval record-keeping: completeness + authorized identity *labels*. Authenticity comes from protected branches, PR review identity and retained external evidence. |
| `preflight-landing-check.sh` | curl ground-truth landing-page check — run from EC2, not from an agent sandbox. |
| `EDITOR-PREVIEW-EVIDENCE.md` | Fill in from the Ads Editor preview BEFORE posting. |
| `PLAN-A-new-campaign.md` | Create paused campaign + unattached lists (zero behavioural impact). |
| `PLAN-B-attach-leads.md` | Attach lists to the live Leads campaign (immediate live impact). |
| `PLAN-C-activation.md` | Activate the campaign (money starts). |

**Never hand-edit `import/**`** — they are build artifacts. CI regenerates and
byte-compares; a hand edit fails the build. Never commit credentials, account
IDs, customer/patient data, or raw search-term exports.

## Commands
```bash
pip install -r requirements.txt          # PyYAML pinned; Python >= 3.9
python3 generate.py                      # rebuild import/ + digests
python3 test_negatives.py                # expect: 14 cases, 0 failed
python3 validate.py                      # draft mode (default): structure/parity/evidence
python3 validate.py --online             # + LIVE landing-page check (BLOCKING; CI runs this)
python3 validate.py --release-plan-a --online   # refuses unless Plan A approvals are complete,
python3 validate.py --release-plan-b --online   # chronological and digest-bound
python3 validate.py --release-plan-c --online
python3 compute_evidence.py <export.csv> # verify the evidence numbers against source data
python3 test_governance.py               # expect: 53 run, 53 passed, 0 failed
```
CI runs all three on PRs and pushes touching `marketing/ads/**`.

## Approval procedure
1. Verify the landing page from a clean network path (`preflight-landing-check.sh`);
   paste evidence into `gates.landing_page_verified`.
2. Dentists review `campaign.claims_review`; record `gates.clinical`.
3. Owner records `gates.marketing`, `gates.budget`, then `gates.import_gate`
   (and later `gates.plan_a_applied` with the posted package digest + account
   verification evidence, and a `plan_b_decision` of ATTACH_APPROVED or DECLINED —
   activation refuses to release without both)
   (each: status APPROVED + approved_by + approved_at UTC). Digests must match
   the current package or the validator invalidates the approval.
4. Load `import/plan-a/` into Ads Editor and complete `EDITOR-PREVIEW-EVIDENCE.md`
   **before** recording `gates.import_gate` — the preview is an input to the
   approval, not a formality after it. A changed preview invalidates the approval.
   Note: Ads Editor's interpretation of the semicolon-separated language/location
   fields is confirmed only by the preview; treat the preview as authoritative.
   Then `python3 validate.py --release-plan-a --online` must pass. Then post.
5. Plan B (attachments) and Plan C (activation) are separate approvals, later.

## Controls you should understand before approving anything

**Chronology is enforced in UTC**, end to end:
marketing/clinical/budget/landing approval → Editor preview → import approval →
Plan A applied → account verified → Plan B decision → activation preview →
activation landing recheck → activation approval. Out-of-order, naive, missing or
future timestamps fail.

**Plan A post-import verification is structured.** `account_verification_evidence: "yes"`
fails. The object must confirm the campaign exists and is Paused, budget $8, max CPC $6,
all 13 keywords present and Paused, both ads present and Paused, 3 negative lists created,
**zero** attachments, no unexpected changes, no errors, result MATCHES_PLAN.

**Plan B must reach a consistent decision.** `ATTACH_APPROVED` requires at least one
approved Leads attachment gate, a non-empty Plan B CSV whose every row has a matching
approved gate, and attachment approvals no later than the decision. `DECLINED` requires
zero approved Leads gates and an empty CSV. `PENDING` blocks both Plan B and activation.

**Activation needs its own same-day landing recheck.** The Plan A-time landing check does
not stay valid forever: `activation_landing_recheck` must carry evidence for BOTH the clean
and UTM URLs (200, on-domain, non-error title, correct canonical, analytics loader present)
tested on the same UTC date as the activation approval.

**A green live check is technical evidence, not human approval.** `production_status:
VERIFIED_200` records that a machine observed the page serving; it never sets an approval
gate. Likewise, approval identity labels (`approved_by: ratikk`) record *who is claimed to
have approved*; they do not prove authenticity. That depends on protected branches, verified
PR reviewer identity and retained external evidence — especially for clinical sign-off.

**Still unauthorized:** posting Plan A, attaching negative lists to any campaign, and
enabling the campaign. Nothing in this directory has been applied to the Google Ads account.
