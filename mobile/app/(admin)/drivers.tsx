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

interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_plate: string | null;
}

export default function DriversListScreen() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchDrivers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'driver')
        .order('full_name');

      if (error) throw error;

      const driverRows: DriverRow[] = [];
      for (const p of profiles ?? []) {
        const { data: v } = await supabase
          .from('vehicles')
          .select('plate')
          .eq('driver_id', p.id)
          .limit(1)
          .single();

        driverRows.push({
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          vehicle_plate: v?.plate ?? null,
        });
      }

      setDrivers(driverRows);
    } catch (err) {
      console.error('Erreur chargement conducteurs :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const renderDriver = ({ item }: { item: DriverRow }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(admin)/driver-detail', params: { id: item.id } })}
      accessibilityLabel={`Conducteur ${item.full_name}`}
    >
      <Text style={styles.name}>{item.full_name}</Text>
      <Text style={styles.info}>{item.phone ?? '--'}</Text>
      <Text style={styles.info}>{item.vehicle_plate ?? 'Non assigne'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conducteurs ({drivers.length})</Text>
      <FlatList
        data={drivers}
        renderItem={renderDriver}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDrivers(); }} tintColor={colors.brand} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Aucun conducteur</Text></View>}
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
  name: { fontSize: 16, fontWeight: '700', color: colors.ink },
  info: { ...typography.caption, color: colors.inkSecondary, marginTop: spacing.xs },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.inkMuted },
});
