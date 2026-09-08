import { useContext, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import StatusModal from '../components/StatusModal';
import { colors } from '../theme';
import config from '../config';

// `value` is sent to the API and stored — it stays English so existing
// records keep matching. Only the visible label/hint translate.
const PROPERTY_TYPES = [
  { value: 'Land', initial: 'LD', labelKey: 'propertyType.land', hintKey: 'propertyType.land.hint' },
  { value: 'Flat', initial: 'FL', labelKey: 'propertyType.flat', hintKey: 'propertyType.flat.hint' },
  { value: 'Plot', initial: 'PL', labelKey: 'propertyType.plot', hintKey: 'propertyType.plot.hint' },
  { value: 'Store', initial: 'ST', labelKey: 'propertyType.store', hintKey: 'propertyType.store.hint' },
  { value: 'Garage', initial: 'GR', labelKey: 'propertyType.garage', hintKey: 'propertyType.garage.hint' },
  { value: 'Market', initial: 'MK', labelKey: 'propertyType.market', hintKey: 'propertyType.market.hint' },
  { value: 'Showroom', initial: 'SR', labelKey: 'propertyType.showroom', hintKey: 'propertyType.showroom.hint' },
  { value: 'Office', initial: 'OF', labelKey: 'propertyType.office', hintKey: 'propertyType.office.hint' },
  { value: 'Studio', initial: 'SD', labelKey: 'propertyType.studio', hintKey: 'propertyType.studio.hint' },
  { value: 'Warehouse', initial: 'WH', labelKey: 'propertyType.warehouse', hintKey: 'propertyType.warehouse.hint' },
  { value: 'Car', initial: 'CR', labelKey: 'propertyType.car', hintKey: 'propertyType.car.hint' },
  { value: 'Other', initial: 'OT', labelKey: 'propertyType.other', hintKey: 'propertyType.other.hint' },
];
const TENANT_ID = 'PropHub';
const FIELD_KEYS = ['name', 'address', 'securityName', 'securityPhone', 'type'];

export default function AddPropertyScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [securityName, setSecurityName] = useState('');
  const [securityPhone, setSecurityPhone] = useState('');
  const [type, setType] = useState('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const scrollRef = useRef(null);
  const nameRef = useRef(null);
  const addressRef = useRef(null);
  const securityNameRef = useRef(null);
  const securityPhoneRef = useRef(null);

  const values = { name, address, securityName, securityPhone, type };
  const filled = FIELD_KEYS.filter((k) => String(values[k]).trim()).length;

  // Filter by the TRANSLATED label, not the raw English value, so search
  // works naturally in whichever language is active.
  const filteredTypes = useMemo(() => {
    const query = typeSearch.trim().toLowerCase();
    if (!query) return PROPERTY_TYPES;
    return PROPERTY_TYPES.filter((option) => t(option.labelKey).toLowerCase().includes(query));
  }, [typeSearch, t]);

  // Scrolls the focused input clear of the keyboard.
  function scrollToInput(ref) {
    const scrollNode = findNodeHandle(scrollRef.current);
    const inputNode = findNodeHandle(ref.current);
    if (!scrollNode || !inputNode) return;
    requestAnimationFrame(() => {
      UIManager.measureLayout(
        inputNode,
        scrollNode,
        () => {},
        (x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
        }
      );
    });
  }

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      setError(t('addProperty.validation'));
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('addProperty.validation'),
        actionLabel: t('form.gotIt'),
      });
      return;
    }

    setError('');
    Keyboard.dismiss();
    setSaving(true);

    try {
      const response = await fetch(`${config.BMS_API}api/AddProperty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          Phone: loginData?.Phone || loginData?.phone || '',
          Name: name,
          Address: address,
          SecurityName: securityName,
          SecurityPhone: securityPhone,
          Type: type,
          EntryBy: loginData?.Name || loginData?.Phone || '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('addProperty.saveFailed'));
      }

      const savedName = name;
      setName('');
      setAddress('');
      setSecurityName('');
      setSecurityPhone('');
      setType('');
      setModal({
        type: 'success',
        title: t('addProperty.savedTitle'),
        message: `"${savedName}"`,
        actionLabel: t('form.done'),
        onAction: () => onNavigate?.('manage-building'),
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('addProperty.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  }

  function selectType(value) {
    setType(value);
    closeTypeDropdown();
  }

  function openTypeDropdown() {
    Keyboard.dismiss();
    setTypeSearch('');
    setTypeDropdownOpen(true);
  }

  function closeTypeDropdown() {
    setTypeSearch('');
    setTypeDropdownOpen(false);
  }

  const selectedType = PROPERTY_TYPES.find((option) => option.value === type);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>{t('form.eyebrow')}</Text>
            <Text style={styles.title}>{t('addProperty.title')}</Text>
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
          <Text style={styles.groupHeading}>{t('addProperty.groupProperty')}</Text>

          <Text style={styles.label}>{t('addProperty.name')}</Text>
          <TextInput
            ref={nameRef}
            style={styles.input}
            placeholder={t('addProperty.namePlaceholder')}
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (error) setError('');
            }}
            onFocus={() => scrollToInput(nameRef)}
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
          />

          <Text style={styles.label}>{t('addProperty.address')}</Text>
          <TextInput
            ref={addressRef}
            style={[styles.input, styles.textArea]}
            placeholder={t('addProperty.addressPlaceholder')}
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              if (error) setError('');
            }}
            onFocus={() => scrollToInput(addressRef)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>
            {t('addProperty.groupSecurity')} <Text style={styles.groupHeadingSoft}>{t('form.optional')}</Text>
          </Text>

          <Text style={styles.label}>{t('addProperty.securityName')}</Text>
          <TextInput
            ref={securityNameRef}
            style={styles.input}
            placeholder={t('addProperty.securityNamePlaceholder')}
            placeholderTextColor={colors.muted}
            value={securityName}
            onChangeText={setSecurityName}
            onFocus={() => scrollToInput(securityNameRef)}
            returnKeyType="next"
            onSubmitEditing={() => securityPhoneRef.current?.focus()}
          />

          <Text style={styles.label}>{t('addProperty.securityPhone')}</Text>
          <TextInput
            ref={securityPhoneRef}
            style={styles.input}
            placeholder={t('addProperty.securityPhonePlaceholder')}
            placeholderTextColor={colors.muted}
            value={securityPhone}
            onChangeText={setSecurityPhone}
            onFocus={() => scrollToInput(securityPhoneRef)}
            keyboardType="phone-pad"
            returnKeyType="done"
          />

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>{t('addProperty.groupType')}</Text>

          <Text style={styles.label}>{t('addProperty.type')}</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={openTypeDropdown} activeOpacity={0.7}>
            <View style={styles.dropdownLeft}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>
                  {selectedType ? selectedType.initial : '—'}
                </Text>
              </View>
              <Text style={type ? styles.dropdownValue : styles.dropdownPlaceholder}>
                {selectedType ? t(selectedType.labelKey) : t('addProperty.selectType')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>{t('addProperty.footnote')}</Text>
      </ScrollView>

      {/* Sticky action bar — sits above the keyboard because it is inside KeyboardAvoidingView */}
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
            <Text style={styles.submitLabel}>{t('addProperty.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={typeDropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={closeTypeDropdown}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={closeTypeDropdown}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>{t('addProperty.type')}</Text>
            <Text style={styles.sheetSub}>{t('addProperty.sheetSub')}</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={`${t('form.searchPrefix')} ${t('addProperty.type').toLowerCase()}…`}
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
              contentContainerStyle={styles.optionsScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {filteredTypes.length === 0 ? (
                <Text style={styles.emptyText}>{t('form.noMatches')}</Text>
              ) : (
                filteredTypes.map((option) => {
                  const active = type === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.optionRow, active && styles.optionRowActive]}
                      onPress={() => selectType(option.value)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>{option.initial}</Text>
                      </View>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                          {t(option.labelKey)}
                        </Text>
                        <Text style={styles.optionHint}>{t(option.hintKey)}</Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
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
    paddingBottom: 28,
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
    borderRadius: 14,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 18,
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
  label: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    marginBottom: 7,
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownValue: {
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-SemiBold',
  },
  dropdownPlaceholder: {
    fontSize: 14.5,
    fontFamily: 'Manrope-Regular',
    color: colors.muted,
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
    paddingBottom: Platform.OS === 'ios' ? 22 : 16,
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
    paddingBottom: 34,
    maxHeight: '80%',
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
  optionsScroll: {
    flexGrow: 0,
  },
  optionsScrollContent: {
    paddingBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    paddingVertical: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
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
    fontSize: 12,
    fontFamily: 'Manrope-ExtraBold',
    color: colors.primary,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-Bold',
  },
  optionLabelActive: {
    color: colors.primary,
  },
  optionHint: {
    fontSize: 11.5,
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
    marginTop: 2,
  },
});