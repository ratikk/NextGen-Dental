#!/bin/bash
# Analytics pilot bootstrap: Docker Compose stack (umami + postgres16 + caddy).
# Secrets are pulled from SSM at boot — never baked into this file or the AMI.
set -euo pipefail
dnf update -y
dnf install -y docker
systemctl enable --now docker
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" \
  -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
dnf install -y dnf-automatic
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

# data volume (postgres data + caddy state live here)
mkfs -t xfs -f /dev/xvdb || true
mkdir -p /data && mount /dev/xvdb /data && echo '/dev/xvdb /data xfs defaults,nofail 0 2' >> /etc/fstab
mkdir -p /data/pg /data/caddy /opt/umami

REGION=us-east-2
get() { aws ssm get-parameter --with-decryption --region "$REGION" --name "$1" --query Parameter.Value --output text; }
PGPASS=$(get /nextgendental/analytics/pg_password)
APPSECRET=$(get /nextgendental/analytics/app_secret)
BASICAUTH=$(get /nextgendental/analytics/dash_basicauth_hash)

cat > /opt/umami/Caddyfile <<CADDY
analytics.nextgendentalaustintx.com {
  log { output file /data/caddy/access.log }
  @public path /api/send /script.js
  handle @public {
    reverse_proxy umami:3000
  }
  handle {
    basic_auth {
      admin ${BASICAUTH}
    }
    reverse_proxy umami:3000
  }
}
CADDY

cat > /opt/umami/docker-compose.yml <<COMPOSE
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest   # PIN DIGEST at first boot review
    environment:
      DATABASE_URL: postgresql://umami:${PGPASS}@db:5432/umami
      APP_SECRET: ${APPSECRET}
      DISABLE_TELEMETRY: 1
    depends_on: [db]
    restart: always
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${PGPASS}
    volumes: ["/data/pg:/var/lib/postgresql/data"]
    restart: always
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - /opt/umami/Caddyfile:/etc/caddy/Caddyfile:ro
      - /data/caddy:/data
    restart: always
COMPOSE

cd /opt/umami && /usr/local/bin/docker-compose up -d

# nightly encrypted dump to S3 (bucket enforces SSE-KMS)
cat > /etc/cron.daily/pg-backup <<'CRON'
#!/bin/bash
set -euo pipefail
TS=$(date +%F)
docker exec umami-db-1 pg_dump -U umami umami | gzip | \
  aws s3 cp - "s3://nextgendental-analytics-backups/pgdump/umami-${TS}.sql.gz" --region us-east-2
CRON
chmod +x /etc/cron.daily/pg-backup
