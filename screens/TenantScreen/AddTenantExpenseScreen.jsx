import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import { useActiveHome } from '../../hooks/useActiveHome';
import { formatDate } from '../../utils/localeFormat';
import { colors } from '../../theme';
import config from '../../config';
import StatusModal from '../../components/StatusModal';

const TENANT_ID = 'PropHub';

// `value` is stored in tblExpense.PaymentType (English) — only labels translate.
const PAYMENT_TYPES = [
  { value: 'Cash', labelKey: 'paymentType.cash', icon: 'cash-outline' },
  { value: 'Bkash', labelKey: 'paymentType.bkash', icon: 'phone-portrait-outline' },
  { value: 'Nagad', labelKey: 'paymentType.nagad', icon: 'phone-portrait-outline' },
  { value: 'Bank Transfer', labelKey: 'paymentType.bank', icon: 'business-outline' },
  { value: 'Cheque', labelKey: 'paymentType.cheque', icon: 'document-text-outline' },
  { value: 'Other', labelKey: 'paymentType.other', icon: 'ellipsis-horizontal' },
];

// Tenant homes may be tenant-added (no linked property) — fall back to the
// free text the tenant typed.
function homeName(h) {
  return h?.PropertyName || h?.PropertyNameText || h?.DisplayPropertyName || '';
}

// API rows may come back PascalCase or camelCase depending on serializer
// settings — normalise once so the rest of the screen doesn't care.
function normaliseName(row) {
  return {
    Id: row?.Id ?? row?.id,
    Name: row?.Name ?? row?.name ?? '',
    IsCustom: !!(row?.IsCustom ?? row?.isCustom),
  };
}

