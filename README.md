# Silsilah Keluarga V2.6 — Multi Pasangan

Versi ini meneruskan V2.5 (GitHub Pages + Supabase + mobile pan/pinch) dan menambahkan **pasangan terstruktur** serta **jalur anak berdasarkan pasangan**.

## Yang baru

- Satu anggota dapat mempunyai lebih dari satu pasangan.
- Setiap pasangan mempunyai **urutan** dan **sebutan**: misalnya `Istri ke-1`, `Istri ke-2`, `Istri ke-3`, atau `Suami ke-1`.
- Saat menambah/edit anak, Admin dapat memilih **Orang tua utama** lalu **Dari pasangan / ibu-ayah yang mana?**.
- Node orang yang memiliki beberapa pasangan menampilkan pasangan satu per satu, bukan satu teks panjang.
- Anak yang sudah ditautkan menampilkan badge `DARI ISTRI KE-2: ...` dan garis keturunannya diberi pembeda visual.
- Daftar Admin memberi peringatan bila orang tua memiliki beberapa pasangan tetapi jalur anak belum dipilih.
- Data pasangan lama tetap disinkronkan ke kolom `spouse` untuk kompatibilitas versi lama.

## PENTING — upgrade database yang sudah dipakai

Karena Supabase Anda sebelumnya sudah memakai V2.5, **jangan hapus database dan jangan import seed ulang**.

1. Buka **Supabase → SQL Editor → New query**.
2. Buka file `supabase-migration-v2.6-multi-pasangan.sql` dari paket ini.
3. Copy seluruh isi → paste → klik **Run**.
4. Setelah `Success`, buka kembali `admin.html` dan refresh.

Migrasi ini tidak menghapus anggota. Field pasangan lama akan diubah menjadi tabel `spouses`.

Untuk data saat ini, `Hi NAWAWI` otomatis dibuat menjadi:

- Istri ke-1 — Biyung PLINTHI
- Istri ke-2 — Biyung NGAISAH
- Istri ke-3 — Biyung MAINEM

Data Excel juga sudah mempunyai penanda cabang `Istri 1`, `Istri 2`, `Istri 3`, sehingga anak-anak langsung dihubungkan ke jalur istri yang sesuai selama penanda cabangnya tersedia.

## Cara mengelola pasangan

Di `admin.html`:

1. Klik **Edit** pada anggota.
2. Pada **Data Pasangan**, klik `+ Tambah Pasangan`.
3. Isi `Urutan`, `Sebutan`, dan `Nama pasangan`.
4. Contoh:
   - `1 | Istri ke-1 | Biyung PLINTHI`
   - `2 | Istri ke-2 | Biyung NGAISAH`
   - `3 | Istri ke-3 | Biyung MAINEM`
5. Klik **Simpan**.

Untuk menentukan seorang anak berasal dari pasangan mana:

1. Edit data anak.
2. Pilih **Orang tua utama**.
3. Pilih **Dari pasangan / ibu-ayah yang mana?**.
4. Simpan.

Jika suatu pasangan dihapus, data anak tidak ikut terhapus. Jalur pasangan anak akan dikosongkan dan dapat dipilih kembali.

## Update GitHub Pages

Upload/timpa isi paket V2.6 ke repository GitHub yang sama. File utama yang berubah:

- `admin.html`
- `assets/admin.js`
- `assets/app.js`
- `assets/style.css`
- `supabase-schema.sql`
- `supabase-migration-v2.6-multi-pasangan.sql`

`supabase-config.js` tetap memakai Project URL dan **publishable key**. Jangan pernah memasukkan `sb_secret_...`, service-role key, atau password database ke GitHub.

## Instalasi baru

Untuk project Supabase baru: jalankan `supabase-schema.sql`, kemudian `supabase-seed.sql`, lalu jalankan `supabase-migration-v2.6-multi-pasangan.sql` untuk mengonversi pasangan dari seed menjadi struktur multi-pasangan.
