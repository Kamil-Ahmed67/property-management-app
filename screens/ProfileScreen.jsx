import { useContext } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import { useLogoutConfirm } from '../providers/LogoutConfirmProvider';

export default function ProfileScreen() {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const { requestLogout } = useLogoutConfirm();

  const name = loginData?.Name?.trim() || t('profile.defaultName');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ImgPath may be a full URL or a relative path returned by the API —
  // handle both. If it's empty/null, fall back to an initials avatar below.
  const imageUri = loginData?.ImgPath
    ? loginData.ImgPath.startsWith('http')
      ? loginData.ImgPath
      : `${config.BMS_API}${loginData.ImgPath}`
    : null;

  const infoRows = [
    { icon: 'call-outline', label: t('common.phone'), value: loginData?.Phone },
    { icon: 'mail-outline', label: t('common.email'), value: loginData?.Mail },
    { icon: 'location-outline', label: t('common.address'), value: loginData?.Address },
  ].filter((row) => row.value);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('profile.eyebrow')}</Text>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{name}</Text>
        {loginData?.UserRole ? (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{loginData.UserRole}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoCard}>
        {infoRows.length === 0 ? (
          <Text style={styles.emptyText}>{t('profile.noDetails')}</Text>
        ) : (
          infoRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.infoRow, index !== infoRows.length - 1 && styles.infoRowDivider]}
            >
              <View style={styles.infoIconWrap}>
                <Ionicons name={row.icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={requestLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutLabel}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 30,
    fontFamily: 'Manrope-Bold',
  },
  name: {
    color: colors.text,
    fontSize: 19,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
  },
  rolePill: {
    marginTop: 8,
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    paddingVertical: 18,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 2,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: 13,
  },
  logoutLabel: {
    color: colors.error,
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
});