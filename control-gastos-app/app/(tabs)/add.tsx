import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, Category, Expense } from '@/lib/database';

const categoryIcons: Record<string, string> = {
  cart: '🛒', bus: '🚌', house: '🏠', bolt: '⚡', heart: '❤️',
  gamepad: '🎮', tag: '🏷️', book: '📚', bank: '🏦', more: '📌',
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AddExpenseScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    db.getCategories().then((data) => {
      setCategories(data);
      setLoadingCategories(false);
    });
    if (editId) {
      loadExpense(Number(editId));
    }
  }, []);

  async function loadExpense(id: number) {
    const all = await db.getAllExpenses();
    const expense = all.find((e) => e.id === id);
    if (!expense) return;
    setType(expense.type);
    setAmount(String(Number(expense.amount)));
    setDescription(expense.description ?? '');
    setDate(new Date(expense.date + 'T12:00:00'));
    if (expense.category_id) {
      const cat = categories.find((c) => c.id === expense.category_id);
      if (cat) setSelectedCategory(cat);
    }
  }

  function changeDay(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  }

  function changeMonth(delta: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + delta);
    setDate(d);
  }

  async function handleSubmit() {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editId) {
        await db.updateExpense(Number(editId), {
          type,
          amount: numAmount,
          description: description.trim() || null,
          category_id: selectedCategory?.id ?? null,
          date: formatDate(date),
        });
        Alert.alert('✅ Listo', 'Actualizado correctamente', [
          { text: 'Ok', onPress: () => router.back() },
        ]);
      } else {
        await db.addExpense({
          type,
          amount: numAmount,
          description: description.trim() || null,
          category_id: selectedCategory?.id ?? null,
          date: formatDate(date),
        });
        Alert.alert('✅ Listo', 'Registrado correctamente', [
          { text: 'Ok', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: colors.error + '20' }]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? colors.error : colors.muted }]}>
                💸 Gasto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: colors.success + '20' }]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? colors.success : colors.muted }]}>
                💰 Ingreso
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>Monto</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="$0.00"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              autoFocus={!isEditing}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>Fecha</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => changeDay(-1)} style={styles.dateArrow}>
                <Text style={[styles.dateArrowText, { color: colors.tint }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.dateText, { color: colors.text }]}>{formatDisplay(formatDate(date))}</Text>
              <TouchableOpacity onPress={() => changeDay(1)} style={styles.dateArrow}>
                <Text style={[styles.dateArrowText, { color: colors.tint }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateSubRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={[styles.dateSubText, { color: colors.muted }]}>‹ Mes ant.</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDate(new Date())}>
                <Text style={[styles.dateSubText, { color: colors.tint }]}>Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={[styles.dateSubText, { color: colors.muted }]}>Sig. mes ›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }, { marginBottom: 12 }]}>
              Categoría
            </Text>
            {loadingCategories ? (
              <ActivityIndicator color={colors.tint} />
            ) : (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const selected = selectedCategory?.id === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryItem,
                        {
                          backgroundColor: selected && cat.color ? cat.color + '20' : colors.inputBg,
                          borderColor: selected && cat.color ? cat.color : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedCategory(selected ? null : cat)}
                    >
                      <Text style={styles.categoryIcon}>
                        {cat.icon ? categoryIcons[cat.icon] || '📌' : '📌'}
                      </Text>
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: selected ? cat.color ?? colors.tint : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.muted }]}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={type === 'expense' ? '¿En qué gastaste?' : '¿De qué fue el ingreso?'}
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: type === 'expense' ? colors.error : colors.success, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? 'Guardar Cambios' : type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  amountInput: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', paddingVertical: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: 'transparent' },
  categoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    flexGrow: 1,
  },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, minHeight: 48 },
  submitButton: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 16, padding: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
  },
  toggleText: { fontSize: 15, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    backgroundColor: 'transparent',
  },
  dateArrow: { padding: 8 },
  dateArrowText: { fontSize: 28, fontWeight: '300' },
  dateText: { fontSize: 17, fontWeight: '600', minWidth: 200, textAlign: 'center' },
  dateSubRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 8,
    backgroundColor: 'transparent',
  },
  dateSubText: { fontSize: 13, fontWeight: '500' },
});
