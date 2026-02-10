import { create } from 'zustand';
import {
  supabase,
  getSubscription,
  isSubscriptionActive,
  createPayment,
  updatePaymentStatus,
  activateSubscription,
  Subscription,
  Payment,
} from '../services/supabase';
import {
  createLightningInvoice,
  checkPaymentStatus,
} from '../services/blinkProxy';
import {
  createLnurlAuthSession,
  checkAuthSession,
  getOrCreateUserByLinkingKey,
} from '../services/lnurlAuth';
import {
  requestNotificationPermissions,
  scheduleSubscriptionExpiryNotifications,
  cancelAllSubscriptionNotifications,
} from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';
import { getSecure, saveSecure } from '../utils/encryption';
import { getSubscriptionPriceSats } from '../services/appConfigService';

const PENDING_INVOICE_KEY = 'SYBA_PENDING_INVOICE';

// 사용자 타입 (LNURL-auth 기반)
interface User {
  id: string;
  linking_key: string;
  created_at: string;
}

interface SubscriptionState {
  // 상태
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isSubscribed: boolean;
  pendingPayment: Payment | null;
  lightningInvoice: string | null;

  // LNURL-auth 상태
  authSessionId: string | null;
  authLnurl: string | null;
  authLnurlEncoded: string | null;
  authStatus: 'idle' | 'waiting' | 'authenticated' | 'error';
}

interface SubscriptionActions {
  // 초기화
  initialize: () => Promise<void>;

  // LNURL-auth 로그인
  startLnurlAuth: () => Promise<string | null>; // LNURL 반환
  checkLnurlAuthStatus: () => Promise<boolean>;
  cancelLnurlAuth: () => void;
  logout: () => Promise<void>;

  // 구독
  checkSubscription: () => Promise<boolean>;
  startPayment: () => Promise<string | null>;
  confirmPayment: () => Promise<boolean>;

