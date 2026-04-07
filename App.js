import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './screens/HomeScreen';
import FormScreen from './screens/FormScreen';
import DetailsScreen from './screens/DetailsScreen';
import LoginScreen from './screens/LoginScreen';

const Stack = createStackNavigator();
const USER_SESSION_KEY = 'user_session';

export default function App() {
  const [fontsLoaded] = useFonts({
    'SpotifyMix-Bold': require('./assets/font/SpotifyMix-Bold.ttf'),
    'SpotifyMix-Medium': require('./assets/font/SpotifyMix-Medium.ttf'),
    'SpotifyMix-Regular': require('./assets/font/SpotifyMix-Regular.ttf'),
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem(USER_SESSION_KEY);
      if (sessionData) {
        setUser(JSON.parse(sessionData));
      }
    } catch (e) {
      console.error('Error checking session:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
  };

  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home">
                {props => <HomeScreen {...props} user={user} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen name="Form">
                {props => <FormScreen {...props} user={user} />}
              </Stack.Screen>
              <Stack.Screen name="Details" component={DetailsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
