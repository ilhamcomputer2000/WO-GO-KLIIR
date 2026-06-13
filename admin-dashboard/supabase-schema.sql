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
