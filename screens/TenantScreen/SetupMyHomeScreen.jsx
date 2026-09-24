import { useContext, useRef, useState } from 'react';
import { useLanguage } from '../../providers/LanguageProvider';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../../providers/AuthProvider';
import { colors } from '../../theme';
import config from '../../config';
import StatusModal from '../../components/StatusModal';
import { countries } from 'countries-list';

const TENANT_TYPE_OPTIONS = [
  { value: 'Family', labelKey: 'tenantType.family' },
  { value: 'Bachelor', labelKey: 'tenantType.bachelor' },
  { value: 'Corporate', labelKey: 'tenantType.corporate' },
  { value: 'Student', labelKey: 'tenantType.student' },
];

const RELIGION_OPTIONS = [
  { value: 'Islam', labelKey: 'religion.islam' },
  { value: 'Hinduism', labelKey: 'religion.hinduism' },
  { value: 'Christianity', labelKey: 'religion.christianity' },
  { value: 'Buddhism', labelKey: 'religion.buddhism' },
  { value: 'Other', labelKey: 'religion.other' },
];

const TENANT_ID = 'PropHub';

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const COUNTRY_LIST = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    dialCode: `+${Array.isArray(data.phone) ? data.phone[0] : data.phone}`,
    flag: data.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_COUNTRY = COUNTRY_LIST.find((c) => c.code === 'BD') ?? COUNTRY_LIST[0];

function buildFullPhone(dialCode, localNumber) {
  const digitsOnly = localNumber.replace(/\D/g, '');
  const trimmed = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
  return `${dialCode}${trimmed}`;
}

