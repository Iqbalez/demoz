import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  
  const { token, isLoading, checkSavedAuth } = useAuthStore();

  // 1. Hydrate authentication state from SecureStore on bootstrap
  useEffect(() => {
    checkSavedAuth();
  }, []);

  // 2. Routing Guards - redirects user based on token presence
  useEffect(() => {
    if (isLoading) return;

    // Use a short timeout to ensure the navigation tree is fully mounted before navigating
    const timeout = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!token && !inAuthGroup) {
        // Missing token: Lock to login screen
        router.replace('/(auth)/login');
      } else if (token && (inAuthGroup || !segments[0])) {
        // Authenticated: Route directly into employee portal
        router.replace('/(tabs)');
      }
    }, 1);

    return () => clearTimeout(timeout);
  }, [token, isLoading, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090e1a',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
