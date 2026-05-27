import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, MonthlyBudget } from '@/lib/database';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await db.getBudget(monthStart);
      if (data) {
        setBudget(data);
        setBudgetAmount(String(Number(data.amount)));
      }
    } catch {
      // No budget yet
    } finally {
      setLoading(false);
    }
  }

  async function saveBudget() {
    const num = parseFloat(budgetAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      await db.setBudget(num, monthStart);
      Alert.alert('✅ Listo', 'Presupuesto guardado');
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>💰</Text>
        </View>
        <Text style={[styles.email, { color: colors.text }]}>Control de Gastos</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>App local - tus datos están en este dispositivo</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Presupuesto Mensual
        </Text>
        <Text style={[styles.label, { color: colors.muted }]}>
          Define cuánto planeas gastar este mes
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="$0.00"
          placeholderTextColor={colors.muted}
          value={budgetAmount}
          onChangeText={(t) => setBudgetAmount(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: saving ? 0.7 : 1 }]}
          onPress={saveBudget}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar Presupuesto</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0891b2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  email: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  label: { fontSize: 13, marginBottom: 12 },
  input: { width: '100%', height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 18, borderWidth: 1, textAlign: 'center', marginBottom: 12 },
  button: { width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
