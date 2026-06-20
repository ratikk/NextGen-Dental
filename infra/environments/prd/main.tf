###############################################################################
# Environment: PRD  -> nextgendentalaustintx.com (LIVE, existing)
#
# IMPORT-FIRST. These resources already exist. The `import` blocks below adopt
# them into state. Goal: `terraform plan` shows NO changes.
#
# Differences from dev/stg:
#   - Uses the EXISTING dedicated cert (apex wildcards don't cover the apex).
#   - DNS today is apex A-alias ONLY (no AAAA, no www). We model that exactly
#     here, NOT via the module's A+AAAA DNS, to keep the plan clean. Adding
#     www + AAAA is a SEPARATE follow-up PR.
#
# NOTE: because prd's DNS differs from the module (module makes A+AAAA), this
# root defines the distribution/bucket via the module but OVERRIDES DNS. The
# cleanest path that the agent should implement: either (a) add a module flag
# `manage_dns`/`enable_ipv6` to suppress AAAA, or (b) inline the prd resources
# here matching the live config. See CLAUDE.md. The skeleton below uses inline
# resources to guarantee an exact match on import.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "nextgendental-tfstate"
    key            = "environments/prd/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "nextgendental-tflock"
    encrypt        = true
  }
}

provider "aws" { region = "us-east-2" }
provider "aws" { alias = "us_east_1", region = "us-east-1" }

locals {
  bucket_name = "nextgendentalaustintx-website"
  cert_arn    = "arn:aws:acm:us-east-1:025037641706:certificate/fd9f111a-aedf-4b5a-9317-3efccc1c4b25"
  zone_id     = "Z0521096EYJDRL5ITYES"
  dist_id     = "E2UFM2168GVUM7"
  oac_id      = "EPHYBRZ14PQNN"
}

# ===========================================================================
# IMPORT BLOCKS — adopt existing resources (no recreation)
# ===========================================================================
import {
  to = aws_s3_bucket.site
  id = "nextgendentalaustintx-website"
}
import {
  to = aws_s3_bucket_policy.site
  id = "nextgendentalaustintx-website"
}
import {
  to = aws_cloudfront_origin_access_control.site
  id = "EPHYBRZ14PQNN"
}
import {
  to = aws_cloudfront_function.rewrite
  # function import id format: name + "," + ETag. Agent must fetch the ETag:
  #   aws cloudfront describe-function --name RewriteToIndexHtml
  id = "RewriteToIndexHtml" # <-- append the live ETag: "RewriteToIndexHtml,E..."
}
import {
  to = aws_cloudfront_distribution.site
  id = "E2UFM2168GVUM7"
}
import {
  to = aws_route53_record.apex_a
  # route53 record import id: ZONEID_NAME_TYPE
  id = "Z0521096EYJDRL5ITYES_nextgendentalaustintx.com_A"
}

# ===========================================================================
# RESOURCE DEFINITIONS — must match live config EXACTLY for a clean plan.
# (Agent: reconcile against `get-distribution-config` output in CLAUDE.md.)
# ===========================================================================
resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "oac-nextgendentalaustintx-website.s3.us-east-2.amazo-mdvquai9emq"
  description                       = "Created by CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "RewriteToIndexHtml"
  runtime = "cloudfront-js-2.0" # agent: confirm runtime from describe-function
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.includes('.')) {
        request.uri += '/index.html';
      }
      return request;
    }
  EOT
  # IMPORTANT: the live function code must be fetched and pasted EXACTLY,
  # or plan will show a diff. Agent: `aws cloudfront get-function` to retrieve.
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2"
  price_class         = "PriceClass_All"
  aliases             = ["nextgendentalaustintx.com", "www.nextgendentalaustintx.com"]
  comment             = "nextgendentalaustintx-website"
  default_root_object = ""

  origin {
    domain_name              = "nextgendentalaustintx-website.s3.us-east-2.amazonaws.com"
    origin_id                = "S3-NextGenDental"
    origin_access_control_id = local.oac_id
  }

  default_cache_behavior {
    target_origin_id       = "S3-NextGenDental"
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US"]
    }
  }

  viewer_certificate {
    acm_certificate_arn      = local.cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "bucket" {
  statement {
    sid       = "AllowCloudFrontAccessViaOAC"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn, "${aws_s3_bucket.site.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.bucket.json
}

# DNS: apex A-alias ONLY (matches live). Do NOT add AAAA/www here — separate PR.
resource "aws_route53_record" "apex_a" {
  zone_id = local.zone_id
  name    = "nextgendentalaustintx.com"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

# TODO (separate PR): add www CNAME/alias + AAAA records once import is green.

output "distribution_id" { value = aws_cloudfront_distribution.site.id }
