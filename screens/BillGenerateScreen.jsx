import { useContext, useEffect, useState } from 'react';
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

const now = new Date();
const CURRENT_MONTH = MONTHS[now.getMonth()].value;
const CURRENT_YEAR = String(now.getFullYear());

const YEARS = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

function localeFor(lang) {
  return lang === 'bn' ? 'bn-BD' : 'en-US';
}

export default function BillGenerateScreen() {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);

  const [checking, setChecking] = useState(true);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const [resultState, setResultState] = useState({
    visible: false,
    type: 'success',
    icon: undefined,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!phone) return;
    checkAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, month, year]);

  // Display helpers — the underlying values stay English/ASCII for the API.
  const monthLabel = t(MONTHS.find((m) => m.value === month)?.labelKey || month);
  const yearLabel = Number(year).toLocaleString(localeFor(lang), { useGrouping: false });
  const money = (value) => `৳${(value || 0).toLocaleString(localeFor(lang))}`;

  function statusLabel(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'paid') return t('bill.status.paid');
    if (normalized === 'unpaid' || !normalized) return t('bill.status.unpaid');
    return status; // unknown status from the API — show it as-is
  }

  function closeResult() {
    setResultState((s) => ({ ...s, visible: false }));
  }

  async function checkAndLoad() {
    setChecking(true);
    setBills([]);
    try {
      const response = await fetch(
        `${config.BMS_API}api/CheckBillExists?phone=${encodeURIComponent(phone)}&billMonth=${encodeURIComponent(month)}&billYear=${encodeURIComponent(year)}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      const exists = response.ok && data?.success ? !!data.data : false;
      setAlreadyGenerated(exists);

      if (exists) {
        await loadBills();
      }
    } catch (err) {
      console.log('Failed to check bill existence:', err.message);
    } finally {
      setChecking(false);
    }
  }

  async function loadBills() {
    setLoadingBills(true);
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
      setLoadingBills(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const response = await fetch(`${config.BMS_API}api/GenerateBill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          Phone: phone,
          BillMonth: month,
          BillYear: year,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 409) {
        setAlreadyGenerated(true);
        await loadBills();
        setResultState({
          visible: true,
          type: 'error',
          icon: 'alert-circle',
          title: t('bill.alreadyGeneratedTitle'),
          message:
            (data && data.message) ||
            t('bill.alreadyGenerated', { month: monthLabel, year: yearLabel }),
        });
        return;
      }

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('bill.generateFailed'));
      }

      setAlreadyGenerated(true);
      await loadBills();

      setResultState({
        visible: true,
        type: 'success',
        icon: 'checkmark-circle',
        title: t('bill.generatedTitle'),
        message: data.message || t('bill.generatedMessage'),
      });
    } catch (err) {
      setResultState({
        visible: true,
        type: 'error',
        icon: undefined,
        title: t('bill.errorTitle'),
        message: err.message || t('bill.generateFailed'),
      });
    } finally {
      setGenerating(false);
    }
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
      labelFor: (value) => Number(value).toLocaleString(localeFor(lang), { useGrouping: false }),
      value: year,
      onSelect: setYear,
    },
  }[activeDropdown];

  const totalAmount = bills.reduce((sum, b) => sum + (b.Amount || 0), 0);
  const totalCollected = bills
    .filter((b) => (b.Status || '').toLowerCase() === 'paid')
    .reduce((sum, b) => sum + (b.Amount || 0), 0);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('bill.eyebrow')}</Text>
          <Text style={styles.title}>{t('bill.title')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('bill.month')}</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('month')}>
              <Text style={styles.dropdownValue}>{monthLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{t('bill.year')}</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('year')}>
              <Text style={styles.dropdownValue}>{yearLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {checking ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !alreadyGenerated ? (
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.generateButtonText}>{t('bill.generate')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.generatedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={styles.generatedBannerText}>
              {t('bill.alreadyGenerated', { month: monthLabel, year: yearLabel })}
            </Text>
          </View>
        )}
      </View>

      {alreadyGenerated ? (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>{t('bill.totalBilled')}</Text>
              <Text style={styles.summaryValue}>{money(totalAmount)}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>{t('bill.collected')}</Text>
              <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>
                {money(totalCollected)}
              </Text>
            </View>
          </View>

          {loadingBills ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {t('bill.noBills', { month: monthLabel, year: yearLabel })}
              </Text>
            </View>
          ) : (
            bills.map((bill) => {
              const isPaid = (bill.Status || '').toLowerCase() === 'paid';
              return (
                <View key={bill.Id} style={styles.billCard}>
                  <View style={styles.billHeaderRow}>
                    <Text style={styles.billTenantName} numberOfLines={1}>
                      {bill.TenantName}
                    </Text>
                    <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillDue]}>
                      <Text style={[styles.statusPillText, { color: isPaid ? colors.primary : colors.error }]}>
                        {statusLabel(bill.Status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.billLocation} numberOfLines={1}>
                    {bill.PropertyName} — {bill.FlatName} ({bill.Floor})
                  </Text>
                  <Text style={styles.billAmount}>{money(bill.Amount)}</Text>
                </View>
              );
            })
          )}
        </>
      ) : null}

      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
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
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <StatusModal
        visible={resultState.visible}
        type={resultState.type}
        icon={resultState.icon}
        title={resultState.title}
        message={resultState.message}
        actionLabel={t('form.done')}
        onAction={closeResult}
        onRequestClose={closeResult}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  rowItem: { flex: 1 },
  label: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  dropdownValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  centerBox: { paddingVertical: 16, alignItems: 'center' },
  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14,
  },
  generateButtonDisabled: { opacity: 0.6 },
  generateButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  generatedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.primary}14`, borderRadius: 10, padding: 12,
  },
  generatedBannerText: { color: colors.primaryDark, fontSize: 12.5, fontWeight: '600', flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryPill: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14,
  },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  summaryValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center',
  },
  emptyText: { color: colors.muted, fontSize: 13 },
  billCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  billHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5,
  },
  billTenantName: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 8 },
  statusPillPaid: { backgroundColor: `${colors.primary}1A` },
  statusPillDue: { backgroundColor: `${colors.error}14` },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },
  billLocation: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  billAmount: { color: colors.text, fontSize: 17, fontWeight: '800' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 40,
  },
  optionsCard: { backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 8 },
  optionsHeading: {
    color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  optionDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  optionLabelActive: { color: colors.primary, fontWeight: '700' },
});