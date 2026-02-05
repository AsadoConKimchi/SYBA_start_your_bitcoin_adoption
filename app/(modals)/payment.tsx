import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';
import { CONFIG } from '../../src/constants/config';
import { subscribeToPaymentStatus, PaymentStatus } from '../../src/services/blink';

export default function PaymentScreen() {
  const {
    lightningInvoice,
    pendingPayment,
    confirmPayment,
  } = useSubscriptionStore();

  const [status, setStatus] = useState<'waiting' | 'checking' | 'success' | 'expired' | 'error'>('waiting');
  const [copied, setCopied] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isProcessingRef = useRef(false);

  // WebSocket으로 결제 상태 실시간 구독
  useEffect(() => {
    if (!lightningInvoice) return;

    console.log('[Payment] WebSocket 구독 시작');

    const handleStatusChange = async (paymentStatus: PaymentStatus) => {
      // 이미 처리 중이면 스킵
      if (isProcessingRef.current) return;

      console.log('[Payment] 상태 변경:', paymentStatus);

      if (paymentStatus === 'PAID') {
        isProcessingRef.current = true;

        // 구독 해제
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        setStatus('checking');

        // Blink에서 PAID 확인 후 구독 활성화
        const confirmed = await confirmPayment();

        if (confirmed) {
          setStatus('success');
          Alert.alert('결제 완료', '프리미엄 구독이 활성화되었습니다!', [
            { text: '확인', onPress: () => router.replace('/(tabs)/settings') },
          ]);
        } else {
          setStatus('error');
          Alert.alert(
            '처리 오류',
            '결제는 완료되었으나 구독 활성화에 실패했습니다. 고객센터에 문의해주세요.',
            [{ text: '확인', onPress: () => router.back() }]
          );
        }
      } else if (paymentStatus === 'EXPIRED') {
        isProcessingRef.current = true;

        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        setStatus('expired');
        Alert.alert('결제 만료', 'Invoice가 만료되었습니다. 다시 시도해주세요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        setStatus('waiting');
      }
    };

    const handleError = (error: Error) => {
      console.error('[Payment] WebSocket 에러:', error);
      // 에러 발생해도 자동 재연결되므로 사용자에게 알리지 않음
    };

    // WebSocket 구독 시작
    unsubscribeRef.current = subscribeToPaymentStatus(
      lightningInvoice,
      handleStatusChange,
      handleError
    );

    // cleanup
    return () => {
      console.log('[Payment] WebSocket 구독 해제');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [lightningInvoice]);

  const handleCopy = () => {
    if (lightningInvoice) {
      Clipboard.setString(lightningInvoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!lightningInvoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666666' }}>Invoice를 생성 중...</Text>
        <ActivityIndicator style={{ marginTop: 16 }} color="#F7931A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
          Lightning 결제
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#666666" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        {/* 금액 */}
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#666666', marginBottom: 4 }}>결제 금액</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#F7931A' }}>
            {CONFIG.SUBSCRIPTION_PRICE_SATS.toLocaleString()} sats
          </Text>
        </View>

        {/* QR 코드 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            padding: 20,
            borderRadius: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            marginBottom: 24,
          }}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <QRCode
            value={lightningInvoice}
            size={200}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
          <Text style={{ marginTop: 12, fontSize: 12, color: copied ? '#22C55E' : '#9CA3AF' }}>
            {copied ? '복사됨!' : 'QR 탭하여 Invoice 복사'}
          </Text>
        </TouchableOpacity>

        {/* 상태 표시 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          {status === 'waiting' && (
            <>
              <ActivityIndicator size="small" color="#F7931A" style={{ marginRight: 8 }} />
              <Text style={{ color: '#666666' }}>결제 대기 중... (실시간 연결)</Text>
            </>
          )}
          {status === 'checking' && (
            <>
              <ActivityIndicator size="small" color="#F7931A" style={{ marginRight: 8 }} />
              <Text style={{ color: '#666666' }}>구독 활성화 중...</Text>
            </>
          )}
          {status === 'success' && (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginRight: 8 }} />
              <Text style={{ color: '#22C55E', fontWeight: '600' }}>결제 완료!</Text>
            </>
          )}
          {status === 'expired' && (
            <>
              <Ionicons name="close-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={{ color: '#EF4444' }}>만료됨</Text>
            </>
          )}
          {status === 'error' && (
            <>
              <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={{ color: '#F59E0B' }}>처리 오류</Text>
            </>
          )}
        </View>

        {/* Invoice 미리보기 */}
        <View
          style={{
            backgroundColor: '#F9FAFB',
            padding: 12,
            borderRadius: 8,
            width: '100%',
          }}
        >
          <Text
            style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}
            numberOfLines={3}
          >
            {lightningInvoice}
          </Text>
        </View>

        {/* 안내 문구 */}
        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
            Lightning 지갑으로 QR 코드를 스캔하거나{'\n'}
            Invoice를 복사하여 결제해주세요
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
