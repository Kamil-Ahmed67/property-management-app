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
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate, formatMoney } from '../utils/localeFormat';
import { generateAndShareReport } from '../utils/reportPdf';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';
const COMPANY_NAME = 'PropHub';
const MAX_RANGE_MONTHS = 12;

// English month names are what tblBill stores as BillMonth, so the API
// calls use `value`; only `labelKey` is shown to the user.
const MONTHS = [
  { value: 'January', number: 1, labelKey: 'month.january' },
  { value: 'February', number: 2, labelKey: 'month.february' },
  { value: 'March', number: 3, labelKey: 'month.march' },
  { value: 'April', number: 4, labelKey: 'month.april' },
  { value: 'May', number: 5, labelKey: 'month.may' },
  { value: 'June', number: 6, labelKey: 'month.june' },
  { value: 'July', number: 7, labelKey: 'month.july' },
  { value: 'August', number: 8, labelKey: 'month.august' },
  { value: 'September', number: 9, labelKey: 'month.september' },
  { value: 'October', number: 10, labelKey: 'month.october' },
  { value: 'November', number: 11, labelKey: 'month.november' },
  { value: 'December', number: 12, labelKey: 'month.december' },
];

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

// Absolute month index makes range maths trivial and comparisons safe
// across a year boundary.
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

