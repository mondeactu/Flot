import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '../constants/theme';

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  selected?: boolean;
}

export default function ActionCard({
  icon,
  label,
  onPress,
  color = colors.brand,
  style,
  selected = false,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: selected ? color : colors.border },
        selected && { backgroundColor: `${color}10` },
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.label, selected && { color, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '500',
    flex: 1,
  },
});
