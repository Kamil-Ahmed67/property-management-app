import { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import { formatDate, formatMoney } from '../utils/localeFormat';

const TENANT_ID = 'PropHub';

// `TenantType`/`Religion` come from the API in English (the same values
// AddTenantsScreen writes) — map them to the matching translation key so
// the list shows a translated label without changing the stored value.
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

export default function TenantListScreen({ onSelectTenant }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}`,
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
    })();
  }, [phone]);

  function tenantTypeLabel(value) {
    if (!value) return value;
    const key = TENANT_TYPE_KEYS[value.toLowerCase()];
    return key ? t(key) : value; // unknown value from API — show as-is
  }

  function religionLabel(value) {
    if (!value) return value;
    const key = RELIGION_KEYS[value.toLowerCase()];
    return key ? t(key) : value;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('tenantList.eyebrow')}</Text>
          <Text style={styles.title}>{t('tenantList.title')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tenants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyText}>{t('tenantList.empty')}</Text>
        </View>
      ) : (
        tenants.map((tenant) => (
          <TouchableOpacity
            key={tenant.Id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => onSelectTenant?.(tenant.Id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(tenant.TenantName || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.tenantName}>{tenant.TenantName}</Text>
                <Text style={styles.tenantPhone}>{tenant.TenantPhone}</Text>
              </View>
              {tenant.TenantType ? (
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{tenantTypeLabel(tenant.TenantType)}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="business-outline" size={14} color={colors.muted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {tenant.PropertyName} — {tenant.FlatName} ({tenant.Floor})
              </Text>
            </View>

            <View style={styles.badgeRow}>
              {tenant.NID ? (
                <View style={styles.badge}>
                  <Ionicons name="card-outline" size={11} color={colors.muted} />
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

            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {formatDate(tenant.StartDate, lang, t)} → {formatDate(tenant.EndDate, lang, t)}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontFamily: 'Manrope-Bold', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 20, fontFamily: 'Manrope-ExtraBold', marginTop: 2 },
  centerBox: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
  },
  emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Regular', textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontFamily: 'Manrope-Bold' },
  cardHeaderText: { flex: 1 },
  tenantName: { color: colors.text, fontSize: 15, fontFamily: 'Manrope-Bold' },
  tenantPhone: { color: colors.muted, fontSize: 12, fontFamily: 'Manrope-Regular', marginTop: 1 },
  typePill: {
    backgroundColor: `${colors.accent}1A`, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typePillText: { color: colors.accent, fontSize: 11, fontFamily: 'Manrope-Bold' },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  locationText: { color: colors.text, fontSize: 13, fontFamily: 'Manrope-Medium', flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.bg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-SemiBold' },
  statsRow: {
    flexDirection: 'row', gap: 20, marginBottom: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  stat: {},
  statLabel: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-SemiBold', marginBottom: 2 },
  statValue: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold' },
  dateRow: {},
  dateText: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-Regular' },
});