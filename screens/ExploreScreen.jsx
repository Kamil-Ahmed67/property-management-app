import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import MyPropertyScreen from './MyPropertyScreen';
import FindPropertyScreen from './FindPropertyScreen';
import FindServiceScreen from './FindServiceScreen';

const LOGO = require('../assets/images/logo.png');
const BANNER_IMAGE = require('../assets/images/welcome4.png');

const CATEGORY_CARDS = [
  {
    key: 'my-property',
    title: 'আমার প্রপার্টি',
    subtitle: 'আপনার সম্পত্তি ব্যবস্থাপনা করুন',
    icon: 'home',
    iconBg: `${colors.primary}1A`,
    iconColor: colors.primary,
  },
  {
    key: 'find-property',
    title: 'প্রপার্টি খুঁজুন',
    subtitle: 'কেনা, বেচা বা ভাড়ার জন্য খুঁজুন',
    icon: 'search',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
  },
  {
    key: 'find-service',
    title: 'সার্ভিস খুঁজুন',
    subtitle: 'প্রয়োজনীয় সেবা খুঁজে নিন',
    icon: 'gift-outline',
    iconBg: `${colors.accent}1A`,
    iconColor: colors.accent,
  },
];

export default function ExploreScreen({ onRequireLogin }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 820;
  const [view, setView] = useState('home'); // 'home' | 'my-property' | 'find-property' | 'find-service'

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view !== 'home') {
        setView('home');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [view]);

  if (view === 'my-property') {
    return <MyPropertyScreen onBack={() => setView('home')} onRequireLogin={onRequireLogin} />;
  }
  if (view === 'find-property') {
    return <FindPropertyScreen onBack={() => setView('home')} onRequireLogin={onRequireLogin} />;
  }
  if (view === 'find-service') {
    return <FindServiceScreen onBack={() => setView('home')} onRequireLogin={onRequireLogin} />;
  }

  return (
    <View style={styles.container}>
      {/* contentContainerStyle gets flexGrow:1 + minHeight = full window height, so
          the box below always occupies exactly one screen. The hero banner is the
          only flexible child (flex:1, capped by maxHeight) — it shrinks to soak up
          whatever room the fixed rows (header/cards/list) don't use, so the layout
          fits without scrolling on virtually every device. ScrollView only engages
          as a safety net if a screen is so short the banner can't shrink any further. */}
      <ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (isSmallScreen ? 10 : 14),
            paddingBottom: insets.bottom + (isSmallScreen ? 16 : 24),
            minHeight: height,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerRow, isSmallScreen && styles.headerRowSmall]}>
          <View style={styles.headerLeft}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>PropHub</Text>
              <Text style={styles.brandTagline}>Your Home, Our Solution</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={onRequireLogin} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={16} color="#ffffff" />
            <Text style={styles.loginButtonLabel}>লগইন</Text>
          </TouchableOpacity>
        </View>
{/* =========================================================
    HERO BANNER
========================================================= */}

<View
  style={[
    styles.imageBanner,
    {
      maxHeight: isSmallScreen
        ? width * 0.60
        : isLargeScreen
        ? width * 0.78
        : width * 0.68,
    },
  ]}
>
  <ImageBackground
    source={BANNER_IMAGE}
    style={styles.bannerBg}
    imageStyle={styles.bannerBgImage}
  >

    {/* Soft overlay only on the left side */}
    <View style={styles.bannerLeftOverlay} />

    {/* TOP-LEFT TEXT */}
    <View style={styles.bannerTextWrap}>
      <Text style={styles.bannerTitle}>
        Your Dream Home,{'\n'}
        Our Solution
      </Text>

      <View style={styles.bannerDivider} />

      <Text style={styles.bannerSubtitle}>
        Search, rent, and manage{'\n'}
        all in one place.
      </Text>

    </View>

  </ImageBackground>
