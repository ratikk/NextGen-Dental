###############################################################################
# Environment: STG  -> stg.nextgendentalaustintx.com
# NEW stack (no import). `terraform apply` creates everything.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "nextgendental-tfstate"
    key            = "environments/stg/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "nextgendental-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-2"
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Wildcard cert ARN produced by infra/shared. Either hardcode after first apply
# or wire via remote state. Using a variable keeps it explicit.
variable "wildcard_certificate_arn" {
  type        = string
  description = "ARN of *.nextgendentalaustintx.com cert from infra/shared output."
}

locals {
  rewrite_function_code = <<-EOT
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
}

module "site" {
  source = "../../modules/static-site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  bucket_name         = "nextgendentalaustintx-website-stg"
  domain_names        = ["stg.nextgendentalaustintx.com"]
  acm_certificate_arn = var.wildcard_certificate_arn
  hosted_zone_id      = "Z0521096EYJDRL5ITYES"
  function_name       = "RewriteToIndexHtml-stg"
  function_code       = local.rewrite_function_code
  comment             = "nextgendentalaustintx-website-stg"
}

output "bucket_name"     { value = module.site.bucket_name }
output "distribution_id" { value = module.site.distribution_id }
