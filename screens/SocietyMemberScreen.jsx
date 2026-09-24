import { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { colors } from '../theme';
import { canAccess } from '../utils/accessControl';
import AccessDeniedScreen from './AccessDeniedScreen';

export default function SocietyMemberScreen() {
  const { loginData, logout } = useContext(AuthContext);

  if (!canAccess(loginData?.UserRole, 'societyMember')) {
    return (
      <AccessDeniedScreen
        title="Access Restricted"
        message="This area is only available to Society Member accounts."
        role={loginData?.UserRole}
        onLogout={logout}
      />
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(loginData?.Name || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.greeting}>Welcome, {loginData?.Name || 'Member'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>Society Member</Text>
        </View>

        <View style={styles.noticeBox}>
          <Ionicons name="construct-outline" size={20} color={colors.muted} />
          <Text style={styles.noticeText}>
            Your society member dashboard is being built. Features for
            society notices, dues, and community info will appear here soon.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontFamily: 'Manrope-ExtraBold',
  },
  greeting: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: `${colors.teal}1A`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 22,
  },
  rolePillText: {
    color: colors.teal,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
  },
  noticeText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12.5,
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  logoutLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
});