# Silsilah Keluarga – GitHub Pages + Supabase

Versi ini dibuat dari file Excel `Copy of SILSILAH KELUARGA.xlsx` dan dapat langsung tampil di GitHub Pages. Tanpa Supabase, website membaca `data.js` sebagai data awal. Setelah Supabase dikonfigurasi, website membaca data publik dari database dan halaman `admin.html` dapat digunakan untuk tambah/edit/hapus.

## Data yang sudah dimasukkan
- Silsilah keluarga besar Hi Nawawi: 114 entri termasuk root.
- Saudara Biyung Mainem / Tunggal Mbah: 61 entri termasuk root.
- Total data awal: 175 entri.

Karena sumber Excel memakai tata letak bertingkat dan beberapa nama pasangan digabung dengan `&` atau `+`, hasil konversi mempertahankan isi teks sumber. Sebaiknya cek hubungan orang tua/pasangan sebelum dipublikasikan permanen.

## Jalankan lokal
Buka `index.html` langsung di browser atau gunakan Live Server. Tidak perlu PHP/MySQL.

## Pasang ke GitHub Pages
1. Buat repository baru.
2. Upload semua isi folder ini ke branch `main`.
3. Settings > Pages > Deploy from a branch > `main` > `/root`.
4. Tunggu GitHub memberi URL Pages.

## Aktifkan Supabase agar bisa edit/tambah data
1. Buat project di Supabase.
2. Buka SQL Editor dan jalankan `supabase-schema.sql`.
3. Jalankan `supabase-seed.sql` sekali untuk memasukkan data awal.
4. Authentication > Users > buat user admin dengan email/password.
5. Salin UUID user admin, lalu jalankan:
   `insert into public.admin_users(user_id) values ('UUID-ADMIN');`
6. Project Settings > API: salin Project URL dan **anon public key**.
7. Isi `supabase-config.js`:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJ..."
   };
   ```
8. Upload perubahan `supabase-config.js` ke GitHub.
9. Buka `admin.html`, login, lalu tambah/edit data.

## Keamanan
- `anonKey` boleh berada di frontend; keamanan sebenarnya dijaga Row Level Security (RLS).
- Jangan pernah menaruh `service_role` key, password database, atau secret key di GitHub.
- Kebijakan RLS dalam `supabase-schema.sql` membuat pengunjung hanya dapat membaca data berstatus publik; tambah/edit/hapus hanya akun yang terdaftar di `admin_users`.
- Untuk data sensitif seperti nomor telepon/alamat rinci, sebaiknya jangan disimpan sebagai data publik.

## File penting
- `index.html` — tampilan silsilah.
- `admin.html` — halaman pengelolaan data.
- `data.js` — fallback data awal dari Excel.
- `supabase-schema.sql` — tabel dan aturan keamanan RLS.
- `supabase-seed.sql` — data awal hasil konversi Excel.
- `supabase-config.js` — tempat Project URL + anon key.


## Konfigurasi Supabase sudah terpasang
Project URL dan publishable key sudah dimasukkan ke `supabase-config.js`. Publishable key boleh digunakan di frontend/GitHub Pages; jangan pernah menambahkan secret key atau service role key ke repository.

### Uji di localhost
1. Salin folder `silsilah-github-v2` ke `C:\xampp\htdocs\`.
2. Jalankan Apache di XAMPP.
3. Buka `http://localhost/silsilah-github-v2/`.
4. Buka `http://localhost/silsilah-github-v2/admin.html` untuk login admin.
5. Gunakan akun admin yang sudah dibuat di Supabase Authentication.

### Jika login berhasil tetapi tambah/edit/hapus ditolak
Pastikan UUID user admin sudah dimasukkan ke tabel `public.admin_users`.

## Perbaikan V2.1
- Tombol + / − kini memakai event khusus dan dapat membuka/menutup cabang satu per satu seperti V1.
- Klik kartu yang memiliki anak juga membuka/menutup cabang; double-click membuka profil.
- Drag hanya dimulai dari area kosong agar tidak mengganggu tombol/node.
- Admin tidak lagi bergantung pada CDN supabase-js; autentikasi dan REST API dipanggil langsung sehingga error `Unexpected token '<'` dapat didiagnosis dengan jelas.

## Tampilan foto leluhur
File `assets/foto-leluhur.jpg` adalah foto pembuka. Ganti file tersebut dengan foto keluarga/leluhur yang diinginkan menggunakan nama file yang sama agar tidak perlu mengubah kode.

Tombol **RESET** sekarang menyesuaikan zoom agar seluruh cabang yang sedang terbuka muat di layar. **TUTUP SEMUA** mengembalikan tampilan pembuka dengan bingkai foto dan animasi jari.


## Perubahan V2.4
- RESET sekarang membuka semua cabang lalu otomatis fit seluruh pohon ke layar.
- Animasi node, garis, zoom, dan pan diperlambat serta diperhalus.
- Intro foto leluhur, tombol Ketuk di sini, dan jari penunjuk dipertahankan.
- Menu bawah GENERASI / CHAT BANI / DIBUAT OLEH tetap tersedia.
