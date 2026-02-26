import React from 'react';
import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';

interface ActionCardProps {
  emoji: string;
  label: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  selected?: boolean;
}

export default function ActionCard({
  emoji,
  label,
  onPress,
  color = '#2E7D32',
  style,
  selected = false,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: selected ? color : '#E0E0E0' },
        selected && { backgroundColor: `${color}10` },
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && { color, fontWeight: '700' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 4,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
});
