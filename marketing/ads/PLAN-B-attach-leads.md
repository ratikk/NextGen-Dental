# Plan B — Attach negative lists to the LIVE Leads campaign (SEPARATE approval)
Artifact: import/plan-b/attach-leads-lowrisk.csv (low-risk lists only: Freebie
Intent + Far Geography). Competitor and Price-Sensitive lists attach only after
the business decisions recorded in negative-lists.yaml risk_tier=confirm.
IMPACT: changes live matching on Leads IMMEDIATELY upon posting — this is a
production behavior change to a spending campaign. Review Leads' recent search
terms for any legitimate query the lists would block before approving.
Prerequisite: Plan A imported and verified. Approval phrase: "Approve negative-list attachment".
Rollback: detach lists (immediate); suppressed traffic during attachment is not recoverable.
