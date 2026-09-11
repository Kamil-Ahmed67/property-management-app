import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const COLUMNS = 4;
const GAP = 8;
const HORIZONTAL_PADDING = 12;

const DEFAULT_PALETTE = [
  '#0F9D58', // Green
  '#2F80ED', // Blue
  '#F2994A', // Orange / Amber
  '#EB5757', // Red
  '#7C3AED', // Purple
  '#00A896', // Teal
];

export default function SectionGrid({
  title,
  items = [],
  onSelect,
  palette = DEFAULT_PALETTE,
  paletteOffset = 0,
}) {
  const { width } = useWindowDimensions();

  // Precise card width calculation accounting for horizontal padding & grid gaps
  const itemWidth = Math.floor(
    (width - HORIZONTAL_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS
  );

  return (
    <View style={styles.wrap}>
      {/* Title renderer */}
      {title ? <Text style={styles.heading}>{title}</Text> : null}

      <View style={styles.grid}>
        {items.map((item, index) => {
          const color = palette[(index + paletteOffset) % palette.length];
          return (
            <TouchableOpacity
  key={item.key || index}
  style={[
    styles.item,
    {
      width: itemWidth,
      backgroundColor: `${color}14`,
      borderWidth: 1,
      borderColor: `${color}20`,
    },
  ]}
  onPress={() => onSelect?.(item.key)}
  activeOpacity={0.8}
>
              {/* Top Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
                <Ionicons name={item.icon} size={18} color={color} />
              </View>

              {/* Label */}
              <Text style={styles.itemLabel} numberOfLines={2}>
                {item.label}
              </Text>

              {/* Bottom Circular Chevron Action */}
              <View style={styles.chevronBadge}>
                <Ionicons name="chevron-forward" size={11} color={color} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  heading: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  item: {
    borderRadius: 6,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 4,
    overflow: 'hidden', // Ensures background color respects card corner radius
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  itemLabel: {
    color: '#1F2937',
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 4,
    minHeight: 28, // Fixes vertical alignment for 1-line vs 2-line labels
  },
  chevronBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
});