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

## Bootstrap sequence (the supported one)

Bootstrap is two stages, because neither the volume attachment nor the secret
population is under the boot script's control.

**Stage 1** (cloud-init, once): packages, CloudWatch agent, then it registers
`umami-bootstrap.service` and exits. Nothing here can fail for environmental
reasons, and log shipping starts *before* anything that can, so stage 2's
failures are visible remotely rather than trapped on the box.

**Stage 2** (`/opt/umami/bootstrap.sh`, systemd, `Restart=on-failure`,
`RestartSec=60`): waits for the data volume, waits for real secrets, renders
config, starts the stack. Any not-yet-ready condition exits non-zero and is
retried a minute later.

**So the supported order is: whichever you like.** You may populate the SSM
parameters before or after `terraform apply`. If the instance comes up first it
will sit retrying, logging why, and start itself the minute the values are real.
This replaces the earlier "populate before instance creation" instruction, which
was impossible to satisfy given Terraform creates those same parameters.

    /nextgendental/analytics/pg_password          real value
    /nextgendental/analytics/app_secret           real value
    /nextgendental/analytics/dash_basicauth_hash  bcrypt hash ($2a$/$2b$/$2y$)

Diagnose a stuck bootstrap without SSH:

    aws logs tail /nextgendental/analytics --follow --region us-east-2
    # or on the box: journalctl -u umami-bootstrap -f

## Data volume discovery

`t4g` is Nitro, so EBS attaches as `/dev/nvme<N>n1` regardless of the
`device_name` Terraform requests; `/dev/xvdb` exists only if ec2-utils' udev
rules are installed and fired. Stage 2 resolves the device in this order:
existing `umami-data` filesystem label → `/dev/xvdb`/`/dev/sdb` symlink →
NVMe namespace whose EBS mapping is xvdb/sdb via `ebsnvme-id` → exactly one
unused, unpartitioned, non-root disk.

**If the candidate is ambiguous it refuses to proceed.** Formatting the wrong
disk is unrecoverable; waiting for a human is not. `/etc/fstab` mounts by
`LABEL=umami-data`, not by device name, because the NVMe number is not stable
across instance replacement.

## Reproducibility gap (STILL OPEN)

The compose binary is pinned; **the container images are not.** `umami` is on
`postgresql-latest`, and postgres/caddy are on mutable major tags. A rebuild can
pull a version nobody reviewed. Digests are not invented in this repo — capture
the ones actually running and commit them:

    sudo docker images --digests | grep -E 'umami|postgres|caddy'

Then replace the three tags at the top of `user-data.sh` with
`image@sha256:<digest>`. Until that is done, do not describe this stack as
reproducible.

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
- Only `/api/send`, `/script.js`, and `/site.webmanifest` bypass the Caddy gate;
  these are the endpoints the tracker needs. All other present and future API
  routes remain behind Caddy basic-auth plus Umami's own authentication. Sharing
  links are disabled; session replay is never enabled.
  - **This bypass was `/api/*` until 2026-08-17, and it was wide for a reason.**
    Rollout incident #3 (2026-08-09) on this host: the dashboard SPA's `fetch()`
    calls did not carry browser basic-auth credentials, so API calls returned 401
    and the app hung. Opening `/api/*` was the hot-fix. Narrowing it back is the
    better security posture — Umami's own token auth is the real boundary on
    those routes — but it re-enters the conditions of a failure that has already
    happened here once. Not settled until the verification below has been run
    against a live instance.
  - **Known consequence, independent of the browser question:** API clients that
    authenticate with a Bearer token and nothing else are now rejected by Caddy
    before Umami sees them. `after-hours-analysis-v2.py` and anything shaped like
    it must send the basic-auth credentials as well, or they 401 at
    `/api/auth/login`.
  - **Verify after applying, in a fresh incognito window** — cached basic-auth in
    your normal window hides exactly this failure: (1) log into the dashboard and
    open a report with a date range; (2) confirm a pageview and an
    `appointment_click` land from the production site; (3) run the analysis
    script. If (1) fails, add the specific SPA routes to `@public`; do not
    restore the blanket `/api/*`.
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
