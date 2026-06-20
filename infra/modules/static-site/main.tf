###############################################################################
# Module: static-site
# One S3 + CloudFront + OAC + Function + Route53 static site, parameterized.
# Used by all environments (dev, stg, prd). Behaviour is identical across envs;
# only inputs differ (bucket name, domain, cert ARN).
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws, aws.us_east_1]
    }
  }
}

# ---------- inputs ----------
variable "bucket_name" {
  type        = string
  description = "S3 bucket holding the built site."
}

variable "domain_names" {
  type        = list(string)
  description = "CloudFront aliases, e.g. [\"dev.nextgendentalaustintx.com\"]."
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM cert ARN in us-east-1 covering the domain_names."
}

variable "hosted_zone_id" {
  type        = string
  description = "Route53 hosted zone id for nextgendentalaustintx.com."
}

variable "function_name" {
  type        = string
  description = "Name of the CloudFront viewer-request function (rewrite-to-index)."
}

variable "function_code" {
  type        = string
  description = "JS source for the CloudFront function."
}

variable "comment" {
  type        = string
  default     = ""
  description = "Distribution comment."
}

variable "geo_restriction_locations" {
  type        = list(string)
  default     = ["US"]
  description = "Whitelisted country codes."
}

variable "price_class" {
  type    = string
  default = "PriceClass_All"
}

# AWS-managed CachingOptimized policy id — referenced, never created.
variable "cache_policy_id" {
  type    = string
  default = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}

# ---------- bucket ----------
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------- OAC ----------
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "oac-${var.bucket_name}"
  description                       = "OAC for ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------- function (rewrite to index.html) ----------
resource "aws_cloudfront_function" "rewrite" {
  name    = var.function_name
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite clean URLs to index.html"
  publish = true
  code    = var.function_code
}

# ---------- distribution ----------
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2"
  price_class         = var.price_class
  aliases             = var.domain_names
  comment             = var.comment
  default_root_object = ""

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "S3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-${var.bucket_name}"
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = var.cache_policy_id

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
      locations        = var.geo_restriction_locations
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ---------- bucket policy (OAC read, scoped to this distribution) ----------
data "aws_iam_policy_document" "bucket" {
  statement {
    sid     = "AllowCloudFrontAccessViaOAC"
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:ListBucket"]
    resources = [
      aws_s3_bucket.site.arn,
      "${aws_s3_bucket.site.arn}/*",
    ]
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

# ---------- DNS: apex/sub A + AAAA aliases to the distribution ----------
resource "aws_route53_record" "a" {
  for_each = toset(var.domain_names)
  zone_id  = var.hosted_zone_id
  name     = each.value
  type     = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = "Z2FDTNDATAQYW2" # CloudFront's fixed alias zone
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "aaaa" {
  for_each = toset(var.domain_names)
  zone_id  = var.hosted_zone_id
  name     = each.value
  type     = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

# ---------- outputs ----------
output "bucket_name"     { value = aws_s3_bucket.site.bucket }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
output "domain_names"    { value = var.domain_names }
