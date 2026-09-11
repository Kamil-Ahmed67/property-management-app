import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate, formatMoney } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';

// `value` is what goes to the API as BillMonth and what bills are looked up
// by — it must stay English. Only `labelKey` is translated for display.
const MONTHS = [
  { value: 'January', labelKey: 'month.january' },
  { value: 'February', labelKey: 'month.february' },
  { value: 'March', labelKey: 'month.march' },
  { value: 'April', labelKey: 'month.april' },
  { value: 'May', labelKey: 'month.may' },
  { value: 'June', labelKey: 'month.june' },
  { value: 'July', labelKey: 'month.july' },
  { value: 'August', labelKey: 'month.august' },
  { value: 'September', labelKey: 'month.september' },
  { value: 'October', labelKey: 'month.october' },
  { value: 'November', labelKey: 'month.november' },
  { value: 'December', labelKey: 'month.december' },
];

// `value` is stored in tblBillPayment.PaymentType (English) — only the
// label shown to the collector is translated.
const PAYMENT_TYPES = [
  { value: 'Cash', labelKey: 'paymentType.cash', icon: 'cash-outline' },
  { value: 'Bkash', labelKey: 'paymentType.bkash', icon: 'phone-portrait-outline' },
  { value: 'Nagad', labelKey: 'paymentType.nagad', icon: 'phone-portrait-outline' },
  { value: 'Bank Transfer', labelKey: 'paymentType.bank', icon: 'business-outline' },
  { value: 'Cheque', labelKey: 'paymentType.cheque', icon: 'document-text-outline' },
  { value: 'Other', labelKey: 'paymentType.other', icon: 'ellipsis-horizontal' },
];

const now = new Date();
const CURRENT_MONTH = MONTHS[now.getMonth()].value;
const CURRENT_YEAR = String(now.getFullYear());
const YEARS = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

