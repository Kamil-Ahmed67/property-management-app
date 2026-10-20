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
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import Stepper from '../components/Stepper';
import StatusModal from '../components/StatusModal';
import { colors } from '../theme';
import config from '../config';

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

const FLOOR_OPTIONS = [
  'Ground Floor',
  ...Array.from({ length: 50 }, (_, i) => `${ordinalSuffix(i + 1)} Floor`),
];

const TENANT_ID = 'PropHub';

function initials(value) {
  if (!value) return '—';
  const parts = String(value).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export default function AddPropertyDetailsScreen({ presetPropertyId, onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  // True whenever this screen was opened WITH a specific property in mind
  // (e.g. via "Add Details" on a property card) — locks the Property field
  // so the user can't accidentally attach details to the wrong building.
  const isPropertyLocked = !!presetPropertyId;

  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [flatName, setFlatName] = useState('');
  const [floor, setFloor] = useState('');
  const [rooms, setRooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [balconies, setBalconies] = useState(0);
  const [meterNo, setMeterNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [search, setSearch] = useState('');

  const scrollRef = useRef(null);
  const phone = loginData?.Phone || loginData?.phone || '';

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetMyPropertyList?phone=${encodeURIComponent(phone)}&uId=${loginData?.Id}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          const list = data.data || [];
          setProperties(list);
          if (presetPropertyId) {
            const match = list.find((p) => p.Id === presetPropertyId);
            if (match) setSelectedProperty(match);
          }
        }
      } catch (err) {
        console.log('Failed to load property list:', err.message);
      } finally {
        setLoadingProperties(false);
      }
    })();
  }, [phone, presetPropertyId]);

  const dropdownConfig = {
    property: {
      label: t('addDetails.property'),
      hint: t('addDetails.propertyHint'),
      options: properties.map((p) => p.Name),
      value: selectedProperty?.Name || '',
      onSelect: (name) => {
        const match = properties.find((p) => p.Name === name);
        setSelectedProperty(match || null);
      },
    },
    floor: {
      label: t('addDetails.floor'),
      hint: t('addDetails.floorHint'),
      options: FLOOR_OPTIONS,
      value: floor,
      onSelect: setFloor,
    },
  }[activeDropdown];

  const filteredOptions = dropdownConfig
    ? dropdownConfig.options.filter((option) =>
        option.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const filled = [selectedProperty, flatName.trim(), floor, meterNo.trim()].filter(Boolean).length;

  function openDropdown(key) {
    // Locked Property field never opens its own picker.
    if (key === 'property' && isPropertyLocked) return;
    Keyboard.dismiss();
    setSearch('');
    setActiveDropdown(key);
  }

  function closeDropdown() {
    Keyboard.dismiss();
    setSearch('');
    setActiveDropdown(null);
  }

  async function handleSave() {
    if (!selectedProperty || !flatName.trim() || !floor || !meterNo.trim()) {
      // FIX: translated message instead of hardcoded English
      setError(t('addDetails.validation'));
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('addDetails.validation'),
        actionLabel: t('form.gotIt'),
      });
      return;
    }

    // FIX: clear the banner once validation passes (it was being SET here before)
    setError('');
    Keyboard.dismiss();
    setSaving(true);

    const cleanFlatName = flatName.trim();
    const cleanMeterNo = meterNo.trim();

    try {
      // AvailabilityStatus is NOT sent — SP_Property QC3 always stores 'Vacant'.
      const response = await fetch(`${config.BMS_API}api/AddPropertyDetails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          UId: loginData?.Id,
          Phone: selectedProperty.Phone,
          PropertyId: selectedProperty.Id,
          FlatName: cleanFlatName,
          Floor: floor,
          Room: rooms,
          Bathroom: bathrooms,
          Balcony: balconies,
          MeterNo: cleanMeterNo,
          EntryBy: loginData?.Name || loginData?.Phone || '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('addDetails.saveFailed'));
      }

      setModal({
        type: 'success',
        title: t('addDetails.savedTitle'),
        message: `${selectedProperty.Name} — ${cleanFlatName} (${floor})\n${t('addDetails.rooms')}: ${rooms} · ${t('addDetails.bathrooms')}: ${bathrooms} · ${t('addDetails.balconies')}: ${balconies}\n${t('addDetails.meterNo')}: ${cleanMeterNo}`,
        actionLabel: t('form.done'),
        onAction: () => onNavigate?.('manage-building'),
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('addDetails.saveFailed'),
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
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>{t('form.eyebrow')}</Text>
            <Text style={styles.title}>{t('addDetails.title')}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(filled / 4) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{filled} {t('form.of')} 4</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#d92d20" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.groupHeading}>{t('addDetails.groupLocation')}</Text>

          <Text style={styles.label}>{t('addDetails.property')}</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, isPropertyLocked && styles.dropdownButtonLocked]}
            onPress={() => !loadingProperties && openDropdown('property')}
            activeOpacity={isPropertyLocked ? 1 : 0.7}
            disabled={isPropertyLocked}
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
            ) : isPropertyLocked ? (
              <Ionicons name="lock-closed" size={16} color={colors.muted} />
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            )}
          </TouchableOpacity>
          {isPropertyLocked ? (
            <Text style={styles.lockedHint}>{t('addDetails.lockedHint')}</Text>
          ) : null}

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addDetails.flatName')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat A"
                placeholderTextColor={colors.muted}
                value={flatName}
                onChangeText={(text) => {
                  setFlatName(text);
                  if (error) setError('');
                }}
                returnKeyType="next"
              />
            </View>

            <View style={styles.rowItem}>
              <Text style={styles.label}>{t('addDetails.floor')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => openDropdown('floor')}
                activeOpacity={0.7}
              >
                <Text
                  style={floor ? styles.dropdownValue : styles.dropdownPlaceholder}
                  numberOfLines={1}
                >
                  {floor || t('addDetails.selectFloor')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>
            {t('addDetails.groupLayout')}{' '}
            <Text style={styles.groupHeadingSoft}>{t('form.optional')}</Text>
          </Text>

          <View style={styles.stepperGroup}>
            <Stepper
              label={t('addDetails.room')}
              value={rooms}
              onChange={setRooms}
              containerStyle={styles.stepperItem}
            />
            <Stepper
              label={t('addDetails.bathroom')}
              value={bathrooms}
              onChange={setBathrooms}
              containerStyle={styles.stepperItem}
            />
            <Stepper
              label={t('addDetails.balcony')}
              value={balconies}
              onChange={setBalconies}
              containerStyle={styles.stepperItem}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.groupHeading}>{t('addDetails.groupUtility')}</Text>

          <Text style={styles.label}>{t('addDetails.meterNo')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter meter number"
            placeholderTextColor={colors.muted}
            value={meterNo}
            onChangeText={(text) => {
              setMeterNo(text);
              if (error) setError('');
            }}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        <Text style={styles.footnote}>{t('addDetails.footnote')}</Text>
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
            <Text style={styles.submitLabel}>{t('addDetails.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="slide"
        onRequestClose={closeDropdown}
        statusBarTranslucent
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
                    placeholder={`${t('form.searchPrefix')} ${dropdownConfig.label.toLowerCase()}…`}
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
                            <Text style={styles.optionBadgeText}>{initials(option)}</Text>
                          </View>
                          <Text
                            style={[styles.optionLabel, active && styles.optionLabelActive]}
                            numberOfLines={1}
                          >
                            {option}
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
    paddingBottom: 20,
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
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    fontSize: 14.5,
    fontFamily: 'Manrope-Medium',
    color: colors.text,
    marginBottom: 16,
  },
  dropdownButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  dropdownButtonLocked: {
    backgroundColor: colors.border,
    opacity: 0.85,
    marginBottom: 6,
  },
  lockedHint: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    fontStyle: 'italic',
    marginBottom: 16,
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
  // FIX: single definition (was declared twice)
  stepperGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperItem: {
    flex: 1,
    marginBottom: 16,
  },
  footnote: {
    marginTop: 12,
    fontSize: 11.5,
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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