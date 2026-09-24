import { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';

const TENANT_ID = 'PropHub';

// embedded=true renders one bordered table-card (pending requests only)
// for inline use on the landlord HomeScreen — same design as the tenant
// side's MyConnectionsScreen embedded card. embedded=false (default) is
// the full standalone screen, unchanged.
export default function ConnectionRequestsScreen({ onSelectTenant, embedded = false, onCountChange, onViewAll }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const phone = loginData?.Phone || '';
  const uId = loginData?.Id;

  const [requests, setRequests] = useState([]);
  const [connectedTenants, setConnectedTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const requestsPromise = fetch(
        `${config.BMS_API}api/GetConnectionRequestsForLandlord?landlordUId=${uId}&landlordMobile=${encodeURIComponent(phone)}`,
        { headers: { TenantId: TENANT_ID } }
      ).then((r) => r.json().catch(() => null));

      // The embedded card shows pending requests only, so it skips the
      // tenant list call.
      const tenantsPromise = embedded
        ? Promise.resolve(null)
        : fetch(
            `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}&uId=${uId}`,
            { headers: { TenantId: TENANT_ID } }
          ).then((r) => r.json().catch(() => null));

      const [requestsRes, tenantsRes] = await Promise.all([requestsPromise, tenantsPromise]);

      if (requestsRes?.success) {
        const list = requestsRes.data || [];
        setRequests(list);
        onCountChange?.(list.length);
      }
      if (tenantsRes?.success) {
        setConnectedTenants((tenantsRes.data || []).filter((t) => t.ConnectionStatus === 'Connected'));
      }
    } catch (err) {
      console.log('Failed to load connections:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function accept(requestId) {
    setRespondingId(requestId);
    try {
      const response = await fetch(`${config.BMS_API}api/AcceptConnectionRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ RequestId: requestId, LandlordUId: uId, EntryBy: phone }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) load();
    } catch (err) {
      console.log('Failed to accept request:', err.message);
    } finally {
      setRespondingId(null);
    }
  }

  async function reject(requestId) {
    setRespondingId(requestId);
    try {
      const response = await fetch(`${config.BMS_API}api/RejectConnectionRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ RequestId: requestId, EntryBy: phone }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) load();
    } catch (err) {
      console.log('Failed to reject request:', err.message);
    } finally {
      setRespondingId(null);
    }
  }

  function propertyLine(req) {
    return req.PropertyName
      ? `${req.PropertyName} — ${req.FlatName} (${req.Floor})`
      : req.TenantEnteredPropertyName || t('connReq.noProperty');
  }

  // --- Embedded: one bordered card, title header, divided table rows ---
  if (embedded) {
    return (
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <View style={styles.tableIconWrap}>
            <Ionicons name="link-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.tableTitle}>{t('connReq.title')}</Text>
          {requests.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{requests.length}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.tableCenterBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{t('connReq.empty')}</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={`pending-${req.Id}`} style={[styles.tableRow, styles.rowDivider]}>
              <View style={styles.rowTop}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowName} numberOfLines={1}>{req.TenantName || t('connReq.unknownTenant')}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{req.TenantPhone}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{propertyLine(req)}</Text>
                </View>
                <View style={styles.pendingBadgeInline}>
                  <Text style={styles.pendingBadgeText}>{t('connReq.pending')}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.rowActionButton, styles.rejectButton]}
                  onPress={() => reject(req.Id)}
                  disabled={respondingId === req.Id}
                >
                  <Text style={styles.rowRejectText}>{t('connReq.reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rowActionButton, styles.acceptButton]}
                  onPress={() => accept(req.Id)}
                  disabled={respondingId === req.Id}
                >
                  {respondingId === req.Id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.rowAcceptText}>{t('connReq.accept')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {onViewAll ? (
          <TouchableOpacity style={[styles.viewAllRow, styles.rowDivider]} onPress={onViewAll} activeOpacity={0.75}>
            <Text style={styles.viewAllText}>{t('connReq.viewAll')}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // --- Standalone full screen — unchanged from before ---
  const hasAnything = requests.length > 0 || connectedTenants.length > 0;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>Connections</Text>
          <Text style={styles.title}>Tenant Connections</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasAnything ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle-outline" size={26} color={colors.muted} />
          <Text style={styles.emptyText}>No connection requests or connected tenants yet.</Text>
        </View>
      ) : (
        <>
          {requests.map((req) => (
            <View key={`pending-${req.Id}`} style={[styles.card, styles.cardPending]}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
              <Text style={styles.tenantName}>{req.TenantName || 'A tenant'}</Text>
              <Text style={styles.tenantPhone}>{req.TenantPhone}</Text>
              <Text style={styles.propertyText}>{propertyLine(req)}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => reject(req.Id)}
                  disabled={respondingId === req.Id}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => accept(req.Id)}
                  disabled={respondingId === req.Id}
                >
                  {respondingId === req.Id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.acceptText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {connectedTenants.map((tenant) => (
            <TouchableOpacity
              key={`connected-${tenant.Id}`}
              style={styles.connectedCard}
              onPress={() => onSelectTenant?.(tenant.Id)}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(tenant.TenantName || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.tenantName} numberOfLines={1}>{tenant.TenantName}</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {tenant.DisplayPropertyName} — {tenant.DisplayUnitNo}
                </Text>
              </View>
              <View style={styles.connectedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // --- embedded table-card styles (match MyConnectionsScreen) ---
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
  tableCenterBox: { paddingVertical: 24, alignItems: 'center' },
  emptyRow: { paddingHorizontal: 14, paddingBottom: 16 },
  tableRow: { paddingHorizontal: 14, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  rowTextWrap: { flex: 1 },
  rowName: { color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  rowSub: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginTop: 1 },
  pendingBadgeInline: {
    backgroundColor: `${colors.error}14`, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rowActionButton: { flex: 1, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  rowRejectText: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Bold' },
  rowAcceptText: { color: '#ffffff', fontSize: 12, fontFamily: 'Manrope-Bold' },
  viewAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 11,
  },
  viewAllText: { color: colors.primary, fontSize: 12, fontFamily: 'Manrope-Bold' },

  // --- standalone full-screen styles (unchanged) ---
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 10, fontFamily: 'Manrope-Bold', letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', marginTop: 1 },
  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    padding: 22, alignItems: 'center', gap: 8,
  },
  emptyText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', textAlign: 'center' },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, marginBottom: 10,
  },
  cardPending: { borderColor: colors.error, borderWidth: 1.5 },
  pendingBadge: {
    alignSelf: 'flex-start', backgroundColor: `${colors.error}14`, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  pendingBadgeText: { color: colors.error, fontSize: 10, fontFamily: 'Manrope-Bold' },
  tenantName: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold' },
  tenantPhone: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Regular', marginTop: 1, marginBottom: 6 },
  propertyText: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-Medium', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rejectButton: { borderWidth: 1.5, borderColor: colors.border },
  rejectText: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-Bold' },
  acceptButton: { backgroundColor: colors.primary },
  acceptText: { color: '#ffffff', fontSize: 12.5, fontFamily: 'Manrope-Bold' },

  connectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 13, marginBottom: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-Bold' },
  cardTextWrap: { flex: 1 },
  locationText: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginTop: 1 },
  connectedBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
});