import { v4 as uuidv4 } from 'uuid';
import { MonthlySnapshot } from '../types/snapshot';
import { LedgerRecord, Expense, Income } from '../types/ledger';
import { Asset, FiatAsset, BitcoinAsset } from '../types/asset';
import { Loan } from '../types/debt';
import { saveEncrypted, loadEncrypted, FILE_PATHS } from '../utils/storage';
import { fetchDailyPrices } from './api/upbit';

// 더미 데이터 ID 접두사 (나중에 삭제할 때 구분용)
const DUMMY_PREFIX = 'DUMMY_';

// 과거 날짜 생성 헬퍼
function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// 년월 문자열 생성
function getYearMonthAgo(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 특정 월의 말일 날짜 생성
function getLastDayOfMonthAgo(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo + 1);
  date.setDate(0); // 이전 달의 마지막 날
  return date.toISOString().split('T')[0];
}

// 랜덤 금액 생성
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// 가장 가까운 날짜의 시세 찾기
function findClosestPrice(priceMap: Map<string, number>, targetDate: string): number {
  // 정확한 날짜가 있으면 반환
  if (priceMap.has(targetDate)) {
    return priceMap.get(targetDate)!;
  }

  // 없으면 가장 가까운 과거 날짜 찾기
  const dates = Array.from(priceMap.keys()).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= targetDate) {
      return priceMap.get(dates[i])!;
    }
  }

  // 그래도 없으면 첫 번째 날짜
  return priceMap.get(dates[0]) || 150000000;
}

// 더미 스냅샷 생성 (6개월, 실제 BTC 시세 사용)
function generateDummySnapshots(priceMap: Map<string, number>): MonthlySnapshot[] {
  const snapshots: MonthlySnapshot[] = [];

  // 자산/부채 추세 (6개월)
  const fiatBalances = [3000000, 3500000, 4000000, 4500000, 5000000, 5500000];
  const btcBalances = [45000000, 46000000, 47000000, 48000000, 49000000, 50000000]; // sats
  const debtBalances = [52000000, 51000000, 50000000, 49000000, 48000000, 47000000];

  for (let i = 5; i >= 0; i--) {
    const yearMonth = getYearMonthAgo(i);
    const lastDay = getLastDayOfMonthAgo(i);
    const btcKrw = findClosestPrice(priceMap, lastDay);

    const totalFiat = fiatBalances[5 - i];
    const totalBtcSats = btcBalances[5 - i];
    const totalDebt = debtBalances[5 - i];

    const btcKrwValue = totalBtcSats * (btcKrw / 100_000_000);
    const totalAssetKrw = totalFiat + btcKrwValue;
    const netWorthKrw = totalAssetKrw - totalDebt;
    const netWorthBtc = Math.round(netWorthKrw / (btcKrw / 100_000_000));

    snapshots.push({
      id: DUMMY_PREFIX + uuidv4(),
      yearMonth,
      totalFiat,
      totalBtcSats,
      totalDebt,
      totalInstallments: 0,
      totalLoans: totalDebt,
      btcKrw,
      totalAssetKrw,
      netWorthKrw,
      netWorthBtc,
      createdAt: new Date().toISOString(),
    });
  }

  return snapshots;
}

