import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/auth.store';

export default function Index() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    if (!user || !profile) {
      router.replace('/(auth)/login');
    } else if (profile.role === 'admin') {
      router.replace('/(admin)');
    } else {
      router.replace('/(driver)');
    }
  }, [user, profile, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E7D32" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
