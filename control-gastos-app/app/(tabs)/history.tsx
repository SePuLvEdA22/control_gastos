import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchExpenses = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const cats = await db.getCategories();
      setCategories(cats);

      const rawExpenses = query
        ? await db.searchExpenses({ month, query })
        : await db.getExpenses({ month });

      const catMap = new Map(cats.map((c) => [c.id, c]));

      const items: ExpenseItem[] = rawExpenses.map((e) => {
        const cat = e.category_id ? catMap.get(e.category_id) : undefined;
        return { ...e, category_name: cat?.name, category_color: cat?.color ?? undefined };
      });

      setExpenses(items);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, [month, query]);

  useEffect(() => {
    fetchExpenses(true);
  }, [fetchExpenses]);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses(false);
    }, [fetchExpenses])
  );

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
    Alert.alert('Eliminar', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { await db.deleteExpense(id); fetchExpenses(); },
      },
    ]);
  }

  function editExpense(id: number) {
    router.push({ pathname: '/(tabs)/add', params: { id: String(id) } });
  }

  function handleTap(expense: ExpenseItem) {
    Alert.alert(
      expense.type === 'income' ? '💰 Ingreso' : '💸 Gasto',
      `Monto: $${Number(expense.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n${
        expense.description || 'Sin descripción'
      }\n${expense.category_name || 'Sin categoría'}\n${new Date(expense.date + 'T12:00:00').toLocaleDateString('es-ES')}`,
      [
        { text: 'Editar', onPress: () => editExpense(expense.id) },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteExpense(expense.id) },
        { text: 'Cerrar' },
      ]
    );
  }

  const monthName = new Date(month + '-01').toLocaleString('es-ES', {
    month: 'long', year: 'numeric',
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = expenses.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = expenses.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);

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
            {totalIncome > 0 && `💰 $${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}  `}
            💸 ${totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            {totalIncome > 0 && `  = $${(totalIncome - totalExpenses).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <Text style={[styles.arrow, { color: colors.tint }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar gastos..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={[styles.clearBtn, { color: colors.muted }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      >
        {expenses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {query ? 'Sin resultados' : 'No hay movimientos este mes'}
            </Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              style={[styles.expenseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleTap(expense)}
              onLongPress={() => deleteExpense(expense.id)}
            >
              <View style={styles.expenseLeft}>
                <View style={[styles.typeIcon, { backgroundColor: expense.type === 'income' ? colors.success + '20' : colors.error + '20' }]}>
                  <Text style={styles.typeIconText}>{expense.type === 'income' ? '💰' : '💸'}</Text>
                </View>
                <View style={styles.expenseInfo}>
                  <View style={styles.expenseTopRow}>
                    <Text style={[styles.expenseCategory, { color: colors.muted }]}>
                      {expense.category_name || 'Sin categoría'}
                    </Text>
                    <Text style={[styles.expenseAmount, { color: expense.type === 'income' ? colors.success : colors.text }]}>
                      {expense.type === 'income' ? '+' : '-'}${Number(expense.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>
                    {expense.description || 'Sin descripción'}
                  </Text>
                  <Text style={[styles.expenseDate, { color: colors.muted }]}>
                    {new Date(expense.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
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
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginTop: 16, marginBottom: 8, padding: 12, borderRadius: 14, borderWidth: 1,
  },
  monthArrow: { padding: 8 },
  arrow: { fontSize: 32, fontWeight: '300' },
  monthCenter: { flex: 1, alignItems: 'center', backgroundColor: 'transparent' },
  monthText: { fontSize: 17, fontWeight: '600', textTransform: 'capitalize' },
  totalText: { fontSize: 12, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginBottom: 8, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  clearBtn: { fontSize: 18, paddingLeft: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyCard: { borderRadius: 14, padding: 40, borderWidth: 1, alignItems: 'center', marginTop: 16 },
  emptyText: { fontSize: 16 },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, backgroundColor: 'transparent' },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  typeIconText: { fontSize: 18 },
  expenseInfo: { flex: 1, backgroundColor: 'transparent', minWidth: 0 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', gap: 8 },
  expenseCategory: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  expenseAmount: { fontSize: 15, fontWeight: '700', flexShrink: 0, textAlign: 'right' },
  expenseDesc: { fontSize: 14, marginTop: 1 },
  expenseDate: { fontSize: 11, marginTop: 1 },
});
