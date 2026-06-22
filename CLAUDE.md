# CLAUDE.md — NextGen Dental Infrastructure-as-Code

## Goal
Bring the EXISTING, live AWS infrastructure for the NextGen Dental static website
under Terraform management via **import** (no recreation, zero downtime). Then
manage all future changes through GitHub Actions with OIDC (no stored secrets).

This is an **import-first** project. The resources below ALREADY EXIST. Do NOT
write config that would create duplicates. Use Terraform `import {}` blocks
(Terraform 1.5+) so `plan`/`apply` adopts existing resources into state.
A successful import is proven by `terraform plan` reporting **no changes**.

## AWS Account
- Account ID: `025037641706`
- Primary region: `us-east-2` (S3 bucket lives here)
- CloudFront/ACM region: `us-east-1` (REQUIRED for CloudFront certs)

## Live Resource Inventory (discovered via AWS CLI — verified)

| Resource | Identifier | Notes |
|---|---|---|
| S3 bucket | `nextgendentalaustintx-website` | us-east-2, PRIVATE, no static-website hosting (OAC origin) |
| S3 bucket policy | (on the bucket above) | Single statement: allows `cloudfront.amazonaws.com` GetObject+ListBucket, scoped by `AWS:SourceArn` to the distribution |
| CloudFront distribution | `E2UFM2168GVUM7` | domain `d15wr9dy6n9zt8.cloudfront.net`, Deployed |
| Origin Access Control (OAC) | `EPHYBRZ14PQNN` | sigv4 / signing always / type s3 |
| CloudFront Function | `RewriteToIndexHtml` | viewer-request event; ARN `arn:aws:cloudfront::025037641706:function/RewriteToIndexHtml` |
| ACM certificate | `arn:aws:acm:us-east-1:025037641706:certificate/fd9f111a-aedf-4b5a-9317-3efccc1c4b25` | us-east-1. USE AS DATA SOURCE — do NOT import/manage (risks recreation) |
| Cache policy | `658327ea-f89d-4fab-a63d-7e88639e58f6` | AWS-managed "CachingOptimized" — REFERENCE by id, never import |
| Route 53 hosted zone | `Z0521096EYJDRL5ITYES` | `nextgendentalaustintx.com.` |
| Route 53 record | apex A-alias | `nextgendentalaustintx.com` -> CloudFront (alias HZ `Z2FDTNDATAQYW2`) |

## Distribution config details to reproduce EXACTLY (for clean plan)
- Aliases: `nextgendentalaustintx.com`, `www.nextgendentalaustintx.com`
- Default cache behavior: target `S3-NextGenDental`, ViewerProtocolPolicy `redirect-to-https`,
  AllowedMethods HEAD+GET, Compress true, cache policy `658327ea-...`
- CloudFront Function assoc: `RewriteToIndexHtml` on viewer-request
- Custom error responses: 403 -> /index.html (200), 404 -> /index.html (200), ErrorCachingMinTTL 10
- Viewer cert: ACM cert above, sni-only, TLSv1.2_2021
- Geo restriction: **whitelist, US only** (do not omit)
- HTTP/2, IPv6 enabled, PriceClass_All
- DefaultRootObject: "" (empty — the CloudFront Function handles index rewrite)
- Origin: id `S3-NextGenDental`, domain `nextgendentalaustintx-website.s3.us-east-2.amazonaws.com`, OAC `EPHYBRZ14PQNN`

## KNOWN GAP — do not silently "fix" during import
The distribution lists `www.nextgendentalaustintx.com` as an alias and has IPv6
enabled, but Route 53 has ONLY the apex A-record. There is NO `www` record and
NO AAAA/IPv6 alias record today. To keep `plan` clean, model Route 53 as it
exists now (apex A-alias only). Adding `www` + AAAA is a SEPARATE, deliberate,
reviewable PR — not part of the import.

## What to import vs. reference
- IMPORT: s3 bucket, s3 bucket policy, cloudfront distribution, cloudfront OAC,
  cloudfront function, route53 zone, route53 apex A record.
- DATA SOURCE (do not manage): ACM certificate.
- REFERENCE BY ID (AWS-managed, never import): cache policy `658327ea-...`.

## Providers
Two AWS providers required:
- default → `us-east-2` (S3, Route53 is global but fine here)
- aliased `us_east_1` → `us-east-1` (ACM cert data source; CloudFront is global)

## State backend
S3 backend + DynamoDB lock (created in bootstrap, see below):
- state bucket: `nextgendental-tfstate` (us-east-2, versioned, public access blocked)
- lock table: `nextgendental-tflock` (PAY_PER_REQUEST, key `LockID`)

## Execution model (GitHub Actions + OIDC, no stored secrets)
- **Plan** runs on pull_request via role `github-actions-nextgendental-tf-plan` (read-only + state RW).
- **Apply** runs after merge, gated behind a PROTECTED GitHub Environment named
  `production` (manual approval required), via role `github-actions-nextgendental-tf-apply`.
- Repo: `ratikk/NextGen-Dental`  <-- FILL THIS IN; trust policies depend on it.

## Bootstrap (run ONCE, with admin/IAM-capable AWS CLI creds — NOT the EC2 instance role)
The EC2 instance role `ec2_s3_cloudfront_access` CANNOT perform IAM actions.
Bootstrap creates: GitHub OIDC provider (if missing), the two roles + least-priv
policies, the state bucket, the lock table. It uses LOCAL state (it cannot be
backed by the bucket it creates). See `bootstrap/`.

## Existing deploy workflow (from shell history — preserve this behavior)
Build then two-pass sync then invalidate:
1. `npm run build` -> outputs to `dist/`
2. `aws s3 sync dist/ s3://nextgendentalaustintx-website --delete` for immutable assets
   with `Cache-Control: public, max-age=31536000, immutable` (exclude *.html)
3. second `aws s3 sync` for *.html with `Cache-Control: no-cache, no-store, must-revalidate`
4. `aws cloudfront create-invalidation --distribution-id E2UFM2168GVUM7 --paths "/*"`

## Working agreement
- Import must produce a CLEAN plan (no changes) before any refactor.
- Do not introduce `*` wildcards in IAM policies; scope to the resources above.
- Open changes as PRs. Never apply directly to live infra outside the gated workflow.
