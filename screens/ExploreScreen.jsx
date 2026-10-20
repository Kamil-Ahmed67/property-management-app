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
const BANNER_IMAGE = require('../assets/images/banners/login-9.jpeg');

const CATEGORY_CARDS = [
  {
    key: 'my-property',
    title: 'আমার প্রপার্টি',
    subtitle: 'আপনার সম্পত্তি ব্যবস্থাপনা করুন',
    icon: 'home',
    iconBg: '#E6F4EA',
    iconColor: '#0F9D58',
    arrowBg: '#E6F4EA',
    arrowColor: '#0F9D58',
  },
  {
    key: 'find-property',
    title: 'প্রপার্টি খুঁজুন',
    subtitle: 'কেনা, বেচা বা ভাড়ার জন্য খুঁজুন',
    icon: 'search',
    iconBg: '#E8F0FE',
    iconColor: '#1A73E8',
    arrowBg: '#E8F0FE',
    arrowColor: '#1A73E8',
  },
  // {
  //   key: 'find-service',
  //   title: 'সার্ভিস খুঁজুন',
  //   subtitle: 'প্রয়োজনীয় সেবা খুঁজে নিন',
  //   icon: 'construct-outline',
  //   iconBg: '#F3E8FF',
  //   iconColor: '#9333EA',
  //   arrowBg: '#F3E8FF',
  //   arrowColor: '#9333EA',
  // },
];

export default function ExploreScreen({ onRequireLogin }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 700;
  const [view, setView] = useState('home');

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
      <ScrollView
        style={styles.page}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER */}
        <View style={styles.imageBanner}>
          <ImageBackground
            source={BANNER_IMAGE}
            style={styles.bannerBg}
            imageStyle={styles.bannerBgImage}
          >
            <View style={[styles.bannerOverlay, { paddingTop: insets.top + (isSmallScreen ? 8 : 12) }]}>
              {/* Header */}
              <View style={styles.headerRow}>
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

              {/* Banner Text */}
              <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle}>
                  আপনার স্বপ্নের{'\n'}বাড়ি, আমাদের{'\n'}সমাধান
                </Text>

                <Text style={styles.bannerSubtitle}>
                  বাড়ি, ভাড়াটিয়া, সোসাইটি বা সার্ভিস{'\n'}সবকিছু এখন এক প্ল্যাটফর্মে।
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* MAIN BODY CONTENT */}
        <View style={styles.bodyContent}>
          {CATEGORY_CARDS.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={[styles.categoryCard, isSmallScreen && styles.categoryCardSmall]}
              onPress={() =>
                card.key === 'my-property' ? onRequireLogin() : setView(card.key)
              }
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon} size={26} color={card.iconColor} />
              </View>
              
              <View style={styles.categoryTextWrap}>
                <Text style={styles.categoryTitle}>{card.title}</Text>
                <Text style={styles.categorySubtitle}>{card.subtitle}</Text>
              </View>

              <View style={[styles.categoryArrowWrap, { backgroundColor: card.arrowBg }]}>
                <Ionicons name="chevron-forward" size={16} color={card.arrowColor} />
              </View>
            </TouchableOpacity>
          ))}

          {/* BOTTOM PROMO CARD */}
          <View style={styles.bottomListCard}>
            <View style={styles.bottomListIconWrap}>
              <Ionicons name="document-text-outline" size={24} color="#0F9D58" />
            </View>

            <View style={styles.bottomListTextWrap}>
              <Text style={styles.bottomListTitle}>আপনার প্রপার্টি বা সার্ভিস লিস্ট করুন</Text>
              <Text style={styles.bottomListSubtitle}>
                নতুন গ্রাহকদের কাছে পৌঁছান এবং আপনার কাজ বাড়ান।
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bottomListButton}
              onPress={onRequireLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0F9D58" />
              <Text style={styles.bottomListButtonText}>লিস্ট করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  page: { flex: 1 },

  imageBanner: {
    width: '100%',
    aspectRatio: 1 / 0.95,
    backgroundColor: '#F8FAF8',
  },
  bannerBg: {
    flex: 1,
    width: '100%',
  },
  bannerBgImage: {
    resizeMode: 'cover',
  },
  bannerOverlay: {
    flex: 1,
    // justifyContent: 'space-between',
    paddingBottom: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brandName: {
    color: '#0F5B46',
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    lineHeight: 18,
  },
  brandTagline: {
    color: '#6B7280',
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    lineHeight: 12,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F9D58',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  loginButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
  },

bannerTextWrap: {
  width: '60%',
  paddingHorizontal: 20,
  marginTop: 25, 
},
  bannerTitle: {
    color: '#0F3025',
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'Manrope-ExtraBold',
    marginBottom: 8,
  },
  bannerSubtitle: {
    color: '#4B5563',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Manrope-Medium',
  },

  bodyContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  categoryCardSmall: { padding: 12, marginBottom: 10 },
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextWrap: { flex: 1, marginLeft: 14, marginRight: 8 },
  categoryTitle: {
    color: '#111827',
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    marginBottom: 3,
  },
  categorySubtitle: {
    color: '#6B7280',
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
  },
  categoryArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#E6F4EA',
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  bottomListIconWrap: {
    marginRight: 10,
  },
  bottomListTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  bottomListTitle: {
    color: '#111827',
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    marginBottom: 2,
  },
  bottomListSubtitle: {
    color: '#6B7280',
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    lineHeight: 14,
  },
  bottomListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#0F9D58',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  bottomListButtonText: {
    color: '#0F9D58',
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
  },
});