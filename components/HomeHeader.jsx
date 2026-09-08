import { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { colors } from '../theme';

export default function HomeHeader({ onMenuPress, appName = 'Rent Collector' }) {
  const { logout } = useContext(AuthContext);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onMenuPress} hitSlop={10}>
        <Ionicons name="menu" size={26} color={colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>{appName}</Text>

      <View style={styles.actions}>
        <TouchableOpacity hitSlop={8} style={styles.actionButton}>
          <Ionicons name="globe-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={8} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    flex: 1,
    color: colors.primary,
    fontSize: 19,
    fontFamily: 'Manrope-ExtraBold',
    marginLeft: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    marginRight: 2,
  },
});