# IAM role for EC2
resource "aws_iam_role" "ec2_s3_access" {
  name = "ec2_s3_cloudfront_access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for S3 and CloudFront access
resource "aws_iam_role_policy" "s3_cloudfront_access" {
  name = "s3_cloudfront_access"
  role = aws_iam_role.ec2_s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.website.arn}",
          "${aws_s3_bucket.website.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [
          aws_cloudfront_distribution.website.arn
        ]
      }
    ]
  })
}

# Instance profile for the EC2 instance
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2_s3_cloudfront_profile"
  role = aws_iam_role.ec2_s3_access.name
}