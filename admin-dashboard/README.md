# WO Platform — Super Admin Dashboard

Dashboard web untuk Super Admin berdasarkan PRD Work Order Management Platform.

## Tech Stack

- **Next.js 16** + TypeScript
- **Shadcn/ui** + Tailwind CSS v4
- **Zustand** — state management & persistensi lokal
- **Recharts** — visualisasi data dashboard
- **Lucide React** — ikon

## Fitur Super Admin

| Menu | Fitur |
|---|---|
| Dashboard | Statistik WO, performa mitra, grafik, WO terbaru |
| Manajemen Mitra | ACC / Suspend / Delete akun mitra |
| Upload WO Otomatis | Import batch via file CSV |
| Upload WO Manual | Input WO satu per satu via form |
| Bagi Hasil per WO | Setujui & tandai pembayaran komisi |
| Bukti Bagi Hasil | Rekap & export CSV bukti distribusi |

## Menjalankan

```bash
cd admin-dashboard
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Login Demo

| Field | Value |
|---|---|
| Email | `superadmin@wo-platform.com` |
| Password | `admin123` |

## Catatan

Data disinkronkan via **API server** (`/api/sync`) setiap 5 detik — perubahan dari mobile app CSO langsung terlihat di dashboard admin.

Login demo mitra mobile: `budi@email.com` / `mitra123`
