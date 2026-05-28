import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useExpenseStore } from '@/store/useExpenseStore';
import { toLocalMonth } from '@/lib/database';
import { router } from 'expo-router';
import DonutChart from '@/components/DonutChart';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { summary, prevSummary, budgetAmount, fetchDashboard } = useExpenseStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(toLocalMonth(new Date()));

  const fetchData = useCallback(async () => {
    await fetchDashboard(selectedMonth);
    setRefreshing(false);
  }, [fetchDashboard, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(toLocalMonth(d));
  };

  const monthLabel = new Date(selectedMonth + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!summary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const vsPrev = prevSummary && prevSummary.totalExpenses > 0
    ? ((summary.totalExpenses - prevSummary.totalExpenses) / prevSummary.totalExpenses) * 100
    : null;

  const budgetProgress = budgetAmount && summary.totalExpenses > 0
    ? summary.totalExpenses / budgetAmount
    : 0;

  const budgetColor = budgetProgress >= 1 ? colors.error : budgetProgress >= 0.8 ? colors.warning : colors.tint;

  const budgetMessage = budgetProgress >= 1
    ? `Excedido en $${((budgetProgress - 1) * budgetAmount!).toLocaleString('es-ES', { minimumFractionDigits: 0 })}`
    : budgetProgress >= 0.8
    ? `¡Cuidado! Has usado el ${(budgetProgress * 100).toFixed(1)}% de tu presupuesto`
    : `${(budgetProgress * 100).toFixed(1)}% utilizado`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, { color: colors.tint }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.muted }]}>Balance del Mes</Text>
        <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? colors.success : colors.error }]}>
          ${Math.abs(summary.balance).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
          <Text style={[styles.balanceSign, { color: summary.balance >= 0 ? colors.success : colors.error }]}>
            {summary.balance >= 0 ? ' positivo' : ' negativo'}
          </Text>
        </Text>
      </View>

      <View style={[styles.row, { marginBottom: 16 }]}>
        <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.halfLabel, { color: colors.muted }]}>Ingresos</Text>
          <Text style={[styles.halfAmount, { color: colors.success }]}>
            ${summary.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.halfLabel, { color: colors.muted }]}>Gastos</Text>
          <Text style={[styles.halfAmount, { color: colors.error }]}>
            ${summary.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              {summary.expenseCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Gastos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              ${summary.dailyAverage.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Promedio/día</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: vsPrev !== null ? (vsPrev > 0 ? colors.error : colors.success) : colors.muted }]}>
              {vsPrev !== null ? `${vsPrev > 0 ? '+' : ''}${vsPrev.toFixed(0)}%` : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Vs mes ant.</Text>
          </View>
        </View>
      </View>

      {budgetAmount !== null && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.label, { color: colors.muted }]}>Presupuesto Mensual</Text>
            <Text style={[styles.budgetAmount, { color: colors.text }]}>
              ${budgetAmount.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(budgetProgress * 100, 100)}%`,
                  backgroundColor: budgetColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: budgetColor }]}>
            {budgetMessage}
          </Text>
        </View>
      )}

      {summary.byCategory.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Por Categoría</Text>
          <DonutChart
            data={summary.byCategory.map((cat) => ({
              label: cat.category_name,
              value: cat.total,
              color: cat.color || colors.tint,
            }))}
            size={180}
            strokeWidth={35}
          />
        </View>
      )}

      {summary.topExpenses.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Gastos</Text>
          {summary.topExpenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              style={styles.expenseRow}
              onPress={() => router.push({ pathname: '/(tabs)/add', params: { id: String(expense.id) } })}
            >
              <View style={styles.expenseLeft}>
                <View style={styles.topRow}>
                  <Text style={[styles.topAmount, { color: colors.error }]}>
                    ${Number(expense.amount).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                  </Text>
                  <Text style={[styles.topDesc, { color: colors.text }]} numberOfLines={1}>
                    {expense.description || 'Sin descripción'}
                  </Text>
                </View>
                <Text style={[styles.expenseDesc, { color: colors.text }]}>
                  {new Date(expense.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 16 },
  monthArrow: { padding: 8 },
  monthArrowText: { fontSize: 32, fontWeight: '300' },
  monthTitle: { fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize' },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  balanceCard: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', flexShrink: 1 },
  balanceSign: { fontSize: 16, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12, backgroundColor: 'transparent', marginBottom: 0 },
  halfCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center' },
  halfLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  halfAmount: { fontSize: 22, fontWeight: 'bold' },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'transparent' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  budgetAmount: { fontSize: 18, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, marginTop: 6 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: 'transparent' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 15 },
  categoryAmount: { fontSize: 14, fontWeight: '600' },
  categoryPct: { fontSize: 12, fontWeight: '400' },
  expenseRow: { paddingVertical: 8, backgroundColor: 'transparent' },
  expenseLeft: { backgroundColor: 'transparent' },
  expenseCategory: { fontSize: 14, fontWeight: '500' },
  expenseDesc: { fontSize: 12, marginTop: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent' },
  topAmount: { fontSize: 15, fontWeight: '700', flexShrink: 0 },
  topDesc: { fontSize: 14, flexShrink: 1 },
});
