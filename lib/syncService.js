import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const OFFLINE_KEY = 'offline_uji_petik';

// Fungsi untuk cek atau buat pelanggan (TEXT sebagai PK)
export const findOrCreatePelanggan = async (pelangganData) => {
  try {
    // Cek apakah pelanggan sudah ada berdasarkan id_pelanggan (TEXT)
    const { data: existing } = await supabase
      .from('pelanggan')
      .select('*')
      .eq('id_pelanggan', pelangganData.id_pelanggan)
      .single();

    if (existing) {
      return { data: existing, isNew: false };
    }

    // Insert pelanggan baru
    const { data: newPelanggan, error } = await supabase
      .from('pelanggan')
      .insert([{
        id_pelanggan: pelangganData.id_pelanggan,
        nama_pelanggan: pelangganData.nama_pelanggan,
        nik: pelangganData.nik,
        alamat: pelangganData.alamat
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting pelanggan:', error);
      throw error;
    }

    return { data: newPelanggan, isNew: true };
  } catch (e) {
    console.error('Error in findOrCreatePelanggan:', e);
    throw e;
  }
};

export const getOfflineInspections = async () => {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading offline data:', e);
    return [];
  }
};

export const saveOfflineInspection = async (inspection) => {
  try {
    const existing = await getOfflineInspections();
    existing.push(inspection);
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error('Error saving offline inspection:', e);
    return false;
  }
};

export const removeOfflineInspection = async (id) => {
  try {
    const existing = await getOfflineInspections();
    const filtered = existing.filter(item => item.id !== id);
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Error removing offline inspection:', e);
    return false;
  }
};

export const removeOfflineInspectionByCustomer = async (idPelanggan, idPegawai) => {
  try {
    const existing = await getOfflineInspections();
    const filtered = existing.filter(
      item => !(item.id_pelanggan === idPelanggan && item.id_pegawai === idPegawai)
    );
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Error removing offline inspection by customer:', e);
    return false;
  }
};

export const getPendingCount = async () => {
  const offline = await getOfflineInspections();
  return offline.length;
};

const uploadOfflineImage = async (localUri, id) => {
  try {
    if (!localUri || !localUri.startsWith('data:image')) return localUri;

    const base64Data = localUri.split(';')[1].split(',')[1];
    const fileName = `documentation/${id}_${Date.now()}.jpg`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('foto-dokumentasi')
      .upload(filePath, decode(base64Data), { contentType: 'image/jpeg' });

    if (error) {
      console.error('Image upload error:', error);
      return localUri;
    }

    const { data: urlData } = supabase.storage
      .from('foto-dokumentasi')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Upload error:', e);
    return localUri;
  }
};

const decode = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const bytes = [];

  for (let i = 0; i < base64.length; i += 4) {
    const a = chars.indexOf(base64[i]);
    const b = chars.indexOf(base64[i + 1]);
    const c = chars.indexOf(base64[i + 2]);
    const d = chars.indexOf(base64[i + 3]);

    const triplet = (a << 2) | (b >> 4);
    bytes.push(triplet);

    if (c !== -1 && c !== 64) {
      const triplet2 = ((b & 15) << 4) | (c >> 2);
      bytes.push(triplet2);
    }

    if (d !== -1 && d !== 64) {
      const triplet3 = ((c & 3) << 6) | d;
      bytes.push(triplet3);
    }
  }

  return new Uint8Array(bytes);
};

export const syncInspection = async (inspection) => {
  try {
    // Cek apakah data sudah ada berdasarkan id_pelanggan
    const { data: existingData } = await supabase
      .from('uji_petik')
      .select('id')
      .eq('id_pelanggan', inspection.id_pelanggan)
      .eq('id_pegawai', inspection.id_pegawai)
      .single();

    if (existingData) {
      await removeOfflineInspection(inspection.id);
      return { success: true, skipped: true, message: 'Data already exists' };
    }

    // 1. Cek atau insert pelanggan (TEXT sebagai PK)
    const pelangganResult = await findOrCreatePelanggan({
      id_pelanggan: inspection.id_pelanggan,
      nama_pelanggan: inspection.nama_pelanggan,
      nik: inspection.nik,
      alamat: inspection.alamat
    });

    if (!pelangganResult || !pelangganResult.data) {
      throw new Error('Failed to get pelanggan');
    }

    // 2. Upload foto
    const photoUrl = await uploadOfflineImage(inspection.photo_url, inspection.id);

    // 3. Insert uji_petik dengan foreign key TEXT
    const { error } = await supabase
      .from('uji_petik')
      .insert([{
        id_pegawai: inspection.id_pegawai,
        id_pelanggan: pelangganResult.data.id_pelanggan,
        items: inspection.items,
        photo_url: photoUrl,
        validation_status: inspection.validation_status,
        is_synced: true,
        created_at: inspection.created_at || new Date().toISOString()
      }]);

    if (error) {
      console.error('Sync error:', error);
      return { success: false, error };
    }

    await removeOfflineInspection(inspection.id);
    return { success: true };
  } catch (e) {
    console.error('Sync exception:', e);
    return { success: false, error: e };
  }
};

export const syncAllPending = async (userId, onProgress) => {
  const allOffline = await getOfflineInspections();
  const pending = allOffline.filter(item => item.id_pegawai === userId);
  const results = { success: 0, failed: 0, skipped: 0, total: pending.length };

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const result = await syncInspection(item);
    
    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.success++;
      }
    } else {
      results.failed++;
    }

    if (onProgress) {
      onProgress({
        ...results,
        current: i + 1,
        item
      });
    }
  }

  return results;
};
