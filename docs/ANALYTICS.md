# Analytics Pilot — Self-Hosted Umami (plan-only until approved)

Status: Terraform authored for REVIEW. `terraform plan` runs automatically on the PR
(stack added to the plan matrix). **Apply is intentionally not wired** into the
gated workflow: the `tf-apply` role has no IAM/EC2/SSM/DLM/SNS permissions. If the
plan is approved, first apply runs from CloudShell with admin credentials (same
procedure as bootstrap), then the stack can be adopted into the pipeline after a
role-permission review.

## Architecture

    Patients' browsers ──POST /api/send──▶ ┌─────────────────────────────────┐
    (5 allow-listed events, cookieless)    │  EC2 t4g.small (AL2023, IMDSv2) │
                                           │  ┌──────┐ ┌───────┐ ┌────────┐  │
    Ratik ──HTTPS + basic-auth + login──▶  │  │caddy │▶│ umami │▶│ pg 16  │  │
                                           │  │ TLS  │ │       │ │ /data  │──┼─▶ encrypted EBS (20 GB)
    Admin ──SSM Session Manager (no SSH)─▶ │  └──────┘ └───────┘ └────────┘  │
                                           └───────────────┬─────────────────┘
        Route53 A: analytics.nextgendental...com ─▶ EIP    │ nightly pg_dump
        CloudWatch: logs(30d) + status alarm ─▶ SNS email  ▼
                                            s3://nextgendental-analytics-backups
                                            (KMS, versioned, PAB, 35-day lifecycle)
        Weekly EBS snapshot via DLM (7 kept)

## Key decisions (full rationale: reviewed architecture proposal, 2026-08-08)
- Dedicated NEW instance; existing EC2s not reused (unassessed patch/exposure/roles).
- Postgres co-located on encrypted EBS for the pilot; RDS = Option B (~$42–48/mo) if it graduates.
- No ALB/CloudFront: Caddy terminates TLS (Let's Encrypt); traffic volume doesn't justify $16+/mo.
- `/api/send` + `/script.js` public (tracker must be reachable); everything else behind
  Caddy basic-auth AND Umami login (two layers). Sharing links disabled.
- Secrets in SSM Parameter Store (SecureString); placeholders in TF with
  `ignore_changes` — real values set out-of-band after apply. No secret outputs.
- Privacy contract enforced at the site by `trackApprovedEvent` (v2.1, 113 tests):
  5 events, enum-only, deep-frozen registry, hybrid path policy (foreign/malformed/
  identifier-like → reject; first-party unknown route → aggregate + counter).
  Replay/telemetry disabled. Retention 13 months. No cookies, no PHI.
- RTO ≤ 4 h (re-apply + restore, drill required before go-live) · RPO ≤ 24 h.
- Cost: ≈ $16.30/mo infra + 1–2 h/mo operator (details in proposal TCO table).

## Runbook (fill in after apply)
Restore drill · backup verification · patch cadence · alarm test · Umami/Postgres
upgrade (pinned digests) · destroy: `terraform destroy` (backups retained 30 d).
