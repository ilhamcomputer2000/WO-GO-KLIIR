-- ============================================================
-- WO GO KLIRR — Supabase Schema
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabel Mitra (CSO)
create table if not exists mitra (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text default '',
  password text not null default 'mitra123',
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  registered_at text default (to_char(now(), 'YYYY-MM-DD')),
  completed_wo integer default 0,
  total_commission numeric default 0,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabel Work Orders
create table if not exists work_orders (
  id text primary key,
  title text not null,
  description text default '',
  category text not null,
  location text not null,
  commission numeric not null default 0,
  work_date text not null,
  start_time text not null,
  end_time text not null,
  duration_minutes integer not null default 60,
  required_cso integer not null default 1,
  slots jsonb not null default '[]',
  status text not null default 'available' check (status in ('pending','available','in_progress','completed','verified')),
  progress integer default 0,
  created_at text default (to_char(now(), 'YYYY-MM-DD')),
  updated_at timestamptz default now()
);

-- Tabel Payouts
create table if not exists payouts (
  id text primary key,
  wo_id text not null references work_orders(id) on delete cascade,
  wo_title text not null,
  mitra_id text not null references mitra(id) on delete cascade,
  mitra_name text not null,
  slot_id text not null,
  amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  created_at text default (to_char(now(), 'YYYY-MM-DD')),
  verified_at text,
  paid_at text,
  transfer_proof_url text,
  transfer_proof_storage_path text,
  transfer_proof_uploaded_at text
);

-- Tabel Completion Proofs
create table if not exists completion_proofs (
  id text primary key,
  wo_id text not null references work_orders(id) on delete cascade,
  wo_title text not null,
  mitra_id text not null references mitra(id) on delete cascade,
  mitra_name text not null,
  slot_id text not null,
  image_url text not null,
  storage_path text,
  proof_type text not null default 'after' check (proof_type in ('before','after')),
  remark text,
  uploaded_at timestamptz default now()
);

-- Enable Realtime untuk semua tabel
alter publication supabase_realtime add table work_orders;
alter publication supabase_realtime add table payouts;
alter publication supabase_realtime add table completion_proofs;
alter publication supabase_realtime add table mitra;

-- Seed data mitra contoh
insert into mitra (id, name, email, phone, password, status, registered_at, completed_wo, total_commission)
values
  ('mitra-001', 'Budi Santoso', 'budi@email.com', '08111234567', 'mitra123', 'active', '2025-01-10', 5, 3750000),
  ('mitra-002', 'Siti Rahayu', 'siti@email.com', '08222345678', 'mitra123', 'active', '2025-01-15', 3, 2250000),
  ('mitra-003', 'Agus Prasetyo', 'agus@email.com', '08333456789', 'mitra123', 'pending', '2025-01-20', 0, 0)
on conflict (id) do nothing;

-- ============================================================
-- Migration: tambah kolom proof_type dan remark ke completion_proofs
-- Jalankan ini jika tabel completion_proofs sudah ada sebelumnya
-- ============================================================
alter table completion_proofs
  add column if not exists proof_type text not null default 'after'
    check (proof_type in ('before','after')),
  add column if not exists remark text;

-- ============================================================
-- Migration: tambah kolom KTP ke tabel mitra
-- Jalankan ini jika tabel mitra sudah ada sebelumnya
-- ============================================================
alter table mitra
  add column if not exists religion text,
  add column if not exists birth_place text,
  add column if not exists birth_date text,
  add column if not exists marital_status text,
  add column if not exists gender text,
  add column if not exists ktp_image_url text;

-- Migration: tambah kolom nik ke tabel mitra
alter table mitra add column if not exists nik text;

-- Migration: tambah kolom bank ke tabel mitra
alter table mitra
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_name text;

-- ============================================================
-- Tabel Notifications — untuk notifikasi realtime
-- ============================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null,
  data jsonb default null,
  read boolean not null default false,
  target text not null default 'all' check (target in ('admin','mitra','all')),
  mitra_id text references mitra(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable realtime untuk notifications
alter publication supabase_realtime add table notifications;

-- Index untuk query cepat
create index if not exists idx_notifications_target on notifications(target);
create index if not exists idx_notifications_mitra_id on notifications(mitra_id);
create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
