import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Image,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { syncInspection, getOfflineInspections, removeOfflineInspection } from '../lib/syncService';

export default function DetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const [data, setData] = useState(item);
  const [isSynced, setIsSynced] = useState(item.is_synced || false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setIsSynced(item.is_synced || false);
  }, [item]);

  const handleManualSync = async () => {
    if (isSynced) {
      Alert.alert("Sudah Terkirim", "Data ini sudah ada di database pusat.");
      return;
    }

    Alert.alert(
      'Kirim Data',
      'Kirim data inspection ini ke database pusat?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Kirim', onPress: performSync }
      ]
    );
  };

  const performSync = async () => {
    setUpdating(true);
    const result = await syncInspection(data);

    if (result.success) {
      setIsSynced(true);
      Alert.alert("Berhasil", "Data sekarang sudah tersimpan di database!", [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert("Gagal Sync", "Pastikan internet stabil dan coba lagi.\n\nError: " + (result.error?.message || 'Unknown error'));
    }
    setUpdating(false);
  };

  const createPDF = async () => {
    const photoSrc = data.photo_url?.startsWith('data:') 
      ? `data:image/jpeg;base64,${data.photo_url.split(',')[1]}`
      : data.photo_url;

    const html = `
      <html>
        <body style="padding: 40px; font-family: sans-serif;">
          <h1 style="color: #00C8DC;">Laporan Uji Petik</h1>
          <p><b>ID Pegawai:</b> ${data.id_pegawai}</p>
          <p><b>Nama Pegawai:</b> ${data.nama_pegawai}</p>
          <p><b>ID Pelanggan:</b> ${data.id_pelanggan}</p>
          <p><b>Nama Pelanggan:</b> ${data.nama_pelanggan}</p>
          <p><b>NIK:</b> ${data.nik}</p>
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
          <hr/>
          <p><b>Status:</b> <span style="color: ${data.validation_status === 'GREEN' ? 'green' : 'red'};">${data.validation_status}</span></p>
        </body>
      </html>
    `;
    
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Error', 'Gagal membuat PDF');
    }
  };

  const imageSource = data.photo_url?.startsWith('data:')
    ? { uri: data.photo_url }
    : data.photo_url 
      ? { uri: data.photo_url } 
      : require('../img/placeholder.png');

  return (
    <ScrollView style={styles.container}>
      <Image source={imageSource} style={styles.mainImage} />

      <View style={styles.syncStatusBar}>
        <Ionicons 
          name={isSynced ? "cloud-done" : "cloud-offline"} 
          size={18} 
          color={isSynced ? "#2ECC71" : "#E74C3C"} 
        />
        <Text style={[styles.syncStatusText, { color: isSynced ? "#2ECC71" : "#E74C3C" }]}>
          {isSynced ? 'Tersimpan di Database' : 'Belum Tersinkronkan'}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>ID PELANGGAN</Text>
        <Text style={styles.value}>{data.id_pelanggan}</Text>
        <Text style={styles.title}>{data.nama_pelanggan}</Text>
        <Text style={styles.address}>{data.alamat}</Text>
      </View>

      <View style={styles.employeeBox}>
        <Text style={styles.employeeLabel}>Petugas:</Text>
        <Text style={styles.employeeName}>{data.nama_pegawai}</Text>
        <Text style={styles.employeeId}>ID: {data.id_pegawai}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Checklist Hasil Lapangan</Text>
        {data.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.note ? <Text style={styles.itemNote}>Ket: {item.note}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Ada' ? '#E8F8F0' : '#FDEDEC' }]}>
              <Text style={[styles.itemStatus, { color: item.status === 'Ada' ? '#2ECC71' : '#E74C3C' }]}>
                {item.status}
              </Text>
            </View>
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
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name={isSynced ? "checkmark-circle" : "cloud-upload"} size={20} color="white" />
              <Text style={styles.btnText}>
                {isSynced ? "Sudah Terkirim" : "Kirim ke Database"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {!isSynced && (
        <Text style={styles.offlineHint}>
          Data akan tersimpan offline di HP ini dan dapat dikirimkan saat koneksi tersedia.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  mainImage: { width: '100%', height: 250, backgroundColor: '#DDD' },
  syncStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#FFF', gap: 8 },
  syncStatusText: { fontWeight: 'bold', fontSize: 14 },
  infoBox: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
  label: { fontSize: 11, color: '#888', fontWeight: 'bold' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#00C8DC' },
  title: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  address: { fontSize: 13, color: '#666', marginTop: 4 },
  employeeBox: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F0F9FA', borderBottomWidth: 1, borderColor: '#EEE', gap: 10 },
  employeeLabel: { color: '#666', fontSize: 13 },
  employeeName: { fontWeight: 'bold', color: '#333' },
  employeeId: { color: '#888', fontSize: 12 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemName: { fontSize: 14, color: '#444' },
  itemNote: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  itemStatus: { fontWeight: 'bold', fontSize: 13 },
  buttonContainer: { padding: 20, gap: 10 },
  pdfBtn: { flexDirection: 'row', backgroundColor: '#5D6D7E', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  syncBtn: { flexDirection: 'row', backgroundColor: '#00C8DC', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  disabledBtn: { backgroundColor: '#BDC3C7' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  offlineHint: { textAlign: 'center', color: '#888', fontSize: 12, paddingHorizontal: 30, paddingBottom: 30, fontStyle: 'italic' }
});
