import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const THEME = {
  success: {
    icon: 'checkmark',
    iconBg: colors.primarySoft || `${colors.primary}1A`,
    iconColor: colors.primaryDark || colors.primary,
    ring: `${colors.primary}33`,
    button: colors.primary,
  },
  error: {
    icon: 'close',
    iconBg: '#fef3f2',
    iconColor: colors.error,
    ring: '#fecdca',
    button: colors.error,
  },
};

/**
 * Centered, branded confirmation modal — replaces the OS-default Alert for
 * post-save feedback (success and failure) and for yes/no confirmations
 * (pass `icon` to override the theme's default glyph, and `secondaryLabel`
 * to add a Cancel button). Scales/fades in on open.
 */
export default function StatusModal({
  visible,
  type = 'success',
  icon,
  title,
  message,
  actionLabel = 'Done',
  onAction,
  secondaryLabel,
  onSecondary,
  onRequestClose,
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const theme = THEME[type] || THEME.success;
  const iconName = icon || theme.icon;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={!!visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.ring, { backgroundColor: theme.ring }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={iconName} size={30} color={theme.iconColor} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {secondaryLabel ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={onSecondary} activeOpacity={0.75}>
                <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.button }]}
              onPress={onAction}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryLabel}>{actionLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 14.5,
    fontFamily: 'Manrope-ExtraBold',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryLabel: {
    color: colors.text,
    fontSize: 14.5,
    fontFamily: 'Manrope-Bold',
  },
});