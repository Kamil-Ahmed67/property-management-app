import { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { useInterfaceMode } from '../providers/InterfaceModeProvider';
import { INTERFACE_LABELS } from '../utils/accessControl';
import { colors } from '../theme';
import { useGreeting } from '../hooks/useGreeting';
import { useLogoutConfirm } from '../providers/LogoutConfirmProvider';

export default function Navbar({ onMenuPress, onSelectMenu }) {
  const { loginData } = useContext(AuthContext);
  const { lang, t, toggleLanguage } = useLanguage();
  const greetingText = useGreeting();
  const { requestLogout } = useLogoutConfirm();
  const { activeInterface, availableInterfaces, setActiveInterface } = useInterfaceMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = loginData?.Name || loginData?.UserId || t('nav.user');
  const initials = displayName.slice(0, 2).toUpperCase();
  const activeRoleLabel = INTERFACE_LABELS[activeInterface] || null;
  const isClient = activeRoleLabel?.toLowerCase() === 'client';

  // Only shown when the user actually holds more than one interface —
  // someone with just Admin (or just SuperAdmin alone) never sees this.
  const canSwitchInterfaces = availableInterfaces.length > 1;

  // Same "shows the target, not the current" pattern the role-switch
  // button already uses — one tap swaps directly, cycling through every
  // interface the user holds.
  const currentIndex = availableInterfaces.indexOf(activeInterface);
  const nextInterface = availableInterfaces[(currentIndex + 1) % availableInterfaces.length];
  const nextInterfaceLabel = INTERFACE_LABELS[nextInterface];

  const dropdownItems = [
    { key: 'home', label: t('nav.dashboard'), icon: 'grid-outline' },
    { key: 'profile', label: t('nav.profile'), icon: 'person-outline' },
    ...(!isClient
      ? [{ key: 'client-registration', label: t('nav.clientRegistration'), icon: 'person-add-outline' }]
      : []),
  ];

  function handleSelect(key) {
    setMenuOpen(false);
    onSelectMenu?.(key);
  }

  function handleLogout() {
    setMenuOpen(false);
    requestLogout();
  }

  function handleToggleInterface() {
    setActiveInterface(nextInterface);
  }

  function handleSetLanguage(target) {
    if (lang !== target) toggleLanguage();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.identity}
          onPress={() => setMenuOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.presenceDot} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.greetingTiny} numberOfLines={1}>
              {greetingText},
            </Text>
            <Text style={styles.greeting} numberOfLines={1}>
              {displayName}
            </Text>
            {activeRoleLabel ? (
              <Text style={styles.roleText} numberOfLines={1}>
                {activeRoleLabel}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        {canSwitchInterfaces ? (
          <TouchableOpacity
            style={styles.switchButton}
            onPress={handleToggleInterface}
            hitSlop={8}
            activeOpacity={0.65}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.primaryDark} />
           <Text style={styles.switchButtonLabel} numberOfLines={1}>
          {activeRoleLabel}
         </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onSelectMenu?.('notifications')}
          hitSlop={8}
          activeOpacity={0.65}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.text} />
          <View style={styles.badgeDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={requestLogout}
          hitSlop={8}
          activeOpacity={0.65}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.dropdownWrap}>
            <View style={styles.dropdownCaret} />
            <Pressable style={styles.dropdown} onPress={() => {}}>
              <View style={styles.dropdownHeader}>
                <View style={styles.dropdownAvatarWrap}>
                  <View style={styles.dropdownAvatar}>
                    <Text style={styles.dropdownAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.dropdownPresenceDot} />
                </View>
                <View style={styles.dropdownHeaderText}>
                  <Text style={styles.dropdownName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {activeRoleLabel ? (
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText} numberOfLines={1}>
                        {activeRoleLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.dropdownDivider} />

              {/* Language toggle — moved here from the top row. Same
                  segmented-control pattern as elsewhere in the app: shows
                  both states at once, active one filled, one tap on the
                  inactive side switches instantly. */}
              <View style={styles.dropdownGroup}>
                <View style={styles.dropdownItem}>
                  <View style={styles.dropdownItemIconWrap}>
                    <Ionicons name="language-outline" size={16} color={colors.text} />
                  </View>
                  <Text style={styles.dropdownLabel}>{t('nav.language')}</Text>
                  <View style={styles.langSegment}>
                    <TouchableOpacity
                      style={[styles.langSegmentOption, lang === 'bn' && styles.langSegmentOptionActive]}
                      onPress={() => handleSetLanguage('bn')}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.langSegmentText, lang === 'bn' && styles.langSegmentTextActive]}
                      >
                        বাংলা
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.langSegmentOption, lang === 'en' && styles.langSegmentOptionActive]}
                      onPress={() => handleSetLanguage('en')}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[styles.langSegmentText, lang === 'en' && styles.langSegmentTextActive]}
                      >
                        ENG
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.dropdownDivider} />

              <View style={styles.dropdownGroup}>
                {dropdownItems.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.dropdownItem}
                    onPress={() => handleSelect(item.key)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.dropdownItemIconWrap}>
                      <Ionicons name={item.icon} size={16} color={colors.text} />
                    </View>
                    <Text style={styles.dropdownLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.dropdownDivider} />

              <View style={styles.dropdownGroup}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleLogout}
                  activeOpacity={0.6}
                >
                  <View style={[styles.dropdownItemIconWrap, styles.dropdownItemIconWrapDanger]}>
                    <Ionicons name="log-out-outline" size={16} color={colors.error} />
                  </View>
                  <Text style={[styles.dropdownLabel, styles.dropdownLabelDanger]}>
                    {t('nav.logout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Manrope-ExtraBold',
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  identityText: {
    flexShrink: 1,
  },
  greetingTiny: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    lineHeight: 13,
    marginBottom: 1,
  },
  greeting: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    lineHeight: 16,
  },
  roleText: {
    color: colors.muted,
    fontSize: 10.5,
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  spacer: {
    flex: 1,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
    borderRadius: 5,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: `${colors.primaryDark}22`,
    paddingHorizontal: 9,
    marginRight: 6,
  },
  switchButtonLabel: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontFamily: 'Manrope-ExtraBold',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  dropdownWrap: {
    position: 'absolute',
    top: 54,
    left: 16,
  },
  dropdownCaret: {
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    marginLeft: 10,
    marginBottom: -7,
    transform: [{ rotate: '45deg' }],
    borderTopLeftRadius: 3,
  },
  dropdown: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownAvatarWrap: {
    position: 'relative',
  },
  dropdownAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
  },
  dropdownPresenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dropdownHeaderText: {
    flex: 1,
  },
  dropdownName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 4,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}16`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rolePillText: {
    color: colors.primaryDark,
    fontSize: 10.5,
    fontFamily: 'Manrope-Bold',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  dropdownGroup: {
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dropdownItemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemIconWrapDanger: {
    backgroundColor: `${colors.error}12`,
  },
  dropdownLabel: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    flex: 1,
  },
  dropdownLabelDanger: {
    color: colors.error,
    fontFamily: 'Manrope-Bold',
  },
  langSegment: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 20,
    padding: 2,
    gap: 2,
  },
  langSegmentOption: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 18,
  },
  langSegmentOptionActive: {
    backgroundColor: colors.teal,
  },
  langSegmentText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: colors.muted,
  },
  langSegmentTextActive: {
    color: '#ffffff',
  },
});