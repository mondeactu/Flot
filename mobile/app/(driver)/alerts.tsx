import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';

interface AlertItem {
  id: string;
  type: string;
  message: string;
  triggered_at: string;
  acknowledged: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  ct_expiry: '📋',
  maintenance_due: '🔧',
  high_consumption: '⛽',
  no_fill: '⛽',
  document_expiry: '📄',
  custom_reminder: '📌',
  replacement_ending: '🔄',
  monthly_report: '📊',
  incident: '🚨',
};

export default function DriverAlertsScreen() {
  const { vehicle } = useAuthStore();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    if (!vehicle?.id) return;

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, type, message, triggered_at, acknowledged')
        .eq('vehicle_id', vehicle.id)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data ?? []);
    } catch (err) {
      console.error('Erreur chargement alertes :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [vehicle?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAlert = ({ item }: { item: AlertItem }) => (
    <View style={[styles.alertCard, item.acknowledged && styles.alertAcknowledged]}>
      <Text style={styles.alertIcon}>{TYPE_ICONS[item.type] ?? '⚠️'}</Text>
      <View style={styles.alertContent}>
        <Text style={styles.alertMessage}>{item.message}</Text>
        <Text style={styles.alertDate}>{formatDate(item.triggered_at)}</Text>
      </View>
      {!item.acknowledged && <View style={styles.dot} />}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes alertes</Text>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune alerte</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#333', padding: 16, paddingBottom: 8 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertAcknowledged: {
    opacity: 0.6,
    borderLeftColor: '#E0E0E0',
  },
  alertIcon: { fontSize: 24, marginRight: 12 },
  alertContent: { flex: 1 },
  alertMessage: { fontSize: 14, color: '#333', fontWeight: '500' },
  alertDate: { fontSize: 12, color: '#888', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
});
