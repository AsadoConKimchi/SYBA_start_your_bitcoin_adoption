// 원화 포맷
export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// 원화 포맷 (기호 없이)
export function formatKrwPlain(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// sats 포맷
export function formatSats(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + ' sats';
}

// 날짜 포맷 (2026년 1월 29일)
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// 짧은 날짜 포맷 (1월 29일)
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// 날짜 + 요일 (1월 29일 수요일)
export function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

// 퍼센트 포맷
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// 퍼센트 포맷 (부호 없이)
export function formatPercentPlain(value: number): string {
  return `${value.toFixed(1)}%`;
}

// 시간 포맷 (몇 분 전, 몇 시간 전)
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return formatDateShort(dateString);
}

// 오늘 날짜 문자열 (YYYY-MM-DD)
export function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// 현재 연월 (YYYY-MM)
export function getCurrentYearMonth(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
