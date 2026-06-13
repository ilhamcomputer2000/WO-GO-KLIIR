# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Work Order Management Platform
### (Admin Dashboard & Mobile Apps Mitra)

---

| Informasi Dokumen | |
|---|---|
| Versi | 1.1 |
| Tanggal | Juni 2025 |
| Status | Draft |
| Dibuat oleh | [Nama Tim Product] |
| Terakhir Diperbarui | Juni 2026 |

---

## 1. Ringkasan Produk

### 1.1 Latar Belakang

Platform ini merupakan sistem manajemen Work Order (WO) yang menghubungkan admin dengan mitra pelaksana pekerjaan. Sistem terdiri dari dua komponen utama: Sistem Dashboard Admin berbasis web dan Mobile Apps untuk mitra. Tujuan utamanya adalah mengotomatiskan distribusi, pengelolaan, dan pelaporan work order secara real-time.

### 1.2 Tujuan Produk

- Mempermudah pengelolaan dan distribusi Work Order kepada mitra
- Memberikan transparansi progres pengerjaan secara real-time kepada admin
- Mengotomatiskan perhitungan dan distribusi komisi/bagi hasil kepada mitra
- Mendukung model bisnis B2B (ke perusahaan) dan B2C (ke customer langsung)
- Meningkatkan efisiensi operasional melalui digitalisasi proses manual

### 1.3 Ruang Lingkup

Produk mencakup tiga modul utama:

1. Sistem Dashboard Admin (web-based)
2. Mobile Apps untuk Mitra
3. Sistem Manajemen Akun Super Admin

---

## 2. Stakeholder & Pengguna

| Pengguna | Peran | Akses |
|---|---|---|
| Super Admin | Pengelola sistem tertinggi | Full access ke semua fitur dashboard |
| Admin | Operator harian | Input WO, manajemen mitra, laporan |
| Mitra | Pelaksana work order | Mobile apps — ambil WO, update progress, lihat komisi |
| Customer (B2C) | End user bisnis | Menerima layanan, tracking progress |
| Perusahaan (B2B) | Klien korporat | Kontrak layanan, monitoring karyawan |

---

## 3. Fitur Sistem Dashboard Admin

### 3.1 Akun Super Admin

Super Admin memiliki kendali penuh atas sistem dengan kapabilitas berikut:

#### 3.1.1 Manajemen Akun Mitra

- Approve (ACC) pendaftaran akun mitra baru
- Suspend akun mitra yang melanggar ketentuan
- Delete/hapus permanen akun mitra
- Melihat detail profil dan riwayat aktivitas mitra

#### 3.1.2 Manajemen Work Order

- Upload/input Work Order secara otomatis (via file/sistem integrasi)
- Upload/input Work Order secara manual (form entry)
- Distribusi WO kepada mitra berdasarkan per ID WO
- Bagi hasil/komisi otomatis berdasarkan WO yang telah dikerjakan mitra
- Bukti bagi hasil saldo berdasarkan WO yang sudah diselesaikan mitra

#### 3.1.3 Dashboard Super Admin

- Overview statistik WO: total, pending, in-progress, selesai
- Ringkasan performa mitra: jumlah WO selesai, komisi terdistribusi
- Laporan keuangan: total bagi hasil yang sudah/belum dibayarkan
- Filter & search WO berdasarkan berbagai parameter

### 3.2 Menu Utama Dashboard Admin

| No | Menu | Deskripsi |
|---|---|---|
| 1 | Dashboard Super Admin | Overview dan ringkasan seluruh aktivitas sistem |
| 2 | Manajemen Akun Mitra | ACC / Suspend / Delete akun mitra |
| 3 | Upload Work Order Otomatis | Input WO via integrasi sistem / file batch |
| 4 | Bagi Hasil per ID WO | Distribusi komisi kepada mitra berdasarkan WO selesai |
| 5 | Upload Work Order Manual | Input WO satu per satu via form |
| 6 | Bukti Bagi Hasil Saldo | Rekap bukti distribusi komisi berdasarkan WO selesai mitra |

