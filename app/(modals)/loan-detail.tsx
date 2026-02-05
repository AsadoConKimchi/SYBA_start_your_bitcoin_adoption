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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDebtStore } from '../../src/stores/debtStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useAssetStore } from '../../src/stores/assetStore';
import { isFiatAsset } from '../../src/types/asset';
import { formatKrw } from '../../src/utils/formatters';
import { calculateLoanPayment, generateRepaymentSchedule } from '../../src/utils/debtCalculator';
import {
  RepaymentType,
  REPAYMENT_TYPE_LABELS,
  REPAYMENT_TYPE_DESCRIPTIONS,
} from '../../src/types/debt';
import { BANKS } from '../../src/constants/banks';

const LOAN_TERMS = [12, 24, 36, 48, 60, 120, 240, 360];

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { encryptionKey } = useAuthStore();
  const { loans, updateLoan, deleteLoan } = useDebtStore();
  const { assets } = useAssetStore();

  const loan = loans.find((l) => l.id === id);

  // 법정화폐 자산만 필터링 (대출 상환용)
  const fiatAssets = assets.filter(isFiatAsset);

  const [isEditing, setIsEditing] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
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

  // 초기값 설정
  useEffect(() => {
    if (loan) {
      setName(loan.name);
      setInstitution(loan.institution);
      setPrincipal(loan.principal.toLocaleString());
      setInterestRate(loan.interestRate.toString());
      setRepaymentType(loan.repaymentType);
      setTermMonths(loan.termMonths);
      setStartDate(new Date(loan.startDate));
      setPaidMonths(loan.paidMonths.toString());
      setMemo(loan.memo || '');
      setRepaymentDay(loan.repaymentDay ?? null);
      setLinkedAssetId(loan.linkedAssetId ?? null);
    }
  }, [loan]);

  if (!loan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9CA3AF' }}>대출 정보를 찾을 수 없습니다</Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#3B82F6', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF' }}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const actualTerm = customTerm ? parseInt(customTerm) || termMonths : termMonths;
  const amount = parseInt(principal.replace(/[^0-9]/g, '')) || 0;
  const rate = parseFloat(interestRate) || 0;

  const { monthlyPayment, totalInterest } = calculateLoanPayment(
    amount,
    rate,
    actualTerm,
    repaymentType
  );

  const progress = loan.paidMonths / loan.termMonths;
  const remainingMonths = loan.termMonths - loan.paidMonths;

  // 상환 스케줄 계산
  const schedule = generateRepaymentSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.repaymentType,
    loan.startDate
  );

  const formatTermLabel = (months: number): string => {
    if (months < 12) return `${months}개월`;
    const years = Math.floor(months / 12);
    const remainingM = months % 12;
    if (remainingM === 0) return `${years}년`;
    return `${years}년 ${remainingM}개월`;
  };

  const handleSave = async () => {
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
      await updateLoan(
        loan.id,
        {
          name: name.trim(),
          institution: institution.trim(),
          principal: amount,
          interestRate: rate,
          repaymentType,
          termMonths: actualTerm,
          startDate: startDate.toISOString().split('T')[0],
          paidMonths: parseInt(paidMonths) || 0,
          memo: memo.trim() || null,
          repaymentDay: repaymentDay ?? undefined,
          linkedAssetId: linkedAssetId ?? undefined,
        },
        encryptionKey
      );

      setIsEditing(false);
      Alert.alert('완료', '대출 정보가 수정되었습니다.');
    } catch (error) {
      console.error('대출 수정 실패:', error);
      Alert.alert('오류', '대출 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '대출 삭제',
      `"${loan.name}" 대출을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (!encryptionKey) return;
            try {
              await deleteLoan(loan.id, encryptionKey);
              router.back();
            } catch (error) {
              console.error('대출 삭제 실패:', error);
              Alert.alert('오류', '대출 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // 보기 모드
  if (!isEditing) {
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
            <Ionicons name="arrow-back" size={24} color="#666666" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>대출 상세</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#3B82F6' }}>수정</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* 기본 정보 */}
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
              {loan.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF' }}>{loan.institution}</Text>
          </View>

          {/* 금액 정보 */}
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: '#1E40AF' }}>대출 원금</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563EB' }}>
                {formatKrw(loan.principal)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: '#1E40AF' }}>
                월 상환금 {loan.repaymentType === 'bullet' && '(이자)'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563EB' }}>
                {formatKrw(loan.monthlyPayment)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#1E40AF' }}>잔여 원금</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#EF4444' }}>
                {formatKrw(loan.remainingPrincipal)}
              </Text>
            </View>
          </View>

          {/* 진행 상태 */}
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              진행 상태
            </Text>
            <View
              style={{
                height: 12,
                backgroundColor: '#E5E7EB',
                borderRadius: 6,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  backgroundColor: '#3B82F6',
                  borderRadius: 6,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {loan.paidMonths}/{loan.termMonths}개월 상환
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#3B82F6' }}>
                {remainingMonths}개월 남음
              </Text>
            </View>
          </View>

          {/* 상세 정보 */}
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>
              상세 정보
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>상환 방식</Text>
              <Text style={{ fontSize: 14, color: '#1A1A1A' }}>
                {REPAYMENT_TYPE_LABELS[loan.repaymentType]}
              </Text>
              <Text style={{ fontSize: 12, color: '#666666' }}>
                {REPAYMENT_TYPE_DESCRIPTIONS[loan.repaymentType]}
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>연 이자율</Text>
              <Text style={{ fontSize: 14, color: '#1A1A1A' }}>{loan.interestRate}%</Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>대출 기간</Text>
              <Text style={{ fontSize: 14, color: '#1A1A1A' }}>
                {formatTermLabel(loan.termMonths)}
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>시작일 ~ 종료일</Text>
              <Text style={{ fontSize: 14, color: '#1A1A1A' }}>
                {new Date(loan.startDate).toLocaleDateString('ko-KR')} ~ {new Date(loan.endDate).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>상환일</Text>
              <Text style={{ fontSize: 14, color: '#1A1A1A' }}>
                {loan.repaymentDay ? `매월 ${loan.repaymentDay}일` : `시작일 기준 (매월 ${parseInt(loan.startDate.split('-')[2])}일)`}
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>연결 계좌</Text>
              <Text style={{ fontSize: 14, color: loan.linkedAssetId ? '#1A1A1A' : '#9CA3AF' }}>
                {loan.linkedAssetId
                  ? fiatAssets.find((a) => a.id === loan.linkedAssetId)?.name || '알 수 없는 계좌'
                  : '연결 안 함'}
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>총 예상 이자</Text>
              <Text style={{ fontSize: 14, color: '#EF4444' }}>
                {formatKrw(loan.totalInterest)}
              </Text>
            </View>
            {loan.memo && (
              <View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>메모</Text>
                <Text style={{ fontSize: 14, color: '#1A1A1A' }}>{loan.memo}</Text>
              </View>
            )}
          </View>

          {/* 상환 스케줄 버튼 */}
          <TouchableOpacity
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
            onPress={() => setShowSchedule(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563EB' }}>상환 스케줄 보기</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
          </TouchableOpacity>

          {/* 삭제 버튼 */}
          <TouchableOpacity
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 40,
            }}
            onPress={handleDelete}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#DC2626' }}>대출 삭제</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 상환 스케줄 모달 (바텀시트 스타일) */}
        <Modal visible={showSchedule} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '80%',
              }}
            >
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
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>상환 스케줄</Text>
                <TouchableOpacity onPress={() => setShowSchedule(false)}>
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0 }}>
                {/* 테이블 헤더 */}
                <View
                  style={{
                    flexDirection: 'row',
                    padding: 16,
                    backgroundColor: '#F3F4F6',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: '#666666', textAlign: 'center' }}>
                    회차
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600', color: '#666666', textAlign: 'center' }}>
                    날짜
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600', color: '#666666', textAlign: 'right' }}>
                    원금
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600', color: '#666666', textAlign: 'right' }}>
                    이자
                  </Text>
                  <Text style={{ flex: 2, fontSize: 12, fontWeight: '600', color: '#666666', textAlign: 'right' }}>
                    합계
                  </Text>
                </View>

                {/* 스케줄 목록 */}
                {schedule.map((item) => {
                  const isPaid = item.month <= loan.paidMonths;
                  return (
                    <View
                      key={item.month}
                      style={{
                        flexDirection: 'row',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                        backgroundColor: isPaid ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 12,
                          color: isPaid ? '#22C55E' : '#1A1A1A',
                          textAlign: 'center',
                        }}
                      >
                        {item.month}
                      </Text>
                      <Text
                        style={{
                          flex: 2,
                          fontSize: 12,
                          color: isPaid ? '#22C55E' : '#666666',
                          textAlign: 'center',
                        }}
                      >
                        {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text
                        style={{
                          flex: 2,
                          fontSize: 12,
                          color: isPaid ? '#22C55E' : '#1A1A1A',
                          textAlign: 'right',
                        }}
                      >
                        {(item.principal / 10000).toFixed(1)}만
                      </Text>
                      <Text
                        style={{
                          flex: 2,
                          fontSize: 12,
                          color: isPaid ? '#22C55E' : '#9CA3AF',
                          textAlign: 'right',
                        }}
                      >
                        {(item.interest / 10000).toFixed(1)}만
                      </Text>
                      <Text
                        style={{
                          flex: 2,
                          fontSize: 12,
                          fontWeight: '600',
                          color: isPaid ? '#22C55E' : '#3B82F6',
                          textAlign: 'right',
                        }}
                      >
                        {(item.total / 10000).toFixed(1)}만
                      </Text>
                    </View>
                  );
                })}

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 수정 모드
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
        <TouchableOpacity onPress={() => setIsEditing(false)}>
          <Text style={{ fontSize: 16, color: '#666666' }}>취소</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>대출 수정</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSubmitting}>
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
              이미 상환한 개월 수
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#1A1A1A',
              }}
              keyboardType="number-pad"
              value={paidMonths}
              onChangeText={setPaidMonths}
            />
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
          </View>

          {/* 연결 계좌 */}
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
                <Text style={{ color: '#1E40AF' }}>월 상환금</Text>
                <Text style={{ fontWeight: 'bold', color: '#2563EB' }}>
                  {formatKrw(monthlyPayment)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#1E40AF' }}>총 예상 이자</Text>
                <Text style={{ color: '#2563EB' }}>{formatKrw(totalInterest)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
                    backgroundColor: institution === bank.name ? '#EFF6FF' : '#F9FAFB',
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
                  {institution === bank.name && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
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
                  {repaymentType === type && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
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

      {/* 날짜 선택 */}
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
                  if (date) setStartDate(date);
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
