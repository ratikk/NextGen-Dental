###############################################################################
# Stack: ANALYTICS PILOT -> analytics.nextgendentalaustintx.com
# Self-hosted Umami (cookieless, no-PHI event contract) on one dedicated
# t4g.small + Docker Compose (umami + postgres16 + caddy). NEW stack, no
# imports, touches no existing resources. See docs/ANALYTICS.md and the
# reviewed architecture proposal. PLAN-ONLY until "Approve Terraform apply".
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "nextgendental-tfstate"
    key            = "analytics/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "nextgendental-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-2"
}

# NOTE: no data sources that require EC2/Route53/STS read permissions —
# the tf-plan role stays least-privilege. VPC, subnet, and a PINNED AMI are
# supplied via terraform.tfvars (committed; none are secrets). Pinning the
# AMI also makes plans deterministic (no most_recent drift).

# ---------- network ----------
resource "aws_security_group" "analytics" {
  name        = "analytics-umami"
  description = "Umami analytics: HTTPS only; admin via SSM (no SSH)"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS (tracker endpoint must be publicly reachable)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTP for Lets Encrypt HTTP-01 + redirect to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Project = "nextgendental-analytics" }
}

# ---------- secrets (values set out-of-band; never in state outputs or git) ----------
resource "aws_ssm_parameter" "pg_password" {
  name  = "/nextgendental/analytics/pg_password"
  type  = "SecureString"
  value = var.bootstrap_secret_placeholder
  lifecycle { ignore_changes = [value] } # real value set via console/CLI after apply
}

resource "aws_ssm_parameter" "app_secret" {
  name  = "/nextgendental/analytics/app_secret"
  type  = "SecureString"
  value = var.bootstrap_secret_placeholder
  lifecycle { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "dash_basicauth" {
  name  = "/nextgendental/analytics/dash_basicauth_hash"
  type  = "SecureString"
  value = var.bootstrap_secret_placeholder
  lifecycle { ignore_changes = [value] }
}

# ---------- IAM (least privilege) ----------
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "analytics" {
  name               = "analytics-umami-instance"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.analytics.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "scoped" {
  statement {
    sid       = "ReadOwnSecrets"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:us-east-2:${var.account_id}:parameter/nextgendental/analytics/*"]
  }
  statement {
    sid       = "WriteBackups"
    actions   = ["s3:PutObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
  }
  statement {
    sid       = "PushLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.analytics.arn}:*"]
  }
}

resource "aws_iam_role_policy" "scoped" {
  name   = "analytics-scoped"
  role   = aws_iam_role.analytics.id
  policy = data.aws_iam_policy_document.scoped.json
}

resource "aws_iam_instance_profile" "analytics" {
  name = "analytics-umami-instance"
  role = aws_iam_role.analytics.name
}

# ---------- backups ----------
resource "aws_s3_bucket" "backups" {
  bucket = "nextgendental-analytics-backups"
  tags   = { Project = "nextgendental-analytics" }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-dumps"
    status = "Enabled"
    filter { prefix = "pgdump/" }
    expiration { days = 35 }
    noncurrent_version_expiration { noncurrent_days = 7 }
  }
}

# ---------- compute ----------
resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.analytics.availability_zone
  size              = 20
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "analytics-umami-data", Project = "nextgendental-analytics", Snapshot = "analytics-weekly" }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdb"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.analytics.id
}

resource "aws_instance" "analytics" {
  ami                    = var.ami_id
  instance_type          = "t4g.small"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.analytics.id]
  iam_instance_profile   = aws_iam_instance_profile.analytics.name
  user_data              = file("${path.module}/user-data.sh")

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }
  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }
  tags = { Name = "analytics-umami", Project = "nextgendental-analytics" }
}

resource "aws_eip" "analytics" {
  instance = aws_instance.analytics.id
  domain   = "vpc"
  tags     = { Name = "analytics-umami", Project = "nextgendental-analytics" }
}

resource "aws_route53_record" "analytics" {
  zone_id = var.zone_id
  name    = "analytics.nextgendentalaustintx.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.analytics.public_ip]
}

# ---------- snapshots (weekly, 4 kept) ----------
resource "aws_iam_role" "dlm" {
  name               = "analytics-dlm"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "dlm.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "weekly" {
  description        = "Weekly snapshot of analytics data volume"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"
  policy_details {
    resource_types = ["VOLUME"]
    target_tags    = { Snapshot = "analytics-weekly" }
    schedule {
      name = "weekly"
      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["07:00"]
      }
      retain_rule { count = 7 }
      copy_tags = true
    }
  }
}

# ---------- monitoring ----------
resource "aws_cloudwatch_log_group" "analytics" {
  name              = "/nextgendental/analytics"
  retention_in_days = 30
}

resource "aws_sns_topic" "alerts" {
  name = "nextgendental-analytics-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "status" {
  alarm_name          = "analytics-instance-status"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions          = { InstanceId = aws_instance.analytics.id }
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
