// 어드민 권한이 있는 linking_key 목록
// Supabase ADMIN_LINKING_KEYS 환경변수와 동일하게 유지할 것
export const ADMIN_LINKING_KEYS: string[] = [
  '02cd4ec619adb9af0326fc4dcdc25b77bb754b99ad4d2bf7f69ce328416c3545bf',
];

export function isAdmin(linkingKey: string | undefined | null): boolean {
  if (!linkingKey) return false;
  return ADMIN_LINKING_KEYS.includes(linkingKey);
}
