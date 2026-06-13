-- GO KLIRR Work Order Platform — Schema v1
-- Jalankan di Supabase SQL Editor

-- Mitra / CSO
CREATE TABLE IF NOT EXISTS mitra (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT NOT NULL DEFAULT 'mitra123',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_wo INTEGER NOT NULL DEFAULT 0,
  total_commission BIGINT NOT NULL DEFAULT 0,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work Orders (slots disimpan sebagai JSONB)
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  commission BIGINT NOT NULL,
  work_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  required_cso INTEGER NOT NULL DEFAULT 1,
  slots JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payout / Bagi Hasil
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  wo_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  wo_title TEXT NOT NULL,
  mitra_id TEXT NOT NULL REFERENCES mitra(id),
  mitra_name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at DATE
);

-- Bukti penyelesaian WO (foto)
CREATE TABLE IF NOT EXISTS completion_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  wo_title TEXT NOT NULL,
  mitra_id TEXT NOT NULL REFERENCES mitra(id),
  mitra_name TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_date ON work_orders(work_date);
CREATE INDEX IF NOT EXISTS idx_completion_proofs_wo ON completion_proofs(wo_id);
CREATE INDEX IF NOT EXISTS idx_completion_proofs_mitra ON completion_proofs(mitra_id);

-- Storage bucket bukti foto (jalankan sekali di SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wo-proofs', 'wo-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: service role upload; public read
CREATE POLICY IF NOT EXISTS "Public read wo-proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wo-proofs');

CREATE POLICY IF NOT EXISTS "Service upload wo-proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wo-proofs');