---

## 4. Fitur Mobile Apps Mitra

### 4.1 Deskripsi Umum

Mobile Apps adalah aplikasi yang digunakan oleh mitra untuk menerima, mengerjakan, dan melaporkan Work Order. Aplikasi ini terhubung langsung ke sistem admin dan dibangun menggunakan **React Native (Expo)** — satu codebase untuk Android dan iOS.

### 4.2 Fitur Mobile Apps

#### 4.2.1 Dashboard Akun Mitra

- Tampilan ringkasan akun mitra: saldo komisi, WO aktif, riwayat
- Notifikasi WO baru yang tersedia
- Status akun mitra (aktif/suspend)

#### 4.2.2 Halaman Work Order

- Melihat daftar WO yang available/tersedia (di-input/upload oleh admin)
- Filter WO berdasarkan kategori, lokasi, atau nilai komisi
- Ambil/accept WO yang ingin dikerjakan
- Update progress pengerjaan WO secara real-time
- Upload bukti penyelesaian WO (foto/dokumen)

#### 4.2.3 Saldo & Komisi

- Melihat saldo komisi yang diterima dari admin
- Riwayat transaksi komisi per WO
- Detail breakdown komisi per ID WO

---

## 5. Model Bisnis & Integrasi

### 5.1 B2B (Business to Business)

Platform mendukung model B2B dengan fitur:

- **Ke Arah Kontrak:** pengelolaan kontrak kerja sama dengan perusahaan klien
- **Ngetrack Karyawan Progress:** monitoring progress pekerjaan karyawan dari perusahaan klien
- Laporan performa kerja untuk keperluan bisnis

### 5.2 B2C (Business to Customer Langsung)

Platform mendukung model B2C dengan fitur:

- **Ke Arah Kontrak:** pengelolaan kontrak langsung dengan customer individu
- Layanan langsung ke end-user tanpa perantara perusahaan

---

## 6. Alur Pengguna (User Flow)

### 6.1 Alur Admin — Input Work Order

1. Admin login ke Sistem Dashboard Admin
2. Admin membuat/upload Work Order (otomatis atau manual)
3. Sistem menyimpan WO dan membuat ID unik per WO
4. WO tersedia di sistem dan dapat dilihat oleh mitra via mobile apps
5. Admin mendistribusikan WO kepada mitra tertentu atau membuka untuk semua mitra

### 6.2 Alur Mitra — Mengerjakan Work Order

1. Mitra login ke Mobile Apps
2. Mitra melihat daftar WO yang tersedia
3. Mitra memilih dan mengambil/accept WO
4. Mitra update progress pengerjaan secara berkala
5. Mitra upload bukti penyelesaian WO
6. Admin memverifikasi penyelesaian WO
7. Sistem otomatis menghitung dan menambahkan komisi ke saldo mitra

### 6.3 Alur Bagi Hasil

1. Admin mengkonfirmasi WO yang telah selesai dikerjakan mitra
2. Sistem menghitung komisi berdasarkan nilai WO
3. Admin menyetujui distribusi komisi
4. Saldo mitra otomatis bertambah di Mobile Apps
5. Bukti bagi hasil tersimpan dan dapat dilihat oleh admin

---

## 7. Persyaratan Non-Fungsional

### 7.1 Performa

- Waktu respons API maksimal 3 detik untuk operasi normal
- Mobile Apps mendukung mode offline untuk melihat WO yang sudah diambil
- Dashboard admin dapat menangani minimal 1000 WO aktif secara bersamaan

### 7.2 Keamanan

- Autentikasi menggunakan JWT Token dengan masa berlaku 24 jam
- Enkripsi data sensitif (saldo, komisi, data pribadi mitra)
- Role-based access control: Super Admin, Admin, dan Mitra
- Log aktivitas seluruh aksi admin untuk audit trail

