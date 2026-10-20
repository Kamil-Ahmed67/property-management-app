import { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { formatDate, formatMoney, formatNumber } from '../../utils/localeFormat';
import config from '../../config';
import { colors } from '../../theme';
const TENANT_ID = 'PropHub';
const MONTHS = [
  { value: 1, labelKey: 'month.january' },
  { value: 2, labelKey: 'month.february' },
  { value: 3, labelKey: 'month.march' },
  { value: 4, labelKey: 'month.april' },
  { value: 5, labelKey: 'month.may' },
  { value: 6, labelKey: 'month.june' },
  { value: 7, labelKey: 'month.july' },
  { value: 8, labelKey: 'month.august' },
  { value: 9, labelKey: 'month.september' },
  { value: 10, labelKey: 'month.october' },
  { value: 11, labelKey: 'month.november' },
  { value: 12, labelKey: 'month.december' },
];
const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);
// Same keys as ExpenseCreateScreen's PAYMENT_TYPES — only labels translate.
const PAYMENT_LABEL_KEYS = {
  Cash: 'paymentType.cash',
  Bkash: 'paymentType.bkash',
  Nagad: 'paymentType.nagad',
  'Bank Transfer': 'paymentType.bank',
  Cheque: 'paymentType.cheque',
  Other: 'paymentType.other',
};
// Tenant's own expense list (personal record). Reads the same
// GetExpenseList API the landlord side uses, filtered by the tenant and the
// selected month. The period picker is the same month/year sheet as the
// landlord ExpenseListScreen. The floating + opens AddTenantExpenseScreen.
export default function TenantExpenseListScreen({ onAdd }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  // Draft values while the period sheet is open — only committed on Done,
  // so a half-made selection never triggers a fetch.
  const [draftMonth, setDraftMonth] = useState(CURRENT_MONTH);
  const [draftYear, setDraftYear] = useState(CURRENT_YEAR);
  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&uId=${loginData?.Id}&expenseMonth=${month}&expenseYear=${year}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        setExpenses(response.ok && data?.success ? data.data || [] : []);
      } catch (err) {
        console.log('Failed to load tenant expenses:', err.message);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, month, year]);
  function openPeriodPicker() {
    setDraftMonth(month);
    setDraftYear(year);
    setPeriodPickerOpen(true);
  }
  function applyPeriod() {
    setMonth(draftMonth);
    setYear(draftYear);
    setPeriodPickerOpen(false);
  }
  const monthLabel = t(MONTHS.find((m) => m.value === month)?.labelKey || String(month));
  const total = expenses.reduce((sum, e) => sum + (Number(e.ExpenseAmount) || 0), 0);
  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {/* ---------- COMPACT SUMMARY + PERIOD PICKER ---------- */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGradient} />
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>{t('expense.totalExpense')}</Text>
            <Text style={styles.summaryValue}>{formatMoney(total, lang)}</Text>
            <Text style={styles.summaryCount}>
              {formatNumber(expenses.length, lang)} {t('expense.count')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.periodButton}
            onPress={openPeriodPicker}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={13} color="#ffffff" />
            <Text style={styles.periodButtonText}>
              {monthLabel} {String(year)}
            </Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={26} color={colors.muted} />
            <Text style={styles.emptyText}>
              {t('expense.noExpenses', { month: monthLabel, year: String(year) })}
            </Text>
          </View>
        ) : (
          expenses.map((item, index) => {
            const isCommon = item.ExpenseType === 'Common';
            const paymentKey = PAYMENT_LABEL_KEYS[item.PaymentType];
            return (
              <View key={item.Id ?? index} style={styles.card}>
                <View style={[styles.cardIcon, isCommon && styles.cardIconCommon]}>
                  <Ionicons
                    name={isCommon ? 'globe-outline' : 'home-outline'}
                    size={16}
                    color={isCommon ? colors.teal : colors.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.ExpenseName}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {isCommon ? t('expense.common') : item.ExpenseType}
                    {item.PaymentType ? ` · ${paymentKey ? t(paymentKey) : item.PaymentType}` : ''}
                  </Text>
                  {item.ExpenseDate ? (
                    <Text style={styles.cardDate}>{formatDate(item.ExpenseDate, lang, t)}</Text>
                  ) : null}
                  {item.Remarks ? (
                    <Text style={styles.cardRemarks} numberOfLines={1}>{item.Remarks}</Text>
                  ) : null}
                </View>
                <Text style={styles.cardAmount}>{formatMoney(item.ExpenseAmount, lang)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
      {/* ---------- PERIOD PICKER (same as landlord ExpenseListScreen) ---------- */}
      <Modal
        visible={periodPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPeriodPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPeriodPickerOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>{t('bill.month')} / {t('bill.year')}</Text>
            <View style={styles.yearRow}>
              {YEARS.map((y) => {
                const active = draftYear === y;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearChip, active && styles.yearChipActive]}
                    onPress={() => setDraftYear(y)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yearChipText, active && styles.yearChipTextActive]}>
                      {String(y)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((m) => {
                const active = draftMonth === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.monthCell, active && styles.monthCellActive]}
                    onPress={() => setDraftMonth(m.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.monthCellText, active && styles.monthCellTextActive]}
                      numberOfLines={1}
                    >
                      {t(m.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={applyPeriod} activeOpacity={0.85}>
              <Text style={styles.applyButtonText}>{t('form.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 96 },
  /* ---------- COMPACT SUMMARY ---------- */
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
  },
  summaryGradient: {
    ...StyleSheet.absoluteFillObject,
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(0,128,79,1), rgba(7,40,28,1))',
  },
  summaryLeft: { flex: 1, marginRight: 10 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: -0.3,
  },
  summaryCount: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10.5,
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  periodButtonText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 22, alignItems: 'center', gap: 8,
  },
  emptyText: { color: colors.muted, fontSize: 12.5, textAlign: 'center' },
  /* ---------- LIST ---------- */
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 13, marginBottom: 10,
  },
  cardIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconCommon: { backgroundColor: `${colors.teal}1A` },
  cardText: { flex: 1 },
  cardName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  cardDate: { color: colors.muted, fontSize: 11, marginTop: 2 },
  cardRemarks: { color: colors.text, fontSize: 11.5, marginTop: 3, fontStyle: 'italic' },
  cardAmount: { color: colors.text, fontSize: 14, fontWeight: '800' },
  /* ---------- FAB ---------- */
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  /* ---------- PERIOD SHEET ---------- */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetGrabber: {
    width: 38,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: colors.text,
    marginBottom: 16,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  yearChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  yearChipActive: { backgroundColor: colors.primaryDark },
  yearChipText: {
    color: colors.muted,
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
  },
  yearChipTextActive: { color: '#ffffff' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  monthCell: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  monthCellActive: { backgroundColor: `${colors.primary}1A` },
  monthCellText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
  },
  monthCellTextActive: {
    color: colors.primaryDark,
    fontFamily: 'Manrope-ExtraBold',
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
});