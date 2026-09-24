import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Shown whenever a role fails a check — at the root gate (unknown/missing
// role) or inside any screen's own internal guard. Deliberately has NO path
// back into a protected screen — the only action is logging out.
export default function AccessDeniedScreen({ title, message, role, onLogout }) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={28} color={colors.error} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {role !== undefined ? (
          <Text style={styles.roleLine}>Role on file: {role || '(none)'}</Text>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#ffffff" />
          <Text style={styles.buttonLabel}>Log Out</Text>
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
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.error}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  roleLine: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
});