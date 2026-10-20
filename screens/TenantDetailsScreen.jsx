import { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { formatDate, formatMoney } from '../utils/localeFormat';
import { colors } from '../theme';
import config from '../config';
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
  const [movingOut, setMovingOut] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resultModal, setResultModal] = useState(null);

  useEffect(() => {
    if (!phone || !tenantId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}&uId=${loginData?.Id}`,
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
    return key ? t(key) : value;
  }

  function religionLabel(value) {
    if (!value) return value;
    const key = RELIGION_KEYS[value.toLowerCase()];
    return key ? t(key) : value;
  }

  async function handleMoveOut() {
    setConfirmVisible(false);
    setMovingOut(true);
    try {
      const response = await fetch(`${config.BMS_API}api/MoveOutTenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TenantId: TENANT_ID },
        body: JSON.stringify({
          TenantId: tenant.Id,
          UId: loginData?.Id,
          EntryBy: loginData?.Name || phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('tenantDetail.moveOutFailed'));
      }
      // আবার fetch না করেই স্ক্রিনে Vacant দেখাবে
      setTenant((prev) => ({
        ...prev,
        ConnectionStatus: 'Disconnected',
        EndDate: new Date().toISOString(),
      }));
      setResultModal({
        type: 'success',
        title: t('tenantDetail.movedOutTitle'),
        message: t('tenantDetail.movedOutMsg'),
      });
    } catch (err) {
      setResultModal({
        type: 'error',
        title: t('form.couldNotSave'),
        message: err.message || t('tenantDetail.moveOutFailed'),
      });
    } finally {
      setMovingOut(false);
    }
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

  // No real PropertyId — added via manual connection-request accept,
  // so property/unit is whatever the tenant typed themselves.
  const isTenantProvided = !tenant.PropertyId;
  const isMovedOut = tenant.ConnectionStatus === 'Disconnected';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.headerCard, isTenantProvided && styles.headerCardTenantProvided]}>
        <View
          style={[
            styles.avatar,
            isTenantProvided && styles.avatarTenantProvided,
            isMovedOut && styles.avatarMovedOut,
          ]}
        >
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
        {isTenantProvided ? (
          <View style={styles.providedBadge}>
            <Ionicons name="information-circle-outline" size={12} color={colors.accent} />
            <Text style={styles.providedBadgeText}>{t('tenantList.tenantProvided')}</Text>
          </View>
        ) : null}
        {isMovedOut ? (
          <View style={styles.movedOutBadge}>
            <Ionicons name="exit-outline" size={12} color={colors.error} />
            <Text style={styles.movedOutBadgeText}>{t('tenantDetail.movedOutBadge')}</Text>
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

      {/* Property + flat */}
      <SectionCard title={t('tenantDetail.propertyUnit')}>
        <InfoRow
          icon="business-outline"
          label={t('tenantDetail.property')}
          value={tenant.DisplayPropertyName}
        />
        {!isTenantProvided ? (
          <InfoRow icon="location-outline" label={t('common.address')} value={tenant.PropertyAddress} />
        ) : null}
        <InfoRow icon="home-outline" label={t('tenantDetail.flat')} value={tenant.DisplayUnitNo} />
        {!isTenantProvided ? (
          <InfoRow icon="layers-outline" label={t('tenantDetail.floor')} value={tenant.Floor} />
        ) : null}
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

      {/* Move out */}
      {!isMovedOut ? (
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
              <Text style={styles.moveOutText}>{t('tenantDetail.moveOut')}</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      <StatusModal
        visible={confirmVisible}
        type="error"
        icon="help-circle"
        title={t('tenantDetail.moveOutConfirmTitle')}
        message={t('tenantDetail.moveOutConfirmMsg')}
        actionLabel={t('tenantDetail.moveOutYes')}
        secondaryLabel={t('common.cancel')}
        onAction={handleMoveOut}
        onSecondary={() => setConfirmVisible(false)}
        onRequestClose={() => setConfirmVisible(false)}
      />

      <StatusModal
        visible={!!resultModal}
        type={resultModal?.type}
        title={resultModal?.title}
        message={resultModal?.message}
        actionLabel={t('form.done')}
        onAction={() => setResultModal(null)}
        onRequestClose={() => setResultModal(null)}
      />
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
  headerCardTenantProvided: {
    borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarTenantProvided: { backgroundColor: colors.accent },
  avatarMovedOut: { backgroundColor: colors.muted },
  avatarText: { color: '#ffffff', fontSize: 24, fontFamily: 'Manrope-Bold' },
  tenantName: { color: colors.text, fontSize: 18, fontFamily: 'Manrope-ExtraBold', textAlign: 'center' },
  typePill: {
    marginTop: 8, backgroundColor: `${colors.accent}1A`, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  typePillText: { color: colors.accent, fontSize: 12, fontFamily: 'Manrope-Bold' },
  providedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.accent}14`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 8,
  },
  providedBadgeText: { color: colors.accent, fontSize: 11, fontFamily: 'Manrope-Bold' },
  movedOutBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.error}14`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 8,
  },
  movedOutBadgeText: { color: colors.error, fontSize: 11, fontFamily: 'Manrope-Bold' },
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
  moveOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12,
    paddingVertical: 13, marginTop: 4,
  },
  moveOutText: { color: colors.error, fontSize: 13.5, fontFamily: 'Manrope-Bold' },
});