import { useContext, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import config from '../../config';
import StatusModal from '../../components/StatusModal';
import { useActiveHome } from '../../hooks/useActiveHome';
import { colors } from '../../theme';
const CATEGORIES = ['maintenance', 'noise', 'billing', 'security', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function TenantComplainCreateScreen({ onBack, onSuccess }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const { home, loading: loadingHome } = useActiveHome(loginData?.Id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setModal({
        visible: true,
        type: 'error',
        title: t('complain.missingTitle') || 'Missing fields',
        message: t('complain.missingMsg') || 'Title and description are required.',
      });
      return;
    }

    // A complaint must belong to a home that is connected to a landlord.
    if (home?.ConnectionStatus !== 'Connected') {
      setModal({
        visible: true,
        type: 'error',
        title: t('complain.noHomeTitle') || 'No connected home',
        message: t('complain.noHomeMsg') || 'Connect with your landlord before filing a complaint.',
      });
      return;
    }

    setSaving(true);
    try {
      const body = {
        // tblTenantHome.Phone holds the landlord's number — used here only,
        // never displayed on the tenant side.
        phone: home.Phone,
        uId: loginData?.UId || 0,
        tenantPhone: loginData?.Phone || loginData?.phone,
        tenantName: loginData?.Name || home.TenantName || '',
        propertyId: home.PropertyId || null,
        propDetailsId: home.PropDetailsId || null,
        unitLabel: home.DisplayUnitNo || null,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        entryBy: loginData?.Phone || loginData?.phone,
      };

      const res = await fetch(`${config.BMS_API}api/CreateComplaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: 'PropHub',
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json?.success) {
        setModal({
          visible: true,
          type: 'success',
          title: t('complain.submitted') || 'Complaint Submitted',
          message: t('complain.submittedMsg') || 'The property owner has been notified.',
        });
      } else {
        throw new Error(json?.message || 'Failed to submit');
      }
    } catch (e) {
      setModal({
        visible: true,
        type: 'error',
        title: t('common.error') || 'Error',
        message: e.message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('quickAction.addComplaint') || 'New Complaint'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('complain.title') || 'Title'} *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('complain.titlePlaceholder') || 'Short title of the issue'}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>{t('complain.description') || 'Description'} *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder={t('complain.descPlaceholder') || 'Describe the issue in detail...'}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>{t('complain.category') || 'Category'}</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {t(`complain.cat.${c}`) || c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('complain.priority') || 'Priority'}</Text>
        <View style={styles.chips}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, priority === p && styles.chipActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                {t(`complain.pri.${p}`) || p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (saving || loadingHome) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving || loadingHome}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {saving
              ? (t('common.sending') || 'Sending...')
              : (t('complain.submit') || 'Submit Complaint')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <StatusModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        actionLabel={t('common.ok') || 'OK'}
        onAction={() => {
          setModal((m) => ({ ...m, visible: false }));
          if (modal.type === 'success') onSuccess?.();
        }}
        onRequestClose={() => setModal((m) => ({ ...m, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 16,
    color: colors.text,
  },
  form: { padding: 16, gap: 10, paddingBottom: 40 },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: colors.text,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: 'Manrope-Bold',
  },
  submitBtn: {
    marginTop: 28,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 15,
  },
});