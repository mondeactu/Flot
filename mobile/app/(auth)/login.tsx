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
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

type LoginMode = 'driver' | 'admin';

// Auto-format plate: AB-123-CD (XX-XXX-XX)
function formatPlate(raw: string): string {
  // Remove everything that's not alphanumeric
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let result = '';
  for (let i = 0; i < clean.length && i < 7; i++) {
    // Add dashes after position 2 and 5
    if (i === 2 || i === 5) {
      result += '-';
    }
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
          <Text style={styles.logoEmoji}>🚛</Text>
          <Text style={styles.logoText}>Flot</Text>
          <Text style={styles.subtitle}>Gestion de flotte</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'driver' && styles.toggleActive]}
            onPress={() => { setMode('driver'); clearError(); }}
            accessibilityLabel="Mode conducteur"
          >
            <Text style={[styles.toggleText, mode === 'driver' && styles.toggleTextActive]}>
              🚛 Conducteur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'admin' && styles.toggleActive]}
            onPress={() => { setMode('admin'); clearError(); }}
            accessibilityLabel="Mode administrateur"
          >
            <Text style={[styles.toggleText, mode === 'admin' && styles.toggleTextActive]}>
              👤 Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form} key={mode}>
          {mode === 'driver' ? (
            <View>
              <Text style={styles.label}>Plaque d'immatriculation</Text>
              <TextInput
                key="plate-input"
                style={styles.plateInput}
                value={plate}
                onChangeText={handlePlateChange}
                placeholder="AA-123-BB"
                placeholderTextColor="#bbb"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={9}
                accessibilityLabel="Plaque d'immatriculation"
              />
              {plate.length > 0 && plate.length < 9 && (
                <Text style={styles.plateHint}>Saisissez votre plaque complète</Text>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                key="email-input"
                style={styles.input}
                value={email}
                onChangeText={(t) => { clearError(); setEmail(t); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="votre@email.com"
                placeholderTextColor="#999"
                accessibilityLabel="Adresse email"
                editable={true}
              />

              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                key="password-input"
                style={styles.input}
                value={password}
                onChangeText={(t) => { clearError(); setPassword(t); }}
                secureTextEntry
                placeholder="Votre mot de passe"
                placeholderTextColor="#999"
                accessibilityLabel="Mot de passe"
                editable={true}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, (!canSubmit || loading) && styles.loginDisabled]}
            onPress={handleLogin}
            disabled={loading || !canSubmit}
            accessibilityLabel="Se connecter"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>
                {mode === 'driver' ? 'Accéder à mon véhicule' : 'Se connecter'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  toggleTextActive: {
    color: '#2E7D32',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  plateInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '800',
    color: '#2E7D32',
    textAlign: 'center',
    letterSpacing: 3,
  },
  plateHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  loginDisabled: {
    opacity: 0.5,
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
