import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDebtStore } from '../../src/stores/debtStore';
import { useCardStore } from '../../src/stores/cardStore';
import { useAuthStore } from '../../src/stores/authStore';
import { formatKrw } from '../../src/utils/formatters';
import { calculateInstallmentPayment, calculatePaidMonths } from '../../src/utils/debtCalculator';

const INSTALLMENT_MONTHS = [2, 3, 6, 12, 18, 24, 36];

export default function AddInstallmentScreen() {
  const { encryptionKey } = useAuthStore();
  const { addInstallment } = useDebtStore();
  const { cards } = useCardStore();

  const [storeName, setStoreName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    cards.find((c) => c.isDefault)?.id || cards[0]?.id || null
  );
  const [months, setMonths] = useState(3);
  const [customMonths, setCustomMonths] = useState('');
  const [isInterestFree, setIsInterestFree] = useState(true);
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [paidMonths, setPaidMonths] = useState('0');
  const [paidMonthsEdited, setPaidMonthsEdited] = useState(false);
  const [memo, setMemo] = useState('');

  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 시작일 변경 시 자동으로 납부 개월 수 계산 (사용자가 수정하지 않은 경우만)
  useEffect(() => {
    if (!paidMonthsEdited) {
      const calculated = calculatePaidMonths(startDate.toISOString().split('T')[0]);
      setPaidMonths(calculated.toString());
    }
  }, [startDate, paidMonthsEdited]);

  const actualMonths = customMonths ? parseInt(customMonths) || months : months;
  const amount = parseInt(totalAmount.replace(/[^0-9]/g, '')) || 0;
  const rate = parseFloat(interestRate) || 0;

  const { monthlyPayment, totalInterest } = calculateInstallmentPayment(
    amount,
    actualMonths,
    isInterestFree,
    rate
  );

  const handleSubmit = async () => {
    if (!encryptionKey) {
      Alert.alert('오류', '인증이 필요합니다.');
      return;
    }

    if (!storeName.trim()) {
      Alert.alert('오류', '상점명을 입력해주세요.');
      return;
    }

    if (amount <= 0) {
      Alert.alert('오류', '결제 금액을 입력해주세요.');
      return;
    }

    if (!selectedCardId) {
      Alert.alert('오류', '카드를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addInstallment(
        {
          cardId: selectedCardId,
          storeName: storeName.trim(),
          totalAmount: amount,
          months: actualMonths,
          isInterestFree,
          interestRate: isInterestFree ? 0 : rate,
          startDate: startDate.toISOString().split('T')[0],
          paidMonths: parseInt(paidMonths) || 0,
          memo: memo.trim() || undefined,
        },
        encryptionKey
      );

      Alert.alert('완료', '할부가 추가되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('할부 추가 실패:', error);
      Alert.alert('오류', '할부 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCard = cards.find((c) => c.id === selectedCardId);

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#666666" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
          할부 추가
        </Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isSubmitting ? '#9CA3AF' : '#F7931A',
            }}
          >
            저장
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 20 }}>
          {/* 상점명 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>상점명 *</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              placeholder="예: 쿠팡, 삼성전자"
              placeholderTextColor="#9CA3AF"
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>

          {/* 결제 금액 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>총 결제 금액 *</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 24,
                fontWeight: 'bold',
                color: '#EF4444',
                textAlign: 'right',
              }}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={totalAmount}
              onChangeText={(text) => {
                const num = text.replace(/[^0-9]/g, '');
                if (num) {
                  setTotalAmount(parseInt(num).toLocaleString());
                } else {
                  setTotalAmount('');
                }
              }}
            />
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
              원
            </Text>
          </View>

          {/* 카드 선택 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>결제 카드 *</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowCardPicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {selectedCard && (
                  <View
                    style={{
                      width: 24,
                      height: 16,
                      backgroundColor: selectedCard.color,
                      borderRadius: 2,
                      marginRight: 12,
                    }}
                  />
                )}
                <Text style={{ fontSize: 16, color: selectedCard ? '#1A1A1A' : '#9CA3AF' }}>
                  {selectedCard?.name || '카드 선택'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 할부 개월 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>할부 개월 수 *</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>
                {customMonths || months}개월
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 무이자/유이자 */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#666666' }}>무이자 할부</Text>
              <Switch
                value={isInterestFree}
                onValueChange={setIsInterestFree}
                trackColor={{ true: '#F7931A' }}
              />
            </View>

            {!isInterestFree && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#666666', marginBottom: 8 }}>연 이자율 (%)</Text>
                <TextInput
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 16,
                    color: '#1A1A1A',
                  }}
                  placeholder="예: 15.9"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={interestRate}
                  onChangeText={setInterestRate}
                />
              </View>
            )}
          </View>

          {/* 시작일 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>시작일</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>
                {startDate.toLocaleDateString('ko-KR')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 이미 납부한 개월 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
              이미 납부한 개월 수 (자동 계산, 수정 가능)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={paidMonths}
              onChangeText={(text) => {
                setPaidMonths(text);
                setPaidMonthsEdited(true);
              }}
            />
            {!paidMonthsEdited && parseInt(paidMonths) > 0 && (
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                * 시작일 기준 자동 계산됨
              </Text>
            )}
          </View>

          {/* 메모 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>메모</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
                minHeight: 80,
              }}
              placeholder="메모 (선택)"
              placeholderTextColor="#9CA3AF"
              multiline
              value={memo}
              onChangeText={setMemo}
            />
          </View>

          {/* 계산 결과 */}
          {amount > 0 && (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 12 }}>
                계산 결과
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#92400E' }}>월 납부액</Text>
                <Text style={{ fontWeight: 'bold', color: '#B45309' }}>
                  {formatKrw(monthlyPayment)}
                </Text>
              </View>
              {!isInterestFree && totalInterest > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#92400E' }}>총 이자</Text>
                  <Text style={{ color: '#B45309' }}>{formatKrw(totalInterest)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 카드 선택 모달 */}
      <Modal visible={showCardPicker} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '60%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>카드 선택</Text>
              <TouchableOpacity onPress={() => setShowCardPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: selectedCardId === card.id ? '#FEF3C7' : '#F9FAFB',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    setSelectedCardId(card.id);
                    setShowCardPicker(false);
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 26,
                      backgroundColor: card.color,
                      borderRadius: 4,
                      marginRight: 12,
                    }}
                  />
                  <Text style={{ flex: 1, fontSize: 16, color: '#1A1A1A' }}>{card.name}</Text>
                  {selectedCardId === card.id && (
                    <Ionicons name="checkmark" size={20} color="#F7931A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 개월 선택 모달 */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>할부 개월 수</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {INSTALLMENT_MONTHS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={{
                    width: '30%',
                    padding: 12,
                    backgroundColor: months === m && !customMonths ? '#F7931A' : '#F3F4F6',
                    borderRadius: 8,
                    margin: '1.5%',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setMonths(m);
                    setCustomMonths('');
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: months === m && !customMonths ? '#FFFFFF' : '#1A1A1A',
                    }}
                  >
                    {m}개월
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>직접 입력</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              placeholder="개월 수 입력"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={customMonths}
              onChangeText={setCustomMonths}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#F7931A',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={() => setShowMonthPicker(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 날짜 선택 (캘린더) */}
      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                margin: 20,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>날짜 선택</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }
                  if (date) {
                    setStartDate(date);
                    setPaidMonthsEdited(false); // 날짜 변경 시 자동 계산 다시 활성화
                  }
                }}
                locale="ko-KR"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F7931A',
                    padding: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 16,
                  }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>확인</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
