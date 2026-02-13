import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { lightTheme, darkTheme, type Theme } from '../constants/theme';

export function useTheme(): { theme: Theme; isDark: boolean } {
  const { settings } = useSettingsStore();
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemColorScheme === 'dark';
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemColorScheme]);

  const theme = isDark ? darkTheme : lightTheme;

  return { theme, isDark };
}
