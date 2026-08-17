#!/bin/bash
# Analytics bootstrap, stage 1 (runs once, from cloud-init).
#
# Stage 1 does ONLY what cannot fail for environmental reasons: install
# packages, start CloudWatch log shipping, and register a RETRYABLE systemd
# unit. Everything fragile — waiting for the EBS volume, waiting for real
# secrets, rendering config, starting containers — lives in stage 2
# (/opt/umami/bootstrap.sh) so it can be retried instead of leaving a
# half-built instance behind.
#
# Why the split: aws_volume_attachment depends on aws_instance, so the volume
# attaches AFTER this script starts; and Terraform seeds the SSM secrets with
# placeholders that a human replaces later. Neither ordering is under this
# script's control, and a one-shot bootstrap turns both into a dead instance.
set -euo pipefail

# ---------------------------------------------------------------------------
# Image versions. NOT REPRODUCIBLE YET — these are mutable tags.
# Digests are deliberately NOT invented here. Capture the ones actually running:
#     sudo docker images --digests | grep -E 'umami|postgres|caddy'
# then replace each tag below with image@sha256:<digest> and commit the result.
# Until that is done, a rebuild may pull a version nobody reviewed.
# ---------------------------------------------------------------------------
UMAMI_IMAGE="ghcr.io/umami-software/umami:postgresql-latest"
POSTGRES_IMAGE="postgres:16"
CADDY_IMAGE="caddy:2"

# The compose BINARY is genuinely pinned.
COMPOSE_VERSION=v2.29.7

dnf update -y
dnf install -y docker
systemctl enable --now docker
curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
  -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
dnf install -y dnf-automatic
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

mkdir -p /opt/umami

# ---- log shipping FIRST ---------------------------------------------------
# Installed before anything that can fail, so stage 2's failure messages are
# shipped rather than trapped on a box nobody can reach. retention_in_days is
# deliberately absent: Terraform owns the log group's retention, and the
# instance role has only CreateLogStream + PutLogEvents, not PutRetentionPolicy.
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
            "log_stream_name": "{instance_id}/cloud-init-output"
          },
          {
            "file_path": "/var/log/umami-bootstrap.log",
            "log_group_name": "/nextgendental/analytics",
            "log_stream_name": "{instance_id}/bootstrap"
          },
          {
            "file_path": "/data/caddy/access.log",
            "log_group_name": "/nextgendental/analytics",
            "log_stream_name": "{instance_id}/caddy-access"
          }
        ]
      }
    }
  }
}
CWCFG
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/cw-analytics.json
} || echo "WARNING: CloudWatch agent setup failed — continuing without log shipping" >&2

# ---- stage 2: the retryable part ------------------------------------------
cat > /opt/umami/bootstrap.sh <<'STAGE2'
#!/bin/bash
# Stage 2. Exits non-zero on any not-yet-ready condition; systemd retries.
set -euo pipefail
REGION=us-east-2
FS_LABEL=umami-data

# Exit 1 = "not ready yet, come back in 60s". Exit 3 = "a human must look at
# this"; the unit's RestartPreventExitStatus stops the retry loop so the failure
# stays legible in the log instead of scrolling past once a minute forever.
EXIT_NEEDS_HUMAN=3

# To stderr, not stdout. find_data_device() returns the device path ON STDOUT
# and is called inside $( ) — a log line written to stdout there does not reach
# the log at all, it lands inside DEV. The "FATAL: ambiguous data volume" line
# was being swallowed exactly that way.
log() { echo "[$(date -Is)] $*" >&2; }

