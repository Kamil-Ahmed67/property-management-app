import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config';
import { colors } from '../../theme';
import { useLanguage } from '../../providers/LanguageProvider';
import { useActiveHome } from '../../hooks/useActiveHome';
import { pickActiveHome, isHomeExpired } from '../../utils/tenancy';

const TENANT_ID = 'PropHub';

export default function MyHomeHistoryScreen({ uId, onAddNew, onSendRequest }) {
  const { t } = useLanguage();
  const { homes, loading } = useActiveHome(uId);
  const activeId = pickActiveHome(homes)?.Id;

  // Homes that already have a Pending request to a landlord — those show
  // a "Request pending" pill instead of the Send Request button.
  const [pendingHomeIds, setPendingHomeIds] = useState(new Set());

  useEffect(() => {
    if (!uId) return;
    (async () => {
      try {
        const res = await fetch(
          `${config.BMS_API}api/GetConnectionRequestsForTenant?tenantUId=${uId}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          const ids = (data.data || [])
            .filter((r) => r.Status === 'Pending')
            .map((r) => r.TenantHomeId);
          setPendingHomeIds(new Set(ids));
        }
      } catch (err) {
        console.log('Failed to load my requests:', err.message);
      }
    })();
  }, [uId]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.title}>Residence History</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : homes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No homes on file yet.</Text>
          </View>
        ) : (
          homes.map((home) => {
            const isCurrent = home.Id === activeId;
            const expired = isHomeExpired(home);
            const statusLabel = expired ? 'Ended' : home.ConnectionStatus;
            const statusOk = statusLabel === 'Connected';

            // Self-added home not yet linked to a landlord, still running.
            const isManualUnlinked = !expired && home.ConnectionStatus !== 'Connected';
            const hasPending = pendingHomeIds.has(home.Id);

            return (
              <View key={home.Id} style={[styles.card, isCurrent && styles.cardCurrent]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.propertyName} numberOfLines={1}>{home.DisplayPropertyName}</Text>
                  {isCurrent ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.unitText}>{home.DisplayUnitNo}</Text>
                <Text style={styles.dateText}>
                  {home.StartDate ? new Date(home.StartDate).toLocaleDateString() : '—'}
                  {' → '}
                  {home.EndDate ? new Date(home.EndDate).toLocaleDateString() : 'Present'}
                </Text>

                <View style={styles.bottomRow}>
                  <View style={styles.connectionRow}>
                    <Ionicons
                      name={statusOk ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={statusOk ? colors.primary : colors.muted}
                    />
                    <Text style={styles.connectionText}>{statusLabel}</Text>
                  </View>

                  {isManualUnlinked ? (
                    hasPending ? (
                      <View style={styles.pendingPill}>
                        <Ionicons name="time-outline" size={12} color="#b54708" />
                        <Text style={styles.pendingPillText}>{t('sendReq.pending')}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => onSendRequest?.(home)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="paper-plane-outline" size={13} color="#ffffff" />
                        <Text style={styles.sendButtonText}>{t('sendReq.button')}</Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={onAddNew} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 20, paddingBottom: 90 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 17, fontFamily: 'Manrope-ExtraBold' },
  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 22, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular' },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardCurrent: { borderColor: colors.primary, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  propertyName: { flex: 1, color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold' },
  currentPill: { backgroundColor: `${colors.primary}1A`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  currentPillText: { color: colors.primary, fontSize: 10, fontFamily: 'Manrope-Bold' },
  unitText: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Medium', marginBottom: 6 },
  dateText: { color: colors.text, fontSize: 11.5, fontFamily: 'Manrope-SemiBold', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectionText: { color: colors.muted, fontSize: 10.5, fontFamily: 'Manrope-SemiBold' },
  sendButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7,
  },
  sendButtonText: { color: '#ffffff', fontSize: 11.5, fontFamily: 'Manrope-Bold' },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fffaeb', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6,
  },
  pendingPillText: { color: '#b54708', fontSize: 11, fontFamily: 'Manrope-Bold' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
});