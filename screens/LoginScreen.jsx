import { useContext, useMemo, useState } from 'react';
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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../providers/AuthProvider';
import { colors, fonts } from '../theme';
import { countries } from 'countries-list';
import BannerSlider from '../components/BannerSlider';

// Top banner slides (promo artwork, full width). Add or replace these with
// your real banner files — the slider adapts to however many you list.
const BANNERS = [
  require('../assets/images/banners/login-1.jpeg'),
  require('../assets/images/banners/login-2.jpeg'),
  // require('../assets/images/banners/banner-3-mobile.png'),
  // require('../assets/images/banners/banner-4-mobile.png'),
];
const LOGO = require('../assets/images/logo.png');

// Real pixel size of the banner artwork (login-1.jpeg / login-2.jpeg are
// 1600x900). Sizing the box from this exact ratio means "cover" never has
// to crop the image, so it renders identically — nothing zoomed or cut —
// on every screen width.
const BANNER_ASPECT_RATIO = 900 / 1600;

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
  const { width } = useWindowDimensions();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Banner height derived from the artwork's real aspect ratio — matches
  // exactly on every device width, so "cover" fits with no crop/zoom.
  const bannerHeight = Math.round(width * BANNER_ASPECT_RATIO);

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

  function handleSubmit() {
    login(buildFullPhone(country.dialCode, localPhone), password);
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAwareScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER SLIDER — full-bleed, auto-advancing left to right */}
        <BannerSlider images={BANNERS} height={bannerHeight} />

        {/* FORM SHEET — overlaps the banner with rounded top corners */}
        <View style={styles.sheet}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandTitle}>প্রপহাব</Text>
              {/* <Text style={styles.brandTagline}>আপনার বাড়ি, আমাদের সমাধান</Text> */}
            </View>
          </View>
          <Text style={styles.welcomeHeading}>স্বাগতম!</Text>
          <Text style={styles.welcomeSubtitle}>সহজেই আপনার সম্পত্তি পরিচালনা করুন</Text>

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
                placeholder="01XXXXXXXXX"
                placeholderTextColor={colors.muted}
                value={localPhone}
                onChangeText={setLocalPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>পাসওয়ার্ড</Text>
          <View style={styles.passwordWrap}>
            <View style={styles.leadingIcon}>
              <Ionicons name="lock-closed-outline" size={17} color={colors.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="আপনার পাসওয়ার্ড দিন"
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
              <Text style={styles.forgotText}>পাসওয়ার্ড ভুলে গেছেন?</Text>
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
              <Text style={styles.submitLabel}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
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

          <View style={styles.footNoteRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} />
            <Text style={styles.footNote}>আপনার তথ্য নিরাপদ এবং এনক্রিপ্টেড</Text>
          </View>
        </View>

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
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
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
  screen: { flex: 1, backgroundColor: '#f7f9fb' },
  page: { flex: 1, backgroundColor: '#f7f9fb' },
  content: { flexGrow: 1 },

  /* FORM SHEET */
  sheet: {
    marginTop: -26,
    backgroundColor: '#f7f9fb',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 54,
    flexGrow: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
    justifyContent:'center',
  },
  logo: { width: 40, height: 40, borderRadius: 9 },
  brandTitle: { color: colors.teal, fontSize: 35, fontFamily: fonts.extrabold, lineHeight: 35 },
  // brandTagline: {
  //   color: colors.muted,
  //   fontSize: 11.5,
  //   fontFamily: fonts.medium,
  //   marginTop: 1,
  // },
  /* Centered brand mark, replacing the old left-aligned logo row */
  // brandCenter: { alignItems: 'center', marginBottom: 14 },
  // brandCenterLogo: { width: 44, height: 44, borderRadius: 12, marginBottom: 8 },
  // brandCenterTitle: { color: colors.text, fontSize: 17, fontFamily: fonts.extrabold },
  // brandCenterTagline: {
  //   color: colors.muted,
  //   fontSize: 11.5,
  //   fontFamily: fonts.medium,
  //   marginTop: 1,
  // },

  welcomeHeading: {
    color: colors.text,
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 12.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  /* INPUTS */
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
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  passwordWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#ffffff',
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

  /* REMEMBER ME / FORGOT PASSWORD */
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
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { fontSize: 12.5, fontFamily: 'Manrope-Regular', color: colors.text },
  forgotText: { fontSize: 12.5, fontFamily: 'Manrope-Bold', color: colors.primaryDark },

  /* ERROR */
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

  /* SUBMIT */
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitLabel: {
    color: '#ffffff',
    fontSize: 15.5,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
  },

  /* DIVIDER + SUPPORT */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: colors.muted },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  supportText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: colors.primaryDark },

  registerRow: { marginTop: 16, alignItems: 'center' },
  registerText: { fontSize: 13, fontFamily: 'Manrope-Regular', color: colors.muted },
  registerLink: { color: colors.primary, fontFamily: 'Manrope-Bold' },

  footNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
  },
  footNote: {
    color: colors.muted,
    fontSize: 11.5,
    fontFamily: 'Manrope-Regular',
  },

  /* COUNTRY PICKER MODAL */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
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
    backgroundColor: '#fafbfc',
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
