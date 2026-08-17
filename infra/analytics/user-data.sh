#!/bin/bash
# Analytics pilot bootstrap: Docker Compose stack (umami + postgres16 + caddy).
# Secrets are pulled from SSM at boot — never baked into this file or the AMI.
set -euo pipefail
dnf update -y
dnf install -y docker
systemctl enable --now docker
# Pinned: "latest" makes a rebuild non-reproducible and can pull an unreviewed
# release. Bump deliberately, never implicitly.
COMPOSE_VERSION=v2.29.7
curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
dnf install -y dnf-automatic
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

# ---- data volume ----------------------------------------------------------
# aws_volume_attachment depends on aws_instance, so the instance boots and runs
# this script BEFORE /dev/xvdb exists. Without this wait, mkfs/mount fail and
# `set -e` kills bootstrap silently — the instance comes up with no stack on it.
echo "waiting for data volume /dev/xvdb ..."
for _ in $(seq 1 60); do
  [ -b /dev/xvdb ] && break
  sleep 5
done
if [ ! -b /dev/xvdb ]; then
  echo "FATAL: /dev/xvdb not attached after 300s — aborting bootstrap" >&2
  exit 1
fi

blkid /dev/xvdb >/dev/null 2>&1 || mkfs -t xfs /dev/xvdb   # format ONLY if blank — protects data on instance replacement
mkdir -p /data && mount /dev/xvdb /data && echo '/dev/xvdb /data xfs defaults,nofail 0 2' >> /etc/fstab
mkdir -p /data/pg /data/caddy /opt/umami

# ---- secrets --------------------------------------------------------------
REGION=us-east-2
get() { aws ssm get-parameter --with-decryption --region "$REGION" --name "$1" --query Parameter.Value --output text; }
PGPASS=$(get /nextgendental/analytics/pg_password)
APPSECRET=$(get /nextgendental/analytics/app_secret)
BASICAUTH=$(get /nextgendental/analytics/dash_basicauth_hash)

# Terraform seeds these SSM parameters with a placeholder and relies on a human
# setting the real values afterwards. If the instance boots first, the
# placeholders get baked into docker-compose.yml and the Caddyfile, and later
# SSM edits do NOT re-render them. A placeholder in dash_basicauth_hash is also
# not a valid bcrypt hash, so Caddy refuses to start and the failure surfaces as
# an unrelated TLS/timeout symptom. Fail loudly here instead.
for pair in "pg_password:$PGPASS" "app_secret:$APPSECRET" "dash_basicauth_hash:$BASICAUTH"; do
  name=${pair%%:*}; value=${pair#*:}
  case "$value" in
    ""|None|CHANGE-ME*)
      echo "FATAL: SSM parameter $name still holds a placeholder or is empty." >&2
      echo "Populate all three parameters with real values BEFORE creating the instance." >&2
      exit 1
      ;;
  esac
done
case "$BASICAUTH" in
  '$2a$'*|'$2b$'*|'$2y$'*) : ;;
  *) echo "FATAL: dash_basicauth_hash is not a bcrypt hash — Caddy will not start." >&2; exit 1 ;;
esac

cat > /opt/umami/Caddyfile <<CADDY
analytics.nextgendentalaustintx.com {
  log {
    output file /data/caddy/access.log
  }
  # robots.txt must be readable WITHOUT credentials. It previously fell through to
  # basic_auth like everything else, so Googlebot got 401 and had no way to learn it
  # should stay out — Search Console reported this host under "Blocked due to
  # unauthorized request (401)" on 2026-08-10, the day after launch. The dashboard
  # itself stays behind auth; only this one file is public.
  # NOTE: Caddy does NOT interpret backslash-n inside quoted strings. Only an
  # escaped quote and an escaped backslash are escapes; everything else is literal,
  # so a backslash-n would be served as two characters and the file would contain
  # no Disallow rule at all — i.e. it would read as "crawl everything". The
  # newlines below are REAL, and the continuation lines MUST start at column 0 or
  # the indentation is served as part of the file.
  # (This comment avoids literal backslashes on purpose: it is written inside an
  # unquoted bash heredoc, which would collapse them on the way to disk.)
  handle /robots.txt {
    header Content-Type "text/plain; charset=utf-8"
    respond "User-agent: *
Disallow: /
" 200
  }

  # Only the endpoints the tracker actually needs. /api/* previously exposed every
  # present and FUTURE Umami API route unauthenticated, including admin ones —
  # removing the second auth layer the basic_auth block is there to provide.
  # Umami v2 collects on /api/send; if this stack is ever downgraded to v1, that
  # becomes /api/collect and must be added here or collection silently stops.
  @public path /api/send /script.js /site.webmanifest
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
    # PIN TO A DIGEST before treating this stack as reproducible. Read the digest
    # actually running today with:
    #   sudo docker images --digests | grep -E 'umami|postgres|caddy'
    # then replace this tag with image@sha256:<digest>. Left as a tag here because
    # inventing a digest that was never verified would be worse than none.
    image: ghcr.io/umami-software/umami:postgresql-latest
    environment:
      DATABASE_URL: postgresql://umami:${PGPASS}@db:5432/umami
      APP_SECRET: ${APPSECRET}
      DISABLE_TELEMETRY: 1
    depends_on: [db]
    restart: always
  db:
    image: postgres:16   # PIN TO DIGEST — see note above
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${PGPASS}
    volumes: ["/data/pg:/var/lib/postgresql/data"]
    restart: always
  caddy:
    image: caddy:2   # PIN TO DIGEST — see note above
    ports: ["80:80", "443:443"]
    volumes:
      - /opt/umami/Caddyfile:/etc/caddy/Caddyfile:ro
      - /data/caddy:/data
    restart: always
COMPOSE

# ---- log shipping ---------------------------------------------------------
# The IAM role and the /nextgendental/analytics log group already existed, but
# nothing was sending anything to them. cloud-init-output.log matters most: the
# FATAL guards above are only useful if someone can actually read them after a
# failed boot. Non-fatal by design — a logging problem must not prevent the
# analytics stack from starting.
{
  dnf install -y amazon-cloudwatch-agent
  cat > /opt/aws/amazon-cloudwatch-agent/etc/cw-analytics.json <<'CWCFG'
{
  "agent": { "run_as_user": "root" },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/cloud-init-output.log",
            "log_group_name": "/nextgendental/analytics",
            "log_stream_name": "{instance_id}/cloud-init-output",
            "retention_in_days": 30
          },
          {
            "file_path": "/data/caddy/access.log",
            "log_group_name": "/nextgendental/analytics",
            "log_stream_name": "{instance_id}/caddy-access",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
CWCFG
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/cw-analytics.json
} || echo "WARNING: CloudWatch agent setup failed — stack continues without log shipping" >&2

chmod 600 /opt/umami/Caddyfile /opt/umami/docker-compose.yml
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