# ---- find the data volume -------------------------------------------------
# t4g is a Nitro instance: EBS attaches as /dev/nvme<N>n1 regardless of the
# device_name Terraform requests. /dev/xvdb exists only if ec2-utils' udev
# rules are installed AND fired, so it cannot be assumed. Resolution order:
#   1. an already-labelled filesystem  (re-attach after instance replacement)
#   2. the ec2-utils symlink, if present
#   3. NVMe namespace whose EBS mapping is xvdb/sdb, via ebsnvme-id
#   4. exactly one unused, unpartitioned, non-root disk that is either blank OR
#      an unlabelled XFS filesystem. That second case is a volume created by a
#      bootstrap older than the FS_LABEL convention — exactly what the adoption
#      branch below exists to handle. Requiring "blank" alone made step 4
#      structurally incapable of finding it, so a missing ebsnvme-id would leave
#      the unit retrying forever with the disk sitting right there. Any other
#      filesystem type is somebody else's data: skipped, and named in the log.
#      If the candidate is ambiguous, FAIL rather than guess. Formatting or
#      relabelling the wrong disk is unrecoverable; waiting for a human is not.
find_data_device() {
  local d out root_disk lbl name type mnt fstype
  local -a candidates=() skipped=()

  if blkid -L "$FS_LABEL" >/dev/null 2>&1; then
    blkid -L "$FS_LABEL"; return 0
  fi

  for d in /dev/xvdb /dev/sdb; do
    [ -b "$d" ] && { readlink -f "$d"; return 0; }
  done

  if command -v ebsnvme-id >/dev/null 2>&1; then
    for d in /dev/nvme*n1; do
      [ -b "$d" ] || continue
      out=$(ebsnvme-id "$d" 2>/dev/null || true)
      case "$out" in *xvdb*|*sdb*) echo "$d"; return 0 ;; esac
    done
  fi

  root_disk=$(lsblk -no PKNAME "$(findmnt -no SOURCE /)" 2>/dev/null | head -1 || true)
  # Fields are read two-at-a-time and the rest queried individually, on purpose.
  # `lsblk -rno NAME,TYPE,MOUNTPOINT,FSTYPE` prints an empty column as nothing,
  # and `read` with the default IFS collapses the resulting run of spaces — so a
  # row for an unmounted but formatted disk ("nvme1n1 disk  xfs") assigns
  # fstype's value to mnt and leaves fstype empty. The disk is then dropped by
  # the "already mounted" test, which is not true of it. That is precisely the
  # disk this function needs to find, so a four-column read fails at exactly the
  # case that matters. NAME and TYPE are never empty, so reading those two is safe.
  while read -r name type; do
    [ "$type" = disk ] || continue
    [ "$name" = "$root_disk" ] && continue
    [ "$(lsblk -rno NAME "/dev/$name" | wc -l)" -gt 1 ] && continue   # has partitions
    mnt=$(lsblk -dnro MOUNTPOINT "/dev/$name" 2>/dev/null || true)
    [ -n "$mnt" ] && continue
    fstype=$(lsblk -dnro FSTYPE "/dev/$name" 2>/dev/null || true)
    if [ -z "$fstype" ]; then
      candidates+=("/dev/$name")                      # blank -> format
    elif [ "$fstype" = xfs ]; then
      lbl=$(blkid -s LABEL -o value "/dev/$name" 2>/dev/null || true)
      if [ -z "$lbl" ]; then
        candidates+=("/dev/$name")                    # unlabelled xfs -> adopt
      else
        skipped+=("/dev/$name(xfs,label=$lbl)")
      fi
    else
      skipped+=("/dev/$name($fstype)")
    fi
  done < <(lsblk -dnro NAME,TYPE)

  if [ "${#candidates[@]}" -eq 1 ]; then echo "${candidates[0]}"; return 0; fi
  if [ "${#candidates[@]}" -gt 1 ]; then
    log "FATAL: ambiguous data volume, refusing to touch any of: ${candidates[*]}"
    return 2
  fi
  # Nothing usable. Say what was rejected, so "not attached yet" is never a lie
  # told about a disk that is in fact attached and simply did not qualify.
  if [ "${#skipped[@]}" -gt 0 ]; then
    log "no usable data volume; deliberately skipped: ${skipped[*]}"
  fi
  return 1
}

set +e
DEV=$(find_data_device)
rc=$?
set -e
if [ "$rc" -eq 2 ]; then
  log "stopping: a human must identify the correct data volume"
  exit "$EXIT_NEEDS_HUMAN"
elif [ "$rc" -ne 0 ]; then
  log "data volume not attached yet — will retry"
  exit 1
fi
log "data volume resolved to $DEV"

if ! blkid "$DEV" >/dev/null 2>&1; then
  log "formatting $DEV (blank) with label $FS_LABEL"
  mkfs -t xfs -L "$FS_LABEL" "$DEV"   # format ONLY if blank — protects data on replacement
else
  # Older bootstrap versions created the live XFS filesystem without a label.
  # Adopt that volume without formatting it, so the LABEL= fstab entry below is
  # valid after reboot. Refuse an unexpected non-empty label rather than silently
  # changing the identity of a filesystem that may not be ours.
  CURRENT_LABEL=$(blkid -s LABEL -o value "$DEV" 2>/dev/null || true)
  if [ -z "$CURRENT_LABEL" ]; then
    log "existing filesystem on $DEV has no label; assigning $FS_LABEL"
    # xfs_admin refuses a mounted filesystem. Nothing has mounted /data at this
    # point in the script, so this should succeed; if it does not, retrying at
    # 60s forever would only bury the reason. Stop and say so.
    xfs_admin -L "$FS_LABEL" "$DEV" || {
      log "FATAL: could not label $DEV (mounted elsewhere? not xfs?)"
      exit "$EXIT_NEEDS_HUMAN"
    }
  elif [ "$CURRENT_LABEL" != "$FS_LABEL" ]; then
    log "FATAL: unexpected filesystem label on $DEV: $CURRENT_LABEL"
    exit "$EXIT_NEEDS_HUMAN"
  fi
fi
mkdir -p /data
mountpoint -q /data || mount "$DEV" /data
# fstab by LABEL, not device name: the NVMe number is not stable across
# instance replacement, so a /dev/nvme1n1 entry can silently point elsewhere.
grep -q "LABEL=$FS_LABEL" /etc/fstab || \
  echo "LABEL=$FS_LABEL /data xfs defaults,nofail 0 2" >> /etc/fstab
