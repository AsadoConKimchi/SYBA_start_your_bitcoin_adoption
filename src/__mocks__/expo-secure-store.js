// Jest mock for expo-secure-store (Node test environment)
const store = {};
module.exports = {
  setItemAsync: async (key, value) => { store[key] = value; },
  getItemAsync: async (key) => store[key] ?? null,
  deleteItemAsync: async (key) => { delete store[key]; },
};
