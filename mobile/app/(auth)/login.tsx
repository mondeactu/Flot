import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { colors, radius, spacing } from '../../constants/theme';

type LoginMode = 'driver' | 'admin';

function formatPlate(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let result = '';
  for (let i = 0; i < clean.length && i < 7; i++) {
    if (i === 2 || i === 5) result += '-';
    result += clean[i];
  }
  return result;
}

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('driver');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plate, setPlate] = useState('');
  const { login, loginByPlate, loading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handlePlateChange = useCallback((text: string) => {
    clearError();
    setPlate(formatPlate(text));
  }, [clearError]);

  const handleLogin = async () => {
    clearError();
    try {
      if (mode === 'admin') {
        await login(email, password);
      } else {
        await loginByPlate(plate);
      }
      const profile = useAuthStore.getState().profile;
      if (profile?.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(driver)');
      }
    } catch {
      // Error already in store
    }
  };

  const isPlateValid = /^[A-Z]{2}-[A-Z0-9]{3}-[A-Z]{2}$/.test(plate);
  const canSubmit = mode === 'admin' ? (!!email && !!password) : isPlateValid;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="truck" size={28} color="#fff" />
          </View>
          <Text style={styles.logoText}>Flot</Text>
          <Text style={styles.subtitle}>Gestion de flotte Saveurs et Vie</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'driver' && styles.toggleActive]}
            onPress={() => { setMode('driver'); clearError(); }}
            activeOpacity={0.7}
          >
            <Feather name="truck" size={14} color={mode === 'driver' ? colors.brand : colors.inkMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>Conducteur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'admin' && styles.toggleActive]}
            onPress={() => { setMode('admin'); clearError(); }}
            activeOpacity={0.7}
          >
            <Feather name="shield" size={14} color={mode === 'admin' ? colors.brand : colors.inkMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.toggleText, mode === 'admin' && styles.toggleTextActive]}>Admin</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form} key={mode}>
          {mode === 'driver' ? (
            <View>
              <Text style={styles.label}>PLAQUE D'IMMATRICULATION</Text>
              <TextInput
                key="plate-input"
                style={styles.plateInput}
                value={plate}
                onChangeText={handlePlateChange}
                placeholder="AA-123-BB"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={9}
              />
              {plate.length > 0 && plate.length < 9 && (
                <Text style={styles.plateHint}>Saisissez votre plaque complete</Text>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                key="email-input"
                style={styles.input}
                value={email}
                onChangeText={(t) => { clearError(); setEmail(t); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="votre@email.com"
                placeholderTextColor={colors.inkMuted}
                editable={true}
              />

              <Text style={[styles.label, { marginTop: spacing.lg }]}>MOT DE PASSE</Text>
              <TextInput
                key="password-input"
                style={styles.input}
                value={password}
                onChangeText={(t) => { clearError(); setPassword(t); }}
                secureTextEntry
                placeholder="Votre mot de passe"
                placeholderTextColor={colors.inkMuted}
                editable={true}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, (!canSubmit || loading) && styles.loginDisabled]}
            onPress={handleLogin}
            disabled={loading || !canSubmit}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.loginInner}>
                <Text style={styles.loginText}>
                  {mode === 'driver' ? 'Acceder a mon vehicule' : 'Se connecter'}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Flot v1.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgDarkHover,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: '#3A3C4E',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  toggleTextActive: {
    color: '#fff',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  form: {},
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.bgDarkHover,
    borderWidth: 1,
    borderColor: '#3A3C4E',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  plateInput: {
    backgroundColor: colors.bgDarkHover,
    borderWidth: 2,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 4,
  },
  plateHint: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 28,
  },
  loginDisabled: {
    opacity: 0.4,
  },
  loginInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: 'rgba(160, 164, 184, 0.3)',
    fontSize: 11,
    marginTop: 32,
  },
});
