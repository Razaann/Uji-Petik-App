import React, { useState } from 'react';
import {
  StyleSheet, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import CustomText from '../components/CustomText';

const USER_SESSION_KEY = 'user_session';

const hashPassword = async (password) => {
  const hash = await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hash;
};

export default function LoginScreen({ navigation, onLogin }) {
  const [idPegawai, setIdPegawai] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!idPegawai.trim() || !password.trim()) {
      Alert.alert('Error', 'Mohon isi ID Pegawai dan Password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .eq('id_pegawai', idPegawai.trim())
        .single();

      if (error || !data) {
        Alert.alert('Login Gagal', 'ID Pegawai tidak ditemukan.');
        setLoading(false);
        return;
      }

      const inputHash = await hashPassword(password.trim());

      if (inputHash.toLowerCase() !== data.password_hash.toLowerCase()) {
        Alert.alert('Login Gagal', 'Password yang Anda masukkan salah.');
        setLoading(false);
        return;
      }

      const userSession = {
        id: data.id,
        id_pegawai: data.id_pegawai,
        nama_pegawai: data.nama_pegawai,
      };

      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userSession));

      if (onLogin) {
        onLogin(userSession);
      } else {
        navigation.replace('Home', { user: userSession });
      }

    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'Terjadi kesalahan. Pastikan internet stabil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={require('../img/pln-building.png')}
        style={styles.backgroundImage}
      >
        <View style={styles.overlay}>
          <View style={styles.loginCard}>
            <View style={styles.header}>
              <CustomText weight="bold" style={styles.title}>Uji Petik</CustomText>
              <CustomText style={styles.subtitle}>Silakan login untuk melanjutkan</CustomText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ID Pegawai"
                  placeholderTextColor="#999"
                  value={idPegawai}
                  onChangeText={setIdPegawai}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <CustomText weight="bold" style={styles.loginBtnText}>MASUK</CustomText>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <CustomText style={styles.footerText}>Sistem Digitalisasi Pengumpulan Data</CustomText>
            </View>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 150, 180, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginCard: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '100%', maxWidth: 400, elevation: 10 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, color: '#00C8DC', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
  form: { gap: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  loginBtn: { backgroundColor: '#00C8DC', borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginBtnDisabled: { backgroundColor: '#BDC3C7' },
  loginBtnText: { color: 'white', fontSize: 16 },
  footer: { alignItems: 'center', marginTop: 30 },
  footerText: { color: '#888', fontSize: 12 },
  versionText: { color: '#AAA', fontSize: 10, marginTop: 5 }
});
