import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface ChartEmptyStateProps {
  message?: string;
  icon?: string;
}

export function ChartEmptyState({
  message,
  icon = '📊'
}: ChartEmptyStateProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.backgroundSecondary,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
      }}
    >
      <Text style={{ fontSize: 32, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center' }}>
        {message ?? t('charts.noData')}
      </Text>
    </View>
  );
}
