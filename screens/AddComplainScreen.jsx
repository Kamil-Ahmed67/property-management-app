import { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';

// Banner text for the tenancy.
//  - Linked to a landlord's property:  "PropertyName — FlatName (Floor)"
//  - Added by the tenant (no PropertyId): "PropertyNameText (UnitNoText)"
function tenancyLabel(tenancy) {
  if (!tenancy) return '';

  if (tenancy.PropertyName) {
    const flat = tenancy.FlatName || tenancy.UnitNoText || '';
    const floor = tenancy.Floor ? ` (${tenancy.Floor})` : '';
    return flat ? `${tenancy.PropertyName} — ${flat}${floor}` : tenancy.PropertyName;
  }

  const name = tenancy.PropertyNameText || '';
  const unit = tenancy.UnitNoText || tenancy.FlatName || '';
  return unit ? `${name} (${unit})` : name;
}

export default function AddComplainScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [tenancy, setTenancy] = useState(null);
  const [loadingTenancy, setLoadingTenancy] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!phone) return;
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetMyTenancy?tenantPhone=${encodeURIComponent(phone)}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) setTenancy(data.data);
      } catch (err) {
        console.log('Failed to load tenancy for complaint form:', err.message);
      } finally {
        setLoadingTenancy(false);
      }
    })();
  }, [phone]);

  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) {
      setModal({
        type: 'error',
        title: t('form.missingInfo'),
        message: t('complain.validation'),
      });
      return;
    }
    if (!tenancy) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: t('complain.noTenancy'),
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${config.BMS_API}api/AddComplain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          UId: tenancy.UId,
          TenantId: tenancy.Id,
          PropertyId: tenancy.PropertyId,
          PropDetailsId: tenancy.PropDetailsId,
          Subject: subject,
          Description: description,
          EntryBy: phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('complain.submitFailed'));
      }

      setModal({
        type: 'success',
        title: t('complain.submittedTitle'),
        message: t('complain.submittedMessage'),
        onAction: () => onNavigate?.('complain-list'),
      });
    } catch (err) {
      setModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('complain.submitFailed'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('complain.eyebrow')}</Text>
          <Text style={styles.title}>{t('complain.newTitle')}</Text>
        </View>
      </View>

      {loadingTenancy ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tenancy ? (
        <View style={styles.tenancyBanner}>
          <Ionicons name="business-outline" size={15} color={colors.primary} />
          <Text style={styles.tenancyBannerText} numberOfLines={1}>
            {tenancyLabel(tenancy)}
          </Text>
        </View>
      ) : (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={15} color={colors.error} />
          <Text style={styles.warningBannerText}>{t('complain.noTenancy')}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>{t('complain.subject')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('complain.subjectPlaceholder')}
          placeholderTextColor={colors.muted}
          value={subject}
          onChangeText={setSubject}
        />

        <Text style={styles.label}>{t('complain.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('complain.descriptionPlaceholder')}
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitLabel}>{t('complain.submit')}</Text>
        )}
      </TouchableOpacity>

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => {
          const action = modal?.onAction;
          setModal(null);
          action?.();
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
  centerBox: { paddingVertical: 16, alignItems: 'center' },
  tenancyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.primary}14`, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  tenancyBannerText: { flex: 1, color: colors.primaryDark, fontSize: 12.5, fontFamily: 'Manrope-SemiBold' },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  warningBannerText: { flex: 1, color: colors.error, fontSize: 12.5, fontFamily: 'Manrope-SemiBold' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 18 },
  label: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold', marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fafbfc',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Manrope-Medium',
    color: colors.text, marginBottom: 16,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
});