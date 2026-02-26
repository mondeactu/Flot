import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { registerForPushNotifications } from '../../lib/notifications';

export default function AdminLayout() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id);
    }
  }, [user?.id]);

  return (
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
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>🏠</Text>,
          tabBarAccessibilityLabel: 'Onglet Tableau de bord',
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Véhicules',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>🚗</Text>,
          tabBarAccessibilityLabel: 'Onglet Véhicules',
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Conducteurs',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>👤</Text>,
          tabBarAccessibilityLabel: 'Onglet Conducteurs',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>⚙️</Text>,
          tabBarAccessibilityLabel: 'Onglet Paramètres',
        }}
      />
      <Tabs.Screen name="vehicle-detail" options={{ href: null }} />
      <Tabs.Screen name="driver-detail" options={{ href: null }} />
    </Tabs>
  );
}
