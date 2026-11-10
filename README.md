# Jimpitan Kampung (server sendiri)

Butuh Node.js 18 atau lebih baru. Tidak perlu `npm install`.

## Menjalankan
Linux/Mac:
    ADMIN_PASSWORD="sandi-pemilik" PETUGAS_PIN="1234" node server.js
Windows (PowerShell):
    $env:ADMIN_PASSWORD="sandi-pemilik"; $env:PETUGAS_PIN="1234"; node server.js

Buka http://localhost:3000, masuk dengan ADMIN_PASSWORD (pemilik, bisa mengubah semua data)
atau PETUGAS_PIN (petugas, setorannya menunggu persetujuan pemilik).

## Penting sebelum mencetak QR
Kode QR memakai alamat yang Anda pakai saat membuka halaman ini. Buka halaman lewat alamat
final yang akan dipakai petugas (domain atau IP server), baru cetak kartu QR.
Dari HP di WiFi yang sama: http://IP-KOMPUTER:3000

## Data dan cadangan
Semua data ada di file `data.json`. Salin file itu secara berkala sebagai cadangan.
Untuk menyimpan di folder lain: DATA_DIR=/folder/lain

## Dipasang online (VPS/hosting)
- Jalankan terus-menerus dengan pm2 (`pm2 start server.js`) atau systemd.
- Pasang HTTPS lewat Caddy atau nginx di depan server, lalu set HTTPS=1.
- Ganti PORT dengan PORT=8080 jika perlu.
