#!/bin/bash
# Application Server Setup

# Update system
dnf update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs

# Install NGINX
dnf install -y nginx

# Create application directory
mkdir -p /var/www/lilacdental
chown -R ec2-user:ec2-user /var/www/lilacdental

# Configure NGINX with security headers
cat > /etc/nginx/conf.d/lilacdental.conf << 'EOL'
server {
    listen 80;
    server_name lilacdentalaustintx.com www.lilacdentalaustintx.com;
    root /var/www/lilacdental;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://*.pexels.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;";
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOL

# Start services
systemctl enable nginx
systemctl start nginx