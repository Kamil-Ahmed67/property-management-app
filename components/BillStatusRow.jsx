import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../providers/LanguageProvider';
import { formatMoney, formatNumber } from '../utils/localeFormat';
import { colors } from '../theme';

export default function BillStatusRow({
  income = 0,
  expense = 0,
  periodLabel = '',
  unitsCount = 0,
  expenseCount = 0,
}) {
  const { t, lang } = useLanguage();
  const net = income - expense;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="wallet" size={13} color="#ffffff" />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {t('billStatus.title')}
          {periodLabel ? (
            <Text style={styles.titlePeriod}> · {periodLabel}</Text>
          ) : null}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('report.totalIncome')}</Text>
          <Text style={[styles.statValue, { color: colors.primaryDark }]}>
            {formatMoney(income, lang)}
          </Text>
          <Text style={styles.statSub}>
            ({t('billStatus.units', { count: formatNumber(unitsCount, lang) })})
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('report.totalExpense')}</Text>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {formatMoney(expense, lang)}
          </Text>
          <Text style={styles.statSub}>
            ({t('billStatus.expenseCount', { count: formatNumber(expenseCount, lang) })})
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('report.netBalance')}</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>
            {formatMoney(net, lang)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginHorizontal: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',

    ...Platform.select({
      ios: {
        shadowColor: '#14402a',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-ExtraBold',
  },
  titlePeriod: {
    color: colors.muted,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stat: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 9.5,
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 1,
  },
  statSub: {
    color: colors.muted,
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
  },
});