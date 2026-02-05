import { View, Text } from 'react-native';

interface ChartEmptyStateProps {
  message?: string;
  icon?: string;
}

export function ChartEmptyState({
  message = '데이터가 없습니다',
  icon = '📊'
}: ChartEmptyStateProps) {
  return (
    <View
      style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 150,
      }}
    >
      <Text style={{ fontSize: 32, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
