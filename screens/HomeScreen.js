// import React from 'react';
// import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons'; // For the plus icon

// const { width } = Dimensions.get('window');

// // Adjust height to match the 360x120 aspect ratio from your design
// const BANNER_HEIGHT = (width * 120) / 360; 

// export default function HomeScreen({ navigation }) {
//   const handleAddData = () => {
//     // Navigate to your form screen here
//     console.log('Floating button pressed!');
//     navigation.navigate('Form');
//   };

//   return (
//     <View style={styles.container}>
//       {/* Header Banner */}
//       <ImageBackground 
//         // Replace with the actual path to your PLN building image
//         // It check the root folder instead of current folder
//         source={require('../img/pln-building.png')} 
//         style={styles.bannerImage}
//       >
//         <LinearGradient
//           // The gradient colors from your design (cyan to transparent)
//           colors={['rgba(0, 200, 220, 0.8)', 'rgba(0, 200, 220, 0.4)']}
//           style={styles.gradientOverlay}
//         >
//           <View style={styles.headerContent}>
//             <Text style={styles.title}>Uji Petik</Text>
//             <Text style={styles.subtitle}>Aplikasi Digitalisasi Sampling Data</Text>
//           </View>
//         </LinearGradient>
//       </ImageBackground>

//       {/* Main Content Area (Empty for now) */}
//       <View style={styles.content}>
//         {/* Your list of past inspections will go here */}
//       </View>

//       {/* Floating Action Button (FAB) */}
//       <TouchableOpacity style={styles.fab} onPress={handleAddData}>
//         <Ionicons name="add" size={36} color="white" />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFF0', // Light cream background from your design
//   },
//   bannerImage: {
//     width: '100%',
//     height: BANNER_HEIGHT,
//     resizeMode: 'cover',
//   },
//   gradientOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   headerContent: {
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 36,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 4,
//     // Use a strong, bold font like 'Inter-Bold' or 'Roboto-Bold' here
//   },
//   subtitle: {
//     fontSize: 14,
//     color: 'white',
//     fontWeight: '500',
//     // Use a readable font like 'Inter-Medium' here
//   },
//   content: {
//     flex: 1,
//   },
//   fab: {
//     position: 'absolute',
//     width: 64,
//     height: 64,
//     alignItems: 'center',
//     justifyContent: 'center',
//     right: 24,
//     bottom: 32,
//     backgroundColor: '#00C8DC', // The cyan color from your design
//     borderRadius: 32,
//     elevation: 8, // Shadow for Android
//     shadowColor: '#000', // Shadow for iOS
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4.65,
//   },
// });

// import React, { useState } from 'react';
// import { 
//   StyleSheet, Text, View, TextInput, ScrollView, 
//   TouchableOpacity, Alert, ActivityIndicator, Image 
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker'; // Import Image Picker
// import { supabase } from '../lib/supabase';
// import { MATERIALS_LIST } from '../constants/materials';
// import { decode } from 'base64-arraybuffer'; // Helpful for file conversion

// export default function FormScreen({ navigation }) {
//   const [loading, setLoading] = useState(false);
  
//   // Basic Info State
//   const [namaPelanggan, setNamaPelanggan] = useState('');
//   const [nik, setNik] = useState('');
//   const [alamat, setAlamat] = useState('');
//   const [image, setImage] = useState(null); // State for the image

//   // Checklist State
//   const [itemsStatus, setItemsStatus] = useState(
//     MATERIALS_LIST.reduce((acc, item) => {
//       acc[item.id] = { name: item.name, status: 'Ada', note: '' };
//       return acc;
//     }, {})
//   );

//   // --- Image Handling Logic ---
//   const pickImage = async () => {
//     let result = await ImagePicker.launchCameraAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       quality: 0.5, // Compression as discussed in the flowchart
//       base64: true, // We need base64 to convert to ArrayBuffer
//     });

