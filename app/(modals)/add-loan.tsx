import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDebtStore } from '../../src/stores/debtStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useAssetStore } from '../../src/stores/assetStore';
import { formatKrw } from '../../src/utils/formatters';
import { isFiatAsset } from '../../src/types/asset';
import { calculateLoanPayment, calculatePaidMonths } from '../../src/utils/debtCalculator';
import {
  RepaymentType,
  REPAYMENT_TYPE_LABELS,
  REPAYMENT_TYPE_DESCRIPTIONS,
} from '../../src/types/debt';
import { BANKS } from '../../src/constants/banks';

const LOAN_TERMS = [12, 24, 36, 48, 60, 120, 240, 360]; // 개월

export default function AddLoanScreen() {
  const { encryptionKey } = useAuthStore();
  const { addLoan } = useDebtStore();
  const { assets } = useAssetStore();

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equalPrincipalAndInterest');
  const [termMonths, setTermMonths] = useState(36);
  const [customTerm, setCustomTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [paidMonths, setPaidMonths] = useState('0');
  const [paidMonthsEdited, setPaidMonthsEdited] = useState(false);
  const [memo, setMemo] = useState('');
  const [repaymentDay, setRepaymentDay] = useState<number | null>(null);
  const [linkedAssetId, setLinkedAssetId] = useState<string | null>(null);

  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showTermPicker, setShowTermPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRepaymentDayPicker, setShowRepaymentDayPicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 법정화폐 자산만 필터링 (대출 상환용)
  const fiatAssets = assets.filter(isFiatAsset);

  // 시작일 변경 시 자동으로 납부 개월 수 계산 (사용자가 수정하지 않은 경우만)
  useEffect(() => {
    if (!paidMonthsEdited) {
      const calculated = calculatePaidMonths(startDate.toISOString().split('T')[0]);
      setPaidMonths(calculated.toString());
    }
  }, [startDate, paidMonthsEdited]);

  const actualTerm = customTerm ? parseInt(customTerm) || termMonths : termMonths;
  const amount = parseInt(principal.replace(/[^0-9]/g, '')) || 0;
  const rate = parseFloat(interestRate) || 0;

  const { monthlyPayment, totalInterest } = calculateLoanPayment(
    amount,
    rate,
    actualTerm,
    repaymentType
  );

  const handleSubmit = async () => {
    if (!encryptionKey) {
      Alert.alert('오류', '인증이 필요합니다.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('오류', '대출명을 입력해주세요.');
      return;
    }

    if (!institution.trim()) {
      Alert.alert('오류', '대출 기관을 입력해주세요.');
      return;
    }

    if (amount <= 0) {
      Alert.alert('오류', '대출 원금을 입력해주세요.');
      return;
    }

    if (rate <= 0) {
      Alert.alert('오류', '이자율을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLoan(
        {
          name: name.trim(),
          institution: institution.trim(),
          principal: amount,
          interestRate: rate,
          repaymentType,
          termMonths: actualTerm,
          startDate: startDate.toISOString().split('T')[0],
          paidMonths: parseInt(paidMonths) || 0,
          memo: memo.trim() || undefined,
          repaymentDay: repaymentDay ?? undefined,
          linkedAssetId: linkedAssetId ?? undefined,
        },
        encryptionKey
      );

      Alert.alert('완료', '대출이 추가되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('대출 추가 실패:', error);
      Alert.alert('오류', '대출 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTermLabel = (months: number): string => {
    if (months < 12) return `${months}개월`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years}년`;
    return `${years}년 ${remainingMonths}개월`;
  };

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
          대출 추가
        </Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isSubmitting ? '#9CA3AF' : '#3B82F6',
            }}
          >
            저장
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 20 }}>
          {/* 대출명 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>대출명 *</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              placeholder="예: 주택담보대출, 신용대출"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 대출 기관 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>대출 기관 *</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowBankPicker(true)}
            >
              <Text style={{ fontSize: 16, color: institution ? '#1A1A1A' : '#9CA3AF' }}>
                {institution || '은행/기관 선택'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 대출 원금 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>대출 원금 *</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 24,
                fontWeight: 'bold',
                color: '#3B82F6',
                textAlign: 'right',
              }}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={principal}
              onChangeText={(text) => {
                const num = text.replace(/[^0-9]/g, '');
                if (num) {
                  setPrincipal(parseInt(num).toLocaleString());
                } else {
                  setPrincipal('');
                }
              }}
            />
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
              원
            </Text>
          </View>

          {/* 연 이자율 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>연 이자율 (%) *</Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              placeholder="예: 4.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={interestRate}
              onChangeText={setInterestRate}
            />
          </View>

          {/* 상환 방식 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>상환 방식 *</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowTypePicker(true)}
            >
              <View>
                <Text style={{ fontSize: 16, color: '#1A1A1A' }}>
                  {REPAYMENT_TYPE_LABELS[repaymentType]}
                </Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  {REPAYMENT_TYPE_DESCRIPTIONS[repaymentType]}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 대출 기간 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>대출 기간 *</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowTermPicker(true)}
            >
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>
                {formatTermLabel(customTerm ? parseInt(customTerm) || termMonths : termMonths)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* 시작일 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>대출 시작일</Text>
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

          {/* 이미 상환한 개월 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
              이미 상환한 개월 수 (자동 계산, 수정 가능)
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

          {/* 상환일 */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
              상환일 (매월)
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowRepaymentDayPicker(true)}
            >
              <Text style={{ fontSize: 16, color: repaymentDay ? '#1A1A1A' : '#9CA3AF' }}>
                {repaymentDay ? `매월 ${repaymentDay}일` : '시작일 기준 (기본값)'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              * 선택하지 않으면 시작일 기준으로 상환됩니다
            </Text>
          </View>

          {/* 연결 계좌 (자동 차감용) */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
              연결 계좌 (자동 차감)
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowAssetPicker(true)}
            >
              <Text style={{ fontSize: 16, color: linkedAssetId ? '#1A1A1A' : '#9CA3AF' }}>
                {linkedAssetId
                  ? fiatAssets.find((a) => a.id === linkedAssetId)?.name || '계좌 선택'
                  : '계좌 선택 (선택사항)'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              * 상환일에 월 상환금이 자동으로 차감됩니다
            </Text>
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
          {amount > 0 && rate > 0 && (
            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 12 }}>
                계산 결과
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#1E40AF' }}>
                  월 상환금 {repaymentType === 'bullet' && '(이자)'}
                </Text>
                <Text style={{ fontWeight: 'bold', color: '#2563EB' }}>
                  {formatKrw(monthlyPayment)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#1E40AF' }}>총 예상 이자</Text>
                <Text style={{ color: '#2563EB' }}>{formatKrw(totalInterest)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#1E40AF' }}>총 상환액</Text>
                <Text style={{ color: '#2563EB' }}>{formatKrw(amount + totalInterest)}</Text>
              </View>
              {repaymentType === 'bullet' && (
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
                  * 만기일시상환: 만기에 원금 {formatKrw(amount)} 일시 상환
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 상환 방식 선택 모달 */}
      <Modal visible={showTypePicker} transparent animationType="slide">
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
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>상환 방식</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {(Object.keys(REPAYMENT_TYPE_LABELS) as RepaymentType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={{
                  padding: 16,
                  backgroundColor: repaymentType === type ? '#EFF6FF' : '#F9FAFB',
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: repaymentType === type ? 1 : 0,
                  borderColor: '#3B82F6',
                }}
                onPress={() => {
                  setRepaymentType(type);
                  setShowTypePicker(false);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#1A1A1A' }}>
                      {REPAYMENT_TYPE_LABELS[type]}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666666', marginTop: 4 }}>
                      {REPAYMENT_TYPE_DESCRIPTIONS[type]}
                    </Text>
                  </View>
                  {repaymentType === type && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* 대출 기간 선택 모달 */}
      <Modal visible={showTermPicker} transparent animationType="slide">
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
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>대출 기간</Text>
              <TouchableOpacity onPress={() => setShowTermPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {LOAN_TERMS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={{
                    width: '30%',
                    padding: 12,
                    backgroundColor: termMonths === m && !customTerm ? '#3B82F6' : '#F3F4F6',
                    borderRadius: 8,
                    margin: '1.5%',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setTermMonths(m);
                    setCustomTerm('');
                    setShowTermPicker(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: termMonths === m && !customTerm ? '#FFFFFF' : '#1A1A1A',
                    }}
                  >
                    {formatTermLabel(m)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>직접 입력 (개월)</Text>
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
              value={customTerm}
              onChangeText={setCustomTerm}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#3B82F6',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={() => setShowTermPicker(false)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 은행 선택 모달 */}
      <Modal visible={showBankPicker} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '70%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>대출 기관 선택</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank.id}
                  style={{
                    padding: 16,
                    backgroundColor: selectedBankId === bank.id ? '#EFF6FF' : '#F9FAFB',
                    borderRadius: 8,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    setSelectedBankId(bank.id);
                    setInstitution(bank.name);
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#1A1A1A' }}>{bank.name}</Text>
                  {selectedBankId === bank.id && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 직접 입력 */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>직접 입력</Text>
              <View style={{ flexDirection: 'row' }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 16,
                    color: '#1A1A1A',
                  }}
                  placeholder="기관명 입력"
                  placeholderTextColor="#9CA3AF"
                  value={selectedBankId === 'custom' ? institution : ''}
                  onChangeText={(text) => {
                    setSelectedBankId('custom');
                    setInstitution(text);
                  }}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: '#3B82F6',
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    marginLeft: 8,
                    justifyContent: 'center',
                  }}
                  onPress={() => setShowBankPicker(false)}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    backgroundColor: '#3B82F6',
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

      {/* 상환일 선택 모달 */}
      <Modal visible={showRepaymentDayPicker} transparent animationType="slide">
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
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>상환일 선택</Text>
              <TouchableOpacity onPress={() => setShowRepaymentDayPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* 기본값 (시작일 기준) */}
            <TouchableOpacity
              style={{
                padding: 16,
                backgroundColor: repaymentDay === null ? '#EFF6FF' : '#F9FAFB',
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: repaymentDay === null ? 1 : 0,
                borderColor: '#3B82F6',
              }}
              onPress={() => {
                setRepaymentDay(null);
                setShowRepaymentDayPicker(false);
              }}
            >
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>시작일 기준 (기본값)</Text>
              {repaymentDay === null && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={{
                      width: '14%',
                      aspectRatio: 1,
                      margin: '0.5%',
                      backgroundColor: repaymentDay === day ? '#3B82F6' : '#F3F4F6',
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setRepaymentDay(day);
                      setShowRepaymentDayPicker(false);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: repaymentDay === day ? '#FFFFFF' : '#1A1A1A',
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 연결 계좌 선택 모달 */}
      <Modal visible={showAssetPicker} transparent animationType="slide">
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
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>연결 계좌 선택</Text>
              <TouchableOpacity onPress={() => setShowAssetPicker(false)}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* 연결 안 함 */}
            <TouchableOpacity
              style={{
                padding: 16,
                backgroundColor: linkedAssetId === null ? '#EFF6FF' : '#F9FAFB',
                borderRadius: 8,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: linkedAssetId === null ? 1 : 0,
                borderColor: '#3B82F6',
              }}
              onPress={() => {
                setLinkedAssetId(null);
                setShowAssetPicker(false);
              }}
            >
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>연결 안 함</Text>
              {linkedAssetId === null && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            {fiatAssets.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                  등록된 계좌가 없습니다.{'\n'}자산 탭에서 계좌를 먼저 추가해주세요.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {fiatAssets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    style={{
                      padding: 16,
                      backgroundColor: linkedAssetId === asset.id ? '#EFF6FF' : '#F9FAFB',
                      borderRadius: 8,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: linkedAssetId === asset.id ? 1 : 0,
                      borderColor: '#3B82F6',
                    }}
                    onPress={() => {
                      setLinkedAssetId(asset.id);
                      setShowAssetPicker(false);
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 16, color: '#1A1A1A' }}>{asset.name}</Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        {asset.balance.toLocaleString()}원
                        {asset.isOverdraft && ' (마이너스통장)'}
                      </Text>
                    </View>
                    {linkedAssetId === asset.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
