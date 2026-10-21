#!/bin/bash
# Regression tests for find_data_device() in user-data.sh stage 2.
#
# This function decides which block device gets formatted or relabelled. Getting
# it wrong is unrecoverable, and it cannot be exercised on the real instance
# without attaching spare EBS volumes — so it is tested here against stubbed
# lsblk/blkid output instead.
#
# The function is EXTRACTED FROM user-data.sh at run time, not copy-pasted, so
# these tests cannot drift away from the code they claim to cover.
#
#   bash infra/analytics/find-data-device.test.sh
#
# Two cases here are regressions with a history, both found by testing rather
# than by reading:
#   A — an unmounted, ALREADY-FORMATTED, unlabelled disk was invisible to the
#       scan. `lsblk -rno NAME,TYPE,MOUNTPOINT,FSTYPE` renders an empty column
#       as nothing and `read` collapses the spaces, so "nvme1n1 disk  xfs" put
#       xfs into MOUNTPOINT and the disk was dropped as "already mounted".
#       That disk is the one the adoption branch exists for.
#   F — the FATAL message for an ambiguous volume was written to stdout by
#       log(), inside a $( ) capture, so it ended up in DEV instead of the log.
#       The operator saw an empty retry loop and no reason.

set -uo pipefail
cd "$(dirname "$0")/../.."
SRC=infra/analytics/user-data.sh
[ -f "$SRC" ] || { echo "cannot find $SRC"; exit 1; }

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# stage 2 lives in a quoted heredoc inside stage 1
sed -n '/^cat > \/opt\/umami\/bootstrap.sh/,/^STAGE2$/p' "$SRC" | sed '1d;$d' > "$WORK/stage2.sh"

cat > "$WORK/prelude.sh" <<'PRELUDE'
set -uo pipefail
FS_LABEL=umami-data
blkid() {
  case "${1:-}" in
    -L) [ -n "${LABELED_DEV:-}" ] && { echo "$LABELED_DEV"; return 0; }; return 2 ;;
    -s) local d="$5" n v; n="LABEL_${d##*/}"; v=${!n:-}; [ -n "$v" ] && echo "$v"; return 0 ;;
  esac
  return 0
}
findmnt() { echo /dev/nvme0n1p1; }
ebsnvme_present() { return "${EBSNVME_PRESENT:-1}"; }
lsblk() {
  # Indirect expansion, never eval+unquoted echo: PARTS_* values contain real
  # newlines, and `eval "echo $VAR"` word-splits them onto one line, which makes
  # a partitioned disk look unpartitioned. That bug would have made this file
  # pass while the code was wrong.
  local args="$*" dev n
  case "$args" in
    "-no PKNAME /dev/nvme0n1p1") echo nvme0n1 ;;
    "-dnro NAME,TYPE")           printf '%s\n' "${DISKS}" ;;
    "-dnro MOUNTPOINT "*) dev=${args##*/}; n="MNT_$dev";   printf '%s\n' "${!n:-}" ;;
    "-dnro FSTYPE "*)     dev=${args##*/}; n="FS_$dev";    printf '%s\n' "${!n:-}" ;;
    "-rno NAME "*)        dev=${args##*/}; n="PARTS_$dev"; printf '%s\n' "${!n:-$dev}" ;;
  esac
}
PRELUDE

{
  cat "$WORK/prelude.sh"
  # The REAL log() is used, not a stub. Whether it writes to stdout or stderr is
  # itself under test: find_data_device() returns the device on stdout inside a
  # $( ), so a log() that writes to stdout puts its message into DEV and the
  # operator never sees it. A stubbed log() would hide that.
  grep '^log() {' "$WORK/stage2.sh"
  sed -n '/^find_data_device() {/,/^}$/p' "$WORK/stage2.sh" \
    | sed 's/command -v ebsnvme-id >\/dev\/null 2>&1/ebsnvme_present/'
  echo 'set +e; DEV=$(find_data_device); rc=$?; set -e'
  echo 'echo "rc=$rc dev=$DEV"'
} > "$WORK/run.sh"

