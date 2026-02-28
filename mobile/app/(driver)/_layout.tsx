import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import AlertBanner from '../../components/AlertBanner';
import OfflineBadge from '../../components/OfflineBadge';
import { startQueueListener, stopQueueListener } from '../../lib/offline-queue';
import { registerForPushNotifications } from '../../lib/notifications';

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
          <Text style={styles.greeting}>{firstName}</Text>
        </View>
        <View style={styles.headerRight}>
          {vehicle && (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{vehicle.plate}</Text>
            </View>
          )}
          <OfflineBadge />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Se deconnecter">
            <Feather name="log-out" size={16} color="#D32F2F" />
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
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            paddingBottom: 6,
            paddingTop: 6,
            height: 64,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
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
            tabBarIcon: ({ color, size }) => <Feather name="droplet" size={22} color={color} />,
            tabBarAccessibilityLabel: 'Onglet Carburant',
          }}
        />
        <Tabs.Screen
          name="cleaning"
          options={{
            title: 'Nettoyage',
            tabBarIcon: ({ color, size }) => <Feather name="refresh-cw" size={22} color={color} />,
            tabBarAccessibilityLabel: 'Onglet Nettoyage',
          }}
        />
        <Tabs.Screen
          name="incident"
          options={{
            title: 'Signaler',
            tabBarIcon: ({ color, size }) => <Feather name="alert-triangle" size={22} color={color} />,
            tabBarAccessibilityLabel: 'Onglet Signaler',
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  plateBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  plateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 1,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
