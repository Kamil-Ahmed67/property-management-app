import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
  ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../providers/AuthProvider';
import { colors, fonts } from '../theme';
import { countries } from 'countries-list';
import BannerSlider from '../components/BannerSlider';

// Top banner slides (promo artwork, full width).
const BANNERS = [
  require('../assets/images/banners/login-1.jpeg'),
  require('../assets/images/banners/login-2.jpeg'),
];

// Single-image banner alternative.
const SINGLE_BANNER = require('../assets/images/banners/login-9.jpeg');
const LOGO = require('../assets/images/logo.png');

// Remember Me: credentials are saved via expo-secure-store (OS Keychain /
// Keystore), never plain AsyncStorage, since a password is involved. This
// is entirely separate from the app's session handling — the session
// itself stays in-memory-only by design, so closing the app still forces
// a real login. This only pre-fills the form fields for convenience.
const REMEMBER_ME_KEY = 'prophub_remembered_login';

const COUNTRY_LIST = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    dialCode: `+${Array.isArray(data.phone) ? data.phone[0] : data.phone}`,
    flag: data.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_COUNTRY = COUNTRY_LIST.find((c) => c.code === 'BD') ?? COUNTRY_LIST[0];

function buildFullPhone(dialCode, localNumber) {
  const digitsOnly = localNumber.replace(/\D/g, '');
  const trimmed = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
  return `${dialCode}${trimmed}`;
}

