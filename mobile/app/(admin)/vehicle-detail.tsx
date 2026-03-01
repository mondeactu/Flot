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
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AlertThresholdSheet from '../../components/AlertThresholdSheet';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

interface Vehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  notes: string | null;
  next_inspection_date: string | null;
  next_maintenance_date: string | null;
  next_maintenance_km: number | null;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
  driver_id: string | null;
}

interface FuelFill {
  id: string;
  price_ttc: number;
  liters: number | null;
  km_at_fill: number;
  station_name: string | null;
  filled_at: string;
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'fills' | 'incidents'>('resume');
  const [thresholdSheet, setThresholdSheet] = useState<{
    visible: boolean;
    title: string;
    field: string;
    currentValue: number | null;
    unit: string;
  }>({ visible: false, title: '', field: '', currentValue: null, unit: '' });

  useEffect(() => {
    if (!id) return;
    fetchVehicle();
    fetchFills();
  }, [id]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, year, notes, next_inspection_date, next_maintenance_date, next_maintenance_km, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days, driver_id')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Erreur', 'Vehicule introuvable');
      return;
    }
    setVehicle(data as Vehicle);
    setLoading(false);
  };

  const fetchFills = async () => {
    const { data } = await supabase
      .from('fuel_fills')
      .select('id, price_ttc, liters, km_at_fill, station_name, filled_at')
      .eq('vehicle_id', id)
      .order('filled_at', { ascending: false })
      .limit(20);
    setFills(data ?? []);
  };

  const saveVehicle = async () => {
    if (!vehicle) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          notes: vehicle.notes,
          next_inspection_date: vehicle.next_inspection_date,
          next_maintenance_date: vehicle.next_maintenance_date,
          next_maintenance_km: vehicle.next_maintenance_km,
        })
        .eq('id', vehicle.id);

      if (error) throw error;
      Alert.alert('Succes', 'Vehicule mis a jour');
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  const saveThreshold = async (value: number) => {
    if (!vehicle) return;
    const update = { [thresholdSheet.field]: value };
    const { error } = await supabase.from('vehicles').update(update).eq('id', vehicle.id);
    if (error) throw error;
    setVehicle({ ...vehicle, [thresholdSheet.field]: value });
  };

  const openThreshold = (title: string, field: string, unit: string) => {
    setThresholdSheet({
      visible: true,
      title,
      field,
      currentValue: vehicle ? (vehicle as Record<string, unknown>)[field] as number : null,
      unit,
    });
  };

  if (loading || !vehicle) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  const tabs = [
    { key: 'resume', label: 'Resume' },
    { key: 'fills', label: 'Pleins' },
    { key: 'incidents', label: 'Incidents' },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vehicle.plate}</Text>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'resume' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Marque</Text>
              <TextInput style={styles.input} value={vehicle.brand ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, brand: t })} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Modele</Text>
              <TextInput style={styles.input} value={vehicle.model ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, model: t })} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Annee</Text>
              <TextInput style={styles.input} value={vehicle.year?.toString() ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, year: parseInt(t) || null })} keyboardType="number-pad" />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Prochain CT</Text>
                <TextInput style={styles.input} value={vehicle.next_inspection_date ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, next_inspection_date: t })} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.inkFaint} />
              </View>
              <TouchableOpacity style={styles.thresholdBtn} onPress={() => openThreshold('CT', 'alert_inspection_days_before', 'jours')}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Prochain entretien (date)</Text>
                <TextInput style={styles.input} value={vehicle.next_maintenance_date ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, next_maintenance_date: t })} placeholder="AAAA-MM-JJ" placeholderTextColor={colors.inkFaint} />
              </View>
              <TouchableOpacity style={styles.thresholdBtn} onPress={() => openThreshold('Entretien (jours)', 'alert_maintenance_days_before', 'jours')}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldFlex}>
                <Text style={styles.label}>Prochain entretien (km)</Text>
                <TextInput style={styles.input} value={vehicle.next_maintenance_km?.toString() ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, next_maintenance_km: parseInt(t) || null })} keyboardType="number-pad" />
              </View>
              <TouchableOpacity style={styles.thresholdBtn} onPress={() => openThreshold('Entretien (km)', 'alert_maintenance_km_before', 'km')}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} value={vehicle.notes ?? ''} onChangeText={(t) => setVehicle({ ...vehicle, notes: t })} multiline />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.5 }]} onPress={saveVehicle} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.inkOnDark} /> : <Text style={styles.saveText}>Enregistrer</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'fills' && (
        <ScrollView contentContainerStyle={styles.content}>
          {fills.length === 0 ? (
            <Text style={styles.emptyText}>Aucun plein enregistre</Text>
          ) : (
            fills.map((f) => (
              <View key={f.id} style={styles.fillCard}>
                <View style={styles.fillHeader}>
                  <Text style={styles.fillPrice}>{Number(f.price_ttc).toFixed(2)} EUR</Text>
                  <Text style={styles.fillDate}>{new Date(f.filled_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.fillDetail}>{f.km_at_fill.toLocaleString('fr-FR')} km -- {f.liters ? `${Number(f.liters).toFixed(1)} L` : '--'} -- {f.station_name ?? '--'}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'incidents' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emptyText}>Voir le detail des incidents sur le panel admin web.</Text>
        </ScrollView>
      )}

      <AlertThresholdSheet
        visible={thresholdSheet.visible}
        onClose={() => setThresholdSheet({ ...thresholdSheet, visible: false })}
        onSave={saveThreshold}
        title={thresholdSheet.title}
        currentValue={thresholdSheet.currentValue}
        unit={thresholdSheet.unit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h1, color: colors.ink, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  activeTab: { backgroundColor: colors.brand },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.inkSecondary },
  activeTabText: { color: colors.inkOnDark },
  content: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  field: { marginBottom: spacing.lg },
  fieldLast: { marginBottom: 0 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.lg, gap: spacing.sm },
  fieldFlex: { flex: 1 },
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
  thresholdBtn: {
    padding: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
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
  emptyText: { ...typography.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
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
