import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import AlertBanner from '../../components/AlertBanner';
import OfflineBadge from '../../components/OfflineBadge';
import { startQueueListener, stopQueueListener } from '../../lib/offline-queue';
import { registerForPushNotifications } from '../../lib/notifications';
import { colors, radius } from '../../constants/theme';

function DriverHeader() {
  const { profile, vehicle, logout } = useAuthStore();
  const router = useRouter();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Conducteur';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Feather name="truck" size={14} color="#fff" />
          </View>
          <View>
            <Text style={styles.greeting}>{firstName}</Text>
            {vehicle && <Text style={styles.plateText}>{vehicle.plate}</Text>}
          </View>
        </View>
        <View style={styles.headerRight}>
          <OfflineBadge />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Feather name="log-out" size={15} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <AlertBanner />
    </View>
  );
}

export default function DriverLayout() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id);
    }
    startQueueListener((count) => {
      console.log(`${count} saisie(s) synchronisee(s)`);
    });
    return () => stopQueueListener();
  }, [user?.id]);

  return (
    <>
      <DriverHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            paddingBottom: 6,
            paddingTop: 8,
            height: 64,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Carburant',
            tabBarIcon: ({ color }) => <Feather name="droplet" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cleaning"
          options={{
            title: 'Nettoyage',
            tabBarIcon: ({ color }) => <Feather name="refresh-cw" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="incident"
          options={{
            title: 'Signaler',
            tabBarIcon: ({ color }) => <Feather name="alert-triangle" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{ href: null }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
