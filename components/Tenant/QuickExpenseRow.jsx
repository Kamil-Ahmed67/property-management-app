import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

// items: [{ key, label, icon, color }]
export default function QuickExpenseRow({ items = [], onSelect }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.item}
          onPress={() => onSelect?.(item.key)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
            <Ionicons name={item.icon} size={19} color={item.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
  },
});