// Same rich profile fields as AddTenantsScreen (the Owner-side version of
// this form) — Property/Unit are free text here (PropertyNameText /
// UnitNoText) since a self-registering tenant has no FK access to any
// landlord's actual inventory yet. Everything else is identical.
export default function SetupMyHomeScreen({ onSaved }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();

  const [propertyName, setPropertyName] = useState('');
  const [unitNo, setUnitNo] = useState('');

  const [tenantName, setTenantName] = useState(loginData?.Name || '');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState(null);
  const [tenantType, setTenantType] = useState('');
  const [religion, setReligion] = useState('');

  const [startDate, setStartDate] = useState(null);
  const [advancePayment, setAdvancePayment] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [policeForm, setPoliceForm] = useState(null);
  const [agreementForm, setAgreementForm] = useState(null);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [search, setSearch] = useState('');

  const scrollRef = useRef(null);
  const viewportRef = useRef(0);
  const inputRefs = useRef({});

  function fieldRef(key) {
    if (!inputRefs.current[key]) inputRefs.current[key] = { current: null };
    return inputRefs.current[key];
  }

  function revealInput(ref) {
    const scrollNode = findNodeHandle(scrollRef.current);
    const inputNode = findNodeHandle(ref?.current);
    if (!scrollNode || !inputNode) return;

    UIManager.measureLayout(
      inputNode,
      scrollNode,
      () => {},
      (x, y, w, h) => {
        const visible = viewportRef.current;
        if (visible <= 0) return;
        const target = y + h + 16 - visible;
        if (target > 0) scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    );
  }

  function focusProps(key) {
    const ref = fieldRef(key);
    return {
      ref,
      onFocus: () => {
        setTimeout(() => revealInput(ref), 250);
      },
    };
  }

  function openDropdown(key) {
    Keyboard.dismiss();
    setSearch('');
    setActiveDropdown(key);
  }

  function closeDropdown() {
    Keyboard.dismiss();
    setSearch('');
    setActiveDropdown(null);
  }

  const dropdownConfig = {
    tenantType: {
      label: t('addTenant.type'),
      hint: t('addTenant.typeHint'),
      options: TENANT_TYPE_OPTIONS.map((o) => o.value),
      labelFor: (value) => t(TENANT_TYPE_OPTIONS.find((o) => o.value === value)?.labelKey || value),
      value: tenantType,
      onSelect: setTenantType,
    },
    religion: {
      label: t('addTenant.religion'),
      hint: t('addTenant.religionHint'),
      options: RELIGION_OPTIONS.map((o) => o.value),
      labelFor: (value) => t(RELIGION_OPTIONS.find((o) => o.value === value)?.labelKey || value),
      value: religion,
      onSelect: setReligion,
    },
  }[activeDropdown];

  const optionLabel = (option) => (dropdownConfig?.labelFor ? dropdownConfig.labelFor(option) : option);

  const filteredOptions = dropdownConfig
    ? dropdownConfig.options.filter((option) => optionLabel(option).toLowerCase().includes(search.toLowerCase()))
    : [];

  const filteredCountries = (() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.dialCode.includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  })();

  function openCountryPicker() {
    Keyboard.dismiss();
    setCountrySearch('');
    setCountryPickerOpen(true);
  }

  function handleSelectCountry(item) {
    setCountry(item);
    setCountryPickerOpen(false);
  }

  const [activeDateField, setActiveDateField] = useState(null);
  const activeDateValue = (activeDateField === 'dob' && dob) || (activeDateField === 'startDate' && startDate) || new Date();

  function applyDate(field, date) {
    if (field === 'dob') setDob(date);
    if (field === 'startDate') setStartDate(date);
  }

  function handleDateChange(event, selectedDate) {
    const field = activeDateField;
    if (event.type === 'dismissed' || !selectedDate) return;
    applyDate(field, selectedDate);
  }

  function openDatePicker(field, currentValue) {
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue || new Date(),
        mode: 'date',
        display: 'default',
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) applyDate(field, selectedDate);
        },
      });
      return;
    }
    setActiveDateField(field);
  }

  async function pickFile(setter) {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) setter(asset.name);
  }

  async function handleSubmit() {
    if (!propertyName.trim() || !tenantName.trim() || !phone.trim()) {
      setError('Property name, your name, and phone are required.');
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: 'Property name, your name, and phone are required.',
      });
      return;
    }

    setError('');
    Keyboard.dismiss();
    setSaving(true);

    try {
      const response = await fetch(`${config.BMS_API}api/AddTenantHome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          UId: loginData?.Id,
          PropertyNameText: propertyName,
          UnitNoText: unitNo,
          TenantName: tenantName,
          NID: nid,
          TenantPhone: buildFullPhone(country.dialCode, phone),
          TenantEmail: email,
          DOB: dob,
          TenantType: tenantType,
          Religion: religion,
          StartDate: startDate,
          Advance: advancePayment ? Number(advancePayment) : null,
          MonthlyAmount: monthlyAmount ? Number(monthlyAmount) : null,
          PoliceForm: policeForm,
          AgreementForm: agreementForm,
          EName: contactName,
          EPhone: contactPhone,
          ERelation: contactRelation,
          EAddress: contactAddress,
          EntryBy: loginData?.Name || loginData?.Phone || '',
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Could not save your home.');
      }
      onSaved?.();
    } catch (err) {
      setModal({ type: 'error', title: 'Could Not Save', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onLayout={(e) => { viewportRef.current = e.nativeEvent.layout.height; }}
      >
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="home-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>SET UP YOUR HOME</Text>
            <Text style={styles.title}>Where do you live?</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#d92d20" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.groupHeading}>YOUR HOME</Text>

          <Text style={styles.label}>Property Name</Text>
          <TextInput
            {...focusProps('propertyName')}
            style={styles.input}
            placeholder="e.g. Rahman Tower"
            placeholderTextColor={colors.muted}
            value={propertyName}
            onChangeText={(v) => { setPropertyName(v); if (error) setError(''); }}
          />

          <Text style={styles.label}>Unit / Flat No.</Text>
          <TextInput
            {...focusProps('unitNo')}
            style={styles.input}
            placeholder="e.g. B3"
            placeholderTextColor={colors.muted}
            value={unitNo}
            onChangeText={setUnitNo}
          />

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>YOUR DETAILS</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            {...focusProps('tenantName')}
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={colors.muted}
            value={tenantName}
            onChangeText={(v) => { setTenantName(v); if (error) setError(''); }}
          />

          <Text style={styles.label}>NID</Text>
          <TextInput
            {...focusProps('nid')}
            style={styles.input}
            placeholder="National ID number"
            placeholderTextColor={colors.muted}
            value={nid}
            onChangeText={setNid}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Phone</Text>
          <View style={styles.phoneFieldRow}>
            <TouchableOpacity style={styles.countryButtonSmall} onPress={openCountryPicker} activeOpacity={0.7}>
              <Text style={styles.countryFlagSmall}>{country.flag}</Text>
              <Text style={styles.countryDialCodeSmall}>{country.dialCode}</Text>
            </TouchableOpacity>
            <TextInput
              {...focusProps('phone')}
              style={[styles.input, styles.phoneInputSmall]}
              placeholder="Phone number"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={(v) => { setPhone(v); if (error) setError(''); }}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>
            Email <Text style={styles.labelSoft}>{t('form.optional')}</Text>
          </Text>
          <TextInput
            {...focusProps('email')}
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => openDatePicker('dob', dob)} activeOpacity={0.7}>
            <Text style={dob ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {dob ? formatDate(dob) : t('form.selectDate')}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.type')}</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('tenantType')} activeOpacity={0.7}>
                <Text style={tenantType ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                  {tenantType
                    ? t(TENANT_TYPE_OPTIONS.find((o) => o.value === tenantType)?.labelKey || tenantType)
                    : t('addTenant.selectType')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.religion')}</Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown('religion')} activeOpacity={0.7}>
                <Text style={religion ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                  {religion
                    ? t(RELIGION_OPTIONS.find((o) => o.value === religion)?.labelKey || religion)
                    : t('addTenant.selectReligion')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>LEASE & PAYMENT</Text>

          <Text style={styles.label}>Move-in Date</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => openDatePicker('startDate', startDate)} activeOpacity={0.7}>
            <Text style={startDate ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
              {startDate ? formatDate(startDate) : t('form.selectDate')}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.advance')}</Text>
              <TextInput
                {...focusProps('advance')}
                style={styles.input}
                placeholder={t('addTenant.advancePlaceholder')}
                placeholderTextColor={colors.muted}
                value={advancePayment}
                onChangeText={setAdvancePayment}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.monthly')}</Text>
              <TextInput
                {...focusProps('monthly')}
                style={styles.input}
                placeholder={t('addTenant.monthlyPlaceholder')}
                placeholderTextColor={colors.muted}
                value={monthlyAmount}
                onChangeText={setMonthlyAmount}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>
            {t('addTenant.groupDocuments')} <Text style={styles.groupHeadingSoft}>{t('form.optional')}</Text>
          </Text>

          <Text style={styles.label}>{t('addTenant.policeForm')}</Text>
          <TouchableOpacity style={styles.fileButton} onPress={() => pickFile(setPoliceForm)} activeOpacity={0.7}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
            </View>
            <Text style={policeForm ? styles.fileValue : styles.dropdownPlaceholder} numberOfLines={1}>
              {policeForm || t('form.chooseFile')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>{t('addTenant.agreementForm')}</Text>
          <TouchableOpacity style={styles.fileButton} onPress={() => pickFile(setAgreementForm)} activeOpacity={0.7}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
            </View>
            <Text style={agreementForm ? styles.fileValue : styles.dropdownPlaceholder} numberOfLines={1}>
              {agreementForm || t('form.chooseFile')}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>{t('addTenant.groupEmergency')}</Text>

          <Text style={styles.label}>{t('common.name')}</Text>
          <TextInput
            {...focusProps('contactName')}
            style={styles.input}
            placeholder={t('addTenant.contactNamePlaceholder')}
            placeholderTextColor={colors.muted}
            value={contactName}
            onChangeText={setContactName}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('common.phone')}</Text>
              <TextInput
                {...focusProps('contactPhone')}
                style={styles.input}
                placeholder={t('addTenant.phonePlaceholder')}
                placeholderTextColor={colors.muted}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.relation')}</Text>
              <TextInput
                {...focusProps('contactRelation')}
                style={styles.input}
                placeholder={t('addTenant.relationPlaceholder')}
                placeholderTextColor={colors.muted}
                value={contactRelation}
                onChangeText={setContactRelation}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('common.address')}</Text>
          <TextInput
            {...focusProps('contactAddress')}
            style={[styles.input, styles.textArea]}
            placeholder={t('addTenant.contactAddressPlaceholder')}
            placeholderTextColor={colors.muted}
            value={contactAddress}
            onChangeText={setContactAddress}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitLabel}>Save My Home</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={!!activeDropdown} transparent animationType="slide" statusBarTranslucent onRequestClose={closeDropdown}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.overlay} onPress={closeDropdown}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              {dropdownConfig ? (
                <>
                  <View style={styles.sheetGrabber} />
                  <Text style={styles.sheetTitle}>{dropdownConfig.label}</Text>
                  <Text style={styles.sheetSub}>{dropdownConfig.hint}</Text>

                  <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color={colors.muted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={`${dropdownConfig.label.toLowerCase()} ${t('form.searchPrefix')}…`}
                      placeholderTextColor={colors.muted}
                      value={search}
                      onChangeText={setSearch}
                      returnKeyType="search"
                    />
                    {search.length > 0 && (
                      <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView
                    style={styles.optionsScroll}
                    contentContainerStyle={styles.optionsScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredOptions.length === 0 ? (
                      <Text style={styles.emptyText}>{t('form.noMatches')}</Text>
                    ) : (
                      filteredOptions.map((option) => {
                        const active = dropdownConfig.value === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.optionRow, active && styles.optionRowActive]}
                            onPress={() => { dropdownConfig.onSelect(option); closeDropdown(); }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
                              {optionLabel(option)}
                            </Text>
                            {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {activeDateField ? (
        <DateTimePicker
          value={activeDateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => setModal(null)}
        onRequestClose={() => setModal(null)}
      />

      <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setCountryPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Select Country</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code"
                placeholderTextColor={colors.muted}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus
              />
              {countrySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCountrySearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsScrollContent}
              initialNumToRender={20}
              windowSize={10}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('form.noMatches')}</Text>}
              renderItem={({ item }) => {
                const active = country.code === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => handleSelectCountry(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.countryFlagOption}>{item.flag}</Text>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.countryDialCodeOption}>{item.dialCode}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 24, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap: { width: 44, height: 44, borderRadius: 5, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontFamily: 'Manrope-ExtraBold', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 22, fontFamily: 'Manrope-ExtraBold', marginTop: 3 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3f2',
    borderWidth: 1, borderColor: '#fecdca', borderRadius: 5, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#912018' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 16 },
  groupHeading: { fontSize: 10, fontFamily: 'Manrope-ExtraBold', letterSpacing: 1, color: colors.muted, marginBottom: 14 },
  groupHeadingSoft: { fontFamily: 'Manrope-SemiBold', letterSpacing: 0, color: colors.muted, opacity: 0.7 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 18, marginBottom: 16, marginHorizontal: -16 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  label: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold', marginBottom: 7 },
  labelSoft: { fontFamily: 'Manrope-Medium', color: colors.muted },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14.5, fontFamily: 'Manrope-Medium', color: colors.text, marginBottom: 16,
  },
  textArea: { height: 82, textAlignVertical: 'top' },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  dropdownValue: { flex: 1, fontSize: 14.5, color: colors.text, fontFamily: 'Manrope-SemiBold' },
  dropdownPlaceholder: { flex: 1, fontSize: 14.5, fontFamily: 'Manrope-Regular', color: colors.muted },
  fileButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, backgroundColor: '#fafbfc', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  fileIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center' },
  fileValue: { flex: 1, fontSize: 14.5, color: colors.text, fontFamily: 'Manrope-SemiBold' },
  actionBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.65 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  sheetGrabber: { width: 38, height: 4, borderRadius: 99, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: colors.text, marginBottom: 4 },
  sheetSub: { fontSize: 12, fontFamily: 'Manrope-Medium', color: colors.muted, marginBottom: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 12,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fafbfc',
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Medium', color: colors.text, padding: 0 },
  optionsScroll: { flexGrow: 0, maxHeight: 320 },
  optionsScrollContent: { paddingBottom: 4 },
  emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Medium', paddingHorizontal: 4, paddingVertical: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  optionLabel: { flex: 1, fontSize: 14.5, color: colors.text, fontFamily: 'Manrope-Bold' },
  optionLabelActive: { color: colors.primary },
  phoneFieldRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  countryButtonSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, backgroundColor: '#fafbfc', paddingHorizontal: 14, minWidth: 88, justifyContent: 'center',
  },
  countryFlagSmall: { fontSize: 15 },
  countryDialCodeSmall: { fontSize: 14, color: colors.text, fontFamily: 'Manrope-SemiBold' },
  phoneInputSmall: { flex: 1, marginBottom: 0 },
  countryFlagOption: { fontSize: 18 },
  countryDialCodeOption: { fontSize: 12.5, color: colors.muted, fontFamily: 'Manrope-SemiBold', marginRight: 2 },
});