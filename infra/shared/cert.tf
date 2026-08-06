###############################################################################
# Shared: wildcard ACM certificate *.nextgendentalaustintx.com (us-east-1).
# Covers dev. and stg. (and any future subdomain). Does NOT cover the apex
# nextgendentalaustintx.com — prd keeps its existing dedicated cert.
#
# This is its own small Terraform root with its own state. Apply it ONCE
# before dev/stg, then feed the output ARN into those environments.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "nextgendental-tfstate"
    key            = "shared/cert.tfstate"
    region         = "us-east-2"
    dynamodb_table = "nextgendental-tflock"
    encrypt        = true
  }
}

# Cert for CloudFront MUST be in us-east-1.
provider "aws" {
  region = "us-east-1"
}

variable "hosted_zone_id" {
  type    = string
  default = "Z0521096EYJDRL5ITYES"
}

resource "aws_acm_certificate" "wildcard" {
  domain_name       = "*.nextgendentalaustintx.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records in Route53.
resource "aws_route53_record" "validation" {
  # The ACM validation CNAME for this domain already exists in Route 53
  # (created when the original production cert was validated — ACM reuses the
  # same record name/value per domain per account). Overwriting is safe and
  # required for a clean apply.
  allow_overwrite = true
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]
}

output "wildcard_certificate_arn" {
  value = aws_acm_certificate.wildcard.arn
}
