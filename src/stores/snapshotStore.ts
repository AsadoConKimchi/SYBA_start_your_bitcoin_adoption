import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { MonthlySnapshot } from '../types/snapshot';
import { loadEncrypted, saveEncrypted, FILE_PATHS } from '../utils/storage';
import { useAssetStore } from './assetStore';
import { useDebtStore } from './debtStore';
import { usePriceStore } from './priceStore';

interface SnapshotState {
  snapshots: MonthlySnapshot[];
  isLoading: boolean;
}

interface SnapshotActions {
  loadSnapshots: (encryptionKey: string) => Promise<void>;
  saveSnapshot: (encryptionKey: string) => Promise<MonthlySnapshot | null>;
  getSnapshotByMonth: (yearMonth: string) => MonthlySnapshot | undefined;
  hasSnapshotForMonth: (yearMonth: string) => boolean;
  checkAndSaveMonthlySnapshot: (encryptionKey: string) => Promise<boolean>;
  getRecentSnapshots: (months: number) => MonthlySnapshot[];
}

// 현재 년월 문자열 생성 (YYYY-MM)
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 이전 달 년월 문자열 생성
function getPreviousYearMonth(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export const useSnapshotStore = create<SnapshotState & SnapshotActions>((set, get) => ({
  snapshots: [],
  isLoading: true,

  // 데이터 로드
  loadSnapshots: async (encryptionKey: string) => {
    try {
      const snapshots = await loadEncrypted<MonthlySnapshot[]>(
        FILE_PATHS.SNAPSHOTS,
        encryptionKey,
        []
      );
      set({ snapshots, isLoading: false });
    } catch (error) {
      console.error('[SnapshotStore] 스냅샷 로드 실패:', error);
      set({ isLoading: false });
    }
  },

  // 현재 상태로 스냅샷 저장
  saveSnapshot: async (encryptionKey: string) => {
    const yearMonth = getCurrentYearMonth();

    // 이미 이번 달 스냅샷이 있으면 업데이트
    const existing = get().snapshots.find(s => s.yearMonth === yearMonth);

    // 현재 자산/부채 상태 가져오기
    const assetStore = useAssetStore.getState();
    const debtStore = useDebtStore.getState();
    const priceStore = usePriceStore.getState();

    const totalFiat = assetStore.getTotalFiat();
    const totalBtcSats = assetStore.getTotalBitcoin();
    const btcKrw = priceStore.btcKrw;

    // 부채 계산
    const activeInstallments = debtStore.getActiveInstallments();
    const activeLoans = debtStore.getActiveLoans();
    const totalInstallments = activeInstallments.reduce((sum, i) => sum + i.remainingAmount, 0);
    const totalLoans = activeLoans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
    const totalDebt = totalInstallments + totalLoans;

    // 총 자산 (원화 환산)
    const btcKrwValue = btcKrw ? totalBtcSats * (btcKrw / 100_000_000) : 0;
    const totalAssetKrw = totalFiat + btcKrwValue;

    // 순자산
    const netWorthKrw = totalAssetKrw - totalDebt;
    const netWorthBtc = btcKrw ? Math.round(netWorthKrw / (btcKrw / 100_000_000)) : 0;

    const snapshot: MonthlySnapshot = {
      id: existing?.id || uuidv4(),
      yearMonth,
      totalFiat,
      totalBtcSats,
      totalDebt,
      totalInstallments,
      totalLoans,
      btcKrw,
      totalAssetKrw,
      netWorthKrw,
      netWorthBtc,
      createdAt: new Date().toISOString(),
    };

    // 저장
    const updatedSnapshots = existing
      ? get().snapshots.map(s => s.yearMonth === yearMonth ? snapshot : s)
      : [...get().snapshots, snapshot];

    set({ snapshots: updatedSnapshots });
    await saveEncrypted(FILE_PATHS.SNAPSHOTS, updatedSnapshots, encryptionKey);

    console.log(`[SnapshotStore] ${yearMonth} 스냅샷 저장 완료`);
    return snapshot;
  },

  // 특정 월 스냅샷 조회
  getSnapshotByMonth: (yearMonth: string) => {
    return get().snapshots.find(s => s.yearMonth === yearMonth);
  },

  // 특정 월 스냅샷 존재 여부
  hasSnapshotForMonth: (yearMonth: string) => {
    return get().snapshots.some(s => s.yearMonth === yearMonth);
  },

  // 앱 실행 시 체크: 이번 달 스냅샷이 없으면 저장
  checkAndSaveMonthlySnapshot: async (encryptionKey: string) => {
    const currentMonth = getCurrentYearMonth();

    // 이번 달 스냅샷이 이미 있으면 패스
    if (get().hasSnapshotForMonth(currentMonth)) {
      console.log(`[SnapshotStore] ${currentMonth} 스냅샷 이미 존재`);
      return false;
    }

    // 이전 달 스냅샷이 없으면 이전 달 것도 저장 시도 (말일에 앱을 안 열었을 경우)
    const prevMonth = getPreviousYearMonth();
    if (!get().hasSnapshotForMonth(prevMonth)) {
      // 이전 달 데이터로 스냅샷 생성은 어려우므로 현재 상태로 대체 저장
      // (정확하지 않지만 없는 것보다 나음)
      console.log(`[SnapshotStore] ${prevMonth} 스냅샷 누락됨, 현재 상태로 보완 저장`);
    }

    // 이번 달 스냅샷 저장
    await get().saveSnapshot(encryptionKey);
    return true;
  },

  // 최근 N개월 스냅샷 조회
  getRecentSnapshots: (months: number) => {
    const snapshots = get().snapshots;
    return snapshots
      .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
      .slice(0, months);
  },
}));
