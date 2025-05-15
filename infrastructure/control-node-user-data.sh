#!/bin/bash
# Control Node Setup

# Update system
dnf update -y
dnf install -y epel-release

# Install required packages
dnf install -y ansible git python3-pip

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Install Terraform
dnf install -y yum-utils
yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
dnf install -y terraform

# Create ansible directory structure
mkdir -p /etc/ansible/playbooks
mkdir -p /etc/ansible/inventory

# Create base inventory
cat > /etc/ansible/inventory/dental_sites << 'EOL'
[lilacdental]
lilacdental.app ansible_host=LILACDENTAL_IP

[dental_sites:children]
lilacdental
EOL

# Create base playbook
cat > /etc/ansible/playbooks/deploy_dental_site.yml << 'EOL'
---
- hosts: dental_sites
  become: yes
  tasks:
    - name: Update system packages
      dnf:
        name: "*"
        state: latest
        
    - name: Install required packages
      dnf:
        name:
          - nginx
          - nodejs
        state: present

    - name: Configure nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/conf.d/dental_site.conf
      notify: restart nginx

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
EOL