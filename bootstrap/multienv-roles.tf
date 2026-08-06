###############################################################################
# MULTI-ENV DEPLOY ROLES + RELEASES BUCKET
# Extends bootstrap/main.tf (run together: terraform apply in bootstrap/).
#
# Creates:
#   - releases bucket (immutable build artifacts, manifests, pointers, backups)
#   - deploy-dev role  (GitHub environment `dev`        -> staging deploy)
#   - deploy-prd role  (GitHub environment `production` -> production deploy)
#
# Trust model: OIDC sub claim pinned to this repo + GitHub *environment*
# (not branch), because the deploy workflow's jobs run inside environments.
# Restrict each GitHub environment to the `main` branch in repo settings so
# only main can reach these roles.
###############################################################################

variable "releases_bucket" {
  type    = string
  default = "nextgendental-releases"
}

# Dev CloudFront distribution id is unknown until infra/environments/dev is
# applied. Default "*" lets the first bootstrap apply succeed; AFTER the dev
# stack exists, re-apply bootstrap with:
#   -var 'dev_distribution_id=<ID>'
# to tighten the invalidation permission to that one distribution.
variable "dev_distribution_id" {
  type    = string
  default = "*"
}

variable "prd_distribution_id" {
  type    = string
  default = "E2UFM2168GVUM7"
}

locals {
  dev_bucket       = "nextgendentalaustintx-website-dev"
  releases_arn     = aws_s3_bucket.releases.arn
  dev_dist_arn     = "arn:aws:cloudfront::${local.account_id}:distribution/${var.dev_distribution_id}"
  prd_dist_arn     = "arn:aws:cloudfront::${local.account_id}:distribution/${var.prd_distribution_id}"
}

# --- Releases bucket: immutable artifacts + manifests + pointers + backups ---
resource "aws_s3_bucket" "releases" {
  bucket = var.releases_bucket
}

resource "aws_s3_bucket_versioning" "releases" {
  bucket = aws_s3_bucket.releases.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "releases" {
  bucket                  = aws_s3_bucket.releases.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "releases" {
  bucket = aws_s3_bucket.releases.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Keep release artifacts 180 days (rollback window); keep pointers and the
# initial pre-CI/CD backup indefinitely.
resource "aws_s3_bucket_lifecycle_configuration" "releases" {
  bucket = aws_s3_bucket.releases.id
  rule {
    id     = "expire-old-releases"
    status = "Enabled"
    filter {
      prefix = "releases/"
    }
    expiration {
      days = 180
    }
  }
  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# --- Trust policies (per GitHub environment) ---------------------------------
data "aws_iam_policy_document" "deploy_dev_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:dev"]
    }
  }
}

data "aws_iam_policy_document" "deploy_prd_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:production"]
    }
  }
}

# --- deploy-dev permissions --------------------------------------------------
# Staging deploy: RW dev site bucket, write release artifacts, invalidate the
# dev distribution. NO access to the production bucket or distribution.
data "aws_iam_policy_document" "deploy_dev" {
  statement {
    sid       = "DevBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = ["arn:aws:s3:::${local.dev_bucket}"]
  }
  statement {
    sid       = "DevBucketObjects"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${local.dev_bucket}/*"]
  }
  statement {
    sid       = "ReleasesList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [local.releases_arn]
  }
  statement {
    sid       = "ReleasesWriteArtifacts"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${local.releases_arn}/releases/*"]
  }
  statement {
    sid       = "DevInvalidation"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [local.dev_dist_arn]
  }
}

# --- deploy-prd permissions --------------------------------------------------
# Production deploy: read release artifacts, RW production site bucket,
# write pointers/backups, invalidate ONLY the production distribution.
data "aws_iam_policy_document" "deploy_prd" {
  statement {
    sid       = "ProdBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = ["arn:aws:s3:::${local.site_bucket}"]
  }
  statement {
    sid       = "ProdBucketObjects"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${local.site_bucket}/*"]
  }
  statement {
    sid       = "ReleasesList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [local.releases_arn]
  }
  statement {
    sid       = "ReleasesRead"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${local.releases_arn}/releases/*", "${local.releases_arn}/backups/*"]
  }
  statement {
    sid       = "ReleasesWritePointersBackups"
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${local.releases_arn}/pointers/*", "${local.releases_arn}/backups/*"]
  }
  statement {
    sid       = "ProdInvalidation"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [local.prd_dist_arn]
  }
}

# --- Roles -------------------------------------------------------------------
resource "aws_iam_role" "deploy_dev" {
  name               = "github-actions-nextgendental-deploy-dev"
  assume_role_policy = data.aws_iam_policy_document.deploy_dev_trust.json
}

resource "aws_iam_role" "deploy_prd" {
  name               = "github-actions-nextgendental-deploy-prd"
  assume_role_policy = data.aws_iam_policy_document.deploy_prd_trust.json
}

resource "aws_iam_role_policy" "deploy_dev" {
  name   = "deploy-dev-permissions"
  role   = aws_iam_role.deploy_dev.id
  policy = data.aws_iam_policy_document.deploy_dev.json
}

resource "aws_iam_role_policy" "deploy_prd" {
  name   = "deploy-prd-permissions"
  role   = aws_iam_role.deploy_prd.id
  policy = data.aws_iam_policy_document.deploy_prd.json
}

output "deploy_dev_role_arn" {
  value = aws_iam_role.deploy_dev.arn
}
output "deploy_prd_role_arn" {
  value = aws_iam_role.deploy_prd.arn
}
output "releases_bucket_name" {
  value = aws_s3_bucket.releases.bucket
}
