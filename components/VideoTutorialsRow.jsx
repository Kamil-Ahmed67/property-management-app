import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const tutorials = [
  { key: 'how-to-use', title: 'How to use Rent Collector App' },
  { key: 'manage-partial-rent', title: 'Manage Partial Rent' },
  { key: 'delete-generated-bills', title: 'Delete Generated Bills' },
];

export default function VideoTutorialsRow({ onSeeAll, onSelect }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Video Tutorials</Text>
        <TouchableOpacity style={styles.seeAll} onPress={onSeeAll}>
          <Text style={styles.seeAllLabel}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tutorials.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.thumb}
            onPress={() => onSelect?.(item.key)}
            activeOpacity={0.85}
          >
            <Text style={styles.thumbTitle}>{item.title}</Text>
            <View style={styles.playButton}>
              <Ionicons name="play" size={16} color={colors.primaryDark} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  thumb: {
    width: 150,
    height: 110,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    padding: 12,
    justifyContent: 'space-between',
  },
  thumbTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  playButton: {
    alignSelf: 'flex-start',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});