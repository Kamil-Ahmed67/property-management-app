import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';

const tabs = [
  { key: 'home', labelKey: 'tab.home', icon: 'home', iconOutline: 'home-outline' },
  { key: 'tenant-list', labelKey: 'tab.tenants', icon: 'people', iconOutline: 'people-outline' },
  { key: 'report', labelKey: 'tab.reports', icon: 'bar-chart', iconOutline: 'bar-chart-outline' },
  { key: 'profile', labelKey: 'tab.profile', icon: 'person-circle', iconOutline: 'person-circle-outline' },
];

export default function BottomNavBar({ currentScreen, onSelect }) {
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
              color={active ? colors.teal : colors.muted}
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
    color: colors.teal,
    fontFamily: 'Manrope-Bold',
  },
});