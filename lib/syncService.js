import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const OFFLINE_KEY = 'offline_uji_petik';

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
    const photoUrl = await uploadOfflineImage(inspection.photo_url, inspection.id);

    const { error } = await supabase
      .from('uji_petik')
      .insert([{
        id_pegawai: inspection.id_pegawai,
        id_pelanggan: inspection.id_pelanggan,
        nama_pelanggan: inspection.nama_pelanggan,
        nik: inspection.nik,
        alamat: inspection.alamat,
        items: inspection.items,
        photo_url: photoUrl,
        validation_status: inspection.validation_status,
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

export const syncAllPending = async (onProgress) => {
  const pending = await getOfflineInspections();
  const results = { success: 0, failed: 0, total: pending.length };

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const result = await syncInspection(item);
    
    if (result.success) {
      results.success++;
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
