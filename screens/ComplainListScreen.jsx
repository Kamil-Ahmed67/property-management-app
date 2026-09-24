import { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';

const TENANT_ID = 'PropHub';

export default function ComplainListScreen({ mode = 'admin', onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const uId = loginData?.Id;

  const [complains, setComplains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [tenancy, setTenancy] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!uId) return;
    (async () => {
      setLoading(true);
      try {
        if (mode === 'admin') {
          const response = await fetch(
            `${config.BMS_API}api/GetComplainListForAdmin?uId=${uId}`,
            { headers: { TenantId: TENANT_ID } }
          );
          const data = await response.json().catch(() => null);
          if (response.ok && data?.success) setComplains(data.data || []);
        } else {
          // Tenant mode — first resolve their own tenancy to know their
          // own TenantId, then fetch their submitted history against it.
          const tenancyRes = await fetch(
            `${config.BMS_API}api/GetMyTenancy?tenantPhone=${encodeURIComponent(phone)}`,
            { headers: { TenantId: TENANT_ID } }
          );
          const tenancyData = await tenancyRes.json().catch(() => null);
          if (tenancyRes.ok && tenancyData?.success) {
            setTenancy(tenancyData.data);
            const response = await fetch(
              `${config.BMS_API}api/GetComplainListForTenant?tenantId=${tenancyData.data.Id}&uId=${tenancyData.data.UId}`,
              { headers: { TenantId: TENANT_ID } }
            );
            const data = await response.json().catch(() => null);
            if (response.ok && data?.success) setComplains(data.data || []);
          }
        }
      } catch (err) {
        console.log('Failed to load complaints:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [uId, mode, phone]);

  async function handleExpand(item) {
    const isOpening = expandedId !== item.Id;
    setExpandedId(isOpening ? item.Id : null);

    // Admin opening an unread complaint marks it read — this is what
    // reduces the HomeScreen tile's badge count.
    if (mode === 'admin' && isOpening && !item.IsReadByAdmin) {
      try {
        await fetch(`${config.BMS_API}api/MarkComplainAsRead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
          body: JSON.stringify({ ComplainId: item.Id, UId: uId, EntryBy: phone }),
        });
        setComplains((prev) =>
          prev.map((c) => (c.Id === item.Id ? { ...c, IsReadByAdmin: true } : c))
        );
      } catch (err) {
        console.log('Failed to mark complaint as read:', err.message);
      }
    }
  }

  async function handleResolve(item) {
    setUpdatingId(item.Id);
    try {
      const response = await fetch(`${config.BMS_API}api/UpdateComplainStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          ComplainId: item.Id,
          UId: uId,
          Status: 'Resolved',
          EntryBy: phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setComplains((prev) =>
          prev.map((c) => (c.Id === item.Id ? { ...c, Status: 'Resolved' } : c))
        );
      }
    } catch (err) {
      console.log('Failed to resolve complaint:', err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>{t('complain.eyebrow')}</Text>
            <Text style={styles.title}>
              {mode === 'admin' ? t('complain.adminTitle') : t('complain.tenantTitle')}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : complains.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={26} color={colors.muted} />
            <Text style={styles.emptyText}>
              {mode === 'admin' ? t('complain.emptyAdmin') : t('complain.emptyTenant')}
            </Text>
          </View>
        ) : (
          complains.map((item) => {
            const isResolved = (item.Status || '').toLowerCase() === 'resolved';
            const isExpanded = expandedId === item.Id;
            const isUnread = mode === 'admin' && !item.IsReadByAdmin;
            return (
              <TouchableOpacity
                key={item.Id}
                style={styles.card}
                onPress={() => handleExpand(item)}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  {isUnread ? <View style={styles.unreadDot} /> : null}
                  <Text style={styles.subject} numberOfLines={isExpanded ? undefined : 1}>
                    {item.Subject}
                  </Text>
                  <View style={[styles.statusPill, isResolved ? styles.statusPillResolved : styles.statusPillOpen]}>
                    <Text style={[styles.statusPillText, { color: isResolved ? colors.primary : colors.error }]}>
                      {isResolved ? t('complain.resolved') : t('complain.open')}
                    </Text>
                  </View>
                </View>

                {mode === 'admin' ? (
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.TenantName} — {item.PropertyName}, {item.FlatName} ({item.Floor})
                  </Text>
                ) : null}

                <Text style={styles.dateText}>{formatDate(item.EntryDate, lang, t)}</Text>

                {isExpanded ? (
                  <View style={styles.expandedBox}>
                    <Text style={styles.descriptionText}>{item.Description}</Text>

                    {mode === 'admin' && !isResolved ? (
                      <TouchableOpacity
                        style={styles.resolveButton}
                        onPress={() => handleResolve(item)}
                        disabled={updatingId === item.Id}
                        activeOpacity={0.85}
                      >
                        {updatingId === item.Id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                            <Text style={styles.resolveButtonText}>{t('complain.markResolved')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {mode === 'tenant' ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => onNavigate?.('add-complain')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 20, paddingBottom: 90 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 10, fontFamily: 'Manrope-Bold', letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', marginTop: 1 },
  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 22, alignItems: 'center', gap: 8,
  },
  emptyText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 13, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.error },
  subject: { flex: 1, color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillOpen: { backgroundColor: `${colors.error}14` },
  statusPillResolved: { backgroundColor: `${colors.primary}14` },
  statusPillText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  metaText: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginBottom: 3 },
  dateText: { color: colors.muted, fontSize: 10.5, fontFamily: 'Manrope-Regular' },
  expandedBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  descriptionText: { color: colors.text, fontSize: 12.5, fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 10 },
  resolveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10,
  },
  resolveButtonText: { color: '#ffffff', fontSize: 12.5, fontFamily: 'Manrope-Bold' },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
});