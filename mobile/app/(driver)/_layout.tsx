import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <Text style={styles.greeting}>Bonjour {firstName}</Text>
        {vehicle && (
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{vehicle.plate}</Text>
          </View>
        )}
        <OfflineBadge />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Se déconnecter">
          <Text style={styles.logoutText}>Quitter</Text>
        </TouchableOpacity>
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
      console.log(`${count} saisie(s) synchronisée(s)`);
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
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { paddingBottom: 4, height: 60 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Carburant',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>⛽</Text>,
            tabBarAccessibilityLabel: 'Onglet Carburant',
          }}
        />
        <Tabs.Screen
          name="cleaning"
          options={{
            title: 'Nettoyage',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>🧹</Text>,
            tabBarAccessibilityLabel: 'Onglet Nettoyage',
          }}
        />
        <Tabs.Screen
          name="incident"
          options={{
            title: 'Signaler',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>⚠️</Text>,
            tabBarAccessibilityLabel: 'Onglet Signaler un problème',
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    flex: 1,
  },
  plateBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginRight: 8,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  logoutBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
  },
});
