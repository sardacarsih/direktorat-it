#!/usr/bin/env bash
set -euo pipefail
artifact="${1:?Usage: install-release.sh /tmp/release.tar.gz release-id}"
release_id="${2:?Missing release-id}"
[[ "$release_id" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo 'Invalid release id' >&2; exit 1; }
[[ "$EUID" -eq 0 ]] || { echo 'Run using sudo' >&2; exit 1; }
root=/apps/it-direktorat
release="$root/releases/$release_id"
conf=/etc/httpd/conf.d/it-direktorat.conf
[[ ! -e "$release" ]] || { echo 'Release already exists' >&2; exit 1; }
install -d -m 0755 "$root/releases" "$release"
tar -xzf "$artifact" -C "$release"
test -f "$release/build/index.html"
test -f "$release/deploy/apache.conf"
chown -R root:root "$release"
find "$release" -type d -exec chmod 0755 {} +
find "$release" -type f -exec chmod 0644 {} +
if ! semanage fcontext -l | grep -F '/apps/it-direktorat(/.*)?' >/dev/null; then
    semanage fcontext -a -t httpd_sys_content_t '/apps/it-direktorat(/.*)?'
fi
restorecon -R "$root"
if ! semanage port -l | grep -E '^http_port_t[[:space:]]+tcp[[:space:]]' | grep -E '(^|[ ,])8087([ ,]|$)' >/dev/null; then
    semanage port -a -t http_port_t -p tcp 8087
fi
old_target=$(readlink "$root/current" || true)
had_conf=0
if [[ -f "$conf" ]]; then
    cp -a "$conf" "$release/apache.previous.conf"
    had_conf=1
fi
rollback() {
    if [[ -n "$old_target" ]]; then
        ln -s "$old_target" "$root/current.rollback"
        mv -Tf "$root/current.rollback" "$root/current"
    else
        rm -f "$root/current"
    fi
    if [[ "$had_conf" -eq 1 ]]; then
        cp -a "$release/apache.previous.conf" "$conf"
    else
        rm -f "$conf"
    fi
    httpd -t && systemctl reload httpd
}
trap 'rollback' ERR
ln -s "$release/build" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
install -m 0644 "$release/deploy/apache.conf" "$conf"
restorecon "$conf" "$root/current"
httpd -t
systemctl reload httpd
curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 --max-time 5 http://127.0.0.1:8087/ -o "$release/origin-smoke.html"
grep -q 'Direktorat IT' "$release/origin-smoke.html"
trap - ERR
printf 'DEPLOY_OK release=%s origin=http://127.0.0.1:8087\n' "$release_id"