export default function ReportScreen() {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const preparedFor = loginData?.Name || phone || '—';

  const [fromMonth, setFromMonth] = useState(CURRENT_MONTH);
  const [fromYear, setFromYear] = useState(CURRENT_YEAR);
  const [toMonth, setToMonth] = useState(CURRENT_MONTH);
  const [toYear, setToYear] = useState(CURRENT_YEAR);

  const [rows, setRows] = useState([]); // per-month aggregates
  const [expenseDetails, setExpenseDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Which end of the range the picker is editing: 'from' | 'to' | null
  const [pickerTarget, setPickerTarget] = useState(null);
  const [draftMonth, setDraftMonth] = useState(CURRENT_MONTH);
  const [draftYear, setDraftYear] = useState(CURRENT_YEAR);

  const [modal, setModal] = useState(null);

  const rangeMonths = useMemo(
    () => monthsInRange(fromMonth, fromYear, toMonth, toYear),
    [fromMonth, fromYear, toMonth, toYear]
  );

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, fromMonth, fromYear, toMonth, toYear]);

  function monthLabel(monthNumber) {
    return t(MONTHS.find((m) => m.number === monthNumber)?.labelKey || String(monthNumber));
  }

  async function loadReport() {
    if (rangeMonths.length === 0 || rangeMonths.length > MAX_RANGE_MONTHS) {
      setRows([]);
      setExpenseDetails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Both endpoints are month-scoped, so one pair of calls per month in
      // the range. Capped at 12 months to keep that bounded.
      const results = await Promise.all(
        rangeMonths.map(async ({ month, year }) => {
          const monthName = MONTHS.find((m) => m.number === month)?.value;

          const [billRes, expenseRes] = await Promise.all([
            fetch(
              `${config.BMS_API}api/GetBillList?phone=${encodeURIComponent(phone)}&billMonth=${encodeURIComponent(monthName)}&billYear=${year}`,
              { headers: { TenantId: TENANT_ID } }
            ).then((r) => r.json().catch(() => null)),
            fetch(
              `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&expenseMonth=${month}&expenseYear=${year}`,
              { headers: { TenantId: TENANT_ID } }
            ).then((r) => r.json().catch(() => null)),
          ]);

          const bills = billRes?.success ? billRes.data || [] : [];
          const expenses = expenseRes?.success ? expenseRes.data || [] : [];

          const billed = bills.reduce((sum, b) => sum + (b.Amount || 0), 0);
          const collected = bills.reduce((sum, b) => sum + (b.PaidAmount || 0), 0);
          const expenseTotal = expenses.reduce((sum, e) => sum + (e.ExpenseAmount || 0), 0);

          return {
            month,
            year,
            billed,
            collected,
            expense: expenseTotal,
            expenses,
          };
        })
      );

      setRows(results);
      setExpenseDetails(results.flatMap((r) => r.expenses));
    } catch (err) {
      console.log('Failed to build report:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const billed = rows.reduce((sum, r) => sum + r.billed, 0);
    const collected = rows.reduce((sum, r) => sum + r.collected, 0);
    const expense = rows.reduce((sum, r) => sum + r.expense, 0);
    return {
      billed,
      collected,
      outstanding: billed - collected,
      expense,
      // Income is money actually received, not money invoiced — an
      // unpaid bill isn't income.
      net: collected - expense,
    };
  }, [rows]);

  function openPicker(target) {
    setPickerTarget(target);
    if (target === 'from') {
      setDraftMonth(fromMonth);
      setDraftYear(fromYear);
    } else {
      setDraftMonth(toMonth);
      setDraftYear(toYear);
    }
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

  const rangeError = useMemo(() => {
    if (toIndex(fromMonth, fromYear) > toIndex(toMonth, toYear)) {
      return t('report.rangeInvalid');
    }
    if (rangeMonths.length > MAX_RANGE_MONTHS) {
      return t('report.rangeTooLong');
    }
    return null;
  }, [fromMonth, fromYear, toMonth, toYear, rangeMonths.length, t]);

  const periodLabel = `${monthLabel(fromMonth)} ${fromYear} — ${monthLabel(toMonth)} ${toYear}`;

  async function handleDownload() {
    setGenerating(true);
    try {
      await generateAndShareReport(
        {
          companyName: COMPANY_NAME,
          preparedFor,
          title: t('report.title'),
          periodLabel,
          generatedOn: formatDate(new Date(), lang, t),
          labels: {
            preparedFor: t('report.preparedFor'),
            period: t('report.period'),
            generatedOn: t('report.generatedOn'),
            summary: t('report.summary'),
            monthlyBreakdown: t('report.monthlyBreakdown'),
            expenseDetails: t('report.expenseDetails'),
            month: t('report.month'),
            income: t('report.income'),
            expense: t('report.expense'),
            net: t('report.net'),
            total: t('report.total'),
            date: t('report.date'),
            description: t('report.description'),
            category: t('report.category'),
            amount: t('report.amount'),
            noData: t('report.noData'),
          },
          summaryRows: [
            { label: t('report.billed'), value: formatMoney(totals.billed, lang) },
            { label: t('report.collected'), value: formatMoney(totals.collected, lang) },
            { label: t('report.outstanding'), value: formatMoney(totals.outstanding, lang) },
            { label: t('report.totalExpense'), value: formatMoney(totals.expense, lang) },
            { label: t('report.netBalance'), value: formatMoney(totals.net, lang) },
          ],
          monthlyRows: rows.map((r) => ({
            month: `${monthLabel(r.month)} ${r.year}`,
            income: formatMoney(r.collected, lang),
            expense: formatMoney(r.expense, lang),
            net: formatMoney(r.collected - r.expense, lang),
          })),
          expenseRows: expenseDetails.map((e) => ({
            date: formatDate(e.ExpenseDate, lang, t),
            description: e.ExpenseName || '—',
            category: e.PropertyId ? e.ExpenseType : t('expense.common'),
            amount: formatMoney(e.ExpenseAmount, lang),
          })),
          totals: {
            income: formatMoney(totals.collected, lang),
            expense: formatMoney(totals.expense, lang),
            net: formatMoney(totals.net, lang),
          },
        },
        `${COMPANY_NAME} — ${periodLabel}`
      );
    } catch (err) {
      setModal({
        type: 'error',
        title: t('bill.errorTitle'),
        message: err.message || t('report.downloadFailed'),
      });
    } finally {
      setGenerating(false);
    }
  }

  const hasData = rows.some((r) => r.billed > 0 || r.collected > 0 || r.expense > 0);

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
              <Text style={styles.netLabel}>{t('report.netBalance')}</Text>
              <Text style={styles.netValue}>{formatMoney(totals.net, lang)}</Text>
              <View style={styles.netDivider} />
              <View style={styles.netStatsRow}>
                <View style={styles.netStat}>
                  <Text style={styles.netStatLabel}>{t('report.totalIncome')}</Text>
                  <Text style={styles.netStatValue}>{formatMoney(totals.collected, lang)}</Text>
                </View>
                <View style={styles.netStatDivider} />
                <View style={styles.netStat}>
                  <Text style={styles.netStatLabel}>{t('report.totalExpense')}</Text>
                  <Text style={styles.netStatValue}>{formatMoney(totals.expense, lang)}</Text>
                </View>
              </View>
            </View>

            {/* BILLING SUMMARY */}
            <Text style={styles.sectionTitle}>{t('report.summary')}</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('report.billed')}</Text>
                <Text style={styles.summaryValue}>{formatMoney(totals.billed, lang)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowDivider]}>
                <Text style={styles.summaryLabel}>{t('report.collected')}</Text>
                <Text style={styles.summaryValue}>{formatMoney(totals.collected, lang)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('report.outstanding')}</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatMoney(totals.outstanding, lang)}
                </Text>
              </View>
            </View>

            {/* MONTHLY BREAKDOWN */}
            <Text style={styles.sectionTitle}>{t('report.monthlyBreakdown')}</Text>
            <View style={styles.card}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colMonth]}>{t('report.month')}</Text>
                <Text style={[styles.tableHeaderCell, styles.colNum]}>{t('report.income')}</Text>
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
                  <Text style={[styles.tableCell, styles.colNum]}>
                    {formatMoney(r.collected, lang)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colNum, { color: colors.error }]}>
                    {formatMoney(r.expense, lang)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* DOWNLOAD */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            (generating || !hasData || rangeError) && styles.downloadButtonDisabled,
          ]}
          onPress={handleDownload}
          disabled={generating || !hasData || !!rangeError}
          activeOpacity={0.85}
        >
          {generating ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.downloadLabel}>{t('report.generating')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={17} color="#ffffff" />
              <Text style={styles.downloadLabel}>{t('report.download')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
                const active = draftMonth === m.number;
                return (
                  <TouchableOpacity
                    key={m.number}
                    style={[styles.monthCell, active && styles.monthCellActive]}
                    onPress={() => setDraftMonth(m.number)}
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

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => setModal(null)}
        onRequestClose={() => setModal(null)}
      />
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

  /* NET HEADLINE */
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
  netDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 14,
  },
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

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryRowDivider: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Medium' },
  summaryValue: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-ExtraBold' },

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
  colMonth: { flex: 1.3 },
  colNum: { flex: 1, textAlign: 'right' },

  /* ACTION BAR */
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 15,
  },
  downloadButtonDisabled: { opacity: 0.5 },
  downloadLabel: { color: '#ffffff', fontSize: 14.5, fontFamily: 'Manrope-Bold' },

  /* PICKER SHEET */
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