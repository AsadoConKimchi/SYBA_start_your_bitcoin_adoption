import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../constants/config';

// SecureStore 키
export const SECURE_KEYS = {
  PASSWORD_HASH: 'password_hash',
  ENCRYPTION_SALT: 'encryption_salt',
  ENCRYPTION_KEY: 'encryption_key',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  USER_ID: 'user_id',
} as const;

// 랜덤 솔트 생성
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 비밀번호에서 암호화 키 파생 (async, progress callback 지원)
// 기존 호환성: 동일한 알고리즘(CryptoJS PBKDF2-SHA1), 동일한 iterations → 동일한 키
export async function deriveKey(
  password: string,
  salt: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(0);
  // Yield to UI thread before heavy computation
  await new Promise(resolve => setTimeout(resolve, 0));

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: CONFIG.PBKDF2_ITERATIONS,
  });

  onProgress?.(1);
  return key.toString();
}

// 동기 버전 (레거시 호환, 내부 사용)
export function deriveKeySync(password: string, salt: string): string {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: CONFIG.PBKDF2_ITERATIONS,
  });
  return key.toString();
}

// 비밀번호 해시 생성 (검증용) - SHA-256 사용 (빠름)
export function hashPassword(password: string, salt: string): string {
  return CryptoJS.SHA256(password + salt + '_verify').toString();
}

// 데이터 암호화 (expo-crypto로 IV 생성)
export async function encrypt(data: unknown, key: string): Promise<string> {
  const jsonString = JSON.stringify(data);

  // expo-crypto로 안전한 IV 생성
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const iv = CryptoJS.lib.WordArray.create(ivBytes as unknown as number[]);

  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const encrypted = CryptoJS.AES.encrypt(jsonString, keyWordArray, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // IV + 암호문 결합 (복호화 시 필요)
  const combined = iv.toString() + ':' + encrypted.toString();
  return combined;
}

// 데이터 복호화
export function decrypt<T>(encryptedString: string, key: string): T {
  const keyWordArray = CryptoJS.enc.Hex.parse(key);

  // IV와 암호문 분리
  const parts = encryptedString.split(':');
  if (parts.length === 2) {
    // 새 포맷 (IV:암호문)
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const decrypted = CryptoJS.AES.decrypt(parts[1], keyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!jsonString) {
      throw new Error('Decryption failed: incorrect password');
    }
    return JSON.parse(jsonString) as T;
  } else {
    // 기존 포맷 (호환성)
    const decrypted = CryptoJS.AES.decrypt(encryptedString, key);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!jsonString) {
      throw new Error('Decryption failed: incorrect password');
    }
    return JSON.parse(jsonString) as T;
  }
}

// SecureStore 헬퍼
export async function saveSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getSecure(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// 비밀번호 설정 여부 확인
export async function isPasswordSet(): Promise<boolean> {
  const hash = await getSecure(SECURE_KEYS.PASSWORD_HASH);
  return hash !== null;
}
