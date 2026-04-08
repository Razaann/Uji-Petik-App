-- =====================================================
-- SQL UNTUK MEMBUAT 3 TABEL DI SUPABASE
-- Menggunakan TEXT sebagai Primary Key (bukan UUID)
-- =====================================================

-- 1. Buat tabel PEGAWAI (id_pegawai sebagai PRIMARY KEY)
CREATE TABLE IF NOT EXISTS pegawai (
  id_pegawai TEXT PRIMARY KEY,
  nama_pegawai TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat tabel PELANGGAN (id_pelanggan sebagai PRIMARY KEY)
CREATE TABLE IF NOT EXISTS pelanggan (
  id_pelanggan TEXT PRIMARY KEY,
  nama_pelanggan TEXT NOT NULL,
  nik TEXT NOT NULL,
  alamat TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat tabel UJI_PETIK (DENGAN FOREIGN KEY ke TEXT)
CREATE TABLE IF NOT EXISTS uji_petik (
  id SERIAL PRIMARY KEY,
  id_pegawai TEXT REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
  id_pelanggan TEXT REFERENCES pelanggan(id_pelanggan) ON DELETE CASCADE,
  items JSONB NOT NULL,
  photo_url TEXT,
  validation_status TEXT DEFAULT 'GREEN',
  is_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNGSI OTOMATIS HASH PASSWORD (SHA-256)
-- =====================================================

CREATE OR REPLACE FUNCTION hash_password(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(plain_text::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION auto_hash_password()
RETURNS TRIGGER AS $$
BEGIN
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

-- =====================================================
-- AKTIVASI RLS (Row Level Security)
-- =====================================================

ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE uji_petik ENABLE ROW LEVEL SECURITY;

-- Policy untuk akses publik
CREATE POLICY "Allow all for pegawai" ON pegawai FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for pelanggan" ON pelanggan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for uji_petik" ON uji_petik FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- INDEX UNTUK PERFORMA QUERY
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_uji_petik_id_pegawai ON uji_petik(id_pegawai);
CREATE INDEX IF NOT EXISTS idx_uji_petik_id_pelanggan ON uji_petik(id_pelanggan);
CREATE INDEX IF NOT EXISTS idx_uji_petik_created_at ON uji_petik(created_at DESC);

-- =====================================================
-- INSERT DATA PETUGAS
-- Password akan di-hash OTOMATIS oleh trigger!
-- =====================================================

INSERT INTO pegawai (id_pegawai, nama_pegawai, password_hash) VALUES
('101001', 'Irwan Setiawan', 'pln2024'),
('101002', 'Ratna Dewi', 'pln2024'),
('101003', 'Muhammad Iqbal', 'pln2024'),
('101004', 'Susi Susanti', 'pln2024'),
('101005', 'Andi Pratama', 'pln2024')
ON CONFLICT (id_pegawai) DO NOTHING;

-- =====================================================
-- MENAMBAH PETUGAS BARU (CARA MUDAH!)
-- Cukup jalankan SQL ini dengan password biasa:
-- 
-- INSERT INTO pegawai (id_pegawai, nama_pegawai, password_hash)
-- VALUES ('101006', 'Nama Baru', 'password_baru');
--
-- Password akan di-hash OTOMATIS!
-- =====================================================

-- =====================================================
-- MENAMBAH PELANGGAN (OPSIONAL)
-- Pelanggan biasanya diinsert otomatis saat input uji petik
-- Tapi bisa juga diinsert manual:
--
-- INSERT INTO pelanggan (id_pelanggan, nama_pelanggan, nik, alamat)
-- VALUES ('123456789012', 'Nama Pelanggan', '1234567890123456', 'Alamat');
-- =====================================================
