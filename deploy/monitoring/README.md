# Monitoring status sistem

Collector Python 3.6+ memeriksa layanan dan endpoint lokal serta HTTPS publik setiap 60 detik. Tidak ada kredensial aplikasi yang digunakan. Status publik berasal dari host yang sama, bukan monitor independen. HRIS/OPAL hanya memeriksa HTTP halaman dan service web; fungsi bisnis/database kedua aplikasi belum diuji.

Deployment Cloudflare Workers memakai endpoint `/status.json` dari
`worker/index.ts` untuk menjalankan probe HTTPS publik independen. Collector
Python tetap menjadi sumber metrik host, status PostgreSQL, dan riwayat uptime
lokal melalui `ORIGIN_STATUS_URL`. Worker tidak mengubah atau menambah sampel
SQLite. Snapshot Worker versi 2 memisahkan `checkedAt` probe publik dan
`originCheckedAt` collector; metrik lokal lebih lama dari 3 menit menjadi null.
Snapshot collector versi 1 tetap didukung untuk deployment Apache.

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

Worker memeriksa domain HTTPS dari jaringan Cloudflare saat dashboard dimuat, dengan cache edge maksimal 30 detik dan polling browser setiap 60 detik. MOPS juga memiliki probe JSON health publik; aplikasi lain hanya diperiksa melalui HTTP halaman. Probe gagal langsung ditandai tidak tersedia untuk pemeriksaan tersebut. Belum ada penjadwalan probe publik tanpa pengunjung, penyimpanan riwayat uptime publik, atau notifikasi. Sistem lokal Accounting, Finance, Kasir, Inventory Lokal, HRIS Lokal, dan SmartMill Scale membutuhkan heartbeat dari lokasi masing-masing.

## Rollback

Rollback konten menggunakan prosedur di `deploy/README.md`. Untuk menonaktifkan collector: `systemctl disable --now it-status.timer`. Riwayat tetap dipertahankan; jangan menghapus database. Konfigurasi Apache sebelum rilis tersedia di `apache.previous.conf` dalam direktori rilis.
