import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../providers/LanguageProvider';
import { colors } from '../../theme';

// Deliberately minimal — only the two destinations that already exist
// (matching TenantNavbar's own dropdown items). Add more tabs here once
// real Tenant screens exist for them.
const tabs = [
  { key: 'dashboard', labelKey: 'tab.home', icon: 'home', iconOutline: 'home-outline' },
  { key: 'profile', labelKey: 'tab.profile', icon: 'person-circle', iconOutline: 'person-circle-outline' },
];

export default function TenantBottomNav({ currentScreen, onSelect }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || 8 }]}>
      {tabs.map((tab) => {
        const active = currentScreen === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.icon : tab.iconOutline}
              size={22}
              color={active ? colors.primary : colors.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
    color: colors.muted,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: 'Manrope-Bold',
  },
});