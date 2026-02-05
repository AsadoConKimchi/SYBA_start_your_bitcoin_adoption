export type SubscriptionStatus = 'none' | 'active' | 'grace_period' | 'expired';

export interface LocalSubscription {
  linkingKey: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  lastCheckedAt: string;
}

export interface ServerSubscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string;
  created_at: string;
}

export interface ServerPayment {
  id: string;
  user_id: string;
  amount_sats: number;
  lightning_invoice: string;
  payment_hash: string | null;
  status: 'pending' | 'paid' | 'expired';
  paid_at: string | null;
  created_at: string;
}
