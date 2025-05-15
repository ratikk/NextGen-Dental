#!/bin/bash
# EC2 User Data script for Lilac Dental website

# Update system packages
yum update -y

# Install NGINX
amazon-linux-extras install nginx1 -y

# Start NGINX
systemctl start nginx
systemctl enable nginx

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create web directory
mkdir -p /var/www/lilacdental
chown -R ec2-user:ec2-user /var/www/lilacdental

# Configure NGINX
cat > /etc/nginx/conf.d/lilacdental.conf << 'EOL'
server {
    listen 80;
    server_name lilacdentalaustintx.com www.lilacdentalaustintx.com;
    root /var/www/lilacdental;
    
    location / {
        try_files $uri $uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires max;
        add_header Cache-Control "public, no-transform";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://*.pexels.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;";
}
EOL

# Restart NGINX
systemctl restart nginx