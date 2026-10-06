# Monitoring status sistem

Collector Python 3.6+ memeriksa layanan dan endpoint lokal serta HTTPS publik setiap 60 detik. Tidak ada kredensial aplikasi yang digunakan. Status publik berasal dari host yang sama, bukan monitor independen. HRIS/OPAL hanya memeriksa HTTP halaman dan service web; fungsi bisnis/database kedua aplikasi belum diuji.

Deployment Cloudflare Workers memakai endpoint `/status.json` dari
`worker/index.ts` untuk membaca snapshot probe HTTPS publik terjadwal. Collector
Python tetap menjadi sumber metrik host, status PostgreSQL, dan riwayat uptime
lokal melalui `ORIGIN_STATUS_URL`. Worker tidak mengubah atau menambah sampel
SQLite. Snapshot Worker versi 2 memisahkan `checkedAt` probe publik dan
`originCheckedAt` collector; metrik lokal lebih lama dari 3 menit menjadi null.
Snapshot collector versi 1 tetap didukung untuk deployment Apache. Produksi
Cloudflare menggunakan snapshot versi 3 dengan riwayat publik terpisah.

- Empat aplikasi menggunakan endpoint health; eOfficePro juga memvalidasi respons dependensi, Purchasing dan Inventory menggunakan readiness.
- PostgreSQL memakai `pg_isready`: menerima koneksi, bukan bukti seluruh query bisnis berhasil.
- CPU diukur selama 200 ms; RAM menggunakan MemAvailable; disk mengambil persentase tertinggi antara `/` dan `/apps`. Salah satu penggunaan mencapai 90% berarti resource terganggu.
- Kegagalan pertama/kedua menjadi terganggu; ketiga berturut-turut menjadi tidak tersedia. Pemeriksaan sukses langsung memulihkan status.
- SQLite menyimpan sampel 30 hari. Uptime adalah proporsi pemeriksaan berhasil; cakupan adalah jumlah sampel / 43.200 pemeriksaan yang diharapkan. Tidak menyimpulkan uptime untuk jeda pemeriksaan atau waktu sebelum collector dipasang.
- Browser memuat `/status.json` setiap 60 detik; fetch gagal, payload invalid, atau timestamp lebih lama dari 3 menit menghasilkan status belum diketahui. Tanpa JavaScript tidak ada klaim live.

## Instalasi

Jalankan sebagai root dari direktori rilis yang sudah diekstrak:

```bash
bash deploy/monitoring/install.sh /apps/it-direktorat/releases/<release-id>/deploy/monitoring
```

Script memasang kode/config root-owned, akun `it-status`, service oneshot, dan timer. Data berada di `/apps/it-direktorat/monitoring/data/history.sqlite`; JSON publik di `/apps/it-direktorat/status/status.json`. Keduanya bertahan antar deployment. Apache memakai Alias khusus dan Cache-Control no-store; database tidak disajikan melalui web. Service hanya dapat menulis data/JSON dan tidak dapat mengubah aplikasi atau konfigurasi collector.

Periksa `systemctl status it-status.timer`, `journalctl -u it-status.service`, dan endpoint `/status.json`. Kegagalan collector mempertahankan snapshot terakhir dan ditandai stale oleh browser. Untuk memperbarui probe, edit config sumber dan jalankan installer dari rilis baru. Jangan menjalankan collector manual berulang terhadap riwayat produksi karena menambah sampel di luar interval.

## Verifikasi

```powershell
python deploy/monitoring/test_collector.py
bun --bun run check
bun --bun run build
```

Frontend juga perlu diuji dengan status terbaru, stale, down, payload invalid, HTTP error, pemulihan, dan viewport mobile. Jangan menghentikan layanan bisnis produksi untuk simulasi.

## Monitoring di luar host

