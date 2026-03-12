// Sentry 에러 모니터링 서비스
// DSN 미설정 시 모든 함수가 no-op으로 동작

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
let isInitialized = false;

/** Sentry 초기화 (앱 시작 시 1회 호출) */
export function initErrorReporting(): void {
  if (!SENTRY_DSN || isInitialized) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `com.syba.finance@${Constants.expoConfig?.version ?? '0.0.0'}`,
    enabled: !__DEV__, // 개발 모드에서는 비활성화
    tracesSampleRate: 0.2,
    beforeSend(event) {
      // PII 제거: 이메일, 비밀번호 등 민감 정보 필터링
      if (event.request?.data) {
        delete event.request.data;
      }
      return event;
    },
  });

  isInitialized = true;
}

/** 에러 캡처 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(error);
  }

  if (!isInitialized) return;

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/** 메시지 캡처 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (__DEV__) {
    console.log(`[${level}]`, message);
  }

  if (!isInitialized) return;
  Sentry.captureMessage(message, level);
}

/** 사용자 컨텍스트 설정 (로그인 시) */
export function setUserContext(userId: string, displayId?: string): void {
  if (!isInitialized) return;
  Sentry.setUser({ id: userId, username: displayId });
}

/** 사용자 컨텍스트 초기화 (로그아웃 시) */
export function clearUserContext(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}
