import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const PIN_KEY = 'app_pin';
const BIOMETRIC_ENABLED = 'biometric_enabled';

export default function LockScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPin();
  }, []);

  async function checkPin() {
    const existing = await SecureStore.getItemAsync(PIN_KEY);
    setStoredPin(existing);

      if (existing) {
        const bio = await SecureStore.getItemAsync(BIOMETRIC_ENABLED);
        if (bio === 'true') {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          if (compatible) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Desbloquear Control de Gastos',
            });
            if (result.success) {
              router.replace('/(tabs)');
              return;
            }
            Alert.alert('Biometría no disponible', 'Usa tu PIN para desbloquear');
          }
        }
      }
    setLoading(false);
  }

  async function handlePinSubmit() {
    if (!storedPin) {
      if (!isSettingPin) {
        setIsSettingPin(true);
        setPin('');
        return;
      }
      if (!confirmPin) {
        setConfirmPin(pin);
        setPin('');
        return;
      }
      if (pin !== confirmPin) {
        Alert.alert('Error', 'Los PIN no coinciden');
        setPin('');
        setConfirmPin('');
        setIsSettingPin(false);
        return;
      }
      await SecureStore.setItemAsync(PIN_KEY, pin);
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED, 'true');
      }
      router.replace('/(tabs)');
      return;
    }

    if (pin === storedPin) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', 'PIN incorrecto');
      setPin('');
    }
  }

  if (loading) return null;

  const isConfirming = isSettingPin && !!confirmPin;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {!storedPin
            ? isConfirming
              ? 'Confirma tu PIN'
              : isSettingPin
                ? 'Crea un PIN de seguridad'
                : 'Bienvenido'
            : 'Desbloquear'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {!storedPin
            ? isConfirming
              ? 'Repite el PIN'
              : isSettingPin
                ? 'Ingresa un PIN de 4 dígitos'
                : 'Configura un PIN para proteger tu app'
            : 'Ingresa tu PIN'}
        </Text>

        <TextInput
          style={[styles.pinInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={pin}
          onChangeText={(t) => {
            const digits = t.replace(/[^0-9]/g, '').slice(0, 4);
            setPin(digits);
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint, opacity: pin.length === 4 ? 1 : 0.5 }]}
          onPress={handlePinSubmit}
          disabled={pin.length !== 4}
        >
          <Text style={styles.buttonText}>
            {!storedPin ? (isConfirming ? 'Confirmar' : isSettingPin ? 'Siguiente' : 'Comenzar') : 'Desbloquear'}
          </Text>
        </TouchableOpacity>

        {!storedPin && !isSettingPin && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Saltar, no proteger</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  content: { alignItems: 'center' },
  lockIcon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32, textAlign: 'center' },
  pinInput: {
    width: 160, height: 56, borderRadius: 14, borderWidth: 1,
    fontSize: 28, fontWeight: 'bold', textAlign: 'center', letterSpacing: 12,
    marginBottom: 24,
  },
  button: { width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  skipBtn: { marginTop: 20, padding: 8 },
  skipText: { fontSize: 14 },
});
