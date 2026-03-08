import CryptoJS from 'crypto-js';
import {
  hashPassword,
  hashPasswordLegacy,
  deriveKeySync,
  decrypt,
} from '../encryption';

// ─── hashPassword ──────────────────────────────────────────────────────────────

describe('hashPassword', () => {
  const password = 'TestPassword123!';
  const salt = 'abcdef1234567890';

  it('should return a non-empty hex string', () => {
    const hash = hashPassword(password, salt);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should be deterministic (same inputs → same output)', () => {
    expect(hashPassword(password, salt)).toBe(hashPassword(password, salt));
  });

  it('should produce different hashes for different passwords', () => {
    expect(hashPassword('password1', salt)).not.toBe(hashPassword('password2', salt));
  });

  it('should produce different hashes for different salts', () => {
    expect(hashPassword(password, 'salt1')).not.toBe(hashPassword(password, 'salt2'));
  });

  it('should include _verify suffix isolation (changing it changes the hash)', () => {
    // 직접 패스워드와 '_verify' suffix 포함 버전은 달라야 함
    const withoutSuffix = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000,
      hasher: CryptoJS.algo.SHA256,
    }).toString();
    const withSuffix = hashPassword(password, salt);
    expect(withSuffix).not.toBe(withoutSuffix);
  });
});

// ─── hashPasswordLegacy ─────────────────────────────────────────────────────────

describe('hashPasswordLegacy', () => {
  const password = 'LegacyPass!';
  const salt = 'deadbeef';

  it('should return a 64-char hex string (SHA-256 output)', () => {
    const hash = hashPasswordLegacy(password, salt);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should be deterministic', () => {
    expect(hashPasswordLegacy(password, salt)).toBe(hashPasswordLegacy(password, salt));
  });

  it('should differ from v2 hash for same inputs', () => {
    expect(hashPasswordLegacy(password, salt)).not.toBe(hashPassword(password, salt));
  });

  it('should match manual SHA-256(password + salt + _verify)', () => {
    const expected = CryptoJS.SHA256(password + salt + '_verify').toString();
    expect(hashPasswordLegacy(password, salt)).toBe(expected);
  });
});

// ─── deriveKeySync ──────────────────────────────────────────────────────────────

describe('deriveKeySync', () => {
  const password = 'SyncKey!';
  const salt = 'cafe1234';

  it('should return a non-empty hex string', () => {
    const key = deriveKeySync(password, salt);
    expect(key).toMatch(/^[0-9a-f]+$/);
    expect(key.length).toBeGreaterThan(0);
  });

  it('should be deterministic', () => {
    expect(deriveKeySync(password, salt)).toBe(deriveKeySync(password, salt));
  });

  it('should differ for different passwords', () => {
    expect(deriveKeySync('passA', salt)).not.toBe(deriveKeySync('passB', salt));
  });

  it('should differ for different salts', () => {
    expect(deriveKeySync(password, 'salt1')).not.toBe(deriveKeySync(password, 'salt2'));
  });
});

// ─── decrypt ───────────────────────────────────────────────────────────────────

describe('decrypt', () => {
  // 테스트용 키 (64-char hex = 32 bytes)
  const hexKey = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';

  /** encrypt 함수와 동일한 로직으로 테스트 픽스처를 생성 (IV는 결정론적으로 고정) */
  function encryptFixture(data: unknown, key: string, ivHex: string): string {
    const jsonString = JSON.stringify(data);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const encrypted = CryptoJS.AES.encrypt(jsonString, keyWordArray, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return iv.toString() + ':' + encrypted.toString();
  }

  it('should decrypt a string value correctly', () => {
    const original = 'hello world';
    const iv = '00112233445566778899aabbccddeeff';
    const fixture = encryptFixture(original, hexKey, iv);
    expect(decrypt<string>(fixture, hexKey)).toBe(original);
  });

  it('should decrypt an object correctly', () => {
    const original = { amount: 50000, currency: 'KRW' };
    const iv = 'aabbccddeeff00112233445566778899';
    const fixture = encryptFixture(original, hexKey, iv);
    expect(decrypt<typeof original>(fixture, hexKey)).toEqual(original);
  });

  it('should decrypt an array correctly', () => {
    const original = [1, 2, 3, 'test'];
    const iv = '1234567890abcdef1234567890abcdef';
    const fixture = encryptFixture(original, hexKey, iv);
    expect(decrypt<typeof original>(fixture, hexKey)).toEqual(original);
  });

  it('should throw on wrong key', () => {
    const wrongKey = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const fixture = encryptFixture({ secret: 'data' }, hexKey, '00000000000000000000000000000000');
    expect(() => decrypt(fixture, wrongKey)).toThrow('Decryption failed: incorrect password');
  });

  it('should throw on corrupted ciphertext', () => {
    const corrupted = '00000000000000000000000000000000:!!!invalid_base64!!!';
    expect(() => decrypt(corrupted, hexKey)).toThrow();
  });

  it('should handle nested objects with all primitive types', () => {
    const original = {
      str: 'text',
      num: 42,
      bool: true,
      nil: null,
      arr: [1, 'two'],
    };
    const iv = 'deadbeefcafe00001234567890abcdef';
    const fixture = encryptFixture(original, hexKey, iv);
    expect(decrypt<typeof original>(fixture, hexKey)).toEqual(original);
  });
});
