// import React, { useState } from 'react';
// import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// import { supabase } from '../lib/supabase'; // Ensure this path matches your folder structure

// export default function FormScreen({ navigation }) {
//   const [loading, setLoading] = useState(false);

//   const handleTestUpload = async () => {
//     setLoading(true);
//     console.log("Attempting to connect to Supabase...");

//     try {
//       const { data, error, status } = await supabase
//         .from('inspections')
//         .insert([
//           { 
//             nama_pelanggan: 'Testing Connection', 
//             nik: '999999999' 
//           }
//         ])
//         .select(); // .select() is needed to get the data back in the response

//       if (error) throw error;

//       console.log('Response Status:', status);
//       Alert.alert('Connection Successful!', 'Data appeared in Supabase Table Editor.');
      
//     } catch (err) {
//       console.error('Full Error Object:', err);
//       Alert.alert('Connection Failed', err.message || 'Check your internet or API keys.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>Supabase Connection Test</Text>
      
//       {loading ? (
//         <ActivityIndicator size="large" color="#00C8DC" />
//       ) : (
//         <TouchableOpacity style={styles.testButton} onPress={handleTestUpload}>
//           <Text style={styles.buttonText}>🔥 Push Test Data</Text>
//         </TouchableOpacity>
//       )}

//       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
//         <Text style={{ color: '#888' }}>Go Back</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
//   header: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
//   testButton: { backgroundColor: '#00C8DC', padding: 20, borderRadius: 12, width: '100%', alignItems: 'center' },
//   buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
//   backLink: { marginTop: 30 }
// });

import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { MATERIALS_LIST } from '../constants/materials';

export default function FormScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  
  // Basic Info State
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  // const [idPekerja, setIdPekerja] = useState(''); // Temporary hardcoded ID

  // Checklist State: Initialize with "Ada" for all items by default
  const [itemsStatus, setItemsStatus] = useState(
    MATERIALS_LIST.reduce((acc, item) => {
      acc[item.id] = { name: item.name, status: 'Ada', note: '' };
      return acc;
    }, {})
  );

  const handleToggleStatus = (id, status) => {
    setItemsStatus(prev => ({
      ...prev,
      [id]: { ...prev[id], status: status }
    }));
  };

  const handleNoteChange = (id, text) => {
    setItemsStatus(prev => ({
      ...prev,
      [id]: { ...prev[id], note: text }
    }));
  };

  const handleSubmit = async () => {
    if (!namaPelanggan || !nik || !alamat) {
      Alert.alert("Error", "Please fill all customer data");
      return;
    }

    setLoading(true);
    
    // Transform state object back into an array for the database
    const finalItems = Object.values(itemsStatus);

    const { error } = await supabase
      .from('inspections')
      .insert([{ 
        // id_pekerja: idPekerja,
        nama_pelanggan: namaPelanggan, 
        nik: nik,
        alamat: alamat,
        items: finalItems 
      }]);

    setLoading(false);

    if (error) {
      Alert.alert("Upload Failed", error.message);
    } else {
      Alert.alert("Success", "Full report saved to Supabase!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Input Data Uji Petik</Text>

      {/* Section 1: Metadata */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Pelanggan</Text>
        <TextInput style={styles.input} placeholder="Nama Pelanggan" value={namaPelanggan} onChangeText={setNamaPelanggan} />
        <TextInput style={styles.input} placeholder="NIK" keyboardType="numeric" value={nik} onChangeText={setNik} />
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Alamat Lengkap" multiline value={alamat} onChangeText={setAlamat} />
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
                onPress={() => handleToggleStatus(item.id, 'Ada')}
              >
                <Text style={itemsStatus[item.id].status === 'Ada' ? styles.whiteText : styles.blackText}>Ada</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toggleBtn, itemsStatus[item.id].status === 'Tidak Ada' && styles.btnError]} 
                onPress={() => handleToggleStatus(item.id, 'Tidak Ada')}
              >
                <Text style={itemsStatus[item.id].status === 'Tidak Ada' ? styles.whiteText : styles.blackText}>Tidak</Text>
              </TouchableOpacity>
            </View>

            {itemsStatus[item.id].status === 'Tidak Ada' && (
              <TextInput 
                style={styles.noteInput} 
                placeholder="Alasan / Keterangan..." 
                value={itemsStatus[item.id].note}
                onChangeText={(text) => handleNoteChange(item.id, text)}
              />
            )}
          </View>
        ))}
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
  submitBtn: { backgroundColor: '#00C8DC', padding: 18, borderRadius: 10, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});