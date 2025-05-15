resource "aws_acm_certificate" "cert" {
  provider          = aws.us-east-1
  domain_name       = "lilacdentalaustintx.com"
  validation_method = "DNS"
  subject_alternative_names = ["www.lilacdentalaustintx.com"]

  tags = {
    Environment = "production"
  }

  lifecycle {
    create_before_destroy = true
  }
}