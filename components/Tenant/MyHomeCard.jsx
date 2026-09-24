import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';

export default function MyHomeCard({ property, onPress }) {
  const { t } = useLanguage();
  if (!property) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {property.imageUrl ? (
        <Image source={{ uri: property.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="business-outline" size={22} color={colors.muted} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.buildingName} numberOfLines={1}>
          {property.buildingName}
        </Text>
        <Text style={styles.unitLabel} numberOfLines={1}>
          {property.unitLabel}
        </Text>
        {property.isCurrent ? (
          <View style={styles.currentPill}>
            <Text style={styles.currentPillText}>{t('myHome.currentHome')}</Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  thumbFallback: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  buildingName: {
    color: colors.text,
    fontSize: 14.5,
    fontFamily: 'Manrope-Bold',
  },
  unitLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
    marginBottom: 5,
  },
  currentPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  currentPillText: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});