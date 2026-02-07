import 'react-native-get-random-values';  // UUID 폴리필 - 반드시 최상단에!
import '../global.css';
import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { usePriceStore } from '../src/stores/priceStore';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const LOADING_MESSAGES = [
  'AES-256 암호화로 당신의 데이터를 보호합니다',
  '모든 데이터는 당신의 기기에만 저장됩니다',
  '비밀번호 없이는 누구도 열람할 수 없습니다',
  '당신의 데이터는 당신만의 것입니다',
  '기록하지 않으면 관리할 수 없습니다',
  '작은 기록이 큰 변화를 만듭니다',
  '오늘의 지출을 sats로 환산해보세요',
  '소비 습관을 아는 것이 절약의 시작입니다',
];

export default function RootLayout() {
  const { isLoading: authLoading, initialize: initAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const { loadCachedPrices, fetchPrices } = usePriceStore();

  const loadingMessage = useMemo(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    []
  );

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
        <Text style={{ marginTop: 16, fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 }}>
          {loadingMessage}
        </Text>
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
