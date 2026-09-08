import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import FeedbackSheet from './FeedbackSheet';
import { useLanguage } from '../providers/LanguageProvider';

export default function FeedbackCard({ onSubmit, onWhatsApp }) {
  const { t } = useLanguage();
  const [sheetVisible, setSheetVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('feedback.title')}</Text>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbox-ellipses-outline" size={26} color={colors.primaryDark} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.text}>{t('feedback.cardText')}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.button} onPress={() => setSheetVisible(true)} activeOpacity={0.85}>
              <Text style={styles.buttonLabel}>{t('feedback.submit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.whatsappBtn} onPress={onWhatsApp} activeOpacity={0.8} hitSlop={6}>
              <Ionicons name="logo-whatsapp" size={16} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FeedbackSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onSubmit={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 28 },
  heading: { color: colors.text, fontSize: 14.5, fontFamily: 'Manrope-ExtraBold', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  text: {
    color: colors.text,
    fontSize: 12.5,
    fontFamily: 'Manrope-Regular',
    lineHeight: 19,
    marginBottom: 12,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  buttonLabel: { color: colors.primaryDark, fontSize: 12.5, fontFamily: 'Manrope-Bold' },
  whatsappBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});