### 7.3 Kompatibilitas

- Mobile Apps: Android minimal versi 8.0 dan iOS minimal versi 13
- Dashboard Admin: browser Chrome, Firefox, Safari (2 versi terbaru)
- Responsive design untuk akses dashboard via tablet

---

## 8. Tech Stack

### 8.1 Ringkasan Keputusan Teknologi

Stack dipilih berdasarkan tiga prinsip: **satu bahasa (TypeScript) untuk seluruh tim**, **time-to-market cepat**, dan **biaya infrastruktur rendah di fase awal**.

### 8.2 Frontend — Admin Dashboard

| Komponen | Teknologi | Alasan |
|---|---|---|
| Framework | Next.js + TypeScript | SSR/SSG cepat, ekosistem besar, mudah deploy ke Vercel |
| UI Library | Shadcn/ui + Tailwind CSS | Komponen siap pakai, tidak perlu banyak custom CSS |
| State Management | Zustand / React Query | Ringan, mudah dipelajari tim baru |

### 8.3 Mobile Apps — Mitra

| Komponen | Teknologi | Alasan |
|---|---|---|
| Framework | **React Native (Expo)** | Satu codebase Android & iOS, bahasa TypeScript sama dengan web |
| Alasan dipilih vs Flutter | React Native | Tim sudah pakai TypeScript, logic bisa di-share dengan web, Supabase SDK lebih mature di JS/TS, Expo mempercepat dev (kamera, push notif, file picker sudah siap) |
| Navigasi | Expo Router | File-based routing, konsisten dengan Next.js |

> **Catatan:** Flutter tidak dipilih karena membutuhkan pembelajaran bahasa Dart dari awal, yang menambah 2–4 minggu onboarding tim sebelum produktif. Untuk skala dan timeline proyek ini, React Native + Expo adalah pilihan paling efisien.

### 8.4 Backend & API

| Komponen | Teknologi | Alasan |
|---|---|---|
| Runtime | Node.js | Sama-sama TypeScript, mudah share tipe data dengan frontend |
| Framework | NestJS | Terstruktur, cocok untuk tim yang berkembang, dukungan dependency injection |
| Autentikasi | JWT Token (via Supabase Auth) | Stateless, mudah divalidasi di mobile dan web |

### 8.5 Database & Infrastruktur

| Komponen | Teknologi | Alasan |
|---|---|---|
| Database utama | PostgreSQL (via Supabase) | Reliable, support relasi kompleks, ACID compliant |
| Cache | Redis | Mempercepat response API, cache session & token |
| File storage | Supabase Storage | Upload bukti WO, foto, dokumen mitra |
| Realtime | Supabase Realtime (Websocket) | Update status WO live tanpa refresh di dashboard admin |

### 8.6 Deployment

| Komponen | Platform | Alasan |
|---|---|---|
| Admin Dashboard | Vercel | Auto-deploy dari GitHub, gratis untuk awal, CDN global |
| Backend API | Railway | Mudah setup, harga terjangkau, auto-scale |
| Database & Storage | Supabase | PostgreSQL + Auth + Storage + Realtime dalam satu platform |
| Mobile | App Store & Google Play Store | Distribusi resmi ke pengguna akhir (mitra) |

---

## 9. Kriteria Penerimaan (Acceptance Criteria)

