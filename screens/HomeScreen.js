import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, 
  Image, TouchableOpacity, ActivityIndicator, ImageBackground,
  RefreshControl, Alert, Modal
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { getOfflineInspections, syncAllPending, getPendingCount } from '../lib/syncService';

export default function HomeScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [showSyncModal, setShowSyncModal] = useState(false);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const { data: onlineData } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      const offlineData = await getOfflineInspections();

      const offlineIds = new Set(offlineData.map(i => i.id_pelanggan));
      const uniqueOnline = (onlineData || []).filter(i => !offlineIds.has(i.id_pelanggan));

      const combined = [...offlineData, ...uniqueOnline];
      setInspections(combined);
      setFilteredData(combined);

      const count = await getPendingCount();
      setPendingCount(count);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
    
    const subscription = supabase
      .channel('public:inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchInspections)
      .subscribe();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchInspections();
    });

    return () => {
      supabase.removeChannel(subscription);
      unsubscribe();
    };
  }, [navigation, fetchInspections]);

  const handleSyncAll = async () => {
    if (pendingCount === 0) {
      Alert.alert('Info', 'Tidak ada data yang perlu disinkronkan.');
      return;
    }

    Alert.alert(
      'Sinkronisasi Data',
      `Akan mengirim ${pendingCount} data ke database pusat. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Sinkronkan', onPress: performSync }
      ]
    );
  };

  const performSync = async () => {
    setSyncing(true);
    setShowSyncModal(true);
    setSyncProgress({ current: 0, total: pendingCount });

    const results = await syncAllPending(({ current, total, success, failed }) => {
      setSyncProgress({ current, total });
    });

    setSyncing(false);
    setShowSyncModal(false);

    if (results.failed === 0) {
      Alert.alert('Berhasil', `Semua ${results.success} data berhasil dikirim ke database!`);
    } else {
      Alert.alert(' Sebagian Berhasil', `${results.success} data terkirim, ${results.failed} gagal.`);
    }

    fetchInspections();
  };

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = inspections.filter(item => 
      (item.nama_pelanggan || '').toLowerCase().includes(text.toLowerCase()) || 
      (item.nik || '').includes(text) ||
      (item.id_pelanggan || '').includes(text)
    );
    setFilteredData(filtered);
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.is_synced && styles.offlineCard]}
      onPress={() => navigation.navigate('Details', { item: item })}
    >
      <Image 
        source={item.photo_url ? { uri: item.photo_url } : require('../img/placeholder.png')} 
        style={styles.thumbnail} 
      />
      <View style={styles.cardContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.cardId}>{item.id_pelanggan || 'No ID'}</Text>
          {!item.is_synced && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={12} color="white" />
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardName}>{item.nama_pelanggan}</Text>
        <Text style={styles.cardAddress} numberOfLines={1}>{item.alamat}</Text>
        <Text style={styles.cardDate}>
          {item.is_synced ? "Sent to Cloud" : "Stored Locally"}
        </Text>
      </View>

      <View style={[
        styles.statusDot, 
        { backgroundColor: item.validation_status === 'GREEN' ? '#2ECC71' : '#E74C3C' }
      ]} />
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.syncAllBtn} onPress={handleSyncAll}>
          <Ionicons name="cloud-upload" size={20} color="white" />
          <Text style={styles.syncAllText}>Kirim {pendingCount} Data Offline</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../img/pln-building.png')} 
        style={styles.headerBackground}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>Uji Petik</Text>
              <Text style={styles.headerSubtitle}>Aplikasi Digitalisasi Pengumpulan Data</Text>
            </View>
            {pendingCount > 0 && (
              <TouchableOpacity style={styles.badgeBtn} onPress={handleSyncAll}>
                <Ionicons name="sync" size={24} color="white" />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>

      <View style={styles.searchSection}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Cari nama, NIK, atau ID..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00C8DC" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>Belum ada data inspection</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchInspections} />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Form')}>
        <Ionicons name="add" size={35} color="white" />
      </TouchableOpacity>

      <Modal visible={showSyncModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#00C8DC" />
            <Text style={styles.modalTitle}>Menyinkronkan Data...</Text>
            <Text style={styles.modalSubtitle}>
              {syncProgress.current} dari {syncProgress.total}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(syncProgress.current / syncProgress.total) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  headerBackground: { width: '100%', height: 180 },
  headerOverlay: { flex: 1, backgroundColor: 'rgba(0, 200, 220, 0.6)', justifyContent: 'center', paddingHorizontal: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'white', marginTop: 5 },
  badgeBtn: { position: 'relative', padding: 5 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#E74C3C', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  searchSection: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    marginHorizontal: 20, marginTop: -25, borderRadius: 25, paddingHorizontal: 15,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16 },
  listContainer: { padding: 20, paddingTop: 20 },
  listHeader: { marginBottom: 15 },
  syncAllBtn: { 
    flexDirection: 'row', backgroundColor: '#00C8DC', padding: 12, borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center', gap: 8
  },
  syncAllText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  card: { 
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 15, 
    marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEE', elevation: 2
  },
  offlineCard: { borderColor: '#E74C3C', borderWidth: 1, borderStyle: 'dashed' },
  thumbnail: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  cardContent: { flex: 1, marginLeft: 15 },
  cardId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  offlineBadge: { flexDirection: 'row', backgroundColor: '#E74C3C', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8, alignItems: 'center', gap: 4 },
  offlineBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardName: { fontSize: 14, color: '#666' },
  cardAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#AAA', marginTop: 5 },
  statusDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 15, right: 15 },
  fab: { 
    position: 'absolute', right: 25, bottom: 25, backgroundColor: '#00C8DC', 
    width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 8 
  },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#AAA', fontSize: 16, marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 30, borderRadius: 15, alignItems: 'center', width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  modalSubtitle: { color: '#666', marginTop: 5 },
  progressBar: { width: '100%', height: 8, backgroundColor: '#EEE', borderRadius: 4, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00C8DC', borderRadius: 4 }
});
