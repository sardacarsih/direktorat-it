#!/usr/bin/env bash
set -euo pipefail
source_dir="${1:?Usage: install.sh monitoring-source-directory}"
root=/apps/it-direktorat
id it-status >/dev/null 2>&1 || useradd --system --no-create-home --shell /sbin/nologin it-status
install -d -m 0755 -o root -g root "$root/monitoring"
install -d -m 0750 -o it-status -g it-status "$root/monitoring/data"
install -d -m 0755 -o it-status -g it-status "$root/status"
install -m 0644 "$source_dir/collector.py" "$source_dir/config.json" "$root/monitoring/"
install -m 0644 "$source_dir/it-status.service" "$source_dir/it-status.timer" /etc/systemd/system/
restorecon -R "$root/status"
systemctl daemon-reload
systemctl start it-status.service
test -s "$root/status/status.json"
systemctl enable --now it-status.timer
printf 'MONITORING_OK\n'
