import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import FeedbackSheet from './FeedbackSheet';
import { useLanguage } from '../providers/LanguageProvider';

const WHATSAPP_GREEN = '#25D366';

export default function FeedbackCard({ onSubmit, onWhatsApp }) {
  const { t } = useLanguage();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {/* Decorative depth circles — same motif used on the welcome
            illustration, for visual consistency across the app */}
        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />

        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{t('feedback.title')}</Text>
            <Text style={styles.subtitle}>{t('feedback.cardText')}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane-outline" size={15} color={colors.tealDark} />
            <Text style={styles.primaryButtonLabel}>{t('feedback.submit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={onWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
            <Text style={styles.whatsappLabel}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onSubmit={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, marginBottom: 28 },
  card: {
    backgroundColor: colors.tealDark,
    borderRadius: 10,
    padding: 16,
    overflow: 'hidden',
    shadowColor: colors.tealDark,
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50,
    right: -35,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -26,
    left: -18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: colors.tealDark,
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 6,
    paddingVertical: 6,
    shadowColor: WHATSAPP_GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  whatsappLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontFamily: 'Manrope-Bold',
  },
});