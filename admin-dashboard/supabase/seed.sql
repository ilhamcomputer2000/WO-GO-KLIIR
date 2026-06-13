-- Seed data awal (jalankan setelah migration)
-- Hapus data lama jika perlu: TRUNCATE mitra, work_orders, payouts, completion_proofs CASCADE;

INSERT INTO mitra (id, name, email, phone, password, status, registered_at, completed_wo, total_commission, address) VALUES
  ('MTR-001', 'Budi Santoso', 'budi@email.com', '081234567890', 'mitra123', 'active', '2025-05-10', 24, 12500000, 'Jakarta Selatan'),
  ('MTR-002', 'Siti Rahayu', 'siti@email.com', '081298765432', 'mitra123', 'active', '2025-05-15', 18, 9800000, 'Bandung'),
  ('MTR-003', 'Ahmad Wijaya', 'ahmad@email.com', '085678901234', 'mitra123', 'pending', '2025-06-01', 0, 0, 'Surabaya'),
  ('MTR-004', 'Dewi Lestari', 'dewi@email.com', '087654321098', 'mitra123', 'suspended', '2025-04-20', 5, 2100000, 'Yogyakarta'),
  ('MTR-005', 'Rizki Pratama', 'rizki@email.com', '089012345678', 'mitra123', 'pending', '2025-06-05', 0, 0, 'Medan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO work_orders (id, title, description, category, location, commission, work_date, start_time, end_time, duration_minutes, required_cso, slots, status, progress, created_at) VALUES
  ('WO-2025-001', 'Instalasi AC Ruang Meeting', 'Instalasi dan pengujian AC split 2 PK', 'Instalasi', 'Jakarta Pusat', 750000, '2025-06-15', '08:00', '12:00', 240, 1,
   '[{"id":"SLOT-1","slotNumber":1,"mitraId":"MTR-001","mitraName":"Budi Santoso","status":"completed","progress":100}]'::jsonb, 'completed', 100, '2025-06-01'),
  ('WO-2025-002', 'Perbaikan Jaringan Internet', 'Troubleshooting koneksi jaringan', 'IT Support', 'Bandung', 500000, '2025-06-20', '09:00', '17:00', 120, 1,
   '[{"id":"SLOT-1","slotNumber":1,"mitraId":"MTR-002","mitraName":"Siti Rahayu","status":"taken","progress":65}]'::jsonb, 'in_progress', 65, '2025-06-03'),
  ('WO-2025-003', 'Pembersihan Gedung', 'Deep cleaning lobi — butuh 3 CSO', 'Kebersihan', 'Surabaya', 450000, '2025-06-18', '07:00', '11:00', 60, 3,
   '[{"id":"SLOT-1","slotNumber":1,"status":"open"},{"id":"SLOT-2","slotNumber":2,"status":"open"},{"id":"SLOT-3","slotNumber":3,"status":"open"}]'::jsonb, 'available', 0, '2025-06-05'),
  ('WO-2025-004', 'Maintenance Lift', 'Pemeriksaan rutin lift', 'Maintenance', 'Jakarta Selatan', 1200000, '2025-06-25', '10:00', '15:00', 90, 2,
   '[{"id":"SLOT-1","slotNumber":1,"status":"open"},{"id":"SLOT-2","slotNumber":2,"status":"open"}]'::jsonb, 'pending', 0, '2025-06-06'),
  ('WO-2025-005', 'Penggantian Lampu LED', 'Ganti lampu koridor', 'Elektrikal', 'Yogyakarta', 450000, '2025-06-22', '13:00', '18:00', 180, 1,
   '[{"id":"SLOT-1","slotNumber":1,"mitraId":"MTR-001","mitraName":"Budi Santoso","status":"completed","progress":100}]'::jsonb, 'verified', 100, '2025-05-28'),
  ('WO-2025-006', 'Pembersihan Lantai 1-3', 'Pembersihan harian — 2 CSO', 'Kebersihan', 'Medan', 300000, '2025-06-30', '08:30', '12:30', 60, 2,
   '[{"id":"SLOT-1","slotNumber":1,"mitraId":"MTR-002","mitraName":"Siti Rahayu","status":"taken","progress":50},{"id":"SLOT-2","slotNumber":2,"status":"open"}]'::jsonb, 'in_progress', 50, '2025-06-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payouts (id, wo_id, wo_title, mitra_id, mitra_name, slot_id, amount, status, created_at, verified_at, paid_at) VALUES
  ('PAY-001', 'WO-2025-001', 'Instalasi AC Ruang Meeting', 'MTR-001', 'Budi Santoso', 'SLOT-1', 750000, 'paid', '2025-06-10', '2025-06-10', '2025-06-12'),
  ('PAY-002', 'WO-2025-005', 'Penggantian Lampu LED', 'MTR-001', 'Budi Santoso', 'SLOT-1', 450000, 'approved', '2025-06-08', '2025-06-08', NULL),
  ('PAY-003', 'WO-2025-002', 'Perbaikan Jaringan Internet', 'MTR-002', 'Siti Rahayu', 'SLOT-1', 500000, 'pending', '2025-06-07', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
