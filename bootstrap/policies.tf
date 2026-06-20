###############################################################################
# Permission policies for the plan and apply roles.
# Scoped to the actual NextGen Dental resources + the state backend.
# No "*" resource wildcards except where the AWS API genuinely requires it
# (CloudFront and some ACM/Route53 list actions are not resource-scopable).
###############################################################################

locals {
  account_id    = "025037641706"
  site_bucket   = "nextgendentalaustintx-website"
  state_bucket  = aws_s3_bucket.tfstate.arn
  lock_table    = aws_dynamodb_table.tflock.arn
  zone_arn      = "arn:aws:route53:::hostedzone/Z0521096EYJDRL5ITYES"
  cert_arn      = "arn:aws:acm:us-east-1:025037641706:certificate/fd9f111a-aedf-4b5a-9317-3efccc1c4b25"
}

# Shared: state backend access (both roles need to read/write state + lock)
data "aws_iam_policy_document" "state_access" {
  statement {
    sid     = "StateBucket"
    effect  = "Allow"
    actions = ["s3:ListBucket"]
    resources = [local.state_bucket]
  }
  statement {
    sid     = "StateObjects"
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${local.state_bucket}/*"]
  }
  statement {
    sid     = "StateLock"
    effect  = "Allow"
    actions = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
    resources = [local.lock_table]
  }
}

# Read-only across the managed resources (for plan)
data "aws_iam_policy_document" "read_resources" {
  statement {
    sid     = "S3Read"
    effect  = "Allow"
    actions = [
      "s3:GetBucketPolicy", "s3:GetBucketAcl", "s3:GetBucketCORS",
      "s3:GetBucketWebsite", "s3:GetBucketVersioning", "s3:GetBucketLocation",
      "s3:GetBucketPublicAccessBlock", "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration", "s3:GetBucketTagging", "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${local.site_bucket}",
      "arn:aws:s3:::${local.site_bucket}/*",
    ]
  }
  statement {
    sid       = "CloudFrontRead"
    effect    = "Allow"
    actions   = [
      "cloudfront:GetDistribution", "cloudfront:GetDistributionConfig",
      "cloudfront:ListDistributions", "cloudfront:GetOriginAccessControl",
      "cloudfront:ListOriginAccessControls", "cloudfront:GetFunction",
      "cloudfront:DescribeFunction", "cloudfront:ListFunctions",
      "cloudfront:ListTagsForResource",
    ]
    resources = ["*"] # CloudFront actions are not resource-scopable
  }
  statement {
    sid       = "Route53Read"
    effect    = "Allow"
    actions   = ["route53:GetHostedZone", "route53:ListResourceRecordSets", "route53:ListTagsForResource"]
    resources = [local.zone_arn]
  }
  statement {
    sid       = "Route53List"
    effect    = "Allow"
    actions   = ["route53:ListHostedZones"]
    resources = ["*"] # list is account-wide, not scopable
  }
  statement {
    sid       = "ACMRead"
    effect    = "Allow"
    actions   = ["acm:DescribeCertificate", "acm:ListCertificates", "acm:ListTagsForCertificate"]
    resources = ["*"] # ListCertificates not scopable; DescribeCertificate scoped below is fine too
  }
}

# Write actions (for apply) — supersets of read
data "aws_iam_policy_document" "write_resources" {
  statement {
    sid       = "S3Write"
    effect    = "Allow"
    actions   = [
      "s3:PutBucketPolicy", "s3:DeleteBucketPolicy",
      "s3:PutBucketPublicAccessBlock", "s3:PutEncryptionConfiguration",
      "s3:PutBucketVersioning", "s3:PutBucketTagging",
      "s3:PutObject", "s3:DeleteObject",
    ]
    resources = [
      "arn:aws:s3:::${local.site_bucket}",
      "arn:aws:s3:::${local.site_bucket}/*",
    ]
  }
  statement {
    sid       = "CloudFrontWrite"
    effect    = "Allow"
    actions   = [
      "cloudfront:UpdateDistribution", "cloudfront:CreateInvalidation",
      "cloudfront:UpdateOriginAccessControl", "cloudfront:UpdateFunction",
      "cloudfront:PublishFunction", "cloudfront:TagResource", "cloudfront:UntagResource",
    ]
    resources = ["*"]
  }
  statement {
    sid       = "Route53Write"
    effect    = "Allow"
    actions   = ["route53:ChangeResourceRecordSets"]
    resources = [local.zone_arn]
  }
  statement {
    sid       = "Route53ChangeStatus"
    effect    = "Allow"
    actions   = ["route53:GetChange"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "state_access" {
  name   = "nextgendental-tf-state-access"
  policy = data.aws_iam_policy_document.state_access.json
}

resource "aws_iam_policy" "read_resources" {
  name   = "nextgendental-tf-read"
  policy = data.aws_iam_policy_document.read_resources.json
}

resource "aws_iam_policy" "write_resources" {
  name   = "nextgendental-tf-write"
  policy = data.aws_iam_policy_document.write_resources.json
}

# plan role: state + read
resource "aws_iam_role_policy_attachment" "plan_state" {
  role       = aws_iam_role.tf_plan.name
  policy_arn = aws_iam_policy.state_access.arn
}
resource "aws_iam_role_policy_attachment" "plan_read" {
  role       = aws_iam_role.tf_plan.name
  policy_arn = aws_iam_policy.read_resources.arn
}

# apply role: state + read + write
resource "aws_iam_role_policy_attachment" "apply_state" {
  role       = aws_iam_role.tf_apply.name
  policy_arn = aws_iam_policy.state_access.arn
}
resource "aws_iam_role_policy_attachment" "apply_read" {
  role       = aws_iam_role.tf_apply.name
  policy_arn = aws_iam_policy.read_resources.arn
}
resource "aws_iam_role_policy_attachment" "apply_write" {
  role       = aws_iam_role.tf_apply.name
  policy_arn = aws_iam_policy.write_resources.arn
}

output "plan_role_arn" {
  value = aws_iam_role.tf_plan.arn
}
output "apply_role_arn" {
  value = aws_iam_role.tf_apply.arn
}
output "state_bucket_name" {
  value = aws_s3_bucket.tfstate.bucket
}
output "lock_table_name" {
  value = aws_dynamodb_table.tflock.name
}
