import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const GAP = 8;
const HORIZONTAL_PADDING = 12;

// Caps how far the phone's accessibility font size can grow text inside
// the small tiles — still readable, but it can't blow the layout apart.
const MAX_FONT_SCALE = 1.3;

// Text metrics used both in the styles and in the tile-height maths below.
// React Native scales fontSize AND lineHeight by the phone's font scale
// (capped by maxFontSizeMultiplier), so the height formula scales the same.
const LABEL_FONT = 11;
const LABEL_LINE = 16;      // roomy enough for Bangla conjuncts / vowel signs
const LABEL_LINES = 2;
const SUB_FONT = 10;
const SUB_LINE = 14;

// Fixed (non-text) parts of a tile: paddingTop + icon + icon margin +
// subtitle paddingTop + paddingBottom, plus a small safety buffer.
const TILE_FIXED = 10 + 36 + 6 + 3 + 10 + 4;

const DEFAULT_PALETTE = [
  '#0F9D58', '#2F80ED', '#F2994A', '#EB5757', '#7C3AED', '#00A896',
];

// 4 tiles per row normally; 3 on narrow phones or when the user has a
// large system font, so labels get enough width instead of being squeezed.
function columnsFor(width, fontScale) {
  if (width < 340 || fontScale >= 1.3) return 3;
  return 4;
}

export default function SectionGrid({
  title,
  items = [],
  onSelect,
  palette = DEFAULT_PALETTE,
  paletteOffset = 0,
}) {
  const { width, fontScale } = useWindowDimensions();
  const columns = columnsFor(width, fontScale);

  const itemWidth = Math.floor(
    (width - HORIZONTAL_PADDING * 2 - GAP * (columns - 1)) / columns
  );

  // ONE height for every tile in every section: always reserves room for a
  // 2-line label + subtitle, whether or not a given tile uses it. Same
  // formula in every SectionGrid, so Property and Finance tiles match.
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  const tileHeight = Math.ceil(TILE_FIXED + (LABEL_LINE * LABEL_LINES + SUB_LINE) * scale);

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={styles.heading} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
      ) : null}

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
                  height: tileHeight,
                  backgroundColor: `${color}14`,
                  borderColor: `${color}20`,
                },
              ]}
              onPress={() => onSelect?.(item.key)}
              activeOpacity={0.8}
            >
              <View style={styles.iconBadgeWrap}>
                <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
                  <Ionicons name={item.icon} size={18} color={color} />
                </View>

                {/* Notification-style count, separate from the subtitle.
                    Only rendered when a tile has an unread count > 0. */}
                {item.badgeCount > 0 ? (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText} numberOfLines={1} maxFontSizeMultiplier={1}>
                      {item.badgeCount > 9 ? '9+' : item.badgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Label gets its own 2-line area; the subtitle is pinned to
                  the bottom of the tile, so the two can never overlap. */}
              <Text
                style={styles.itemLabel}
                numberOfLines={2}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {item.label}
              </Text>

              <View style={styles.subtitleSlot}>
                {item.loading ? (
                  <ActivityIndicator size="small" color={color} style={styles.tinySpinner} />
                ) : item.subtitle ? (
                  <Text
                    style={[styles.itemSubtitle, { color }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: HORIZONTAL_PADDING, marginBottom: 12 },
  heading: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold', marginBottom: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },

  item: {
    overflow: 'hidden',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  iconBadgeWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  iconBadge: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Manrope-ExtraBold',
  },
  itemLabel: {
    width: '100%',
    color: '#1F2937',
    fontSize: LABEL_FONT,
    lineHeight: LABEL_LINE,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
  },
  // marginTop 'auto' pins the subtitle to the bottom of the tile, so
  // subtitles line up across a row even when one label wraps to 2 lines.
  subtitleSlot: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinySpinner: { transform: [{ scale: 0.55 }] },
  itemSubtitle: { fontSize: SUB_FONT, lineHeight: SUB_LINE, fontFamily: 'Manrope-Regular', textAlign: 'center' },
});