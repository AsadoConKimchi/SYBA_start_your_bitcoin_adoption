import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLedgerStore } from '../../stores/ledgerStore';
import { usePriceStore } from '../../stores/priceStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatKrw, formatSats } from '../../utils/formatters';
import { ChartEmptyState } from './ChartEmptyState';
import { useTheme } from '../../hooks/useTheme';

interface CategoryPieChartProps {
  year: number;
  month: number;
}

const screenWidth = Dimensions.get('window').width;

type DisplayMode = 'KRW' | 'BTC';

export function CategoryPieChart({ year, month }: CategoryPieChartProps) {
  const { t } = useTranslation();
  const { getRecordsByMonth } = useLedgerStore();
  const { btcKrw } = usePriceStore();
  const { settings } = useSettingsStore();
  const { theme, isDark } = useTheme();

  const [isExpanded, setIsExpanded] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(settings.displayUnit);

  const chartConfig = {
    backgroundColor: theme.chartBackground,
    backgroundGradientFrom: theme.chartBackground,
    backgroundGradientTo: theme.chartBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(96, 165, 250, ${opacity})` : `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => theme.chartLabelColor,
  };

  // Category spending calculation (KRW + sats)
  const breakdown = useMemo(() => {
    const monthRecords = getRecordsByMonth(year, month);
    const expenses = monthRecords.filter(r => r.type === 'expense');

    // Category totals
    const categoryTotals: Record<string, { krw: number; sats: number }> = {};
    let totalExpenseKrw = 0;
    let totalExpenseSats = 0;

    for (const expense of expenses) {
      const category = expense.category || t('charts.uncategorized');
      if (!categoryTotals[category]) {
        categoryTotals[category] = { krw: 0, sats: 0 };
      }

      if (expense.currency === 'KRW') {
        categoryTotals[category].krw += expense.amount;
        categoryTotals[category].sats += expense.satsEquivalent || 0;
        totalExpenseKrw += expense.amount;
        totalExpenseSats += expense.satsEquivalent || 0;
      } else if (expense.currency === 'SATS') {
        // Convert SATS to KRW using btcKrwAtTime
        const btcPrice = expense.btcKrwAtTime || btcKrw || 150000000;
        const krwAmount = Math.round(expense.amount * (btcPrice / 100_000_000));
        categoryTotals[category].krw += krwAmount;
        categoryTotals[category].sats += expense.amount;
        totalExpenseKrw += krwAmount;
        totalExpenseSats += expense.amount;
      }
    }

    if (totalExpenseKrw === 0 && totalExpenseSats === 0) return { items: [], totalKrw: 0, totalSats: 0 };

    // Sort and extract top 5
    const sorted = Object.entries(categoryTotals)
      .map(([category, amounts]) => ({ category, ...amounts }))
      .sort((a, b) => b.krw - a.krw);

    const CHART_COLORS = [
      '#3B82F6',
      '#22C55E',
      '#F7931A',
      '#EF4444',
      '#8B5CF6',
      '#9CA3AF',
    ];

    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersKrw = others.reduce((sum, item) => sum + item.krw, 0);
    const othersSats = others.reduce((sum, item) => sum + item.sats, 0);

    const items = top5.map((item, index) => ({
      category: item.category,
      krw: item.krw,
      sats: item.sats,
      percentage: Math.round((item.krw / totalExpenseKrw) * 100),
      color: CHART_COLORS[index],
    }));

    if (othersKrw > 0) {
      items.push({
        category: t('charts.others'),
        krw: othersKrw,
        sats: othersSats,
        percentage: Math.round((othersKrw / totalExpenseKrw) * 100),
        color: CHART_COLORS[5],
      });
    }

    return { items, totalKrw: totalExpenseKrw, totalSats: totalExpenseSats };
  }, [year, month, getRecordsByMonth, t]);

  // Toggle header
  const header = (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.backgroundSecondary,
        borderRadius: isExpanded ? 0 : 12,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
      onPress={() => setIsExpanded(!isExpanded)}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
        {t('charts.categorySpending')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {breakdown.items.length > 0 && (
          <Text style={{ fontSize: 12, color: theme.error, marginRight: 8 }}>
            {displayMode === 'KRW' ? formatKrw(breakdown.totalKrw) : formatSats(breakdown.totalSats)}
          </Text>
        )}
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );

  if (!isExpanded) {
    return <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12 }}>{header}</View>;
  }

  if (breakdown.items.length === 0) {
    return (
      <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12 }}>
        {header}
        <View style={{ padding: 16, paddingTop: 0 }}>
          <ChartEmptyState
            message={t('charts.noSpendingRecords', { month })}
            icon="🥧"
          />
        </View>
      </View>
    );
  }

  const pieData = breakdown.items.map(item => ({
    name: item.category,
    population: displayMode === 'KRW' ? item.krw : item.sats,
    color: item.color,
    legendFontColor: theme.textSecondary,
    legendFontSize: 12,
  }));

  return (
    <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 12 }}>
      {header}

      <View style={{ padding: 16, paddingTop: 0 }}>
        {/* BTC/KRW toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', backgroundColor: theme.toggleTrack, borderRadius: 8, padding: 2 }}>
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: displayMode === 'BTC' ? theme.primary : 'transparent',
              }}
              onPress={() => setDisplayMode('BTC')}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: displayMode === 'BTC' ? theme.textInverse : theme.textMuted }}>
                BTC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: displayMode === 'KRW' ? theme.toggleActiveKrw : 'transparent',
              }}
              onPress={() => setDisplayMode('KRW')}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: displayMode === 'KRW' ? theme.text : theme.textMuted }}>
                KRW
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <PieChart
          data={pieData}
          width={screenWidth - 72}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute={false}
        />

        {/* Legend */}
        <View style={{ marginTop: 12 }}>
          {breakdown.items.map((item) => (
            <View
              key={item.category}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: item.color,
                    marginRight: 8,
                  }}
                />
                <Text style={{ fontSize: 13, color: theme.text }}>{item.category}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text }}>
                  {displayMode === 'KRW' ? formatKrw(item.krw) : formatSats(item.sats)}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  {item.percentage}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#444444' : '#D1D5DB',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
            {t('charts.totalSpending')}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.error }}>
            {displayMode === 'KRW' ? formatKrw(breakdown.totalKrw) : formatSats(breakdown.totalSats)}
          </Text>
        </View>
      </View>
    </View>
  );
}
