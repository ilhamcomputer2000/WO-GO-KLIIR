-- Workflow verifikasi admin + bukti transfer mitra

ALTER TABLE payouts ADD COLUMN IF NOT EXISTS slot_id TEXT DEFAULT 'SLOT-1';
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_proof_storage_path TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_proof_uploaded_at TIMESTAMPTZ;

-- Perluas status payout
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));

-- Storage bucket bukti transfer admin
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer-proofs', 'transfer-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public read transfer-proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transfer-proofs');

CREATE POLICY IF NOT EXISTS "Service upload transfer-proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transfer-proofs');
