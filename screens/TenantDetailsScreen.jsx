import { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate, formatMoney } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';

const TENANT_ID = 'PropHub';

// `TenantType`/`Religion` come from the API in English (the same values
// AddTenantsScreen writes) — map them to the matching translation key so
// this screen shows a translated label without changing the stored value.
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

export default function TenantDetailScreen({ tenantId }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone || !tenantId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // The API only exposes a list endpoint, not a get-by-id — fetch the
        // full list and find the matching record. Fine at this data scale;
        // worth adding a dedicated GetTenantById endpoint later if the
        // tenant list ever grows large enough for this to matter.
        const response = await fetch(
          `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          const match = (data.data || []).find((tenantRecord) => tenantRecord.Id === tenantId);
          setTenant(match || null);
        }
      } catch (err) {
        console.log('Failed to load tenant details:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [phone, tenantId]);

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

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!tenant) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.muted} />
        <Text style={styles.emptyText}>{t('tenantDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(tenant.TenantName || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.tenantName}>{tenant.TenantName}</Text>
        {tenant.TenantType ? (
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{tenantTypeLabel(tenant.TenantType)}</Text>
          </View>
        ) : null}
      </View>

      {/* Tenant personal info */}
      <SectionCard title={t('tenantDetail.tenantInfo')}>
        <InfoRow icon="call-outline" label={t('common.phone')} value={tenant.TenantPhone} />
        <InfoRow icon="mail-outline" label={t('common.email')} value={tenant.TenantEmail} />
        <InfoRow icon="card-outline" label={t('tenantDetail.nid')} value={tenant.NID} />
        <InfoRow
          icon="calendar-outline"
          label={t('tenantDetail.dob')}
          value={formatDate(tenant.DOB, lang, t)}
        />
        <InfoRow
          icon="body-outline"
          label={t('tenantDetail.religion')}
          value={religionLabel(tenant.Religion)}
        />
      </SectionCard>

      {/* Property + flat details */}
      <SectionCard title={t('tenantDetail.propertyUnit')}>
        <InfoRow
          icon="business-outline"
          label={t('tenantDetail.property')}
          value={tenant.PropertyName}
        />
        <InfoRow
          icon="location-outline"
          label={t('common.address')}
          value={tenant.PropertyAddress}
        />
        <InfoRow icon="home-outline" label={t('tenantDetail.flat')} value={tenant.FlatName} />
        <InfoRow icon="layers-outline" label={t('tenantDetail.floor')} value={tenant.Floor} />
      </SectionCard>

      {/* Lease terms */}
      <SectionCard title={t('tenantDetail.leasePayment')}>
        <InfoRow
          icon="calendar-outline"
          label={t('tenantDetail.leasePeriod')}
          value={`${formatDate(tenant.StartDate, lang, t)} → ${formatDate(tenant.EndDate, lang, t)}`}
        />
        <InfoRow
          icon="cash-outline"
          label={t('tenantDetail.monthlyAmount')}
          value={tenant.MonthlyAmount != null ? formatMoney(tenant.MonthlyAmount, lang) : null}
        />
        <InfoRow
          icon="wallet-outline"
          label={t('tenantDetail.advancePayment')}
          value={tenant.Advance != null ? formatMoney(tenant.Advance, lang) : null}
        />
      </SectionCard>

      {/* Emergency contact */}
      <SectionCard title={t('tenantDetail.emergencyContact')}>
        <InfoRow icon="person-outline" label={t('common.name')} value={tenant.EName} />
        <InfoRow icon="call-outline" label={t('common.phone')} value={tenant.EPhone} />
        <InfoRow icon="people-outline" label={t('tenantDetail.relation')} value={tenant.ERelation} />
        <InfoRow icon="location-outline" label={t('common.address')} value={tenant.EAddress} />
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 40 },
  centerFill: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.bg,
  },
  emptyText: { color: colors.muted, fontSize: 13, fontFamily: 'Manrope-Regular' },
  headerCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 22,
    alignItems: 'center', marginBottom: 16,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#ffffff', fontSize: 24, fontFamily: 'Manrope-Bold' },
  tenantName: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', textAlign: 'center' },
  typePill: {
    marginTop: 8, backgroundColor: `${colors.accent}1A`, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  typePillText: { color: colors.accent, fontSize: 12, fontFamily: 'Manrope-Bold' },
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14,
  },
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
});