import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, Expense, Category } from '@/lib/database';

interface ExpenseItem extends Expense {
  category_name?: string;
  category_color?: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchExpenses = useCallback(async () => {
    try {
      const [rawExpenses, cats] = await Promise.all([
        db.getExpenses({ month }),
        db.getCategories(),
      ]);
      setCategories(cats);

      const catMap = new Map(cats.map((c) => [c.id, c]));

      const items: ExpenseItem[] = rawExpenses.map((e) => {
        const cat = e.category_id ? catMap.get(e.category_id) : undefined;
        return {
          ...e,
          category_name: cat?.name,
          category_color: cat?.color ?? undefined,
        };
      });

      setExpenses(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    setLoading(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  async function deleteExpense(id: number) {
    Alert.alert('Eliminar gasto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await db.deleteExpense(id);
          fetchExpenses();
        },
      },
    ]);
  }

  const monthName = new Date(month + '-01').toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.monthPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <Text style={[styles.arrow, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </Text>
          <Text style={[styles.totalText, { color: colors.muted }]}>
            Total: ${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <Text style={[styles.arrow, { color: colors.tint }]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      >
        {expenses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No hay gastos este mes
            </Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              style={[styles.expenseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onLongPress={() => deleteExpense(expense.id)}
            >
              <View style={styles.expenseLeft}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: expense.category_color || colors.muted },
                  ]}
                />
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseCategory, { color: colors.muted }]}>
                    {expense.category_name || 'Sin categoría'}
                  </Text>
                  <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>
                    {expense.description || 'Sin descripción'}
                  </Text>
                  <Text style={[styles.expenseDate, { color: colors.muted }]}>
                    {new Date(expense.date + 'T00:00:00').toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.text }]}>
                -${Number(expense.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  monthArrow: { padding: 8 },
  arrow: { fontSize: 32, fontWeight: '300' },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthText: { fontSize: 17, fontWeight: '600', textTransform: 'capitalize' },
  totalText: { fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { borderRadius: 14, padding: 40, borderWidth: 1, alignItems: 'center', marginTop: 16 },
  emptyText: { fontSize: 16 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseCategory: { fontSize: 12, fontWeight: '500' },
  expenseDesc: { fontSize: 15, marginTop: 1 },
  expenseDate: { fontSize: 12, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '600' },
});