</View>

        {CATEGORY_CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={[styles.categoryCard, isSmallScreen && styles.categoryCardSmall]}
            onPress={() =>
              card.key === 'my-property' ? onRequireLogin() : setView(card.key)
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.categoryIconWrap,
                isSmallScreen && styles.categoryIconWrapSmall,
                { backgroundColor: card.iconBg },
              ]}
            >
              <Ionicons name={card.icon} size={24} color={card.iconColor} />
            </View>
            <View style={styles.categoryTextWrap}>
              <Text style={styles.categoryTitle}>{card.title}</Text>
              <Text style={styles.categorySubtitle}>{card.subtitle}</Text>
            </View>
            <View style={[styles.categoryArrowWrap, { backgroundColor: card.iconBg }]}>
              <Ionicons name="chevron-forward" size={16} color={card.iconColor} />
            </View>
          </TouchableOpacity>
        ))}

        {/* <View style={[styles.listCard, isSmallScreen && styles.listCardSmall]}>
          <Text style={styles.listHeading}>আপনার প্রপার্টি বা সার্ভিস লিস্ট করুন</Text>
          <Text style={styles.listSubheading}>
            নতুন গ্রাহকদের কাছে পৌঁছান এবং আপনার সেবা প্রচার করুন
          </Text>
          <View style={styles.listButtonRow}>
            <TouchableOpacity style={styles.listButton} onPress={onRequireLogin} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={16} color={colors.primary} />
              <Text style={styles.listButtonLabel}>প্রপার্টি লিস্ট করুন</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.listButton, styles.listButtonAlt]}
              onPress={onRequireLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={16} color="#7C3AED" />
              <Text style={[styles.listButtonLabel, { color: '#7C3AED' }]}>
                সার্ভিস লিস্ট করুন
              </Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  page: { flex: 1 },
  content: { padding: 20 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerRowSmall: { marginBottom: 12 },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: { width: 34, height: 34, borderRadius: 9 },
  brandName: {
    color: colors.teal,
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    lineHeight: 18,
  },
  brandTagline: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    lineHeight: 12,
    marginTop: 1,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  loginButtonLabel: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
  },

  /* Hero banner wrap — flex:1 lets it soak up leftover space instead of a fixed
     height, so it shrinks on short screens rather than pushing content off-screen. */
 /* =============================================================
   HERO BANNER
============================================================= */

imageBanner: {
  width: '100%',
  flex: 1,

  minHeight: 90,

  marginBottom: 20,

  borderRadius: 20,

  overflow: 'hidden',

  backgroundColor: '#f4f8fb',

  shadowColor: '#7b8b98',
  shadowOpacity: 0.10,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 2,
},

bannerBg: {
  flex: 1,

  width: '100%',

  // IMPORTANT:
  // This puts the content at the TOP
  justifyContent: 'flex-start',

  alignItems: 'flex-start',

  position: 'relative',
},

bannerBgImage: {
  resizeMode: 'cover',
},

/* =============================================================
   LEFT SIDE LIGHT GRADIENT-LIKE OVERLAY
============================================================= */

bannerLeftOverlay: {
  position: 'absolute',

  left: 0,
  top: 0,
  bottom: 0,

  width: '58%',

  // backgroundColor: 'rgba(255,255,255,0.72)',
},

/* =============================================================
   TOP LEFT TEXT
============================================================= */

bannerTextWrap: {
  position: 'absolute',

  top: 16,
  left: 16,

  width: '58%',

  paddingRight: 8,
},

bannerEyebrow: {
  color: colors.primary,

  fontSize: 8.5,

  letterSpacing: 1.4,

  fontFamily: 'Manrope-Bold',

  marginBottom: 4,
},

bannerTitle: {
  color: colors.primaryDark,

  fontSize: 17,

  lineHeight: 21,

  fontFamily: 'Manrope-ExtraBold',
},

// bannerDivider: {
//   width: 28,
//   height: 3,

//   borderRadius: 2,

//   backgroundColor: colors.primary,

//   marginTop: 8,
//   marginBottom: 7,
// },

bannerSubtitle: {
  color: '#45615a',

  fontSize: 10,

  lineHeight: 14,

  fontFamily: 'Manrope-Medium',
},
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  categoryCardSmall: { padding: 11, marginBottom: 9 },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapSmall: { width: 42, height: 42 },
  categoryTextWrap: { flex: 1 },
  categoryTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 2,
  },
  categorySubtitle: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
  },
  categoryArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  listCardSmall: { padding: 13, marginTop: 6 },
  listHeading: {
    color: colors.text,
    fontSize: 13.5,
    fontFamily: 'Manrope-Bold',
    marginBottom: 3,
  },
  listSubheading: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
    marginBottom: 14,
    lineHeight: 16,
  },
  listButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  listButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: `${colors.primary}14`,
    borderRadius: 10,
    paddingVertical: 11,
  },
  listButtonAlt: {
    backgroundColor: '#EDE9FE',
  },
  listButtonLabel: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
  },
});
