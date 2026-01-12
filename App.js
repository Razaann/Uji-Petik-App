// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, View } from 'react-native';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Open up App.js to start working on your app!</Text>
//       <Text>Hello World</Text>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

import React from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // For the plus icon

const { width } = Dimensions.get('window');

// Adjust height to match the 360x120 aspect ratio from your design
const BANNER_HEIGHT = (width * 120) / 360; 

export default function HomeScreen() {
  const handleAddData = () => {
    // Navigate to your form screen here
    console.log('Floating button pressed!');
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <ImageBackground 
        // Replace with the actual path to your PLN building image
        source={require('./img/pln-building.png')} 
        style={styles.bannerImage}
      >
        <LinearGradient
          // The gradient colors from your design (cyan to transparent)
          colors={['rgba(0, 200, 220, 0.8)', 'rgba(0, 200, 220, 0.4)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Uji Petik</Text>
            <Text style={styles.subtitle}>Aplikasi Digitalisasi Sampling Data</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Main Content Area (Empty for now) */}
      <View style={styles.content}>
        {/* Your list of past inspections will go here */}
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={handleAddData}>
        <Ionicons name="add" size={36} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0', // Light cream background from your design
  },
  bannerImage: {
    width: '100%',
    height: BANNER_HEIGHT,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    // Use a strong, bold font like 'Inter-Bold' or 'Roboto-Bold' here
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    // Use a readable font like 'Inter-Medium' here
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    right: 24,
    bottom: 32,
    backgroundColor: '#00C8DC', // The cyan color from your design
    borderRadius: 32,
    elevation: 8, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});