# Google Ads as Code — NextGen Dental (CETO v3)

> **POSTING IS NOT AUTHORIZED.** Nothing in this directory may be posted to
> Google Ads, attached to a live campaign, or activated without the specific
> approval gates in `approval-manifest.yaml` being APPROVED with an authorized
> approver identity and UTC timestamp. The agent drafts; a human posts.

## Layout
| Path | What it is |
|---|---|
| `campaigns/*.yaml` | **Source of truth.** Campaign + negative-list specs with per-item evidence. |
| `generate.py` | Deterministic YAML → Ads Editor CSVs + per-plan digests. |
| `import/plan-a/` | **Generated.** New PAUSED campaign, keywords, ads, unattached negative lists. |
| `import/plan-b/` | **Generated.** Attachments to the LIVE Leads campaign (only APPROVED pairs). |
| `import/plan-c/` | **Generated.** Attachments to the new campaign, pre-activation. |
| `import/CHECKSUMS.txt` | Per-file + per-plan digests; approvals bind to these. |
| `validate.py` | 40+ governance checks incl. CSV parity, all-Paused, approval identity/order, live landing page. |
| `test_negatives.py` | Semantics tests: which searches must be blocked vs must still serve. |
| `approval-manifest.yaml` | **The only approval record** (gates + per-list attachment decisions). |
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
python3 validate.py                      # offline gates; expect 0 failed
python3 validate.py --online             # + LIVE landing-page check (BLOCKING; CI runs this)
```
CI runs all three on PRs and pushes touching `marketing/ads/**`.

## Approval procedure
1. Verify the landing page from a clean network path (`preflight-landing-check.sh`);
   paste evidence into `gates.landing_page_verified`.
2. Dentists review `campaign.claims_review`; record `gates.clinical`.
3. Owner records `gates.marketing`, `gates.budget`, then `gates.import_gate`
   (each: status APPROVED + approved_by + approved_at UTC). Digests must match
   the current package or the validator invalidates the approval.
4. Load `import/plan-a/` into Ads Editor, complete `EDITOR-PREVIEW-EVIDENCE.md`,
   compare with `PLAN-A-new-campaign.md`, then post.
5. Plan B (attachments) and Plan C (activation) are separate approvals, later.
