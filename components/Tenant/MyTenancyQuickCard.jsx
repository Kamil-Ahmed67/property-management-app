import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

// Reused for both "My Tenancy" (residence history) and "Landlord
// Connections" (invites from landlords) — icon/label default to the
// original My Tenancy card so the existing call site needs no changes.
export default function MyTenancyQuickCard({ onPress, icon = 'business-outline', label = 'My Tenancy' }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 13, marginBottom: 8,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
});