# Analytics — Self-Hosted Umami (LIVE; this branch is not yet on main)

**Status: the stack is RUNNING in production.** analytics.nextgendentalaustintx.com
has been serving since 2026-08-09 and the site's tracker depends on it. This
document previously read "plan-only until approved", which stopped being true the
day the stack was applied from CloudShell.

Two consequences that matter more than anything else in this file:

1. **This branch has never been merged to `main`.** The Terraform and
   `user-data.sh` describing the live instance exist only on
   `infra/analytics-pilot`. Mainline has no record of the running
   infrastructure.
2. **Applying this as-is against a live stack would be wrong.** The remote state
   may not own the running resources. Before any apply, confirm ownership with
   `terraform state list`; if the resources are absent from state, this is an
   **import/adoption** exercise (`terraform import` per resource, then a plan
   that shows zero changes), not a fresh apply. A fresh apply against
   already-existing resources will either fail on name conflicts or create
   duplicates.

Apply is still not wired into the gated workflow: the `tf-apply` role has no
IAM/EC2/SSM/DLM/SNS permissions, so any apply or import runs from CloudShell with
admin credentials.

## Bootstrap prerequisites (must be true BEFORE the instance is created)

All three SSM parameters must hold real values. Terraform seeds them with a
placeholder and `ignore_changes = [value]`; if the instance boots first, the
placeholders are baked into `docker-compose.yml` and the `Caddyfile`, and later
SSM edits do **not** re-render them. `user-data.sh` now refuses to continue in
that state rather than coming up misconfigured.

    /nextgendental/analytics/pg_password          real value
    /nextgendental/analytics/app_secret           real value
    /nextgendental/analytics/dash_basicauth_hash  bcrypt hash ($2a$/$2b$/$2y$)

## Reproducibility gap (open)

Container images are still floating tags. Capture the digests actually running
and pin them before treating a rebuild as trustworthy:

    sudo docker images --digests | grep -E 'umami|postgres|caddy'

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
        Daily EBS snapshot via DLM (7 kept)

## Key decisions (full rationale: reviewed architecture proposal, 2026-08-08)
- Dedicated NEW instance; existing EC2s not reused (unassessed patch/exposure/roles).
- Postgres co-located on encrypted EBS for the pilot; RDS = Option B (~$42–48/mo) if it graduates.
- No ALB/CloudFront: Caddy terminates TLS (Let's Encrypt); traffic volume doesn't justify $16+/mo.
- `/api/*` + `/script.js` + `/site.webmanifest` bypass the Caddy gate (the SPA's
  fetch() calls don't carry browser basic-auth credentials; Umami's own token
  auth protects every sensitive API route). The Caddy basic-auth layer guards
  the dashboard pages; the STRONG Umami admin password is the primary security
  boundary. Sharing links disabled; session replay never enabled.
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
