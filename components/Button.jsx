import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Button({ label, onPress, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[styles.base, isPrimary ? styles.primary : styles.outline]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.outlineLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
  },
  outlineLabel: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
  },
});