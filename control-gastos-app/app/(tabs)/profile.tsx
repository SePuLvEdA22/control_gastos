import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, MonthlyBudget, toLocalMonth, formatAmountInput } from '@/lib/database';
import { useExpenseStore } from '@/store/useExpenseStore';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalMonths, setTotalMonths] = useState(0);

  const monthStart = `${toLocalMonth(new Date())}-01`;
  const { saveBudget } = useExpenseStore();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const [budgetData, allExpenses, categories] = await Promise.all([
        db.getBudget(monthStart),
        db.getAllExpenses(),
        db.getCategories(),
      ]);
      if (budgetData) {
        setBudget(budgetData);
        setBudgetAmount(formatAmountInput(String(Number(budgetData.amount))));
      }
      setTotalExpenses(allExpenses.length);
      setTotalCategories(categories.length);
      const months = new Set(allExpenses.map((e) => e.date.slice(0, 7)));
      setTotalMonths(months.size);
    } catch {
      // No budget yet
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBudget() {
    const num = parseFloat(budgetAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      await saveBudget(num, monthStart);
      Alert.alert('✅ Listo', 'Presupuesto guardado');
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    const existing = await SecureStore.getItemAsync('app_pin');
    if (existing) {
      Alert.alert('Protección', '¿Quitar el bloqueo con PIN?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: async () => {
          await SecureStore.deleteItemAsync('app_pin');
          await SecureStore.deleteItemAsync('biometric_enabled');
          Alert.alert('Listo', 'Protección eliminada');
        }},
      ]);
    } else {
      router.push('/lock');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
          <Text style={[styles.headerIcon]}>💰</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Control de Gastos</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>Tus datos están seguros en este dispositivo</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: 'transparent', marginBottom: 16 }]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.tint }]}>{totalExpenses}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Gastos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{totalCategories}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Categorías</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>{totalMonths}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Meses</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Presupuesto Mensual</Text>
          <Text style={[styles.label, { color: colors.muted }]}>
            Define cuánto planeas gastar este mes
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="$0"
            placeholderTextColor={colors.muted}
            value={budgetAmount}
            onChangeText={(t) => setBudgetAmount(formatAmountInput(t))}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.tint, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSaveBudget}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.cardRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleLock}
        >
          <View style={[styles.cardRowLeft, { backgroundColor: 'transparent' }]}>
            <Text style={styles.cardRowIcon}>🔒</Text>
            <View style={{ backgroundColor: 'transparent' }}>
              <Text style={[styles.cardRowTitle, { color: colors.text }]}>Protección</Text>
              <Text style={[styles.cardRowSub, { color: colors.muted }]}>PIN y huella digital</Text>
            </View>
          </View>
          <Text style={[styles.cardRowArrow, { color: colors.muted }]}>›</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>ℹ️ Acerca de</Text>
          <View style={[styles.aboutRow, { borderBottomColor: colors.border, backgroundColor: 'transparent' }]}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>Versión</Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomColor: colors.border, backgroundColor: 'transparent' }]}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>Framework</Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>Expo (React Native)</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomColor: colors.border, borderBottomWidth: 0, backgroundColor: 'transparent' }]}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>Almacenamiento</Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>Solo en este dispositivo</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16 },
  headerCard: {
    borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 16,
    alignItems: 'center',
  },
  headerIcon: { fontSize: 36, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  label: { fontSize: 13, marginBottom: 12 },
  input: {
    width: '100%', height: 48, borderRadius: 12, paddingHorizontal: 16,
    fontSize: 18, borderWidth: 1, textAlign: 'center', marginBottom: 12,
  },
  button: { width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardRowIcon: { fontSize: 22 },
  cardRowTitle: { fontSize: 16, fontWeight: '600' },
  cardRowSub: { fontSize: 13, marginTop: 1 },
  cardRowArrow: { fontSize: 24, fontWeight: '300' },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },
});
