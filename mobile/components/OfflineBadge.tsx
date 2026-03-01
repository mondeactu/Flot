import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getQueueCount } from '../lib/offline-queue';
import { colors, spacing, radius } from '../constants/theme';

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
      <View style={styles.row}>
        <Feather name="upload" size={12} color={colors.inkOnDark} />
        <Text style={styles.text}>{count} en attente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    color: colors.inkOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
});
