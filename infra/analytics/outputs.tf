output "analytics_url" {
  value = "https://analytics.nextgendentalaustintx.com"
}

output "instance_id" {
  value = aws_instance.analytics.id
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.bucket
}
# Deliberately NO secret outputs.