mkdir -p /data/pg /data/caddy

# ---- secrets --------------------------------------------------------------
get() { aws ssm get-parameter --with-decryption --region "$REGION" --name "$1" --query Parameter.Value --output text 2>/dev/null || echo ""; }
PGPASS=$(get /nextgendental/analytics/pg_password)
APPSECRET=$(get /nextgendental/analytics/app_secret)
BASICAUTH=$(get /nextgendental/analytics/dash_basicauth_hash)

# Terraform seeds these with a placeholder under ignore_changes and a human sets
# the real values afterwards. Rather than failing permanently on that ordering,
# this unit retries until the values are real — so "populate the parameters" can
# happen before OR after the instance exists.
for pair in "pg_password:$PGPASS" "app_secret:$APPSECRET" "dash_basicauth_hash:$BASICAUTH"; do
  name=${pair%%:*}; value=${pair#*:}
  case "$value" in
    ""|None|CHANGE-ME*)
      log "SSM parameter $name is empty or still a placeholder — waiting, will retry"
      exit 1
      ;;
  esac
done
case "$BASICAUTH" in
  '$2a$'*|'$2b$'*|'$2y$'*) : ;;
  *) log "dash_basicauth_hash is not a bcrypt hash — Caddy would not start; waiting, will retry"; exit 1 ;;
esac
log "secrets present and well-formed"

# ---- render config --------------------------------------------------------
cat > /opt/umami/Caddyfile <<CADDY
analytics.nextgendentalaustintx.com {
  log {
    output file /data/caddy/access.log
  }
  # robots.txt must be readable WITHOUT credentials. It previously fell through
  # to basic_auth, so Googlebot got 401 and had no way to learn it should stay
  # out — Search Console reported this host under "Blocked due to unauthorized
  # request (401)" on 2026-08-10. The dashboard itself stays behind auth.
  # NOTE: Caddy does NOT interpret backslash-n inside quoted strings. Only an
  # escaped quote and an escaped backslash are escapes. A backslash-n would be
  # served literally, leaving a robots.txt with no Disallow rule — which reads
  # as "crawl everything" while looking fixed. The newlines below are REAL and
  # the continuation lines MUST start at column 0.
  handle /robots.txt {
    header Content-Type "text/plain; charset=utf-8"
    respond "User-agent: *
Disallow: /
" 200
  }

  # Only what the tracker needs. /api/* previously exposed every present and
  # future Umami API route unauthenticated. Umami v2 collects on /api/send; a
  # downgrade to v1 would need /api/collect or collection stops silently.
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
    image: __UMAMI_IMAGE__
    environment:
      DATABASE_URL: postgresql://umami:${PGPASS}@db:5432/umami
      APP_SECRET: ${APPSECRET}
      DISABLE_TELEMETRY: 1
    depends_on: [db]
    restart: always
  db:
    image: __POSTGRES_IMAGE__
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${PGPASS}
    volumes: ["/data/pg:/var/lib/postgresql/data"]
    restart: always
  caddy:
    image: __CADDY_IMAGE__
    ports: ["80:80", "443:443"]
    volumes:
      - /opt/umami/Caddyfile:/etc/caddy/Caddyfile:ro
      - /data/caddy:/data
    restart: always
COMPOSE

chmod 600 /opt/umami/Caddyfile /opt/umami/docker-compose.yml
cd /opt/umami && /usr/local/bin/docker-compose up -d
log "stack started"
STAGE2
chmod 700 /opt/umami/bootstrap.sh

# Image refs are declared once in stage 1 and substituted into stage 2, so there
# is exactly one place to paste digests when they are captured.
sed -i \
  -e "s|__UMAMI_IMAGE__|${UMAMI_IMAGE}|" \
  -e "s|__POSTGRES_IMAGE__|${POSTGRES_IMAGE}|" \
  -e "s|__CADDY_IMAGE__|${CADDY_IMAGE}|" \
  /opt/umami/bootstrap.sh

cat > /etc/systemd/system/umami-bootstrap.service <<'UNIT'
[Unit]
Description=Analytics stack bootstrap (retries until volume and secrets are ready)
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/opt/umami/bootstrap.sh
StandardOutput=append:/var/log/umami-bootstrap.log
StandardError=append:/var/log/umami-bootstrap.log
Restart=on-failure
RestartSec=60
# Exit 3 means the script decided a human is required (ambiguous data volume,
# unexpected filesystem label). Retrying that every 60s forever buries the one
# log line that explains the outage, so stop instead.
RestartPreventExitStatus=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now umami-bootstrap.service || true

# nightly encrypted dump to S3 (bucket enforces SSE-KMS)
cat > /etc/cron.daily/pg-backup <<'CRON'
#!/bin/bash
set -euo pipefail
TS=$(date +%F)
docker exec umami-db-1 pg_dump -U umami umami | gzip | \
  aws s3 cp - "s3://nextgendental-analytics-backups/pgdump/umami-${TS}.sql.gz" --region us-east-2
CRON
chmod +x /etc/cron.daily/pg-backup
