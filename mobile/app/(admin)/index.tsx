import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius, typography, shadows } from '../../constants/theme';

interface KPIs {
  vehicleCount: number;
  alertCount: number;
  fuelCostMonth: number;
  totalCostMonth: number;
}

interface AlertItem {
  id: string;
  type: string;
  message: string;
  triggered_at: string;
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

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs>({ vehicleCount: 0, alertCount: 0, fuelCostMonth: 0, totalCostMonth: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const [vehiclesRes, alertsRes, fuelRes, alertListRes] = await Promise.all([
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('fuel_fills').select('price_ttc').gte('filled_at', startOfMonth),
        supabase.from('alerts').select('id, type, message, triggered_at').eq('acknowledged', false).order('triggered_at', { ascending: false }).limit(5),
      ]);

      const fuelTotal = (fuelRes.data ?? []).reduce((s, f) => s + Number(f.price_ttc), 0);

      setKpis({
        vehicleCount: vehiclesRes.count ?? 0,
        alertCount: alertsRes.count ?? 0,
        fuelCostMonth: fuelTotal,
        totalCostMonth: fuelTotal,
      });
      setAlerts(alertListRes.data ?? []);
    } catch (err) {
      console.error('Erreur dashboard :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const acknowledgeAlert = async (alertId: string) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setKpis((prev) => ({ ...prev, alertCount: Math.max(0, prev.alertCount - 1) }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Tableau de bord</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.vehicleCount}</Text>
          <Text style={styles.kpiLabel}>Vehicules actifs</Text>
        </View>
        <View style={[styles.kpiCard, kpis.alertCount > 0 && styles.kpiAlert]}>
          <Text style={[styles.kpiValue, kpis.alertCount > 0 && { color: colors.error }]}>{kpis.alertCount}</Text>
          <Text style={styles.kpiLabel}>Alertes</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatCurrency(kpis.fuelCostMonth)}</Text>
          <Text style={styles.kpiLabel}>Carburant ce mois</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatCurrency(kpis.totalCostMonth)}</Text>
          <Text style={styles.kpiLabel}>Cout total</Text>
        </View>
      </View>

      {alerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Alertes recentes</Text>
          {alerts.map((alert) => {
            const iconName = TYPE_ICONS[alert.type] ?? 'alert-triangle';
            return (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertCard}
                onPress={() => acknowledgeAlert(alert.id)}
                accessibilityLabel={`Acquitter alerte: ${alert.message}`}
              >
                <View style={styles.alertIconContainer}>
                  <Feather name={iconName} size={18} color={colors.warning} />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text>
                  <Text style={styles.alertDate}>
                    {new Date(alert.triggered_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.tapHintContainer}>
                  <Feather name="check" size={14} color={colors.inkMuted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { ...typography.h1, color: colors.ink, marginBottom: spacing.lg },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '48%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  kpiAlert: { borderColor: colors.error, backgroundColor: colors.errorBg },
  kpiValue: { ...typography.h2, color: colors.ink },
  kpiLabel: { ...typography.caption, color: colors.inkSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.card,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertContent: { flex: 1 },
  alertMessage: { ...typography.caption, color: colors.ink },
  alertDate: { ...typography.small, color: colors.inkSecondary, marginTop: spacing.xs, textTransform: 'none', letterSpacing: 0 },
  tapHintContainer: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
