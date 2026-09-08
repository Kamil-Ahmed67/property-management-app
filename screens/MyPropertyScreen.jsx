import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';

// Titles/descriptions are translation KEYS — resolved via t() at render time.
const FEATURES = [
  {
    icon: 'people-outline',
    titleKey: 'myProperty.feature.tenants.title',
    descKey: 'myProperty.feature.tenants.desc',
  },
  {
    icon: 'receipt-outline',
    titleKey: 'myProperty.feature.bills.title',
    descKey: 'myProperty.feature.bills.desc',
  },
  {
    icon: 'flash-outline',
    titleKey: 'myProperty.feature.utility.title',
    descKey: 'myProperty.feature.utility.desc',
  },
  {
    icon: 'document-text-outline',
    titleKey: 'myProperty.feature.records.title',
    descKey: 'myProperty.feature.records.desc',
  },
  {
    icon: 'stats-chart-outline',
    titleKey: 'myProperty.feature.reports.title',
    descKey: 'myProperty.feature.reports.desc',
  },
];

export default function MyPropertyScreen({ onBack, onRequireLogin }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('myProperty.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('myProperty.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="business" size={36} color="#ffffff" />
          </View>
          <Text style={styles.heroHeading}>{t('myProperty.heroHeading')}</Text>
          <Text style={styles.heroSubtext}>{t('myProperty.heroSubtext')}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('myProperty.sectionLabel')}</Text>

        {FEATURES.map((feature) => (
          <View key={feature.titleKey} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Ionicons name={feature.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>{t(feature.titleKey)}</Text>
              <Text style={styles.featureDescription}>{t(feature.descKey)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.ctaCard}>
          <Text style={styles.ctaHeading}>{t('myProperty.ctaHeading')}</Text>
          <Text style={styles.ctaSubtext}>{t('myProperty.ctaSubtext')}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onRequireLogin} activeOpacity={0.85}>
            <Text style={styles.ctaButtonLabel}>{t('myProperty.ctaButton')}</Text>
            <Ionicons name="arrow-forward" size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 8,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12.5,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: { flex: 1 },
  featureTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 2,
  },
  featureDescription: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
    lineHeight: 16,
  },
  ctaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
  },
  ctaHeading: {
    color: colors.text,
    fontSize: 14.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 4,
  },
  ctaSubtext: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    lineHeight: 17,
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  ctaButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
});