  // 상태 업데이트
  refreshSubscription: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>((set, get) => ({
  // 초기 상태
  user: null,
  subscription: null,
  isLoading: true,
  isSubscribed: false,
  pendingPayment: null,
  lightningInvoice: null,
  authSessionId: null,
  authLnurl: null,
  authLnurlEncoded: null,
  authStatus: 'idle',

  // 초기화
  initialize: async () => {
    try {
      const savedUserId = await getSecure('SYBA_USER_ID');
      if (savedUserId) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', savedUserId)
          .single();

        if (user) {
          const subscription = await getSubscription(user.id);
          const isActive = subscription ? await isSubscriptionActive(user.id) : false;

          set({
            user,
            subscription,
            isSubscribed: isActive,
            isLoading: false,
          });

          // 활성 구독이 있으면 만료 알림 스케줄링
          if (isActive && subscription?.expires_at) {
            scheduleSubscriptionExpiryNotifications(new Date(subscription.expires_at));
          }

          // 미확인 인보이스 복구: 결제했는데 모달 닫힌 경우
          if (!isActive) {
            try {
              const saved = await AsyncStorage.getItem(PENDING_INVOICE_KEY);
              if (saved) {
                const { paymentId, invoice, paymentHash } = JSON.parse(saved);
                console.log('[Subscription] 미확인 인보이스 발견, 상태 확인...');
                const status = await checkPaymentStatus(invoice);
                if (status === 'PAID') {
                  console.log('[Subscription] 미확인 결제 확인됨! 프리미엄 활성화');
                  await updatePaymentStatus(paymentId, 'paid', paymentHash);
                  const newSub = await activateSubscription(user.id);
                  if (newSub) {
                    set({ subscription: newSub, isSubscribed: true });
                    if (newSub.expires_at) {
                      await requestNotificationPermissions();
                      await scheduleSubscriptionExpiryNotifications(new Date(newSub.expires_at));
                    }
                  }
                }
                await AsyncStorage.removeItem(PENDING_INVOICE_KEY);
              }
            } catch (e) {
              console.error('[Subscription] 미확인 인보이스 복구 실패:', e);
              await AsyncStorage.removeItem(PENDING_INVOICE_KEY);
            }
          }

          return;
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('구독 초기화 실패:', error);
      set({ isLoading: false });
    }
  },

  // LNURL-auth 시작
  startLnurlAuth: async () => {
    console.log('[SubscriptionStore] startLnurlAuth 시작');
    try {
      set({ authStatus: 'waiting' });

      console.log('[SubscriptionStore] createLnurlAuthSession 호출');
      const session = await createLnurlAuthSession();
      console.log('[SubscriptionStore] createLnurlAuthSession 결과:', session ? 'success' : 'null');

      if (!session) {
        console.error('[SubscriptionStore] 세션 생성 실패');
        set({ authStatus: 'error' });
        return null;
      }

      console.log('[SubscriptionStore] LNURL 생성 성공:', session.sessionId);
      set({
        authSessionId: session.sessionId,
        authLnurl: session.lnurl,
        authLnurlEncoded: session.lnurlEncoded,
      });

      return session.lnurl;
    } catch (error) {
      console.error('[SubscriptionStore] LNURL-auth 시작 실패:', error);
      set({ authStatus: 'error' });
      return null;
    }
  },

  // LNURL-auth 상태 확인
  checkLnurlAuthStatus: async () => {
    const { authSessionId } = get();
    if (!authSessionId) return false;

    try {
      const session = await checkAuthSession(authSessionId);
      if (!session) return false;

      if (session.status === 'authenticated' && session.linking_key) {
        // 사용자 조회/생성
        const user = await getOrCreateUserByLinkingKey(session.linking_key);
        if (!user) {
          set({ authStatus: 'error' });
          return false;
        }

        // 로컬에 저장
        await saveSecure('SYBA_USER_ID', user.id);

        // 구독 상태 확인
        const subscription = await getSubscription(user.id);
        const isActive = subscription ? await isSubscriptionActive(user.id) : false;

        set({
          user,
          subscription,
          isSubscribed: isActive,
          authStatus: 'authenticated',
          authSessionId: null,
          authLnurl: null,
          authLnurlEncoded: null,
        });

        return true;
      }

      if (session.status === 'expired') {
        set({ authStatus: 'error' });
        return false;
      }

      return false; // 아직 대기 중
    } catch (error) {
      console.error('LNURL-auth 상태 확인 실패:', error);
      return false;
    }
  },

  // LNURL-auth 취소
  cancelLnurlAuth: () => {
    set({
      authSessionId: null,
      authLnurl: null,
      authLnurlEncoded: null,
      authStatus: 'idle',
    });
  },

  // 로그아웃
  logout: async () => {
    try {
      await saveSecure('SYBA_USER_ID', '');
      await cancelAllSubscriptionNotifications();
      set({
        user: null,
        subscription: null,
        isSubscribed: false,
        pendingPayment: null,
        lightningInvoice: null,
        authStatus: 'idle',
      });
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  },

  // 구독 상태 확인
  checkSubscription: async () => {
    const { user } = get();
    if (!user) return false;

    const isActive = await isSubscriptionActive(user.id);
    set({ isSubscribed: isActive });
    return isActive;
  },

  // 결제 시작
  startPayment: async () => {
    const { user } = get();
    if (!user) return null;

    try {
      // Supabase에서 구독 가격 조회 (실패 시 기본값 사용)
      const priceSats = await getSubscriptionPriceSats();

      const invoice = await createLightningInvoice(
        priceSats,
        `SYBA 프리미엄 구독`
      );

      const payment = await createPayment(user.id, priceSats);
      if (!payment) return null;

      await supabase
        .from('payments')
        .update({
          lightning_invoice: invoice.paymentRequest,
          payment_hash: invoice.paymentHash,
        })
        .eq('id', payment.id);

      set({
        pendingPayment: { ...payment, payment_hash: invoice.paymentHash },
        lightningInvoice: invoice.paymentRequest,
      });

      // 미확인 인보이스 복구용 저장
      await AsyncStorage.setItem(PENDING_INVOICE_KEY, JSON.stringify({
        paymentId: payment.id,
        invoice: invoice.paymentRequest,
        paymentHash: invoice.paymentHash,
      }));

      return invoice.paymentRequest;
    } catch (error) {
      console.error('결제 시작 실패:', error);
      return null;
    }
  },

  // 결제 확인 (WebSocket에서 PAID 확인 후 호출됨 — HTTP 재확인 불필요)
  confirmPayment: async () => {
    const { user, pendingPayment, lightningInvoice } = get();
    if (!user || !pendingPayment || !lightningInvoice) return false;

    try {
      const paymentUpdated = await updatePaymentStatus(pendingPayment.id, 'paid', pendingPayment.payment_hash || undefined);
      if (!paymentUpdated) {
        console.error('[Subscription] payment 상태 업데이트 실패:', pendingPayment.id);
      }

      const subscription = await activateSubscription(user.id);
      if (!subscription) return false;

      // pending invoice 정리
      await AsyncStorage.removeItem(PENDING_INVOICE_KEY);

      set({
        subscription,
        isSubscribed: true,
        pendingPayment: null,
        lightningInvoice: null,
      });

      // 구독 만료 알림 스케줄링
      if (subscription.expires_at) {
        await requestNotificationPermissions();
        await scheduleSubscriptionExpiryNotifications(new Date(subscription.expires_at));
      }

      return true;
    } catch (error) {
      console.error('결제 확인 실패:', error);
      return false;
    }
  },

  // 구독 새로고침
  refreshSubscription: async () => {
    const { user } = get();
    if (!user) return;

    const subscription = await getSubscription(user.id);
    const isActive = subscription ? await isSubscriptionActive(user.id) : false;

    set({
      subscription,
      isSubscribed: isActive,
    });
  },
}));
