import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config';
import StatusModal from '../../components/StatusModal';
import { colors } from '../../theme';

const TENANT_ID = 'PropHub';

export default function AddToProfileFormScreen({ tenancy, uId, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const response = await fetch(`${config.BMS_API}api/AddTenantHomeFromTenancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ UId: uId, SourceTenantId: tenancy.Id, EntryBy: String(uId) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Could not save.');
      }
      onSaved?.();
    } catch (err) {
      setModal({ type: 'error', title: 'Could Not Save', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>Add to Profile</Text>
          <Text style={styles.title}>Confirm Your Home Details</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.propertyName}>{tenancy?.PropertyName}</Text>
        <Text style={styles.unitText}>{tenancy?.FlatName} ({tenancy?.Floor})</Text>
        <Text style={styles.helperText}>
          These details come directly from your landlord's official records and will be saved to your profile exactly as-is.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleConfirm}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitLabel}>Confirm & Add to Profile</Text>}
      </TouchableOpacity>

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel="Done"
        onAction={() => setModal(null)}
        onRequestClose={() => setModal(null)}
      />
    </ScrollView>
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
  eyebrow: { color: colors.primary, fontSize: 11, fontFamily: 'Manrope-Bold', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 18 },
  propertyName: { color: colors.text, fontSize: 16, fontFamily: 'Manrope-ExtraBold', marginBottom: 4 },
  unitText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Medium', marginBottom: 14 },
  helperText: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Regular', lineHeight: 17 },
  submitButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.65 },
  submitLabel: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-ExtraBold' },
});