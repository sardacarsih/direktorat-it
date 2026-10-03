# Server deployment

Target: SSH alias `eoffice-prod` dari konfigurasi SSH pengguna. Origin Oracle Linux 8.10 menggunakan Apache, dengan akses publik melalui Cloudflare Tunnel yang sudah ada.

- Domain: `https://it.kskgroup.web.id`
- Origin: `http://127.0.0.1:8087` (hanya loopback)
- Rilis: `/apps/it-direktorat/releases/<release-id>/build`
- Rilis aktif: symlink `/apps/it-direktorat/current`
- Apache: `/etc/httpd/conf.d/it-direktorat.conf`
- Log: `/var/log/httpd/it-direktorat-{access,error}.log`

Build dilakukan lokal menggunakan Bun; server hanya menerima file statis. Tidak ada Node.js atau Bun application server untuk halaman ini.

## Update

Jalankan `bun --bun run check` dan `bun --bun run build`. Buat arsip `tar.gz` berisi direktori `build` dan `deploy`, kirim dengan `scp` ke `/tmp`, lalu jalankan:

```bash
sudo bash /tmp/install-release.sh /tmp/it-direktorat-<release-id>.tar.gz <release-id>
```

`install-release.sh` disalin dari checkout lokal ke `/tmp` terlebih dahulu. Script memverifikasi rilis, mengatur label SELinux, menukar symlink secara atomik, memeriksa konfigurasi Apache, dan melakukan reload. Jika pemeriksaan origin gagal, rilis serta konfigurasi Apache sebelumnya dikembalikan.

Untuk pemasangan atau pembaruan collector status, jalankan `deploy/monitoring/install.sh` sebagai root dengan direktori sumber monitoring rilis baru sebelum aktivasi konten. Verifikasi `/status.json` dan `it-status.timer`; panduan lengkap di [monitoring/README.md](monitoring/README.md). Data monitoring berada di luar folder rilis dan tidak diganti saat rollback konten.

Konfigurasi Cloudflare/DNS hanya perlu diubah pada deployment pertama. `add-tunnel-route.py` menyiapkan kandidat konfigurasi; validasi menggunakan `cloudflared tunnel ingress validate` sebelum memasangnya. Simpan backup konfigurasi Cloudflare dan verifikasi hostname layanan lain setelah restart tunnel.

Jika koneksi SSH juga melalui Cloudflare, restart tunnel dapat memutus sesi SSH. Jalankan aktivasi sebagai unit systemd terpisah agar proses tetap berjalan:

```bash
sudo systemd-run --unit=it-direktorat-route-<release-id> --collect /bin/bash /tmp/activate-route.sh <release-id>
```

Script aktivasi disalin ke `/tmp` bersama `add-tunnel-route.py`. Periksa hasil dari sesi SSH baru dengan `journalctl -u it-direktorat-route-<release-id>`. Jangan menjalankan aktivasi ulang saat hostname sudah tercantum; update konten hanya memerlukan script rilis.

## Rilis aktif yang diverifikasi

Deployment 3 Oktober 2026: `20261003-162730` (terkini). Backup konfigurasi tunnel: `/etc/cloudflared/config.yml.it-20261003-062656.bak`.

Rilis ini memasang dashboard monitoring nyata: enam aplikasi, resource host, penerimaan koneksi PostgreSQL, dan HTTPS publik. Collector `it-status` berjalan setiap menit sebagai user khusus; SQLite menyimpan sampel 30 hari dan endpoint JSON memiliki Cache-Control no-store. Dashboard publik desktop/mobile, pemuatan aset, dan endpoint status berhasil diverifikasi. Probe lokal serta HTTPS keenam aplikasi berhasil pada pemeriksaan awal; hasil berikutnya mengikuti kondisi aktual. HRIS/OPAL memakai pemeriksaan HTTP halaman; belum ada monitor dari host terpisah atau heartbeat sistem di lokasi lain. Apache dan cloudflared tetap aktif tanpa perubahan rute tunnel. Semua CTA dukungan tetap menuju portal resmi.

Panel hero kini berbagi polling dengan dashboard: akses publik, resource server, aplikasi, dan PostgreSQL. Angka uptime adalah minimum uptime aplikasi teramati, dengan cakupan minimum sampel dan waktu pemeriksaan WIB. Klaim demo ONLINE/SECURITY aktif dan angka uptime tetap sudah dihapus dari hero. Data invalid, gagal dimuat, atau stale membuat kedua panel belum diketahui. Verifikasi publik desktop/mobile berhasil; collector dan riwayat sebelumnya tetap dipertahankan.

Rilis sebelumnya: `20261003-161609` (collector dan dashboard live), `20261003-160431` (katalog aplikasi), `20261003-150110` (portal resmi), `20261003-062656` (tautan internal `#kontak`/`#dukungan`), `20261003-062558`.

## Rollback konten

Pilih rilis sebelumnya dari `/apps/it-direktorat/releases`, kemudian sebagai root:

```bash
ln -s /apps/it-direktorat/releases/<previous-release>/build /apps/it-direktorat/current.rollback
mv -Tf /apps/it-direktorat/current.rollback /apps/it-direktorat/current
curl -fsS http://127.0.0.1:8087/ -o /dev/null
```

Tidak diperlukan restart Apache untuk rollback konten statis. Jangan hapus rilis sebelumnya sebelum memeriksa hasil rollback.
