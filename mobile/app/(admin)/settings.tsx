import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

interface AlertSettings {
  id: string;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
}

export default function AdminSettingsScreen() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('alert_settings')
      .select('id, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days')
      .limit(1)
      .single();

    if (error) {
      console.error('Erreur paramètres :', error);
    } else {
      setSettings(data as AlertSettings);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('alert_settings')
        .update({
          alert_inspection_days_before: settings.alert_inspection_days_before,
          alert_maintenance_days_before: settings.alert_maintenance_days_before,
          alert_maintenance_km_before: settings.alert_maintenance_km_before,
          fuel_alert_threshold_l100: settings.fuel_alert_threshold_l100,
          no_fill_alert_days: settings.no_fill_alert_days,
        })
        .eq('id', settings.id);

      if (error) throw error;
      Alert.alert('Succes', 'Parametres sauvegardes');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const applyToAllVehicles = async () => {
    setApplying(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await supabase.functions.invoke('admin-actions', {
        body: { action: 'apply_global_settings' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.error) throw res.error;
      Alert.alert('Succes', 'Seuils appliques a tous les vehicules');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'appliquer les seuils');
    } finally {
      setApplying(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Parametres</Text>

      <Text style={styles.sectionTitle}>Seuils d'alerte globaux</Text>

      {settings && (
        <>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>CT : alerter J-X avant expiration (jours)</Text>
              <TextInput
                style={styles.input}
                value={settings.alert_inspection_days_before.toString()}
                onChangeText={(t) => setSettings({ ...settings, alert_inspection_days_before: parseInt(t) || 0 })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Entretien : alerter J-X avant date (jours)</Text>
              <TextInput
                style={styles.input}
                value={settings.alert_maintenance_days_before.toString()}
                onChangeText={(t) => setSettings({ ...settings, alert_maintenance_days_before: parseInt(t) || 0 })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Entretien : alerter KM-X avant kilometrage</Text>
              <TextInput
                style={styles.input}
                value={settings.alert_maintenance_km_before.toString()}
                onChangeText={(t) => setSettings({ ...settings, alert_maintenance_km_before: parseInt(t) || 0 })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Consommation : alerter si &gt; X L/100km</Text>
              <TextInput
                style={styles.input}
                value={settings.fuel_alert_threshold_l100.toString()}
                onChangeText={(t) => setSettings({ ...settings, fuel_alert_threshold_l100: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Sans plein : alerter apres X jours</Text>
              <TextInput
                style={styles.input}
                value={settings.no_fill_alert_days.toString()}
                onChangeText={(t) => setSettings({ ...settings, no_fill_alert_days: parseInt(t) || 0 })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.5 }]} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.inkOnDark} /> : <Text style={styles.saveText}>Sauvegarder les seuils</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.applyButton, applying && { opacity: 0.5 }]} onPress={applyToAllVehicles} disabled={applying}>
            {applying ? <ActivityIndicator color={colors.inkOnDark} /> : <Text style={styles.applyText}>Appliquer a tous les vehicules</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se deconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Flot v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 50, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h1, color: colors.ink, marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.md, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  field: { marginBottom: spacing.lg },
  fieldLast: { marginBottom: 0 },
  label: { ...typography.caption, color: colors.inkSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.ink,
  },
  saveButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  saveText: { color: colors.inkOnDark, fontSize: 16, fontWeight: '700' },
  applyButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.card,
  },
  applyText: { color: colors.inkOnDark, fontSize: 16, fontWeight: '700' },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xxxl,
    ...shadows.card,
  },
  logoutText: { color: colors.inkOnDark, fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.lg, ...typography.caption },
});
