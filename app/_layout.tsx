import 'react-native-get-random-values';  // UUID 폴리필 - 반드시 최상단에!
import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePriceStore } from '../src/stores/priceStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const { isLoading: authLoading, initialize: initAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const { loadCachedPrices, fetchPrices } = usePriceStore();

  useEffect(() => {
    const init = async () => {
      await initAuth();
      await loadSettings();
      await loadCachedPrices();
      // 백그라운드에서 시세 업데이트
      fetchPrices().catch(() => {});
    };
    init();
  }, []);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#F7931A" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modals)"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
