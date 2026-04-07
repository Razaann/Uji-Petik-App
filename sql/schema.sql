-- =====================================================
-- SQL UNTUK MEMBUAT TABEL DI SUPABASE
-- Jalankan di Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Buat tabel PEGAWAI
CREATE TABLE IF NOT EXISTS pegawai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pegawai TEXT UNIQUE NOT NULL,
  nama_pegawai TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat tabel UJI_PETIK
CREATE TABLE IF NOT EXISTS uji_petik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pegawai UUID REFERENCES pegawai(id) ON DELETE SET NULL,
  id_pelanggan TEXT NOT NULL,
  nama_pelanggan TEXT NOT NULL,
  nik TEXT NOT NULL,
  alamat TEXT NOT NULL,
  items JSONB NOT NULL,
  photo_url TEXT,
  validation_status TEXT DEFAULT 'GREEN',
  is_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hapus data lama yang tidak ada is_synced (opsional, jalankan jika perlu)
-- DELETE FROM uji_petik WHERE is_synced IS NULL;

-- Update is_synced untuk data yang sudah ada
UPDATE uji_petik SET is_synced = TRUE WHERE is_synced IS NULL;

-- 3. Aktifkan RLS (Row Level Security)
ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE uji_petik ENABLE ROW LEVEL SECURITY;

-- 4. Buat Policy untuk akses publik
CREATE POLICY "Allow all for pegawai" ON pegawai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for uji_petik" ON uji_petik FOR ALL USING (true) WITH CHECK (true);

-- 5. Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_uji_petik_id_pegawai ON uji_petik(id_pegawai);
CREATE INDEX IF NOT EXISTS idx_uji_petik_created_at ON uji_petik(created_at DESC);

-- =====================================================
-- INSERT DATA PETUGAS (DARI CSV)
-- Default password: 'pln2024' (bisa dihash dengan bcrypt)
-- =====================================================

INSERT INTO pegawai (id_pegawai, nama_pegawai, password_hash) VALUES
('101001', 'Irwan Setiawan', 'pln2024'),
('101002', 'Ratna Dewi', 'pln2024'),
('101003', 'Muhammad Iqbal', 'pln2024'),
('101004', 'Susi Susanti', 'pln2024'),
('101005', 'Andi Pratama', 'pln2024');
