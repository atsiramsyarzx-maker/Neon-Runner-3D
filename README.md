# Neon Runner - server publik

## Jalankan di komputer
    node server.js
Buka http://localhost:3000

## Pasang online (contoh: Render.com)
1. Unggah folder ini ke repo GitHub.
2. Render > New > Web Service > pilih repo. Build Command kosong, Start Command: `node server.js`.
3. Setelah jadi, Anda dapat alamat publik (https://nama-anda.onrender.com) yang bisa dibagikan ke siapa saja.

## PENTING: agar data akun tidak hilang
Data disimpan di file `data/db.json`. Di paket gratis kebanyakan hosting, disk dihapus saat server restart/deploy ulang.
Pasang "Persistent Disk/Volume" (mis. mount ke /var/data) lalu set variabel lingkungan `DATA_DIR=/var/data`.

## Catatan keamanan
Sandi di-hash (scrypt) dan ada pembatas percobaan login, tetapi koin dihitung di browser pemain,
jadi pemain yang paham bisa curang. Untuk game kompetitif, skor/koin perlu divalidasi di server.
