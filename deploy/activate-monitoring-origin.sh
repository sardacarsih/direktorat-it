#!/usr/bin/env bash
# Keep the collector reachable while the public website moves to a Worker.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
hostname=it-origin.kskgroup.web.id
config=/etc/cloudflared/config.yml
apache=/etc/httpd/conf.d/it-direktorat.conf
release_id=$(date -u +%Y%m%d-%H%M%S)
backup="$config.origin-$release_id.bak"
apache_backup="$apache.origin-$release_id.bak"
candidate=$(mktemp /etc/cloudflared/config.origin.XXXXXX.yml)
original_hash=$(sha256sum "$config" | cut -d ' ' -f 1)
trap 'rm -f "$candidate"' EXIT
python3 - "$candidate" <<'PY'
import pathlib
import re
import sys

config = pathlib.Path('/etc/cloudflared/config.yml').read_text()
hostname = 'it-origin.kskgroup.web.id'
if re.search(r'^\s*- hostname:\s*' + re.escape(hostname) + r'\s*$', config, re.M):
    raise SystemExit('Collector hostname already present; inspect before changing it.')
catchall = re.search(r'^  - service: http_status:404\s*$', config, re.M)
if not catchall:
    raise SystemExit('Expected terminal catch-all not found; no changes made.')
addition = '  - hostname: it-origin.kskgroup.web.id\n    service: http://127.0.0.1:8087\n'
pathlib.Path(sys.argv[1]).write_text(config[:catchall.start()] + addition + config[catchall.start():])
PY
/usr/local/bin/cloudflared --config "$candidate" tunnel ingress validate
/usr/local/bin/cloudflared --config "$candidate" tunnel ingress rule "https://$hostname/status.json"
test "$original_hash" = "$(sha256sum "$config" | cut -d ' ' -f 1)"
cp -a "$config" "$backup"
cp -a "$apache" "$apache_backup"
rollback() {
    cp -a "$backup" "$config"
    cp -a "$apache_backup" "$apache"
    restorecon "$config" "$apache"
    httpd -t && systemctl reload httpd
    systemctl restart cloudflared
    echo "Rolled back to $backup and $apache_backup" >&2
}
trap rollback ERR
python3 - "$apache" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
config = path.read_text()
line = '    ServerName it.kskgroup.web.id\n'
if config.count(line) != 1:
    raise SystemExit('Unexpected Apache virtual host; no changes made.')
alias = '    ServerAlias it-origin.kskgroup.web.id\n'
if alias not in config:
    path.write_text(config.replace(line, line + alias))
PY
httpd -t
systemctl reload httpd
curl -fsS -H "Host: $hostname" http://127.0.0.1:8087/status.json -o /dev/null
chmod --reference="$config" "$candidate"
chown --reference="$config" "$candidate"
mv -f "$candidate" "$config"
restorecon "$config" "$apache"
systemctl restart cloudflared
systemctl is-active --quiet httpd cloudflared it-status.timer
trap - ERR
printf 'Collector route active: https://%s/status.json\nBackups: %s %s\n' "$hostname" "$backup" "$apache_backup"
