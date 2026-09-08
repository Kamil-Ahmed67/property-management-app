import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const CATEGORIES = [
  { key: 'electrician', label: 'ইলেকট্রিশিয়ান', icon: 'flash-outline', color: '#f59e0b' },
  { key: 'plumber', label: 'প্লাম্বার', icon: 'construct-outline', color: '#3b82f6' },
  { key: 'cleaner', label: 'ক্লিনার', icon: 'sparkles-outline', color: '#8b5cf6' },
  { key: 'painter', label: 'পেইন্টার', icon: 'color-palette-outline', color: '#ec4899' },
  { key: 'ac', label: 'এসি সার্ভিস', icon: 'snow-outline', color: '#06b6d4' },
  { key: 'security', label: 'সিকিউরিটি', icon: 'shield-checkmark-outline', color: '#10b981' },
];

const PROVIDERS = [
  {
    id: '1',
    name: 'করিম ইলেকট্রিক সার্ভিস',
    category: 'ইলেকট্রিশিয়ান',
    rating: '৪.৮',
    location: 'গুলশান এলাকা',
    iconColor: '#f59e0b',
  },
  {
    id: '2',
    name: 'ক্লিনপ্রো বাংলাদেশ',
    category: 'ক্লিনার',
    rating: '৪.৬',
    location: 'ধানমন্ডি এলাকা',
    iconColor: '#8b5cf6',
  },
  {
    id: '3',
    name: 'রহিম প্লাম্বিং ওয়ার্কস',
    category: 'প্লাম্বার',
    rating: '৪.৭',
    location: 'মিরপুর এলাকা',
    iconColor: '#3b82f6',
  },
  {
    id: '4',
    name: 'সিকিউরগার্ড বিডি',
    category: 'সিকিউরিটি',
    rating: '৪.৯',
    location: 'উত্তরা এলাকা',
    iconColor: '#10b981',
  },
];

export default function FindServiceScreen({ onBack, onRequireLogin }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>সার্ভিস খুঁজুন</Text>
          <Text style={styles.headerSubtitle}>প্রয়োজনীয় সেবা খুঁজে নিন</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="সার্ভিস বা প্রোভাইডার খুঁজুন"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <Text style={styles.sectionLabel}>ক্যাটাগরি</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={styles.categoryTile}
              onPress={onRequireLogin}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: `${category.color}1A` }]}>
                <Ionicons name={category.icon} size={22} color={category.color} />
              </View>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>জনপ্রিয় সার্ভিস প্রোভাইডার</Text>
        {PROVIDERS.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={styles.providerCard}
            onPress={onRequireLogin}
            activeOpacity={0.85}
          >
            <View style={[styles.providerAvatar, { backgroundColor: `${provider.iconColor}1A` }]}>
              <Ionicons name="person" size={22} color={provider.iconColor} />
            </View>

            <View style={styles.providerTextWrap}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.providerCategory}>{provider.category}</Text>
              <View style={styles.providerMetaRow}>
                <View style={styles.providerMetaItem}>
                  <Ionicons name="star" size={12} color={colors.accent} />
                  <Text style={styles.providerMetaLabel}>{provider.rating}</Text>
                </View>
                <View style={styles.providerMetaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.muted} />
                  <Text style={styles.providerMetaLabel}>{provider.location}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.contactButton} onPress={onRequireLogin} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={16} color="#ffffff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  content: { padding: 20, paddingBottom: 32 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 22,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  categoryTile: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTextWrap: { flex: 1 },
  providerName: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 2,
  },
  providerCategory: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
    marginBottom: 5,
  },
  providerMetaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  providerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  providerMetaLabel: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-Medium',
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});