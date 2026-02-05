import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants/supabase';

// Supabase 클라이언트 생성
export const supabase = createClient(
  SUPABASE_CONFIG.URL,
  SUPABASE_CONFIG.ANON_KEY
);

// 타입 정의
export interface User {
  id: string;
  linking_key: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'expired' | 'cancelled';
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount_sats: number;
  lightning_invoice: string | null;
  payment_hash: string | null;
  status: 'pending' | 'paid' | 'expired';
  created_at: string;
  paid_at: string | null;
}

// 구독 상태 조회
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// 구독 활성화 여부 확인
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);
  if (!subscription) return false;

  if (subscription.status !== 'active') return false;

  if (subscription.expires_at) {
    return new Date(subscription.expires_at) > new Date();
  }

  return true;
}

// 결제 생성
export async function createPayment(userId: string, amountSats: number): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount_sats: amountSats,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('결제 생성 실패:', error);
    return null;
  }

  return data;
}

// 결제 상태 업데이트
export async function updatePaymentStatus(
  paymentId: string,
  status: 'paid' | 'expired',
  paymentHash?: string
): Promise<boolean> {
  const updateData: Partial<Payment> = { status };
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
    if (paymentHash) {
      updateData.payment_hash = paymentHash;
    }
  }

  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  return !error;
}

// 구독 생성/갱신
export async function activateSubscription(userId: string): Promise<Subscription | null> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1개월 후 만료

  // 기존 활성 구독이 있으면 만료일 연장
  const existing = await getSubscription(userId);
  if (existing && existing.status === 'active' && existing.expires_at) {
    const currentExpiry = new Date(existing.expires_at);
    if (currentExpiry > now) {
      // 기존 만료일부터 1개월 연장
      currentExpiry.setMonth(currentExpiry.getMonth() + 1);
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ expires_at: currentExpiry.toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      return error ? null : data;
    }
  }

  // 새 구독 생성
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('구독 활성화 실패:', error);
    return null;
  }

  return data;
}