export default function LoginScreen({ onNavigateToRegister, onForgotPassword, onContactSupport }) {
  const { login, loading, error } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 700;

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load any previously remembered credentials once, on mount, and
  // pre-fill the form + tick the checkbox if found.
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
        if (!raw) return;

        const saved = JSON.parse(raw);
        const matchedCountry = COUNTRY_LIST.find((c) => c.code === saved.countryCode);

        if (matchedCountry) setCountry(matchedCountry);
        setLocalPhone(saved.localPhone || '');
        setPassword(saved.password || '');
        setRememberMe(true);
      } catch (e) {
        // Corrupted or inaccessible entry — just start with an empty form.
        console.log('[RememberMe] Could not load saved credentials:', e.message);
      }
    })();
  }, []);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.dialCode.includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [countrySearch]);

  function openCountryPicker() {
    setCountrySearch('');
    setCountryPickerOpen(true);
  }

  function handleSelectCountry(item) {
    setCountry(item);
    setCountryPickerOpen(false);
  }

  async function handleSubmit() {
    const fullPhone = buildFullPhone(country.dialCode, localPhone);
    const success = await login(fullPhone, password);

    if (!success) return; // Wrong credentials etc. — leave any saved entry as-is.

    if (rememberMe) {
      try {
        await SecureStore.setItemAsync(
          REMEMBER_ME_KEY,
          JSON.stringify({ countryCode: country.code, localPhone, password })
        );
      } catch (e) {
        // Login itself already succeeded — saving credentials is best-effort.
        console.log('[RememberMe] Could not save credentials:', e.message);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(REMEMBER_ME_KEY);
      } catch (e) {
        // Nothing to clean up, or already gone — safe to ignore.
      }
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAwareScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* ====================================================================
            BANNER — TOP OF SCREEN (Matching ExploreScreen proportions & layout)
           ==================================================================== */}

        {/* ---- OPTION A: BANNER SLIDER (UPDATED & COMMENTED OUT) ---- */}
        {/* <View style={styles.imageBanner}>
          <BannerSlider images={BANNERS} style={styles.bannerBg} />
          <View style={styles.bannerLeftOverlay} />
          <View style={[styles.bannerOverlay, { paddingTop: insets.top + (isSmallScreen ? 8 : 12) }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                <View>
                  <Text style={styles.brandName}>PropHub</Text>
                  <Text style={styles.brandTagline}>Your Home, Our Solution</Text>
                </View>
              </View>
            </View>

            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTitle}>
                আপনার স্বপ্নের{'\n'}বাড়ি, আমাদের{'\n'}সমাধান
              </Text>
              <Text style={styles.bannerSubtitle}>
                বাড়ি, ভাড়াটিয়া, সোসাইটি বা সার্ভিস{'\n'}সবকিছু এখন এক প্ল্যাটফর্মে।
              </Text>
            </View>
          </View>
        </View> */}

        {/* ---- OPTION B: SINGLE IMAGE BANNER (ACTIVE) ---- */}
        <View style={styles.imageBanner}>
          <ImageBackground
            source={SINGLE_BANNER}
            style={styles.bannerBg}
            imageStyle={styles.bannerBgImage}
          >
            {/* Soft left overlay to maintain contrast */}
            <View style={styles.bannerLeftOverlay} />

            {/* Header + Hero Text inside absolute overlay block */}
            <View style={[styles.bannerOverlay, { paddingTop: insets.top + (isSmallScreen ? 8 : 12) }]}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                  <View>
                    <Text style={styles.brandName}>PropHub</Text>
                    <Text style={styles.brandTagline}>Your Home, Our Solution</Text>
                  </View>
                </View>
              </View>

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

        {/* FORM SHEET */}
        <View style={styles.sheet}>
          <Text style={styles.label}>মোবাইল নম্বর</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={openCountryPicker}
              activeOpacity={0.7}
            >
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <Text style={styles.countryDialCode}>{country.dialCode}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </TouchableOpacity>
            <View style={styles.inputWrap}>
              <View style={styles.leadingIcon}>
                <Ionicons name="call-outline" size={17} color={colors.muted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="আপনার ফোন নম্বর দিন"
                placeholderTextColor={colors.muted}
                value={localPhone}
                onChangeText={setLocalPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>পাসওয়ার্ড</Text>
          <View style={styles.passwordWrap}>
            <View style={styles.leadingIcon}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="আপনার পাসওয়ার্ড দিন"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.trailingIcon}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe((prev) => !prev)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" />}
              </View>
              <Text style={styles.rememberText}>আমাকে মনে রাখুন</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={19} color="#ffffff" />
                <Text style={styles.submitLabel}>লগ ইন</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>অথবা</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={onNavigateToRegister}
            style={styles.registerRow}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>
              কোনো অ্যাকাউন্ট নেই? <Text style={styles.registerLink}>রেজিস্টার করুন</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.footerDivider} />

            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#0F9D58" />
              <Text style={styles.trustBadgeText}>আপনার তথ্য নিরাপদ এবং এনক্রিপ্টেড</Text>
            </View>

            {onContactSupport ? (
              <TouchableOpacity
                onPress={onContactSupport}
                style={styles.supportRow}
                activeOpacity={0.7}
              >
                <Ionicons name="headset-outline" size={14} color={colors.muted} />
                <Text style={styles.supportText}>সহায়তা প্রয়োজন? আমাদের সাথে যোগাযোগ করুন</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* COUNTRY PICKER MODAL */}
        <Modal
          visible={countryPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCountryPickerOpen(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setCountryPickerOpen(false)}>
            <Pressable style={styles.pickerCard} onPress={() => {}}>
              <Text style={styles.optionsHeading}>Select Country</Text>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search country or code"
                  placeholderTextColor={colors.muted}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  autoFocus
                />
                {countrySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCountrySearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                style={styles.pickerList}
                initialNumToRender={20}
                windowSize={10}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No countries match your search.</Text>
                }
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      index !== filteredCountries.length - 1 && styles.optionDivider,
                    ]}
                    onPress={() => handleSelectCountry(item)}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <Text style={styles.optionLabel} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.optionDialCode}>{item.dialCode}</Text>
                    {country.code === item.code ? (
                      <Ionicons name="checkmark" size={18} color="#0F9D58" />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  page: { flex: 1, backgroundColor: '#ffffff' },
  content: {},

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

  bannerLeftOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '62%',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
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

  bannerTextWrap: {
    width: '60%',
    paddingHorizontal: 20,
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

  sheet: {
    marginTop: -20,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  label: {
    color: '#111827',
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 18,
    width: '100%',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  countryFlag: { fontSize: 16 },
  countryDialCode: { fontSize: 14, color: colors.text, fontFamily: 'Manrope-Medium' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
  },
  passwordWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 14,
  },
  leadingIcon: { paddingLeft: 14, paddingRight: 2 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 14.5,
    color: colors.text,
    fontFamily: 'Manrope-Regular',
  },
  trailingIcon: { paddingHorizontal: 14, paddingVertical: 10 },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: { backgroundColor: '#0F9D58', borderColor: '#0F9D58' },
  rememberText: { fontSize: 12.5, fontFamily: 'Manrope-Regular', color: colors.text },
  forgotText: { fontSize: 12.5, fontFamily: 'Manrope-Bold', color: '#0F5B46' },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  errorText: { color: colors.error, fontSize: 13, fontFamily: 'Manrope-Regular' },

  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#0F9D58',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitLabel: {
    color: '#ffffff',
    fontSize: 15.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: colors.muted },

  registerRow: { marginTop: 16, alignItems: 'center' },
  registerText: { fontSize: 13, fontFamily: 'Manrope-Regular', color: colors.muted },
  registerLink: { color: '#0F9D58', fontFamily: 'Manrope-Bold' },

  footer: {
    marginTop: 15,
    alignItems: 'center',
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#C3E6CB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  trustBadgeText: {
    color: '#0F9D58',
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supportText: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Medium',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 4,
    maxHeight: '75%',
  },
  optionsHeading: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Manrope-Regular',
    padding: 0,
  },
  pickerList: { flexGrow: 0 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { flex: 1, fontSize: 14, color: colors.text, fontFamily: 'Manrope-Medium' },
  optionDialCode: {
    fontSize: 13,
    color: colors.muted,
    fontFamily: 'Manrope-SemiBold',
    marginRight: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 24,
  },
});