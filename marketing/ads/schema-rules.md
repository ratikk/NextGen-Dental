# Campaign-as-code validation rules (enforced by validate.py)
1. status_after_apply MUST be "PAUSED"            8. no broad match keywords
2. budget.approved_monthly_limit required          9. RSA headlines <=30 chars, 3-15 of them
3. currency + timezone required                   10. RSA descriptions <=90 chars, 2-4 of them
4. networks.display and search_partners = false   11. landing_page.url HTTPS + on-domain
5. geography.target_setting = PRESENCE_ONLY       12. no duplicate keywords across match types
6. maximum_cpc required for MANUAL_CPC            13. approvals block present with expiry
7. every campaign has evidence[]                  14. forbidden claim terms (guarantee, painless,
                                                      best, #1, cure, free) absent from ad copy
