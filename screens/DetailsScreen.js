import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';

export default function DetailsScreen({ route, navigation }) {
  const { item } = route.params; // Get full object from navigation
  const [data, setData] = useState(item);
  const [isSynced, setIsSynced] = useState(item.is_synced || false);
  const [updating, setUpdating] = useState(false);

  // Helper: Upload photo from local URI (used during manual sync)
  const uploadOfflineImage = async (localUri) => {
    try {
      // In a real device, you'd fetch the blob from the URI. 
      // For this demo, we assume the photo exists at the path.
      const fileName = `${Date.now()}_sync.jpg`;
      const filePath = `documentation/${fileName}`;

      // Note: Full offline sync usually requires converting URI to Blob/Base64
      // This logic assumes you're syncing while the temp file still exists
      const response = await fetch(localUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error } = await supabase.storage
        .from('foto-dokumentasi')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('foto-dokumentasi')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (e) {
      console.error("Upload Error:", e);
      return null;
    }
  };

  const handleManualSync = async () => {
    if (isSynced) {
      Alert.alert("Sudah Terkirim", "Data ini sudah ada di database pusat.");
      return;
    }

    setUpdating(true);
    try {
      let finalPhotoUrl = data.photo_url;

      // If photo is still a local file path, upload it first
      if (data.photo_url && data.photo_url.startsWith('file://')) {
        finalPhotoUrl = await uploadOfflineImage(data.photo_url);
      }

      const { error } = await supabase
        .from('inspections')
        .insert([{ 
          ...data, 
          id: undefined, // Let Supabase generate a real ID
          photo_url: finalPhotoUrl, 
          is_synced: true 
        }]);

      if (error) throw error;

      // Success Logic: Cleanup local storage so it doesn't duplicate
      const localRaw = await AsyncStorage.getItem('offline_inspections');
      if (localRaw) {
        const offlineList = JSON.parse(localRaw);
        const updatedList = offlineList.filter(i => i.id_pelanggan !== data.id_pelanggan);
        await AsyncStorage.setItem('offline_inspections', JSON.stringify(updatedList));
      }

      setIsSynced(true);
      Alert.alert("Berhasil", "Data sekarang sudah tersimpan di database!");
      navigation.goBack(); // Return to home to see updated list
    } catch (err) {
      Alert.alert("Gagal Sync", "Pastikan internet stabil dan coba lagi.");
    } finally {
      setUpdating(false);
    }
  };

  const createPDF = async () => {
    const html = `
      <html>
        <body style="padding: 40px; font-family: sans-serif;">
          <h1 style="color: #00C8DC;">Laporan Uji Petik</h1>
          <p><b>ID Pelanggan:</b> ${data.id_pelanggan}</p>
          <p><b>Nama:</b> ${data.nama_pelanggan}</p>
          <p><b>Alamat:</b> ${data.alamat}</p>
          <hr/>
          <h3>Hasil Pemeriksaan Material:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.items.map(i => `
              <tr style="border-bottom: 1px solid #EEE;">
                <td style="padding: 10px;">${i.name}</td>
                <td style="padding: 10px; color: ${i.status === 'Ada' ? 'green' : 'red'};">
                  ${i.status} ${i.note ? `(${i.note})` : ''}
                </td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={data.photo_url ? { uri: data.photo_url } : require('../img/placeholder.png')} 
        style={styles.mainImage} 
      />

      <View style={styles.infoBox}>
        <Text style={styles.label}>ID PELANGGAN</Text>
        <Text style={styles.value}>{data.id_pelanggan}</Text>
        <Text style={styles.title}>{data.nama_pelanggan}</Text>
        <Text style={styles.address}>{data.alamat}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Checklist Hasil Lapangan</Text>
        {data.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={{flex: 1}}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.note ? <Text style={styles.itemNote}>Ket: {item.note}</Text> : null}
            </View>
            <Text style={[styles.itemStatus, { color: item.status === 'Ada' ? '#2ECC71' : '#E74C3C' }]}>
              {item.status}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.pdfBtn} onPress={createPDF}>
          <Ionicons name="document-text" size={20} color="white" />
          <Text style={styles.btnText}>Cetak PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.syncBtn, isSynced && styles.disabledBtn]} 
          onPress={handleManualSync}
          disabled={updating || isSynced}
        >
          {updating ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name={isSynced ? "cloud-done" : "cloud-upload"} size={20} color="white" />
              <Text style={styles.btnText}>{isSynced ? "Sudah di Database" : "Kirim ke Database"}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  mainImage: { width: '100%', height: 250, backgroundColor: '#DDD' },
  infoBox: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
  label: { fontSize: 11, color: '#888', fontWeight: 'bold' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#00C8DC' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  address: { fontSize: 13, color: '#666', marginTop: 4 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemName: { fontSize: 14, color: '#444' },
  itemNote: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  itemStatus: { fontWeight: 'bold', fontSize: 14 },
  buttonContainer: { padding: 20, gap: 10 },
  pdfBtn: { flexDirection: 'row', backgroundColor: '#5D6D7E', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  syncBtn: { flexDirection: 'row', backgroundColor: '#00C8DC', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  disabledBtn: { backgroundColor: '#BDC3C7' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});