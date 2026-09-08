import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const actions = [
  { key: 'tenants', label: 'Tenants', icon: 'people-outline', tint: '#e6f6ec' },
  { key: 'rooms', label: 'Rooms', icon: 'business-outline', tint: '#fdf1e3' },
  { key: 'create-bill', label: 'Create Bill', icon: 'receipt-outline', tint: '#fdeaea' },
  { key: 'expenses', label: 'Expenses', icon: 'pie-chart-outline', tint: '#e9f1fb' },
  { key: 'all-bills', label: 'All Bills', icon: 'document-text-outline', tint: '#fdf1e3' },
  { key: 'monthly-bills', label: 'Monthly Bills', icon: 'list-outline', tint: '#eef0f5' },
  { key: 'meetings', label: 'Meetings', icon: 'calendar-outline', tint: '#e9f1fb' },
  { key: 'support', label: 'Support', icon: 'chatbubble-ellipses-outline', tint: '#e6f6ec' },
];

export default function QuickActionsGrid({ onSelect }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Quick Actions</Text>
      <View style={styles.card}>
        <View style={styles.grid}>
          {actions.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.item}
              onPress={() => onSelect?.(item.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon} size={20} color={colors.text} />
              </View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
});