import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import config from '../config';
import ToLetDetailScreen from './ToLetDetailScreen';
import {
  TOLET_RED,
  TOLET_RED_SOFT,
  VACANT_GREEN,
  VACANT_GREEN_SOFT,
  toBn,
  floorLabel,
  typeLabel,
  groupByProperty,
  groupByFloor,
} from '../utils/toLet';

const TENANT_ID = 'PropHub';
const FLOOR_CHIPS_PREVIEW = 3;

const BED_FILTERS = [
  { key: 'all', label: 'যেকোনো' },
  { key: '1', label: '১ বেড' },
  { key: '2', label: '২ বেড' },
  { key: '3', label: '৩+ বেড' },
];

export default function FindPropertyScreen({ onBack }) {
  const insets = useSafeAreaInsets();

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [bedFilter, setBedFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const loadToLet = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(`${config.BMS_API}api/GetToLetList`, {
        headers: { TenantId: TENANT_ID },
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setUnits(data.data || []);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.log('Failed to load to-let list:', err.message);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadToLet();
  }, [loadToLet]);

  function handleRefresh() {
    setRefreshing(true);
    loadToLet();
  }

  const properties = useMemo(() => groupByProperty(units), [units]);

  // Detail always reads the full (unfiltered) property, so every vacant
  // flat shows there even if the list is filtered by bedrooms.
  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedId) || null,
    [properties, selectedId]
  );

  // Android hardware back closes the detail page first.
  useEffect(() => {
    if (!selectedId) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedId]);

  // Property removed after a refresh (got rented) → leave the detail page.
  useEffect(() => {
    if (selectedId && !loading && !selectedProperty) setSelectedId(null);
  }, [selectedId, selectedProperty, loading]);

  const typeFilters = useMemo(() => {
    const seen = [...new Set(properties.map((p) => (p.type || '').toLowerCase()).filter(Boolean))];
    return [{ key: 'all', label: 'সব' }, ...seen.map((k) => ({ key: k, label: typeLabel(k) }))];
  }, [properties]);

  const visibleProperties = useMemo(() => {
    const q = search.trim().toLowerCase();

    return properties
      .map((p) => {
        if (typeFilter !== 'all' && (p.type || '').toLowerCase() !== typeFilter) return null;

        const propertyMatches =
          !q ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.address || '').toLowerCase().includes(q);

        const matchedUnits = p.units.filter((u) => {
          const rooms = u.Room || 0;
          const bedOk =
            bedFilter === 'all' ||
            (bedFilter === '3' ? rooms >= 3 : rooms === Number(bedFilter));
          const textOk =
            propertyMatches ||
            (u.FlatName || '').toLowerCase().includes(q) ||
            (u.Floor || '').toLowerCase().includes(q) ||
            floorLabel(u.Floor).includes(q);
          return bedOk && textOk;
        });

        return matchedUnits.length ? { ...p, units: matchedUnits } : null;
      })
      .filter(Boolean);
  }, [properties, search, typeFilter, bedFilter]);

  const totalVacant = visibleProperties.reduce((sum, p) => sum + p.units.length, 0);
  const hasActiveFilter = search.length > 0 || typeFilter !== 'all' || bedFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setBedFilter('all');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={19} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>খালি ফ্ল্যাট খুঁজুন</Text>
          <Text style={styles.headerSubtitle}>যেসব ফ্ল্যাট এখনই ভাড়া দেওয়া হবে</Text>
        </View>

        <View style={styles.headerStamp}>
          <Text style={styles.headerStampText}>TO-LET</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="এলাকা, প্রপার্টি বা ফ্ল্যাট নম্বর"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter */}
        {typeFilters.length > 2 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
            keyboardShouldPersistTaps="handled"
          >
            {typeFilters.map((filter) => {
              const active = typeFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setTypeFilter(filter.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Bedroom filter */}
        <View style={styles.segment}>
          {BED_FILTERS.map((filter) => {
            const active = bedFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setBedFilter(filter.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateDescription}>খালি ফ্ল্যাট খোঁজা হচ্ছে…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.stateWrap}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="cloud-offline-outline" size={24} color={colors.muted} />
            </View>
            <Text style={styles.stateTitle}>তালিকা লোড করা যায়নি</Text>
            <Text style={styles.stateDescription}>ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</Text>
            <TouchableOpacity
              style={styles.stateButton}
              onPress={() => {
                setLoading(true);
                loadToLet();
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.stateButtonText}>আবার চেষ্টা করুন</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {visibleProperties.length > 0 ? (
              <Text style={styles.summary}>
                {toBn(visibleProperties.length)}টি প্রপার্টিতে {toBn(totalVacant)}টি ফ্ল্যাট খালি
              </Text>
            ) : null}

            {visibleProperties.map((property) => (
              <PropertyListCard
                key={property.id}
                property={property}
                onPress={() => setSelectedId(property.id)}
              />
            ))}

            {visibleProperties.length === 0 && (
              <View style={styles.stateWrap}>
                <View style={styles.stateIconWrap}>
                  <Ionicons name="home-outline" size={24} color={colors.muted} />
                </View>
                <Text style={styles.stateTitle}>
                  {hasActiveFilter ? 'এই খোঁজে কোনো খালি ফ্ল্যাট নেই' : 'এই মুহূর্তে কোনো ফ্ল্যাট খালি নেই'}
                </Text>
                <Text style={styles.stateDescription}>
                  {hasActiveFilter
                    ? 'ফিল্টার বদলে বা অন্য এলাকার নাম দিয়ে খুঁজুন।'
                    : 'নতুন ফ্ল্যাট খালি হলে এখানে দেখাবে। নিচে টেনে রিফ্রেশ করুন।'}
                </Text>
                {hasActiveFilter && (
                  <TouchableOpacity style={styles.stateButton} onPress={clearFilters} activeOpacity={0.75}>
                    <Text style={styles.stateButtonText}>ফিল্টার মুছুন</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Detail page sits on top, so the list keeps its scroll position */}
      {selectedProperty ? (
        <View style={StyleSheet.absoluteFill}>
          <ToLetDetailScreen property={selectedProperty} onBack={() => setSelectedId(null)} />
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------
   Compact list card — name, vacancy and floors only
------------------------------------------------------- */

function PropertyListCard({ property, onPress }) {
  const floors = useMemo(() => groupByFloor(property.units), [property.units]);
  const shownFloors = floors.slice(0, FLOOR_CHIPS_PREVIEW);
  const extraFloors = floors.length - shownFloors.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.buildingIcon}>
          <Ionicons name="business" size={20} color={colors.primary} />
        </View>

        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>{property.name}</Text>
          {property.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={colors.muted} />
              <Text style={styles.addressText} numberOfLines={1}>{property.address}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stamp}>
          <Text style={styles.stampText}>TO-LET</Text>
        </View>
      </View>

      <View style={styles.floorChipRow}>
        {shownFloors.map((f) => (
          <View key={f.floor} style={styles.floorChip}>
            <Text style={styles.floorChipText}>
              {floorLabel(f.floor)} · <Text style={styles.floorChipCount}>{toBn(f.units.length)}</Text>
            </Text>
          </View>
        ))}
        {extraFloors > 0 ? (
          <View style={styles.floorChip}>
            <Text style={styles.floorChipText}>+{toBn(extraFloors)}টি তলা</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{typeLabel(property.type)}</Text>
        </View>
        <View style={styles.vacantPill}>
          <View style={styles.vacantDot} />
          <Text style={styles.vacantPillText}>
            {toBn(property.units.length)}টি ফ্ল্যাট খালি · {toBn(floors.length)}টি তলায়
          </Text>
        </View>
        <View style={styles.flexSpacer} />
        <View style={styles.viewMore}>
          <Text style={styles.viewMoreText}>বিস্তারিত</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 17, lineHeight: 23, fontFamily: 'Manrope-Bold' },
  headerSubtitle: {
    color: colors.muted, fontSize: 11.5, lineHeight: 17, fontFamily: 'Manrope-Regular', marginTop: 1,
  },
  headerStamp: {
    borderWidth: 1.5, borderColor: TOLET_RED, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: '-4deg' }],
  },
  headerStampText: { color: TOLET_RED, fontSize: 10.5, fontFamily: 'Manrope-ExtraBold', letterSpacing: 0.8 },

  content: { paddingHorizontal: 20, paddingTop: 16 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 13,
    borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1, minHeight: 44, paddingHorizontal: 9, paddingVertical: 0,
    color: colors.text, fontSize: 13, lineHeight: 19, fontFamily: 'Manrope-Regular',
  },

  filterScroll: { marginTop: 12, marginHorizontal: -20 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 2, gap: 7 },
  filterChip: {
    minHeight: 38, paddingHorizontal: 15, borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipLabel: { color: colors.muted, fontSize: 12.5, lineHeight: 20, fontFamily: 'Manrope-SemiBold' },
  filterChipLabelActive: { color: '#FFFFFF' },

  segment: {
    flexDirection: 'row', marginTop: 10, padding: 3, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  segmentItem: { flex: 1, minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: `${colors.primary}14` },
  segmentLabel: { color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: 'Manrope-SemiBold' },
  segmentLabelActive: { color: colors.primaryDark },

  summary: {
    color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: 'Manrope-Medium',
    marginTop: 16, marginBottom: 10,
  },

  /* Compact card */
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 13, marginBottom: 12, padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  buildingIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 14.5, lineHeight: 20, fontFamily: 'Manrope-Bold' },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 3 },
  addressText: { flex: 1, color: colors.muted, fontSize: 11.5, lineHeight: 17, fontFamily: 'Manrope-Regular' },
  stamp: {
    backgroundColor: TOLET_RED_SOFT, borderWidth: 1.5, borderColor: TOLET_RED, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: '-4deg' }], marginTop: 2,
  },
  stampText: { color: TOLET_RED, fontSize: 10, fontFamily: 'Manrope-ExtraBold', letterSpacing: 0.8 },

  floorChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  floorChip: {
    backgroundColor: colors.bg, borderRadius: 7, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  floorChipText: { color: colors.text, fontSize: 11, lineHeight: 16, fontFamily: 'Manrope-SemiBold' },
  floorChipCount: { color: VACANT_GREEN, fontFamily: 'Manrope-Bold' },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  typePill: { backgroundColor: colors.bg, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  typePillText: { color: colors.text, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-SemiBold' },
  vacantPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: VACANT_GREEN_SOFT,
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, flexShrink: 1,
  },
  vacantDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A' },
  vacantPillText: { color: VACANT_GREEN, fontSize: 10.5, lineHeight: 15, fontFamily: 'Manrope-Bold', flexShrink: 1 },
  flexSpacer: { flex: 1 },
  viewMore: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  viewMoreText: { color: colors.primaryDark, fontSize: 11.5, lineHeight: 16, fontFamily: 'Manrope-SemiBold' },

  /* States */
  stateWrap: { alignItems: 'center', paddingHorizontal: 25, paddingTop: 50, paddingBottom: 30 },
  stateIconWrap: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 13,
  },
  stateTitle: { color: colors.text, fontSize: 14, lineHeight: 20, fontFamily: 'Manrope-SemiBold', textAlign: 'center' },
  stateDescription: {
    color: colors.muted, fontSize: 11.5, lineHeight: 18, fontFamily: 'Manrope-Regular',
    textAlign: 'center', marginTop: 6, maxWidth: 270,
  },
  stateButton: {
    marginTop: 15, minHeight: 36, paddingHorizontal: 14, borderRadius: 9, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stateButtonText: { color: colors.primaryDark, fontSize: 11.5, lineHeight: 17, fontFamily: 'Manrope-SemiBold' },
});