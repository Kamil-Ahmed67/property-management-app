import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../providers/LanguageProvider';
import { formatMoney, formatNumber } from '../utils/localeFormat';
import { colors } from '../theme';

export default function BillStatusRow({ totalDue = 0, collected = 0 }) {
  const { t, lang } = useLanguage();
  const pct = totalDue > 0 ? Math.round((collected / totalDue) * 100) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {t('billStatus.heading')} <Text style={styles.headingMuted}>{t('billStatus.subtitle')}</Text>
      </Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('billStatus.totalDue')}</Text>
          <Text style={[styles.cardValue, { color: colors.error }]}>
            {formatMoney(totalDue, lang)}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('billStatus.collected')}</Text>
          <Text style={[styles.cardValue, { color: colors.primaryDark }]}>
            {formatMoney(collected, lang)}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, pct)}%` }]} />
      </View>
      <Text style={styles.pct}>
        {formatNumber(pct, lang)}% {t('billStatus.pctSuffix')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  heading: {
    color: colors.text,
    fontSize: 14.5,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 10,
  },
  headingMuted: {
    color: colors.muted,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
  },
  track: {
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  pct: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
    marginTop: 6,
  },
});