#!/usr/bin/env bash
set -euo pipefail
release_id="${1:?Missing release-id}"
[[ "$release_id" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 1
config=/etc/cloudflared/config.yml
candidate=$(mktemp /etc/cloudflared/config.it.XXXXXX.yml)
backup="$config.it-$release_id.bak"
original_hash=$(sha256sum "$config" | cut -d ' ' -f 1)
python3 /tmp/add-tunnel-route.py "$candidate"
/usr/local/bin/cloudflared --config "$candidate" tunnel ingress validate
/usr/local/bin/cloudflared --config "$candidate" tunnel ingress rule https://it.kskgroup.web.id
test "$original_hash" = "$(sha256sum "$config" | cut -d ' ' -f 1)"
cp -a "$config" "$backup"
chmod --reference="$config" "$candidate"
chown --reference="$config" "$candidate"
rollback() {
    cp -a "$backup" "$config"
    restorecon "$config"
    systemctl restart cloudflared
}
trap 'rollback' ERR
mv -f "$candidate" "$config"
restorecon "$config"
systemctl restart cloudflared
systemctl is-active --quiet cloudflared
ok=0
for attempt in {1..10}; do
    if curl --fail --silent --show-error --max-time 10 https://it.kskgroup.web.id/ -o /tmp/it-direktorat-public-smoke.html && grep -q 'Direktorat IT' /tmp/it-direktorat-public-smoke.html; then
        ok=1
        break
    fi
    sleep 2
done
test "$ok" -eq 1
trap - ERR
printf 'PUBLIC_OK url=https://it.kskgroup.web.id backup=%s\n' "$backup"
