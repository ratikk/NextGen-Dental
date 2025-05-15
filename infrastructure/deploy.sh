#!/bin/bash

# Build the site
npm run build

# Sync built files to EC2
aws s3 sync dist/ s3://lilacdental-artifacts/

# SSH to EC2 and deploy
ssh -i ~/.ssh/lilacdental-key.pem ec2-user@EC2_IP << 'ENDSSH'
aws s3 sync s3://lilacdental-artifacts/ /var/www/lilacdental/
sudo systemctl restart nginx
ENDSSH