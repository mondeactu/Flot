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
import { supabase } from '../../lib/supabase';

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

const TYPE_ICONS: Record<string, string> = {
  ct_expiry: '📋', maintenance_due: '🔧', high_consumption: '⛽',
  no_fill: '⛽', document_expiry: '📄', custom_reminder: '📌',
  replacement_ending: '🔄', monthly_report: '📊', incident: '🚨',
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
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />}
    >
      <Text style={styles.title}>Tableau de bord</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.vehicleCount}</Text>
          <Text style={styles.kpiLabel}>Véhicules actifs</Text>
        </View>
        <View style={[styles.kpiCard, kpis.alertCount > 0 && styles.kpiAlert]}>
          <Text style={[styles.kpiValue, kpis.alertCount > 0 && { color: '#D32F2F' }]}>{kpis.alertCount}</Text>
          <Text style={styles.kpiLabel}>Alertes</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatCurrency(kpis.fuelCostMonth)}</Text>
          <Text style={styles.kpiLabel}>Carburant ce mois</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatCurrency(kpis.totalCostMonth)}</Text>
          <Text style={styles.kpiLabel}>Coût total</Text>
        </View>
      </View>

      {alerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Alertes récentes</Text>
          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => acknowledgeAlert(alert.id)}
              accessibilityLabel={`Acquitter alerte: ${alert.message}`}
            >
              <Text style={styles.alertIcon}>{TYPE_ICONS[alert.type] ?? '⚠️'}</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text>
                <Text style={styles.alertDate}>
                  {new Date(alert.triggered_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.tapHint}>Tap = ✓</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#2E7D32', marginBottom: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '48%', borderWidth: 1, borderColor: '#E0E0E0' },
  kpiAlert: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#333' },
  kpiLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 24, marginBottom: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  alertIcon: { fontSize: 22, marginRight: 10 },
  alertContent: { flex: 1 },
  alertMessage: { fontSize: 13, color: '#333', fontWeight: '500' },
  alertDate: { fontSize: 11, color: '#888', marginTop: 2 },
  tapHint: { fontSize: 10, color: '#999' },
});
