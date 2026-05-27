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
import { router } from 'expo-router';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { db, Category } from '@/lib/database';

const categoryIcons: Record<string, string> = {
  cart: '🛒',
  bus: '🚌',
  house: '🏠',
  bolt: '⚡',
  heart: '❤️',
  gamepad: '🎮',
  tag: '🏷️',
  book: '📚',
  bank: '🏦',
  more: '📌',
};

export default function AddExpenseScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    db.getCategories().then((data) => {
      setCategories(data);
      setLoadingCategories(false);
    });
  }, []);

  async function handleSubmit() {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      await db.addExpense({
        amount: numAmount,
        description: description.trim() || null,
        category_id: selectedCategory?.id ?? null,
        date: new Date().toISOString().slice(0, 10),
      });

      Alert.alert('✅ Listo', 'Gasto registrado correctamente', [
        { text: 'Ok', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar');
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Monto</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="$0.00"
            placeholderTextColor={colors.muted}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.,]/g, ''))}
            keyboardType="decimal-pad"
            autoFocus
          />
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
            placeholder="¿En qué gastaste?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Registrar Gasto</Text>
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
});