Cron Trigger `* * * * *` memeriksa domain HTTPS dari jaringan Cloudflare setiap
menit tanpa pengunjung. Satu Durable Object SQLite `PublicMonitor` menyimpan
snapshot, counter dan sampel; browser membaca snapshot setiap 60 detik tanpa
cache. Field
`publicHealthPath` pada config mengarahkan Agrinova, MOPS, eOfficePro, Inventory,
dan Purchasing ke `/health/live`. Respons harus HTTP sukses dengan
Content-Type JSON dan `status: ok`; redirect dan HTML login ditolak. Liveness
tidak membuktikan kesiapan dependensi atau fungsi bisnis. HRIS/OPAL memakai HTTP
halaman. Halaman publik ketujuh aplikasi diperiksa secara terpisah dari liveness;
kegagalan salah satunya tidak menimpa hasil yang lain. Status DOWN dikonfirmasi
setelah 3 kegagalan pada slot menit berurutan; pemulihan memerlukan 2 keberhasilan.
Kegagalan awal ditandai terganggu. Saat baru dipasang, 2 keberhasilan diperlukan
untuk menetapkan baseline sehat. Slot yang terlewat memutus streak; retry Cron
dan reload halaman tidak menambah sampel dalam slot yang sama. Snapshot pertama
belum tersedia sampai Cron pertama berjalan (HTTP 503); timestamp lebih lama
dari 3 menit menghasilkan status belum diketahui tanpa menjalankan probe dari
permintaan browser. Cron baru dapat memerlukan hingga 15 menit untuk propagasi.
Probe lokal collector dan
riwayat SQLite tetap menggunakan checks lokal yang sudah ada; field
`publicHealthPath` hanya dipakai Worker dan middleware development. Belum ada
riwayat publik pada middleware Vite; pengujian Cron menggunakan Wrangler.
Sistem lokal Accounting, Finance, Kasir, Inventory Lokal, HRIS Lokal,
dan SmartMill Scale membutuhkan heartbeat dari lokasi masing-masing.

### Riwayat dan notifikasi publik

Sampel mentah liveness dan halaman disimpan 30 hari. Persentase uptime publik
adalah jumlah sampel liveness berhasil / sampel yang ada; cakupan adalah jumlah
sampel / 43.200. Jeda tidak diisi dengan sampel buatan. Dashboard menampilkan 30
sampel terakhir dan 12 perubahan status terkonfirmasi terakhir. Metrik dan
riwayat lokal tetap tersimpan terpisah dan kedaluwarsa secara independen.

Notifikasi memakai binding Cloudflare `send_email` bernama `EMAIL`, dengan
`ALERT_EMAIL_FROM` dari domain pengirim terverifikasi dan `ALERT_EMAIL_TO` sebagai
penerima terverifikasi. Simpan alamat sebagai secret/variabel Worker; jangan
menambahkan endpoint pengiriman email publik. Batasi binding pada penerima yang
ditetapkan. Tidak perlu memindahkan MX domain perusahaan ke Cloudflare untuk
sekadar mengaktifkan probe terjadwal.

Perubahan ke DOWN dan pulih masuk outbox persisten. Semua event yang tertunda
(maksimal 50, lintas aplikasi) digabung menjadi **satu email digest** per siklus
via Resend, sehingga gangguan serentak hanya memakai 1 email DOWN + 1 email PULIH.
Batas harian (UTC, mengikuti reset kuota Resend) default 80 email, bisa diubah lewat
variabel `ALERT_DAILY_LIMIT`; setelah batas tercapai event tetap tampil di dashboard
sebagai tidak terkirim dan tidak dikirim ulang. Retry memakai backoff 1 menit sampai
1 jam; event kedaluwarsa setelah 30 hari. Pengiriman bersifat at-least-once;
`Idempotency-Key` (hash dari ID event dalam digest) tetap sama pada retry.
Snapshot publik tidak memuat alamat email atau credential provider.

Jalankan `bun run test:monitoring`, `bun run check:worker`, `bun run check`, dan
`bun run build`. Untuk runtime lokal, gunakan `wrangler dev --test-scheduled`
dan panggil `/__scheduled?cron=*+*+*+*+*`; akses `/status.json` biasa tidak menjalankan
probe. Jangan memakai endpoint simulasi atau menghentikan aplikasi produksi
untuk menguji ambang gangguan.

## Rollback

Rollback konten menggunakan prosedur di `deploy/README.md`. Untuk menonaktifkan collector: `systemctl disable --now it-status.timer`. Riwayat tetap dipertahankan; jangan menghapus database. Konfigurasi Apache sebelum rilis tersedia di `apache.previous.conf` dalam direktori rilis.
