# Silsilah Keluarga V2.8 — PWA

Versi ini dapat dipasang di Android langsung dari Chrome tanpa Play Store.

## Update GitHub Pages
Upload/timpa seluruh isi folder ini ke root repository `silsilah-keluarga`. Pastikan file berikut ada:
- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/`
- `assets/pwa.js`

Setelah commit, tunggu GitHub Pages selesai deploy lalu buka situs menggunakan HTTPS.

## Memasang di Android
1. Buka website di Chrome.
2. Tekan tombol **PASANG APLIKASI**.
3. Jika prompt belum muncul, menu Chrome `⋮` > **Pasang aplikasi** / **Tambahkan ke layar utama**.

## Catatan
Data Supabase tetap membutuhkan internet untuk memperoleh data terbaru. Service worker hanya menyimpan shell/tampilan agar aplikasi dapat dibuka lebih cepat dan memiliki halaman offline.
