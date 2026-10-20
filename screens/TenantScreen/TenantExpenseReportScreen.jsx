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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { formatMoney, formatNumber } from '../../utils/localeFormat';
import config from '../../config';
import { colors } from '../../theme';

const TENANT_ID = 'PropHub';
const MAX_RANGE_MONTHS = 12;

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

// Absolute month index keeps range maths safe across year boundaries.
function toIndex(month, year) {
  return year * 12 + (month - 1);
}

function monthsInRange(fromMonth, fromYear, toMonth, toYear) {
  const start = toIndex(fromMonth, fromYear);
  const end = toIndex(toMonth, toYear);
  const list = [];
  for (let i = start; i <= end; i += 1) {
    list.push({ month: (i % 12) + 1, year: Math.floor(i / 12) });
  }
  return list;
}

// Tenant's personal expense report. Uses the same GetExpenseList call as
// TenantExpenseListScreen, once per month in the selected range.
export default function TenantExpenseReportScreen() {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const uId = loginData?.Id;

  const [fromMonth, setFromMonth] = useState(CURRENT_MONTH);
  const [fromYear, setFromYear] = useState(CURRENT_YEAR);
  const [toMonth, setToMonth] = useState(CURRENT_MONTH);
  const [toYear, setToYear] = useState(CURRENT_YEAR);

  const [rows, setRows] = useState([]); // per-month aggregates
  const [loading, setLoading] = useState(true);

  const [pickerTarget, setPickerTarget] = useState(null); // 'from' | 'to' | null
  const [draftMonth, setDraftMonth] = useState(CURRENT_MONTH);
  const [draftYear, setDraftYear] = useState(CURRENT_YEAR);

  const rangeMonths = useMemo(
    () => monthsInRange(fromMonth, fromYear, toMonth, toYear),
    [fromMonth, fromYear, toMonth, toYear]
  );

  const rangeError = useMemo(() => {
    if (toIndex(fromMonth, fromYear) > toIndex(toMonth, toYear)) return t('report.rangeInvalid');
    if (rangeMonths.length > MAX_RANGE_MONTHS) return t('report.rangeTooLong');
    return null;
  }, [fromMonth, fromYear, toMonth, toYear, rangeMonths.length, t]);

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return undefined;
    }
    if (rangeMonths.length === 0 || rangeMonths.length > MAX_RANGE_MONTHS) {
      setRows([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          rangeMonths.map(async ({ month, year }) => {
            const res = await fetch(
              `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&uId=${uId}&expenseMonth=${month}&expenseYear=${year}`,
              { headers: { TenantId: TENANT_ID } }
            );
            const data = await res.json().catch(() => null);
            const expenses = res.ok && data?.success ? data.data || [] : [];
            const total = expenses.reduce((sum, e) => sum + (Number(e.ExpenseAmount) || 0), 0);
            return { month, year, total, count: expenses.length, expenses };
          })
        );
        if (!cancelled) setRows(results);
      } catch (err) {
        console.log('Failed to build tenant expense report:', err.message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, uId, fromMonth, fromYear, toMonth, toYear]);

  function monthLabel(monthNumber) {
    return t(MONTHS.find((m) => m.value === monthNumber)?.labelKey || String(monthNumber));
  }

  const totals = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    const count = rows.reduce((sum, r) => sum + r.count, 0);
    return {
      total,
      count,
      average: rows.length ? total / rows.length : 0,
    };
  }, [rows]);

  // Group every expense in the range by name, biggest first.
  const byName = useMemo(() => {
    const map = new Map();
    rows.forEach((r) =>
      r.expenses.forEach((e) => {
        const name = e.ExpenseName || '—';
        map.set(name, (map.get(name) || 0) + (Number(e.ExpenseAmount) || 0));
      })
    );
    return Array.from(map, ([name, amount]) => ({ name, amount })).sort(
      (a, b) => b.amount - a.amount
    );
  }, [rows]);

  const hasData = rows.some((r) => r.total > 0 || r.count > 0);

  function openPicker(target) {
    setPickerTarget(target);
    setDraftMonth(target === 'from' ? fromMonth : toMonth);
    setDraftYear(target === 'from' ? fromYear : toYear);
  }

  function applyPicker() {
    if (pickerTarget === 'from') {
      setFromMonth(draftMonth);
      setFromYear(draftYear);
    } else {
      setToMonth(draftMonth);
      setToYear(draftYear);
    }
    setPickerTarget(null);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {/* PERIOD SELECTOR */}
        <View style={styles.periodCard}>
          <Text style={styles.periodLabel}>{t('report.period')}</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity
              style={styles.periodField}
              onPress={() => openPicker('from')}
              activeOpacity={0.75}
            >
              <Text style={styles.periodFieldLabel}>{t('report.from')}</Text>
              <Text style={styles.periodFieldValue} numberOfLines={1}>
                {monthLabel(fromMonth)} {fromYear}
              </Text>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={15} color={colors.muted} />

            <TouchableOpacity
              style={styles.periodField}
              onPress={() => openPicker('to')}
              activeOpacity={0.75}
            >
              <Text style={styles.periodFieldLabel}>{t('report.to')}</Text>
              <Text style={styles.periodFieldValue} numberOfLines={1}>
                {monthLabel(toMonth)} {toYear}
              </Text>
            </TouchableOpacity>
          </View>

          {rangeError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={13} color={colors.error} />
              <Text style={styles.errorText}>{rangeError}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasData ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={26} color={colors.muted} />
            <Text style={styles.emptyText}>{t('report.noData')}</Text>
          </View>
        ) : (
          <>
            {/* HEADLINE */}
            <View style={styles.netCard}>
              <View style={styles.netGradient} />
              <Text style={styles.netLabel}>{t('report.totalExpense')}</Text>
              <Text style={styles.netValue}>{formatMoney(totals.total, lang)}</Text>
              <View style={styles.netDivider} />
              <View style={styles.netStatsRow}>
                <View style={styles.netStat}>
                  <Text style={styles.netStatLabel}>{t('expense.count')}</Text>
                  <Text style={styles.netStatValue}>{formatNumber(totals.count, lang)}</Text>
                </View>
                <View style={styles.netStatDivider} />
                <View style={styles.netStat}>
                  <Text style={styles.netStatLabel}>{t('tenantReport.average')}</Text>
                  <Text style={styles.netStatValue}>{formatMoney(totals.average, lang)}</Text>
                </View>
              </View>
            </View>

            {/* MONTHLY BREAKDOWN */}
            <Text style={styles.sectionTitle}>{t('report.monthlyBreakdown')}</Text>
            <View style={styles.card}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colMonth]}>{t('report.month')}</Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>{t('expense.count')}</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>{t('report.expense')}</Text>
              </View>
              {rows.map((r, index) => (
                <View
                  key={`${r.year}-${r.month}`}
                  style={[styles.tableRow, index !== rows.length - 1 && styles.tableRowDivider]}
                >
                  <Text style={[styles.tableCell, styles.colMonth]} numberOfLines={1}>
                    {monthLabel(r.month)} {r.year}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCount]}>
                    {formatNumber(r.count, lang)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colNum, { color: colors.error }]}>
                    {formatMoney(r.total, lang)}
                  </Text>
                </View>
              ))}
            </View>

            {/* BY EXPENSE NAME */}
            <Text style={styles.sectionTitle}>{t('tenantReport.byName')}</Text>
            <View style={styles.card}>
              {byName.map((item, index) => {
                const pct = totals.total > 0 ? (item.amount / totals.total) * 100 : 0;
                return (
                  <View
                    key={item.name}
                    style={[styles.nameRow, index !== byName.length - 1 && styles.tableRowDivider]}
                  >
                    <View style={styles.nameTop}>
                      <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.nameAmount}>{formatMoney(item.amount, lang)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* PERIOD PICKER */}
      <Modal
        visible={!!pickerTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerTarget(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>
              {pickerTarget === 'from' ? t('report.from') : t('report.to')}
            </Text>

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

            <TouchableOpacity style={styles.applyButton} onPress={applyPicker} activeOpacity={0.85}>
              <Text style={styles.applyButtonText}>{t('report.apply')}</Text>
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
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },

  /* PERIOD */
  periodCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  periodLabel: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodField: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  periodFieldLabel: {
    color: colors.muted,
    fontSize: 9.5,
    fontFamily: 'Manrope-Medium',
    marginBottom: 2,
  },
  periodFieldValue: { color: colors.text, fontSize: 13, fontFamily: 'Manrope-Bold' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  errorText: { color: colors.error, fontSize: 11, fontFamily: 'Manrope-Medium', flex: 1 },

  centerBox: { paddingVertical: 44, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12.5,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },

  /* HEADLINE */
  netCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
  },
  netGradient: {
    ...StyleSheet.absoluteFillObject,
    experimental_backgroundImage:
      'linear-gradient(135deg, rgba(0,128,79,1), rgba(7,40,28,1))',
  },
  netLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  netValue: {
    color: '#ffffff',
    fontSize: 27,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: -0.4,
  },
  netDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 14 },
  netStatsRow: { flexDirection: 'row', alignItems: 'center' },
  netStat: { flex: 1 },
  netStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 14,
  },
  netStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    marginBottom: 3,
  },
  netStatValue: { color: '#ffffff', fontSize: 14, fontFamily: 'Manrope-Bold' },

  sectionTitle: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 3,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  /* TABLE */
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tableRow: { flexDirection: 'row', paddingVertical: 11 },
  tableRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tableCell: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-SemiBold' },
  colMonth: { flex: 1.4 },
  colCount: { flex: 0.8, textAlign: 'center' },
  colNum: { flex: 1, textAlign: 'right' },

  /* BY NAME */
  nameRow: { paddingVertical: 11 },
  nameTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { flex: 1, color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-SemiBold', marginRight: 10 },
  nameAmount: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-ExtraBold' },
  barTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.bg,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 5, borderRadius: 99, backgroundColor: colors.primary },

  /* PICKER SHEET */
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'flex-end' },
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
  sheetTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: colors.text, marginBottom: 16 },
  yearRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  yearChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  yearChipActive: { backgroundColor: colors.primaryDark },
  yearChipText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Bold' },
  yearChipTextActive: { color: '#ffffff' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  monthCell: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  monthCellActive: { backgroundColor: `${colors.primary}1A` },
  monthCellText: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-SemiBold' },
  monthCellTextActive: { color: colors.primaryDark, fontFamily: 'Manrope-ExtraBold' },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyButtonText: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-Bold' },
});