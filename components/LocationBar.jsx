import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function LocationBar({ label }) {
  if (!label) return null;

  return (
    <View style={styles.wrap}>
      <Ionicons name="home" size={16} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
  },
});