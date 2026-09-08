import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Card({ title, description, tag, onPress }) {
  const content = (
    <>
      {tag ? <Text style={styles.tag}>{tag}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  tag: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    lineHeight: 20,
  },
});