import { useContext, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  Modal, Pressable, FlatList, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { countries } from 'countries-list';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import config from '../../config';
import StatusModal from '../../components/StatusModal';
import { colors } from '../../theme';

const TENANT_ID = 'PropHub';

const COUNTRY_LIST = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    dialCode: `+${Array.isArray(data.phone) ? data.phone[0] : data.phone}`,
    flag: data.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_COUNTRY = COUNTRY_LIST.find((c) => c.code === 'BD') ?? COUNTRY_LIST[0];

// Same format the rest of the app stores phones in (+8801XXXXXXXXX), so the
// landlord's GetConnectionRequestsForLandlord (LandlordMobile = @LandlordMobile)
// actually finds this request.
function buildFullPhone(dialCode, localNumber) {
  const digitsOnly = localNumber.replace(/\D/g, '');
  const trimmed = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
  return `${dialCode}${trimmed}`;
}

const last10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

// The ONLY screen a tenant uses to link a home to a landlord — opened from
// the dashboard status banner, the home detail "Connect" button and the
// Residence History card. Sends a manual request for a self-added home
// (tblTenantHome row); it shows up on the landlord's Tenant Requests card.
// If this home already has a Pending request, the form is replaced by a
// notice so the same request can't be sent twice.
export default function SendLandlordRequestScreen({ home, onSent }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState(null);
  const [checkingPending, setCheckingPending] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(null);

  useEffect(() => {
    if (!loginData?.Id || !home?.Id) {
      setCheckingPending(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${config.BMS_API}api/GetConnectionRequestsForTenant?tenantUId=${loginData.Id}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          const found = (data.data || []).find(
            (r) => r.TenantHomeId === home.Id && r.Status === 'Pending'
          );
          setPendingRequest(found || null);
        }
      } catch (err) {
        console.log('Failed to check pending request:', err.message);
      } finally {
        setCheckingPending(false);
      }
    })();
  }, [loginData?.Id, home?.Id]);

  const filteredCountries = (() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  })();

  async function handleSend() {
    Keyboard.dismiss();
    const digits = landlordPhone.replace(/\D/g, '');
    if (digits.length < 6) {
      setModal({ type: 'error', title: t('form.missingInfo'), message: t('sendReq.phoneRequired') });
      return;
    }

    const fullPhone = buildFullPhone(country.dialCode, landlordPhone);
    if (last10(fullPhone) === last10(loginData?.Phone)) {
      setModal({ type: 'error', title: t('sendReq.failedTitle'), message: t('sendReq.ownNumber') });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${config.BMS_API}api/SendConnectionRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          TenantUId: loginData?.Id,
          TenantHomeId: home?.Id,
          LandlordMobile: fullPhone,
          MatchType: 'Manual',
          EntryBy: loginData?.Phone || String(loginData?.Id || ''),
          // Not stored yet — SendConnectionRequestBody has no field for it.
          // Picked up automatically once a Message property is added.
          Message: message.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('sendReq.failedMessage'));
      }
      setModal({ type: 'success', title: t('sendReq.sentTitle'), message: t('sendReq.sentMessage') });
    } catch (err) {
      setModal({ type: 'error', title: t('sendReq.failedTitle'), message: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>{t('sendReq.eyebrow')}</Text>
            <Text style={styles.title}>{t('sendReq.title')}</Text>
          </View>
        </View>

        <View style={styles.homeCard}>
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.homeName} numberOfLines={1}>{home?.DisplayPropertyName}</Text>
            {home?.DisplayUnitNo ? (
              <Text style={styles.homeUnit} numberOfLines={1}>{home.DisplayUnitNo}</Text>
            ) : null}
          </View>
        </View>

        {checkingPending ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : pendingRequest ? (
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={22} color="#b54708" />
            <Text style={styles.pendingTitle}>{t('sendReq.alreadyPendingTitle')}</Text>
            <Text style={styles.pendingText}>
              {t('sendReq.alreadyPendingMessage', { phone: pendingRequest.LandlordMobile || '' })}
            </Text>
          </View>
        ) : (
        <View style={styles.card}>
          <Text style={styles.helperText}>{t('sendReq.helper')}</Text>

          <Text style={styles.label}>{t('sendReq.landlordPhone')}</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => { Keyboard.dismiss(); setCountrySearch(''); setPickerOpen(true); }}
              activeOpacity={0.7}
            >
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <Text style={styles.countryDial}>{country.dialCode}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder={t('addTenant.phonePlaceholder')}
              placeholderTextColor={colors.muted}
              value={landlordPhone}
              onChangeText={setLandlordPhone}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>
            {t('sendReq.message')} <Text style={styles.labelSoft}>{t('form.optional')}</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('sendReq.messagePlaceholder')}
            placeholderTextColor={colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={250}
          />

          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.submitInner}>
                <Ionicons name="paper-plane" size={16} color="#ffffff" />
                <Text style={styles.submitLabel}>{t('sendReq.submit')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetGrabber} />
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.muted}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.optionsList}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('form.noMatches')}</Text>}
              renderItem={({ item }) => {
                const active = country.code === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => { setCountry(item); setPickerOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionFlag}>{item.flag}</Text>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.optionDial}>{item.dialCode}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => {
          const wasSuccess = modal?.type === 'success';
          setModal(null);
          if (wasSuccess) onSent?.();
        }}
        onRequestClose={() => setModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  headingText: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontFamily: 'Manrope-Bold', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 19, fontFamily: 'Manrope-ExtraBold', marginTop: 2 },
  centerBox: { paddingVertical: 30, alignItems: 'center' },
  pendingCard: {
    backgroundColor: '#fffaeb', borderWidth: 1, borderColor: '#fedf89',
    borderRadius: 16, padding: 20, alignItems: 'center',
  },
  pendingTitle: { color: '#93370d', fontSize: 15, fontFamily: 'Manrope-ExtraBold', marginTop: 8, marginBottom: 4 },
  pendingText: { color: '#b54708', fontSize: 12.5, fontFamily: 'Manrope-Medium', textAlign: 'center', lineHeight: 18 },
  homeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  homeName: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold' },
  homeUnit: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Medium', marginTop: 1 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18 },
  helperText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  label: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold', marginBottom: 7 },
  labelSoft: { fontFamily: 'Manrope-Medium', color: colors.muted },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Manrope-Medium',
    color: colors.text, marginBottom: 16,
  },
  textArea: { height: 88, textAlignVertical: 'top' },
  phoneRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  phoneInput: { flex: 1, marginBottom: 0 },
  countryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 88,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc', paddingHorizontal: 12,
  },
  countryFlag: { fontSize: 15 },
  countryDial: { fontSize: 14, color: colors.text, fontFamily: 'Manrope-SemiBold' },
  submitButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.65 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28,
  },
  sheetGrabber: { width: 38, height: 4, borderRadius: 99, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 12,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fafbfc',
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Medium', color: colors.text, padding: 0 },
  optionsList: { flexGrow: 0, maxHeight: 340 },
  emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Medium', paddingVertical: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  optionFlag: { fontSize: 18 },
  optionLabel: { flex: 1, fontSize: 14, color: colors.text, fontFamily: 'Manrope-Bold' },
  optionLabelActive: { color: colors.primary },
  optionDial: { fontSize: 12.5, color: colors.muted, fontFamily: 'Manrope-SemiBold' },
});