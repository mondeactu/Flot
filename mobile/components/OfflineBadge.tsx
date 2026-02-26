import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getQueueCount } from '../lib/offline-queue';

export default function OfflineBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      const c = await getQueueCount();
      setCount(c);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>📤 {count} en attente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
