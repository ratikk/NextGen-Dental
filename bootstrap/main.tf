###############################################################################
# BOOTSTRAP — run ONCE with admin/IAM-capable AWS CLI credentials.
# NOT runnable from the EC2 instance role (it cannot perform IAM actions).
# Uses LOCAL state on purpose: it creates the very bucket/table the main
# Terraform uses as its backend, so it cannot use that backend itself.
#
# Creates:
#   - GitHub OIDC provider (only if it does not already exist — see var)
#   - tf-plan role  (assumed on pull_request; read-only + state RW)
#   - tf-apply role (assumed on protected `production` env; write)
#   - state bucket + DynamoDB lock table
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Local state — do not configure a remote backend here.
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "github_repo" {
  type        = string
  description = "GitHub repo in 'org/name' form, e.g. acme/NextGen-Dental"
  # No default — must be provided so trust policies are correctly scoped.
}

# NOTE: This bootstrap file creates the original single tf-plan/tf-apply pair
# and the state backend. For the MULTI-ENVIRONMENT setup (dev/stg/prd), see
# bootstrap/multienv-roles.tf which adds per-env Terraform + deploy roles.
# The branch->role mapping the workflows expect:
#   github-actions-nextgendental-tf-plan        (PRs, all envs, read)
#   github-actions-nextgendental-tf-apply-dev   (branch dev,  write dev resources)
#   github-actions-nextgendental-tf-apply-stg   (branch stg,  write stg resources)
#   github-actions-nextgendental-tf-apply-prd   (env  prd,    write prd resources, gated)
#   github-actions-nextgendental-deploy-dev/stg/prd (site content sync per env)

variable "create_oidc_provider" {
  type        = bool
  default     = false
  description = "Set true only if the GitHub OIDC provider does NOT already exist in the account."
}

variable "state_bucket" {
  type    = string
  default = "nextgendental-tfstate"
}

variable "lock_table" {
  type    = string
  default = "nextgendental-tflock"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# --- GitHub OIDC provider: look up existing, or create if asked ---------------
data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  # GitHub's OIDC thumbprint; AWS now validates via its trust store, but the
  # field is still required. This is GitHub's documented value.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# --- State backend resources --------------------------------------------------
resource "aws_s3_bucket" "tfstate" {
  bucket = var.state_bucket
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "tflock" {
  name         = var.lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}

# --- Trust policies -----------------------------------------------------------
# plan role: any pull_request from the repo
data "aws_iam_policy_document" "plan_trust" {
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
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:pull_request"]
    }
  }
}

# apply role: only the protected `production` environment
data "aws_iam_policy_document" "apply_trust" {
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

resource "aws_iam_role" "tf_plan" {
  name               = "github-actions-nextgendental-tf-plan"
  assume_role_policy = data.aws_iam_policy_document.plan_trust.json
}

resource "aws_iam_role" "tf_apply" {
  name               = "github-actions-nextgendental-tf-apply"
  assume_role_policy = data.aws_iam_policy_document.apply_trust.json
}

# Permission policies live in policies.tf
