// Jest mock for expo-crypto (Node test environment)
module.exports = {
  getRandomBytesAsync: async (size) => new Uint8Array(size).fill(0),
  digestStringAsync: async (_algorithm, data) => data,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA1: 'SHA-1', MD5: 'MD5' },
};
