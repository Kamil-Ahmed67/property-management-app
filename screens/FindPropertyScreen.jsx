import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const FILTERS = [
  { key: 'all', label: 'সব' },
  { key: 'sale', label: 'বিক্রয়' },
  { key: 'rent', label: 'ভাড়া' },
  { key: 'flat', label: 'ফ্ল্যাট' },
  { key: 'house', label: 'বাড়ি/প্লট' },
];

const PROPERTIES = [
  {
    id: '1',
    type: 'sale',
    category: 'flat',
    title: 'গ্রিন ভ্যালি অ্যাপার্টমেন্ট',
    location: 'গুলশান, ঢাকা',
    price: '৳৭৫,০০,০০০',
    beds: 3,
    baths: 2,
    area: '১৪৫০ বর্গফুট',
  },
  {
    id: '2',
    type: 'rent',
    category: 'flat',
    title: 'লেক ভিউ রেসিডেন্সি',
    location: 'বনানী, ঢাকা',
    price: '৳৩৫,০০০/মাস',
    beds: 2,
    baths: 2,
    area: '১১০০ বর্গফুট',
  },
  {
    id: '3',
    type: 'sale',
    category: 'house',
    title: 'সানরাইজ টাওয়ার',
    location: 'ধানমন্ডি, ঢাকা',
    price: '৳১,২০,০০,০০০',
    beds: 4,
    baths: 3,
    area: '২১০০ বর্গফুট',
  },
  {
    id: '4',
    type: 'rent',
    category: 'flat',
    title: 'পাম রেসিডেন্সি',
    location: 'উত্তরা, ঢাকা',
    price: '৳২২,০০০/মাস',
    beds: 2,
    baths: 1,
    area: '৯০০ বর্গফুট',
  },
  {
    id: '5',
    type: 'sale',
    category: 'house',
    title: 'এমারেল্ড হাইটস',
    location: 'মিরপুর, ঢাকা',
    price: '৳৬০,০০,০০০',
    beds: 3,
    baths: 2,
    area: '১৩৫০ বর্গফুট',
  },
];

export default function FindPropertyScreen({ onBack, onRequireLogin }) {
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredProperties = useMemo(() => {
    return PROPERTIES.filter((property) => {
      const matchesFilter =
        activeFilter === 'all' ||
        property.type === activeFilter ||
        property.category === activeFilter;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            প্রপার্টি খুঁজুন
          </Text>

          <Text style={styles.headerSubtitle}>
            কেনা, বেচা বা ভাড়ার জন্য খুঁজুন
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.muted}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="এলাকা বা প্রপার্টি খুঁজুন"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={17}
              color={colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  active && styles.filterChipLabelActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Results header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredProperties.length}টি প্রপার্টি পাওয়া গেছে
          </Text>
        </View>

        {/* Property list */}
        {filteredProperties.map((property) => (
          <TouchableOpacity
            key={property.id}
            style={styles.card}
            onPress={onRequireLogin}
            activeOpacity={0.92}
          >
            {/* Image / Placeholder */}
            <View style={styles.cardImage}>
              <View style={styles.propertyIconWrap}>
                <Ionicons
                  name="business-outline"
                  size={34}
                  color="rgba(255,255,255,0.82)"
                />
              </View>

              {/* Sale / Rent */}
              <View
                style={[
                  styles.typeBadge,
                  property.type === 'sale'
                    ? styles.saleBadge
                    : styles.rentBadge,
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeLabel,
                    property.type === 'sale'
                      ? styles.saleBadgeLabel
                      : styles.rentBadgeLabel,
                  ]}
                >
                  {property.type === 'sale'
                    ? 'বিক্রয়'
                    : 'ভাড়া'}
                </Text>
              </View>

              {/* Favorite */}
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={(event) => {
                  event.stopPropagation();
                  onRequireLogin();
                }}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="heart-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Card body */}
            <View style={styles.cardBody}>
              <Text
                style={styles.cardTitle}
                numberOfLines={1}
              >
                {property.title}
              </Text>

              {/* Location */}
              <View style={styles.cardLocationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.muted}
                />

                <Text
                  style={styles.cardLocation}
                  numberOfLines={1}
                >
                  {property.location}
                </Text>
              </View>

              {/* Price */}
              <Text style={styles.cardPrice}>
                {property.price}
              </Text>

              {/* Specs */}
              <View style={styles.specsRow}>
                <SpecItem
                  icon="bed-outline"
                  value={`${property.beds} বেড`}
                />

                <View style={styles.specDivider} />

                <SpecItem
                  icon="water-outline"
                  value={`${property.baths} বাথ`}
                />

                <View style={styles.specDivider} />

                <SpecItem
                  icon="resize-outline"
                  value={property.area}
                  flex
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty state */}
        {filteredProperties.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="search-outline"
                size={25}
                color={colors.muted}
              />
            </View>

            <Text style={styles.emptyTitle}>
              কোনো প্রপার্টি পাওয়া যায়নি
            </Text>

            <Text style={styles.emptyDescription}>
              অন্য এলাকা বা প্রপার্টির নাম দিয়ে আবার চেষ্টা করুন।
            </Text>

            {search.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearch('')}
                activeOpacity={0.75}
              >
                <Text style={styles.clearSearchText}>
                  সার্চ পরিষ্কার করুন
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------
   Reusable specification item
------------------------------------------------------- */

function SpecItem({ icon, value, flex = false }) {
  return (
    <View
      style={[
        styles.specItem,
        flex && styles.specItemFlex,
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={colors.muted}
      />

      <Text
        style={styles.specLabel}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* Header */
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'Manrope-Bold',
  },

  headerSubtitle: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 9,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Manrope-Regular',
  },

  /* Filters */
  filterScroll: {
    marginTop: 12,
  },

  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 2,
    gap: 7,
  },

  filterChip: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipLabel: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: 'Manrope-SemiBold',
    includeFontPadding: true,
    textAlignVertical: 'center',
  },

  filterChipLabelActive: {
    color: '#FFFFFF',
  },

  /* Content */
  content: {
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 34,
  },

  resultsHeader: {
    marginBottom: 12,
  },

  resultsCount: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope-Medium',
  },

  /* Property card */
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    overflow: 'hidden',
    marginBottom: 14,
  },

  /* Property image */
  cardImage: {
    height: 132,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  propertyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  /* Type badge */
  typeBadge: {
    position: 'absolute',
    top: 11,
    left: 11,
    minHeight: 27,
    paddingHorizontal: 9,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saleBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  rentBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  typeBadgeLabel: {
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: 'Manrope-SemiBold',
    includeFontPadding: true,
  },

  saleBadgeLabel: {
    color: colors.primaryDark,
  },

  rentBadgeLabel: {
    color: colors.accent,
  },

  /* Favorite */
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card body */
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 4,
  },

  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  cardLocation: {
    flex: 1,
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: 'Manrope-Regular',
    marginLeft: 4,
  },

  cardPrice: {
    color: colors.primaryDark,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Manrope-Bold',
    marginBottom: 11,
  },

  /* Specs */
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  specItemFlex: {
    flex: 1,
  },

  specLabel: {
    color: colors.muted,
    fontSize: 10.5,
    lineHeight: 17,
    fontFamily: 'Manrope-Medium',
    marginLeft: 4,
    flexShrink: 1,
  },

  specDivider: {
    width: 1,
    height: 13,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },

  /* Empty state */
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 55,
    paddingBottom: 35,
  },

  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
  },

  emptyDescription: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 270,
  },

  clearSearchButton: {
    marginTop: 15,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearSearchText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: 'Manrope-SemiBold',
    includeFontPadding: true,
  },
});