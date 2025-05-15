resource "aws_route53_zone" "main" {
  name = "lilacdentalaustintx.com"
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.lilacdentalaustintx.com"
  type    = "CNAME"
  ttl     = "300"
  records = ["d1w02wua5zb9o.cloudfront.net"]
}

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "lilacdentalaustintx.com"
  type    = "A"

  alias {
    name                   = "d1w02wua5zb9o.cloudfront.net"
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront's hosted zone ID
    evaluate_target_health = false
  }
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqnd]
}