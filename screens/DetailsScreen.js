import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, ScrollView, Image,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { syncInspection, getOfflineInspections, removeOfflineInspection } from '../lib/syncService';
import CustomText from '../components/CustomText';

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
    const html = `
      <html>
        <body style="padding: 20px; font-family: sans-serif; font-size: 11px;">
          <h1 style="color: #00C8DC; font-size: 18px; margin: 0 0 10px 0;">Laporan Uji Petik</h1>
          
          <table style="width: 100%; margin-bottom: 10px; font-size: 10px;">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <b>Data Pegawai</b><br/>
                ID: ${data.id_pegawai}<br/>
                Nama: ${data.nama_pegawai}
              </td>
              <td style="width: 50%; vertical-align: top;">
                <b>Data Pelanggan</b><br/>
                ID: ${data.id_pelanggan}<br/>
                Nama: ${data.nama_pelanggan}<br/>
                NIK: ${data.nik}<br/>
                Alamat: ${data.alamat}
              </td>
            </tr>
          </table>
          
          <hr style="margin: 8px 0;"/>
          
          <b style="font-size: 12px;">Hasil Pemeriksaan Material:</b>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 5px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 4px; text-align: left; width: 60%;">Material</th>
                <th style="padding: 4px; text-align: center; width: 40%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(i => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 3px 4px;">${i.name}${i.note ? ` <span style="color: #666; font-size: 9px;">(${i.note})</span>` : ''}</td>
                  <td style="padding: 3px 4px; text-align: center; color: ${i.status === 'Ada' ? '#27AE60' : '#E74C3C'}; font-weight: bold;">
                    ${i.status}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <hr style="margin: 10px 0 5px 0;"/>
          
          <div style="text-align: center; margin-top: 10px;">
            <b>STATUS VALIDASI: </b>
            <span style="font-size: 16px; font-weight: bold; color: ${data.validation_status === 'GREEN' ? '#27AE60' : '#E74C3C'};">
              ${data.validation_status}
            </span>
          </div>
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
        <CustomText weight="bold" style={[styles.syncStatusText, { color: isSynced ? "#2ECC71" : "#E74C3C" }]}>
          {isSynced ? 'Tersimpan di Database' : 'Belum Tersinkronkan'}
        </CustomText>
      </View>

      <View style={styles.infoBox}>
        <CustomText weight="bold" style={styles.label}>ID PELANGGAN</CustomText>
        <CustomText weight="bold" style={styles.value}>{data.id_pelanggan}</CustomText>
        <CustomText weight="bold" style={styles.title}>{data.nama_pelanggan}</CustomText>
        <CustomText style={styles.address}>{data.alamat}</CustomText>
      </View>

      <View style={styles.employeeBox}>
        <CustomText style={styles.employeeLabel}>Pegawai:</CustomText>
        <CustomText weight="bold" style={styles.employeeName}>{data.nama_pegawai}</CustomText>
        <CustomText style={styles.employeeId}>ID: {data.id_pegawai}</CustomText>
      </View>

      <View style={styles.section}>
        <CustomText weight="bold" style={styles.sectionTitle}>Checklist Hasil Lapangan</CustomText>
        {data.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <CustomText style={styles.itemName}>{item.name}</CustomText>
              {item.note ? <CustomText style={styles.itemNote}>Ket: {item.note}</CustomText> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Ada' ? '#E8F8F0' : '#FDEDEC' }]}>
              <CustomText weight="bold" style={[styles.itemStatus, { color: item.status === 'Ada' ? '#2ECC71' : '#E74C3C' }]}>
                {item.status}
              </CustomText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.pdfBtn} onPress={createPDF}>
          <Ionicons name="document-text" size={20} color="white" />
          <CustomText weight="bold" style={styles.btnText}>Cetak PDF</CustomText>
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
              <CustomText weight="bold" style={styles.btnText}>
                {isSynced ? "Sudah Terkirim" : "Kirim ke Database"}
              </CustomText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {!isSynced && (
        <CustomText style={styles.offlineHint}>
          Data akan tersimpan offline di HP ini dan dapat dikirimkan saat koneksi tersedia.
        </CustomText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  mainImage: { width: '100%', height: 250, backgroundColor: '#DDD' },
  syncStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#FFF', gap: 8 },
  syncStatusText: { fontSize: 14 },
  infoBox: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
  label: { fontSize: 11, color: '#888' },
  value: { fontSize: 18, color: '#00C8DC' },
  title: { fontSize: 20, marginTop: 4 },
  address: { fontSize: 13, color: '#666', marginTop: 4 },
  employeeBox: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F0F9FA', borderBottomWidth: 1, borderColor: '#EEE', gap: 10 },
  employeeLabel: { color: '#666', fontSize: 13 },
  employeeName: { color: '#333' },
  employeeId: { color: '#888', fontSize: 12 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  itemName: { fontSize: 14, color: '#444' },
  itemNote: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  itemStatus: { fontSize: 13 },
  buttonContainer: { padding: 20, gap: 10 },
  pdfBtn: { flexDirection: 'row', backgroundColor: '#5D6D7E', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  syncBtn: { flexDirection: 'row', backgroundColor: '#00C8DC', padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  disabledBtn: { backgroundColor: '#BDC3C7' },
  btnText: { color: 'white', fontSize: 15 },
  offlineHint: { textAlign: 'center', color: '#888', fontSize: 12, paddingHorizontal: 30, paddingBottom: 30, fontStyle: 'italic' }
});
