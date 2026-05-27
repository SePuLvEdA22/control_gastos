import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, Expense, Category, MonthlyBudget } from '@/lib/database';

interface ExpenseWithCategory extends Expense {
  category_name?: string;
}

interface MonthlySummary {
  total: number;
  byCategory: { category_name: string; total: number; color: string }[];
  expenseCount: number;
  dailyAverage: number;
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseWithCategory[]>([]);

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const fetchData = useCallback(async () => {
    try {
      const [rawExpenses, categories, budgetData] = await Promise.all([
        db.getExpenses({ month: currentMonth }),
        db.getCategories(),
        db.getBudget(`${currentMonth}-01`),
      ]);

      const catMap = new Map(categories.map((c) => [c.id, c]));

      const expenses: ExpenseWithCategory[] = rawExpenses.map((e) => ({
        ...e,
        category_name: e.category_id ? catMap.get(e.category_id)?.name : undefined,
      }));

      if (expenses.length > 0) {
        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const byCategoryMap: Record<string, { total: number; color: string }> = {};
        expenses.forEach((e) => {
          const name = e.category_name || 'Sin categoría';
          const cat = e.category_id ? catMap.get(e.category_id) : undefined;
          if (!byCategoryMap[name]) byCategoryMap[name] = { total: 0, color: cat?.color ?? '#64748b' };
          byCategoryMap[name].total += Number(e.amount);
        });
        const byCategory = Object.entries(byCategoryMap).map(([k, v]) => ({
          category_name: k,
          ...v,
        }));

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const day = Math.min(now.getDate(), daysInMonth);

        setSummary({
          total,
          byCategory,
          expenseCount: expenses.length,
          dailyAverage: day > 0 ? total / day : 0,
        });
        setRecentExpenses(expenses.slice(0, 5));
      } else {
        setSummary({
          total: 0,
          byCategory: [],
          expenseCount: 0,
          dailyAverage: 0,
        });
        setRecentExpenses([]);
      }

      if (budgetData) setBudget(budgetData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const budgetProgress = budget && summary?.total
    ? summary.total / Number(budget.amount)
    : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.monthTitle, { color: colors.text }]}>
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.muted }]}>Gasto Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          ${(summary?.total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </Text>
        <View style={styles.row}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              {summary?.expenseCount ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Gastos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.tint }]}>
              ${(summary?.dailyAverage ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Promedio/día</Text>
          </View>
        </View>
      </View>

      {budget && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.label, { color: colors.muted }]}>Presupuesto Mensual</Text>
            <Text style={[styles.budgetAmount, { color: colors.text }]}>
              ${Number(budget.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(budgetProgress * 100, 100)}%`,
                  backgroundColor: budgetProgress > 1 ? colors.error : colors.tint,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.progressText,
              { color: budgetProgress > 1 ? colors.error : colors.muted },
            ]}
          >
            {budgetProgress > 1
              ? `Excedido en $${((budgetProgress - 1) * Number(budget.amount)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
              : `${(budgetProgress * 100).toFixed(1)}% utilizado`}
          </Text>
        </View>
      )}

      {summary && summary.byCategory.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Por Categoría</Text>
          {summary.byCategory.map((cat, i) => (
            <View key={i} style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {cat.category_name}
                </Text>
              </View>
              <Text style={[styles.categoryAmount, { color: colors.text }]}>
                ${cat.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {recentExpenses.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimos Gastos</Text>
          {recentExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              <View style={styles.expenseLeft}>
                <Text style={[styles.expenseCategory, { color: colors.muted }]}>
                  {expense.category_name || 'Sin categoría'}
                </Text>
                <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>
                  {expense.description || 'Sin descripción'}
                </Text>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.text }]}>
                -${Number(expense.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </Text>
            </View>
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
  monthTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textTransform: 'capitalize' },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  totalAmount: { fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 24, backgroundColor: 'transparent' },
  statItem: { backgroundColor: 'transparent' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 2 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  budgetAmount: { fontSize: 18, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: 'transparent' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 15 },
  categoryAmount: { fontSize: 15, fontWeight: '600' },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: 'transparent' },
  expenseLeft: { flex: 1, marginRight: 12, backgroundColor: 'transparent' },
  expenseCategory: { fontSize: 12, fontWeight: '500' },
  expenseDesc: { fontSize: 15, marginTop: 1 },
  expenseAmount: { fontSize: 16, fontWeight: '600' },
});
