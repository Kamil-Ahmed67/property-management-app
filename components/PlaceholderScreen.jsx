import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function PlaceholderScreen({ title }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>SECTION</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          This section is wired up in navigation but doesn't have its own
          screen built yet — matches the "{title}" page from your web app.
          Build it out here the same way HomeScreen.jsx was built, then swap
          it in for this placeholder in App.js.
        </Text>
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
    padding: 20,
    paddingTop: 32,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    lineHeight: 21,
  },
});