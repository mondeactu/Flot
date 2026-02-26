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
      Alert.alert('✅', 'Conducteur mis à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !driver) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{driver.full_name}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Nom complet</Text>
        <TextInput style={styles.input} value={driver.full_name} onChangeText={(t) => setDriver({ ...driver, full_name: t })} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Téléphone</Text>
        <TextInput style={styles.input} value={driver.phone ?? ''} onChangeText={(t) => setDriver({ ...driver, phone: t })} keyboardType="phone-pad" />
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.5 }]} onPress={saveDriver} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Enregistrer</Text>}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Derniers pleins</Text>
      {fills.length === 0 ? (
        <Text style={styles.emptyText}>Aucun plein</Text>
      ) : (
        fills.map((f) => (
          <View key={f.id} style={styles.fillCard}>
            <View style={styles.fillHeader}>
              <Text style={styles.fillPrice}>{Number(f.price_ttc).toFixed(2)} €</Text>
              <Text style={styles.fillDate}>{new Date(f.filled_at).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.fillDetail}>
              {f.km_at_fill.toLocaleString('fr-FR')} km — {(f.vehicle as unknown as { plate: string })?.plate ?? '—'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#2E7D32', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#333' },
  saveButton: { backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center' },
  fillCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2E7D32' },
  fillHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  fillPrice: { fontSize: 16, fontWeight: '700', color: '#333' },
  fillDate: { fontSize: 13, color: '#888' },
  fillDetail: { fontSize: 13, color: '#666', marginTop: 4 },
});