const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Tenant expense form. The "Expense Name" is picked from tblExpenseName
// (universal names + the tenant's own), and the tenant can add their own
// name right from the picker. Saved through the same api/AddExpense as
// ExpenseCreateScreen; the expense is attached to the tenant's current
// home automatically (or "Common" if they have none).
export default function AddTenantExpenseScreen({ onSaved }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const uId = loginData?.Id;
  const phone = loginData?.Phone || loginData?.phone || '';
  const entryBy = loginData?.Name || loginData?.Phone || '';

  const { home } = useActiveHome(uId);

  // ---- Expense Name dropdown ----
  const [names, setNames] = useState([]);
  const [loadingNames, setLoadingNames] = useState(true);
  const [selectedName, setSelectedName] = useState(null);
  const [namePickerOpen, setNamePickerOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [addingName, setAddingName] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [sheetError, setSheetError] = useState('');

  // ---- Rest of the form ----
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [paymentType, setPaymentType] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const loadNames = useCallback(async () => {
    if (!uId) {
      setLoadingNames(false);
      return [];
    }
    setLoadingNames(true);
    try {
      const response = await fetch(`${config.BMS_API}api/GetExpenseNameList?uId=${uId}`, {
        headers: { TenantId: TENANT_ID },
      });
      const data = await response.json().catch(() => null);
      const list = response.ok && data?.success ? (data.data || []).map(normaliseName) : [];
      setNames(list);
      return list;
    } catch (err) {
      console.log('Failed to load expense names:', err.message);
      return [];
    } finally {
      setLoadingNames(false);
    }
  }, [uId]);

  useEffect(() => {
    loadNames();
  }, [loadNames]);

  const filteredNames = useMemo(() => {
    const query = nameSearch.trim().toLowerCase();
    if (!query) return names;
    return names.filter((n) => n.Name.toLowerCase().includes(query));
  }, [nameSearch, names]);

  // "+ Add" is offered only when the typed text isn't already in the list.
  const trimmedSearch = nameSearch.trim();
  const canAddName = trimmedSearch.length > 0 && !names.some((n) => sameText(n.Name, trimmedSearch));

  function openNamePicker() {
    Keyboard.dismiss();
    setNameSearch('');
    setSheetError('');
    setPendingDeleteId(null);
    setNamePickerOpen(true);
  }

  function closeNamePicker() {
    setNameSearch('');
    setSheetError('');
    setPendingDeleteId(null);
    setNamePickerOpen(false);
  }

  function pickName(item) {
    setSelectedName(item);
    closeNamePicker();
  }

  async function handleAddName() {
    if (!canAddName || addingName) return;
    setAddingName(true);
    setSheetError('');
    try {
      const response = await fetch(`${config.BMS_API}api/AddExpenseName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ UId: uId, Name: trimmedSearch, EntryBy: entryBy }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error((data && data.message) || t('expenseName.addFailed'));
      }

      // Created or already existed — either way, reload and select it.
      const newId = data.data?.id ?? data.data?.Id;
      const list = await loadNames();
      const added =
        list.find((n) => n.Id === newId) ||
        list.find((n) => sameText(n.Name, trimmedSearch)) ||
        { Id: newId, Name: trimmedSearch, IsCustom: true };
      pickName(added);
    } catch (err) {
      setSheetError(err.message || t('expenseName.addFailed'));
    } finally {
      setAddingName(false);
    }
  }

  async function handleDeleteName(item) {
    // First tap arms the row, second tap deletes.
    if (pendingDeleteId !== item.Id) {
      setPendingDeleteId(item.Id);
      return;
    }
    setDeletingId(item.Id);
    setSheetError('');
    try {
      const response = await fetch(`${config.BMS_API}api/DeleteExpenseName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ Id: item.Id, UId: uId, EntryBy: entryBy }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error((data && data.message) || t('expenseName.deleteFailed'));
      }
      setNames((prev) => prev.filter((n) => n.Id !== item.Id));
      if (selectedName?.Id === item.Id) setSelectedName(null);
    } catch (err) {
      setSheetError(err.message || t('expenseName.deleteFailed'));
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  function handleDateChange(event, selected) {
    // Android's picker closes itself; iOS keeps it open until dismissed.
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setExpenseDate(selected);
  }

  async function handleSave() {
    if (!selectedName || !Number(amount) || Number(amount) <= 0) {
      Keyboard.dismiss();
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('expenseName.validation'),
        actionLabel: t('form.gotIt'),
      });
      return;
    }

    Keyboard.dismiss();
    setSaving(true);

    // Attach to the tenant's current home when there is one; otherwise
    // "Common" with null IDs — same convention as ExpenseCreateScreen.
    const hasHome = !!home && !!homeName(home);

    try {
      const response = await fetch(`${config.BMS_API}api/AddExpense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          UId: uId,
          Phone: phone,
          ExpenseType: hasHome ? homeName(home) : 'Common',
          ExpenseName: selectedName.Name,
          PropertyId: hasHome ? home.PropertyId || null : null,
          PropDetailsId: hasHome ? home.PropDetailsId || null : null,
          TenantId: null,
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
        onAction: () => onSaved?.(),
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
          {/* ---------- EXPENSE NAME (dropdown) ---------- */}
          <Text style={styles.label}>{t('expense.name')}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => !loadingNames && openNamePicker()}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.optionBadge}>
                <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
              </View>
              <Text
                style={selectedName ? styles.dropdownValue : styles.dropdownPlaceholder}
                numberOfLines={1}
              >
                {loadingNames
                  ? t('form.loading')
                  : selectedName
                    ? selectedName.Name
                    : t('expenseName.select')}
              </Text>
            </View>
            {loadingNames ? (
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

      {/* ---------- EXPENSE NAME PICKER ---------- */}
      <Modal
        visible={namePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={closeNamePicker}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeNamePicker} />
            <View style={styles.sheet}>
              <View style={styles.sheetGrabber} />
              <Text style={styles.sheetTitle}>{t('expense.name')}</Text>
              <Text style={styles.sheetSub}>{t('expenseName.sheetHint')}</Text>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('expenseName.searchPlaceholder')}
                  placeholderTextColor={colors.muted}
                  value={nameSearch}
                  onChangeText={(v) => {
                    setNameSearch(v);
                    if (sheetError) setSheetError('');
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => canAddName && handleAddName()}
                />
                {nameSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setNameSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {sheetError ? <Text style={styles.sheetError}>{sheetError}</Text> : null}

              <ScrollView
                style={styles.optionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {/* Add the typed text as the user's own name */}
                {canAddName ? (
                  <TouchableOpacity
                    style={[styles.optionRow, styles.addRow]}
                    onPress={handleAddName}
                    disabled={addingName}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionBadge, styles.addBadge]}>
                      {addingName ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons name="add" size={17} color="#ffffff" />
                      )}
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.addLabel} numberOfLines={1}>
                        {t('expenseName.addNew', { name: trimmedSearch })}
                      </Text>
                      <Text style={styles.optionHint}>{t('expenseName.addHint')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {filteredNames.length === 0 && !canAddName ? (
                  <Text style={styles.emptyText}>
                    {nameSearch ? t('form.noMatches') : t('expenseName.empty')}
                  </Text>
                ) : (
                  filteredNames.map((item) => {
                    const active = selectedName?.Id === item.Id;
                    const armed = pendingDeleteId === item.Id;
                    return (
                      <TouchableOpacity
                        key={`name-${item.Id}`}
                        style={[styles.optionRow, active && styles.optionRowActive]}
                        onPress={() => pickName(item)}
                        activeOpacity={0.8}
                      >
                        {/* Own names look exactly like universal ones — the
                            only difference is the delete action on the right. */}
                        <View style={styles.optionBadge}>
                          <Ionicons name="pricetag-outline" size={15} color={colors.primary} />
                        </View>
                        <View style={styles.optionTextWrap}>
                          <Text
                            style={[styles.optionLabel, active && styles.optionLabelActive]}
                            numberOfLines={1}
                          >
                            {item.Name}
                          </Text>
                        </View>

                        {active ? (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        ) : null}

                        {/* Only the user's own names can be removed */}
                        {item.IsCustom ? (
                          <TouchableOpacity
                            style={[styles.deleteButton, armed && styles.deleteButtonArmed]}
                            onPress={() => handleDeleteName(item)}
                            disabled={deletingId === item.Id}
                            hitSlop={6}
                          >
                            {deletingId === item.Id ? (
                              <ActivityIndicator size="small" color={colors.error} />
                            ) : armed ? (
                              <Text style={styles.deleteArmedText}>{t('expenseName.confirmDelete')}</Text>
                            ) : (
                              <Ionicons name="trash-outline" size={15} color={colors.error} />
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  sheetError: { color: colors.error, fontSize: 12, fontWeight: '600', marginBottom: 10 },
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

  addRow: { borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  addBadge: { backgroundColor: colors.primary },
  addLabel: { fontSize: 14, color: colors.primary, fontWeight: '800' },

  deleteButton: {
    minWidth: 30, height: 30, borderRadius: 9, paddingHorizontal: 6,
    backgroundColor: `${colors.error}12`, alignItems: 'center', justifyContent: 'center',
  },
  deleteButtonArmed: { backgroundColor: colors.error, paddingHorizontal: 10 },
  deleteArmedText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
});