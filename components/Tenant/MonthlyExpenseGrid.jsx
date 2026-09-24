import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';

// categories: [{ key, labelKey, icon, color, amount, status: 'paid'|'unpaid', date }]
export default function MonthlyExpenseGrid({ periodLabel, onChangePeriod, categories = [], onSelect }) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('expenseGrid.title')}</Text>
        <TouchableOpacity style={styles.periodButton} onPress={onChangePeriod} activeOpacity={0.7}>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.card, { backgroundColor: `${cat.color}14` }]}
            onPress={() => onSelect?.(cat.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${cat.color}26` }]}>
              <Ionicons name={cat.icon} size={16} color={cat.color} />
            </View>
            <Text style={styles.amount}>৳ {cat.amount.toLocaleString()}</Text>
            {cat.status === 'paid' ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={11} color={colors.primary} />
                <Text style={styles.paidText}>
                  {t('expenseGrid.paid')} · {cat.date}
                </Text>
              </View>
            ) : (
              <Text style={styles.addText}>{t('expenseGrid.notAdded')}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heading: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  periodLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47.5%',
    borderRadius: 14,
    padding: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  amount: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  paidText: {
    color: colors.primary,
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
  },
  addText: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
  },
});