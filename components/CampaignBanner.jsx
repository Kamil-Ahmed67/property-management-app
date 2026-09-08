import { View, Text, TouchableOpacity, ImageBackground, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';

const campaigns = [
  {
    key: 'reminders',
    tagKey: 'campaign.reminders.tag',
    titleKey: 'campaign.reminders.title',
    image: { uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=60' },
  },
  {
    key: 'reports',
    tagKey: 'campaign.reports.tag',
    titleKey: 'campaign.reports.title',
    image: { uri: 'https://images.unsplash.com/photo-1554774853-b415df9eeb92?w=600&q=60' },
  },
  {
    key: 'refer',
    tagKey: 'campaign.refer.tag',
    titleKey: 'campaign.refer.title',
    image: { uri: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=60' },
  },
];

export default function CampaignBanner({ onSelect }) {
  const { t } = useLanguage();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {campaigns.map((item) => (
        <TouchableOpacity
          key={item.key}
          activeOpacity={0.88}
          onPress={() => onSelect?.(item.key)}
        >
          <ImageBackground source={item.image} style={styles.card} imageStyle={styles.image}>
            <View style={styles.overlay}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{t(item.tagKey)}</Text>
              </View>
              <Text style={styles.title}>{t(item.titleKey)}</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  row: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 250,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: 16,
  },
  overlay: {
    backgroundColor: colors.scrim,
    padding: 14,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  tagText: {
    color: colors.primaryDark,
    fontSize: 9.5,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 0.4,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    lineHeight: 18,
  },
});