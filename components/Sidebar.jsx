import { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { colors } from '../theme';

const SIDEBAR_WIDTH = Math.min(290, Dimensions.get('window').width * 0.8);

// Mirrors the route list from your web app's middleware.js matcher.
export const menuItems = [
  { key: 'home', label: 'Home' },
  { key: 'manage-building', label: 'Manage Building' },
  { key: 'create-building', label: 'Create Building' },
  { key: 'manage-owner', label: 'Manage Owner' },
  { key: 'create-owner', label: 'Create Owner' },
  { key: 'expenses-list', label: 'Expenses List' },
  { key: 'gas-purchase', label: 'Gas Purchase' },
  { key: 'gas-stock', label: 'Gas Stock' },
  { key: 'gas-usage', label: 'Gas Usage' },
  { key: 'utility-service', label: 'Utility Service' },
  { key: 'report', label: 'Report' },
];

export default function Sidebar({ visible, onClose, currentScreen, onNavigate }) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[styles.panel, { width: SIDEBAR_WIDTH, transform: [{ translateX }] }]}
      >
        <Text style={styles.brand}>PROP HUB</Text>
        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => {
            const active = currentScreen === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
              >
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  brand: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  navItem: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: colors.bg,
  },
  navLabel: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: 'Manrope-Medium',
  },
  navLabelActive: {
    color: colors.primary,
    fontFamily: 'Manrope-Bold',
  },
});