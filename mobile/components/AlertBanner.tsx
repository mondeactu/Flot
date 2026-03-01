import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import { colors, spacing, radius, shadows } from '../constants/theme';

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
      accessibilityLabel={`${alertCount} alertes non traitees`}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Feather name="alert-triangle" size={16} color={colors.inkOnDark} />
        <Text style={styles.text}>
          {alertCount} alerte{alertCount > 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    color: colors.inkOnDark,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
