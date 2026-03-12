// 어드민 권한이 있는 linking_key 목록
// Supabase ADMIN_LINKING_KEYS 환경변수와 동일하게 유지할 것
export const ADMIN_LINKING_KEYS: string[] = [
  // Jin의 linking_key — 실제 값은 배포 시 입력
  // 예: '02abc123...'
];

export function isAdmin(linkingKey: string | undefined | null): boolean {
  if (!linkingKey) return false;
  return ADMIN_LINKING_KEYS.includes(linkingKey);
}
