import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

const LOGO = require('../assets/images/logo.png');
const HOUSE_IMAGE = require('../assets/images/welcome3.png');

export default function WelcomeScreen({ onGetStarted, onLoginPress }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isSmallScreen = height < 700;
  const isLargeScreen = height > 820;

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + (isSmallScreen ? 8 : 14),
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandTitle}>PropHub</Text>
              <Text style={styles.brandTagline}>আপনার স্বপ্নের বাড়ি,আমাদের সমাধান</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={19} color="#263238" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* HOUSE / HERO IMAGE */}
        <View
          style={[
            styles.heroContainer,
            {
              height: isSmallScreen
                ? width * 0.68
                : isLargeScreen
                ? width * 0.78
                : width * 0.63,
            },
          ]}
        >
          <Image source={HOUSE_IMAGE} style={styles.houseImage} resizeMode="contain" />
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.content}>
          <Text style={styles.heading}>আপনার সম্পত্তি,</Text>
          <Text style={styles.headingSecond}>আপনার নিয়ন্ত্রণে</Text>

          <Text style={styles.description}>সহজেই আপনার সম্পত্তি পরিচালনা করুন</Text>
          <Text style={styles.description}>ভাড়াটিয়া, বিলিং ও দৈনন্দিন কার্যক্রম</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>শুরু করুন</Text>
            <Ionicons name="arrow-forward" size={17} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onLoginPress} style={styles.loginButton} activeOpacity={0.7}>
            <Text style={styles.loginText}>লগইন / সাইন আপ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ===============================================================
   STYLES
================================================================ */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#edf2f6',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    overflow: 'hidden',
    paddingHorizontal: 18,
    shadowColor: '#7b8b98',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  header: {
    height: 48,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logo: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  brandTitle: {
    color: colors.teal,
    fontSize: 15,
    fontFamily: fonts.extrabold,
    lineHeight: 18,
  },

  brandTagline: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: fonts.medium,
    lineHeight: 12,
    marginTop: 1,
  },

  notificationButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    top: 7,
    right: 8,
  },

  heroContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
    overflow: 'hidden',
  },

  houseImage: {
    width: '100%',
    height: '100%',
    zIndex: 5,
  },

  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  heading: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 23,
    lineHeight: 30,
    fontFamily: fonts.extrabold,
    marginTop: 0,
  },

  headingSecond: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 23,
    lineHeight: 30,
    fontFamily: fonts.extrabold,
    marginBottom: 9,
  },

  description: {
    textAlign: 'center',
    color: '#7b8794',
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily: fonts.medium,
  },

  primaryButton: {
    width: '100%',
    height: 48,
    marginTop: 20,
    borderRadius: 7,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.bold,
  },

  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  loginText: {
    color: colors.primary,
    fontSize: 12.5,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
});