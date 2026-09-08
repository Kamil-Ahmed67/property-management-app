import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate, formatMoney, formatNumber } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';

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

// PaymentType values are stored in English — only the label is translated.
const PAYMENT_TYPE_KEYS = {
  cash: 'paymentType.cash',
  bkash: 'paymentType.bkash',
  nagad: 'paymentType.nagad',
  'bank transfer': 'paymentType.bank',
  cheque: 'paymentType.cheque',
  other: 'paymentType.other',
};

const PAYMENT_TYPE_ICONS = {
  cash: 'cash-outline',
  bkash: 'phone-portrait-outline',
  nagad: 'phone-portrait-outline',
  'bank transfer': 'business-outline',
  cheque: 'document-text-outline',
  other: 'ellipsis-horizontal',
};

export default function ExpenseListScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);

  // Draft values while the period sheet is open — only committed on Apply,
  // so a half-made selection never triggers a fetch.
  const [draftMonth, setDraftMonth] = useState(CURRENT_MONTH);
  const [draftYear, setDraftYear] = useState(CURRENT_YEAR);

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, month, year]);

  const monthLabel = t(MONTHS.find((m) => m.value === month)?.labelKey || String(month));

  async function loadExpenses(isRefresh) {
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(
        `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&expenseMonth=${month}&expenseYear=${year}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setExpenses(data.data || []);
      }
    } catch (err) {
      console.log('Failed to load expense list:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadExpenses(true);
  }

  function paymentTypeLabel(value) {
    if (!value) return null;
    const key = PAYMENT_TYPE_KEYS[value.toLowerCase()];
    return key ? t(key) : value; // unknown type from API — show as-is
  }

  function paymentTypeIcon(value) {
    if (!value) return 'ellipsis-horizontal';
    return PAYMENT_TYPE_ICONS[value.toLowerCase()] || 'ellipsis-horizontal';
  }

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

  const totalExpense = expenses.reduce((sum, e) => sum + (e.ExpenseAmount || 0), 0);

  // Group by calendar day so the list reads as a statement rather than a
  // flat pile of cards.
  const groupedExpenses = useMemo(() => {
    const groups = new Map();
    expenses.forEach((expense) => {
      const d = new Date(expense.ExpenseDate);
      const key = Number.isNaN(d.getTime())
        ? 'unknown'
        : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!groups.has(key)) {
        groups.set(key, { key, date: expense.ExpenseDate, items: [], total: 0 });
      }
      const group = groups.get(key);
      group.items.push(expense);
      group.total += expense.ExpenseAmount || 0;
    });
    return Array.from(groups.values());
  }, [expenses]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ---------- COMPACT SUMMARY + PERIOD PICKER ---------- */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryGradient} />

          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>{t('expense.totalExpense')}</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalExpense, lang)}</Text>
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

        {/* ---------- LIST ---------- */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={24} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {t('expense.noExpenses', { month: monthLabel, year: String(year) })}
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => onNavigate?.('add-expense')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionText}>{t('expense.addButton')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedExpenses.map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDate}>{formatDate(group.date, lang, t)}</Text>
                <Text style={styles.groupTotal}>{formatMoney(group.total, lang)}</Text>
              </View>

              <View style={styles.groupCard}>
                {group.items.map((expense, index) => {
                  const isCommon = !expense.PropertyId;
                  return (
                    <View
                      key={expense.Id}
                      style={[
                        styles.expenseRow,
                        index !== group.items.length - 1 && styles.expenseRowDivider,
                      ]}
                    >
                      <View
                        style={[
                          styles.rowIconWrap,
                          isCommon ? styles.rowIconCommon : styles.rowIconProperty,
                        ]}
                      >
                        <Ionicons
                          name={paymentTypeIcon(expense.PaymentType)}
                          size={15}
                          color={isCommon ? colors.teal : colors.primaryDark}
                        />
                      </View>

                      <View style={styles.rowTextWrap}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {expense.ExpenseName}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {isCommon ? t('expense.common') : expense.ExpenseType}
                          {!isCommon && expense.FlatName ? ` · ${expense.FlatName}` : ''}
                          {expense.PaymentType ? ` · ${paymentTypeLabel(expense.PaymentType)}` : ''}
                        </Text>
                      </View>

                      <Text style={styles.rowAmount}>
                        {formatMoney(expense.ExpenseAmount, lang)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ---------- FAB ---------- */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigate?.('add-expense')}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* ---------- PERIOD PICKER ---------- */}
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
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },

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

  centerBox: { paddingVertical: 40, alignItems: 'center' },

  /* ---------- EMPTY ---------- */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: colors.muted,
    fontSize: 12.5,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAction: {
    backgroundColor: `${colors.primary}14`,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: colors.primaryDark,
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
  },

  /* ---------- GROUPED LIST ---------- */
  group: { marginBottom: 16 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  groupDate: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupTotal: {
    color: colors.text,
    fontSize: 11.5,
    fontFamily: 'Manrope-ExtraBold',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  expenseRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconProperty: { backgroundColor: `${colors.primary}14` },
  rowIconCommon: { backgroundColor: `${colors.teal}14` },
  rowTextWrap: { flex: 1 },
  rowName: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 1,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-Medium',
  },
  rowAmount: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
  },

  /* ---------- FAB ---------- */
  fab: {
    position: 'absolute',
    bottom: 22,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
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