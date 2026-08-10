# Google Ads as Code (CETO v3)
Specs: campaigns/*.yaml (source of truth). generate.py deterministically produces import/*.csv — NEVER hand-edit CSVs; CI regenerates and fails on drift. validate.py enforces 30+ governance rules incl. checksums and approval-gate ordering (approval-manifest.yaml is the only approval record). Plans: PLAN-A (new paused campaign), PLAN-B (attach to live Leads — separate), PLAN-C (activation — last).
(schema-rules.md); import/*.csv are generated Ads Editor artifacts; PLAN.md is the
reviewable diff. Agent drafts -> validator gates -> human imports/activates.
Never commit: credentials, account IDs, customer/patient data, search-term exports.
