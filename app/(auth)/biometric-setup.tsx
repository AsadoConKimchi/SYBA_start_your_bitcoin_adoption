import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';

export default function BiometricSetupScreen() {
  const { enableBiometric } = useAuthStore();

  const handleEnable = async () => {
    await enableBiometric();
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' }}>
      {/* 아이콘 */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#FEF3C7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="finger-print" size={48} color="#F7931A" />
        </View>
      </View>

      {/* 텍스트 */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: '#1A1A1A',
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        생체 인증을 사용할까요?
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: '#666666',
          textAlign: 'center',
          marginBottom: 48,
          lineHeight: 24,
        }}
      >
        Face ID / 지문으로{'\n'}더 빠르게 로그인할 수 있습니다.
      </Text>

      {/* 버튼들 */}
      <TouchableOpacity
        style={{
          backgroundColor: '#F7931A',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
        onPress={handleEnable}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          생체인증 사용
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={handleSkip}
      >
        <Text style={{ color: '#666666', fontSize: 16 }}>
          나중에 하기
        </Text>
      </TouchableOpacity>
    </View>
  );
}
