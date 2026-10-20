import { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import { formatDate, formatMoney } from '../utils/localeFormat';
import StatusModal from '../components/StatusModal';

const TENANT_ID = 'PropHub';

const TENANT_TYPE_KEYS = {
  family: 'tenantType.family',
  bachelor: 'tenantType.bachelor',
  corporate: 'tenantType.corporate',
  student: 'tenantType.student',
};

const RELIGION_KEYS = {
  islam: 'religion.islam',
  hinduism: 'religion.hinduism',
  christianity: 'religion.christianity',
  buddhism: 'religion.buddhism',
  other: 'religion.other',
};

export default function TenantListScreen({ onNavigate, onSelectTenant }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingInviteId, setSendingInviteId] = useState(null);
  const [modal, setModal] = useState(null);

  async function loadTenants() {
    try {
      const response = await fetch(
       `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}&uId=${loginData?.Id}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setTenants(data.data || []);
      }
    } catch (err) {
      console.log('Failed to load tenant list:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  async function handleSendInvite(tenantId) {
    setSendingInviteId(tenantId);
    try {
      const response = await fetch(`${config.BMS_API}api/SendConnectInvite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({ UId: loginData?.Id, TenantId: tenantId, EntryBy: phone }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.data) {
        loadTenants();
      } else {
        // data.data === false means the backend found no matching
        // account for this tenant's phone number yet — worth telling
        // the landlord explicitly rather than the button silently
        // doing nothing.
        setModal({
          type: 'error',
          title: t('tenantList.noAccountTitle'),
          message: t('tenantList.noAccountMessage'),
        });
      }
    } catch (err) {
      console.log('Failed to send invite:', err.message);
    } finally {
      setSendingInviteId(null);
    }
  }

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) => {
      const name = (tenant.TenantName || '').toLowerCase();
      const tenantPhone = (tenant.TenantPhone || '').toLowerCase();
      const property = (tenant.DisplayPropertyName || '').toLowerCase();
      const flat = (tenant.DisplayUnitNo || '').toLowerCase();
      return (
        name.includes(query) ||
        tenantPhone.includes(query) ||
        property.includes(query) ||
        flat.includes(query)
      );
    });
  }, [tenants, search]);

  function tenantTypeLabel(value) {
    if (!value) return value;
    const key = TENANT_TYPE_KEYS[value.toLowerCase()];
    return key ? t(key) : value;
  }

  function religionLabel(value) {
    if (!value) return value;
    const key = RELIGION_KEYS[value.toLowerCase()];
    return key ? t(key) : value;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>{t('tenantList.eyebrow')}</Text>
            <Text style={styles.title}>{t('tenantList.title')}</Text>
          </View>
        </View>

        {!loading && tenants.length > 0 ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('tenantList.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : tenants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={26} color={colors.muted} />
            <Text style={styles.emptyText}>{t('tenantList.empty')}</Text>
          </View>
        ) : filteredTenants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search" size={26} color={colors.muted} />
            <Text style={styles.emptyText}>{t('tenantList.noResults')}</Text>
          </View>
        ) : (
          filteredTenants.map((tenant) => {
            const isTenantProvided = !tenant.PropertyId;

            return (
              <TouchableOpacity
                key={tenant.Id}
                style={[styles.card, isTenantProvided && styles.cardTenantProvided]}
                activeOpacity={0.75}
                onPress={() => onSelectTenant?.(tenant.Id)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, isTenantProvided && styles.avatarTenantProvided]}>
                    <Text style={styles.avatarText}>
                      {(tenant.TenantName || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.tenantName} numberOfLines={1}>{tenant.TenantName}</Text>
                    <Text style={styles.tenantPhone}>{tenant.TenantPhone}</Text>
                  </View>
                  {tenant.TenantType ? (
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>{tenantTypeLabel(tenant.TenantType)}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </View>

                {isTenantProvided ? (
                  <View style={styles.providedBadge}>
                    <Ionicons name="information-circle-outline" size={12} color={colors.accent} />
                    <Text style={styles.providedBadgeText}>{t('tenantList.tenantProvided')}</Text>
                  </View>
                ) : null}

                <View style={styles.locationRow}>
                  <Ionicons name="business-outline" size={13} color={colors.muted} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {isTenantProvided
                      ? tenant.DisplayPropertyName
                      : `${tenant.DisplayPropertyName} — ${tenant.DisplayUnitNo} (${tenant.Floor})`}
                  </Text>
                </View>

                {(tenant.NID || tenant.Religion) ? (
                  <View style={styles.badgeRow}>
                    {tenant.NID ? (
                      <View style={styles.badge}>
                        <Ionicons name="card-outline" size={10} color={colors.muted} />
                        <Text style={styles.badgeText}>
                          {t('tenantList.nid')} {tenant.NID}
                        </Text>
                      </View>
                    ) : null}
                    {tenant.Religion ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{religionLabel(tenant.Religion)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('tenantList.monthlyRent')}</Text>
                    <Text style={styles.statValue}>
                      {tenant.MonthlyAmount != null ? formatMoney(tenant.MonthlyAmount, lang) : '—'}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('tenantList.advance')}</Text>
                    <Text style={styles.statValue}>
                      {tenant.Advance != null ? formatMoney(tenant.Advance, lang) : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomRow}>
                  <Text style={styles.dateText}>
                    {formatDate(tenant.StartDate, lang, t)} → {formatDate(tenant.EndDate, lang, t)}
                  </Text>

                  {/* Connection action — bottom right of the card */}
                    {tenant.ConnectionStatus === 'Disconnected' ? (
                    <View style={styles.movedOutTag}>
                      <Ionicons name="exit-outline" size={13} color={colors.error} />
                      <Text style={styles.movedOutTagText}>{t('tenantDetail.movedOutBadge')}</Text>
                    </View>
                  ) : 
                  tenant.ConnectionStatus === 'Connected' ? (
                    <View style={styles.connectedTag}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                      <Text style={styles.connectedTagText}>{t('tenantList.connected')}</Text>
                    </View>
                  ) : tenant.ConnectionStatus === 'Pending' ? (
                    <View style={styles.pendingTag}>
                      <Ionicons name="time-outline" size={13} color={colors.accent} />
                      <Text style={styles.pendingTagText}>{t('tenantList.invitePending')}</Text>
                    </View>
                  ) : tenant.TenantPhone ? (
                    <TouchableOpacity
                      style={styles.sendRequestButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSendInvite(tenant.Id);
                      }}
                      disabled={sendingInviteId === tenant.Id}
                      activeOpacity={0.8}
                    >
                      {sendingInviteId === tenant.Id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="link-outline" size={13} color={colors.primary} />
                          <Text style={styles.sendRequestText}>{t('tenantList.sendRequest')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigate?.('add-tenants')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#ffffff" />
      </TouchableOpacity>

      <StatusModal
        visible={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actionLabel={t('form.done')}
        onAction={() => setModal(null)}
        onRequestClose={() => setModal(null)}
      />
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

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Manrope-Regular', color: colors.text, padding: 0 },

  centerBox: { paddingVertical: 36, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 22,
    alignItems: 'center', gap: 8,
  },
  emptyText: { color: colors.muted, fontSize: 12.5, fontFamily: 'Manrope-Regular', textAlign: 'center' },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 13, marginBottom: 10,
  },
  cardTenantProvided: {
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTenantProvided: {
    backgroundColor: colors.accent,
  },
  avatarText: { color: '#ffffff', fontSize: 14, fontFamily: 'Manrope-Bold' },
  cardHeaderText: { flex: 1 },
  tenantName: { color: colors.text, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
  tenantPhone: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-Regular', marginTop: 1 },
  typePill: {
    backgroundColor: `${colors.accent}14`, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  typePillText: { color: colors.accent, fontSize: 10, fontFamily: 'Manrope-Bold' },

  providedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: `${colors.accent}14`,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  providedBadgeText: { color: colors.accent, fontSize: 10, fontFamily: 'Manrope-Bold' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  locationText: { color: colors.text, fontSize: 12, fontFamily: 'Manrope-Medium', flex: 1 },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.bg, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { color: colors.muted, fontSize: 10, fontFamily: 'Manrope-SemiBold' },

  statsRow: {
    flexDirection: 'row', gap: 18, marginBottom: 8,
    paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border,
  },
  stat: {},
  statLabel: { color: colors.muted, fontSize: 10, fontFamily: 'Manrope-SemiBold', marginBottom: 1 },
  statValue: { color: colors.text, fontSize: 13, fontFamily: 'Manrope-Bold' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { color: colors.muted, fontSize: 10, fontFamily: 'Manrope-Regular' },

  sendRequestButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.primary}14`, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  sendRequestText: { color: colors.primary, fontSize: 10.5, fontFamily: 'Manrope-Bold' },
  pendingTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.accent}14`, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  pendingTagText: { color: colors.accent, fontSize: 10.5, fontFamily: 'Manrope-Bold' },
  connectedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.primary}14`, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  connectedTagText: { color: colors.primary, fontSize: 10.5, fontFamily: 'Manrope-Bold' },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});