# NextGen Dental — CI/CD Architecture & Runbooks

Last updated: 2026-08-05. Owner/approver: @ratikk. Status: pipeline code merged,
awaiting bootstrap (see Setup Checklist).

## Architecture

```
PR -> pr-validation.yml   (Gate 2: install, build, checks — no AWS access)
        |
merge to main -> deploy.yml
        |
  [build]      clean build, ONE artifact: site.tar.gz + sha256 + manifest.json
        |
  [staging]    GitHub env `dev` -> OIDC role deploy-dev
               store artifact in s3://nextgendental-releases/releases/<sha>/
               sync to dev bucket, invalidate dev CF, smoke tests   (Gate 3)
        |
  [production] GitHub env `production` (PROTECTED, @ratikk approves) (Gate 4)
               download SAME artifact, verify sha256 — never rebuilds
               one-time backup of pre-CI/CD prod -> backups/initial/
               sync (no deletes) -> validate manifest -> delete stale
               TARGETED CloudFront invalidation (manifest diff)
               prod smoke tests (Gate 5) -> record pointers/production.json
```

Rollback: `rollback.yml` (Actions -> rollback -> Run workflow). Restores the
previous release (or any SHA, or `initial`), full invalidation, smoke tests.
Target recovery time: < 10 minutes including approval.

### Environments & AWS access

| GitHub env  | Purpose            | OIDC role (account 025037641706)              | Can touch                              |
|-------------|--------------------|-----------------------------------------------|----------------------------------------|
| (none)      | PR validation      | none — no AWS access                          | nothing                                |
| `dev`       | staging deploy     | github-actions-nextgendental-deploy-dev       | dev bucket, releases/, dev CF          |
| `production`| prod deploy (gated)| github-actions-nextgendental-deploy-prd       | prod bucket, releases read, CF E2UFM…  |

No AWS keys are stored anywhere. Trust policies pin the repo and GitHub
environment; restrict both environments to the `main` branch in settings.

### Caching / headers
- Non-HTML (incl. hashed `/_astro/*`): `public, max-age=31536000, immutable`
- HTML: `no-cache, no-store, must-revalidate`
- Invalidation: computed from manifest diff (changed/removed files + clean-URL
  variants); falls back to `/*` when >25 paths or no previous manifest.

## Setup Checklist (one-time, in order)

1. **Bootstrap IAM + state (local, admin AWS CLI — NOT the EC2 role):**
   ```
   cd bootstrap
   terraform init
   terraform plan  -var 'github_repo=ratikk/NextGen-Dental'   # review!
   terraform apply -var 'github_repo=ratikk/NextGen-Dental'
   ```
   If the GitHub OIDC provider doesn't exist yet in the account, add
   `-var 'create_oidc_provider=true'`.
2. **Shared wildcard cert:** `cd infra/shared && terraform init && terraform apply`
   -> note `wildcard_certificate_arn` output.
3. **Dev stack:** `cd infra/environments/dev && terraform init &&
   terraform apply -var 'wildcard_certificate_arn=<arn>'`
   -> note `distribution_id` output.
4. **Tighten dev role:** re-apply bootstrap with
   `-var 'dev_distribution_id=<ID>'` (plus github_repo var).
5. **GitHub environments** (Settings -> Environments):
   - `dev`: no reviewers; deployment branches: `main` only.
     Environment variable `DEV_DISTRIBUTION_ID=<ID from step 3>`.
   - `production`: required reviewer **ratikk**; deployment branches: `main` only.
6. **Repository variables** (Settings -> Secrets and variables -> Actions -> Variables):
   `PUBLIC_RECAPTCHA_SITE_KEY`, `PUBLIC_LAMBDA_ENDPOINT`,
   `PUBLIC_GOOGLE_REVIEWS_ENDPOINT`, `PUBLIC_GOOGLE_ADS_ID`
   (same non-secret values as the `.env` on EC2 — these are PUBLIC_ build-time
   values, not secrets; never put actual secrets in repo variables).
7. **Branch protection** on `main` (Settings -> Branches): require a pull
   request before merging; require status check `validate` (pr-validation).
8. **Notifications:** GitHub emails you on failed runs of your workflows by
   default (Settings -> Notifications -> Actions). Environment approval
   requests also arrive by email.

## Node version
CI uses Node 20 (dependencies require >=20; EC2's Node 18 is EOL). Local dev
should use Node 20+ as well.

## Emergency manual deployment (fallback — preserved from EC2)
Only if GitHub/Actions is unavailable. From the EC2 host:
```
cd NextGen-Dental && git pull
./build_and_deploy_nextgen.sh
```
This is the legacy path: it rebuilds (not artifact-promoted) and invalidates
`/*`. Record what you deployed and reconcile pointers/production.json after.

## Rollback runbook
1. Actions -> rollback -> Run workflow. Leave `target` empty to restore the
   previously recorded release; or enter a commit SHA; or `initial` for the
   pre-CI/CD backup.
2. Approve the production environment prompt.
3. Workflow restores content, invalidates `/*`, runs smoke tests, updates the
   release pointer. Verify https://nextgendentalaustintx.com manually.
4. If Actions itself is down: from any machine with the prod deploy role or
   admin creds:
   ```
   aws s3 cp s3://nextgendental-releases/releases/<sha>/site.tar.gz . && \
   mkdir -p dist && tar -xzf site.tar.gz -C dist && \
   aws s3 sync dist/ s3://nextgendentalaustintx-website --delete && \
   aws cloudfront create-invalidation --distribution-id E2UFM2168GVUM7 --paths "/*"
   ```

## Troubleshooting
- **`Could not assume role`** — check the GitHub environment name matches the
  trust policy (`dev` / `production`), and the workflow job declares
  `environment:`; check deployment-branch restriction allows `main`.
- **Smoke tests fail on staging** — nothing reached production; fix and re-push.
- **Smoke tests fail on production** — run rollback (above), then investigate
  with the run logs and `releases/<sha>/manifest.json`.
- **Site works but forms/reviews are dead** — repository variables from step 6
  missing or wrong; check the build job's env.
- **npm audit advisory failures** — see BACKLOG.md; tighten pr-validation
  checks from advisory to blocking as issues are cleared.

## EC2 transition
EC2 remains the emergency fallback until the pipeline completes one staging
and one approved production deployment. After that, EC2 is not needed in the
deployment path (build happens in Actions; deploy via OIDC). Stopping or
terminating the instance is a separate decision requiring explicit approval —
do not automate it.

## Deliberately out of scope for this change
- `infra/environments/prd` import of live resources (separate, careful project)
- `stg` environment (skeleton exists; enable when needed)
- www + AAAA DNS records (documented gap, separate PR)
- S3 versioning on the production bucket (recommended; separate approval)
