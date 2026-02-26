import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';

export default function AlertBanner() {
  const [alertCount, setAlertCount] = useState(0);
  const { profile, vehicle } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;

    const fetchAlerts = async () => {
      let query = supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('acknowledged', false);

      if (profile.role === 'driver' && vehicle) {
        query = query.eq('vehicle_id', vehicle.id);
      }

      const { count } = await query;
      setAlertCount(count ?? 0);
    };

    fetchAlerts();

    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, vehicle]);

  if (alertCount === 0) return null;

  const handlePress = () => {
    if (profile?.role === 'driver') {
      router.push('/(driver)/alerts');
    }
  };

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handlePress}
      accessibilityLabel={`${alertCount} alertes non traitées`}
      accessibilityRole="button"
    >
      <Text style={styles.text}>
        ⚠️ {alertCount} alerte{alertCount > 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
