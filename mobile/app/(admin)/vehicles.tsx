import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  next_inspection_date: string | null;
  driver: { full_name: string } | null;
}

export default function VehiclesListScreen() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchVehicles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model, next_inspection_date, driver:profiles!driver_id(full_name)')
        .order('plate');

      if (error) throw error;
      setVehicles((data as unknown as VehicleRow[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement véhicules :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const getCTColor = (dateStr: string | null) => {
    if (!dateStr) return '#999';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return '#D32F2F';
    if (diff < 30) return '#FF9800';
    return '#2E7D32';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const renderVehicle = ({ item }: { item: VehicleRow }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(admin)/vehicle-detail', params: { id: item.id } })}
      accessibilityLabel={`Véhicule ${item.plate}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.plate}>{item.plate}</Text>
        <View style={[styles.ctBadge, { backgroundColor: getCTColor(item.next_inspection_date) }]}>
          <Text style={styles.ctText}>CT {formatDate(item.next_inspection_date)}</Text>
        </View>
      </View>
      <Text style={styles.model}>{[item.brand, item.model].filter(Boolean).join(' ') || '—'}</Text>
      <Text style={styles.driver}>
        👤 {(item.driver as unknown as { full_name: string })?.full_name ?? 'Non assigné'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Véhicules ({vehicles.length})</Text>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVehicles(); }} tintColor="#2E7D32" />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aucun véhicule</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', paddingHorizontal: 16, marginBottom: 12 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: { fontSize: 18, fontWeight: '800', color: '#333' },
  ctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ctText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  model: { fontSize: 14, color: '#666', marginTop: 4 },
  driver: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
});
