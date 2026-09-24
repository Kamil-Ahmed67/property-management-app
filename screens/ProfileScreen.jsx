import { useContext } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { useInterfaceMode } from '../providers/InterfaceModeProvider';
import { INTERFACE_LABELS } from '../utils/accessControl';
import { colors } from '../theme';
import config from '../config';
import { useLogoutConfirm } from '../providers/LogoutConfirmProvider';

export default function ProfileScreen() {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const { requestLogout } = useLogoutConfirm();
  const { activeInterface, availableInterfaces, setActiveInterface } = useInterfaceMode();

  const name = loginData?.Name?.trim() || t('profile.defaultName');
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const imageUri = loginData?.ImgPath
    ? loginData.ImgPath.startsWith('http')
      ? loginData.ImgPath
      : `${config.BMS_API}${loginData.ImgPath}`
    : null;

  const roles = loginData?.UserRoles || [];
  const activeInterfaceLabel = INTERFACE_LABELS[activeInterface] || null;

  const canSwitchInterfaces = availableInterfaces.length > 1;
  const currentIndex = availableInterfaces.indexOf(activeInterface);
  const nextInterface = canSwitchInterfaces
    ? availableInterfaces[(currentIndex + 1) % availableInterfaces.length]
    : null;
  const nextInterfaceLabel = nextInterface ? INTERFACE_LABELS[nextInterface] : null;

  const infoRows = [
    { icon: 'call-outline', label: t('common.phone'), value: loginData?.Phone },
    { icon: 'mail-outline', label: t('common.email'), value: loginData?.Mail },
    { icon: 'location-outline', label: t('common.address'), value: loginData?.Address },
  ].filter((row) => row.value);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-outline" size={16} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.eyebrow}>{t('profile.eyebrow')}</Text>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
      </View>

      {/* Hero section — big centered avatar, compressed padding */}
      <View style={styles.heroCard}>
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

        {roles.length > 0 ? (
          <View style={styles.roleRow}>
            {roles.map((role) => (
              <View key={role} style={styles.rolePill}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Contact info group */}
      <Text style={styles.sectionLabel}>{t('profile.contactInfo')}</Text>
      <View style={styles.listCard}>
        {infoRows.length === 0 ? (
          <Text style={styles.emptyText}>{t('profile.noDetails')}</Text>
        ) : (
          infoRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.listRow, index !== infoRows.length - 1 && styles.listRowDivider]}
            >
              <View style={styles.listRowIconWrap}>
                <Ionicons name={row.icon} size={14} color={colors.primary} />
              </View>
              <View style={styles.listRowTextWrap}>
                <Text style={styles.listRowLabel}>{row.label}</Text>
                <Text style={styles.listRowValue} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Account group — role switch + logout */}
      <Text style={styles.sectionLabel}>{t('profile.account')}</Text>
      <View style={styles.listCard}>
        {canSwitchInterfaces ? (
          <TouchableOpacity
            style={[styles.listRow, styles.listRowDivider]}
            onPress={() => setActiveInterface(nextInterface)}
            activeOpacity={0.65}
          >
            <View style={styles.listRowIconWrap}>
              <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
            </View>
            <View style={styles.listRowTextWrap}>
              <Text style={styles.listRowLabel}>
                {t('profile.viewingAs')} {activeInterfaceLabel}
              </Text>
            </View>
            <Text style={styles.switchAction}>
              {t('profile.switchTo')} {nextInterfaceLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.listRow} onPress={requestLogout} activeOpacity={0.65}>
          <View style={[styles.listRowIconWrap, styles.listRowIconWrapDanger]}>
            <Ionicons name="log-out-outline" size={14} color={colors.error} />
          </View>
          <View style={styles.listRowTextWrap}>
            <Text style={[styles.listRowLabel, styles.logoutLabel]}>{t('profile.logout')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    marginTop: 1,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 42,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 32,
    fontFamily: 'Manrope-Bold',
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  rolePill: {
    backgroundColor: `${colors.primary}14`,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },

  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
    marginBottom: 5,
    marginLeft: 2,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    paddingVertical: 12,
    textAlign: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowIconWrapDanger: {
    backgroundColor: `${colors.error}14`,
  },
  listRowTextWrap: {
    flex: 1,
  },
  listRowLabel: {
    color: colors.text,
    fontSize: 12.5,
    fontFamily: 'Manrope-SemiBold',
  },
  listRowValue: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    marginTop: 0.5,
  },
  switchAction: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },
  logoutLabel: {
    color: colors.error,
  },
});