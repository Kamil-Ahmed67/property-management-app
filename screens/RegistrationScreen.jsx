import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { countries } from 'countries-list';
import { colors } from '../theme';
import config from '../config';

// Same background image and fallback pattern as LoginScreen.jsx.
const BG_IMAGE = require('../assets/images/RegBG.jpg');

const TENANT_ID = 'PropHub';

// npm install countries-list
// Zero-dependency dataset (name, ISO code, dial code, flag emoji) for all
// ~250 countries — see LoginScreen.jsx for the same pattern.
const COUNTRY_LIST = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    dialCode: `+${Array.isArray(data.phone) ? data.phone[0] : data.phone}`,
    flag: data.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_COUNTRY =
  COUNTRY_LIST.find((c) => c.code === 'BD') ?? COUNTRY_LIST[0];

function buildFullPhone(dialCode, localNumber) {
  const digitsOnly = localNumber.replace(/\D/g, '');
  const trimmed = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
  return `${dialCode}${trimmed}`;
}

export default function RegistrationScreen({ onNavigateToLogin }) {
  const [bgReady, setBgReady] = useState(false);

  useEffect(() => {
    Asset.loadAsync(BG_IMAGE)
      .then(() => setBgReady(true))
      .catch(() => setBgReady(true));
  }, []);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [registering, setRegistering] = useState(false);

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

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function checkExists(endpoint, paramName, value) {
    const url = `${config.BMS_API}api/${endpoint}?${paramName}=${encodeURIComponent(value)}`;
    const response = await fetch(url, {
      headers: { TenantId: TENANT_ID },
    });
    const data = await response.json().catch(() => null);
    return !!(data && data.data === true);
  }

  async function handleSubmit() {
    setLocalError('');
    setSuccessMessage('');

    const { name, email, phone, password, confirmPassword } = form;

    if (!name || !email || !phone || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setRegistering(true);

    const fullPhone = buildFullPhone(country.dialCode, phone);

    try {
      const emailTaken = await checkExists('CheckEmailExists', 'email', email);
      if (emailTaken) {
        setLocalError('An account with this email already exists.');
        return;
      }

      const phoneTaken = await checkExists('CheckPhoneExists', 'phone', fullPhone);
      if (phoneTaken) {
        setLocalError('An account with this phone number already exists.');
        return;
      }

      const response = await fetch(`${config.BMS_API}api/RegisterUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TenantId: TENANT_ID,
        },
        body: JSON.stringify({
          Name: name,
          Mail: email,
          Phone: fullPhone,
          // Address: address,
          Password: password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status !== 200 || (data && data.success === false)) {
        throw new Error((data && data.message) || 'Registration failed, please try again.');
      }

      setSuccessMessage('Account created — you can now sign in.');
      setTimeout(() => onNavigateToLogin?.(), 1200);
    } catch (err) {
      setLocalError(err.message || 'Could not create account, please try again.');
    } finally {
      setRegistering(false);
    }
  }

  return (
    <ImageBackground
      source={BG_IMAGE}
      style={[styles.background, !bgReady && styles.backgroundFallback]}
      resizeMode="cover"
    >
      <View style={styles.overlayTint} />

      <KeyboardAwareScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSubtitle}>
            Set up access to manage your properties, tenants, and rent
            collection.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register</Text>
          <Text style={styles.cardSubtitle}>
            Fill in your details to create a new account
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.inputFull}
            placeholder="Enter your full name"
            placeholderTextColor={colors.muted}
            value={form.name}
            onChangeText={(v) => handleChange('name', v)}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.inputFull}
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            value={form.email}
            onChangeText={(v) => handleChange('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number</Text>
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
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone Number"
              placeholderTextColor={colors.muted}
              value={form.phone}
              onChangeText={(v) => handleChange('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          {/* <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.inputFull, styles.textArea]}
            placeholder="Enter your address"
            placeholderTextColor={colors.muted}
            value={form.address}
            onChangeText={(v) => handleChange('address', v)}
            multiline
            numberOfLines={3}
          /> */}

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={colors.muted}
              value={form.password}
              onChangeText={(v) => handleChange('password', v)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.muted}
              value={form.confirmPassword}
              onChangeText={(v) => handleChange('confirmPassword', v)}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirm((prev) => !prev)}
            >
              <Ionicons
                name={showConfirm ? 'eye-off' : 'eye'}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          {localError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, registering && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={registering}
            activeOpacity={0.85}
          >
            {registering ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitLabel}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToLogin}
            style={styles.registerRow}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>
              Already have an account? <Text style={styles.registerLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={countryPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCountryPickerOpen(false)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setCountryPickerOpen(false)}
          >
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundFallback: {
    backgroundColor: colors.primaryDark,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  page: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    marginBottom: 26,
  },
  heroMark: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 27,
    fontFamily: 'Manrope-ExtraBold',
    lineHeight: 34,
    marginBottom: 10,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    lineHeight: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 21,
    fontFamily: 'Manrope-ExtraBold',
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    marginTop: 3,
    marginBottom: 15,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
    marginBottom: 7,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryDialCode: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Manrope-SemiBold',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: colors.text,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fafbfc',
    marginBottom: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: colors.text,
  },
  inputFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: colors.text,
    marginBottom: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.3,
  },
  registerRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    color: colors.muted,
  },
  registerLink: {
    color: colors.primary,
    fontFamily: 'Manrope-Bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
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
    fontFamily: 'Manrope-Regular',
    color: colors.text,
    padding: 0,
  },
  pickerList: {
    flexGrow: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Manrope-Medium',
  },
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
    fontFamily: 'Manrope-Regular',
    paddingVertical: 24,
  },
});