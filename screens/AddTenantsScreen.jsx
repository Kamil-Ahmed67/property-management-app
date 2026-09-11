import { useContext, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../providers/LanguageProvider';
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
  findNodeHandle,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../providers/AuthProvider';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

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

function initials(value) {
  if (!value) return '—';
  const parts = String(value).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export default function AddTenantsScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const [propertyDetailsList, setPropertyDetailsList] = useState([]);
  const [loadingPropertyDetails, setLoadingPropertyDetails] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [propDetailsId, setPropDetailsId] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState(null);
  const [tenantType, setTenantType] = useState('');
  const [religion, setReligion] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
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
  // Tracks the ScrollView's OWN visible height. This is the key trick:
  // once Android is set to `resize` mode (see app.json) and iOS uses
  // KeyboardAvoidingView, the ScrollView's box literally shrinks when the
  // keyboard opens, and onLayout fires again with the new smaller height.
  // No manual keyboard-height math needed anywhere.
  const viewportRef = useRef(0);
  const inputRefs = useRef({});
  const modalTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
  }, []);

  const phoneUser = loginData?.Phone || loginData?.phone || '';

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetMyPropertyList?phone=${encodeURIComponent(phoneUser)}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          setProperties(data.data || []);
        }
      } catch (err) {
        console.log('Failed to load property list:', err.message);
      } finally {
        setLoadingProperties(false);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedFloor('');
    setSelectedFlat('');
    setPropDetailsId(null);
    setPropertyDetailsList([]);

    if (!selectedProperty) return;

    (async () => {
      setLoadingPropertyDetails(true);
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetPropertyDetailsList?propertyId=${selectedProperty.Id}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          setPropertyDetailsList(data.data || []);
        }
      } catch (err) {
        console.log('Failed to load property details list:', err.message);
      } finally {
        setLoadingPropertyDetails(false);
      }
    })();
  }, [selectedProperty]);

  useEffect(() => {
    if (!selectedFloor || !selectedFlat) {
      setPropDetailsId(null);
      return;
    }
    const match = propertyDetailsList.find(
      (d) => d.Floor === selectedFloor && d.FlatName === selectedFlat
    );
    setPropDetailsId(match ? match.Id : null);
  }, [selectedFloor, selectedFlat, propertyDetailsList]);

  const uniqueFloors = [...new Set(propertyDetailsList.map((d) => d.Floor))];
  const flatsForSelectedFloor = propertyDetailsList
    .filter((d) => d.Floor === selectedFloor)
    .map((d) => d.FlatName);

  const dropdownConfig = {
      property: {
      label: t('addDetails.property'),
      hint: t('addTenant.propertyHint'),
      options: properties.map((p) => p.Name),
      value: selectedProperty?.Name || '',
      onSelect: (optionName) => {
        const match = properties.find((p) => p.Name === optionName);
        setSelectedProperty(match || null);
      },
    },
    floor: {
      label: t('addDetails.floor'),
      hint: t('addTenant.floorHint'),
      options: uniqueFloors,
      value: selectedFloor,
      onSelect: (value) => {
        setSelectedFloor(value);
        setSelectedFlat('');
      },
    },
    flat: {
      label: t('addTenant.flat'),
      hint: t('addTenant.flatHint'),
      options: flatsForSelectedFloor,
      value: selectedFlat,
      onSelect: setSelectedFlat,
    },
       tenantType: {
      label: t('addTenant.type'),
      hint: t('addTenant.typeHint'),
      options: TENANT_TYPE_OPTIONS.map((o) => o.value),
      labelFor: (value) =>
        t(TENANT_TYPE_OPTIONS.find((o) => o.value === value)?.labelKey || value),
      value: tenantType,
      onSelect: setTenantType,
    },
    religion: {
      label: t('addTenant.religion'),
      hint: t('addTenant.religionHint'),
      options: RELIGION_OPTIONS.map((o) => o.value),
      labelFor: (value) =>
        t(RELIGION_OPTIONS.find((o) => o.value === value)?.labelKey || value),
      value: religion,
      onSelect: setReligion,
    },
  }[activeDropdown];

   const optionLabel = (option) =>
    dropdownConfig?.labelFor ? dropdownConfig.labelFor(option) : option;

  const filteredOptions = dropdownConfig
    ? dropdownConfig.options.filter((option) =>
        optionLabel(option).toLowerCase().includes(search.toLowerCase())
      )
    : [];
  const filled = [selectedProperty, selectedFloor, selectedFlat, tenantName.trim(), phone.trim()]
    .filter(Boolean).length;

  /**
   * Scrolls the focused input so its whole box sits inside whatever the
   * ScrollView's CURRENT visible height is. viewportRef.current is always
   * up to date because onLayout re-fires whenever the container is
   * resized by the keyboard (Android resize mode / iOS KeyboardAvoidingView).
   */
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

  function fieldRef(key) {
    if (!inputRefs.current[key]) inputRefs.current[key] = { current: null };
    return inputRefs.current[key];
  }

  function focusProps(key) {
    const ref = fieldRef(key);
    return {
      ref,
      // Wait for the keyboard-open animation + the resulting layout resize
      // to actually finish before measuring, otherwise we measure against
      // the OLD (taller) viewport and scroll to the wrong place.
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

  const [activeDateField, setActiveDateField] = useState(null);
  const activeDateValue =
    (activeDateField === 'dob' && dob) ||
    (activeDateField === 'startDate' && startDate) ||
    (activeDateField === 'endDate' && endDate) ||
    new Date();

  function handleDateChange(event, selectedDate) {
    const field = activeDateField;
    if (Platform.OS === 'android') {
      setActiveDateField(null);
    }
    if (event.type === 'dismissed' || !selectedDate) return;
    if (field === 'dob') setDob(selectedDate);
    if (field === 'startDate') setStartDate(selectedDate);
    if (field === 'endDate') setEndDate(selectedDate);
  }

  async function pickFile(setter) {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) setter(asset.name);
  }

  async function handleSave() {
    if (!selectedProperty || !propDetailsId || !tenantName.trim() || !phone.trim()) {
      setError(t('addTenant.validation'));
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('addTenant.validation'),
        actionLabel: t('form.gotIt'),
      });
      return;
    }

    setError('');
    Keyboard.dismiss();
    setSaving(true);

    try {
      const response = await fetch(`${config.BMS_API}api/AddTenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          Phone: loginData?.Phone || loginData?.phone || '',
          PropertyId: selectedProperty.Id,
          PropDetailsId: propDetailsId,
          TenantName: tenantName,
          NID: nid,
          TenantPhone: phone,
          TenantEmail: email,
          DOB: dob,
          TenantType: tenantType,
          Religion: religion,
          StartDate: startDate,
          EndDate: endDate,
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
       throw new Error((data && data.message) || t('addTenant.saveFailed'));
      }
      const savedTenantName = tenantName;
      const savedPropertyName = selectedProperty.Name;
      const savedFlat = selectedFlat;
      const savedFloor = selectedFloor;
      setSelectedProperty(null);
      setNid('');
      setPhone('');
      setEmail('');
      setDob(null);
      setTenantType('');
      setReligion('');
      setStartDate(null);
      setEndDate(null);
      setAdvancePayment('');
      setMonthlyAmount('');
      setPoliceForm(null);
      setAgreementForm(null);
      setContactName('');
      setContactPhone('');
      setContactRelation('');
      setContactAddress('');
      setModal({
        type: 'success',
        title: t('addTenant.savedTitle'),
        message: `${savedTenantName} has been added to ${savedPropertyName}, ${savedFlat} (${savedFloor}).`,
      });
      modalTimeoutRef.current = setTimeout(() => {
        setModal(null);
        onNavigate?.('tenant-list');
      }, 1400);
    } catch (err) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('addTenant.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // Android handles the resize natively via app.json's
      // softwareKeyboardLayoutMode: "resize" — no offset needed there.
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onLayout={(e) => {
          viewportRef.current = e.nativeEvent.layout.height;
        }}
      >
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-add-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>{t('form.eyebrow')}</Text>
            <Text style={styles.title}>{t('addTenant.title')}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(filled / 5) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{filled} {t('form.of')} 5</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#d92d20" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.groupHeading}>{t('addTenant.groupUnit')}</Text>
          <Text style={styles.label}>{t('addDetails.property')}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => !loadingProperties && openDropdown('property')}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>{initials(selectedProperty?.Name)}</Text>
              </View>
              <Text
                style={selectedProperty ? styles.dropdownValue : styles.dropdownPlaceholder}
                numberOfLines={1}
              >
                {loadingProperties
                  ? t('addDetails.loadingProperties')
                  : selectedProperty?.Name || t('addDetails.selectProperty')}
              </Text>
            </View>
            {loadingProperties ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            )}
          </TouchableOpacity>

          {selectedProperty ? (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>{t('addDetails.floor')}</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    loadingPropertyDetails && styles.dropdownButtonDisabled,
                  ]}
                  onPress={() => !loadingPropertyDetails && openDropdown('floor')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={selectedFloor ? styles.dropdownValue : styles.dropdownPlaceholder}
                    numberOfLines={1}
                  >
                  {loadingPropertyDetails ? t('form.loading') : selectedFloor || t('addDetails.selectFloor')}
                  </Text>
                  {loadingPropertyDetails ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color={colors.muted} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.rowItem}>
                <Text style={styles.label}>{t('addTenant.flat')}</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, !selectedFloor && styles.dropdownButtonDisabled]}
                  onPress={() => selectedFloor && openDropdown('flat')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={selectedFlat ? styles.dropdownValue : styles.dropdownPlaceholder}
                    numberOfLines={1}
                  >
                 {selectedFlat || (selectedFloor ? t('addTenant.selectFlat') : t('addTenant.floorFirst'))}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>{t('addTenant.groupTenant')}</Text>
          <Text style={styles.label}>{t('addTenant.name')}</Text>
          <TextInput
            {...focusProps('tenantName')}
            style={styles.input}
           placeholder={t('addTenant.namePlaceholder')}
            placeholderTextColor={colors.muted}
            value={tenantName}
            onChangeText={(t) => {
              setTenantName(t);
              if (error) setError('');
            }}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.nid')}</Text>
              <TextInput
                {...focusProps('nid')}
                style={styles.input}
                placeholder={t('addTenant.nidPlaceholder')}
                placeholderTextColor={colors.muted}
                value={nid}
                onChangeText={setNid}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowItem}>
               <Text style={styles.label}>{t('common.phone')}</Text>
              <TextInput
                {...focusProps('phone')}
                style={styles.input}
                placeholder={t('addTenant.phonePlaceholder')}
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (error) setError('');
                }}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>
            {t('common.email')} <Text style={styles.labelSoft}>{t('form.optional')}</Text>
          </Text>
          <TextInput
            {...focusProps('email')}
            style={styles.input}
            placeholder={t('addTenant.emailPlaceholder')}
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('addTenant.dob')}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              Keyboard.dismiss();
              setActiveDateField('dob');
            }}
            activeOpacity={0.7}
          >
            <Text style={dob ? styles.dropdownValue : styles.dropdownPlaceholder}>
               {dob ? formatDate(dob) : t('form.selectDate')}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.rowItem}>
                <Text style={styles.label}>{t('addTenant.type')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('tenantType')}
                activeOpacity={0.7}
              >
                <Text
                  style={tenantType ? styles.dropdownValue : styles.dropdownPlaceholder}
                  numberOfLines={1}
                >
                  {tenantType
                    ? t(TENANT_TYPE_OPTIONS.find((o) => o.value === tenantType)?.labelKey || tenantType)
                    : t('addTenant.selectType')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
             <Text style={styles.label}>{t('addTenant.religion')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('religion')}
                activeOpacity={0.7}
              >
                <Text
                  style={religion ? styles.dropdownValue : styles.dropdownPlaceholder}
                  numberOfLines={1}
                >
                   {religion
                    ? t(RELIGION_OPTIONS.find((o) => o.value === religion)?.labelKey || religion)
                    : t('addTenant.selectReligion')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />
            <Text style={styles.groupHeading}>{t('addTenant.groupTenancy')}</Text>
          <View style={styles.row}>
            <View style={styles.rowItem}>
             <Text style={styles.label}>{t('addTenant.startDate')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveDateField('startDate');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={startDate ? styles.dropdownValue : styles.dropdownPlaceholder}
                  numberOfLines={1}
                >
                   {startDate ? formatDate(startDate) : t('form.selectDate')}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addTenant.endDate')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveDateField('endDate');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={endDate ? styles.dropdownValue : styles.dropdownPlaceholder}
                  numberOfLines={1}
                >
                 {startDate ? formatDate(startDate) : t('form.selectDate')}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

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
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => pickFile(setPoliceForm)}
            activeOpacity={0.7}
          >
            <View style={styles.fileIcon}>
              <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
            </View>
            <Text
              style={policeForm ? styles.fileValue : styles.dropdownPlaceholder}
              numberOfLines={1}
            >
              {policeForm || t('form.chooseFile')}
            </Text>
          </TouchableOpacity>

           <Text style={styles.label}>{t('addTenant.agreementForm')}</Text>
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => pickFile(setAgreementForm)}
            activeOpacity={0.7}
          >
            <View style={styles.fileIcon}>
              <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
            </View>
            <Text
              style={agreementForm ? styles.fileValue : styles.dropdownPlaceholder}
              numberOfLines={1}
            >
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

        <Text style={styles.footnote}>
          Tenants are linked to the selected flat and appear on its tenancy record.
        </Text>
      </ScrollView>

      {/* No longer position:absolute. As a normal flex sibling of the
          ScrollView, this naturally sits right above the keyboard because
          the ScrollView above it shrinks to fill the remaining space. */}
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
         <Text style={styles.submitLabel}>{t('addTenant.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeDropdown}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                    showsVerticalScrollIndicator
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
                            onPress={() => {
                              dropdownConfig.onSelect(option);
                              closeDropdown();
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.optionBadge}>
                           <Text style={styles.optionBadgeText}>{initials(optionLabel(option))}</Text>
                            </View>
                                                       <Text
                              style={[styles.optionLabel, active && styles.optionLabelActive]}
                              numberOfLines={1}
                            >
                              {optionLabel(option)}
                            </Text>
                            {active ? (
                              <Ionicons name="checkmark" size={18} color={colors.primary} />
                            ) : null}
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
        actionLabel={modal?.actionLabel || (modal?.type === 'success' ? t('form.ok') : t('form.done'))}
        onAction={() => {
          if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
          const action = modal?.onAction;
          const wasSuccess = modal?.type === 'success';
          setModal(null);
          action?.();
          if (wasSuccess && !action) onNavigate?.('tenant-list');
        }}
        onRequestClose={() => setModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    marginTop: 3,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 18,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: colors.muted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3f2',
    borderWidth: 1,
    borderColor: '#fecdca',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#912018',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 16,
  },
  groupHeading: {
    fontSize: 10,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 14,
  },
  groupHeadingSoft: {
    fontFamily: 'Manrope-SemiBold',
    letterSpacing: 0,
    color: colors.muted,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 18,
    marginBottom: 16,
    marginHorizontal: -16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    marginBottom: 7,
  },
  labelSoft: {
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    fontFamily: 'Manrope-Medium',
    color: colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 82,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-SemiBold',
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Manrope-Regular',
    color: colors.muted,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  fileIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileValue: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-SemiBold',
  },
  footnote: {
    marginTop: 12,
    fontSize: 11.5,
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetGrabber: {
    width: 38,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: colors.text,
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fafbfc',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: colors.text,
    padding: 0,
  },
  optionsScroll: {
    flexGrow: 0,
    maxHeight: 320,
  },
  optionsScrollContent: {
    paddingBottom: 4,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-ExtraBold',
    color: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-Bold',
  },
  optionLabelActive: {
    color: colors.primary,
  },
});