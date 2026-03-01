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
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

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
    if (!dateStr) return colors.inkMuted;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return colors.error;
    if (diff < 30) return colors.warning;
    return colors.brand;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
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
      <Text style={styles.model}>{[item.brand, item.model].filter(Boolean).join(' ') || '--'}</Text>
      <Text style={styles.driver}>
        {(item.driver as unknown as { full_name: string })?.full_name ?? 'Non assigne'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicules ({vehicles.length})</Text>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVehicles(); }} tintColor={colors.brand} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aucun vehicule</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.ink, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: { ...typography.h3, color: colors.ink },
  ctBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  ctText: { color: colors.inkOnDark, fontSize: 11, fontWeight: '700' },
  model: { ...typography.body, color: colors.inkSecondary, marginTop: spacing.xs },
  driver: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.inkMuted },
});