| Fitur | Kriteria Keberhasilan |
|---|---|
| Login Admin | Admin dapat login dengan email & password, sistem menampilkan dashboard dalam < 3 detik |
| Manajemen Akun Mitra | Admin dapat ACC/suspend/delete akun mitra, perubahan status langsung berlaku di mobile apps mitra |
| Upload WO Otomatis | File WO (Excel/CSV) dapat diupload, sistem parsing dan menyimpan seluruh data WO dengan benar |
| Upload WO Manual | Admin dapat menginput WO via form, WO langsung muncul di list WO mobile apps mitra |
| Ambil WO (Mitra) | Mitra dapat melihat semua WO available dan mengambil WO, status WO berubah jadi 'in-progress' |
| Update Progress | Mitra dapat update progress dan upload bukti, admin dapat melihat perubahan secara real-time |
| Bagi Hasil | Setelah WO selesai diverifikasi admin, saldo mitra otomatis bertambah sesuai nilai komisi |
| Bukti Bagi Hasil | Admin dapat mengunduh/melihat rekap bukti distribusi komisi per periode dan per mitra |
| B2B Tracking | Admin/perusahaan dapat melihat progress pekerjaan karyawan mitra secara real-time |

---

## 10. Prioritas Pengembangan

| Prioritas | Fitur | Timeline |
|---|---|---|
| P0 — Must Have | Login & autentikasi (admin & mitra) | Sprint 1 |
| P0 — Must Have | Manajemen akun mitra (ACC/suspend/delete) | Sprint 1 |
| P0 — Must Have | Upload & simpan Work Order manual | Sprint 1 |
| P0 — Must Have | Mobile apps: lihat & ambil WO | Sprint 2 |
| P0 — Must Have | Mobile apps: update progress WO | Sprint 2 |
| P1 — Should Have | Upload WO otomatis (batch/file) | Sprint 3 |
| P1 — Should Have | Sistem bagi hasil & saldo otomatis | Sprint 3 |
| P1 — Should Have | Bukti bagi hasil & rekap laporan | Sprint 4 |
| P2 — Nice to Have | Integrasi B2B tracking karyawan | Sprint 5 |
| P2 — Nice to Have | Integrasi B2C kontrak langsung | Sprint 5 |
| P3 — Future | Notifikasi push mobile apps | Sprint 6+ |

---

## 11. Open Questions & Asumsi

### 10.1 Open Questions

- Bagaimana mekanisme autentikasi mitra saat pertama kali daftar? Apakah via referral code atau registrasi mandiri?
- Apakah ada SLA (Service Level Agreement) untuk setiap WO? Jika ya, bagaimana sistem memantau keterlambatan?
- Metode pembayaran komisi: transfer bank otomatis atau saldo dalam aplikasi yang bisa dicairkan?
- Apakah satu WO bisa dikerjakan oleh lebih dari satu mitra (split WO)?
- Bagaimana penanganan dispute jika mitra mengklaim WO selesai tapi admin tidak setuju?

### 10.2 Asumsi

- Setiap mitra hanya memiliki satu akun yang terhubung ke satu nomor telepon/email
- Admin adalah entitas tunggal yang dikelola oleh perusahaan pemilik platform
- Nilai komisi per WO sudah ditentukan saat WO dibuat oleh admin
- Koneksi internet diperlukan untuk pengambilan dan update WO

---

## 12. Glosarium

| Istilah | Definisi |
|---|---|
| WO (Work Order) | Perintah kerja yang berisi deskripsi pekerjaan, nilai komisi, dan deadline yang harus dikerjakan oleh mitra |
| Mitra | Individu atau tim yang terdaftar di platform untuk mengerjakan Work Order |
| Super Admin | Pengguna dengan hak akses tertinggi yang mengelola seluruh sistem termasuk akun admin lain |
| Bagi Hasil | Komisi yang diberikan kepada mitra setelah Work Order selesai dikerjakan dan diverifikasi |
| B2B | Model bisnis Business-to-Business: layanan diberikan kepada perusahaan klien |
| B2C | Model bisnis Business-to-Customer: layanan diberikan langsung kepada individu/customer |
| ACC | Approve/menyetujui; dalam konteks ini berarti mengaktifkan/menyetujui akun mitra |

---

*Dokumen ini bersifat living document dan akan terus diperbarui seiring perkembangan produk.*
