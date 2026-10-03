# Direktorat IT

Landing page berbahasa Indonesia dengan SvelteKit, TypeScript, Tailwind CSS, dan Lucide. Seluruh halaman diprerender menjadi HTML statis. Font dibundel lokal; tidak ada ketergantungan font pada layanan eksternal.

## Tangkapan Layar

Situs produksi [it.kskgroup.web.id](https://it.kskgroup.web.id), 3 Oktober 2026.

| Desktop (1440px) | Mobile (390px) |
| --- | --- |
| ![Tampilan utama desktop](docs/screenshots/desktop-hero.png) | ![Tampilan utama mobile](docs/screenshots/mobile-hero.png) |

Halaman lengkap (desktop):

![Seluruh halaman desktop](docs/screenshots/desktop-full.png)

## Menjalankan dengan Bun

Gunakan Bun 1.4.2 atau lebih baru.

```powershell
bun install --frozen-lockfile
bun --bun run dev
bun --bun run check
bun --bun run build
bun --bun run preview
```

Development: http://127.0.0.1:5173. Preview build produksi: http://127.0.0.1:4173.

Flag `--bun` memastikan CLI menggunakan runtime Bun. Build menghasilkan direktori `build/` yang dapat disajikan oleh hosting statis tanpa server aplikasi.

## Konten dan integrasi

Ubah konten contoh melalui `src/lib/content.ts`. Komponen berada di `src/lib/components/` dan token visual serta breakpoint di `src/app.css`.

Status operasional, statistik, daftar teknologi, dan inisiatif merupakan ilustrasi, bukan data monitoring organisasi. Timestamp demo tetap. Seluruh CTA dukungan dan panel layanan terhubung ke portal resmi di [itportal.kskgroup.web.id](https://itportal.kskgroup.web.id).

## Deployment server

Website dipublikasikan pada **3 Oktober 2026** di [it.kskgroup.web.id](https://it.kskgroup.web.id). Server menyajikan build statis melalui Apache dan Cloudflare Tunnel. Panduan update serta rollback tersedia di [deploy/README.md](deploy/README.md).

Verifikasi publik berhasil: HTTPS 200, HTML identik dengan build lokal, seluruh aset termuat, menu dan diagram berfungsi, tidak ada overflow pada desktop/mobile, cache aset immutable, serta kompresi gzip aktif. Data dan panel dukungan tetap menggunakan mode demo.

Font Space Grotesk dan IBM Plex Mono didistribusikan melalui Fontsource dengan lisensi SIL OFL yang disertakan dalam paket masing-masing. Ikon Lucide menggunakan lisensi ISC.

## Hasil verifikasi

Build statis dan pemeriksaan Svelte/TypeScript berhasil tanpa error atau warning. Pengujian browser mencakup viewport 360, 768, 1024, dan 1440 px; tidak ditemukan overflow horizontal dan seluruh target interaksi yang terlihat memiliki ukuran minimal 44 px. Menu mobile, Escape dan pengembalian fokus, keyboard diagram, kontrol ticker, pilihan dukungan, anchor, reduced motion, serta konten tanpa JavaScript sudah diverifikasi.

Lighthouse mobile pada preview produksi lokal: Performance **99**, Accessibility **100**, Best Practices **100**, dan SEO **100**. Skor ini merupakan pengukuran lokal, bukan jaminan performa di setiap perangkat atau hosting. Laporan JSON dan screenshot verifikasi tersedia di `.qa/` (diabaikan Git).
