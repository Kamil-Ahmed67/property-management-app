import { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { colors } from '../theme';
import config from '../config';

const TENANT_ID = 'PropHub';

// Reuses the EXISTING GetTenantList endpoint — no new backend needed,
// since ConnectionStatus/TenantUserId were already added to vw_TenantFull.
// This just filters down to the ones actually accepted.
export default function ConnectedTenantsScreen({ onSelectTenant }) {
  const { loginData } = useContext(AuthContext);
  const phone = loginData?.Phone || '';
  const uId = loginData?.Id;

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}&uId=${uId}`,
          { headers: { TenantId: TENANT_ID } }
        );
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success) {
          setTenants((data.data || []).filter((t) => t.ConnectionStatus === 'Connected'));
        }
      } catch (err) {
        console.log('Failed to load connected tenants:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [phone, uId]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.title}>Connected Tenants</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tenants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tenants have connected their accounts yet.</Text>
        </View>
      ) : (
        tenants.map((tenant) => (
          <TouchableOpacity
            key={tenant.Id}
            style={styles.card}
            onPress={() => onSelectTenant?.(tenant.Id)}
            activeOpacity={0.75}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(tenant.TenantName || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.tenantName} numberOfLines={1}>{tenant.TenantName}</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {tenant.PropertyName} — {tenant.FlatName} ({tenant.Floor})
              </Text>
            </View>
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  tenantName: { color: colors.text, fontSize: 14, fontFamily: 'Manrope-Bold' },
  locationText: { color: colors.muted, fontSize: 11.5, fontFamily: 'Manrope-Medium', marginTop: 1 },
  connectedBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center',
  },
});