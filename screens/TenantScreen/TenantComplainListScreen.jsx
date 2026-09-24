import { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../providers/AuthProvider';
import { useLanguage } from '../../providers/LanguageProvider';
import config from '../../config';
import { colors } from '../../theme';
function statusColor(s) {
  if (s === 'resolved' || s === 'closed') return '#10B981';
  if (s === 'in_progress') return '#3B82F6';
  return '#F59E0B';
}

export default function TenantComplainListScreen({ onNavigate, onBack }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${config.BMS_API}api/GetComplaintList?phone=${encodeURIComponent(phone)}`,
        { headers: { TenantId: 'PropHub' } }
      );
      const json = await res.json();
      setList(json?.success ? (json.data || []) : []);
    } catch (e) {
      console.log('Complaint list error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('section.complain') || 'Complaints'}</Text>
        <TouchableOpacity onPress={() => onNavigate('tenant-complain-create')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => String(i.Id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t('complain.empty') || 'No complaints yet'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => onNavigate('tenant-complain-detail', { id: item.Id })}
            >
              <View style={styles.row}>
                <Text style={styles.title} numberOfLines={1}>{item.Title}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor(item.Status) + '22' }]}>
                  <Text style={[styles.badgeText, { color: statusColor(item.Status) }]}>
                    {item.Status}
                  </Text>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.Description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  {item.EntryDate
                    ? new Date(item.EntryDate).toLocaleDateString()
                    : ''}
                </Text>
                <Text style={styles.meta}>· {item.Priority}</Text>
                {item.Category ? <Text style={styles.meta}>· {item.Category}</Text> : null}
              </View>
              {item.AdminReply ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>{t('complain.adminReply') || 'Owner reply'}</Text>
                  <Text style={styles.replyText} numberOfLines={2}>{item.AdminReply}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 16,
    color: colors.text,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    textTransform: 'capitalize',
  },
  desc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  meta: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  replyBox: {
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
  },
  replyLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#10B981',
    marginBottom: 2,
  },
  replyText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: colors.text,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: colors.muted,
    fontFamily: 'Manrope-Medium',
  },
});