import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

// items: [{ key, label, icon, color }]
export default function TenantQuickActions({ items = [], onSelect }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.row}
          onPress={() => onSelect?.(item.key)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon} size={17} color="#ffffff" />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-SemiBold',
  },
});