//     if (!result.canceled) {
//       setImage(result.assets[0]);
//     }
//   };

//   const uploadImage = async () => {
//     if (!image) return null;

//     const fileName = `${Date.now()}.jpg`;
//     const filePath = `documentation/${fileName}`;

//     // Update the bucket name here to 'foto-dokumentasi'
//     const { data, error } = await supabase.storage
//       .from('foto-dokumentasi') 
//       .upload(filePath, decode(image.base64), {
//         contentType: 'image/jpeg'
//       });

//     if (error) {
//       console.error('Upload Error:', error);
//       return null;
//     }

//     // Update the bucket name here too
//     const { data: urlData } = supabase.storage
//       .from('foto-dokumentasi')
//       .getPublicUrl(filePath);

//     return urlData.publicUrl;
//   };

//   // --- Submit Logic ---
//   const handleSubmit = async () => {
//     if (!namaPelanggan || !nik || !alamat) {
//       Alert.alert("Error", "Please fill all customer data");
//       return;
//     }

//     setLoading(true);

//     try {
//       // 1. Upload Image First (Step 1.7b in flowchart)
//       const photoUrl = await uploadImage();

//       // 2. Insert Data to Table (Step 2.2 in flowchart)
//       const finalItems = Object.values(itemsStatus);
//       const { error } = await supabase
//         .from('inspections')
//         .insert([{ 
//           nama_pelanggan: namaPelanggan, 
//           nik: nik,
//           alamat: alamat,
//           items: finalItems,
//           photo_url: photoUrl // Save the link to the image
//         }]);

//       if (error) throw error;

//       Alert.alert("Success", "Full report with photo saved!", [
//         { text: "OK", onPress: () => navigation.goBack() }
//       ]);
//     } catch (err) {
//       Alert.alert("Failed", err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
//       <Text style={styles.header}>Input Data Uji Petik</Text>

//       {/* Section 1: Metadata */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Data Pelanggan</Text>
//         <TextInput style={styles.input} placeholder="Nama Pelanggan" value={namaPelanggan} onChangeText={setNamaPelanggan} />
//         <TextInput style={styles.input} placeholder="NIK" keyboardType="numeric" value={nik} onChangeText={setNik} />
//         <TextInput style={[styles.input, { height: 80 }]} placeholder="Alamat Lengkap" multiline value={alamat} onChangeText={setAlamat} />
//       </View>

//       {/* Section 2: Checklist */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Checklist Material</Text>
//         {MATERIALS_LIST.map((item) => (
//           <View key={item.id} style={styles.itemRow}>
//             <Text style={styles.itemName}>{item.name}</Text>
//             <View style={styles.buttonGroup}>
//               <TouchableOpacity 
//                 style={[styles.toggleBtn, itemsStatus[item.id].status === 'Ada' && styles.btnActive]} 
//                 onPress={() => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], status: 'Ada'}})}
//               >
//                 <Text style={itemsStatus[item.id].status === 'Ada' ? styles.whiteText : styles.blackText}>Ada</Text>
//               </TouchableOpacity>
//               <TouchableOpacity 
//                 style={[styles.toggleBtn, itemsStatus[item.id].status === 'Tidak Ada' && styles.btnError]} 
//                 onPress={() => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], status: 'Tidak Ada'}})}
//               >
//                 <Text style={itemsStatus[item.id].status === 'Tidak Ada' ? styles.whiteText : styles.blackText}>Tidak</Text>
//               </TouchableOpacity>
//             </View>
//             {itemsStatus[item.id].status === 'Tidak Ada' && (
//               <TextInput 
//                 style={styles.noteInput} 
//                 placeholder="Keterangan..." 
//                 onChangeText={(text) => setItemsStatus({...itemsStatus, [item.id]: {...itemsStatus[item.id], note: text}})}
//               />
//             )}
//           </View>
//         ))}
//       </View>

