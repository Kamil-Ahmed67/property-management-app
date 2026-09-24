import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function MyHomeDetailScreen({ home, uId, onConnectPress, onMovedOut }) {
  const [movingOut, setMovingOut] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resultModal, setResultModal] = useState(null);

  if (!home) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.muted} />
        <Text style={styles.emptyText}>No home on file yet.</Text>
      </View>
    );
  }

  const isConnected = home.ConnectionStatus === 'Connected';

  async function handleMoveOut() {
    setConfirmVisible(false);
    setMovingOut(true);
    try {
      const response = await fetch(`${config.BMS_API}api/DeactivateMyHome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ TenantHomeId: home.Id, UId: uId, EntryBy: String(uId) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Could not update your home.');
      }
      setResultModal({
        type: 'success',
        title: 'Moved Out',
        message: 'This home has been marked as your previous residence. Set up your new home next.',
      });
    } catch (err) {
      setResultModal({ type: 'error', title: 'Could Not Save', message: err.message });
    } finally {
      setMovingOut(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.iconWrap}>
          <Ionicons name="home" size={26} color={colors.primary} />
        </View>
        <Text style={styles.propertyName}>{home.DisplayPropertyName}</Text>
        <Text style={styles.unitLabel}>{home.DisplayUnitNo}</Text>
        <View style={[styles.statusPill, isConnected ? styles.statusPillConnected : styles.statusPillPersonal]}>
          <Text style={[styles.statusPillText, { color: isConnected ? colors.primary : colors.error }]}>
            {home.ConnectionStatus}
          </Text>
        </View>
      </View>

      <SectionCard title="Your Details">
        <InfoRow icon="card-outline" label="NID" value={home.NID} />
        <InfoRow icon="call-outline" label="Phone" value={home.TenantPhone} />
        <InfoRow icon="mail-outline" label="Email" value={home.TenantEmail} />
        <InfoRow
          icon="calendar-outline"
          label="Date of Birth"
          value={home.DOB ? new Date(home.DOB).toLocaleDateString() : null}
        />
        <InfoRow icon="body-outline" label="Type" value={home.TenantType} />
        <InfoRow icon="body-outline" label="Religion" value={home.Religion} />
      </SectionCard>

      <SectionCard title="Lease & Payment">
        <InfoRow
          icon="log-in-outline"
          label="Move-in Date"
          value={home.StartDate ? new Date(home.StartDate).toLocaleDateString() : null}
        />
        <InfoRow
          icon="cash-outline"
          label="Monthly Amount"
          value={home.MonthlyAmount != null ? `৳${home.MonthlyAmount.toLocaleString()}` : null}
        />
        <InfoRow
          icon="wallet-outline"
          label="Advance"
          value={home.Advance != null ? `৳${home.Advance.toLocaleString()}` : null}
        />
      </SectionCard>

      {(home.EName || home.EPhone) ? (
        <SectionCard title="Emergency Contact">
          <InfoRow icon="person-outline" label="Name" value={home.EName} />
          <InfoRow icon="call-outline" label="Phone" value={home.EPhone} />
          <InfoRow icon="people-outline" label="Relation" value={home.ERelation} />
          <InfoRow icon="location-outline" label="Address" value={home.EAddress} />
        </SectionCard>
      ) : null}

      {!isConnected ? (
        <View style={styles.connectCard}>
          <Ionicons name="link-outline" size={20} color={colors.primary} />
          <Text style={styles.connectTitle}>Not linked to your landlord yet</Text>
          <Text style={styles.connectSubtext}>
            Connect this home to your landlord's official records to unlock rent bills and payment history here.
          </Text>
          <TouchableOpacity style={styles.connectButton} onPress={onConnectPress} activeOpacity={0.85}>
            <Text style={styles.connectButtonText}>Connect to Landlord</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.moveOutButton}
        onPress={() => setConfirmVisible(true)}
        disabled={movingOut}
        activeOpacity={0.75}
      >
        {movingOut ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <>
            <Ionicons name="exit-outline" size={16} color={colors.error} />
            <Text style={styles.moveOutText}>Moving Out / Deactivate This Home</Text>
          </>
        )}
      </TouchableOpacity>

      <StatusModal
        visible={confirmVisible}
        type="error"
        icon="help-circle"
        title="Move Out?"
        message="This marks your current home as previous. If you're connected to a landlord, they'll see this too. You'll need to set up a new home next."
        actionLabel="Yes, Move Out"
        secondaryLabel="Cancel"
        onAction={handleMoveOut}
        onSecondary={() => setConfirmVisible(false)}
        onRequestClose={() => setConfirmVisible(false)}
      />

      <StatusModal
        visible={!!resultModal}
        type={resultModal?.type}
        title={resultModal?.title}
        message={resultModal?.message}
        actionLabel="Done"
        onAction={() => {
          const wasSuccess = resultModal?.type === 'success';
          setResultModal(null);
          if (wasSuccess) onMovedOut?.();
        }}
        onRequestClose={() => setResultModal(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.bg },
  emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Regular' },
  headerCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 16,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  propertyName: { color: colors.text, fontSize: 17, fontFamily: 'Manrope-ExtraBold', textAlign: 'center' },
  unitLabel: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Medium', marginTop: 2, marginBottom: 8 },
  statusPill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  statusPillConnected: { backgroundColor: `${colors.primary}1A` },
  statusPillPersonal: { backgroundColor: `${colors.error}14` },
  statusPillText: { fontSize: 12, fontFamily: 'Manrope-Bold' },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle: {
    color: colors.primary, fontSize: 12, fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-SemiBold', marginBottom: 1 },
  infoValue: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-SemiBold' },
  connectCard: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 14,
  },
  connectTitle: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-ExtraBold', marginTop: 8, marginBottom: 4 },
  connectSubtext: {
    color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Regular', textAlign: 'center',
    lineHeight: 17, marginBottom: 14,
  },
  connectButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24 },
  connectButtonText: { color: '#ffffff', fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  moveOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12, paddingVertical: 13,
  },
  moveOutText: { color: colors.error, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
});