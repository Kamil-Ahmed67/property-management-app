import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';
import { formatDate, formatMoney } from '../../utils/localeFormat';
// import { useLanguage } from '../providers/LanguageProvider';
// import { formatDate, formatMoney } from '../utils/localeFormat';
// import { colors } from '../theme';

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

// Takes the tenancy record as a prop — TenantHomeScreen has already
// fetched it via GetMyTenancy, so this screen doesn't re-fetch at all.
export default function MyTenancyScreen({ tenancy }) {
  const { t, lang } = useLanguage();

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

  if (!tenancy) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.muted} />
        <Text style={styles.emptyText}>{t('tenantDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(tenancy.TenantName || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.tenantName}>{tenancy.TenantName}</Text>
        {tenancy.TenantType ? (
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{tenantTypeLabel(tenancy.TenantType)}</Text>
          </View>
        ) : null}
      </View>

      <SectionCard title={t('tenantDetail.tenantInfo')}>
        <InfoRow icon="call-outline" label={t('common.phone')} value={tenancy.TenantPhone} />
        <InfoRow icon="mail-outline" label={t('common.email')} value={tenancy.TenantEmail} />
        <InfoRow icon="card-outline" label={t('tenantDetail.nid')} value={tenancy.NID} />
        <InfoRow
          icon="calendar-outline"
          label={t('tenantDetail.dob')}
          value={formatDate(tenancy.DOB, lang, t)}
        />
        <InfoRow
          icon="body-outline"
          label={t('tenantDetail.religion')}
          value={religionLabel(tenancy.Religion)}
        />
      </SectionCard>

      <SectionCard title={t('tenantDetail.propertyUnit')}>
        <InfoRow
          icon="business-outline"
          label={t('tenantDetail.property')}
          value={tenancy.PropertyName}
        />
        <InfoRow
          icon="location-outline"
          label={t('common.address')}
          value={tenancy.PropertyAddress}
        />
        <InfoRow icon="home-outline" label={t('tenantDetail.flat')} value={tenancy.FlatName} />
        <InfoRow icon="layers-outline" label={t('tenantDetail.floor')} value={tenancy.Floor} />
      </SectionCard>

      <SectionCard title={t('tenantDetail.leasePayment')}>
        <InfoRow
          icon="calendar-outline"
          label={t('tenantDetail.leasePeriod')}
          value={`${formatDate(tenancy.StartDate, lang, t)} → ${formatDate(tenancy.EndDate, lang, t)}`}
        />
        <InfoRow
          icon="cash-outline"
          label={t('tenantDetail.monthlyAmount')}
          value={tenancy.MonthlyAmount != null ? formatMoney(tenancy.MonthlyAmount, lang) : null}
        />
        <InfoRow
          icon="wallet-outline"
          label={t('tenantDetail.advancePayment')}
          value={tenancy.Advance != null ? formatMoney(tenancy.Advance, lang) : null}
        />
      </SectionCard>

      <SectionCard title={t('tenantDetail.emergencyContact')}>
        <InfoRow icon="person-outline" label={t('common.name')} value={tenancy.EName} />
        <InfoRow icon="call-outline" label={t('common.phone')} value={tenancy.EPhone} />
        <InfoRow icon="people-outline" label={t('tenantDetail.relation')} value={tenancy.ERelation} />
        <InfoRow icon="location-outline" label={t('common.address')} value={tenancy.EAddress} />
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
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 16,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { color: '#ffffff', fontSize: 24, fontFamily: 'Manrope-Bold' },
  tenantName: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', textAlign: 'center' },
  typePill: {
    marginTop: 8, backgroundColor: `${colors.primary}14`, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  typePillText: { color: colors.primary, fontSize: 12, fontFamily: 'Manrope-Bold' },
  sectionCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  sectionTitle: {
    color: colors.primary, fontSize: 12, fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: `${colors.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { color: colors.muted, fontSize: 11, fontFamily: 'Manrope-SemiBold', marginBottom: 1 },
  infoValue: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-SemiBold' },
});