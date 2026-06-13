# GO KLIRR — Mobile App CSO Mitra

Aplikasi React Native (Expo) untuk mitra CSO mengambil slot Work Order.

## Fitur

- Login mitra CSO
- Lihat WO tersedia (yang masih punya slot terbuka)
- Detail WO + daftar slot CSO
- **Ambil slot** — 1 mitra = 1 slot per WO
- WO Saya — pekerjaan yang sudah diambil

## Menjalankan

### 1. Jalankan backend API (admin-dashboard)

```bash
cd ../admin-dashboard
npm run dev
```

API berjalan di `http://localhost:3000`

### 2. Jalankan mobile app

```bash
cd mobile-app
npm install
npm start
```

Tekan `w` untuk web, atau scan QR di Expo Go (HP fisik).

### 3. Konfigurasi API URL

Copy `.env.example` ke `.env` dan sesuaikan:

| Platform | URL |
|---|---|
| Web / iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| HP fisik (Expo Go) | `http://<IP-komputer>:3000` |

## Login Demo

| Field | Value |
|---|---|
| Email | `budi@email.com` |
| Password | `mitra123` |

Mitra lain aktif: `siti@email.com` / `mitra123`

## Alur Ambil Slot

1. CSO login → buka **WO Tersedia**
2. Pilih WO (contoh: Pembersihan Gedung — 3 slot)
3. Tap WO → lihat detail slot
4. Tap **Ambil Slot** → 1 slot terisi atas nama CSO
5. Mitra lain bisa ambil slot sisanya (login `siti@email.com`)

## Update Progress WO

1. Ambil slot di WO Tersedia
2. Buka WO dari tab **WO Saya**
3. Tap tombol progress: **25% → 50% → 75% → 100%**
4. Admin dashboard otomatis update (sync setiap 5 detik)

## Sinkronisasi Admin ↔ Mobile

Admin dashboard dan mobile app memakai **API server yang sama** (`/api/sync`).
- Mitra ambil slot di mobile → langsung muncul di admin
- Admin buat WO baru → muncul di mobile setelah refresh/sync
