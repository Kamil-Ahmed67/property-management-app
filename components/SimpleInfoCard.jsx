import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function SimpleInfoCard({ heading, subtext }) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{heading}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  heading: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    textAlign: 'center',
  },
  subtext: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});