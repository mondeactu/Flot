import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

interface AlertItem {
  id: string;
  type: string;
  message: string;
  triggered_at: string;
  acknowledged: boolean;
}

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  ct_expiry: 'clipboard',
  maintenance_due: 'tool',
  high_consumption: 'droplet',
  no_fill: 'droplet',
  document_expiry: 'file',
  custom_reminder: 'bookmark',
  replacement_ending: 'refresh-cw',
  monthly_report: 'bar-chart-2',
  incident: 'alert-octagon',
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

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const iconName = TYPE_ICONS[item.type] ?? 'alert-triangle';
    return (
      <View style={[styles.alertCard, item.acknowledged && styles.alertAcknowledged]}>
        <View style={[styles.iconContainer, item.acknowledged && styles.iconContainerAcknowledged]}>
          <Feather name={iconName} size={20} color={item.acknowledged ? colors.inkMuted : colors.warning} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={styles.alertDate}>{formatDate(item.triggered_at)}</Text>
        </View>
        {!item.acknowledged && <View style={styles.dot} />}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
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
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.ink, padding: spacing.lg, paddingBottom: spacing.sm },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.card,
  },
  alertAcknowledged: {
    opacity: 0.6,
    borderLeftColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerAcknowledged: {
    backgroundColor: colors.borderLight,
  },
  alertContent: { flex: 1 },
  alertMessage: { ...typography.bodyMedium, color: colors.ink },
  alertDate: { ...typography.caption, color: colors.inkSecondary, marginTop: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.inkMuted },
});
