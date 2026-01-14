import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator, Image 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // Import Image Picker
import { supabase } from '../lib/supabase';
import { MATERIALS_LIST } from '../constants/materials';
import { decode } from 'base64-arraybuffer'; // Helpful for file conversion

export default function FormScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  
  // Basic Info State
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [idPelanggan, setIdPelanggan] = useState(''); // New State
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [image, setImage] = useState(null); // State for the image

  // Checklist State
  const [itemsStatus, setItemsStatus] = useState(
    MATERIALS_LIST.reduce((acc, item) => {
      acc[item.id] = { name: item.name, status: 'Ada', note: '' };
      return acc;
    }, {})
  );

  // --- Image Handling Logic ---
  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Compression as discussed in the flowchart
      base64: true, // We need base64 to convert to ArrayBuffer
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    const fileName = `${Date.now()}.jpg`;
    const filePath = `documentation/${fileName}`;

    // Update the bucket name here to 'foto-dokumentasi'
    const { data, error } = await supabase.storage
      .from('foto-dokumentasi') 
      .upload(filePath, decode(image.base64), {
        contentType: 'image/jpeg'
      });

    if (error) {
      console.error('Upload Error:', error);
      return null;
    }

    // Update the bucket name here too
    const { data: urlData } = supabase.storage
      .from('foto-dokumentasi')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // --- Submit Logic ---
  const handleSubmit = async () => {
    if (!namaPelanggan || !nik || !idPelanggan || !alamat) {
      Alert.alert("Error", "Please fill all customer data");
      return;
    }

    setLoading(true);

    // LOGIC: Check if any item is "Tidak Ada"
    const finalItems = Object.values(itemsStatus);
    const hasIssue = finalItems.some(item => item.status === 'Tidak Ada');
    const autoStatus = hasIssue ? 'RED' : 'GREEN';

    try {
      const photoUrl = await uploadImage();

      const { error } = await supabase
        .from('inspections')
        .insert([{ 
          nama_pelanggan: namaPelanggan, 
          id_pelanggan: idPelanggan,
          nik: nik,
          alamat: alamat,
          items: finalItems,
          photo_url: photoUrl,
          validation_status: autoStatus // Save the Auto-Color
        }]);

      if (error) throw error;
      Alert.alert("Success", `Report saved as ${autoStatus}!`);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Input Data Uji Petik</Text>

      {/* Section 1: Metadata */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Pelanggan</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Nama Pelanggan" 
          value={namaPelanggan} 
          onChangeText={setNamaPelanggan} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="ID Pelanggan (12 Digit)" 
          keyboardType="numeric" 
          value={idPelanggan} 
          onChangeText={setIdPelanggan} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="NIK" 
          keyboardType="numeric" 
          value={nik} 
          onChangeText={setNik} 
        />
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          placeholder="Alamat Lengkap" 
          multiline 
          value={alamat} 
          onChangeText={setAlamat} 
        />
      </View>

      {/* Section 2: Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Checklist Material</Text>
        {MATERIALS_LIST.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.toggleBtn, itemsStatus[item.id].status === 'Ada' && styles.btnActive]} 
                onPress={() => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], status: 'Ada'}})}
              >
                <Text style={itemsStatus[item.id].status === 'Ada' ? styles.whiteText : styles.blackText}>Ada</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, itemsStatus[item.id].status === 'Tidak Ada' && styles.btnError]} 
                onPress={() => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], status: 'Tidak Ada'}})}
              >
                <Text style={itemsStatus[item.id].status === 'Tidak Ada' ? styles.whiteText : styles.blackText}>Tidak</Text>
              </TouchableOpacity>
            </View>
            {itemsStatus[item.id].status === 'Tidak Ada' && (
              <TextInput 
                style={styles.noteInput} 
                placeholder="Keterangan..." 
                onChangeText={(text) => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], note: text}})}
              />
            )}
          </View>
        ))}
      </View>

      {/* Section 3: Documentation Photo (New!) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dokumentasi Foto</Text>
        <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
          <Text style={styles.cameraBtnText}>{image ? "Ganti Foto" : "Ambil Foto Rumah"}</Text>
        </TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00C8DC" />
      ) : (
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Kirim Laporan</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 15 },
  header: { fontSize: 22, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8, fontSize: 16 },
  itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemName: { fontSize: 14, color: '#444', marginBottom: 8 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnActive: { backgroundColor: '#00C8DC', borderColor: '#00C8DC' },
  btnError: { backgroundColor: '#FF5252', borderColor: '#FF5252' },
  whiteText: { color: 'white', fontWeight: 'bold' },
  blackText: { color: '#333' },
  noteInput: { backgroundColor: '#fff8f8', marginTop: 10, padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#FFC1C1' },
  cameraBtn: { backgroundColor: '#eee', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  cameraBtnText: { color: '#333', fontWeight: 'bold' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10 },
  submitBtn: { backgroundColor: '#00C8DC', padding: 18, borderRadius: 10, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});