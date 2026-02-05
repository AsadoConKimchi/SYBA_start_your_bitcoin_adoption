import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'app_settings';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoading: true,

    // 설정 로드
    loadSettings: async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            settings: { ...DEFAULT_SETTINGS, ...parsed },
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        console.error('설정 로드 실패:', error);
        set({ isLoading: false });
      }
    },

    // 설정 업데이트
    updateSettings: async (updates) => {
      const newSettings = { ...get().settings, ...updates };
      set({ settings: newSettings });

      try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('설정 저장 실패:', error);
      }
    },

    // 설정 초기화
    resetSettings: async () => {
      set({ settings: DEFAULT_SETTINGS });
      try {
        await AsyncStorage.removeItem(SETTINGS_KEY);
      } catch (error) {
        console.error('설정 초기화 실패:', error);
      }
    },
  })
);