grep -q '^find_data_device() {' "$WORK/run.sh" || { echo "FAIL: could not extract find_data_device"; exit 1; }
grep -q '^log() {'             "$WORK/run.sh" || { echo "FAIL: could not extract log()"; exit 1; }

PASS=0; FAIL=0
# check <name> <expected rc> <expected dev> <expected log substring|-> -- ENV...
check() {
  local name=$1 want_rc=$2 want_dev=$3 want_log=$4; shift 5   # shift past the --
  local out err rc dev
  err=$(mktemp)
  out=$(env "$@" bash "$WORK/run.sh" 2>"$err")
  rc=${out#rc=}; rc=${rc%% *}
  dev=${out#*dev=}
  local logtext; logtext=$(cat "$err"); rm -f "$err"
  local ok=1
  [ "$rc" = "$want_rc" ] || ok=0
  [ "$dev" = "$want_dev" ] || ok=0
  if [ "$want_log" != "-" ]; then
    case "$logtext" in *"$want_log"*) ;; *) ok=0 ;; esac
  fi
  if [ "$ok" = 1 ]; then
    PASS=$((PASS+1)); printf '  ok   %s\n' "$name"
  else
    FAIL=$((FAIL+1))
    printf '  FAIL %s\n       want rc=%s dev=[%s] log~[%s]\n       got  rc=%s dev=[%s] log=[%s]\n' \
      "$name" "$want_rc" "$want_dev" "$want_log" "$rc" "$dev" "$logtext"
  fi
}

TWO=$'nvme0n1 disk\nnvme1n1 disk'
ROOTPARTS=$'nvme0n1\nnvme0n1p1'

echo "find_data_device()"

check "already-labelled volume is adopted by label (instance replacement)" \
  0 /dev/nvme1n1 - -- LABELED_DEV=/dev/nvme1n1 DISKS="$TWO"

check "blank second disk is selected for formatting" \
  0 /dev/nvme1n1 - -- DISKS="$TWO" PARTS_nvme0n1="$ROOTPARTS"

check "REGRESSION A: unmounted unlabelled xfs is found without ebsnvme-id" \
  0 /dev/nvme1n1 - -- DISKS="$TWO" FS_nvme1n1=xfs LABEL_nvme1n1= PARTS_nvme0n1="$ROOTPARTS"

check "foreign filesystem (ext4) is skipped and named" \
  1 "" "skipped: /dev/nvme1n1(ext4)" -- DISKS="$TWO" FS_nvme1n1=ext4 PARTS_nvme0n1="$ROOTPARTS"

check "xfs carrying somebody else's label is skipped and named" \
  1 "" "label=someone-else" -- DISKS="$TWO" FS_nvme1n1=xfs LABEL_nvme1n1=someone-else PARTS_nvme0n1="$ROOTPARTS"

check "REGRESSION F: ambiguous volumes -> rc=2 and the reason reaches the log" \
  2 "" "FATAL: ambiguous data volume" -- \
  DISKS=$'nvme0n1 disk\nnvme1n1 disk\nnvme2n1 disk' \
  FS_nvme1n1=xfs FS_nvme2n1=xfs LABEL_nvme1n1= LABEL_nvme2n1= PARTS_nvme0n1="$ROOTPARTS"

check "a mounted disk is never a candidate" \
  1 "" - -- DISKS="$TWO" FS_nvme1n1=xfs MNT_nvme1n1=/mnt/x PARTS_nvme0n1="$ROOTPARTS"

check "a partitioned disk is never a candidate" \
  1 "" - -- DISKS="$TWO" PARTS_nvme0n1="$ROOTPARTS" PARTS_nvme1n1=$'nvme1n1\nnvme1n1p1'

check "root disk is never a candidate" \
  1 "" - -- DISKS=$'nvme0n1 disk' PARTS_nvme0n1="$ROOTPARTS"

check "volume not attached yet -> quiet retry, no FATAL" \
  1 "" - -- DISKS=$'nvme0n1 disk' PARTS_nvme0n1="$ROOTPARTS"

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
