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

-- =====================================================
-- FUNGSI OTOMATIS HASH PASSWORD (SHA-256)
-- =====================================================
-- Function ini akan otomatis hash password saat insert
-- Cukup ketik password biasa, tidak perlu hash manual!

CREATE OR REPLACE FUNCTION hash_password(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(plain_text::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Buat trigger untuk auto-hash saat insert/update
CREATE OR REPLACE FUNCTION auto_hash_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Hash password baru jika belum di-hash (64 char = SHA-256 hash)
  IF length(NEW.password_hash) != 64 OR 
     NEW.password_hash !~ '^[a-f0-9]{64}$' THEN
    NEW.password_hash := encode(sha256(NEW.password_hash::bytea), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_hash_password ON pegawai;
CREATE TRIGGER trigger_auto_hash_password
  BEFORE INSERT OR UPDATE ON pegawai
  FOR EACH ROW
  EXECUTE FUNCTION auto_hash_password();

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
-- Default password: 'pln2024'
-- Password akan di-hash OTOMATIS oleh trigger!
-- Cukup ketik password biasa, tidak perlu hash manual!
-- =====================================================

INSERT INTO pegawai (id_pegawai, nama_pegawai, password_hash) VALUES
('101001', 'Irwan Setiawan', 'pln2024'),
('101002', 'Ratna Dewi', 'pln2024'),
('101003', 'Muhammad Iqbal', 'pln2024'),
('101004', 'Susi Susanti', 'pln2024'),
('101005', 'Andi Pratama', 'pln2024');

-- =====================================================
-- MENAMBAH PETUGAS BARU (CARA MUDAH!)
-- Cukup jalankan SQL ini dengan password biasa:
-- 
-- INSERT INTO pegawai (id_pegawai, nama_pegawai, password_hash)
-- VALUES ('101006', 'Nama Baru', 'password_baru');
--
-- Password akan di-hash OTOMATIS!
-- =====================================================
