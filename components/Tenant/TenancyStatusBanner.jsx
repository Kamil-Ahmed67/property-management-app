import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';

// Two distinct states this banner covers:
//  - 'noHome': tenant hasn't registered any home at all yet
//  - 'disconnected' (default): a home exists but isn't linked to a landlord
export default function TenancyStatusBanner({ visible, onPress, variant = 'disconnected' }) {
  const { t } = useLanguage();
  if (!visible) return null;

  const title = variant === 'noHome' ? t('tenancyBanner.noHomeTitle') : t('tenancyBanner.inactiveTitle');
  const message = variant === 'noHome' ? t('tenancyBanner.noHomeMessage') : t('tenancyBanner.inactiveMessage');

  return (
    <TouchableOpacity style={styles.banner} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="information-circle" size={18} color={colors.error} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.error} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
  },
  textWrap: { flex: 1 },
  title: { color: colors.error, fontSize: 12.5, fontFamily: 'Manrope-Bold', marginBottom: 2 },
  message: { color: '#991b1b', fontSize: 11.5, fontFamily: 'Manrope-Regular', lineHeight: 16 },
});