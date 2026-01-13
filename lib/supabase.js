import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://rujumzwyyfuhmadvysuu.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1anVtend5eWZ1aG1hZHZ5c3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzg4MzEsImV4cCI6MjA4Mzg1NDgzMX0.SfGSI8e53Uq3tOgud0jKH3wHvQ1gg-ulJJpxqRFHhe4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});