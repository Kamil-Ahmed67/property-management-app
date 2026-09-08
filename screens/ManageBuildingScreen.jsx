import { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import StatusModal from '../components/StatusModal';
const TENANT_ID = 'PropHub';

export default function ManageBuildingScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detailsByProperty, setDetailsByProperty] = useState({});
  const [loadingDetailsFor, setLoadingDetailsFor] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { property, goingActive }
  const [resultState, setResultState] = useState({ visible: false, type: 'success', title: '', message: '' });

  // Delete-a-unit flow, same confirm/result pattern as the property toggle above.
  const [deleteConfirmState, setDeleteConfirmState] = useState(null); // { id, propertyId, label }
  const [deletingId, setDeletingId] = useState(null);

  const phone = loginData?.Phone || loginData?.phone || '';

  useEffect(() => {
    if (!phone) {
      setLoadingProperties(false);
      return;
    }
    loadProperties();
  }, [phone]);

  async function loadProperties() {
    try {
      const response = await fetch(
        `${config.BMS_API}api/GetMyPropertyList?phone=${encodeURIComponent(phone)}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setProperties(data.data || []);
      }
    } catch (err) {
      console.log('Failed to load my property list:', err.message);
    } finally {
      setLoadingProperties(false);
    }
  }

  async function toggleExpand(propertyId) {
    if (expandedId === propertyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(propertyId);
    if (detailsByProperty[propertyId]) return;
    setLoadingDetailsFor(propertyId);
    try {
      const response = await fetch(
        `${config.BMS_API}api/GetPropertyDetailsFullList?propertyId=${propertyId}`,
        { headers: { TenantId: TENANT_ID } }
      );
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setDetailsByProperty((prev) => ({ ...prev, [propertyId]: data.data || [] }));
      }
    } catch (err) {
      console.log('Failed to load property details:', err.message);
    } finally {
      setLoadingDetailsFor(null);
    }
  }

  function confirmToggle(property) {
    const goingActive = !property.IsActive;
    setConfirmState({ property, goingActive });
  }

  function closeConfirm() {
    setConfirmState(null);
  }

  function handleConfirmAction() {
    if (!confirmState) return;
    const { property, goingActive } = confirmState;
    setConfirmState(null);
    performToggle(property, goingActive);
  }

  function closeResult() {
    setResultState((s) => ({ ...s, visible: false }));
  }

  async function performToggle(property, nextIsActive) {
    setTogglingId(property.Id);
    try {
      const response = await fetch(`${config.BMS_API}api/ToggleProperty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          PropertyId: property.Id,
          IsActive: nextIsActive,
          Phone: phone,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('manageBuilding.toggleFailed'));
      }

      setProperties((prev) =>
        prev.map((p) => (p.Id === property.Id ? { ...p, IsActive: nextIsActive } : p))
      );

      setResultState({
        visible: true,
        type: 'success',
        title: nextIsActive
          ? t('manageBuilding.activatedTitle')
          : t('manageBuilding.deactivatedTitle'),
        message: nextIsActive
          ? t('manageBuilding.activatedMessage', { name: property.Name })
          : t('manageBuilding.deactivatedMessage', { name: property.Name }),
      });
    } catch (err) {
      setResultState({
        visible: true,
        type: 'error',
        title: t('manageBuilding.errorTitle'),
        message: err.message || t('manageBuilding.toggleFailed'),
      });
    } finally {
      setTogglingId(null);
    }
  }

  // --- Delete a unit (soft delete via IsActive = 0 on tblPropertyDetails) ---

  function requestDeleteDetail(detail, propertyId) {
    setDeleteConfirmState({
      id: detail.Id,
      propertyId,
      label: `${detail.FlatName} (${detail.Floor})`,
    });
  }

  function closeDeleteConfirm() {
    setDeleteConfirmState(null);
  }

  function handleDeleteConfirmAction() {
    if (!deleteConfirmState) return;
    const target = deleteConfirmState;
    setDeleteConfirmState(null);
    performDeleteDetail(target);
  }

  async function performDeleteDetail(target) {
    setDeletingId(target.id);
    try {
      const response = await fetch(`${config.BMS_API}api/DeletePropertyDetails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          PropDetailsId: target.id,
          Phone: phone,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || t('manageBuilding.deleteFailed'));
      }

      // Remove locally from that property's cached details list — updates
      // immediately, no refetch needed.
      setDetailsByProperty((prev) => ({
        ...prev,
        [target.propertyId]: (prev[target.propertyId] || []).filter((d) => d.Id !== target.id),
      }));

      setResultState({
        visible: true,
        type: 'success',
        title: t('manageBuilding.unitDeletedTitle'),
        message: t('manageBuilding.unitDeletedMessage', { label: target.label }),
      });
    } catch (err) {
      setResultState({
        visible: true,
        type: 'error',
        title: t('manageBuilding.errorTitle'),
        message: err.message || t('manageBuilding.deleteFailed'),
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>{t('form.eyebrow')}</Text>
            <Text style={styles.title}>{t('manageBuilding.title')}</Text>
          </View>
        </View>

        {loadingProperties ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>{t('manageBuilding.empty')}</Text>
          </View>
        ) : (
          properties.map((property) => {
            const isExpanded = expandedId === property.Id;
            const details = detailsByProperty[property.Id] || [];
            const isLoadingDetails = loadingDetailsFor === property.Id;
            const isActive = !!property.IsActive;
            const isToggling = togglingId === property.Id;

            return (
              <View
                key={property.Id}
                style={[styles.propertyCard, !isActive && styles.propertyCardInactive]}
              >
                <View style={styles.propertyHeader}>
                  <TouchableOpacity
                    style={styles.propertyHeaderTouchable}
                    onPress={() => toggleExpand(property.Id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconBadgeWrap}>
                      <View
                        style={[
                          styles.propertyIconWrap,
                          !isActive && styles.propertyIconWrapInactive,
                        ]}
                      >
                        <Ionicons
                          name="home-outline"
                          size={18}
                          color={isActive ? colors.primary : colors.muted}
                        />
                      </View>
                      <View
                        style={[
                          styles.statusBadgeDot,
                          { backgroundColor: isActive ? colors.primary : colors.muted },
                        ]}
                      />
                    </View>
                    <View style={styles.propertyHeaderText}>
                      <Text
                        style={[styles.propertyName, !isActive && styles.propertyNameInactive]}
                        numberOfLines={1}
                      >
                        {property.Name}
                      </Text>
                      <Text style={styles.propertyAddress} numberOfLines={1}>
                        {property.Address}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.headerRight}>
                    {isToggling ? (
                      <ActivityIndicator size="small" color={colors.muted} style={styles.switchSpinner} />
                    ) : (
                      <Switch
                        value={isActive}
                        onValueChange={() => confirmToggle(property)}
                        trackColor={{ false: colors.border, true: `${colors.primary}55` }}
                        thumbColor={isActive ? colors.primary : '#f4f3f4'}
                      />
                    )}
                    <TouchableOpacity onPress={() => toggleExpand(property.Id)} hitSlop={8}>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.detailsWrap}>
                    {property.Type || property.SecurityName ? (
                      <View style={styles.metaRow}>
                        {property.Type ? (
                          <Text style={styles.metaText}>
                            {t('manageBuilding.type')}: {property.Type}
                          </Text>
                        ) : null}
                        {property.SecurityName ? (
                          <Text style={styles.metaText}>
                            {t('manageBuilding.security')}: {property.SecurityName}
                            {property.SecurityPhone ? ` (${property.SecurityPhone})` : ''}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {isLoadingDetails ? (
                      <View style={styles.centerBoxSmall}>
                        <ActivityIndicator size="small" color={colors.muted} />
                      </View>
                    ) : details.length === 0 ? (
                      <View style={styles.noFlatsContainer}>
                        <Text style={styles.noFlatsText}>{t('manageBuilding.noUnits')}</Text>
                        <TouchableOpacity
                          style={styles.addDetailsBtn}
                          onPress={() =>
                            onNavigate?.('add-property-details', { propertyId: property.Id })
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                          <Text style={styles.addDetailsBtnText}>
                            {t('manageBuilding.addDetails')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {details.map((detail, index) => {
                          const isDeletingThis = deletingId === detail.Id;
                          return (
                            <View
                              key={detail.Id}
                              style={[
                                styles.flatRow,
                                index !== details.length - 1 && styles.flatRowDivider,
                              ]}
                            >
                              <View style={styles.flatHeaderRow}>
                                <Text style={styles.flatName}>{detail.FlatName}</Text>
                                <View style={styles.flatHeaderRight}>
                                  <Text style={styles.flatFloor}>{detail.Floor}</Text>
                                  {isDeletingThis ? (
                                    <ActivityIndicator size="small" color={colors.error} />
                                  ) : (
                                    <TouchableOpacity
                                      onPress={() => requestDeleteDetail(detail, property.Id)}
                                      hitSlop={8}
                                      style={styles.deleteIconBtn}
                                    >
                                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                              <View style={styles.flatStatsRow}>
                                <View style={styles.flatStat}>
                                  <Ionicons name="bed-outline" size={14} color={colors.muted} />
                                  <Text style={styles.flatStatText}>
                                    {detail.Room ?? '—'} {t('manageBuilding.room')}
                                  </Text>
                                </View>
                                <View style={styles.flatStat}>
                                  <Ionicons name="water-outline" size={14} color={colors.muted} />
                                  <Text style={styles.flatStatText}>
                                    {detail.Bathroom ?? '—'} {t('manageBuilding.bath')}
                                  </Text>
                                </View>
                                <View style={styles.flatStat}>
                                  <Ionicons name="balloon-outline" size={14} color={colors.muted} />
                                  <Text style={styles.flatStatText}>
                                    {detail.Balcony ?? '—'} {t('manageBuilding.balcony')}
                                  </Text>
                                </View>
                              </View>
                              {detail.MeterNo ? (
                                <Text style={styles.meterText}>
                                  {t('manageBuilding.meterNo')}: {detail.MeterNo}
                                </Text>
                              ) : null}
                            </View>
                          );
                        })}

                        <TouchableOpacity
                          style={styles.addMoreBtn}
                          onPress={() =>
                            onNavigate?.('add-property-details', { propertyId: property.Id })
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                          <Text style={styles.addMoreBtnText}>{t('manageBuilding.addMore')}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigate?.('add-property')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#ffffff" />
        <Text style={styles.fabText}>{t('manageBuilding.addProperty')}</Text>
      </TouchableOpacity>

      <StatusModal
        visible={!!confirmState}
        type={confirmState?.goingActive ? 'success' : 'error'}
        icon="power"
        title={
          confirmState?.goingActive
            ? t('manageBuilding.activateTitle')
            : t('manageBuilding.deactivateTitle')
        }
        message={
          confirmState
            ? confirmState.goingActive
              ? t('manageBuilding.activateMessage', { name: confirmState.property.Name })
              : t('manageBuilding.deactivateMessage', { name: confirmState.property.Name })
            : ''
        }
        actionLabel={
          confirmState?.goingActive
            ? t('manageBuilding.activate')
            : t('manageBuilding.deactivate')
        }
        onAction={handleConfirmAction}
        secondaryLabel={t('manageBuilding.cancel')}
        onSecondary={closeConfirm}
        onRequestClose={closeConfirm}
      />

      <StatusModal
        visible={!!deleteConfirmState}
        type="error"
        icon="trash"
        title={t('manageBuilding.deleteUnitTitle')}
        message={
          deleteConfirmState
            ? t('manageBuilding.deleteUnitMessage', { label: deleteConfirmState.label })
            : ''
        }
        actionLabel={t('manageBuilding.delete')}
        onAction={handleDeleteConfirmAction}
        secondaryLabel={t('manageBuilding.cancel')}
        onSecondary={closeDeleteConfirm}
        onRequestClose={closeDeleteConfirm}
      />

      <StatusModal
        visible={resultState.visible}
        type={resultState.type}
        title={resultState.title}
        message={resultState.message}
        actionLabel={t('form.done')}
        onAction={closeResult}
        onRequestClose={closeResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 24, paddingBottom: 90 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  centerBox: { paddingVertical: 40, alignItems: 'center' },
  centerBoxSmall: { paddingVertical: 16, alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
  },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  propertyCard: {
    backgroundColor: colors.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden',
  },
  propertyCardInactive: {
    opacity: 0.75,
  },
  propertyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14,
  },
  propertyHeaderTouchable: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconBadgeWrap: { position: 'relative' },
  propertyIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center',
  },
  propertyIconWrapInactive: {
    backgroundColor: colors.border,
  },
  statusBadgeDot: {
    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: colors.surface,
  },
  propertyHeaderText: { flex: 1 },
  propertyName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  propertyNameInactive: { color: colors.muted },
  propertyAddress: { color: colors.muted, fontSize: 12, marginTop: 2 },
  headerRight: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  switchSpinner: {
    width: 40,
  },
  detailsWrap: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14,
  },
  metaRow: { marginBottom: 10, gap: 3 },
  metaText: { color: colors.muted, fontSize: 12 },
  flatRow: { paddingVertical: 10 },
  flatRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  flatHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  flatHeaderRight: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  deleteIconBtn: {
    padding: 2,
  },
  flatName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  flatFloor: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  flatStatsRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  flatStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flatStatText: { color: colors.muted, fontSize: 12 },
  meterText: { color: colors.muted, fontSize: 11 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 30, gap: 6, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  noFlatsContainer: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  noFlatsText: { color: colors.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  addDetailsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  addDetailsBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, borderWidth: 1.5, borderColor: colors.primary,
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  addMoreBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});