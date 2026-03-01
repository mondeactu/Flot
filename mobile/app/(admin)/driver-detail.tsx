import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

interface DriverProfile {
  id: string;
  full_name: string;
  phone: string | null;
}

interface FillRow {
  id: string;
  price_ttc: number;
  km_at_fill: number;
  filled_at: string;
  vehicle: { plate: string } | null;
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [fills, setFills] = useState<FillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDriver();
    fetchFills();
  }, [id]);

  const fetchDriver = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Erreur', 'Conducteur introuvable');
      return;
    }
    setDriver(data as DriverProfile);
    setLoading(false);
  };

  const fetchFills = async () => {
    const { data } = await supabase
      .from('fuel_fills')
      .select('id, price_ttc, km_at_fill, filled_at, vehicle:vehicles!vehicle_id(plate)')
      .eq('driver_id', id)
      .order('filled_at', { ascending: false })
      .limit(20);
    setFills((data as unknown as FillRow[]) ?? []);
  };

  const saveDriver = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: driver.full_name, phone: driver.phone })
        .eq('id', driver.id);
      if (error) throw error;
      Alert.alert('Succes', 'Conducteur mis a jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !driver) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{driver.full_name}</Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput style={styles.input} value={driver.full_name} onChangeText={(t) => setDriver({ ...driver, full_name: t })} />
        </View>

        <View style={styles.fieldLast}>
          <Text style={styles.label}>Telephone</Text>
          <TextInput style={styles.input} value={driver.phone ?? ''} onChangeText={(t) => setDriver({ ...driver, phone: t })} keyboardType="phone-pad" />
        </View>
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.5 }]} onPress={saveDriver} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.inkOnDark} /> : <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Derniers pleins</Text>
      {fills.length === 0 ? (
        <Text style={styles.emptyText}>Aucun plein</Text>
      ) : (
        fills.map((f) => (
          <View key={f.id} style={styles.fillCard}>
            <View style={styles.fillHeader}>
              <Text style={styles.fillPrice}>{Number(f.price_ttc).toFixed(2)} EUR</Text>
              <Text style={styles.fillDate}>{new Date(f.filled_at).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.fillDetail}>
              {f.km_at_fill.toLocaleString('fr-FR')} km -- {(f.vehicle as unknown as { plate: string })?.plate ?? '--'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 50, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h1, color: colors.ink, marginBottom: spacing.lg },
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
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  saveText: { color: colors.inkOnDark, fontSize: 16, fontWeight: '700' },
  sectionTitle: { ...typography.h3, color: colors.ink, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.inkMuted, textAlign: 'center' },
  fillCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    ...shadows.card,
  },
  fillHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  fillPrice: { fontSize: 16, fontWeight: '700', color: colors.ink },
  fillDate: { ...typography.caption, color: colors.inkSecondary },
  fillDetail: { ...typography.caption, color: colors.inkSecondary, marginTop: spacing.xs },
});
