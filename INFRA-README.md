# NextGen Dental — Multi-Environment IaC (dev / stg / prd)

Bring the live prod site under Terraform via import, stand up dev + stg as new
stacks, and deploy via branch-mapped GitHub Actions with OIDC (no stored secrets).

## Environments

| Env | Branch | Bucket | Domain | Terraform | Apply gating |
|-----|--------|--------|--------|-----------|--------------|
| dev | `dev`  | `nextgendentalaustintx-website-dev` | dev.nextgendentalaustintx.com | new (create) | auto |
| stg | `stg`  | `nextgendentalaustintx-website-stg` | stg.nextgendentalaustintx.com | new (create) | auto |
| prd | `main` | `nextgendentalaustintx-website` (existing) | nextgendentalaustintx.com | IMPORT | manual approval |

- App config: **rebuild per env** via `.env.dev` / `.env.stg` / `.env.production`.
- TLS: one **wildcard** `*.nextgendentalaustintx.com` cert (us-east-1) for dev+stg.
  prd keeps its existing dedicated cert (wildcards don't cover the apex).
- `main` stays the production branch; the *environment* is named `prd`.

## Layout
```
infra/
  modules/static-site/   # reusable bucket+CF+OAC+function+DNS (A+AAAA)
  shared/cert.tf         # wildcard ACM cert + DNS validation (own state)
  environments/
    dev/  stg/           # new stacks, call the module
    prd/                 # import blocks + inline resources matching live config
.github/workflows/
  terraform.yml          # plan on PR / apply per env (prd gated)
  deploy-site.yml        # branch -> env: build, sync, invalidate
bootstrap/               # one-time: OIDC roles + state backend (admin CLI)
CLAUDE.md                # full inventory + strategy for Claude Code
```

## Run order

1. **Fill in `<ORG>/NextGen-Dental`** in CLAUDE.md and bootstrap var.
2. **Bootstrap** (once, admin CLI — NOT the EC2 instance role):
   ```
   cd bootstrap && terraform init && terraform apply -var 'github_repo=<ORG>/NextGen-Dental'
   ```
   This file ships the base tf-plan/tf-apply + state backend. Claude Code should
   EXTEND it (bootstrap/multienv-roles.tf) to add the per-env apply + deploy roles
   listed in main.tf's note, each trust-scoped to its branch/environment and
   permission-scoped to that env's resources only.
3. **GitHub**: create protected environment `prd` with a required reviewer.
   (dev/stg environments can exist without protection for auto-apply.)
4. **Shared cert**: `cd infra/shared && terraform init && terraform apply`
   Note the output `wildcard_certificate_arn`.
5. **dev/stg**: in each env dir, `terraform init && terraform apply -var "wildcard_certificate_arn=<arn>"`.
6. **prd import**: let Claude Code finish + validate (see prompt below) until
   `terraform plan` shows NO changes, then merge to apply.

## KICKOFF PROMPT for Claude Code

> Read CLAUDE.md fully first. This repo has a multi-env IaC skeleton under infra/.
> Your tasks, in order, each as a reviewable PR:
>
> 1. PRD IMPORT (highest priority, touches live infra — be careful):
>    In infra/environments/prd, complete and verify the import. Specifically:
>    - Fetch the live CloudFront function: `aws cloudfront get-function --name RewriteToIndexHtml`
>      and paste its EXACT code into the resource; fix the runtime if needed.
>    - Get the function ETag and complete the import id ("RewriteToIndexHtml,<ETag>").
>    - Run `terraform init && terraform plan` and iterate the resource blocks until
>      the plan IMPORTS the existing resources with NO creates/replacements/changes.
>      Reconcile every attribute against the get-distribution-config output in CLAUDE.md.
>    - Do NOT add www or AAAA records (model apex-A only). Definition of done:
>      clean plan.
>
> 2. BOOTSTRAP per-env roles: extend bootstrap/ with multienv-roles.tf creating
>    tf-apply-{dev,stg,prd} and deploy-{dev,stg,prd} roles. Trust scoping:
>    dev->ref:refs/heads/dev, stg->ref:refs/heads/stg, prd->environment:prd.
>    Permission-scope each to ONLY its env's bucket + distribution + the shared
>    state backend. No "*" resource wildcards except where CloudFront/ACM APIs
>    require it.
>
> 3. Verify dev/stg roots `terraform validate` and that the module produces the
>    intended A+AAAA records for the new subdomains.
>
> 4. Confirm the two workflows reference role ARNs that match what bootstrap
>    creates; fix any mismatch.
>
> Work incrementally, show plans before applies, and surface anything ambiguous
> rather than guessing. Never apply to prd outside the gated workflow.

## Promotion model
- App code: merge `dev` -> `stg` -> `main`; each push rebuilds with that env's
  config and deploys to that env's bucket + invalidates its distribution.
- Infra: change the module or an env root, PR runs `plan`, merge runs `apply`
  (prd gated). Same module across envs keeps behaviour identical.
