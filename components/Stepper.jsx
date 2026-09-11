import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function Stepper({ label, value, onChange, min = 0, max = 99, containerStyle }) {
  function decrease() {
    if (value > min) onChange(value - 1);
  }
  function increase() {
    if (value < max) onChange(value + 1);
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, value <= min && styles.buttonDisabled]}
          onPress={decrease}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={16} color={value <= min ? colors.border : colors.primary} />
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity
          style={[styles.button, value >= max && styles.buttonDisabled]}
          onPress={increase}
          disabled={value >= max}
        >
          <Ionicons name="add" size={16} color={value >= max ? colors.border : colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fafbfc',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});