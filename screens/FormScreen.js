import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function FormScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World - Uji Petik Form</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, fontWeight: 'bold' },
  button: { marginTop: 20, padding: 10, backgroundColor: '#00C8DC', borderRadius: 5 },
  buttonText: { color: 'white' }
});