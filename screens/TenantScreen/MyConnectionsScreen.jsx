import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';

const TENANT_ID = 'PropHub';

// Tenant-provided tenancies have no PropertyId/PropDetailsId, so the
// joined PropertyName / FlatName / Floor come back NULL — fall back to
// the free-text PropertyNameText / UnitNoText the tenant entered.
function propertyLabel(item) {
  return item?.PropertyName || item?.PropertyNameText || '—';
}

function unitLabel(item) {
  if (item?.Floor) {
    return item.FlatName ? `${item.FlatName} (${item.Floor})` : item.Floor;
  }
  return item?.UnitNoText || item?.FlatName || '';
}

// embedded=true renders one bordered table-card with PENDING invites only,
// plus a "See all" row (onViewAll) that opens the full screen — same
// design as the landlord side's ConnectionRequestsScreen embedded card.
// embedded=false (default) is the full standalone screen, unchanged.
// Connected tenancies are shown read-only: accepting an invite (SP_Tenant
// QC12) already copies the tenancy into tblTenantHome, so no separate
// "Add to Profile" step is needed.
export default function MyConnectionsScreen({
  uId, onConnected, embedded = false, onCountChange, onViewAll,
}) {
  const { t } = useLanguage();
  const [invites, setInvites] = useState([]);
  const [connected, setConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [invitesRes, connectedRes] = await Promise.all([
        fetch(`${config.BMS_API}api/GetPendingInvitesForTenant?tenantUserId=${uId}`, { headers: { TenantId: TENANT_ID } })
          .then((r) => r.json().catch(() => null)),
        // The embedded card shows pending invites only, so it skips this call.
        embedded
          ? Promise.resolve(null)
          : fetch(`${config.BMS_API}api/GetConnectedTenanciesForTenant?tenantUserId=${uId}`, { headers: { TenantId: TENANT_ID } })
              .then((r) => r.json().catch(() => null)),
      ]);

      if (invitesRes?.success) {
        const list = invitesRes.data || [];
        setInvites(list);
        onCountChange?.(list.length);
      }
      if (connectedRes?.success) setConnected(connectedRes.data || []);
    } catch (err) {
      console.log('Failed to load connections:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [uId]);

  async function respond(tenantId, accept) {
    setRespondingId(tenantId);
    try {
      const response = await fetch(`${config.BMS_API}api/RespondToInvite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ TenantId: tenantId, TenantUserId: uId, Accept: accept, EntryBy: String(uId) }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        load();
        if (accept) {
          onConnected?.();
        }
      }
    } catch (err) {
      console.log('Failed to respond to invite:', err.message);
    } finally {
      setRespondingId(null);
    }
  }

  const hasAnything = invites.length > 0 || connected.length > 0;
  const totalCount = invites.length + connected.length;

  // --- Embedded: pending invites only + "See all" row ---
  if (embedded) {
    return (
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <View style={styles.tableIconWrap}>
            <Ionicons name="link-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.tableTitle}>{t('myConn.title')}</Text>
          {invites.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{invites.length}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.tableCenterBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : invites.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('myConn.empty')}</Text>
          </View>
        ) : (
          invites.map((inv) => (
            <View key={`invite-${inv.Id}`} style={[styles.tableRow, styles.rowDivider]}>
              <View style={styles.rowTop}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.propertyName} numberOfLines={1}>{propertyLabel(inv)}</Text>
                  {unitLabel(inv) ? (
                    <Text style={styles.unitText} numberOfLines={1}>{unitLabel(inv)}</Text>
                  ) : null}
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{t('myConn.invite')}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => respond(inv.Id, false)}
                  disabled={respondingId === inv.Id}
                >
                  <Text style={styles.rejectText}>{t('myConn.decline')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => respond(inv.Id, true)}
                  disabled={respondingId === inv.Id}
                >
                  {respondingId === inv.Id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.acceptText}>{t('myConn.accept')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {onViewAll ? (
          <TouchableOpacity style={[styles.viewAllRow, styles.rowDivider]} onPress={onViewAll} activeOpacity={0.75}>
            <Text style={styles.viewAllText}>{t('myConn.viewAll')}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // --- Standalone full screen — unchanged from before ---
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>Landlord Connections</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasAnything ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No invites or connections from a landlord yet.</Text>
        </View>
      ) : (
        <>
          {invites.map((inv) => (
            <View key={`invite-${inv.Id}`} style={[styles.card, styles.cardPending]}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Invite</Text>
              </View>
              <Text style={styles.propertyName}>{propertyLabel(inv)}</Text>
              {unitLabel(inv) ? <Text style={styles.unitText}>{unitLabel(inv)}</Text> : null}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => respond(inv.Id, false)}
                  disabled={respondingId === inv.Id}
                >
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => respond(inv.Id, true)}
                  disabled={respondingId === inv.Id}
                >
                  {respondingId === inv.Id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.acceptText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {connected.map((tenancy) => (
            <View key={`connected-${tenancy.Id}`} style={styles.card}>
              <Text style={styles.propertyName}>{propertyLabel(tenancy)}</Text>
              {unitLabel(tenancy) ? <Text style={styles.unitText}>{unitLabel(tenancy)}</Text> : null}
              <View style={styles.inProfileBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                <Text style={styles.inProfileText}>{t('myConn.connected')}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // --- embedded table-card styles ---
  tableCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  tableTitle: { flex: 1, color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  countBadge: {
    backgroundColor: `${colors.primary}1A`, borderRadius: 10,
    minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center',
  },
  countBadgeText: { color: colors.primary, fontSize: 11, fontFamily: 'Manrope-Bold' },
  emptyRow: { paddingHorizontal: 14, paddingBottom: 16 },
  tableCenterBox: { paddingVertical: 24, alignItems: 'center' },
  viewAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 11,
  },
  viewAllText: { color: colors.primary, fontSize: 12, fontFamily: 'Manrope-Bold' },
  tableRow: { paddingHorizontal: 14, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowTextWrap: { flex: 1 },

  // --- shared row/text styles (used by both embedded and standalone) ---
  propertyName: { color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  unitText: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginTop: 1 },
  pendingBadge: {
    backgroundColor: `${colors.error}14`, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pendingBadgeText: { color: colors.error, fontSize: 10, fontFamily: 'Manrope-Bold' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  rejectButton: { borderWidth: 1.5, borderColor: colors.border },
  rejectText: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold' },
  acceptButton: { backgroundColor: colors.primary },
  acceptText: { color: '#ffffff', fontSize: 12, fontFamily: 'Manrope-Bold' },

  // --- standalone full-screen styles ---
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 17, fontFamily: 'Manrope-ExtraBold' },
  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 22, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardPending: { borderColor: colors.error, borderWidth: 1.5 },
  inProfileBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  inProfileText: { color: colors.primary, fontSize: 11.5, fontFamily: 'Manrope-SemiBold' },
});