export default function BillCollectionScreen() {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const { height: windowHeight } = useWindowDimensions();
  const phone = loginData?.Phone || loginData?.phone || '';
  const entryBy = loginData?.Name || loginData?.Phone || '';

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [activeDropdown, setActiveDropdown] = useState(null);

  // Collect-payment sheet state
  const [collectingBill, setCollectingBill] = useState(null); // the bill being paid
  const [paymentType, setPaymentType] = useState('Cash');
  const [amountInput, setAmountInput] = useState('');
  const [remarksInput, setRemarksInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Payment-history modal state
  const [historyBill, setHistoryBill] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [resultState, setResultState] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, month, year]);

  const monthLabel = t(MONTHS.find((m) => m.value === month)?.labelKey || month);

  async function loadBills() {
    setLoading(true);
    setSearch('');
    try {
      const response = await fetch(
        `${config.BMS_API}api/GetBillList?phone=${encodeURIComponent(phone)}&billMonth=${encodeURIComponent(month)}&billYear=${encodeURIComponent(year)}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setBills(data.data || []);
      }
    } catch (err) {
      console.log('Failed to load bill list:', err.message);
    } finally {
      setLoading(false);
    }
  }

  function statusLabel(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'paid') return t('bill.status.paid');
    if (normalized === 'partial paid') return t('bill.status.partialPaid');
    if (normalized === 'unpaid' || !normalized) return t('bill.status.unpaid');
    return status; // unknown status from the API — show it as-is
  }

  function billRemaining(bill) {
    return Math.max(0, (bill.Amount || 0) - (bill.PaidAmount || 0));
  }

  function openCollect(bill) {
    Keyboard.dismiss();
    setCollectingBill(bill);
    setPaymentType('Cash');
    setRemarksInput('');
    // Pre-fill with the full remaining balance — the collector edits it
    // down if only a partial installment was actually received.
    setAmountInput(String(billRemaining(bill)));
  }

  function closeCollect() {
    setCollectingBill(null);
    setAmountInput('');
    setRemarksInput('');
  }

  function closeResult() {
    setResultState((s) => ({ ...s, visible: false }));
  }

  const remainingBalance = collectingBill ? billRemaining(collectingBill) : 0;
  const enteredAmount = Number(amountInput) || 0;
  const remainingAfterPayment = Math.max(0, remainingBalance - enteredAmount);

  async function handleSaveCollection() {
    const amount = Number(amountInput);

    if (!amount || amount <= 0) {
      setResultState({
        visible: true,
        type: 'error',
        title: t('form.missingInfo'),
        message: t('billCollection.validation'),
      });
      return;
    }

    if (amount > remainingBalance + 0.01) {
      setResultState({
        visible: true,
        type: 'error',
        title: t('form.missingInfo'),
        message: t('billCollection.exceedsRemaining'),
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${config.BMS_API}api/RecordBillPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          BillId: collectingBill.Id,
          Phone: phone,
          PaymentAmount: amount,
          PaymentType: paymentType,
          Remarks: remarksInput,
          EntryBy: entryBy,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('billCollection.updateFailed'));
      }

      // Update this bill locally with the server's authoritative totals —
      // never assume the shape of the update ourselves.
      const collectedName = collectingBill.TenantName;
      const updated = data.data;
      setBills((prev) =>
        prev.map((b) =>
          b.Id === collectingBill.Id
            ? {
                ...b,
                PaidAmount: updated.PaidAmount,
                Status: updated.Status,
                CollectionDate: new Date().toISOString(),
              }
            : b
        )
      );
      closeCollect();

      setResultState({
        visible: true,
        type: 'success',
        title: t('billCollection.updatedTitle'),
        message: t('billCollection.updatedMessage', { name: collectedName }),
      });
    } catch (err) {
      setResultState({
        visible: true,
        type: 'error',
        title: t('bill.errorTitle'),
        message: err.message || t('billCollection.updateFailed'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(bill) {
    setHistoryBill(bill);
    setLoadingHistory(true);
    setHistoryItems([]);
    try {
      const response = await fetch(
        `${config.BMS_API}api/GetBillPaymentHistory?phone=${encodeURIComponent(phone)}&billId=${bill.Id}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setHistoryItems(data.data || []);
      }
    } catch (err) {
      console.log('Failed to load payment history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function closeHistory() {
    setHistoryBill(null);
    setHistoryItems([]);
  }

  function paymentTypeLabel(value) {
    if (!value) return value;
    const match = PAYMENT_TYPES.find((p) => p.value.toLowerCase() === value.toLowerCase());
    return match ? t(match.labelKey) : value; // unknown type from API — show as-is
  }

  function openDropdown(key) {
    setActiveDropdown(key);
  }
  function closeDropdown() {
    setActiveDropdown(null);
  }

  const dropdownConfig = {
    month: {
      label: t('bill.month'),
      options: MONTHS.map((m) => m.value),
      labelFor: (value) => t(MONTHS.find((m) => m.value === value)?.labelKey || value),
      value: month,
      onSelect: setMonth,
    },
    year: {
      label: t('bill.year'),
      options: YEARS,
      labelFor: (value) => value,
      value: year,
      onSelect: setYear,
    },
  }[activeDropdown];

  // Client-side filter over whatever this month/year already loaded — no
  // extra API call needed, since the full list for the period is in hand.
  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter(
      (b) =>
        (b.TenantName || '').toLowerCase().includes(query) ||
        (b.PropertyName || '').toLowerCase().includes(query) ||
        (b.FlatName || '').toLowerCase().includes(query)
    );
  }, [bills, search]);

  const totalAmount = bills.reduce((sum, b) => sum + (b.Amount || 0), 0);
  const totalCollected = bills.reduce((sum, b) => sum + (b.PaidAmount || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="cash-outline" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>{t('bill.eyebrow')}</Text>
            <Text style={styles.title}>{t('billCollection.title')}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{t('billCollection.subtitle')}</Text>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('bill.month')}</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('month')}>
              <Text style={styles.dropdownValue}>{monthLabel}</Text>
              <Ionicons name="chevron-down" size={15} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('bill.year')}</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('year')}>
              <Text style={styles.dropdownValue}>{year}</Text>
              <Ionicons name="chevron-down" size={15} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>{t('billCollection.summaryTotal')}</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalAmount, lang)}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>{t('billCollection.summaryCollected')}</Text>
            <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>
              {formatMoney(totalCollected, lang)}
            </Text>
          </View>
        </View>

        {bills.length > 0 ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={14} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('bill.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {t('billCollection.noBillsForMonth', { month: monthLabel, year })}
            </Text>
          </View>
        ) : filteredBills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('form.noMatches')}</Text>
          </View>
        ) : (
          filteredBills.map((bill) => {
            const normalizedStatus = (bill.Status || '').toLowerCase();
            const isPaid = normalizedStatus === 'paid';
            const isPartial = normalizedStatus === 'partial paid';
            const hasPaymentInfo = isPaid || isPartial;

            const pillStyle = isPaid
              ? styles.statusPillPaid
              : isPartial
              ? styles.statusPillPartial
              : styles.statusPillDue;
            const pillTextColor = isPaid ? colors.primary : isPartial ? colors.accent : colors.error;

            return (
              <View key={bill.Id} style={styles.billCard}>
                <View style={styles.billHeaderRow}>
                  <Text style={styles.billTenantName} numberOfLines={1}>
                    {bill.TenantName}
                  </Text>
                  <View style={[styles.statusPill, pillStyle]}>
                    <Text style={[styles.statusPillText, { color: pillTextColor }]}>
                      {statusLabel(bill.Status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.billLocation} numberOfLines={1}>
                  {bill.PropertyName} — {bill.FlatName} ({bill.Floor})
                </Text>

                <View style={styles.amountsRow}>
                  <Text style={styles.billAmount}>{formatMoney(bill.Amount, lang)}</Text>
                  {isPartial ? (
                    <Text style={styles.remainingText}>
                      {t('billCollection.remaining')}: {formatMoney(billRemaining(bill), lang)}
                    </Text>
                  ) : null}
                </View>

                {hasPaymentInfo ? (
                  <TouchableOpacity
                    style={styles.paidInfoRow}
                    onPress={() => openHistory(bill)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={isPaid ? colors.primary : colors.accent}
                    />
                    <Text style={styles.paidInfoText}>
                      {formatMoney(bill.PaidAmount ?? 0, lang)} · {formatDate(bill.CollectionDate, lang, t)}
                    </Text>
                    <Text style={styles.viewHistoryLink}>{t('billCollection.viewHistory')}</Text>
                  </TouchableOpacity>
                ) : null}

                {!isPaid ? (
                  <TouchableOpacity
                    style={styles.collectButton}
                    onPress={() => openCollect(bill)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cash" size={13} color="#ffffff" />
                    <Text style={styles.collectButtonText}>
                      {isPartial ? t('billCollection.addPayment') : t('billCollection.collectButton')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Month/Year picker */}
      <Modal visible={!!activeDropdown} transparent animationType="fade" onRequestClose={closeDropdown}>
        <Pressable style={styles.overlay} onPress={closeDropdown}>
          <View style={styles.optionsCard}>
            <Text style={styles.optionsHeading}>{dropdownConfig?.label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {dropdownConfig?.options.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    index !== dropdownConfig.options.length - 1 && styles.optionDivider,
                  ]}
                  onPress={() => {
                    dropdownConfig.onSelect(option);
                    closeDropdown();
                  }}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      dropdownConfig.value === option && styles.optionLabelActive,
                    ]}
                  >
                    {dropdownConfig.labelFor(option)}
                  </Text>
                  {dropdownConfig.value === option ? (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Collect-payment sheet — backdrop is a separate absolute layer
          BEHIND the sheet, not a Pressable wrapping it, so the ScrollView
          inside can handle its own scroll gesture without competing with
          the backdrop's touch responder. */}
      <Modal
        visible={!!collectingBill}
        transparent
        animationType="slide"
        onRequestClose={closeCollect}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCollect} />
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetGrabber} />
              <Text style={styles.sheetTitle}>{t('billCollection.sheetTitle')}</Text>
              <Text style={styles.sheetSub}>{t('billCollection.sheetSub')}</Text>

              {collectingBill ? (
                <>
                  <View style={styles.sheetTenantRow}>
                    <Text style={styles.sheetTenantName}>{collectingBill.TenantName}</Text>
                    <Text style={styles.sheetTenantLocation}>
                      {collectingBill.PropertyName} — {collectingBill.FlatName}
                    </Text>
                  </View>

                  <View style={styles.sheetStatsRow}>
                    <View style={styles.sheetStatItem}>
                      <Text style={styles.sheetStatLabel}>{t('bill.totalBilled')}</Text>
                      <Text style={styles.sheetStatValue}>
                        {formatMoney(collectingBill.Amount, lang)}
                      </Text>
                    </View>
                    <View style={styles.sheetStatItem}>
                      <Text style={styles.sheetStatLabel}>{t('billCollection.alreadyPaid')}</Text>
                      <Text style={styles.sheetStatValue}>
                        {formatMoney(collectingBill.PaidAmount || 0, lang)}
                      </Text>
                    </View>
                    <View style={styles.sheetStatItem}>
                      <Text style={styles.sheetStatLabel}>{t('billCollection.remaining')}</Text>
                      <Text style={[styles.sheetStatValue, { color: colors.primaryDark }]}>
                        {formatMoney(remainingBalance, lang)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>{t('billCollection.paymentType')}</Text>
              <View style={styles.chipRow}>
                {PAYMENT_TYPES.map((option) => {
                  const active = paymentType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setPaymentType(option.value)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={option.icon}
                        size={13}
                        color={active ? '#ffffff' : colors.muted}
                      />
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {t(option.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('billCollection.paidAmount')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('billCollection.paidAmountPlaceholder')}
                placeholderTextColor={colors.muted}
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="number-pad"
              />

              <Text style={styles.remainingAfterText}>
                {remainingAfterPayment > 0
                  ? `${t('billCollection.remainingAfter')}: ${formatMoney(remainingAfterPayment, lang)}`
                  : t('billCollection.fullySettled')}
              </Text>

              <Text style={styles.label}>
                {t('billCollection.remarks')} <Text style={styles.labelSoft}>{t('form.optional')}</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('billCollection.remarksPlaceholder')}
                placeholderTextColor={colors.muted}
                value={remarksInput}
                onChangeText={setRemarksInput}
                maxLength={50}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveCollection}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('billCollection.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment history modal — same backdrop-behind-sheet pattern as
          above, so the FlatList can scroll freely. */}
      <Modal
        visible={!!historyBill}
        transparent
        animationType="slide"
        onRequestClose={closeHistory}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeHistory} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>{t('billCollection.history')}</Text>
            {historyBill ? (
              <Text style={styles.sheetSub}>
                {historyBill.TenantName} — {historyBill.PropertyName} ({historyBill.FlatName})
              </Text>
            ) : null}

            {loadingHistory ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : historyItems.length === 0 ? (
              <Text style={styles.emptyText}>{t('billCollection.noPayments')}</Text>
            ) : (
              <FlatList
                data={historyItems}
                keyExtractor={(item) => String(item.Id)}
                style={{ maxHeight: windowHeight * 0.5 }}
                contentContainerStyle={styles.historyListContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                bounces={false}
                ItemSeparatorComponent={() => <View style={styles.historyRowDivider} />}
                renderItem={({ item }) => (
                  <View style={styles.historyRow}>
                    <View style={styles.historyIconWrap}>
                      <Ionicons name="arrow-down-circle" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.historyTextWrap}>
                      <Text style={styles.historyAmount}>
                        {formatMoney(item.PaymentAmount, lang)}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {paymentTypeLabel(item.PaymentType)} · {formatDate(item.PaymentDate, lang, t)}
                      </Text>
                      {item.Remarks ? (
                        <Text style={styles.historyRemarks}>{item.Remarks}</Text>
                      ) : null}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={resultState.visible}
        type={resultState.type}
        title={resultState.title}
        message={resultState.message}
        actionLabel={t('form.done')}
        onAction={closeResult}
        onRequestClose={closeResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, paddingTop: 14, paddingBottom: 28 },

  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 1 },
  subtitle: { color: colors.muted, fontSize: 11, marginBottom: 10, marginLeft: 44 },

  row: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  rowItem: { flex: 1 },
  label: { color: colors.text, fontSize: 10.5, fontWeight: '700', marginBottom: 5 },
  labelSoft: { color: colors.muted, fontWeight: '500' },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface,
    paddingHorizontal: 11, paddingVertical: 10, marginBottom: 10,
  },
  dropdownValue: { fontSize: 12.5, color: colors.text, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryPill: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10,
  },
  summaryLabel: { color: colors.muted, fontSize: 9.5, fontWeight: '600', marginBottom: 3 },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface,
    paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 12, color: colors.text, padding: 0 },

  centerBox: { paddingVertical: 24, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 18, alignItems: 'center',
  },
  emptyText: { color: colors.muted, fontSize: 11.5, textAlign: 'center', paddingVertical: 10 },

  billCard: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginBottom: 6,
  },
  billHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3,
  },
  billTenantName: { color: colors.text, fontSize: 12.5, fontWeight: '700', flex: 1 },
  statusPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
  statusPillPaid: { backgroundColor: `${colors.primary}1A` },
  statusPillPartial: { backgroundColor: `${colors.accent}1A` },
  statusPillDue: { backgroundColor: `${colors.error}14` },
  statusPillText: { fontSize: 9, fontWeight: '700' },
  billLocation: { color: colors.muted, fontSize: 10.5, marginBottom: 5 },
  amountsRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6,
  },
  billAmount: { color: colors.text, fontSize: 14, fontWeight: '800' },
  remainingText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  paidInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  paidInfoText: { color: colors.muted, fontSize: 10, flex: 1 },
  viewHistoryLink: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  collectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: 9, paddingVertical: 9,
  },
  collectButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 40,
  },
  optionsCard: { backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 6 },
  optionsHeading: {
    color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4,
    paddingHorizontal: 14, paddingTop: 7, paddingBottom: 5,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  optionDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: 12.5, color: colors.text, fontWeight: '500' },
  optionLabelActive: { color: colors.primary, fontWeight: '700' },

  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  sheetGrabber: {
    width: 34, height: 4, borderRadius: 99, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 11,
  },
  sheetTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 3 },
  sheetSub: { fontSize: 11, color: colors.muted, marginBottom: 12, lineHeight: 15 },
  sheetTenantRow: {
    backgroundColor: colors.bg, borderRadius: 9, padding: 10, marginBottom: 10,
  },
  sheetTenantName: { color: colors.text, fontSize: 12.5, fontWeight: '700', marginBottom: 2 },
  sheetTenantLocation: { color: colors.muted, fontSize: 10.5 },
  sheetStatsRow: {
    flexDirection: 'row', gap: 7, marginBottom: 14,
  },
  sheetStatItem: {
    flex: 1, backgroundColor: colors.bg, borderRadius: 9, padding: 8, alignItems: 'center',
  },
  sheetStatLabel: { color: colors.muted, fontSize: 9, fontWeight: '600', marginBottom: 2, textAlign: 'center' },
  sheetStatValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: colors.text, marginBottom: 7,
  },
  remainingAfterText: {
    color: colors.muted, fontSize: 10.5, marginBottom: 14, fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary, borderRadius: 9, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  historyListContent: { paddingBottom: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 11 },
  historyRowDivider: { height: 1, backgroundColor: colors.border },
  historyIconWrap: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  historyTextWrap: { flex: 1 },
  historyAmount: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  historyMeta: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  historyRemarks: { color: colors.muted, fontSize: 10, fontStyle: 'italic', marginTop: 2 },
});