import { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import config from '../../config';
import StatusModal from '../../components/StatusModal';
import { colors } from '../../theme';

const TENANT_ID = 'PropHub';

export default function ConnectToLandlordScreen({ tenancy, onConnected }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const phone = loginData?.Phone || '';

  const [checking, setChecking] = useState(true);
  const [autoMatch, setAutoMatch] = useState(null);
  const [landlordMobile, setLandlordMobile] = useState('');
  const [propertyGuess, setPropertyGuess] = useState('');
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/CheckAutoMatch?tenantPhone=${encodeURIComponent(phone)}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success && data.data) {
          setAutoMatch(data.data);
        }
      } catch (err) {
        console.log('Failed to check auto-match:', err.message);
      } finally {
        setChecking(false);
      }
    })();
  }, [phone]);

  async function confirmAutoMatch() {
    setSending(true);
    try {
      const response = await fetch(`${config.BMS_API}api/SendConnectionRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          TenantUId: loginData?.Id,
          TenantHomeId: tenancy?.Id,
          TenancyId: autoMatch.TenancyId,
          PropertyId: autoMatch.PropertyId,
          PropDetailsId: autoMatch.PropDetailsId,
          MatchType: 'Auto',
          LandlordUId: autoMatch.LandlordUId,
          EntryBy: phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('connectLandlord.connectFailedMessage'));
      }
      setModal({
        type: 'success',
        title: t('connectLandlord.connectedTitle'),
        message: t('connectLandlord.connectedMessage', { name: autoMatch.PropertyName }),
      });
    } catch (err) {
      setModal({ type: 'error', title: t('connectLandlord.connectFailedTitle'), message: err.message });
    } finally {
      setSending(false);
    }
  }

  async function sendManualRequest() {
    if (!landlordMobile.trim()) {
      setModal({ type: 'error', title: t('form.missingInfo'), message: t('connectLandlord.phoneRequired') });
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`${config.BMS_API}api/SendConnectionRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          TenantUId: loginData?.Id,
          TenantHomeId: tenancy?.Id,
          LandlordMobile: landlordMobile,
          MatchType: 'Manual',
          EntryBy: phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('connectLandlord.sendFailedMessage'));
      }
      setModal({
        type: 'success',
        title: t('connectLandlord.requestSentTitle'),
        message: t('connectLandlord.requestSentMessage'),
      });
    } catch (err) {
      setModal({ type: 'error', title: t('connectLandlord.sendFailedTitle'), message: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="link-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('connectLandlord.eyebrow')}</Text>
          <Text style={styles.title}>{t('connectLandlord.title')}</Text>
        </View>
      </View>

      {checking ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : autoMatch ? (
        <View style={styles.matchCard}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <Text style={styles.matchTitle}>{t('connectLandlord.matchTitle')}</Text>
          <Text style={styles.matchText}>
            {autoMatch.PropertyName} — {autoMatch.FlatName} ({autoMatch.Floor})
          </Text>
          <Text style={styles.matchSubtext}>{t('connectLandlord.matchSubtext')}</Text>
          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            onPress={confirmAutoMatch}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitLabel}>{t('connectLandlord.connectNow')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.helperText}>{t('connectLandlord.noMatchHelper')}</Text>

          <Text style={styles.label}>{t('connectLandlord.landlordPhone')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('connectLandlord.landlordPhonePlaceholder')}
            placeholderTextColor={colors.muted}
            value={landlordMobile}
            onChangeText={setLandlordMobile}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>
            {t('connectLandlord.propertyName')} <Text style={styles.labelSoft}>{t('form.optional')}</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('connectLandlord.propertyNamePlaceholder')}
            placeholderTextColor={colors.muted}
            value={propertyGuess}
            onChangeText={setPropertyGuess}
          />

          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            onPress={sendManualRequest}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitLabel}>{t('connectLandlord.sendRequest')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => {
          const wasSuccess = modal?.type === 'success';
          setModal(null);
          if (wasSuccess) onConnected?.();
        }}
        onRequestClose={() => setModal(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontFamily: 'Manrope-Bold', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 19, fontFamily: 'Manrope-ExtraBold', marginTop: 2 },
  centerBox: { paddingVertical: 30, alignItems: 'center' },
  matchCard: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 16, padding: 20, alignItems: 'center',
  },
  matchTitle: { color: colors.text, fontSize: 15, fontFamily: 'Manrope-ExtraBold', marginTop: 8, marginBottom: 4 },
  matchText: { color: colors.primary, fontSize: 13, fontFamily: 'Manrope-Bold', marginBottom: 8, textAlign: 'center' },
  matchSubtext: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Regular', textAlign: 'center', lineHeight: 17, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18 },
  helperText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  label: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold', marginBottom: 7 },
  labelSoft: { fontFamily: 'Manrope-Medium', color: colors.muted },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Manrope-Medium',
    color: colors.text, marginBottom: 16,
  },
  submitButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.65 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
});