//       {/* Section 3: Documentation Photo (New!) */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Dokumentasi Foto</Text>
//         <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
//           <Text style={styles.cameraBtnText}>{image ? "Ganti Foto" : "Ambil Foto Rumah"}</Text>
//         </TouchableOpacity>
//         {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}
//       </View>

//       {loading ? (
//         <ActivityIndicator size="large" color="#00C8DC" />
//       ) : (
//         <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
//           <Text style={styles.submitText}>Kirim Laporan</Text>
//         </TouchableOpacity>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f9f9f9', padding: 15 },
//   header: { fontSize: 22, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
//   section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
//   sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
//   input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8, fontSize: 16 },
//   itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
//   itemName: { fontSize: 14, color: '#444', marginBottom: 8 },
//   buttonGroup: { flexDirection: 'row', gap: 10 },
//   toggleBtn: { flex: 1, padding: 10, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
//   btnActive: { backgroundColor: '#00C8DC', borderColor: '#00C8DC' },
//   btnError: { backgroundColor: '#FF5252', borderColor: '#FF5252' },
//   whiteText: { color: 'white', fontWeight: 'bold' },
//   blackText: { color: '#333' },
//   noteInput: { backgroundColor: '#fff8f8', marginTop: 10, padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#FFC1C1' },
//   cameraBtn: { backgroundColor: '#eee', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
//   cameraBtnText: { color: '#333', fontWeight: 'bold' },
//   previewImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10 },
//   submitBtn: { backgroundColor: '#00C8DC', padding: 18, borderRadius: 10, alignItems: 'center' },
//   submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
// });

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, FlatList, 
  Image, TouchableOpacity, ActivityIndicator, ImageBackground 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons'; // For the Search and FAB icons

export default function HomeScreen({ navigation }) {
  const [inspections, setInspections] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInspections();
    
    // Step 3.0 in Flowchart: Real-time update
    const subscription = supabase
      .channel('public:inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchInspections)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setInspections(data);
      setFilteredData(data);
    }
    setLoading(false);
  };

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = inspections.filter(item => 
      item.nama_pelanggan.toLowerCase().includes(text.toLowerCase()) || 
      item.nik.includes(text) ||
      (item.id_pelanggan && item.id_pelanggan.includes(text)) // Include ID Pelanggan in search
    );
    setFilteredData(filtered);
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Details', { id: item.id })}>
      <Image 
        source={item.photo_url ? { uri: item.photo_url } : require('../img/placeholder.png')} 
        style={styles.thumbnail} 
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardNik}>{item.id_pelanggan || 'No ID'}</Text>
        <Text style={styles.cardName}>{item.nama_pelanggan}, {item.alamat}</Text>
        <Text style={styles.cardDate}>{/* date logic */}</Text>
      </View>

      {/* Simple Red/Green Logic */}
      <View style={[
        styles.statusDot, 
        { backgroundColor: item.validation_status === 'GREEN' ? '#2ECC71' : '#E74C3C' }
      ]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Design: Custom Header with Background Image */}
      <ImageBackground 
        source={require('../img/pln-building.png')} 
        style={styles.headerBackground}
      >
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Uji Petik</Text>
          <Text style={styles.headerSubtitle}>Aplikasi Digitalisasi Pengumpulan Data</Text>
        </View>
      </ImageBackground>

      {/* Search Bar */}
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('Form')}
      >
        <Ionicons name="add" size={35} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' }, // Matching your beige background
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
    marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#EEE',
    elevation: 2
  },
  thumbnail: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  cardContent: { flex: 1, marginLeft: 15 },
  cardNik: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardName: { fontSize: 14, color: '#666' },
  cardAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#AAA', marginTop: 5 },
  statusDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 15, right: 15 },
  fab: { 
    position: 'absolute', right: 25, bottom: 25, backgroundColor: '#00C8DC', 
    width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', 
    alignItems: 'center', elevation: 8 
  }
});