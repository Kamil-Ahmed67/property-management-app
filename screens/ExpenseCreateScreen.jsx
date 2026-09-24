import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';
const COMMON_KEY = '__common__';

// `value` is stored in tblExpense.PaymentType (English) — only labels translate.
const PAYMENT_TYPES = [
  { value: 'Cash', labelKey: 'paymentType.cash', icon: 'cash-outline' },
  { value: 'Bkash', labelKey: 'paymentType.bkash', icon: 'phone-portrait-outline' },
  { value: 'Nagad', labelKey: 'paymentType.nagad', icon: 'phone-portrait-outline' },
  { value: 'Bank Transfer', labelKey: 'paymentType.bank', icon: 'business-outline' },
  { value: 'Cheque', labelKey: 'paymentType.cheque', icon: 'document-text-outline' },
  { value: 'Other', labelKey: 'paymentType.other', icon: 'ellipsis-horizontal' },
];

export default function ExpenseCreateScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const entryBy = loginData?.Name || loginData?.Phone || '';

  const [expenseName, setExpenseName] = useState('');
  // null = nothing picked yet; COMMON_KEY = the forced "Common" option;
  // otherwise the selected unit object with all three IDs.
  const [selectedSource, setSelectedSource] = useState(null);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [paymentType, setPaymentType] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  const [sourceOptions, setSourceOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!phone) {
      setLoadingOptions(false);
      return;
    }

    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetExpenseSourceOptions?phone=${encodeURIComponent(phone)}&uId=${loginData?.Id}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          setSourceOptions(data.data || []);
        }
      } catch (err) {
        console.log('Failed to load expense source options:', err.message);
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [phone]);

  const filteredOptions = useMemo(() => {
    const query = typeSearch.trim().toLowerCase();
    if (!query) return sourceOptions;
    return sourceOptions.filter(
      (o) =>
        (o.PropertyName || '').toLowerCase().includes(query) ||
        (o.FlatName || '').toLowerCase().includes(query) ||
        (o.TenantName || '').toLowerCase().includes(query)
    );
  }, [typeSearch, sourceOptions]);

  const isCommon = selectedSource === COMMON_KEY;

  function sourceLabel() {
    if (isCommon) return t('expense.common');
    if (selectedSource) {
      return `${selectedSource.PropertyName} — ${selectedSource.FlatName}`;
    }
    return t('expense.selectType');
  }

  function openTypePicker() {
    Keyboard.dismiss();
    setTypeSearch('');
    setTypePickerOpen(true);
  }

  function closeTypePicker() {
    setTypeSearch('');
    setTypePickerOpen(false);
  }

  function handleDateChange(event, selected) {
    // Android's picker closes itself; iOS keeps it open until dismissed.
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setExpenseDate(selected);
  }

  async function handleSave() {
    if (!expenseName.trim() || !selectedSource || !Number(amount) || Number(amount) <= 0) {
      Keyboard.dismiss();
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('expense.validation'),
        actionLabel: t('form.gotIt'),
      });
      return;
    }

    Keyboard.dismiss();
    setSaving(true);

    try {
      const response = await fetch(`${config.BMS_API}api/AddExpense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          UId: loginData?.Id,
          Phone: phone,
          // A unit selection stores the property NAME in ExpenseType (as
          // specified) plus all three IDs; "Common" stores the literal
          // string and leaves every ID null.
          ExpenseType: isCommon ? 'Common' : selectedSource.PropertyName,
          ExpenseName: expenseName,
          PropertyId: isCommon ? null : selectedSource.PropertyId,
          PropDetailsId: isCommon ? null : selectedSource.PropDetailsId,
          TenantId: isCommon ? null : selectedSource.TenantId,
          ExpenseAmount: Number(amount),
          ExpenseDate: expenseDate.toISOString(),
          PaymentType: paymentType,
          Remarks: remarks,
          EntryBy: entryBy,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('expense.saveFailed'));
      }

      setModal({
        type: 'success',
        title: t('expense.savedTitle'),
        message: t('expense.savedMessage'),
        actionLabel: t('form.done'),
        onAction: () => onNavigate?.('expense-list'),
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('expense.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>{t('expense.eyebrow')}</Text>
            <Text style={styles.title}>{t('expense.createTitle')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('expense.name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('expense.namePlaceholder')}
            placeholderTextColor={colors.muted}
            value={expenseName}
            onChangeText={setExpenseName}
            returnKeyType="next"
          />

          <Text style={styles.label}>{t('expense.type')}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => !loadingOptions && openTypePicker()}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownLeft}>
              <View
                style={[
                  styles.optionBadge,
                  isCommon && { backgroundColor: `${colors.teal}1A` },
                ]}
              >
                <Ionicons
                  name={isCommon ? 'globe-outline' : 'business-outline'}
                  size={15}
                  color={isCommon ? colors.teal : colors.primary}
                />
              </View>
              <Text
                style={selectedSource ? styles.dropdownValue : styles.dropdownPlaceholder}
                numberOfLines={1}
              >
                {loadingOptions ? t('form.loading') : sourceLabel()}
              </Text>
            </View>
            {loadingOptions ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>{t('expense.amount')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('expense.amountPlaceholder')}
            placeholderTextColor={colors.muted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>{t('expense.date')}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownValue}>{formatDate(expenseDate, lang, t)}</Text>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          </TouchableOpacity>

          <Text style={styles.label}>{t('expense.paymentType')}</Text>
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
                    size={14}
                    color={active ? '#ffffff' : colors.muted}
                  />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>
            {t('expense.remarks')} <Text style={styles.labelSoft}>{t('form.optional')}</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('expense.remarksPlaceholder')}
            placeholderTextColor={colors.muted}
            value={remarks}
            onChangeText={setRemarks}
            maxLength={50}
          />
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitLabel}>{t('expense.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={expenseDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      ) : null}

      {/* Expense type picker — backdrop sits behind the sheet as its own
          layer so the list inside scrolls freely. */}
      <Modal
        visible={typePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeTypePicker}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTypePicker} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>{t('expense.type')}</Text>
            <Text style={styles.sheetSub}>{t('expense.typeHint')}</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={`${t('form.searchPrefix')}…`}
                placeholderTextColor={colors.muted}
                value={typeSearch}
                onChangeText={setTypeSearch}
                returnKeyType="search"
              />
              {typeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTypeSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.optionsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {/* "Common" is always offered, regardless of the search. */}
              <TouchableOpacity
                style={[styles.optionRow, isCommon && styles.optionRowActive]}
                onPress={() => {
                  setSelectedSource(COMMON_KEY);
                  closeTypePicker();
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.optionBadge, { backgroundColor: `${colors.teal}1A` }]}>
                  <Ionicons name="globe-outline" size={15} color={colors.teal} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, isCommon && styles.optionLabelActive]}>
                    {t('expense.common')}
                  </Text>
                  <Text style={styles.optionHint}>{t('expense.commonHint')}</Text>
                </View>
                {isCommon ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </TouchableOpacity>

              {filteredOptions.length === 0 && typeSearch.length > 0 ? (
                <Text style={styles.emptyText}>{t('form.noMatches')}</Text>
              ) : (
                filteredOptions.map((option) => {
                  const active =
                    !isCommon &&
                    selectedSource &&
                    selectedSource.PropDetailsId === option.PropDetailsId &&
                    selectedSource.TenantId === option.TenantId;
                  return (
                    <TouchableOpacity
                      key={`${option.PropertyId}-${option.PropDetailsId}-${option.TenantId}`}
                      style={[styles.optionRow, active && styles.optionRowActive]}
                      onPress={() => {
                        setSelectedSource(option);
                        closeTypePicker();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionBadge}>
                        <Ionicons name="business-outline" size={15} color={colors.primary} />
                      </View>
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[styles.optionLabel, active && styles.optionLabelActive]}
                          numberOfLines={1}
                        >
                          {option.PropertyName}
                        </Text>
                        <Text style={styles.optionHint} numberOfLines={1}>
                          {option.FlatName} ({option.Floor})
                          {option.TenantName ? ` — ${option.TenantName}` : ''}
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={modal?.actionLabel || t('form.done')}
        onAction={() => {
          const action = modal?.onAction;
          setModal(null);
          action?.();
        }}
        onRequestClose={() => setModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 24, paddingBottom: 28 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headingText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 3 },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: 16,
  },
  label: { color: colors.text, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  labelSoft: { color: colors.muted, fontWeight: '500' },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14.5, color: colors.text, marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  dropdownValue: { fontSize: 14.5, color: colors.text, fontWeight: '600', flexShrink: 1 },
  dropdownPlaceholder: { fontSize: 14.5, color: colors.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipLabelActive: { color: '#ffffff' },
  actionBar: {
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 16,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30, maxHeight: '82%',
  },
  sheetGrabber: {
    width: 38, height: 4, borderRadius: 99, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sheetSub: { fontSize: 12, color: colors.muted, marginBottom: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  optionsScroll: { flexGrow: 0 },
  emptyText: {
    textAlign: 'center', color: colors.muted, fontSize: 13, paddingVertical: 24,
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  optionBadge: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 14.5, color: colors.text, fontWeight: '700' },
  optionLabelActive: { color: colors.primary },
  optionHint: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
});