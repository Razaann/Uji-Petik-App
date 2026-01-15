import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, 
  Image, TouchableOpacity, ActivityIndicator, ImageBackground 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInspections();
    
    const subscription = supabase
      .channel('public:inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchInspections)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const { data: onlineData } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      const localRaw = await AsyncStorage.getItem('offline_inspections');
      const offlineData = localRaw ? JSON.parse(localRaw) : [];

      const unsyncedOnly = offlineData.filter(offItem => 
        !onlineData?.some(onItem => onItem.id_pelanggan === offItem.id_pelanggan)
      );

      const combined = [...unsyncedOnly, ...(onlineData || [])];
      setInspections(combined);
      setFilteredData(combined);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = inspections.filter(item => 
      item.nama_pelanggan.toLowerCase().includes(text.toLowerCase()) || 
      item.nik.includes(text) ||
      (item.id_pelanggan && item.id_pelanggan.includes(text))
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
            <Ionicons name="cloud-offline" size={16} color="#E74C3C" style={{ marginLeft: 8 }} />
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

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../img/pln-building.png')} 
        style={styles.headerBackground}
      >
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Uji Petik</Text>
          <Text style={styles.headerSubtitle}>Aplikasi Digitalisasi Pengumpulan Data</Text>
        </View>
      </ImageBackground>

      <View style={styles.searchSection}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Cari..."
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
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Form')}>
        <Ionicons name="add" size={35} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  headerBackground: { width: '100%', height: 180 },
  headerOverlay: { flex: 1, backgroundColor: 'rgba(0, 200, 220, 0.6)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'white', marginTop: 5 },
  searchSection: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    marginHorizontal: 20, marginTop: -25, borderRadius: 25, paddingHorizontal: 15,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16 },
  listContainer: { padding: 20, paddingTop: 30 },
  card: { 
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, padding: 15, 
    marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEE', elevation: 2
  },
  offlineCard: { borderColor: '#E74C3C', borderWidth: 1, borderStyle: 'dashed' },
  thumbnail: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  cardContent: { flex: 1, marginLeft: 15 },
  cardId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardName: { fontSize: 14, color: '#666' },
  cardAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#AAA', marginTop: 5 },
  statusDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 15, right: 15 },
  fab: { 
    position: 'absolute', right: 25, bottom: 25, backgroundColor: '#00C8DC', 
    width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 8 
  }
});