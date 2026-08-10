# Google Ads as Code (CETO v3)
Campaign specs live in campaigns/*.yaml; validate.py enforces the governance rules
(schema-rules.md); import/*.csv are generated Ads Editor artifacts; PLAN.md is the
reviewable diff. Agent drafts -> validator gates -> human imports/activates.
Never commit: credentials, account IDs, customer/patient data, search-term exports.
