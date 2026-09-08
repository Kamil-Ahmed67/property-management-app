import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const COLUMNS = 4;
const GAP = 10;
const HORIZONTAL_PADDING = 16;

export default function SectionGrid({ title, accentColor, items, onSelect }) {
  const { width } = useWindowDimensions();
  const itemWidth = (width - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <Text style={styles.heading}>{title}</Text>
      </View>

      <View style={styles.grid}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.item,
              { width: itemWidth },
              (index + 1) % COLUMNS !== 0 && { marginRight: GAP },
            ]}
            onPress={() => onSelect?.(item.key)}
            activeOpacity={0.75}
          >
            <Ionicons name={item.icon} size={26} color={accentColor} />
            <Text style={styles.itemLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 18,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  accentBar: {
    width: 4,
    height: 16,
    borderRadius: 1,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    marginBottom: GAP,
  },
  itemLabel: {
    color: colors.text,
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
    lineHeight: 13,
  },
});