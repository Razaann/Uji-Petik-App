import React, { useState } from 'react';
import {
  StyleSheet, View, TextInput, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { MATERIALS_LIST } from '../constants/materials';
import { saveOfflineInspection, removeOfflineInspectionByCustomer } from '../lib/syncService';
import CustomText from '../components/CustomText';

export default function FormScreen({ navigation, user }) {
  const [loading, setLoading] = useState(false);
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [idPelanggan, setIdPelanggan] = useState('');
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);

  const [itemsStatus, setItemsStatus] = useState(
    MATERIALS_LIST.reduce((acc, item) => {
      acc[item.id] = { name: item.name, status: 'Ada', note: '' };
      return acc;
    }, {})
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri });
      setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const uploadImage = async (base64Data) => {
    try {
      const fileName = `${Date.now()}.jpg`;
      const filePath = `documentation/${fileName}`;

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error } = await supabase.storage
        .from('foto-dokumentasi')
        .upload(filePath, bytes, { contentType: 'image/jpeg' });

      if (error) return null;

      const { data: urlData } = supabase.storage
        .from('foto-dokumentasi')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (e) {
      console.error('Upload error:', e);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!namaPelanggan || !nik || !idPelanggan || !alamat) {
      Alert.alert("Error", "Mohon lengkapi semua data pelanggan.");
      return;
    }

    if (!image) {
      Alert.alert("Foto Dibutuhkan", "Anda wajib mengambil foto dokumentasi sebelum mengirim laporan.");
      return;
    }

    const checklistItems = Object.values(itemsStatus);
    const hasIssue = checklistItems.some(i => i.status === 'Tidak Ada');

    const missingNotes = checklistItems.filter(i => i.status === 'Tidak Ada' && !i.note.trim());

    if (missingNotes.length > 0) {
      Alert.alert(
        "Catatan Dibutuhkan",
        `Mohon isi keterangan untuk material: ${missingNotes.map(m => m.name).join(", ")}`
      );
      return;
    }

    setLoading(true);

    const inspectionData = {
      id: Date.now(),
      id_pegawai: user.id,
      id_pelanggan: idPelanggan,
      nama_pelanggan: namaPelanggan,
      nik: nik,
      alamat: alamat,
      items: checklistItems,
      photo_url: imageBase64,
      is_synced: false,
      validation_status: hasIssue ? 'RED' : 'GREEN',
      created_at: new Date().toISOString()
    };

    try {
      const photoUrl = await uploadImage(imageBase64.split(',')[1]);
      const { error } = await supabase
        .from('uji_petik')
        .insert([{ 
          id_pegawai: user.id,
          id_pelanggan: idPelanggan,
          nama_pelanggan: namaPelanggan,
          nik: nik,
          alamat: alamat,
          items: checklistItems,
          photo_url: photoUrl,
          validation_status: hasIssue ? 'RED' : 'GREEN',
          is_synced: true
        }]);

      if (error) throw error;

      await removeOfflineInspectionByCustomer(idPelanggan, user.id);

      Alert.alert("Sukses", "Data berhasil dikirim!");
      navigation.goBack();

    } catch (err) {
      const saved = await saveOfflineInspection(inspectionData);
      if (saved) {
        Alert.alert("Mode Offline", "Koneksi gagal. Data tersimpan di HP!\nAkan otomatis terkirim saat koneksi tersedia.", [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", "Gagal simpan data.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <CustomText weight="bold" style={styles.header}>Input Data Uji Petik</CustomText>

      <View style={styles.section}>
        <CustomText weight="bold" style={styles.sectionTitle}>Data Petugas</CustomText>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={18} color="#00C8DC" />
          <CustomText style={styles.infoText}>{user.nama_pegawai}</CustomText>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={18} color="#00C8DC" />
          <CustomText style={styles.infoText}>ID: {user.id_pegawai}</CustomText>
        </View>
      </View>

      <View style={styles.section}>
        <CustomText weight="bold" style={styles.sectionTitle}>Data Pelanggan</CustomText>
        <TextInput style={styles.input} placeholder="Nama Pelanggan" value={namaPelanggan} onChangeText={setNamaPelanggan} />
        <TextInput style={styles.input} placeholder="ID Pelanggan (12 Digit)" keyboardType="numeric" value={idPelanggan} onChangeText={setIdPelanggan} />
        <TextInput style={styles.input} placeholder="NIK (16 Digit)" keyboardType="numeric" value={nik} onChangeText={setNik} />
        <TextInput style={[styles.input, { height: 60 }]} placeholder="Alamat Lengkap" multiline value={alamat} onChangeText={setAlamat} />
      </View>

      <View style={styles.section}>
        <CustomText weight="bold" style={styles.sectionTitle}>Checklist Material</CustomText>
        {MATERIALS_LIST.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <CustomText style={styles.itemName}>{item.name}</CustomText>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, itemsStatus[item.id].status === 'Ada' && styles.btnActive]}
                onPress={() => setItemsStatus({ ...itemsStatus, [item.id]: { ...itemsStatus[item.id], status: 'Ada' } })}
              >
                <CustomText weight={itemsStatus[item.id].status === 'Ada' ? 'bold' : 'regular'} style={itemsStatus[item.id].status === 'Ada' ? styles.whiteText : styles.blackText}>Ada</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, itemsStatus[item.id].status === 'Tidak Ada' && styles.btnError]}
                onPress={() => setItemsStatus({ ...itemsStatus, [item.id]: { ...itemsStatus[item.id], status: 'Tidak Ada' } })}
              >
                <CustomText weight={itemsStatus[item.id].status === 'Tidak Ada' ? 'bold' : 'regular'} style={itemsStatus[item.id].status === 'Tidak Ada' ? styles.whiteText : styles.blackText}>Tidak</CustomText>
              </TouchableOpacity>
            </View>
            {itemsStatus[item.id].status === 'Tidak Ada' && (
              <TextInput
                style={styles.noteInput}
                placeholder="Keterangan..."
                onChangeText={(text) => setItemsStatus({ ...itemsStatus, [item.id]: { ...itemsStatus[item.id], note: text } })}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <CustomText weight="bold" style={styles.sectionTitle}>Dokumentasi Foto</CustomText>
        <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
          <Ionicons name="camera" size={24} color="#333" />
          <CustomText weight="bold" style={styles.cameraBtnText}>{image ? "Ganti Foto" : "Ambil Foto Rumah"}</CustomText>
        </TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00C8DC" />
      ) : (
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <CustomText weight="bold" style={styles.submitText}>Kirim Laporan</CustomText>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 15 },
  header: { fontSize: 22, marginVertical: 20, textAlign: 'center' },
  section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, marginBottom: 15, color: '#333' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  infoText: { fontSize: 15, color: '#333' },
  input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8, fontSize: 15 },
  itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemName: { fontSize: 14, color: '#444', marginBottom: 8 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 8, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnActive: { backgroundColor: '#00C8DC', borderColor: '#00C8DC' },
  btnError: { backgroundColor: '#FF5252', borderColor: '#FF5252' },
  whiteText: { color: 'white' },
  blackText: { color: '#333' },
  noteInput: { backgroundColor: '#fff8f8', marginTop: 10, padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#FFC1C1' },
  cameraBtn: { backgroundColor: '#eee', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  cameraBtnText: { color: '#333' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10 },
  submitBtn: { backgroundColor: '#00C8DC', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitText: { color: 'white', fontSize: 17 }
});