// 더미 기록 생성 (6개월, 실제 BTC 시세 사용)
function generateDummyRecords(priceMap: Map<string, number>): LedgerRecord[] {
  const records: LedgerRecord[] = [];
  console.log(`[DummyData] generateDummyRecords 시작, priceMap 크기: ${priceMap.size}`);

  const expenseCategories = [
    { name: '식비', min: 300000, max: 500000 },
    { name: '교통', min: 100000, max: 200000 },
    { name: '쇼핑', min: 100000, max: 300000 },
    { name: '문화/여가', min: 50000, max: 150000 },
    { name: '통신', min: 50000, max: 100000 },
    { name: '주거', min: 500000, max: 800000 },
    { name: '의료', min: 30000, max: 100000 },
  ];

  // 디버그: 첫 날과 마지막 날 시세 로그
  const firstDate = getDateDaysAgo(180);
  const lastDate = getDateDaysAgo(0);
  console.log(`[DummyData] 기록 생성 범위: ${firstDate} ~ ${lastDate}`);
  console.log(`[DummyData] 첫날 시세: ${findClosestPrice(priceMap, firstDate)}`);
  console.log(`[DummyData] 오늘 시세: ${findClosestPrice(priceMap, lastDate)}`);

  // 최근 180일간 기록 생성 (6개월)
  for (let daysAgo = 180; daysAgo >= 0; daysAgo--) {
    const date = getDateDaysAgo(daysAgo);
    const btcKrw = findClosestPrice(priceMap, date);

    // 매월 25일: 월급
    const dayOfMonth = new Date(date).getDate();
    if (dayOfMonth === 25) {
      const incomeAmount = 4000000 + randomAmount(-200000, 200000);
      const income: Income = {
        id: DUMMY_PREFIX + uuidv4(),
        type: 'income',
        date,
        amount: incomeAmount,
        currency: 'KRW',
        category: '월급',
        source: '회사',
        btcKrwAtTime: btcKrw,
        satsEquivalent: Math.round(incomeAmount / (btcKrw / 100_000_000)),
        needsPriceSync: false,
        linkedAssetId: null,
        memo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      records.push(income);
    }

    // 매일 랜덤하게 지출 (30% 확률)
    if (Math.random() < 0.3) {
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amount = randomAmount(cat.min / 10, cat.max / 5); // 1건당 금액 줄임

      const expense: Expense = {
        id: DUMMY_PREFIX + uuidv4(),
        type: 'expense',
        date,
        amount,
        currency: 'KRW',
        category: cat.name,
        paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
        cardId: null,
        installmentMonths: null,
        isInterestFree: null,
        installmentId: null,
        btcKrwAtTime: btcKrw,
        satsEquivalent: Math.round(amount / (btcKrw / 100_000_000)),
        needsPriceSync: false,
        linkedAssetId: null,
        memo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      records.push(expense);
    }
  }

  return records;
}

// 더미 자산 생성
function generateDummyAssets(): Asset[] {
  const now = new Date().toISOString();

  const fiatAsset: FiatAsset = {
    id: DUMMY_PREFIX + uuidv4(),
    type: 'fiat',
    name: '주거래 통장 (테스트)',
    balance: 5500000,
    currency: 'KRW',
    createdAt: now,
    updatedAt: now,
  };

  const btcAsset: BitcoinAsset = {
    id: DUMMY_PREFIX + uuidv4(),
    type: 'bitcoin',
    name: 'Cold Wallet (테스트)',
    balance: 50000000, // 0.5 BTC
    walletType: 'onchain',
    createdAt: now,
    updatedAt: now,
  };

  const lightningAsset: BitcoinAsset = {
    id: DUMMY_PREFIX + uuidv4(),
    type: 'bitcoin',
    name: 'Lightning 지갑 (테스트)',
    balance: 1000000, // 0.01 BTC
    walletType: 'lightning',
    createdAt: now,
    updatedAt: now,
  };

  return [fiatAsset, btcAsset, lightningAsset];
}

// 더미 대출 생성
function generateDummyLoan(): Loan {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 12);
  const startDateStr = startDate.toISOString().split('T')[0];

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 60);
  const endDateStr = endDate.toISOString().split('T')[0];

  return {
    id: DUMMY_PREFIX + uuidv4(),
    name: 'BTC 매수 대출 (테스트)',
    institution: '테스트 은행',
    principal: 50000000,
    interestRate: 4.0,
    repaymentType: 'equalPrincipalAndInterest',
    termMonths: 60,
    startDate: startDateStr,
    endDate: endDateStr,
    monthlyPayment: 920000,
    totalInterest: 5200000,
    paidMonths: 12,
    remainingPrincipal: 47000000,
    status: 'active',
    repaymentDay: 15,
    linkedAssetId: undefined,
    memo: '테스트용 더미 대출',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

// 더미 데이터 추가 (실제 BTC 시세 사용)
export async function addDummyData(encryptionKey: string): Promise<{
  snapshots: number;
  records: number;
  assets: number;
  loans: number;
}> {
  // 1. 실제 BTC 시세 가져오기 (최근 200일)
  console.log('========================================');
  console.log('[DummyData] 더미 데이터 생성 시작!');
  console.log('[DummyData] BTC 시세 데이터 가져오는 중...');
  let priceMap: Map<string, number>;
  try {
    console.log('[DummyData] Upbit API 호출 중...');
    priceMap = await fetchDailyPrices(200);
    console.log(`[DummyData] ✅ ${priceMap.size}일치 시세 데이터 로드 완료`);
    // 첫 번째와 마지막 시세 출력
    const dates = Array.from(priceMap.keys()).sort();
    if (dates.length > 0) {
      console.log(`[DummyData] 시세 범위: ${dates[0]}=${priceMap.get(dates[0])} ~ ${dates[dates.length-1]}=${priceMap.get(dates[dates.length-1])}`);
    }
  } catch (error) {
    console.error('[DummyData] ❌ 시세 데이터 로드 실패, 기본값 사용:', error);
    // 실패 시 기본값 사용
    priceMap = new Map();
    for (let i = 0; i < 200; i++) {
      const date = getDateDaysAgo(i);
      priceMap.set(date, 150000000); // 기본 1.5억
    }
  }

  // 2. 스냅샷 추가
  const existingSnapshots = await loadEncrypted<MonthlySnapshot[]>(FILE_PATHS.SNAPSHOTS, encryptionKey, []);
  const newSnapshots = generateDummySnapshots(priceMap);
  const mergedSnapshots = [...existingSnapshots, ...newSnapshots];
  await saveEncrypted(FILE_PATHS.SNAPSHOTS, mergedSnapshots, encryptionKey);

  // 3. 기록 추가
  const existingRecords = await loadEncrypted<LedgerRecord[]>(FILE_PATHS.LEDGER, encryptionKey, []);
  const newRecords = generateDummyRecords(priceMap);
  const mergedRecords = [...existingRecords, ...newRecords];
  await saveEncrypted(FILE_PATHS.LEDGER, mergedRecords, encryptionKey);

  // 4. 자산 추가
  const existingAssets = await loadEncrypted<Asset[]>(FILE_PATHS.ASSETS, encryptionKey, []);
  const newAssets = generateDummyAssets();
  const mergedAssets = [...existingAssets, ...newAssets];
  await saveEncrypted(FILE_PATHS.ASSETS, mergedAssets, encryptionKey);

  // 5. 대출 추가
  const existingLoans = await loadEncrypted<Loan[]>(FILE_PATHS.LOANS, encryptionKey, []);
  const newLoan = generateDummyLoan();
  const mergedLoans = [...existingLoans, newLoan];
  await saveEncrypted(FILE_PATHS.LOANS, mergedLoans, encryptionKey);

  console.log('[DummyData] 더미 데이터 추가 완료 (실제 BTC 시세 사용)');

  return {
    snapshots: newSnapshots.length,
    records: newRecords.length,
    assets: newAssets.length,
    loans: 1,
  };
}

// 더미 데이터 삭제
export async function removeDummyData(encryptionKey: string): Promise<{
  snapshots: number;
  records: number;
  assets: number;
  loans: number;
}> {
  let removedSnapshots = 0;
  let removedRecords = 0;
  let removedAssets = 0;
  let removedLoans = 0;

  // 스냅샷에서 더미 제거
  const snapshots = await loadEncrypted<MonthlySnapshot[]>(FILE_PATHS.SNAPSHOTS, encryptionKey, []);
  const filteredSnapshots = snapshots.filter(s => !s.id.startsWith(DUMMY_PREFIX));
  removedSnapshots = snapshots.length - filteredSnapshots.length;
  await saveEncrypted(FILE_PATHS.SNAPSHOTS, filteredSnapshots, encryptionKey);

  // 기록에서 더미 제거
  const records = await loadEncrypted<LedgerRecord[]>(FILE_PATHS.LEDGER, encryptionKey, []);
  const filteredRecords = records.filter(r => !r.id.startsWith(DUMMY_PREFIX));
  removedRecords = records.length - filteredRecords.length;
  await saveEncrypted(FILE_PATHS.LEDGER, filteredRecords, encryptionKey);

  // 자산에서 더미 제거
  const assets = await loadEncrypted<Asset[]>(FILE_PATHS.ASSETS, encryptionKey, []);
  const filteredAssets = assets.filter(a => !a.id.startsWith(DUMMY_PREFIX));
  removedAssets = assets.length - filteredAssets.length;
  await saveEncrypted(FILE_PATHS.ASSETS, filteredAssets, encryptionKey);

  // 대출에서 더미 제거
  const loans = await loadEncrypted<Loan[]>(FILE_PATHS.LOANS, encryptionKey, []);
  const filteredLoans = loans.filter(l => !l.id.startsWith(DUMMY_PREFIX));
  removedLoans = loans.length - filteredLoans.length;
  await saveEncrypted(FILE_PATHS.LOANS, filteredLoans, encryptionKey);

  console.log('[DummyData] 더미 데이터 삭제 완료');

  return {
    snapshots: removedSnapshots,
    records: removedRecords,
    assets: removedAssets,
    loans: removedLoans,
  };
}

// 더미 데이터 존재 여부 확인
export async function hasDummyData(encryptionKey: string): Promise<boolean> {
  const snapshots = await loadEncrypted<MonthlySnapshot[]>(FILE_PATHS.SNAPSHOTS, encryptionKey, []);
  return snapshots.some(s => s.id.startsWith(DUMMY_PREFIX));
}
