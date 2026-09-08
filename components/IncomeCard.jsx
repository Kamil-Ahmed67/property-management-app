import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function IncomeCard({ amount = 0, totalTenants = 0, totalRooms = 0 }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>INCOME · CURRENT MONTH</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currency}>৳</Text>
        <Text style={styles.amount}>{amount.toLocaleString()}</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <View style={styles.statIcon}>
            <Ionicons name="people" size={17} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.statLabel}>Total Tenants</Text>
            <Text style={styles.statValue}>{totalTenants}</Text>
          </View>
        </View>

        <View style={styles.statPill}>
          <View style={styles.statIcon}>
            <Ionicons name="home" size={17} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.statLabel}>Total Rooms</Text>
            <Text style={styles.statValue}>{totalRooms}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 22,
    shadowColor: colors.cardDark,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginBottom: 20,
  },
  currency: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    marginBottom: 4,
  },
  amount: {
    color: '#ffffff',
    fontSize: 36,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: -0.5,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.pillLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10.5,
    fontFamily: 'Manrope-SemiBold',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
  },
});
